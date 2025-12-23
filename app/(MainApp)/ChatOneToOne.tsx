// Updated ChatOneToOne.tsx
import { ICE_SERVERS } from "@/constants/Endpoints";
import { useSocket } from "@/hooks/SocketContext";
import { useChatRoom } from "@/hooks/useChatroom";
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
import { Socket } from "socket.io-client";

export default function ChatScreen() {
	const { userId, otherUserId } = useLocalSearchParams<{
		userId: string;
		otherUserId: string;
	}>();
	const [message, setMessage] = useState("");
	const { socket, initSocket } = useSocket(); // Removed unused isConnected, disconnectSocket
	const socketRef = useRef<Socket | null>(null);
	// pass ICE servers from whatever constants you use
	const {
		attachSocket,
		startCall,
		sendMessage,
		notifyOther,
		chat,
		isOnline,
		dcOpen,
		closePeerConnection,
		roomRef,
	} = useWebRTC(ICE_SERVERS);
	// local roomId (note: server returns a UUID for 1:1 via get_or_create_room)
	const [roomId, setRoomId] = useState<string | null>(null);
	// join/leave room peers hook (optional; keeps peer list)
	const { peers } = useChatRoom(socket ?? null, roomId);

	useEffect(() => {
		let detachFn: (() => void) | undefined;
		let didCancel = false;
		const setup = async () => {
			const t = await getToken();
			const meId = userId ? String(userId).trim() : null;
			const otherId = otherUserId ? String(otherUserId).trim() : null;
			if (!t || !meId || !otherId) {
				Alert.alert("Missing identifiers or token");
				return;
			}
			// FIX: Rely solely on global socket from SocketContext. Init if not present (should be rare, as initSocket called at login).
			// Removed fallback temporary socket creation to prevent duplicates/conflicts.
			// Assume initSocket was called earlier; if not, call it here but wait for connection.
			if (!socket) {
				initSocket({ userId: meId, token: t });
			}
			// Wait for socket to be available and connected (add a timeout to prevent infinite wait)
			const activeSocket = await new Promise<Socket | null>((resolve) => {
				if (socket && socket.connected) {
					resolve(socket);
					return;
				}
				// Listen for connect if initializing
				const onConnect = () => resolve(socket);
				socket?.on("connect", onConnect);
				// Timeout after 5s
				const timeout = setTimeout(() => {
					socket?.off("connect", onConnect);
					resolve(null);
				}, 5000);
				return () => {
					clearTimeout(timeout);
					socket?.off("connect", onConnect);
				};
			});
			if (!activeSocket) {
				Alert.alert(
					"Socket Error",
					"Failed to establish socket connection."
				);
				return;
			}
			socketRef.current = activeSocket;
			detachFn = attachSocket(activeSocket, meId, otherId);
		};
		setup();
		return () => {
			try {
				if (detachFn) detachFn();
			} catch {}
			try {
				if (socketRef.current && roomRef.current) {
					socketRef.current.emit("room:leave", {
						roomId: roomRef.current,
					});
				}
			} catch {}
			try {
				closePeerConnection();
			} catch {}
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [userId, otherUserId, socket]); // Added socket dependency to re-run if socket changes

	// Added: Listener for notify_waiting event
	// This fixes the notify button not working by showing an alert when notified
	useEffect(() => {
		const activeSocket = socketRef.current ?? socket;
		if (!activeSocket) return;
		const onNotifyWaiting = ({ from }: { from: string }) => {
			Alert.alert(`Notification, User ${from} is waiting for you!`);
		};
		activeSocket.on("notify_waiting", onNotifyWaiting);
		return () => {
			activeSocket.off("notify_waiting", onNotifyWaiting);
		};
	}, [socket]);

	const handleStartCall = async () => {
		if (!userId || !otherUserId) {
			Alert.alert("Missing IDs", "Cannot start call without both IDs.");
			return;
		}
		try {
			await startCall(
				String(userId),
				String(otherUserId),
				socketRef.current ?? socket ?? null
			);
		} catch (err) {
			console.error("startCall error:", err);
			Alert.alert("Error", "Failed to start call.");
		}
	};
	const handleSendMessage = () => {
		if (!message.trim()) return;
		const ok = sendMessage(message);
		if (ok) setMessage("");
		else Alert.alert("Not connected", "Peer data channel is not open yet.");
	};
	const handleNotifyOther = () => {
		notifyOther(
			socketRef.current ?? socket ?? null,
			roomId ?? "",
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
			<View style={{ flexDirection: "row", gap: 12, marginTop: 8 }}>
				<TouchableOpacity onPress={handleStartCall}>
					<Text>Start Call</Text>
				</TouchableOpacity>
				<TouchableOpacity onPress={handleNotifyOther}>
					<Text>Notify</Text>
				</TouchableOpacity>
			</View>
		</SafeAreaView>
	);
}
