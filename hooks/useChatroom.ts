import { useEffect, useState } from "react";
import type { Socket } from "socket.io-client";

export const useChatRoom = (socket: Socket | null, roomId: string | null) => {
	const [peers, setPeers] = useState<string[]>([]);

	useEffect(() => {
		if (!socket || !roomId) return;

		// join
		socket.emit("room:join", { roomId });

		const onRoomPeers = ({ roomId: id, peers: ps }: any) => {
			if (id === roomId) setPeers(ps ?? []);
		};
		const onUserJoined = ({ roomId: id, userId }: any) => {
			if (id === roomId)
				setPeers((prev) => Array.from(new Set([...prev, userId])));
		};
		const onUserLeft = ({ roomId: id, userId }: any) => {
			if (id === roomId)
				setPeers((prev) => prev.filter((p) => p !== userId));
		};

		socket.on("room:peers", onRoomPeers);
		socket.on("room:user-joined", onUserJoined);
		socket.on("room:user-left", onUserLeft);

		return () => {
			try {
				socket.emit("room:leave", { roomId });
			} catch (e) {
				console.error("Error leaving room:", e);
			}
			socket.off("room:peers", onRoomPeers);
			socket.off("room:user-joined", onUserJoined);
			socket.off("room:user-left", onUserLeft);
			setPeers([]);
		};
	}, [socket, roomId]);

	return { peers };
};
