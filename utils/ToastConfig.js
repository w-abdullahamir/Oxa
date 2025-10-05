import { BaseToast, ErrorToast } from "react-native-toast-message";

const toastConfig = {
	success: (props) => (
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
	error: (props) => (
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
};

export default toastConfig;
