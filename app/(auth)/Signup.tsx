import {
	ErrorMessage,
	FormInput,
	SubmitButton,
} from "@/components/auth/AuthUI";
import { KeyboardLayout } from "@/components/KeyboardLayout";
import { Colors } from "@/constants/Colors";
import { useAuth } from "@/hooks/useAuth";
import { useAuthSubmit } from "@/hooks/useAuthSubmit";
import { useRouter } from "expo-router";
import React, { memo, useCallback, useRef } from "react";
import { useForm } from "react-hook-form";
import {
	Platform,
	Pressable,
	StyleSheet,
	Text,
	TextInput,
	View,
} from "react-native";
import Toast from "react-native-toast-message";

const SignupForm = memo(() => {
	const { signup } = useAuth();
	const router = useRouter();

	const passwordRef = useRef<TextInput>(null);
	const usernameRef = useRef<TextInput>(null);

	const {
		control,
		handleSubmit,
		formState: { errors },
	} = useForm({
		mode: "onTouched",
		defaultValues: { email: "", password: "", username: "" },
	});

	const handleSuccess = useCallback(() => {
		router.replace("/Login");
		Toast.show({ type: "success", text1: "Account created successfully!" });
	}, [router]);

	const { loading, serverError, submitHandler } = useAuthSubmit(
		signup,
		handleSuccess
	);

	return (
		<View>
			<FormInput
				control={control}
				name="email"
				placeholder="Email"
				rules={{
					required: "Email is required",
					pattern: {
						value: /^\S+@\S+\.\S+$/,
						message: "Invalid email",
					},
				}}
				keyboardType="email-address"
				onSubmitEditing={() => passwordRef.current?.focus()}
				returnKeyType="next"
				autoCapitalize="none"
				autoComplete="email"
				testID="emailInput"
			/>
			<ErrorMessage message={errors.email?.message as string} />

			<FormInput
				control={control}
				name="password"
				placeholder="Password"
				secureTextEntry
				rules={{
					required: "Password is required",
					minLength: {
						value: 8,
						message: "Minimum 8 characters",
					},
					pattern: {
						value: /^[\x20-\x7E]+$/,
						message:
							"Only Numbers and Alphabets and special characters allowed",
					},
				}}
				ref={passwordRef}
				onSubmitEditing={() => usernameRef.current?.focus()}
				returnKeyType="next"
				autoCapitalize="none"
				autoComplete="new-password"
				testID="passwordInput"
			/>
			<ErrorMessage message={errors.password?.message as string} />

			<FormInput
				control={control}
				name="username"
				placeholder="Username (optional)"
				rules={{
					validate: (val: string) => {
						if (!val) return true;
						if (val.length < 5) return "Min 5 characters";
						return true;
					},
				}}
				ref={usernameRef}
				onSubmitEditing={handleSubmit(submitHandler)}
				returnKeyType="go"
				autoCapitalize="none"
				autoComplete={
					Platform.OS === "ios" ? "nickname" : "username-new"
				}
				testID="usernameInput"
			/>
			<ErrorMessage message={errors.username?.message as string} />

			<ErrorMessage message={serverError || ""} isServer />

			<SubmitButton
				loading={loading}
				onPress={handleSubmit(submitHandler)}
				title="Sign Up"
				testID="signupButton"
			/>
		</View>
	);
});
SignupForm.displayName = "SignupForm";

export default function Signup() {
	const router = useRouter();
	const goToLogin = useCallback(() => router.replace("/Login"), [router]);

	return (
		<KeyboardLayout>
			<Text style={styles.title}>Create an Account</Text>
			<SignupForm />

			<View style={styles.footer}>
				<Pressable onPress={goToLogin}>
					<Text style={styles.backText}>
						Already have an account? Login
					</Text>
				</Pressable>
			</View>
		</KeyboardLayout>
	);
}

const styles = StyleSheet.create({
	title: {
		fontSize: 22,
		fontWeight: "bold",
		textAlign: "center",
		marginBottom: 32,
		color: Colors.text,
	},
	footer: { marginTop: 24, alignItems: "center" },
	backText: {
		color: Colors.icon,
		fontSize: 14,
		textDecorationLine: "underline",
	},
});
