import { BASE_URL, ICE_SERVERS } from "@/constants/Endpoints";
import useWebRTC from "@/hooks/useWebRTC";
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
import io, { Socket } from "socket.io-client";

export default function ChatScreen() {
	const [token, setToken] = useState<string | null>("");
	const { userId, otherUserId } = useLocalSearchParams<{
		userId: string;
		otherUserId: string;
	}>();

	const socketRef = useRef<Socket | null>(null);
	const {
		attachSocket,
		startCall,
		sendMessage,
		notifyOther,
		chat,
		isOnline,
		dcOpen,
		roomRef,
		closePeerConnection,
	} = useWebRTC(ICE_SERVERS);

	const [message, setMessage] = useState<string>("");
	// chat state is provided by hook; remove local chat state
	// const [chat, setChat] = useState<string[]>([]);
	// const [isOnline, setIsOnline] = useState<boolean>(false);
	// const [dcOpen, setDcOpen] = useState(false);

	const room = [userId, otherUserId].sort().join("_");

	useEffect(() => {
		let mounted = true;
		let detachFn: (() => void) | undefined;
		let socket: Socket | null = null;

		const connect = async () => {
			const t = await getToken();
			const meId = userId ? String(userId).trim() : null;
			const otherId = otherUserId ? String(otherUserId).trim() : null;

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

			// Prevent creating a second socket if one already exists (safety)
			if (socketRef.current && socketRef.current.connected) {
				socket = socketRef.current;
				console.log(
					"Socket already connected, reusing existing socket"
				);
			} else {
				socketRef.current = io(BASE_URL, {
					transports: ["websocket"],
					auth: { token: t },
					reconnection: true,
				});
				socket = socketRef.current;
			}

			// on connect/register
			socket.on("connect", () => {
				console.log("socket connected", socket?.id);
				socket?.emit("register", { userId: meId });
			});

			socket.on("connect_error", (err: any) =>
				console.warn("socket connect_err", err)
			);

			// attach socket listeners via hook and keep detach function
			detachFn = attachSocket(socket, String(meId), String(otherId));

			// keep component-level "registered" logging parity
			socket.on("registered", (payload: any) => {
				console.log("socket registered payload (component):", payload);
			});
		};

		// start connection
		connect();

		// IMPORTANT: cleanup returned to useEffect — will run on unmount or deps change
		return () => {
			mounted = false;

			// Call detach returned from hook to remove event listeners + close pc
			try {
				if (typeof detachFn === "function") {
					detachFn();
					detachFn = undefined;
				}
			} catch (e) {
				console.warn("detachFn error:", e);
			}

			// Tell server we're leaving the room (best-effort)
			try {
				if (socketRef.current) {
					socketRef.current.emit("room:leave", { roomId: room });
				}
			} catch (e) {}

			// Remove all listeners and disconnect socket
			try {
				if (socketRef.current) {
					socketRef.current.removeAllListeners();
					socketRef.current.disconnect();
				}
			} catch (e) {
				console.warn("socket disconnect error:", e);
			}

			// ensure local ref cleared & peer cleaned
			socketRef.current = null;
			try {
				closePeerConnection();
			} catch (e) {}

			console.log("cleanup completed for ChatScreen effect");
		};
		// re-run when userId/otherUserId change (same as before)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [userId, otherUserId]);

	const handleStartCall = async () => {
		if (!userId || !otherUserId) {
			Alert.alert("Missing IDs", "Cannot start call without both IDs.");
			return;
		}
		try {
			await startCall(
				String(userId),
				String(otherUserId),
				socketRef.current ?? null
			);
		} catch (err) {
			console.error("startCall error:", err);
			Alert.alert("Error", "Failed to start call.");
		}
	};

	const handleSendMessage = () => {
		if (!message.trim()) return;
		const ok = sendMessage(message);
		if (ok) {
			setMessage("");
		} else {
			Alert.alert("Not connected", "Peer data channel is not open yet.");
		}
	};

	const handleNotifyOther = () => {
		notifyOther(
			socketRef.current ?? null,
			room,
			String(userId),
			String(otherUserId)
		);
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
				<TouchableOpacity onPress={handleSendMessage}>
					<Ionicons name="send" size={20} />
				</TouchableOpacity>
			</View>
		</SafeAreaView>
	);
}
