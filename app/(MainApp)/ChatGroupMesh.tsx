// props: userId, roomId
// This manages MANY peers: Map<peerId, PeerEntry>
import { ICE_SERVERS } from "@/constants/Endpoints";
import { useSocket } from "@/hooks/SocketContext";
import { createPeer, PeerEntry } from "@/utils/webrtc";
import { useEffect, useRef, useState } from "react";
import { RTCIceCandidate } from "react-native-webrtc";
import { Socket } from "socket.io-client";

export default function ChatGroupMesh({
	userId,
	roomId,
}: {
	userId: string;
	roomId: string;
}) {
	const { socket } = useSocket();
	const socketRef = useRef<Socket | null>(socket);
	const peers = useRef<Map<string, PeerEntry>>(new Map());
	const [logs, setLogs] = useState<string[]>([]);

	const addLog = (t: string) => setLogs((p) => [...p, t]);

	const getOrCreatePeer = (peerId: string, initiator: boolean) => {
		if (peers.current.has(peerId)) return peers.current.get(peerId)!;
		const entry = createPeer(ICE_SERVERS);
		entry.pc.onicecandidate = (e: any) => {
			if (e.candidate)
				socketRef.current?.emit("webrtc-ice", {
					to: peerId,
					candidate: e.candidate,
				});
		};
		entry.pc.ondatachannel = (e: any) => {
			entry.dc = e.channel as any;
			wireDataChannel(peerId, entry);
		};
		if (initiator) {
			entry.dc = entry.pc.createDataChannel("chat");
			wireDataChannel(peerId, entry);
			(async () => {
				const offer = await entry.pc.createOffer();
				await entry.pc.setLocalDescription(offer);
				socketRef.current?.emit("webrtc-offer", {
					to: peerId,
					sdp: offer,
					meta: { roomId },
				});
			})();
		}
		peers.current.set(peerId, entry);
		return entry;
	};

	const wireDataChannel = (peerId: string, entry: PeerEntry) => {
		entry.dc!.onopen = () => addLog(`dc open with ${peerId}`);
		entry.dc!.onclose = () => addLog(`dc closed with ${peerId}`);
		entry.dc!.onmessage = (e: any) => addLog(`[${peerId}] ${e.data}`);
	};

	useEffect(() => {
		socketRef.current = socket;

		socket?.on("connect", () => socket.emit("register", { userId }));
		socket?.on("registered", () => socket.emit("room:join", { roomId }));

		socket?.on("room:peers", ({ peers: ids }) => {
			// create connections to all existing peers if I am "lower" to avoid glare
			ids.forEach((pId: string) => {
				const initiator = userId < pId; // simple tie-breaker
				getOrCreatePeer(pId, initiator);
			});
		});

		socket?.on("room:user-joined", ({ userId: pId }) => {
			const initiator = userId < pId;
			getOrCreatePeer(pId, initiator);
		});

		socket?.on("webrtc-offer", async ({ from, sdp }) => {
			const entry = getOrCreatePeer(from, false);
			await entry.pc.setRemoteDescription(sdp);
			const answer = await entry.pc.createAnswer();
			await entry.pc.setLocalDescription(answer);
			socket.emit("webrtc-answer", { to: from, sdp: answer });
			// flush ICE
			for (const c of entry.iceQueue) {
				try {
					await entry.pc.addIceCandidate(new RTCIceCandidate(c));
				} catch {}
			}
			entry.iceQueue = [];
		});

		socket?.on("webrtc-answer", async ({ from, sdp }) => {
			const entry = peers.current.get(from);
			if (!entry) return;
			await entry.pc.setRemoteDescription(sdp);
		});

		socket?.on("webrtc-ice", async ({ from, candidate }) => {
			const entry = peers.current.get(from);
			if (!entry) return;
			if (!entry.pc.remoteDescription) entry.iceQueue.push(candidate);
			else {
				try {
					await entry.pc.addIceCandidate(
						new RTCIceCandidate(candidate)
					);
				} catch {}
			}
		});

		socket?.on("room:user-left", ({ userId: pId }) => {
			const entry = peers.current.get(pId);
			try {
				entry?.dc?.close();
				entry?.pc?.close();
			} catch {}
			peers.current.delete(pId);
			addLog(`${pId} left`);
		});

		return () => {
			socket?.emit("room:leave", { roomId });
			socket?.off();
			socket?.disconnect();
			for (const [, entry] of peers.current) {
				try {
					entry.dc?.close();
					entry.pc.close();
				} catch {}
			}
			peers.current.clear();
		};
	}, [userId, roomId, socket]);

	// UI omitted; wire your message box to entry.dc.send(...) per peer
	return null;
}
