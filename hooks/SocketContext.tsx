import React, { createContext, useContext, useRef, useState } from "react";
import io, { Socket } from "socket.io-client";
import { BASE_URL } from "../constants/Endpoints"; // adjust if your endpoints path differs

type SocketContextType = {
	socket: Socket | null;
	isConnected: boolean;
	initSocket: (opts: { userId: string; token?: string }) => void;
	disconnectSocket: () => void;
};

const SocketContext = createContext<SocketContextType>({
	socket: null,
	isConnected: false,
	initSocket: () => {},
	disconnectSocket: () => {},
});

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
	const [socket, setSocket] = useState<Socket | null>(null);
	const [isConnected, setIsConnected] = useState(false);
	const socketRef = useRef<Socket | null>(null);

	const initSocket = ({
		userId,
		token,
	}: {
		userId: string;
		token?: string;
	}) => {
		if (socketRef.current) return; // already inited

		const newSocket = io(BASE_URL, {
			transports: ["websocket"],
			auth: token ? { token } : undefined,
			query: { userId },
			reconnection: true,
		});

		socketRef.current = newSocket;
		setSocket(newSocket);

		newSocket.on("connect", () => {
			setIsConnected(true);
			console.log("Global socket connected:", newSocket.id);
			// register on server once at login
			if (userId) newSocket.emit("register", { userId });
		});

		newSocket.on("disconnect", () => {
			setIsConnected(false);
			console.log("Global socket disconnected");
		});

		newSocket.on("connect_error", (err: any) => {
			console.warn("Socket connect_error:", err?.message ?? err);
		});
	};

	const disconnectSocket = () => {
		try {
			socketRef.current?.disconnect();
		} catch (e) {
			/* ignore */
		}
		socketRef.current = null;
		setSocket(null);
		setIsConnected(false);
	};

	return (
		<SocketContext.Provider
			value={{ socket, isConnected, initSocket, disconnectSocket }}
		>
			{children}
		</SocketContext.Provider>
	);
};
