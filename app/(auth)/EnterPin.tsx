import { AuthLayout } from "@/components/auth/AuthLayout";
import {
	ErrorMessage,
	FormInput,
	SubmitButton,
} from "@/components/auth/AuthUI";
import { Colors } from "@/constants/Colors";
import { useAuth } from "@/hooks/useAuth";
import { useAuthSubmit } from "@/hooks/useAuthSubmit";
import { useLocalSearchParams, useRouter } from "expo-router";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import Toast from "react-native-toast-message";

interface EnterPinFormProps {
	isDisabled: boolean;
}

const EnterPinForm = memo(({ isDisabled }: EnterPinFormProps) => {
	const { email } = useLocalSearchParams();
	const router = useRouter();
	const { resetPassword } = useAuth();

	const passwordRef = useRef<TextInput>(null);

	const {
		control,
		handleSubmit,
		formState: { errors },
	} = useForm({
		mode: "onTouched",
		defaultValues: { email: email as string, resetPin: "", password: "" },
	});

	const handleSuccess = useCallback(() => {
		router.replace("/Login");
		Toast.show({ type: "success", text1: "Password reset successful!" });
	}, [router]);

	const { loading, serverError, submitHandler } = useAuthSubmit(
		resetPassword,
		handleSuccess
	);

	return (
		<View>
			<FormInput
				control={control}
				name="resetPin"
				rules={{
					required: "PIN is required",
					minLength: {
						value: 5,
						message: "PIN must be 5 digits",
					},
					maxLength: {
						value: 5,
						message: "PIN must be 5 digits",
					},
				}}
				placeholder="Enter 5-digit PIN"
				keyboardType="number-pad"
				returnKeyType="next"
				onSubmitEditing={() => passwordRef.current?.focus()}
				testID="resetPinInput"
				autoCapitalize="none"
				autoComplete="one-time-code"
				textContentType="oneTimeCode"
				maxLength={5}
				importantForAutofill="yes"
			/>
			<ErrorMessage message={errors.resetPin?.message} />

			<FormInput
				control={control}
				name="password"
				placeholder="New Password"
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
				onSubmitEditing={handleSubmit(submitHandler)}
				returnKeyType="go"
				autoCapitalize="none"
				autoComplete="new-password"
				textContentType="newPassword"
				testID="passwordInput"
			/>
			<ErrorMessage message={errors.password?.message} />

			<ErrorMessage message={serverError || ""} isServer />

			{isDisabled ? null : (
				<SubmitButton
					loading={loading}
					onPress={handleSubmit(submitHandler)}
					title="Reset Password"
					testID="resetPasswordSubmitButton"
				/>
			)}
		</View>
	);
});
EnterPinForm.displayName = "EnterPinForm";

interface TimerProps {
	initialTime: number;
	onExpire: () => void;
}

const Timer = memo(({ initialTime, onExpire }: TimerProps) => {
	const [timeLeft, setTimeLeft] = useState(initialTime);

	useEffect(() => {
		if (timeLeft <= 0) {
			onExpire(); // Notify parent only once
			return;
		}

		const timer = setInterval(() => {
			setTimeLeft((prev) => prev - 1);
		}, 1000);

		return () => clearInterval(timer);
	}, [timeLeft, onExpire]);

	const formatTime = (seconds: number) => {
		const minutes = Math.floor(seconds / 60);
		const remainingSeconds = seconds % 60;
		return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
	};

	return (
		<View style={styles.timerContainer}>
			<Text style={[styles.timerText, timeLeft < 60 && { color: "red" }]}>
				{timeLeft > 0
					? `Code expires in: ${formatTime(timeLeft)}`
					: "Code has expired"}
			</Text>
			{timeLeft === 0 && (
				<Text style={styles.expiredText}>
					Please go back and request a new code.
				</Text>
			)}
		</View>
	);
});
Timer.displayName = "Timer";

export default function EnterPinScreen() {
	const [isExpired, setIsExpired] = useState(false); // Only a boolean here
	const { email } = useLocalSearchParams();
	const router = useRouter();

	// Use useCallback so the Timer doesn't re-render when this function is passed
	const handleExpire = useCallback(() => {
		setIsExpired(true);
	}, []);

	const goToForgotPassword = useCallback(
		() => router.replace("/ForgotPassword"),
		[router]
	);

	return (
		<AuthLayout title="Reset Your Password">
			<View style={styles.body}>
				<Text style={styles.text}>A PIN has been sent to:</Text>
				<Text style={styles.email}>{email}</Text>

				{/* Internal state handles the ticking */}
				<Timer initialTime={10 * 60} onExpire={handleExpire} />
			</View>

			{/* This now only re-renders ONCE when isExpired changes to true */}
			<EnterPinForm isDisabled={isExpired} />

			<View style={styles.footer}>
				<Pressable onPress={goToForgotPassword}>
					<Text style={styles.backText}>Wrong email? Go back</Text>
				</Pressable>
			</View>
		</AuthLayout>
	);
}

const styles = StyleSheet.create({
	body: { marginBottom: 20 },
	text: {
		color: Colors.icon,
		fontSize: 16,
		textAlign: "center",
	},
	email: {
		color: Colors.text,
		fontWeight: "bold",
		fontSize: 18,
		textAlign: "center",
	},
	footer: { marginTop: 24, alignItems: "center" },
	backText: {
		marginTop: 24,
		color: Colors.icon,
		fontSize: 14,
		textAlign: "center",
		textDecorationLine: "underline",
	},
	timerContainer: {
		marginTop: 15,
		alignItems: "center",
	},
	timerText: {
		fontSize: 14,
		color: Colors.icon,
		fontWeight: "600",
	},
	expiredText: {
		fontSize: 12,
		color: "red",
		marginTop: 5,
	},
});
