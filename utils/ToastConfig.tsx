import {
	BaseToast,
	BaseToastProps,
	ErrorToast,
	ToastConfig,
} from "react-native-toast-message";

const toastConfig: ToastConfig = {
	success: (props: BaseToastProps) => (
		<BaseToast
			{...props}
			style={{ borderLeftColor: "green", backgroundColor: "#e0ffe0" }}
			contentContainerStyle={{ paddingHorizontal: 15 }}
			text1Style={{
				fontSize: 16,
				fontWeight: "bold",
				color: "green",
			}}
			text2Style={{
				fontSize: 14,
				color: "#333",
			}}
		/>
	),
	error: (props: BaseToastProps) => (
		<ErrorToast
			{...props}
			style={{ borderLeftColor: "red", backgroundColor: "#ffe0e0" }}
			text1Style={{
				fontSize: 16,
				fontWeight: "bold",
				color: "red",
			}}
		/>
	),
	info: (props: BaseToastProps) => (
		<BaseToast
			{...props}
			style={{ borderLeftColor: "#007AFF", backgroundColor: "#e0f2ff" }}
			contentContainerStyle={{ paddingHorizontal: 15 }}
			text1Style={{
				fontSize: 16,
				fontWeight: "bold",
				color: "#007AFF",
			}}
			text2Style={{
				fontSize: 14,
				color: "#333",
			}}
		/>
	),
};

export default toastConfig;
