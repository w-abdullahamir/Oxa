import { SocketProvider } from "@/hooks/SocketContext";
import { useNotifications } from "@/hooks/useNotification";
import { UserDataProvider } from "@/hooks/UserDataContext";
import { Stack } from "expo-router";

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
	return (
		<UserDataProvider>
			<SocketProvider>
				<AppEntry />
			</SocketProvider>
		</UserDataProvider>
	);
}
