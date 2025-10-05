import { Colors } from "@/constants/Colors";
import { BASE_URL, API_ENDPOINTS } from "@/constants/Endpoints";
import axios from "axios";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
	ActivityIndicator,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from "react-native";
import Toast from "react-native-toast-message";

export default function ForgotPasswordScreen() {
	const router = useRouter();
	const [email, setEmail] = useState("");
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

	const handleSendCode = async () => {
		if (email.length < 4 || !email.includes("@"))
			return Toast.show({
				type: "error",
				text1: "Invalid Email",
				position: "top",
			});
		setLoading(true);
		try {
			const res = await axios.post(
				`${BASE_URL}${API_ENDPOINTS.FORGOT_PASSWORD}`,
				{ email },
				{
					headers: {
						"Content-Type": "application/json",
						//"x-api-key": "reqres-free-v1",
						//API usage example above. Removeable
					},
				}
			);
			if (res.data.success) {
				router.replace({
					pathname: "./EnterPin",
					params: { email },
				});
			} else {
				Toast.show({
					type: "error",
					text1: "Email not found",
					position: "top",
				});
			}
		} catch (err) {
			Toast.show({
				type: "error",
				text1: "Server Error",
				text2: "Try again in a few minutes",
				position: "top",
			});
		} finally {
			setLoading(false);
		}
	};

	return (
		<View style={styles.container}>
			<Text style={styles.label}>Enter your email</Text>
			<TextInput
				value={email}
				onChangeText={setEmail}
				keyboardType="email-address"
				autoCapitalize="none"
				placeholder="name@example.com"
				placeholderTextColor="#666"
				style={styles.input}
			/>
			{loading ? (
				<ActivityIndicator color={Colors.icon} />
			) : (
				<TouchableOpacity
					onPress={handleSendCode}
					style={styles.button}
				>
					<Text style={styles.buttonText}>Get Reset Code</Text>
				</TouchableOpacity>
			)}

			<TouchableOpacity onPress={() => prepareNextScreen("./Login")}>
				<Text style={styles.rememberedText}>
					Remember your password? Log in
				</Text>
			</TouchableOpacity>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: Colors.background,
		padding: 24,
		justifyContent: "center",
	},

	label: {
		color: Colors.text,
		fontSize: 18,
		marginBottom: 12,
		fontWeight: "600",
	},

	input: {
		backgroundColor: "#1d1f20",
		color: Colors.text,
		borderRadius: 10,
		padding: 14,
		fontSize: 16,
		borderColor: "#2a2d2f",
		borderWidth: 1,
		marginBottom: 20,
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

	rememberedText: {
		color: Colors.icon,
		textAlign: "center",
		marginTop: 24,
		textDecorationLine: "underline",
		fontSize: 14,
	},
});
