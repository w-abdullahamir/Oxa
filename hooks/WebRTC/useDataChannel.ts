import { useCallback, useRef, useState } from "react";
import type { RTCPeerConnection } from "react-native-webrtc";

type DataChannel = ReturnType<RTCPeerConnection["createDataChannel"]>;

export function useDataChannel(onMessageRecieved?: (data: string) => void) {
	const [chat, setChat] = useState<string[]>([]);
	const [dcOpen, setDcOpen] = useState<boolean>(false);
	const dcRef = useRef<DataChannel | null>(null);

	const setupDataChannel = useCallback(
		(channel: any) => {
			dcRef.current = channel;
			channel.onopen = () => setDcOpen(true);
			channel.onclose = () => setDcOpen(false);
			channel.onerror = (err: any) =>
				console.warn("DataChannel error:", err);
			channel.onmessage = (ev: any) => {
				setChat((prev) => [...prev, `${ev.data}`]);
				if (onMessageRecieved) onMessageRecieved(ev.data);
			};
		},
		[onMessageRecieved]
	);

	const sendChatMessage = useCallback((msg: string): boolean => {
		if (!msg?.trim()) return false;
		if (dcRef.current && dcRef.current.readyState === "open") {
			dcRef.current.send(msg);
			setChat((prev) => [...prev, `Me: ${msg}`]);
			return true;
		}
		return false;
	}, []);

	const closeDataChannel = useCallback(() => {
		if (dcRef.current) {
			try {
				dcRef.current.close();
			} catch (e) {
				console.warn("Error closing DataChannel:", e);
			}
			dcRef.current = null;
		}
		setDcOpen(false);
		setChat([]);
	}, []);

	return {
		dcRef,
		chat,
		dcOpen,
		setupDataChannel,
		sendChatMessage,
		closeDataChannel,
	};
}
