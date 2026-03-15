import { useCallback, useRef } from "react";
import { RTCIceCandidate, RTCPeerConnection } from "react-native-webrtc";

export function usePeerConnection(ICE_SERVERS: any[]) {
	const pcRef = useRef<RTCPeerConnection | null>(null);
	const makingOffer = useRef(false);
	const ignoreOffer = useRef(false);
	const polite = useRef(false);
	const iceQueueRef = useRef<any[]>([]);

	const initializePeerConnection = useCallback(() => {
		let isNew = false;
		if (pcRef.current) {
			const pcState = pcRef.current.connectionState;
			if (pcState === "connected" || pcState === "connecting") {
				return { pc: pcRef.current, isNew };
			} else {
				try {
					pcRef.current.close();
				} catch (e) {
					console.warn("InitializePeerConnection failed: ", e);
				}
				pcRef.current = null;
			}
		}

		isNew = true;
		pcRef.current = new RTCPeerConnection({
			iceServers: ICE_SERVERS,
		} as any);
		pcRef.current.addTransceiver("audio", { direction: "recvonly" });
		pcRef.current.addTransceiver("video", { direction: "recvonly" });

		return { pc: pcRef.current, isNew };
	}, [ICE_SERVERS]);

	const processIceCandidate = useCallback(async (candidate: any) => {
		const pc = pcRef.current;
		if (!pc || !pc.remoteDescription) {
			iceQueueRef.current.push(candidate);
			return;
		}
		try {
			await pc.addIceCandidate(new RTCIceCandidate(candidate));
		} catch (e) {
			console.warn("Failed to add ICE candidate:", e);
		}
	}, []);

	const flushIceQueue = useCallback(async () => {
		const pc = pcRef.current;
		if (!pc || iceQueueRef.current.length === 0) return;

		for (const candidate of iceQueueRef.current) {
			try {
				await pc.addIceCandidate(new RTCIceCandidate(candidate as any));
			} catch (e) {
				console.warn("Failed to add queued ICE:", e);
			}
		}
		iceQueueRef.current = [];
	}, []);

	const closePeerConnection = useCallback(() => {
		if (pcRef.current) {
			try {
				pcRef.current.close();
			} catch (e) {
				console.warn("closePeerConnection failed: ", e);
			}
			pcRef.current = null;
		}
		iceQueueRef.current = [];
		makingOffer.current = false;
		ignoreOffer.current = false;
	}, []);

	return {
		pcRef,
		makingOffer,
		ignoreOffer,
		polite,
		initializePeerConnection,
		processIceCandidate,
		flushIceQueue,
		closePeerConnection,
	};
}
