import { useCallback, useRef, useState } from "react";
import { Platform } from "react-native";
import {
	mediaDevices,
	MediaStream,
	RTCIceCandidate,
	RTCPeerConnection,
	RTCSessionDescription,
} from "react-native-webrtc";
import { Socket } from "socket.io-client";
// Added imports for permissions in Expo
import { Audio } from "expo-av";
import { Camera } from "expo-camera";
import { useSocket } from "./SocketContext";

type Maybe<T> = T | null;

export default function useWebRTC(ICE_SERVERS: any) {
	const { setIsCallActive } = useSocket();
	const currentRoomId = useRef<string | null>(null);
	const mobileModel = (Platform.constants as any).Model;
	const pcRef = useRef<Maybe<RTCPeerConnection>>(null);
	const dcRef = useRef<any>(null);
	const iceQueueRef = useRef<any[]>([]);
	const roomRef = useRef<string | null>(null);
	const makingOffer = useRef(false);
	const ignoreOffer = useRef(false);
	const polite = useRef(false);
	const localStreamRef = useRef<MediaStream | null>(null);
	const remoteStreamRef = useRef<MediaStream | null>(null);
	const [chat, setChat] = useState<string[]>([]);
	const [isOnline, setIsOnline] = useState<boolean>(false);
	const [dcOpen, setDcOpen] = useState<boolean>(false);
	/** -----------------------------


🧩 CREATE PEER CONNECTION


------------------------------ */
	const createPeerConnection = useCallback(
		async (
			meId: string,
			otherId: string,
			sRoomId?: string,
			isInitiator?: boolean,
			socket?: Socket | null
		) => {
			// ✅ Prevent multiple PC creations
			if (pcRef.current) {
				const pcState = pcRef.current.connectionState;
				if (pcState === "connected" || pcState === "connecting") {
					console.log(
						mobileModel,
						"Reusing existing PeerConnection — already active"
					);
					return;
				} else {
					console.log(
						mobileModel,
						"Closing stale PeerConnection before creating a new one"
					);
					try {
						pcRef.current.close();
					} catch (e) {}
					pcRef.current = null;
				}
			}
			console.log(mobileModel, "Creating RTCPeerConnection", {
				isInitiator,
			});
			pcRef.current = new RTCPeerConnection({
				iceServers: ICE_SERVERS,
			} as any);
			// ✅ Keep consistent m-line order (fix for audio-only/video switching)
			pcRef.current.addTransceiver("audio", { direction: "recvonly" });
			pcRef.current.addTransceiver("video", { direction: "recvonly" });
			// ✅ Handle ICE and connection states
			(pcRef.current as any).oniceconnectionstatechange = () => {
				console.log(
					mobileModel,
					"ICE State:",
					pcRef.current?.iceConnectionState
				);
				if (
					["failed", "disconnected"].includes(
						pcRef.current?.iceConnectionState || ""
					)
				) {
					console.warn(
						mobileModel,
						"ICE connection failed/disconnected"
					);
				}
			};
			// ✅ Keep track of connection state
			(pcRef.current as any).onconnectionstatechange = () => {
				console.log(
					mobileModel,
					"Connection State:",
					pcRef.current?.connectionState
				);
				if (
					["disconnected", "failed", "closed"].includes(
						pcRef.current?.connectionState || ""
					)
				) {
					console.log(
						mobileModel,
						"Detected disconnection — will not auto-close immediately"
					);
					// ⚠️ Instead of auto-cleaning right away, wait to confirm full close
					setTimeout(() => {
						if (
							pcRef.current &&
							["disconnected", "failed", "closed"].includes(
								pcRef.current.connectionState
							)
						) {
							console.log(
								mobileModel,
								"Connection fully closed, cleaning up"
							);
							closePeerConnection();
						}
					}, 5000);
				}
			};
			// ✅ Remote stream setup
			const remoteStream = new MediaStream();
			remoteStreamRef.current = remoteStream;
			(pcRef.current as any).ontrack = (event: any) => {
				event.streams[0]
					.getTracks()
					.forEach((t: any) => remoteStream.addTrack(t));
				console.log(mobileModel, "Remote track received");
			};
			// ✅ Initiator creates data channel
			if (isInitiator) {
				try {
					dcRef.current = pcRef.current.createDataChannel("chat");
					setupDataChannel(dcRef.current);
				} catch (e) {
					console.warn(mobileModel, "createDataChannel error:", e);
				}
			}
			// ✅ Negotiation (perfect negotiation pattern)
			(pcRef.current as any).onnegotiationneeded = async () => {
				const pc = pcRef.current;
				if (!pc) return;
				// 🚫 Ignore if not initiator
				if (!isInitiator) {
					console.log(
						mobileModel,
						"Ignoring negotiationneeded: not initiator"
					);
					return;
				}
				// 🚫 Prevent race conditions
				if (makingOffer.current) {
					console.log(
						mobileModel,
						"Already making an offer, skip negotiationneeded"
					);
					return;
				}
				// 🚫 Android fix — wait a short delay for signaling to stabilize
				await new Promise((r) => setTimeout(r, 250));
				if (pc.signalingState !== "stable") {
					console.log(
						mobileModel,
						"Signaling not stable, skip negotiation"
					);
					return;
				}
				try {
					console.log(
						mobileModel,
						"⚡ negotiationneeded (initiator)"
					);
					makingOffer.current = true;
					const offer = await pc.createOffer({ iceRestart: false });
					await pc.setLocalDescription(offer as any);
					socket?.emit("webrtc-offer", {
						to: otherId,
						from: meId,
						sdp: offer,
						room: roomRef.current ?? sRoomId,
					});
					console.log(mobileModel, "Offer sent via socket");
				} catch (err) {
					console.error(mobileModel, "negotiationneeded error", err);
				} finally {
					makingOffer.current = false;
				}
			};
			// ✅ Send ICE candidates via socket
			(pcRef.current as any).onicecandidate = (event: any) => {
				if (event?.candidate) {
					socket?.emit("webrtc-ice", {
						to: otherId,
						from: meId,
						candidate: event.candidate,
						room: roomRef.current ?? sRoomId,
					});
				}
			};
			// ✅ If remote created data channel
			(pcRef.current as any).ondatachannel = (event: any) => {
				dcRef.current = event.channel;
				setupDataChannel(dcRef.current);
			};
			// ✅ Flush queued ICE
			if (iceQueueRef.current.length && pcRef.current) {
				for (const c of iceQueueRef.current) {
					try {
						await pcRef.current.addIceCandidate(
							new RTCIceCandidate(c as any)
						);
					} catch (e) {
						console.warn(
							mobileModel,
							"Failed to add queued ICE:",
							e
						);
					}
				}
				iceQueueRef.current = [];
			}
		},
		[ICE_SERVERS, Socket]
	);

	/** -----------------------------


💬 DATA CHANNEL SETUP
------------------------------ */
	const setupDataChannel = useCallback((channel: any) => {
		channel.onopen = () => {
			console.log(mobileModel, "DataChannel open");
			setDcOpen(true);
		};
		channel.onclose = () => {
			console.log(mobileModel, "DataChannel closed");
			setDcOpen(false);
		};
		channel.onerror = (err: any) =>
			console.warn(mobileModel, "DataChannel error", err);
		channel.onmessage = (ev: any) =>
			setChat((prev) => [...prev, `${ev.data}`]);
	}, []);

	/** -----------------------------


🧹 CLEANUP MEDIA
------------------------------ */
	const cleanupMedia = useCallback(() => {
		try {
			setIsCallActive(false);
			localStreamRef.current?.getTracks().forEach((t) => t.stop());
			remoteStreamRef.current?.getTracks().forEach((t) => t.stop());
			localStreamRef.current = null;
			remoteStreamRef.current = null;
		} catch (e) {
			console.warn(mobileModel, "cleanupMedia error", e);
		}
	}, []);

	/** -----------------------------


🔌 CLOSE PEER CONNECTION
------------------------------ */
	const closePeerConnection = useCallback(() => {
		cleanupMedia();
		if (pcRef.current) {
			pcRef.current.close();
			pcRef.current = null;
		}
		try {
			dcRef.current?.close?.();
		} catch (e) {}
		pcRef.current = null;
		dcRef.current = null;
		iceQueueRef.current = [];
		makingOffer.current = false;
		ignoreOffer.current = false;
		localStreamRef.current?.getTracks().forEach((t) => t.stop());
		remoteStreamRef.current?.getTracks().forEach((t) => t.stop());
		localStreamRef.current = null;
		remoteStreamRef.current = null;
		setDcOpen(false);
		console.log(mobileModel, "PeerConnection closed and cleaned");
	}, [cleanupMedia]);

	/** -----------------------------


🔁 ATTACH SOCKET (SIGNALING)


------------------------------ */
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

				// Convert all peer IDs to strings for the check
				const peerStrings = peers
					.map((p: any) => String(p).trim())
					.filter((id: string) => id !== myIdStr);
				const isPeerPresent = peerStrings.includes(otherIdStr);

				console.log(
					mobileModel,
					`PEERS IN ROOM: [${peerStrings}] | TARGET: ${otherIdStr}`
				);
				if (!isPeerPresent) {
					console.log(
						mobileModel,
						"Waiting for peer to join room..."
					);
					return;
				}

				const pc = pcRef.current;
				if (
					pc &&
					(pc.connectionState === "connected" ||
						pc.connectionState === "connecting")
				) {
					return;
				}

				if (!polite.current) {
					console.log(
						mobileModel,
						"--- I AM INITIATOR: Creating Offer ---"
					);
					// Ensure createPeerConnection sets up the PC and calls createOffer internally
					await createPeerConnection(
						meId,
						otherId,
						roomId,
						true,
						socket
					);
				} else {
					console.log(
						mobileModel,
						"--- I AM POLITE: Waiting for Offer ---"
					);
				}
			};
			const onRoomUserJoined = async ({ roomId, userId }: any) => {
				const myIdStr = String(meId).trim();
				const joinedUserStr = String(userId).trim();
				const targetUserStr = String(otherId).trim();

				console.log(mobileModel, `User joined room: ${joinedUserStr}`);

				// If the user who just joined is the one we are looking for
				if (joinedUserStr === targetUserStr) {
					console.log(
						mobileModel,
						"Target peer arrived! Checking connection..."
					);

					// If I am the initiator (not polite) and we aren't connected yet, START THE OFFER
					if (!polite.current) {
						const pc = pcRef.current;
						if (
							pc &&
							(pc.connectionState === "connected" ||
								pc.connectionState === "connecting")
						) {
							return;
						}
						console.log(mobileModel, "Initiating delayed offer...");
						await createPeerConnection(
							meId,
							otherId,
							roomId,
							true,
							socket
						);
					}
				}
			};
			const onWebrtcOffer = async (data: any) => {
				if (ignoreOffer.current) return;
				try {
					const roomId = data.room || roomRef.current;
					if (!pcRef.current)
						await createPeerConnection(
							meId,
							otherId,
							roomId,
							false,
							socket
						);
					const offerCollision =
						makingOffer.current ||
						pcRef.current?.signalingState !== "stable";
					if (offerCollision) {
						if (!polite.current) {
							console.log(
								mobileModel,
								"Offer collision, ignoring offer"
							);
							ignoreOffer.current = true;
							return;
						} else {
							console.log(
								mobileModel,
								"Offer collision, rolling back"
							);
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
					// Added: Handle incoming call by getting local media if it's a call offer and no local stream yet
					// This ensures bidirectional media flow
					if (data.meta?.call && !localStreamRef.current) {
						// Request permissions
						let audioPerm = await Audio.requestPermissionsAsync();
						let cameraPerm = { status: "granted" }; // Default for audio-only
						if (data.meta.video) {
							cameraPerm =
								await Camera.requestCameraPermissionsAsync();
						}
						if (
							audioPerm.status !== "granted" ||
							(data.meta.video && cameraPerm.status !== "granted")
						) {
							console.warn(
								mobileModel,
								"Permissions not granted for media"
							);
							// Proceed without local media (one-way call)
						} else {
							try {
								const stream = await mediaDevices.getUserMedia({
									audio: true,
									video: data.meta.video,
								});
								localStreamRef.current = stream;
								stream.getTracks().forEach((track) => {
									if (pcRef.current) {
										pcRef.current.addTrack(track, stream);
									}
								});
								console.log(
									mobileModel,
									"Local media added for incoming call"
								);
							} catch (err) {
								console.error(
									mobileModel,
									"Failed to get local media for incoming call:",
									err
								);
								// Proceed without local media
							}
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
			const onWebrtcIce = async (data: any) => {
				try {
					if (!pcRef.current || !pcRef.current.remoteDescription) {
						iceQueueRef.current.push(data.candidate);
						return;
					}
					await pcRef.current.addIceCandidate(
						new RTCIceCandidate(data.candidate as any)
					);
				} catch (err) {
					console.warn(mobileModel, "addIceCandidate err", err);
				}
			};
			const onUserOnline = (d: any) => {
				if (d.userId === otherId) setIsOnline(true);
			};
			const onUserOffline = (d: any) => {
				if (d.userId === otherId) setIsOnline(false);
			};
			const onRoomUserLeft = ({ userId: leftUser }: any) => {
				if (String(leftUser) === otherId) {
					closePeerConnection();
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
			// FIX: If socket is already connected and registered, trigger onRegistered manually to fetch room.
			// This handles cases where registration happened earlier (e.g., at login).
			if (socket.connected) {
				onRegistered();
			}
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
				closePeerConnection();
			};
		},
		[createPeerConnection, closePeerConnection]
	);

	/** -----------------------------


📞 START CALL


------------------------------ */
	const startCall = useCallback(
		async (
			meId: string,
			otherId: string,
			socket?: Socket | null,
			isVideoCall = true
		) => {
			if (!pcRef.current)
				throw new Error("Failed to create peer connection");
			try {
				// Added: Request permissions before getting user media
				// This fixes issues on physical devices where permissions are required
				let audioPerm = await Audio.requestPermissionsAsync();
				let cameraPerm = { status: "granted" }; // Default for audio-only
				if (isVideoCall) {
					cameraPerm = await Camera.requestCameraPermissionsAsync();
				}
				if (
					audioPerm.status !== "granted" ||
					(isVideoCall && cameraPerm.status !== "granted")
				) {
					console.warn(
						mobileModel,
						"Permissions not granted for media"
					);
					throw new Error("Permissions denied");
				}
				const stream = await mediaDevices.getUserMedia({
					audio: true,
					video: isVideoCall,
				});
				localStreamRef.current = stream;
				setIsCallActive(true);
				// ✅ Always attach audio/video (disabled video if audio-only)
				const audioTrack = stream.getAudioTracks()[0];
				const videoTrack = stream.getVideoTracks()[0];
				pcRef.current.addTrack(audioTrack, stream);
				if (videoTrack) {
					pcRef.current.addTrack(videoTrack, stream);
					if (!isVideoCall) videoTrack.enabled = false;
				}
			} catch (err) {
				console.error(mobileModel, "startCall error:", err);
				setIsCallActive(false);
				cleanupMedia();
				closePeerConnection();
				throw err;
			}
		},
		[createPeerConnection]
	);

	/** -----------------------------


✉️ SEND MESSAGE OVER DATA CHANNEL
------------------------------ */
	const sendMessage = useCallback((msg: string) => {
		if (!msg?.trim()) return false;
		if (dcRef.current && dcRef.current.readyState === "open") {
			dcRef.current.send(msg);
			setChat((prev) => [...prev, `Me: ${msg}`]);
			return true;
		}
		return false;
	}, []);

	/** -----------------------------


🔔 NOTIFY OTHER (OPTIONAL)
------------------------------ */
	const notifyOther = useCallback(
		(socket: Socket | null, room: string, from: string, to: string) => {
			socket?.emit("notify_waiting", { room, from, to });
		},
		[]
	);

	return {
		attachSocket,
		startCall,
		sendMessage,
		notifyOther,
		chat,
		isOnline,
		dcOpen,
		closePeerConnection,
		roomRef,
		localStreamRef,
		remoteStreamRef,
	};
}
