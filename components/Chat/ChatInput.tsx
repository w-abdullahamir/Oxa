import { Colors } from "@/constants/Colors";
import { Ionicons } from "@expo/vector-icons";
import React, { useRef, useState } from "react";
import { StyleSheet, TextInput, TouchableOpacity, View } from "react-native";

interface ChatInputProps {
	onSendStandard: (content: string) => void;
	onSendChunk: (content: string, streamId: string) => void;
	isLiveStreamingEnabled: boolean;
	dcOpen: boolean;
	onAttach: () => void;
}

const ChatInput: React.FC<ChatInputProps> = ({
	onSendStandard,
	onSendChunk,
	isLiveStreamingEnabled,
	dcOpen,
	onAttach,
}) => {
	const [text, setText] = useState("");
	const committedWordCount = useRef(0);
	const currentStreamId = useRef<string>(
		Math.random().toString(36).substring(7)
	);

	const resetInputState = () => {
		setText("");
		committedWordCount.current = 0;
		currentStreamId.current = Math.random().toString(36).substring(7);
	};

	const handleTextChange = (newText: string) => {
		// 1. Split into words for calculation
		const words = newText
			.trimStart()
			.split(/\s+/)
			.filter((w) => w.length > 0);
		const totalWords = words.length;

		// 2. Identify the "Committed" portion
		// committedWordCount tracks how many words have already been sent to receiver
		const committedString = words
			.slice(0, committedWordCount.current)
			.join(" ");

		// 3. ENFORCE BACKSPACE LIMIT
		// We allow backspacing only if the remaining text length is >= the committed string length
		// We add a small buffer for the final space if applicable
		const minAllowedLength = committedString.length;

		if (isLiveStreamingEnabled && newText.length < minAllowedLength) {
			// Reject the change; user cannot delete sent words
			return;
		}

		setText(newText);
		if (!isLiveStreamingEnabled) return;

		// 4. Sliding Window Logic: Send Word[N-3]
		// If we have 4 words, we send the 1st. If we have 5, we send the 2nd.
		const targetSentCount = Math.max(0, totalWords - 3);

		if (targetSentCount > committedWordCount.current) {
			const wordsToFlush = words.slice(
				committedWordCount.current,
				targetSentCount
			);

			wordsToFlush.forEach((word) => {
				onSendChunk(word + " ", currentStreamId.current);
			});

			committedWordCount.current = targetSentCount;
		}
	};

	const handleManualSend = () => {
		if (!text.trim()) return;

		// 1. Send the full finalized message
		// This will replace the "chunked" preview on the receiver's side
		// with a standard 'final' message bubble.
		onSendStandard(text.trim());

		// 2. Reset the buffer and stream ID for the next thought
		resetInputState();
	};

	return (
		<View style={styles.container}>
			<TouchableOpacity onPress={onAttach} style={styles.iconButton}>
				<Ionicons
					name="add-circle-outline"
					size={28}
					color={Colors.icon}
				/>
			</TouchableOpacity>
			<View style={styles.inputWrapper}>
				<TextInput
					style={styles.input}
					placeholder={dcOpen ? "Type a message..." : "Connecting..."}
					placeholderTextColor={Colors.placeHolder}
					value={text}
					onChangeText={handleTextChange}
					multiline
					//editable={dcOpen}
				/>
			</View>
			<TouchableOpacity
				onPress={handleManualSend}
				style={[
					styles.sendButton,
					(!dcOpen || text.length === 0) && styles.disabled,
				]}
				disabled={!dcOpen || text.length === 0}
			>
				<Ionicons name="send" size={20} color="#FFF" />
			</TouchableOpacity>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flexDirection: "row",
		alignItems: "flex-end",
		padding: 8,
		borderTopWidth: 1,
		borderTopColor: Colors.border,
	},
	iconButton: { padding: 8 },
	inputWrapper: {
		flex: 1,
		backgroundColor: Colors.inputBackground,
		borderRadius: 20,
		marginHorizontal: 8,
		paddingHorizontal: 15,
		maxHeight: 100,
	},
	input: { fontSize: 16, color: Colors.text, paddingVertical: 8 },
	sendButton: {
		backgroundColor: Colors.sendBtn,
		width: 40,
		height: 40,
		borderRadius: 20,
		justifyContent: "center",
		alignItems: "center",
		marginBottom: 4,
	},
	disabled: { backgroundColor: Colors.darkGrey },
});

export default ChatInput;
