import { SocketProvider } from "@/hooks/SocketContext";
import { UserDataProvider } from "@/hooks/UserDataContext";
import { Stack } from "expo-router";

export default function Layout() {
	return (
		<UserDataProvider>
			<SocketProvider>
				<Stack
					screenOptions={{
						headerShown: false,
						contentStyle: { backgroundColor: "white" },
					}}
				/>
			</SocketProvider>
		</UserDataProvider>
	);
}
