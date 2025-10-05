import { UserDataProvider } from "@/hooks/UserDataContext";
import { Stack } from "expo-router";

export default function Layout() {
	return (
		<UserDataProvider>
			<Stack
				screenOptions={{
					headerShown: false,
					contentStyle: { backgroundColor: "white" },
				}}
			/>
		</UserDataProvider>
	);
}
