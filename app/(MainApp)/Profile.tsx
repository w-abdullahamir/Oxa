import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

export default function ProfileScreen({ name }: { name: string }) {
	const [userName, setUserName] = useState("");
	useEffect(() => {
		try {
			setUserName("asd");
		} catch (error) {
			Toast.show({
				type: "error",
				text1: "Data collecting Failed",
			});
		}
	}, []);

	return (
		<SafeAreaView style={styles.container}>
			<View>
				<Text style={styles.title}>Profile Screen</Text>
			</View>
			<View style={styles.content}>
				<Text style={styles.text}>
					This is the profile screen.{userName}
				</Text>
			</View>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		padding: 24,
		justifyContent: "center",
		backgroundColor: "#fff",
	},
	title: {
		fontSize: 24,
		fontWeight: "bold",
		marginBottom: 20,
		textAlign: "center",
	},
	content: {
		paddingHorizontal: 20,
	},
	text: {
		fontSize: 16,
		color: "#333",
	},
});
