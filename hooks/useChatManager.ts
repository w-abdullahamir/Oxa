import { useSocket } from "@/hooks/SocketContext";
import useWebRTC from "@/hooks/useWebRTC";
import { getToken } from "@/services/crypto/secureStorage";
import { IMessage, MessageType } from "@/types/Chat";
import { useCallback, useEffect, useRef, useState } from "react";

interface UseChatManagerProps {
	userId: string;
	otherUserId: string;
	isLiveStreamingEnabled?: boolean; // The "No Backsies" feature flag (On by default)
}

export const useChatManager = ({
	userId,
	otherUserId,
	isLiveStreamingEnabled = true,
}: UseChatManagerProps) => {
	const [messages, setMessages] = useState<IMessage[]>([]);

	// ==========================================
	// MESSAGE HANDLING LOGIC
	// ==========================================

	/**
	 * Internal function to process incoming or outgoing message objects
	 * This handles the "Interruption" and "Continuous Thought" rules.
	 */
	const processMessage = useCallback(
		(msg: IMessage) => {
			setMessages((prev) => {
				// Rule 1: Standard messages (or if feature is disabled) just get added
				if (!msg.isChunk || !isLiveStreamingEnabled) {
					lastSpeakerId.current = msg.senderId;
					activeStreamId.current = null; // Reset stream
					return [...prev, msg];
				}

				// Rule 2: "Continuous Thought" - Same speaker, same stream, no interruptions
				if (
					lastSpeakerId.current === msg.senderId &&
					activeStreamId.current === msg.streamId
				) {
					const newMessages = [...prev];
					const lastMsgIndex = newMessages.length - 1;

					if (lastMsgIndex >= 0) {
						// Append the new words to the existing bubble
						newMessages[lastMsgIndex] = {
							...newMessages[lastMsgIndex],
							content:
								newMessages[lastMsgIndex].content +
								" " +
								msg.content,
							timestamp: msg.timestamp, // Update to latest time
						};
						return newMessages;
					}
				}

				// Rule 3: "Interruption" or New Stream - Create a new bubble
				lastSpeakerId.current = msg.senderId;
				activeStreamId.current = msg.streamId || null;
				return [...prev, msg];
			});
		},
		[isLiveStreamingEnabled]
	);

	const { socket, initSocket, onlineUsers, iceServers } = useSocket();
	const handleIncomingMessage = useCallback(
		(rawMsg: string) => {
			try {
				const parsedMsg: IMessage = JSON.parse(rawMsg);
				processMessage(parsedMsg);
			} catch (error) {
				console.error("Error parsing incoming message:", error);
			}
		},
		[processMessage]
	);
	const {
		attachSocket,
		startCall,
		sendMessage: sendWebRTCMessage,
		notifyOther,
		dcOpen,
		closePeerConnection,
	} = useWebRTC(iceServers, handleIncomingMessage);

	// 3. Tracking Refs for "No Backsies" Protocol
	const socketRef = useRef(socket);
	const isAttached = useRef(false);

	// Tracks the current continuous thought to know when to append vs. create new bubble
	const activeStreamId = useRef<string | null>(null);
	// Tracks who spoke last to detect "interruptions"
	const lastSpeakerId = useRef<string | null>(null);

	const isPeerOnline = onlineUsers.has(String(otherUserId));

	// ==========================================
	// INITIALIZATION & CONNECTION
	// ==========================================
	useEffect(() => {
		if (!socket || !userId || !otherUserId || isAttached.current) return;

		let detachFn: (() => void) | undefined;

		const setup = async () => {
			isAttached.current = true;
			const token = await getToken();

			if (!socket) {
				initSocket({
					userId: String(userId),
					token: token || undefined,
				});
			}
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
	}, [
		userId,
		otherUserId,
		socket,
		attachSocket,
		closePeerConnection,
		initSocket,
	]);

	// ==========================================
	// PUBLIC EXPOSED ACTIONS
	// ==========================================

	/**
	 * Sends a standard message (File, Image, or Full Text if feature is off)
	 */
	const sendStandardMessage = (
		content: string,
		type: MessageType = "text",
		meta?: any
	) => {
		if (!dcOpen) return false;

		const newMessage: IMessage = {
			id: Date.now().toString(),
			senderId: userId,
			receiverId: otherUserId,
			type,
			content,
			timestamp: Date.now(),
			status: "sent",
			isChunk: false,
			...meta,
		};

		const success = sendWebRTCMessage(JSON.stringify(newMessage));
		if (success) processMessage(newMessage);
		return success;
	};

	/**
	 * Sends a 3-word chunk for the "No Backsies" feature
	 */
	const sendChunkedMessage = (content: string, streamId: string) => {
		if (!dcOpen || !isLiveStreamingEnabled) return false;

		const chunkMessage: IMessage = {
			id: Date.now().toString(),
			senderId: userId,
			receiverId: otherUserId,
			type: "text",
			content,
			timestamp: Date.now(),
			status: "sent",
			isChunk: true,
			streamId,
			isFinal: false,
		};

		const success = sendWebRTCMessage(JSON.stringify(chunkMessage));
		if (success) processMessage(chunkMessage);
		return success;
	};

	// Note: You will need to wire your WebRTC incoming data channel
	// to call `processMessage(JSON.parse(incomingString))` when data arrives.

	return {
		messages,
		isPeerOnline,
		dcOpen,
		sendStandardMessage,
		sendChunkedMessage,
		startCall, // Passed up for the Header icons
		notifyOther, // Passed up for the Header icons
		socket: socketRef.current,
	};
};
