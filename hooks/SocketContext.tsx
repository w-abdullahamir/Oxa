import { BASE_URL } from "@/constants/Endpoints";
import React, { createContext, useContext, useState } from "react";
import io, { Socket } from "socket.io-client";

interface SocketContextType {
	socket: Socket | null;
	isConnected: boolean;
	initSocket: (user: { id: string }) => void;
	disconnectSocket: () => void;
}

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

	const initSocket = (user: { id: string }) => {
		if (socket) return; // prevent re-init
		const newSocket = io(BASE_URL, {
			transports: ["websocket"],
			query: { userId: user.id },
		});

		setSocket(newSocket);

		newSocket.on("connect", () => setIsConnected(true));
		newSocket.on("disconnect", () => setIsConnected(false));
		newSocket.on("connect_error", (err) =>
			console.log("Socket error:", err.message)
		);
	};

	const disconnectSocket = () => {
		socket?.disconnect();
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
