// /src/contexts/SocketContext.tsx
import { BASE_URL } from "@/constants/Endpoints";
import { getToken } from "@/services/crypto/secureStorage";
import React, {
	createContext,
	useContext,
	useEffect,
	useRef,
	useState,
} from "react";
import io from "socket.io-client";

const SocketContext = createContext<any>(null);

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
	const socketRef = useRef<any>(null);
	const [connected, setConnected] = useState(false);
	const [userId, setUserId] = useState<string | null>(null);

	useEffect(() => {
		let mounted = true;
		(async () => {
			const token = await getToken();
			if (!token) return;
			// NOTE: you should also get the logged-in userId from auth state
			const myUserId = /* get from auth store */ null;
			setUserId(myUserId);

			// create single socket once
			socketRef.current = io(BASE_URL, {
				transports: ["websocket"],
				auth: { token },
				reconnection: true,
				autoConnect: true,
			});

			const s = socketRef.current;
			s.on("connect", () => {
				if (!mounted) return;
				setConnected(true);
				s.emit("register", { userId: myUserId });
			});
			s.on("disconnect", () => setConnected(false));

			// forward a few useful events app-wide
			s.on("user_online", (d: any) => {
				// propagate via app state or events
			});
			s.on("user_offline", (d: any) => {});

			// cleanup
			return () => {
				mounted = false;
				s.off();
				s.disconnect();
			};
		})();
	}, []);

	const sendSignaling = (evtName: string, payload: any) => {
		socketRef.current?.emit(evtName, payload);
	};

	return (
		<SocketContext.Provider
			value={{
				socket: socketRef.current,
				connected,
				sendSignaling,
				userId,
			}}
		>
			{children}
		</SocketContext.Provider>
	);
};

export const useSocket = () => {
	return useContext(SocketContext);
};
