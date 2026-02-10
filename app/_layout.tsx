import { Colors } from "@/constants/Colors";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import toastConfig from "@/utils/ToastConfig";
import { DarkTheme, ThemeProvider } from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack, useRouter, useSegments } from "expo-router";
import { preventScreenCaptureAsync } from "expo-screen-capture";
import { hideAsync } from "expo-splash-screen";
import { useEffect, useState } from "react";
import { ActivityIndicator, StatusBar, StyleSheet, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

function RootLayoutNav() {
	const { token, loading } = useAuth();
	const segments = useSegments();
	const router = useRouter();

	// Inside your ROOT app/_layout.tsx (RootLayoutNav component)
	useEffect(() => {
		if (loading) return;

		// segments[0] tells us which group we are in: "(auth)", "(MainApp)", or undefined (root)
		const inAuthGroup = segments[0] === "(auth)";
		const inMainGroup = segments[0] === "(MainApp)";

		if (!token && !inAuthGroup) {
			// 1. Kick out to Login ONLY if there is no token and we aren't already in (auth)
			router.replace("/(auth)/Login");
		} else if (token && inAuthGroup) {
			// 2. Go to Home ONLY if we have a token but are still stuck in the (auth) group
			router.replace("/(MainApp)/Home");
		} else if (token && !inMainGroup && !inAuthGroup) {
			// 3. Handle the initial redirect from the root index/splash screen
			router.replace("/(MainApp)/Home");
		}

		// NOTE: If (token && inMainGroup), we do NOTHING.
		// This allows you to navigate freely between Home, Profile, etc.
	}, [token, loading, segments]);

	return (
		<Stack screenOptions={{ headerShown: false }}>
			<Stack.Screen name="(auth)" />
			<Stack.Screen name="(MainApp)" />
			<Stack.Screen name="index" />
		</Stack>
	);
}

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
					<RootLayoutNav />
					{/*<Stack screenOptions={{ headerShown: false }} />*/}
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
