import { Colors } from "@/constants/Colors";
import { useSocket } from "@/hooks/SocketContext";
import { useAuth } from "@/hooks/useAuth";
import { useUserData } from "@/hooks/UserDataContext";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
	Platform,
	ScrollView,
	StyleSheet,
	Switch,
	Text,
	TouchableOpacity,
	View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

interface SettingItemProps {
	label: string;
	description: string;
	value: boolean;
	onValueChange: (val: boolean) => void;
	icon: string;
}

const SettingRow = ({
	label,
	description,
	value,
	onValueChange,
	icon,
}: SettingItemProps) => (
	<View style={styles.settingRow}>
		<View style={styles.settingTextContainer}>
			<View style={styles.labelRow}>
				<Ionicons
					name={icon as any}
					size={20}
					color={Colors.tint}
					style={{ marginRight: 8 }}
				/>
				<Text style={styles.settingLabel}>{label}</Text>
			</View>
			<Text style={styles.settingDescription}>{description}</Text>
		</View>
		<Switch
			value={value}
			onValueChange={onValueChange}
			trackColor={{ false: "#333", true: Colors.tint }}
			thumbColor={
				Platform.OS === "ios" ? "#fff" : value ? "#fff" : "#888"
			}
		/>
	</View>
);

export default function ProfileScreen() {
	const { disconnectSocket } = useSocket();
	const { logout } = useAuth();
	const { userData } = useUserData();

	const [allowGlobalScreenshots, setAllowGlobalScreenshots] = useState(false);
	const [requestRequired, setRequestRequired] = useState(true);
	const [autoDenyUnknown, setAutoDenyUnknown] = useState(false);

	const username = userData?.username || "unset";
	const email = userData?.email;

	const handleLogout = async () => {
		try {
			disconnectSocket();
			await logout();
			router.replace("/(auth)/Login");
		} catch (error) {
			Toast.show({
				type: "error",
				text1: "Logout failed",
			});
		}
	};

	const savePreference = (key: string, value: boolean) => {
		// Logic to send update to backend/socket
		Toast.show({
			type: "success",
			text1: "Preference Updated",
			position: "bottom",
		});
	};

	return (
		<SafeAreaView style={styles.container}>
			<ScrollView contentContainerStyle={styles.scrollContent}>
				{/* Profile Header */}
				<View style={styles.header}>
					<View style={styles.avatarPlaceholder}>
						<Text style={styles.avatarText}>
							{username.charAt(0).toUpperCase()}
						</Text>
					</View>
					<Text style={styles.userNameText}>{username}</Text>
					<Text style={styles.userEmail}>{email}</Text>
				</View>

				{/* Privacy Section */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>
						Privacy & Permissions
					</Text>

					<SettingRow
						label="Enable Screenshots"
						description="Allow others to capture chat screens. If OFF, screens are blocked by default."
						icon="camera-outline"
						value={allowGlobalScreenshots}
						onValueChange={(val) => {
							setAllowGlobalScreenshots(val);
							savePreference("screenshots", val);
						}}
					/>

					<SettingRow
						label="Require Permission"
						description="Others must send a request and wait for your approval before capturing."
						icon="lock-closed-outline"
						value={requestRequired}
						onValueChange={(val) => {
							setRequestRequired(val);
							savePreference("request_req", val);
						}}
					/>

					<SettingRow
						label="Auto-deny Unknowns"
						description="Automatically reject screenshot requests from users not in your contacts."
						icon="shield-checkmark-outline"
						value={autoDenyUnknown}
						onValueChange={(val) => {
							setAutoDenyUnknown(val);
							savePreference("auto_deny", val);
						}}
					/>
				</View>

				{/* Individual Permissions Action */}
				<TouchableOpacity
					style={styles.actionButton}
					onPress={() =>
						Toast.show({
							text1: "Coming Soon: Managed Contacts list",
						})
					}
				>
					<View style={styles.actionLeft}>
						<Ionicons
							name="people-outline"
							size={22}
							color={Colors.text}
						/>
						<Text style={styles.actionText}>
							Individual Permissions
						</Text>
					</View>
					<Ionicons name="chevron-forward" size={20} color="#555" />
				</TouchableOpacity>

				{/* Logout Button */}
				<TouchableOpacity
					style={[styles.actionButton, styles.logoutButton]}
					onPress={handleLogout}
				>
					<View style={styles.actionLeft}>
						<Ionicons
							name="log-out-outline"
							size={22}
							color="#ff4444"
						/>
						<Text style={[styles.actionText, styles.logoutText]}>
							Logout
						</Text>
					</View>
				</TouchableOpacity>

				<View style={{ height: 40 }} />
			</ScrollView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#000",
	},
	scrollContent: {
		padding: 20,
	},
	header: {
		alignItems: "center",
		marginBottom: 30,
	},
	avatarPlaceholder: {
		width: 100,
		height: 100,
		borderRadius: 50,
		backgroundColor: Colors.tint || "#2f95dc",
		justifyContent: "center",
		alignItems: "center",
		marginBottom: 12,
	},
	avatarText: {
		fontSize: 40,
		color: "#fff",
		fontWeight: "bold",
	},
	userNameText: {
		fontSize: 22,
		fontWeight: "bold",
		color: "#fff",
	},
	userEmail: {
		fontSize: 14,
		color: "#888",
		marginTop: 4,
	},
	section: {
		backgroundColor: "#111",
		borderRadius: 16,
		padding: 16,
		marginBottom: 20,
	},
	sectionTitle: {
		fontSize: 14,
		fontWeight: "bold",
		color: "#888",
		marginBottom: 16,
		textTransform: "uppercase",
		letterSpacing: 1,
	},
	settingRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingVertical: 12,
		borderBottomWidth: 0.5,
		borderBottomColor: "#222",
	},
	settingTextContainer: {
		flex: 1,
		marginRight: 16,
	},
	labelRow: {
		flexDirection: "row",
		alignItems: "center",
		marginBottom: 4,
	},
	settingLabel: {
		fontSize: 16,
		color: "#fff",
		fontWeight: "600",
	},
	settingDescription: {
		fontSize: 12,
		color: "#666",
		lineHeight: 18,
	},
	actionButton: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		backgroundColor: "#111",
		padding: 16,
		borderRadius: 16,
		marginBottom: 12,
	},
	logoutButton: {
		marginTop: 10,
		borderWidth: 1,
		borderColor: "rgba(255, 68, 68, 0.2)",
	},
	actionLeft: {
		flexDirection: "row",
		alignItems: "center",
		gap: 12,
	},
	actionText: {
		color: "#fff",
		fontSize: 16,
		fontWeight: "500",
	},
	logoutText: {
		color: "#ff4444",
	},
});
