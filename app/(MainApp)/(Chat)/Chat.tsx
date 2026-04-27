import { useLocalSearchParams } from "expo-router";
import React from "react";
import { Alert } from "react-native";

import { useChatManager } from "@/hooks/useChatManager";
import { useUserData } from "@/hooks/UserDataContext";
import { pickDocument, pickImage } from "@/services/AttachmentPicker";

import ChatHeader from "@/components/Chat/ChatHeader";
import ChatInput from "@/components/Chat/ChatInput";
import { KeyboardLayout } from "@/components/KeyboardLayout";
import MessageList from "./MessageList";

export default function ChatScreen() {
	const { userId, otherUserId } = useLocalSearchParams<{
		userId: string;
		otherUserId: string;
	}>();

	const { userData } = useUserData();
	const contact = userData?.contacts?.find((c) => c.user === otherUserId);
	const alias = contact?.alias || otherUserId;

	// The "Brain" of the chat
	const {
		messages,
		isPeerOnline,
		dcOpen,
		sendStandardMessage,
		sendChunkedMessage,
		startCall,
		socket,
	} = useChatManager({
		userId: String(userId),
		otherUserId: String(otherUserId),
		isLiveStreamingEnabled: true, // "No Backsies" is ON by default
	});

	// Handle Attachments
	const handleAttach = () => {
		Alert.alert("Send Attachment", "Choose a file type", [
			{
				text: "Image",
				onPress: async () => {
					const result = await pickImage();
					if (result) {
						sendStandardMessage(result.uri, "image", {
							fileName: result.fileName,
							fileSize: result.fileSize,
						});
					}
				},
			},
			{
				text: "Document",
				onPress: async () => {
					const result = await pickDocument();
					if (result) {
						sendStandardMessage(result.uri, "file", {
							fileName: result.fileName,
							fileSize: result.fileSize,
						});
					}
				},
			},
			{ text: "Cancel", style: "cancel" },
		]);
	};

	// Handle Calls
	const handleVideoCall = () => {
		startCall(String(userId), String(otherUserId), socket, true);
	};

	const handleAudioCall = () => {
		startCall(String(userId), String(otherUserId), socket, false);
	};

	return (
		<KeyboardLayout>
			<ChatHeader
				alias={alias}
				isOnline={isPeerOnline}
				onVideoCall={handleVideoCall}
				onAudioCall={handleAudioCall}
			/>

			<MessageList messages={messages} currentUserId={String(userId)} />

			<ChatInput
				dcOpen={dcOpen}
				isLiveStreamingEnabled={true} // Link to your user settings later
				onSendStandard={(content) => sendStandardMessage(content)}
				onSendChunk={(content, streamId) =>
					sendChunkedMessage(content, streamId)
				}
				onAttach={handleAttach}
			/>
		</KeyboardLayout>
	);
}
