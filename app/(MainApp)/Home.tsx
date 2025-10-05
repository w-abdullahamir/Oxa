import { Colors } from "@/constants/Colors";
import { API_ENDPOINTS, BASE_URL } from "@/constants/Endpoints";
import { useAuth } from "@/hooks/useAuth";
import { useUserData } from "@/hooks/UserDataContext";
import axios from "axios";
import { Stack, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
	ActivityIndicator,
	FlatList,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

type Contact = {
	userId?: string;
	username?: string;
	email?: string;
};
type Contacts = Array<Contact>;

export default function HomeScreen() {
	const { token, logout } = useAuth();
	const router = useRouter();
	const [loading, setLoading] = useState(false);
	const { userData, setUserData } = useUserData();
	const [contacts, setContacts] = useState<Contacts>([]);

	useEffect(() => {
		if (token === undefined) return;

		const fetchUserData = async () => {
			try {
				setLoading(true);
				const res = await axios.get(
					`${BASE_URL}${API_ENDPOINTS.USER_HOME}`,
					{
						headers: {
							"Content-Type": "application/json",
							Authorization: `Bearer ${token}`,
						},
					}
				);
				if (res.data.success) {
					setUserData(res.data.message);
					setContacts(res.data.message.contacts || []);
				} else throw new Error("Failed to fetch user data");
			} catch (error) {
				Toast.show({
					type: "error",
					text1: "Failed to fetch user data",
					text2: "Please try again later.",
					position: "top",
				});
			} finally {
				setLoading(false);
			}
		};

		fetchUserData();
	}, [token]);

	const handleLogout = async () => {
		const res = await logout();
		if (res) router.replace("/(auth)/Login");
		else {
			Toast.show({
				type: "error",
				text1: "Logout Failed",
				text2: "Please try again later.",
				position: "top",
			});
		}
	};

	const renderContactItem = ({ item }: { item: Contact }) => {
		const id = item.userId;
		const username = item.username || item.email;

		const handlePress = () => {
			// normalizedUser stored _id above, use that
			const myId = userData?.userId ?? null;
			if (!myId) {
				console.warn("Missing my userId, abort navigation", {
					myId,
					other: id,
				});
				Toast.show({
					type: "error",
					text1: "User id missing",
					text2: "Your account id isn't ready yet.",
				});
				return;
			}
			if (!id) {
				console.warn("Contact id missing", item);
				return;
			}

			router.push({
				pathname: "/(MainApp)/ChatOneToOne",
				params: { userId: String(myId), otherUserId: String(id) },
			});
		};

		return (
			<TouchableOpacity style={styles.content} onPress={handlePress}>
				<Text style={styles.text}>{username}</Text>
			</TouchableOpacity>
		);
	};

	return (
		<SafeAreaView style={styles.container}>
			<Stack.Screen
				options={{
					headerShown: true,
					title: userData?.username
						? userData.username
						: userData?.email || "Home",
					headerTitleAlign: "left",
					headerStyle: { backgroundColor: Colors.background },
					headerTintColor: Colors.text,
					headerRight: () => (
						<TouchableOpacity onPress={handleLogout}>
							<Text style={{ color: Colors.tint }}>Logout</Text>
						</TouchableOpacity>
					),
				}}
			/>
			<View>
				<Text style={styles.title}>{"Contacts"}</Text>
				{loading ? (
					<ActivityIndicator size="small" color={Colors.tint} />
				) : (
					<FlatList
						data={contacts}
						keyExtractor={(item) =>
							typeof item === "string"
								? item
								: item.userId ?? String(Math.random())
						}
						renderItem={renderContactItem}
						ListEmptyComponent={
							<Text style={styles.text}>No contacts found</Text>
						}
					/>
				)}
			</View>

			<TouchableOpacity
				style={styles.button}
				onPress={() => {
					router.push("./Profile");
				}}
			>
				<Text style={styles.buttonText}>Profile</Text>
			</TouchableOpacity>
		</SafeAreaView>
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
		fontSize: 24,
		fontWeight: "bold",
		textAlign: "center",
		marginBottom: 12,
		color: Colors.text,
	},
	subtitle: {
		fontSize: 16,
		textAlign: "center",
		marginBottom: 32,
		color: Colors.text,
	},
	text: {
		color: Colors.text,
		fontSize: 14,
	},
	button: {
		backgroundColor: Colors.tint,
		paddingVertical: 14,
		borderRadius: 10,
		alignItems: "center",
		marginTop: 8,
	},
	buttonText: {
		color: "#fff",
		fontSize: 16,
		fontWeight: "bold",
	},
	content: {
		padding: 16,
		borderRadius: 10,
		marginVertical: 8,
		marginHorizontal: 16,
	},
});
