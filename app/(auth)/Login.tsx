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
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

const LoginFormFields = memo(() => {
	const { login } = useAuth();

	const passwordRef = useRef<TextInput>(null);

	const {
		control,
		handleSubmit,
		formState: { errors },
	} = useForm({
		mode: "onTouched",
		defaultValues: { identifier: "", password: "" },
	});

	const { loading, serverError, submitHandler } = useAuthSubmit(login);

	return (
		<View>
			<FormInput
				control={control}
				name="identifier"
				placeholder="Email or Username"
				rules={{ required: "Email or username is required" }}
				keyboardType="email-address"
				onSubmitEditing={() => passwordRef.current?.focus()}
				returnKeyType="next"
				autoCapitalize="none"
				autoComplete="username"
				testID="identifierInput"
			/>
			<ErrorMessage message={errors.identifier?.message} />

			<FormInput
				control={control}
				name="password"
				placeholder="Password"
				secureTextEntry
				rules={{
					required: "Password is required",
					minLength: {
						value: 8,
						message: "Must be at least 8 characters",
					},
					pattern: {
						value: /^[\x20-\x7E]+$/,
						message:
							"Only Numbers and Alphabets and special characters allowed",
					},
				}}
				ref={passwordRef}
				onSubmitEditing={handleSubmit(submitHandler)}
				returnKeyType="go"
				autoCapitalize="none"
				autoComplete="current-password"
				testID="passwordInput"
			/>
			<ErrorMessage message={errors.password?.message} />

			<ErrorMessage message={serverError || ""} isServer />

			<SubmitButton
				loading={loading}
				onPress={handleSubmit(submitHandler)}
				title="Login"
				testID="loginButton"
			/>
		</View>
	);
});
LoginFormFields.displayName = "LoginFormFields";

export default function Login() {
	const router = useRouter();

	const goToForgotPassword = useCallback(
		() => router.replace("/ForgotPassword"),
		[router]
	);

	const goToSignup = useCallback(() => router.replace("/Signup"), [router]);

	return (
		<KeyboardLayout>
			<Text style={styles.title}>Login</Text>
			<LoginFormFields />

			<View style={styles.footer}>
				<Pressable onPress={goToForgotPassword}>
					<Text style={styles.text}>Forgot Password?</Text>
				</Pressable>
			</View>

			<View style={styles.footer}>
				<Text style={styles.text}>Don&apos;t have an account?</Text>
				<Pressable onPress={goToSignup}>
					<Text style={styles.link}> Signup</Text>
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
	footer: {
		flexDirection: "row",
		justifyContent: "center",
		marginTop: 20,
	},
	text: {
		color: Colors.text,
		fontSize: 14,
	},
	link: {
		color: Colors.link,
		fontWeight: "bold",
		marginLeft: 5,
		textDecorationLine: "underline",
	},
});
