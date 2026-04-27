import { Colors } from "@/constants/Colors";
import { Stack } from "expo-router";

export default function Layout() {
	return (
		<Stack
			screenOptions={{
				headerShown: false,
				contentStyle: {
					paddingHorizontal: 24,
					backgroundColor: Colors.background,
				},
			}}
		/>
	);
}
