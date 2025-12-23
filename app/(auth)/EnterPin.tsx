import { Colors } from "@/constants/Colors";
import { API_ENDPOINTS, BASE_URL } from "@/constants/Endpoints";
import axios from "axios";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
	ActivityIndicator,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from "react-native";
import Toast from "react-native-toast-message";

export default function EnterPinScreen() {
	const router = useRouter();
	const { email } = useLocalSearchParams();
	const [pin, setPin] = useState("");
	const [password, setPassword] = useState("");
	const [loading, setLoading] = useState(false);

	const prepareNextScreen = (path: string) => {
		setLoading(true);
		try {
			router.replace(path as any);
		} catch (error) {
			Toast.show({
				type: "error",
				text1: "Navigation Error",
				position: "top",
			});
		} finally {
			setLoading(false);
		}
	};

	const handleResetPassword = async () => {
		if (password.length < 6) {
			Toast.show({
				type: "error",
				text1: "Password must be atleast 6 charachters",
				position: "top",
			});
			return;
		}
		if (!pin) {
			Toast.show({
				type: "error",
				text1: "Enter PIN",
				position: "top",
			});
			return;
		}
		setLoading(true);
		try {
			const res = await axios.post(
				`${BASE_URL}${API_ENDPOINTS.RESET_PASSWORD}`,
				{ email, pin, password },
				{
					headers: { "Content-Type": "application/json" },
				}
			);

			if (res.data.success) {
				Toast.show({
					type: "success",
					text1: "Password updated!",
					position: "top",
				});
				router.replace("./login");
			} else {
				Toast.show({
					type: "error",
					text1: "Password reset failed",
					text2: res.data.message,
					position: "top",
				});
			}
		} catch (err) {
			Toast.show({
				type: "error",
				text1: "Server Error",
				text2: "Something went wrong!",
				position: "top",
			});
		} finally {
			setLoading(false);
		}
	};

	return (
		<View style={styles.container}>
			<Text style={styles.title}>Reset Your Password</Text>

			<View style={{ marginBottom: 20 }}>
				<Text
					style={{
						color: Colors.icon,
						fontSize: 16,
						textAlign: "center",
					}}
				>
					A PIN has been sent to:
				</Text>
				<Text
					style={{
						color: Colors.text,
						fontWeight: "bold",
						fontSize: 18,
						textAlign: "center",
					}}
				>
					{email}
				</Text>
			</View>

			<TextInput
				value={pin}
				onChangeText={setPin}
				keyboardType="number-pad"
				placeholder="Enter 6-digit PIN"
				placeholderTextColor="#999"
				maxLength={6}
				style={styles.input}
			/>

			<TextInput
				value={password}
				onChangeText={setPassword}
				secureTextEntry
				placeholder="New password"
				placeholderTextColor="#999"
				style={styles.input}
			/>

			{loading ? (
				<ActivityIndicator style={styles.loader} color={Colors.tint} />
			) : (
				<TouchableOpacity
					style={styles.button}
					onPress={handleResetPassword}
				>
					<Text style={styles.buttonText}>Reset Password</Text>
				</TouchableOpacity>
			)}

			<TouchableOpacity
				onPress={() => prepareNextScreen("/(auth)/ForgotPassword")}
			>
				<Text style={styles.backText}>Wrong email? Go back</Text>
			</TouchableOpacity>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		padding: 24,
		justifyContent: "center",
		backgroundColor: Colors.background,
	},

	title: {
		fontSize: 22,
		fontWeight: "bold",
		textAlign: "center",
		marginBottom: 32,
		color: Colors.text,
	},

	input: {
		backgroundColor: "#1d1f20",
		color: Colors.text,
		borderRadius: 10,
		padding: 14,
		fontSize: 16,
		borderColor: "#2a2d2f",
		borderWidth: 1,
		marginBottom: 16,
	},

	button: {
		backgroundColor: Colors.tint,
		paddingVertical: 14,
		borderRadius: 10,
		alignItems: "center",
		marginTop: 10,
	},

	buttonText: {
		color: Colors.text,
		fontWeight: "bold",
		fontSize: 16,
		letterSpacing: 1,
	},

	loader: {
		marginTop: 10,
	},

	backText: {
		marginTop: 24,
		color: Colors.icon,
		fontSize: 14,
		textAlign: "center",
		textDecorationLine: "underline",
	},
});
