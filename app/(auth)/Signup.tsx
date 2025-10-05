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
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

export default function Signup() {
	const router = useRouter();
	const [isLoading, setIsLoading] = useState(false);

	type SignupFormData = {
		email: string;
		password: string;
		username: string;
	};

	const {
		control,
		handleSubmit,
		formState: { errors },
	} = useForm<SignupFormData>();

	const prepareNextScreen = (path: string) => {
		setIsLoading(true);
		try {
			router.replace(path as any);
		} catch (error) {
			Toast.show({
				type: "error",
				text1: "Navigation Error",
				position: "top",
			});
		} finally {
			setIsLoading(false);
		}
	};

	const onSubmit = async (data: SignupFormData) => {
		setIsLoading(true);
		try {
			const res = await axios.post(`${BASE_URL}${API_ENDPOINTS.REGISTER}`, data, {
				headers: {
					"Content-Type": "application/json",
					"x-api-key": "reqres-free-v1",
				},
			});

			if (res.data.success) {
				router.replace("/(MainApp)/Home");
			} else {
				Toast.show({
					type: "error",
					text1: "Signup Failed",
					text2: res.data.message,
					position: "top",
				});
			}
		} catch (error) {
			Toast.show({
				type: "error",
				text1: "Server Error",
				text2: "Something went wrong! Please try again.",
				position: "top",
			});
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<SafeAreaProvider>
			<SafeAreaView style={styles.container}>
				<Text style={styles.title}>Create an Account</Text>

				<Controller
					control={control}
					name="email"
					rules={{ required: "Email is required" }}
					render={({ field: { onChange, value } }) => (
						<TextInput
							style={styles.input}
							placeholder="Email"
							placeholderTextColor="#999"
							value={value}
							onChangeText={onChange}
							autoCapitalize="none"
						/>
					)}
				/>
				{typeof errors.email?.message === "string" && (
					<Text style={styles.error}>{errors.email.message}</Text>
				)}

				<Controller
					control={control}
					name="password"
					rules={{ required: "Password is required", minLength: 6 }}
					render={({ field: { onChange, value } }) => (
						<TextInput
							style={styles.input}
							placeholder="Password"
							placeholderTextColor="#999"
							secureTextEntry
							value={value}
							onChangeText={onChange}
							autoCapitalize="none"
						/>
					)}
				/>
				{typeof errors.password?.message === "string" && (
					<Text style={styles.error}>{errors.password.message}</Text>
				)}

				<Controller
					control={control}
					name="username"
					render={({ field: { onChange, value } }) => (
						<TextInput
							style={styles.input}
							placeholder="Username (optional)"
							placeholderTextColor="#999"
							value={value}
							onChangeText={onChange}
							autoCapitalize="none"
						/>
					)}
				/>

				{isLoading ? (
					<ActivityIndicator
						style={styles.loader}
						color={Colors.tint}
					/>
				) : (
					<TouchableOpacity
						style={styles.button}
						onPress={handleSubmit(onSubmit)}
					>
						<Text style={styles.buttonText}>Sign Up</Text>
					</TouchableOpacity>
				)}

				<TouchableOpacity
					onPress={() => prepareNextScreen("/(auth)/Login")}
				>
					<Text style={styles.backText}>
						Already have an account? Login
					</Text>
				</TouchableOpacity>
			</SafeAreaView>
		</SafeAreaProvider>
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
		fontSize: 16,
		fontWeight: "bold",
		letterSpacing: 1,
	},

	loader: {
		marginTop: 10,
	},

	backText: {
		marginTop: 24,
		textAlign: "center",
		color: Colors.icon,
		fontSize: 14,
		textDecorationLine: "underline",
	},

	error: {
		color: "#FF6B6B",
		marginBottom: 12,
		fontSize: 13,
	},
});
