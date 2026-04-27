import { KeyboardLayout } from "@/components/KeyboardLayout";
import {
	ErrorMessage,
	FormInput,
	SubmitButton,
} from "@/components/auth/AuthUI";
import { Colors } from "@/constants/Colors";
import { useAuth } from "@/hooks/useAuth";
import { useAuthSubmit } from "@/hooks/useAuthSubmit";
import { useRouter } from "expo-router";
import { memo, useCallback } from "react";
import { useForm } from "react-hook-form";
import { Pressable, StyleSheet, Text, View } from "react-native";

const ForgotPasswordForm = memo(() => {
	const { forgotPassword } = useAuth();
	const router = useRouter();

	const {
		control,
		handleSubmit,
		formState: { errors },
	} = useForm({
		mode: "onTouched",
		defaultValues: { email: "" },
	});

	const handleSuccess = useCallback(
		(data: { email: string }) => {
			router.replace({
				pathname: "/EnterPin",
				params: { email: data.email },
			});
		},
		[router]
	);

	const { loading, serverError, submitHandler } = useAuthSubmit(
		forgotPassword,
		handleSuccess
	);

	return (
		<View>
			<FormInput
				control={control}
				name="email"
				placeholder="name@example.com"
				rules={{
					required: "Email is required",
					pattern: {
						value: /^\S+@\S+\.\S+$/,
						message: "Invalid email",
					},
				}}
				keyboardType="email-address"
				onSubmitEditing={handleSubmit(submitHandler)}
				returnKeyType="go"
				autoCapitalize="none"
				autoComplete="email"
				testID="emailInput"
			/>
			<ErrorMessage message={errors.email?.message as string} />

			<ErrorMessage message={serverError || ""} isServer />

			<SubmitButton
				loading={loading}
				onPress={handleSubmit(submitHandler)}
				title="Get Reset Code"
				testID="getResetCodeButton"
			/>
		</View>
	);
});
ForgotPasswordForm.displayName = "ForgotPasswordForm";

export default function ForgotPasswordScreen() {
	const router = useRouter();
	const goToLogin = useCallback(() => router.replace("/Login"), [router]);

	return (
		<KeyboardLayout>
			<Text style={styles.title}>Forgot Password</Text>
			<ForgotPasswordForm />

			<Pressable onPress={goToLogin}>
				<Text style={styles.rememberedText}>
					Remember your password? Log in
				</Text>
			</Pressable>
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
	rememberedText: {
		color: Colors.icon,
		textAlign: "center",
		marginTop: 24,
		textDecorationLine: "underline",
		fontSize: 14,
	},
});
