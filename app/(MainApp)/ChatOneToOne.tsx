import { BASE_URL, ICE_SERVERS } from "@/constants/Endpoints";
import { getToken } from "@/services/crypto/secureStorage";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
	Alert,
	FlatList,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
	RTCIceCandidate,
	RTCPeerConnection,
	RTCSessionDescription,
	mediaDevices,
} from "react-native-webrtc";
import io from "socket.io-client";

export default function ChatScreen() {
	const [token, setToken] = useState<string | null>("");
	const { userId, otherUserId } = useLocalSearchParams<{
		userId: string;
		otherUserId: string;
	}>();

	const socketRef = useRef<any>(null);
	const roomRef = useRef<string | null>(null);
	const pc = useRef<RTCPeerConnection | null>(null);
	const dc = useRef<any | null>(null); // keep as any for now
	const iceQueue = useRef<any[]>([]);

	// negotiation helpers
	const makingOffer = useRef(false);
	const ignoreOffer = useRef(false);
	const polite = useRef(false);

	const [message, setMessage] = useState<string>("");
	const [chat, setChat] = useState<string[]>([]);
	const [isOnline, setIsOnline] = useState<boolean>(false);
	const [dcOpen, setDcOpen] = useState(false);

	const room = [userId, otherUserId].sort().join("_");

	const createPeerConnection = async (
		meId: string,
		otherId: string,
		roomId?: string,
		isInitiator?: boolean
	) => {
		if (pc.current) {
			console.log(
				"Closing stale peer connection before creating a new one"
			);
			closePeerConnection();
		}

		console.log("Creating RTCPeerConnection", { isInitiator });
		pc.current = new RTCPeerConnection({ iceServers: ICE_SERVERS } as any);

		// only intiator creates data channel
		if (isInitiator) {
			try {
				dc.current = (pc.current as any).createDataChannel?.("chat");
				setupDataChannel(dc.current);
			} catch (e) {
				console.warn("createDataChannel error:", e);
			}
		}

		// negotiationneeded handler - single entrypoint for offers
		(pc.current as any).onnegotiationneeded = async () => {
			console.log("⚡ negotiationneeded (guarded)");
			if (!pc.current || makingOffer.current) return;
			if (pc.current.signalingState !== "stable") {
				console.log("signalingState not stable, skipping offer");
				return;
			}

			try {
				makingOffer.current = true;

				const offer = await pc.current!.createOffer();
				await pc.current!.setLocalDescription(offer as any);
				console.log("emitting webrtc-offer (negotiationneeded)");
				socketRef.current?.emit("webrtc-offer", {
					to: otherUserId,
					from: meId,
					sdp: offer,
					room: roomRef.current ?? room,
				});
			} catch (err) {
				console.error("negotiationneeded error", err);
			} finally {
				makingOffer.current = false;
			}
		};

		// ICE candidate handler
		(pc.current as any).onicecandidate = (event: any) => {
			if (event?.candidate) {
				console.log("sending ice candidate");
				socketRef.current?.emit("webrtc-ice", {
					to: otherUserId,
					from: meId,
					candidate: event.candidate,
					room: roomRef.current ?? room,
				});
			}
		};

		(pc.current as any).ondatachannel = (event: any) => {
			console.log("data channel received");
			dc.current = event.channel;
			setupDataChannel(dc.current);
		};

		(pc.current as any).ontrack = (ev: any) => {
			console.log("remote track received");
		};

		// flush queued ICE
		if (iceQueue.current.length && pc.current) {
			for (const c of iceQueue.current) {
				try {
					await pc.current.addIceCandidate(
						new RTCIceCandidate(c as any)
					);
				} catch (e) {
					console.warn("failed to add queued ice:", e);
				}
			}
			iceQueue.current = [];
		}
	};

	const setupDataChannel = (channel: any) => {
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
	};

	const closePeerConnection = () => {
		try {
			dc.current?.close?.();
		} catch (e) {}
		dc.current = null;
		try {
			pc.current?.close?.();
		} catch (e) {}
		pc.current = null;
		iceQueue.current = [];
		makingOffer.current = false;
		ignoreOffer.current = false;
		console.log("PeerConnection closed and cleaned");
	};

	useEffect(() => {
		let mounted = true;
		const connect = async () => {
			const t = await getToken();
			const meParam = userId;
			const otherParam = otherUserId;

			// helper to ensure userId normalized
			const meId = meParam ? String(userId).trim() : null;
			const otherId = otherParam ? String(otherUserId).trim() : null;

			console.log("INIT:", { tokenPresent: !!t, meId, otherId });
			if (!t) {
				console.warn("No token - abort socket connect");
				return;
			}
			if (!meId || !otherId) {
				console.warn(
					"Missing userId or otherUserId - abort socket connect"
				);
				Alert.alert(
					"Error",
					"Missing user identifiers. Cannot connect."
				);
				return;
			}
			setToken(t);

			// deteriministic initiator (tie-breaker)
			const isInitiator = String(meId) < String(otherId);
			polite.current = !isInitiator;
			console.log("roles:", { isInitiator, polite: polite.current });

			// create socket, use server canonical room flow
			socketRef.current = io(BASE_URL, {
				transports: ["websocket"],
				auth: { token: t },
				reconnection: true,
			});
			const socket = socketRef.current;

			socket.on("connect", () => {
				console.log("socket connected", socket.id);
				// register so server knows userId -> socketId mapping
				socket.emit("register", { userId: meId });
			});

			socket.on("registered", (payload: any) => {
				console.log("server resgitered reply:", payload);
				// ask server for canonical 1:1 room
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
						// join the room (server may already join on reuse; join again is harmless)
						socket.emit("room:join", { roomId });
					}
				);
			});

			socket.on("room:peers", async ({ roomId, peers }: any) => {
				console.log("room:peers:", roomId, peers);

				// if peer already present, and this client is initiator, create offer
				const peerPresent = peers && peers.includes(otherId);
				await createPeerConnection(meId, otherId, roomId, isInitiator); // ensures pc exists

				// If deterministic initiator and peer present -> start offer
				if (isInitiator && peerPresent) {
					try {
						if (!pc.current) return;
						if (makingOffer.current) return;
						makingOffer.current = true;

						// if you want camera/mic in initial call, add tracks first:
						// const stream = await mediaDevices.getUserMedia({ audio: true, video: true });
						// stream.getTracks().forEach((t:any) => pc.current?.addTrack(t, stream));

						const offer = await (
							pc.current as RTCPeerConnection
						).createOffer();
						await (
							pc.current as RTCPeerConnection
						).setLocalDescription(offer as any);
						socket.emit("webrtc-offer", {
							to: otherId,
							from: meId,
							sdp: offer,
							room: roomRef.current ?? room,
						});
					} catch (err) {
						console.error("create offer error:", err);
					} finally {
						makingOffer.current = false;
					}
				}
			});

			// room peer join notification
			socket.on(
				"room:user-joined",
				async ({ roomId, userId: joinedUser }: any) => {
					console.log(
						"peer joined",
						joinedUser,
						"room:",
						roomRef.current
					);
					// if joined user is the one we want and we are initiator, create offer
					if (String(joinedUser) === otherId) {
						await createPeerConnection(
							meId,
							otherId,
							roomId,
							isInitiator
						);
						if (isInitiator) {
							try {
								if (!pc.current) return;
								if (makingOffer.current) return;
								makingOffer.current = true;

								const offer = await (
									pc.current as RTCPeerConnection
								).createOffer();
								await (
									pc.current as RTCPeerConnection
								).setLocalDescription(offer as any);
								socket.emit("webrtc-offer", {
									to: otherId,
									from: meId,
									sdp: offer,
									room: roomRef.current ?? room,
								});
							} catch (err) {
								console.error("offer on join err:", err);
							} finally {
								makingOffer.current = false;
							}
						}
					}
				}
			);

			// SIGNALING handlers (matching your server names)
			socket.on("webrtc-offer", async (data: any) => {
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
						isInitiator
					);
					const sdp = data.sdp;

					const offerCollision =
						makingOffer.current ||
						(pc.current as any)?.signalingState !== "stable";
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
							await pc.current?.setLocalDescription({
								type: "rollback",
							} as any);
							makingOffer.current = false;
						}
					}

					ignoreOffer.current = false;
					await (pc.current as RTCPeerConnection)!.setRemoteDescription(
						new RTCSessionDescription(sdp as any) as any
					);
					console.log("✅ setRemoteDescription done");
					const answer =
						await (pc.current as RTCPeerConnection)!.createAnswer();
					await (pc.current as RTCPeerConnection)!.setLocalDescription(
						answer as any
					);
					console.log("✅ setLocalDescription(answer) done");
					socket.emit("webrtc-answer", {
						to: data.from,
						from: meId,
						sdp: answer,
						room: roomRef.current ?? room,
					});
				} catch (err) {
					console.error("handle webrtc-offer err", err);
				}
			});

			socket.on("webrtc-answer", async (data: any) => {
				console.log(
					"📥 received answer from",
					data.from?.slice?.(0, 6)
				);
				try {
					if (!pc.current) {
						console.warn("No pc on answer");
						return;
					}

					// only set remote answer when we are expecting one
					const st = pc.current.signalingState;
					if (
						st === "have-local-offer" ||
						st === "have-remote-offer" ||
						st === "have-local-pranswer"
					) {
						await (pc.current as RTCPeerConnection)!.setRemoteDescription(
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
			});

			socket.on("webrtc-ice", async (data: any) => {
				console.log(
					"SERVER got webrtc-ice from",
					socket.data?.userId,
					"payload keys:",
					Object.keys(data || {})
				);
				try {
					if (!pc.current) {
						// queue ICE until pc is ready/exists
						iceQueue.current.push(data.candidate);
						return;
					}
					await (pc.current as RTCPeerConnection).addIceCandidate(
						new RTCIceCandidate(data.candidate as any)
					);
				} catch (err) {
					console.warn("addIceCandidate err", err);
				}
			});

			socket.on("notify_waiting", (d: any) => {
				console.log("notify_waiting", d);
			});

			// online/offline notifications (if server emits those)
			socket.on("user_online", (d: any) => {
				if (d.userId === otherId) setIsOnline(true);
			});
			socket.on("user_offline", (d: any) => {
				if (d.userId === otherId) setIsOnline(false);
			});

			socket.on("room:user-left", ({ roomId, userId: leftUser }: any) => {
				console.log("room:user-left", leftUser);
				if (String(leftUser) === otherId) {
					// peer left -> close pc to avoid stale state
					closePeerConnection();
					setIsOnline(false);
				}
			});

			socket.on("connect_error", (err: any) =>
				console.warn("socket connect_err", err)
			);

			// cleanup on unmount
			return () => {
				mounted = false;
				try {
					socketRef.current?.emit("room:leave", { roomId: room });
				} catch {}
				socketRef.current?.off();
				socketRef.current?.disconnect();
				closePeerConnection();
			};
		};

		connect();

		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [userId, otherUserId]); // note: token is handled locally inside connect

	const startCall = async () => {
		if (!userId || !otherUserId) {
			Alert.alert("Missing IDs", "Cannot start call without both IDs.");
			return;
		}
		await createPeerConnection(
			String(userId),
			String(otherUserId),
			undefined,
			String(userId) < String(otherUserId)
		);
		if (!pc.current) {
			Alert.alert("Error", "Failed to create peer connection");
			return;
		}
		try {
			const stream = await mediaDevices.getUserMedia({
				audio: true,
				video: true,
			});
			stream
				.getTracks()
				.forEach((t: any) => pc.current?.addTrack(t, stream));
			// local offer will be triggered by onnegotiationneeded or we can force:
			if (!makingOffer.current) {
				makingOffer.current = true;
				const offer = await pc.current.createOffer();
				await pc.current.setLocalDescription(offer as any);
				socketRef.current?.emit("webrtc-offer", {
					to: otherUserId,
					from: userId,
					sdp: offer,
					room,
				});
				makingOffer.current = false;
			}
		} catch (err) {
			console.error("startCall error:", err);
			Alert.alert("Call error", "Could not start call.");
		}
	};

	const sendMessage = () => {
		if (!message.trim()) return;
		if (dc.current && dc.current.readyState === "open") {
			dc.current.send(message);
			setChat((prev) => [...prev, `Me: ${message}`]);
			setMessage("");
		} else {
			Alert.alert("Not connected", "Peer data channel is not open yet.");
		}
	};

	const notifyOther = () => {
		socketRef.current?.emit("notify_waiting", {
			room,
			from: userId,
			to: otherUserId,
		});
		Alert.alert(
			"Notified",
			"The other user will get a push notification if available."
		);
	};

	return (
		<SafeAreaView style={{ flex: 1, padding: 10 }}>
			<Stack.Screen
				options={{
					headerShown: true,
					title: isOnline ? "Online" : "Offline",
				}}
			/>
			<FlatList
				data={chat}
				keyExtractor={(_, i) => i.toString()}
				renderItem={({ item }) => (
					<View style={{ padding: 8 }}>
						<Text>{item}</Text>
					</View>
				)}
			/>
			<View style={{ flexDirection: "row", padding: 8 }}>
				<TextInput
					style={{ flex: 1, borderWidth: 1, padding: 8 }}
					value={message}
					onChangeText={setMessage}
					placeholder={
						dcOpen ? "Message" : "Waiting for connection..."
					}
				/>
				<TouchableOpacity onPress={sendMessage}>
					<Ionicons name="send" size={20} />
				</TouchableOpacity>
			</View>
		</SafeAreaView>
	);
}
