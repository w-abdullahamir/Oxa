import { Colors } from "@/constants/Colors";
import { ActivityIndicator, View } from "react-native";

export default function Index() {
	return (
		<View
			style={{
				flex: 1,
				justifyContent: "center",
				alignItems: "center",
			}}
		>
			<ActivityIndicator size="large" color={Colors.tint} />
		</View>
	);
}
