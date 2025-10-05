import { Colors } from "@/constants/Colors";
import { AuthProvider } from "@/hooks/useAuth";
import toastConfig from "@/utils/ToastConfig";
import { DarkTheme, ThemeProvider } from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { preventScreenCaptureAsync } from "expo-screen-capture";
import { hideAsync } from "expo-splash-screen";
import { useEffect, useState } from "react";
import { ActivityIndicator, StatusBar, StyleSheet, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

export default function Layout() {
	const [isReady, setIsReady] = useState(false);
	const [fontsLoaded] = useFonts({
		SpaceMono: require("@/assets/fonts/SpaceMono-Regular.ttf"),
	});

	useEffect(() => {
		async function prepare() {
			try {
				await preventScreenCaptureAsync();
			} catch (e) {
				console.error("Screen capture prevent failed:", e);
			}
			if (fontsLoaded) {
				setIsReady(true);
				await hideAsync();
			}
		}

		prepare();
	}, [fontsLoaded]);

	if (!isReady) {
		return (
			<View style={styles.container}>
				<ActivityIndicator size="large" color={Colors.tint} />
			</View>
		);
	}

	return (
		<SafeAreaProvider>
			<AuthProvider>
				<ThemeProvider value={DarkTheme}>
					<StatusBar translucent={false} barStyle={"light-content"} />
					<Stack screenOptions={{ headerShown: false }} />
					<Toast config={toastConfig} />
				</ThemeProvider>
			</AuthProvider>
		</SafeAreaProvider>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		backgroundColor: "#000",
	},
});
