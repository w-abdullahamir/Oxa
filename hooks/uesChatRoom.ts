// hooks/useChatRoom.ts
import { useSocket } from "@/hooks/SocketContext";
import { useEffect, useState } from "react";

export const useChatRoom = (roomId: string, userId: string) => {
	const { socket } = useSocket();
	const [peers, setPeers] = useState<string[]>([]);

	useEffect(() => {
		if (!socket || !roomId) return;

		socket.emit("room:join", { roomId });

		socket.on("room:peers", ({ peers }) => {
			setPeers(peers);
		});

		socket.on("room:user-joined", ({ userId }) => {
			setPeers((prev) => [...new Set([...prev, userId])]);
		});

		socket.on("room:user-left", ({ userId }) => {
			setPeers((prev) => prev.filter((id) => id !== userId));
		});

		return () => {
			socket.emit("room:leave", { roomId });
			socket.off("room:peers");
			socket.off("room:user-joined");
			socket.off("room:user-left");
		};
	}, [socket, roomId]);

	return { peers };
};
