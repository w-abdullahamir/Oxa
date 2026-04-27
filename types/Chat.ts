export type MessageType =
	| "text"
	| "image"
	| "file"
	| "video_call"
	| "audio_call";

export interface IMessage {
	id: string;
	senderId: string;
	receiverId: string;
	type: MessageType;
	content: string; // Text message or File URI/Base64
	fileName?: string;
	fileSize?: number;
	timestamp: number;
	status: "sending" | "sent" | "delivered" | "error";
	isFinal: boolean; // TRUE = standard message, FALSE = real-time chunk
	iterationId?: string; // Used to group chunks that belong together
	streamId: string;
	isChunk: boolean;
}

export interface ChatState {
	messages: IMessage[];
	isTyping: boolean;
	isPeerOnline: boolean;
}
