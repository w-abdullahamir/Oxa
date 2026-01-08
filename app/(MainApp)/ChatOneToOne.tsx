import { ICE_SERVERS } from "@/constants/Endpoints";
import { useSocket } from "@/hooks/SocketContext";
import { useUserData } from "@/hooks/UserDataContext";
import useWebRTC from "@/hooks/useWebRTC";
import { getToken } from "@/services/crypto/secureStorage";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
	Alert,
	FlatList,
	KeyboardAvoidingView,
	Platform,
	StyleSheet,
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

	const { userData } = useUserData();
	const contact = userData?.contacts?.find((c) => c.user === otherUserId);
	const alias = contact?.alias || otherUserId;

	const [message, setMessage] = useState("");
	const { socket, initSocket, onlineUsers } = useSocket();
	const socketRef = useRef<Socket | null>(null);
	const {
		attachSocket,
		startCall,
		sendMessage,
		notifyOther,
		chat,
		dcOpen,
		closePeerConnection,
		roomRef,
	} = useWebRTC(ICE_SERVERS);

	const isPeerOnline = onlineUsers.has(String(otherUserId));
	const isAttached = useRef(false);

	// ... (Keep your existing useEffect, handleStartCall, etc. logic) ...
	useEffect(() => {
		if (!socket || !userId || !otherUserId || isAttached.current) return;
		let detachFn: (() => void) | undefined;
		const setup = async () => {
			isAttached.current = true;
			const t = await getToken();
			if (!socket)
				initSocket({ userId: String(userId), token: t || undefined });
			socketRef.current = socket;
			detachFn = attachSocket(
				socket!,
				String(userId),
				String(otherUserId)
			);
		};
		setup();
		return () => {
			if (detachFn) detachFn();
			isAttached.current = false;
			closePeerConnection();
		};
	}, [userId, otherUserId, socket]);

	const handleSendMessage = () => {
		if (!message.trim()) return;
		if (sendMessage(message)) setMessage("");
		else
			Alert.alert(
				"Connection pending",
				"Please wait for the peer to connect."
			);
	};

	const renderChatItem = ({ item }: { item: string }) => {
		const isMe = item.startsWith("Me:");
		const content = isMe
			? item.replace("Me: ", "")
			: item.replace("Peer: ", "");

		return (
			<View
				style={[
					styles.bubbleContainer,
					isMe ? styles.meContainer : styles.themContainer,
				]}
			>
				<View
					style={[
						styles.bubble,
						isMe ? styles.meBubble : styles.themBubble,
					]}
				>
					<Text
						style={[
							styles.messageText,
							isMe ? styles.meText : styles.themText,
						]}
					>
						{content}
					</Text>
				</View>
			</View>
		);
	};

	return (
		<SafeAreaView style={styles.container} edges={["bottom"]}>
			<Stack.Screen
				options={{
					headerShown: true,
					headerStyle: { backgroundColor: "#121212" },
					headerTintColor: "#fff",
					headerTitle: () => (
						<View style={styles.headerInfo}>
							<Text style={styles.headerAlias} numberOfLines={1}>
								{alias}
							</Text>
							<View
								style={[
									styles.statusDot,
									{
										backgroundColor: isPeerOnline
											? "#4CAF50"
											: "#757575",
									},
								]}
							/>
						</View>
					),
					headerRight: () => (
						<View style={styles.headerActions}>
							<TouchableOpacity
								onPress={() =>
									notifyOther(
										socket,
										"",
										String(userId),
										String(otherUserId)
									)
								}
								style={styles.headerBtn}
							>
								<Ionicons
									name="notifications-outline"
									size={22}
									color="#fff"
								/>
							</TouchableOpacity>
							<TouchableOpacity
								//onPress={handleStartCall}
								style={styles.headerBtn}
							>
								<Ionicons
									name="videocam-outline"
									size={24}
									color="#fff"
								/>
							</TouchableOpacity>
						</View>
					),
				}}
			/>

			<FlatList
				data={chat}
				keyExtractor={(_, i) => i.toString()}
				renderItem={renderChatItem}
				contentContainerStyle={styles.chatList}
			/>

			<KeyboardAvoidingView
				behavior={Platform.OS === "ios" ? "padding" : undefined}
				keyboardVerticalOffset={90}
			>
				<View style={styles.inputContainer}>
					<View style={styles.inputWrapper}>
						<TextInput
							style={styles.input}
							value={message}
							onChangeText={setMessage}
							placeholder={
								dcOpen ? "Type a message..." : "Connecting..."
							}
							placeholderTextColor="#999"
							multiline
						/>
						<TouchableOpacity
							onPress={handleSendMessage}
							disabled={!dcOpen || !message.trim()}
							style={[
								styles.sendBtn,
								(!dcOpen || !message.trim()) && {
									opacity: 0.5,
								},
							]}
						>
							<Ionicons name="send" size={20} color="#fff" />
						</TouchableOpacity>
					</View>
				</View>
			</KeyboardAvoidingView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#000", // Dark theme background
	},
	headerInfo: {
		flexDirection: "row",
		alignItems: "center",
	},
	headerAlias: {
		fontSize: 17,
		fontWeight: "600",
		color: "#fff",
		marginRight: 6,
	},
	statusDot: {
		width: 8,
		height: 8,
		borderRadius: 4,
	},
	headerActions: {
		flexDirection: "row",
		alignItems: "center",
	},
	headerBtn: {
		marginLeft: 15,
		padding: 5,
	},
	chatList: {
		paddingHorizontal: 12,
		paddingVertical: 16,
	},
	bubbleContainer: {
		marginVertical: 4,
		flexDirection: "row",
	},
	meContainer: {
		justifyContent: "flex-end",
	},
	themContainer: {
		justifyContent: "flex-start",
	},
	bubble: {
		maxWidth: "80%",
		paddingVertical: 8,
		paddingHorizontal: 14,
		borderRadius: 20,
	},
	meBubble: {
		backgroundColor: "#007AFF", // Classic iOS blue
		borderBottomRightRadius: 4,
	},
	themBubble: {
		backgroundColor: "#262628",
		borderBottomLeftRadius: 4,
	},
	messageText: {
		fontSize: 16,
	},
	meText: {
		color: "#fff",
	},
	themText: {
		color: "#fff",
	},
	inputContainer: {
		padding: 10,
		backgroundColor: "#000",
	},
	inputWrapper: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: "#1C1C1E",
		borderRadius: 25,
		paddingHorizontal: 15,
		paddingVertical: 5,
		minHeight: 45,
	},
	input: {
		flex: 1,
		color: "#fff",
		fontSize: 16,
		paddingTop: 8,
		paddingBottom: 8,
	},
	sendBtn: {
		backgroundColor: "#007AFF",
		width: 34,
		height: 34,
		borderRadius: 17,
		justifyContent: "center",
		alignItems: "center",
		marginLeft: 8,
	},
});
