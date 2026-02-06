import { Colors } from "@/constants/Colors";
import { API_ENDPOINTS, BASE_URL } from "@/constants/Endpoints";
import axios from "axios";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
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
	const [loading, setLoading] = useState(false);

	type ForgotPasswordFormData = {
		email: string;
	};

	const {
		control,
		handleSubmit,
		formState: { errors },
	} = useForm<ForgotPasswordFormData>();

	const prepareNextScreen = (path: string) => {
		setLoading(true);
		try {
			router.replace(path as any);
		} catch (error) {
			console.error("Navigation error:", error);
			Toast.show({
				type: "error",
				text1: "Navigation Error",
				position: "top",
			});
		} finally {
			setLoading(false);
		}
	};

	const handleSendCode = async (data: ForgotPasswordFormData) => {
		setLoading(true);
		try {
			const res = await axios.post(
				`${BASE_URL}${API_ENDPOINTS.FORGOT_PASSWORD}`,
				{ email: data.email },
				{
					headers: {
						"Content-Type": "application/json",
					},
				}
			);

			router.replace({
				pathname: "./EnterPin",
				params: { email: data.email },
			});
		} catch (err: any) {
			if (err.response?.status === 404) {
				console.error("Email not found");
				Toast.show({
					type: "error",
					text1: "Email not found",
					text2: "Please check your email and try again",
					position: "top",
				});
				return;
			}

			console.error("Forgot password error details:", err);
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

			<Controller
				control={control}
				name="email"
				rules={{
					required: "Email is required",
					pattern: {
						value: /^\S+@\S+\.\S+$/,
						message: "Invalid email",
					},
				}}
				render={({ field: { onChange, onBlur, value } }) => (
					<TextInput
						style={styles.input}
						placeholder="name@example.com"
						placeholderTextColor={Colors.placeHolder}
						value={value}
						onChangeText={onChange}
						onBlur={onBlur}
						returnKeyType="next"
						onSubmitEditing={handleSubmit(handleSendCode)}
						autoCapitalize="none"
					/>
				)}
			/>
			{typeof errors.email?.message === "string" && (
				<Text style={styles.error}>{errors.email.message}</Text>
			)}

			{loading ? (
				<ActivityIndicator color={Colors.icon} />
			) : (
				<TouchableOpacity
					onPress={handleSubmit(handleSendCode)}
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

	error: {
		color: Colors.error,
		marginBottom: 12,
		fontSize: 13,
	},
});
