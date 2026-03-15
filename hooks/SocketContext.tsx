import { BASE_URL } from "@/constants/Endpoints";
import { useAuth } from "@/hooks/useAuth";
import React, {
	createContext,
	useContext,
	useEffect,
	useRef,
	useState,
} from "react";
import Toast from "react-native-toast-message";
import { io, Socket } from "socket.io-client";

type SocketContextType = {
	socket: Socket | null;
	isConnected: boolean;
	onlineUsers: Set<string>;
	initSocket: (opts: { userId: string; token?: string }) => void;
	disconnectSocket: () => void;
	isCallActive?: boolean;
	setIsCallActive: (active: boolean) => void;
	iceServers: any[];
	setIceServers: (servers: any[]) => void;
};

const SocketContext = createContext<SocketContextType>({
	socket: null,
	isConnected: false,
	onlineUsers: new Set(),
	initSocket: () => {},
	disconnectSocket: () => {},
	setIsCallActive: () => {},
	iceServers: [],
	setIceServers: () => {},
});

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
	const [isCallActive, setIsCallActive] = useState(false);
	const { logout } = useAuth();
	const [socket, setSocket] = useState<Socket | null>(null);
	const [isConnected, setIsConnected] = useState(false);
	const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
	const socketRef = useRef<Socket | null>(null);
	const [iceServers, setIceServers] = useState<any[]>([]);

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
					text2: "Someone logged in from another device.",
				});

				disconnectSocket();
				await logout();
			} catch (error) {
				console.error("Error handling session termination:", error);
			}
		});
	};

	const disconnectSocket = () => {
		console.log("Cleaning up socket...");
		if (socketRef.current) {
			try {
				// Remove all active listeners to prevent "ghost" triggers
				socketRef.current.removeAllListeners();
				socketRef.current.disconnect();
			} catch (e) {
				console.error("Error during socket disconnect:", e);
			}
		}

		// Reset all states
		socketRef.current = null;
		setSocket(null);
		setIsConnected(false);
		setOnlineUsers(new Set()); // Clear the list so UI updates immediately
	};

	// Cleanup Effect for when the app/provider unmounts
	useEffect(() => {
		return () => {
			disconnectSocket();
		};
	}, []);

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
				iceServers,
				setIceServers,
			}}
		>
			{children}
		</SocketContext.Provider>
	);
};
