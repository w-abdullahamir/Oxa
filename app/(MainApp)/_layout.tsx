import { SocketProvider, useSocket } from "@/hooks/SocketContext";
import { useNotifications } from "@/hooks/useNotification";
import { UserDataProvider } from "@/hooks/UserDataContext";
import { Stack } from "expo-router";
import { useEffect } from "react";
import { AppState } from "react-native";

function AppEntry() {
	useNotifications();

	return (
		<Stack
			screenOptions={{
				headerShown: false,
				contentStyle: { backgroundColor: "white" },
			}}
		/>
	);
}

export default function Layout() {
	const { socket, isCallActive } = useSocket();

	useEffect(() => {
		const sub = AppState.addEventListener("change", (nextState) => {
			if (nextState === "background" && !isCallActive) {
				socket?.disconnect();
				console.log(
					"App backgrounded: No call active, closing socket."
				);
			}
		});
		return () => sub.remove();
	}, [isCallActive, socket]);

	return (
		<UserDataProvider>
			<SocketProvider>
				<AppEntry />
			</SocketProvider>
		</UserDataProvider>
	);
}
