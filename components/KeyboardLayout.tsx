import { Colors } from "@/constants/Colors";
import React, { ReactNode } from "react";
import { StyleSheet } from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { SafeAreaView } from "react-native-safe-area-context";

interface KeyboardLayoutProps {
	children: ReactNode;
}

export function KeyboardLayout({ children }: KeyboardLayoutProps) {
	return (
		<SafeAreaView style={styles.screen}>
			<KeyboardAvoidingView
				behavior="padding"
				style={styles.container}
				keyboardVerticalOffset={85}
			>
				{children}
			</KeyboardAvoidingView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	screen: {
		flex: 1,
		backgroundColor: Colors.background,
	},
	container: {
		flex: 1,
		justifyContent: "center",
		marginTop: -10,
	},
});
