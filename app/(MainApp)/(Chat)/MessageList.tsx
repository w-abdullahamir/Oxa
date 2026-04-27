import { IMessage } from "@/types/Chat";
import React, { useRef } from "react";
import { FlatList, StyleSheet } from "react-native";
import MessageBubble from "./MessageBubble";

interface MessageListProps {
	messages: IMessage[];
	currentUserId: string;
}

const MessageList: React.FC<MessageListProps> = ({
	messages,
	currentUserId,
}) => {
	const flatListRef = useRef<FlatList>(null);
	const invertedMessages = [...messages].reverse();

	return (
		<FlatList
			ref={flatListRef}
			data={invertedMessages}
			inverted={true}
			// Fallback to index if chunks happen to generate identical Date.now() IDs
			keyExtractor={(item, index) => item.id + index.toString()}
			renderItem={({ item }) => (
				<MessageBubble
					message={item}
					isMe={item.senderId === currentUserId}
				/>
			)}
			style={{ flex: 1 }}
			contentContainerStyle={styles.chatList}
			onLayout={() =>
				flatListRef.current?.scrollToEnd({ animated: true })
			}
			keyboardDismissMode="interactive"
			automaticallyAdjustKeyboardInsets={true}
		/>
	);
};

const styles = StyleSheet.create({
	chatList: {
		paddingHorizontal: 12,
		paddingVertical: 16,
	},
});

export default MessageList;
