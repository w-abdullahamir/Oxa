import { Colors } from "@/constants/Colors";
import { API_ENDPOINTS, BASE_URL } from "@/constants/Endpoints";
import axios from "axios";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useRef, useState } from "react";
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

export default function EnterPinScreen() {
	const router = useRouter();
	const { email } = useLocalSearchParams();
	const [loading, setLoading] = useState(false);
	const passwordRef = useRef<TextInput>(null);

	type ResetPinFormData = {
		resetPin: number;
		password: string;
	};

	const {
		control,
		handleSubmit,
		formState: { errors },
	} = useForm<ResetPinFormData>();

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

	const handleResetPassword = async (data: ResetPinFormData) => {
		setLoading(true);
		try {
			await axios.post(
				`${BASE_URL}${API_ENDPOINTS.RESET_PASSWORD}`,
				{ token: data.resetPin, password: data.password },
				{
					headers: { "Content-Type": "application/json" },
				}
			);

			Toast.show({
				type: "success",
				text1: "Password updated!",
				position: "top",
			});
			router.replace("./Login");
		} catch (err: any) {
			if (err.response?.status === 400) {
				console.error(
					"Password reset error details:",
					err.response.data
				);
				Toast.show({
					type: "error",
					text1: "Password reset failed",
					text2: "Invalid or expired reset code",
					position: "top",
				});
				return;
			} else if (err.response?.status === 404) {
				console.error(
					"Password reset error details:",
					err.response.data
				);
				Toast.show({
					type: "error",
					text1: "Reset Failed",
					text2: "User not found. Please check your email and try again.",
					position: "top",
				});
				return;
			}

			console.error("Password reset error:", err);
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

			<Controller
				control={control}
				name="resetPin"
				rules={{
					required: "PIN is required",
					minLength: { value: 6, message: "PIN must be 6 digits" },
					maxLength: { value: 6, message: "PIN must be 6 digits" },
					pattern: {
						value: /^\d{6}$/,
						message: "PIN must be numeric",
					},
				}}
				render={({ field: { onChange, onBlur, value } }) => (
					<TextInput
						style={styles.input}
						placeholder="Enter 6-digit PIN"
						placeholderTextColor={Colors.placeHolder}
						keyboardType="number-pad"
						value={value?.toString()}
						onChangeText={onChange}
						onBlur={onBlur}
						returnKeyType="next"
						onSubmitEditing={() => passwordRef.current?.focus()}
					/>
				)}
			/>
			{typeof errors.resetPin?.message === "string" && (
				<Text style={styles.error}>{errors.resetPin.message}</Text>
			)}
			<Controller
				control={control}
				name="password"
				rules={{ required: "Password is required", minLength: 8 }}
				render={({ field: { onChange, onBlur, value } }) => (
					<TextInput
						ref={passwordRef}
						style={styles.input}
						placeholder="Password"
						placeholderTextColor={Colors.placeHolder}
						secureTextEntry
						value={value}
						onChangeText={onChange}
						onBlur={onBlur}
						returnKeyType="done"
						onSubmitEditing={handleSubmit(handleResetPassword)}
						autoCapitalize="none"
					/>
				)}
			/>
			{typeof errors.password?.message === "string" && (
				<Text style={styles.error}>{errors.password.message}</Text>
			)}

			{loading ? (
				<ActivityIndicator style={styles.loader} color={Colors.tint} />
			) : (
				<TouchableOpacity
					style={styles.button}
					onPress={handleSubmit(handleResetPassword)}
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

	error: {
		color: Colors.error,
		marginBottom: 12,
		fontSize: 13,
	},
});
