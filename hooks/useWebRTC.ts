import { useCallback, useRef, useState } from "react";
import {
	RTCIceCandidate,
	RTCPeerConnection,
	RTCSessionDescription,
	mediaDevices,
} from "react-native-webrtc";
import type { Socket } from "socket.io-client";

type Maybe<T> = T | null;

export default function useWebRTC(ICE_SERVERS: any) {
	// refs
	const pcRef = useRef<Maybe<RTCPeerConnection>>(null);
	const dcRef = useRef<any>(null);
	const iceQueueRef = useRef<any[]>([]);
	const roomRef = useRef<string | null>(null);

	// negotiation helpers (refs to avoid re-renders)
	const makingOffer = useRef(false);
	const ignoreOffer = useRef(false);
	const polite = useRef(false);

	// stateful UI values
	const [chat, setChat] = useState<string[]>([]);
	const [isOnline, setIsOnline] = useState<boolean>(false);
	const [dcOpen, setDcOpen] = useState<boolean>(false);

	// create peer connection (copied logic, minimal changes for scoping)
	const createPeerConnection = useCallback(
		async (
			meId: string,
			otherId: string,
			sRoomId?: string,
			isInitiator?: boolean,
			socket?: Socket | null
		) => {
			if (pcRef.current) {
				console.log(
					"Closing stale peer connection before creating a new one"
				);
				closePeerConnection();
			}

			console.log("Creating RTCPeerConnection", { isInitiator });
			pcRef.current = new RTCPeerConnection({
				iceServers: ICE_SERVERS,
			} as any);

			// only initiator creates data channel
			if (isInitiator) {
				try {
					dcRef.current = (pcRef.current as any).createDataChannel?.(
						"chat"
					);
					setupDataChannel(dcRef.current);
				} catch (e) {
					console.warn("createDataChannel error:", e);
				}
			}

			// negotiationneeded handler
			(pcRef.current as any).onnegotiationneeded = async () => {
				console.log("⚡ negotiationneeded (guarded)");
				if (!pcRef.current || makingOffer.current) return;
				if (pcRef.current.signalingState !== "stable") {
					console.log("signalingState not stable, skipping offer");
					return;
				}

				try {
					makingOffer.current = true;

					const offer = await pcRef.current!.createOffer();
					await pcRef.current!.setLocalDescription(offer as any);
					console.log("emitting webrtc-offer (negotiationneeded)");
					socket?.emit("webrtc-offer", {
						to: otherId,
						from: meId,
						sdp: offer,
						room: roomRef.current ?? sRoomId,
					});
				} catch (err) {
					console.error("negotiationneeded error", err);
				} finally {
					makingOffer.current = false;
				}
			};

			// ICE candidate handler
			(pcRef.current as any).onicecandidate = (event: any) => {
				if (event?.candidate) {
					console.log("sending ice candidate");
					socket?.emit("webrtc-ice", {
						to: otherId,
						from: meId,
						candidate: event.candidate,
						room: roomRef.current ?? sRoomId,
					});
				}
			};

			(pcRef.current as any).ondatachannel = (event: any) => {
				console.log("data channel received");
				dcRef.current = event.channel;
				setupDataChannel(dcRef.current);
			};

			(pcRef.current as any).ontrack = (ev: any) => {
				console.log("remote track received");
			};

			// flush queued ICE
			if (iceQueueRef.current.length && pcRef.current) {
				for (const c of iceQueueRef.current) {
					try {
						await pcRef.current.addIceCandidate(
							new RTCIceCandidate(c as any)
						);
					} catch (e) {
						console.warn("failed to add queued ice:", e);
					}
				}
				iceQueueRef.current = [];
			}
		},
		[ICE_SERVERS]
	);

	const setupDataChannel = useCallback((channel: any) => {
		channel.onopen = () => {
			console.log("DC open");
			setDcOpen(true);
		};
		channel.onclose = () => {
			console.log("DC closed");
			setDcOpen(false);
		};
		channel.onerror = (err: any) => {
			console.warn("DC error", err);
		};
		channel.onmessage = (ev: any) => {
			setChat((prev) => [...prev, `Them: ${ev.data}`]);
		};
	}, []);

	const closePeerConnection = useCallback(() => {
		try {
			dcRef.current?.close?.();
		} catch (e) {}
		dcRef.current = null;
		try {
			pcRef.current?.close?.();
		} catch (e) {}
		pcRef.current = null;
		iceQueueRef.current = [];
		makingOffer.current = false;
		ignoreOffer.current = false;
		console.log("PeerConnection closed and cleaned");
		setDcOpen(false);
	}, []);

	// Attach socket listeners (mirrors original Chat screen handlers)
	const attachSocket = useCallback(
		(socket: Socket, meId: string, otherId: string) => {
			if (!socket) return;

			// set polite deterministic initiator
			const isInitiator = String(meId) < String(otherId);
			polite.current = !isInitiator;

			// registered handler -> get_or_create_room
			const onRegistered = (payload: any) => {
				console.log("server resgitered reply:", payload);
				socket.emit(
					"get_or_create_room",
					{ withUser: otherId },
					(res: any) => {
						if (!res) {
							console.warn("no response from get_or_create_room");
							return;
						}
						if (!res || res.error) {
							console.warn(
								"get_or_create_room error:",
								res.error
							);
							return;
						}

						const roomId = res.roomId;
						roomRef.current = roomId;
						console.log(
							"got roomId:",
							roomId,
							"reused?",
							res.reused
						);
						socket.emit("room:join", { roomId });
					}
				);
			};

			const onRoomPeers = async ({ roomId, peers }: any) => {
				console.log("room:peers:", roomId, peers);
				const peerPresent = peers && peers.includes(otherId);
				await createPeerConnection(
					meId,
					otherId,
					roomId,
					isInitiator,
					socket
				);
				if (isInitiator && peerPresent) {
					try {
						if (!pcRef.current) return;
						if (makingOffer.current) return;
						makingOffer.current = true;

						// create offer
						const offer = await (
							pcRef.current as RTCPeerConnection
						).createOffer();
						await (
							pcRef.current as RTCPeerConnection
						).setLocalDescription(offer as any);
						socket.emit("webrtc-offer", {
							to: otherId,
							from: meId,
							sdp: offer,
							room: roomRef.current ?? roomId,
						});
					} catch (err) {
						console.error("create offer error:", err);
					} finally {
						makingOffer.current = false;
					}
				}
			};

			const onRoomUserJoined = async ({
				roomId,
				userId: joinedUser,
			}: any) => {
				console.log(
					"peer joined",
					joinedUser,
					"room:",
					roomRef.current
				);
				if (String(joinedUser) === otherId) {
					await createPeerConnection(
						meId,
						otherId,
						roomId,
						isInitiator,
						socket
					);
					if (isInitiator) {
						try {
							if (!pcRef.current) return;
							if (makingOffer.current) return;
							makingOffer.current = true;

							const offer = await (
								pcRef.current as RTCPeerConnection
							).createOffer();
							await (
								pcRef.current as RTCPeerConnection
							).setLocalDescription(offer as any);
							socket.emit("webrtc-offer", {
								to: otherId,
								from: meId,
								sdp: offer,
								room: roomRef.current ?? roomId,
							});
						} catch (err) {
							console.error("offer on join err:", err);
						} finally {
							makingOffer.current = false;
						}
					}
				}
			};

			const onWebrtcOffer = async (data: any) => {
				if (ignoreOffer.current) {
					console.log("Ignoring remote offer (ignoreOffer true)");
					return;
				}
				console.log("📥 received offer from", data.from?.slice?.(0, 6));
				try {
					const roomId = data.room;
					await createPeerConnection(
						meId,
						otherId,
						roomId,
						isInitiator,
						socket
					);
					const sdp = data.sdp;

					const offerCollision =
						makingOffer.current ||
						(pcRef.current as any)?.signalingState !== "stable";
					if (offerCollision) {
						if (!polite.current) {
							console.log(
								"offer collision - impolite -> ignoring remote offer"
							);
							ignoreOffer.current = true;
							return;
						} else {
							console.log(
								"offer collision - polite -> will accept remote offer"
							);
							await pcRef.current?.setLocalDescription({
								type: "rollback",
							} as any);
							makingOffer.current = false;
						}
					}

					ignoreOffer.current = false;
					await (pcRef.current as RTCPeerConnection)!.setRemoteDescription(
						new RTCSessionDescription(sdp as any) as any
					);
					console.log("✅ setRemoteDescription done");
					const answer =
						await (pcRef.current as RTCPeerConnection)!.createAnswer();
					await (pcRef.current as RTCPeerConnection)!.setLocalDescription(
						answer as any
					);
					console.log("✅ setLocalDescription(answer) done");
					socket.emit("webrtc-answer", {
						to: data.from,
						from: meId,
						sdp: answer,
						room: roomRef.current ?? roomId,
					});
				} catch (err) {
					console.error("handle webrtc-offer err", err);
				}
			};

			const onWebrtcAnswer = async (data: any) => {
				console.log(
					"📥 received answer from",
					data.from?.slice?.(0, 6)
				);
				try {
					if (!pcRef.current) {
						console.warn("No pc on answer");
						return;
					}

					const st = pcRef.current.signalingState;
					if (
						st === "have-local-offer" ||
						st === "have-remote-offer" ||
						st === "have-local-pranswer"
					) {
						await (pcRef.current as RTCPeerConnection)!.setRemoteDescription(
							new RTCSessionDescription(data.sdp as any) as any
						);
						console.log("✅ setRemoteDescription(answer) done");
					} else {
						console.warn(
							"Unexpected signalingState for answer:",
							st
						);
					}
				} catch (err) {
					console.error("handle webrtc-answer err", err);
				}
			};

			const onWebrtcIce = async (data: any) => {
				console.log(
					"SERVER got webrtc-ice from",
					socket?.id,
					"payload keys:",
					Object.keys(data || {})
				);
				try {
					if (!pcRef.current) {
						iceQueueRef.current.push(data.candidate);
						return;
					}
					await (pcRef.current as RTCPeerConnection).addIceCandidate(
						new RTCIceCandidate(data.candidate as any)
					);
				} catch (err) {
					console.warn("addIceCandidate err", err);
				}
			};

			const onNotifyWaiting = (d: any) => {
				console.log("notify_waiting", d);
			};

			const onUserOnline = (d: any) => {
				if (d.userId === otherId) setIsOnline(true);
			};
			const onUserOffline = (d: any) => {
				if (d.userId === otherId) setIsOnline(false);
			};

			const onRoomUserLeft = ({ roomId, userId: leftUser }: any) => {
				console.log("room:user-left", leftUser);
				if (String(leftUser) === otherId) {
					closePeerConnection();
					setIsOnline(false);
				}
			};

			const onConnectError = (err: any) =>
				console.warn("socket connect_err", err);

			// register listeners
			socket.on("registered", onRegistered);
			socket.on("room:peers", onRoomPeers);
			socket.on("room:user-joined", onRoomUserJoined);
			socket.on("webrtc-offer", onWebrtcOffer);
			socket.on("webrtc-answer", onWebrtcAnswer);
			socket.on("webrtc-ice", onWebrtcIce);
			socket.on("notify_waiting", onNotifyWaiting);
			socket.on("user_online", onUserOnline);
			socket.on("user_offline", onUserOffline);
			socket.on("room:user-left", onRoomUserLeft);
			socket.on("connect_error", onConnectError);

			// return detach function so caller can cleanup explicitly if desired
			return () => {
				try {
					socket.emit("room:leave", {
						roomId: roomRef.current ?? null,
					});
				} catch (e) {}
				socket.off("registered", onRegistered);
				socket.off("room:peers", onRoomPeers);
				socket.off("room:user-joined", onRoomUserJoined);
				socket.off("webrtc-offer", onWebrtcOffer);
				socket.off("webrtc-answer", onWebrtcAnswer);
				socket.off("webrtc-ice", onWebrtcIce);
				socket.off("notify_waiting", onNotifyWaiting);
				socket.off("user_online", onUserOnline);
				socket.off("user_offline", onUserOffline);
				socket.off("room:user-left", onRoomUserLeft);
				socket.off("connect_error", onConnectError);
				// clean pc
				closePeerConnection();
			};
		},
		[createPeerConnection, closePeerConnection]
	);

	// input: startCall - same logic as original
	const startCall = useCallback(
		async (meId: string, otherId: string, socket?: Socket | null) => {
			if (!meId || !otherId) {
				throw new Error("Missing IDs");
			}
			await createPeerConnection(
				meId,
				otherId,
				undefined,
				String(meId) < String(otherId),
				socket
			);
			if (!pcRef.current) {
				throw new Error("Failed to create peer connection");
			}
			try {
				const stream = await mediaDevices.getUserMedia({
					audio: true,
					video: true,
				});
				stream
					.getTracks()
					.forEach((t: any) => pcRef.current?.addTrack(t, stream));
				if (!makingOffer.current) {
					makingOffer.current = true;
					const offer = await pcRef.current.createOffer();
					await pcRef.current.setLocalDescription(offer as any);
					socket?.emit("webrtc-offer", {
						to: otherId,
						from: meId,
						sdp: offer,
						room: roomRef.current ?? undefined,
					});
					makingOffer.current = false;
				}
			} catch (err) {
				console.error("startCall error:", err);
				throw err;
			}
		},
		[createPeerConnection]
	);

	const sendMessage = useCallback((msg: string) => {
		if (!msg?.trim()) return false;
		if (dcRef.current && dcRef.current.readyState === "open") {
			dcRef.current.send(msg);
			setChat((prev) => [...prev, `Me: ${msg}`]);
			return true;
		} else {
			return false;
		}
	}, []);

	const notifyOther = useCallback(
		(socket: Socket | null, room: string, from: string, to: string) => {
			socket?.emit("notify_waiting", { room, from, to });
		},
		[]
	);

	// expose public API
	return {
		attachSocket, // (socket, meId, otherId) => cleanup function
		startCall, // (meId, otherId, socket)
		sendMessage, // (message) => boolean
		notifyOther, // (socket, room, from, to)
		chat,
		isOnline,
		dcOpen,
		closePeerConnection,
		roomRef, // exported ref for room if caller wants to read/set
	};
}
