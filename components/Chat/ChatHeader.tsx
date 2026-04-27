import { Colors } from "@/constants/Colors";
import { Ionicons } from "@expo/vector-icons";
import { Stack } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface ChatHeaderProps {
	alias: string;
	isOnline: boolean;
	onVideoCall: () => void;
	onAudioCall: () => void;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({
	alias,
	isOnline,
	onVideoCall,
	onAudioCall,
}) => {
	return (
		<Stack.Screen
			options={{
				headerTitle: () => (
					<View style={styles.headerTitleContainer}>
						<Text style={styles.headerAlias}>{alias}</Text>
						<View
							style={[
								styles.statusDot,
								{
									backgroundColor: isOnline
										? "#4ade80"
										: "#ccc",
								},
							]}
						/>
					</View>
				),
				headerRight: () => (
					<View style={styles.headerActions}>
						<TouchableOpacity
							style={styles.headerBtn}
							onPress={onAudioCall}
						>
							<Ionicons
								name="call"
								size={22}
								color={Colors.icon}
							/>
						</TouchableOpacity>
						<TouchableOpacity
							style={styles.headerBtn}
							onPress={onVideoCall}
						>
							<Ionicons
								name="videocam"
								size={24}
								color={Colors.icon}
							/>
						</TouchableOpacity>
					</View>
				),
			}}
		/>
	);
};

const styles = StyleSheet.create({
	headerTitleContainer: { flexDirection: "row", alignItems: "center" },
	headerAlias: {
		fontSize: 17,
		fontWeight: "600",
		color: Colors.text,
		marginRight: 6,
	},
	statusDot: { width: 8, height: 8, borderRadius: 4 },
	headerActions: { flexDirection: "row", alignItems: "center" },
	headerBtn: { marginLeft: 15, padding: 5 },
});

export default ChatHeader;
