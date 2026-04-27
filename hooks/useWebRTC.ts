import { useCallback, useRef, useState } from "react";
import { Platform } from "react-native";
import { RTCSessionDescription } from "react-native-webrtc";
import { Socket } from "socket.io-client";
import { useDataChannel } from "./WebRTC/useDataChannel";
import { useMediaStream } from "./WebRTC/useMediaStream";
import { usePeerConnection } from "./WebRTC/usePeerConnection";

export default function useWebRTC(
	ICE_SERVERS: any[],
	onMessageRecieved?: (data: string) => void
) {
	const currentRoomId = useRef<string | null>(null);
	const roomRef = useRef<string | null>(null);
	const [isOnline, setIsOnline] = useState<boolean>(false);
	const mobileModel = (Platform.constants as any).Model;

	// Sub-Hooks
	const { localStreamRef, remoteStreamRef, getLocalStream, cleanupMedia } =
		useMediaStream();
	const {
		chat,
		dcOpen,
		setupDataChannel,
		sendChatMessage,
		closeDataChannel,
	} = useDataChannel(onMessageRecieved);
	const {
		pcRef,
		makingOffer,
		ignoreOffer,
		polite,
		initializePeerConnection,
		processIceCandidate,
		flushIceQueue,
		closePeerConnection: teardownPC,
	} = usePeerConnection(ICE_SERVERS);

	const fullCleanup = useCallback(() => {
		cleanupMedia();
		closeDataChannel();
		teardownPC();
		console.log(mobileModel, "PeerConnection closed and cleaned");
	}, [cleanupMedia, closeDataChannel, teardownPC, mobileModel]);

	const buildConnection = useCallback(
		async (
			meId: string,
			otherId: string,
			socket: Socket | null,
			roomId?: string,
			isInitiator?: boolean
		) => {
			const { pc, isNew } = initializePeerConnection();

			if (!isNew) {
				console.log(mobileModel, "Reusing existing PeerConnection");
				return pc;
			}

			console.log(mobileModel, "Creating RTCPeerConnection", {
				isInitiator,
			});

			(pc as any).oniceconnectionstatechange = () => {
				if (
					["failed", "disconnected"].includes(pc.iceConnectionState)
				) {
					console.warn(
						mobileModel,
						"ICE connection failed/disconnected"
					);
				}
			};

			(pc as any).onconnectionstatechange = () => {
				if (
					["disconnected", "failed", "closed"].includes(
						pc.connectionState
					)
				) {
					console.log(
						mobileModel,
						"Detected disconnection — scheduling cleanup"
					);
					setTimeout(() => {
						if (
							pcRef.current &&
							["disconnected", "failed", "closed"].includes(
								pcRef.current.connectionState
							)
						) {
							fullCleanup();
						}
					}, 5000);
				}
			};

			(pc as any).ontrack = (event: any) => {
				event.streams[0].getTracks().forEach((track: any) => {
					if (remoteStreamRef.current)
						remoteStreamRef.current.addTrack(track);
				});
				console.log(mobileModel, "Remote track received");
			};

			if (isInitiator) {
				try {
					const dc = pc.createDataChannel("chat");
					setupDataChannel(dc);
				} catch (e) {
					console.warn(mobileModel, "createDataChannel error:", e);
				}
			}

			(pc as any).onnegotiationneeded = async () => {
				if (!isInitiator || makingOffer.current) return;
				await new Promise((r) => setTimeout(r, 250));
				if (pc.signalingState !== "stable") return;

				try {
					makingOffer.current = true;
					const offer = await pc.createOffer({ iceRestart: false });
					await pc.setLocalDescription(offer as any);
					socket?.emit("webrtc-offer", {
						to: otherId,
						from: meId,
						sdp: offer,
						room: roomRef.current ?? roomId,
					});
				} catch (err) {
					console.error(mobileModel, "negotiationneeded error", err);
				}
				makingOffer.current = false;
			};

			(pc as any).onicecandidate = (event: any) => {
				if (event.candidate) {
					socket?.emit("webrtc-ice", {
						to: otherId,
						from: meId,
						candidate: event.candidate,
						room: roomRef.current ?? roomId,
					});
				}
			};

			(pc as any).ondatachannel = (event: any) =>
				setupDataChannel(event.channel);

			await flushIceQueue();
			return pc;
		},
		[
			initializePeerConnection,
			setupDataChannel,
			flushIceQueue,
			fullCleanup,
			mobileModel,
			pcRef,
			remoteStreamRef,
			makingOffer,
		]
	);

	const attachSocket = useCallback(
		(socket: Socket, meId: string, otherId: string) => {
			const isSameRoom = currentRoomId.current === `${meId}-${otherId}`;
			currentRoomId.current = `${meId}-${otherId}`;
			if (!socket) return;

			const onRegistered = () => {
				if (isSameRoom && roomRef.current) return;
				socket.emit(
					"get_or_create_room",
					{ withUser: otherId },
					(res: any) => {
						if (!res || res.error) return;
						roomRef.current = res.roomId;
						socket.emit("room:join", { roomId: res.roomId });
					}
				);
			};

			const onRoomPeers = async ({ roomId, peers, initiator }: any) => {
				roomRef.current = roomId;
				const myIdStr = String(meId).trim();
				const otherIdStr = String(otherId).trim();
				polite.current = String(initiator) !== myIdStr;

				const peerStrings = peers
					.map((p: any) => String(p).trim())
					.filter((id: string) => id !== myIdStr);
				if (!peerStrings.includes(otherIdStr)) return;

				const pc = pcRef.current;
				if (
					pc &&
					(pc.connectionState === "connected" ||
						pc.connectionState === "connecting")
				)
					return;

				if (!polite.current) {
					await buildConnection(meId, otherId, socket, roomId, true);
				}
			};

			const onRoomUserJoined = async ({ roomId, userId }: any) => {
				if (
					String(userId).trim() === String(otherId).trim() &&
					!polite.current
				) {
					const pc = pcRef.current;
					if (
						pc &&
						(pc.connectionState === "connected" ||
							pc.connectionState === "connecting")
					)
						return;
					await buildConnection(meId, otherId, socket, roomId, true);
				}
			};

			const onWebrtcOffer = async (data: any) => {
				if (ignoreOffer.current) return;
				try {
					const roomId = data.room || roomRef.current;
					if (!pcRef.current)
						await buildConnection(
							meId,
							otherId,
							socket,
							roomId,
							false
						);

					const offerCollision =
						makingOffer.current ||
						pcRef.current?.signalingState !== "stable";
					if (offerCollision) {
						if (!polite.current) {
							ignoreOffer.current = true;
							return;
						} else {
							await pcRef.current?.setLocalDescription({
								type: "rollback",
							} as any);
							makingOffer.current = false;
						}
					}
					ignoreOffer.current = false;
					await pcRef.current!.setRemoteDescription(
						new RTCSessionDescription(data.sdp as any) as any
					);

					if (data.meta?.call && !localStreamRef.current) {
						const stream = await getLocalStream(data.meta.video);
						if (stream && pcRef.current) {
							stream
								.getTracks()
								.forEach((track) =>
									pcRef.current!.addTrack(track, stream)
								);
						}
					}

					const answer = await pcRef.current!.createAnswer();
					await pcRef.current!.setLocalDescription(answer as any);
					socket.emit("webrtc-answer", {
						to: data.from,
						from: meId,
						sdp: answer,
						room: roomRef.current ?? roomId,
					});
				} catch (err) {
					console.error(mobileModel, "handle webrtc-offer err", err);
				}
			};

			const onWebrtcAnswer = async (data: any) => {
				try {
					if (!pcRef.current) return;
					if (
						["have-local-offer", "have-local-pranswer"].includes(
							pcRef.current.signalingState
						)
					) {
						await pcRef.current.setRemoteDescription(
							new RTCSessionDescription(data.sdp as any) as any
						);
					}
				} catch (err) {
					console.error(mobileModel, "handle webrtc-answer err", err);
				}
			};

			const onWebrtcIce = async (data: any) =>
				processIceCandidate(data.candidate);
			const onUserOnline = (d: any) => {
				if (d.userId === otherId) setIsOnline(true);
			};
			const onUserOffline = (d: any) => {
				if (d.userId === otherId) setIsOnline(false);
			};
			const onRoomUserLeft = ({ userId: leftUser }: any) => {
				if (String(leftUser) === String(otherId)) {
					fullCleanup();
					setIsOnline(false);
				}
			};

			socket.on("registered", onRegistered);
			socket.on("room:sync", onRoomPeers);
			socket.on("room:user-joined", onRoomUserJoined);
			socket.on("user_online", onUserOnline);
			socket.on("user_offline", onUserOffline);
			socket.on("webrtc-offer", onWebrtcOffer);
			socket.on("webrtc-answer", onWebrtcAnswer);
			socket.on("webrtc-ice", onWebrtcIce);
			socket.on("room:user-left", onRoomUserLeft);

			if (socket.connected) onRegistered();

			return () => {
				try {
					socket.emit("room:leave", {
						roomId: roomRef.current ?? null,
					});
				} catch {}
				socket.off("registered", onRegistered);
				socket.off("room:sync", onRoomPeers);
				socket.off("room:user-joined", onRoomUserJoined);
				socket.off("user_online", onUserOnline);
				socket.off("user_offline", onUserOffline);
				socket.off("webrtc-offer", onWebrtcOffer);
				socket.off("webrtc-answer", onWebrtcAnswer);
				socket.off("webrtc-ice", onWebrtcIce);
				socket.off("room:user-left", onRoomUserLeft);
				fullCleanup();
			};
		},
		[
			buildConnection,
			processIceCandidate,
			getLocalStream,
			fullCleanup,
			mobileModel,
			polite,
			pcRef,
			localStreamRef,
			ignoreOffer,
			makingOffer,
		]
	);

	const startCall = useCallback(
		async (
			meId: string,
			otherId: string,
			socket?: Socket | null,
			isVideoCall = true
		) => {
			if (!pcRef.current)
				throw new Error("Failed to create peer connection");
			const stream = await getLocalStream(isVideoCall);
			if (stream && pcRef.current) {
				const audioTrack = stream.getAudioTracks()[0];
				const videoTrack = stream.getVideoTracks()[0];
				if (audioTrack) pcRef.current.addTrack(audioTrack, stream);
				if (videoTrack) {
					pcRef.current.addTrack(videoTrack, stream);
					if (!isVideoCall) videoTrack.enabled = false;
				}
			}
		},
		[getLocalStream, pcRef]
	);

	const notifyOther = useCallback(
		(socket: Socket | null, room: string, from: string, to: string) => {
			socket?.emit("notify_waiting", { room, from, to });
		},
		[]
	);

	return {
		attachSocket,
		startCall,
		sendMessage: sendChatMessage,
		notifyOther,
		chat,
		isOnline,
		dcOpen,
		closePeerConnection: fullCleanup,
		roomRef,
		localStreamRef,
		remoteStreamRef,
	};
}
