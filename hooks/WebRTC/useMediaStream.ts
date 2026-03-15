import { Audio } from "expo-av";
import { Camera } from "expo-camera";
import { useCallback, useRef } from "react";
import { mediaDevices, MediaStream } from "react-native-webrtc";
import { useSocket } from "../SocketContext";

export function useMediaStream() {
	const { setIsCallActive } = useSocket();
	const localStreamRef = useRef<MediaStream | null>(null);
	const remoteStreamRef = useRef<MediaStream | null>(null);

	const getLocalStream = useCallback(
		async (wantsVideo: boolean): Promise<MediaStream | null> => {
			const audioPerm = await Audio.requestPermissionsAsync();
			const cameraPerm = wantsVideo
				? await Camera.requestCameraPermissionsAsync()
				: { status: "granted" };

			if (
				audioPerm.status !== "granted" ||
				(wantsVideo && cameraPerm.status !== "granted")
			) {
				console.warn("Media permissions denied.");
				return null;
			}

			try {
				const stream = await mediaDevices.getUserMedia({
					audio: true,
					video: wantsVideo,
				});
				localStreamRef.current = stream;
				setIsCallActive(true);
				return stream;
			} catch (err) {
				console.error("Media capture error:", err);
				return null;
			}
		},
		[setIsCallActive]
	);

	const cleanupMedia = useCallback(() => {
		localStreamRef.current?.getTracks().forEach((t) => t.stop());
		remoteStreamRef.current?.getTracks().forEach((t) => t.stop());
		try {
			setIsCallActive(false);
			localStreamRef.current = null;
			remoteStreamRef.current = null;
		} catch (e) {
			console.warn("cleanupMedia error", e);
		}
	}, [setIsCallActive]);

	return { localStreamRef, remoteStreamRef, getLocalStream, cleanupMedia };
}
