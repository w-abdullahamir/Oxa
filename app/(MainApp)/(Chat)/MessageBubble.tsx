import { Colors } from "@/constants/Colors";
import { IMessage } from "@/types/Chat";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface MessageBubbleProps {
	message: IMessage;
	isMe: boolean;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isMe }) => {
	const renderContent = () => {
		switch (message.type) {
			case "text":
				return (
					<Text
						style={[
							styles.text,
							isMe ? styles.meText : styles.themText,
						]}
					>
						{message.content}
					</Text>
				);

			case "image":
				return (
					<Image
						source={{ uri: message.content }}
						style={styles.image}
						resizeMode="cover"
					/>
				);

			case "file":
				return (
					<TouchableOpacity style={styles.fileContainer}>
						<Ionicons
							name="document"
							size={24}
							color={isMe ? "#FFF" : Colors.themBubble}
						/>
						<View style={styles.fileInfo}>
							<Text
								style={[
									styles.fileName,
									isMe && { color: "#FFF" },
								]}
							>
								{message.fileName || "Document"}
							</Text>
							<Text
								style={[
									styles.fileSize,
									isMe && { color: "#EEE" },
								]}
							>
								{message.fileSize
									? `${(message.fileSize / 1024).toFixed(
											1
									  )} KB`
									: ""}
							</Text>
						</View>
					</TouchableOpacity>
				);

			default:
				return (
					<Text style={styles.text}>Unsupported message type</Text>
				);
		}
	};

	return (
		<View
			style={[
				styles.container,
				isMe ? styles.meContainer : styles.themContainer,
			]}
		>
			<View
				style={[
					styles.bubble,
					isMe ? styles.meBubble : styles.themBubble,
				]}
			>
				{renderContent()}
				<Text
					style={[
						styles.timestamp,
						isMe ? styles.meTime : styles.themTime,
					]}
				>
					{new Date(message.timestamp).toLocaleTimeString([], {
						hour: "2-digit",
						minute: "2-digit",
					})}
				</Text>
			</View>
		</View>
	);
};

const styles = StyleSheet.create({
	container: { marginVertical: 4, flexDirection: "row", width: "100%" },
	meContainer: { justifyContent: "flex-end" },
	themContainer: { justifyContent: "flex-start" },
	bubble: { maxWidth: "80%", padding: 10, borderRadius: 15 },
	meBubble: { backgroundColor: Colors.meBubble, borderBottomRightRadius: 2 },
	themBubble: {
		backgroundColor: Colors.themBubble,
		borderBottomLeftRadius: 2,
	},
	text: { fontSize: 16 },
	meText: { color: "#FFF" },
	themText: { color: Colors.text },
	image: { width: 200, height: 200, borderRadius: 10 },
	fileContainer: { flexDirection: "row", alignItems: "center", padding: 5 },
	fileInfo: { marginLeft: 10 },
	fileName: { fontSize: 14, fontWeight: "600" },
	fileSize: { fontSize: 12, color: "#666" },
	timestamp: { fontSize: 10, marginTop: 4, alignSelf: "flex-end" },
	meTime: { color: "#EEE" },
	themTime: { color: "#999" },
});

export default MessageBubble;
