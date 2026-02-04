import { useAuth } from "@/hooks/useAuth";
import { router } from "expo-router";
import React, { createContext, useContext, useRef, useState } from "react";
import Toast from "react-native-toast-message";
import io, { Socket } from "socket.io-client";
import { BASE_URL } from "../constants/Endpoints"; // adjust if your endpoints path differs

type SocketContextType = {
	socket: Socket | null;
	isConnected: boolean;
	onlineUsers: Set<string>;
	initSocket: (opts: { userId: string; token?: string }) => void;
	disconnectSocket: () => void;
	isCallActive?: boolean;
	setIsCallActive: (active: boolean) => void;
};

const SocketContext = createContext<SocketContextType>({
	socket: null,
	isConnected: false,
	onlineUsers: new Set(),
	initSocket: () => {},
	disconnectSocket: () => {},
	setIsCallActive: () => {},
});

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
	const [isCallActive, setIsCallActive] = useState(false);
	const { logout } = useAuth();
	const [socket, setSocket] = useState<Socket | null>(null);
	const [isConnected, setIsConnected] = useState(false);
	const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
	const socketRef = useRef<Socket | null>(null);

	const initSocket = ({
		userId,
		token,
	}: {
		userId: string;
		token?: string;
	}) => {
		if (socketRef.current) return;

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
			setOnlineUsers(new Set());
			console.log("Global socket disconnected");
		});

		// --- GLOBAL ONLINE STATUS LISTENERS ---

		// get initial list of online users
		newSocket.on("users_list", ({ users }: { users: string[] }) => {
			setOnlineUsers(new Set(users));
		});

		// listen for users coming online
		newSocket.on("user_online", ({ userId }: { userId: string }) => {
			setOnlineUsers((prev) => {
				const next = new Set(prev);
				next.add(String(userId));
				return next;
			});
		});

		// listen for users going offline
		newSocket.on("user_offline", ({ userId }: { userId: string }) => {
			setOnlineUsers((prev) => {
				const next = new Set(prev);
				next.delete(String(userId));
				return next;
			});
		});

		newSocket.on("connect_error", (err: any) => {
			console.warn("Socket connect_error:", err?.message ?? err);
		});

		// Inside SocketContext.tsx -> initSocket function

		newSocket.on("session_terminated", async ({ reason }) => {
			console.warn("Session terminated by server:", reason);

			try {
				Toast.show({
					type: "info",
					text1: "Session Terminated",
					text2: "Logged in from another device.",
				});

				disconnectSocket();
				await logout();
				router.replace("/(auth)/Login");
			} catch (error) {
				router.replace("/(auth)/Login");
			}
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
			value={{
				socket,
				isConnected,
				onlineUsers,
				initSocket,
				disconnectSocket,
				isCallActive,
				setIsCallActive,
			}}
		>
			{children}
		</SocketContext.Provider>
	);
};
