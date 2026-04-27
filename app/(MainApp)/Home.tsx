import { KeyboardLayout } from "@/components/KeyboardLayout";
import { Colors } from "@/constants/Colors";
import { API_ENDPOINTS, BASE_URL } from "@/constants/Endpoints";
import { useSocket } from "@/hooks/SocketContext";
import { useAuth } from "@/hooks/useAuth";
import { useUserData } from "@/hooks/UserDataContext";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { Stack, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
	ActivityIndicator,
	FlatList,
	Modal,
	Pressable,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from "react-native";
import Toast from "react-native-toast-message";

type Contact = {
	user?: string;
	alias?: string;
};
type Contacts = Contact[];

function MenuItem({ label, icon, onPress, color = Colors.text }: any) {
	return (
		<TouchableOpacity style={styles.menuItem} onPress={onPress}>
			<Ionicons name={icon} size={20} color={color} />
			<Text style={[styles.menuText, { color }]}>{label}</Text>
		</TouchableOpacity>
	);
}

export default function HomeScreen() {
	const { token, logout } = useAuth();
	const router = useRouter();
	const [loading, setLoading] = useState(false);
	const { userData, setUserData } = useUserData();
	const [contacts, setContacts] = useState<Contacts | []>([]);
	const { initSocket, onlineUsers, setIceServers } = useSocket();

	const [selectedContact, setSelectedContact] = useState<Contact | null>(
		null
	);
	const [contactMenuVisible, setContactMenuVisible] = useState(false);
	const [addModalVisible, setAddModalVisible] = useState(false);
	const [contactIdentifier, setContactIdentifier] = useState("");
	const [aliasModalVisible, setAliasModalVisible] = useState(false);
	const [aliasInput, setAliasInput] = useState("");
	const [searchQuery, setSearchQuery] = useState("");

	const fetchUserData = useCallback(async () => {
		try {
			const res = await axios.get(
				`${BASE_URL}${API_ENDPOINTS.USER_HOME}`,
				{
					headers: { Authorization: `Bearer ${token}` },
				}
			);
			setUserData(res.data.message);
			setContacts(res.data.message.contacts);
		} catch (error: any) {
			if (error?.response?.status === 401)
				console.error("Unauthorized access - invalid token:", error);
			else console.error("Failed to fetch user data:", error);
			await logout();
			return Toast.show({
				type: "error",
				text1: "Session Expired",
				text2: "Please log in again",
				position: "top",
			});
		}
	}, [logout, setUserData, token]);

	const fetchIceConfig = useCallback(async () => {
		try {
			const res = await axios.get(
				`${BASE_URL}${API_ENDPOINTS.ICE_SERVERS}`,
				{
					headers: { Authorization: `Bearer ${token}` },
				}
			);
			setIceServers(res.data);
		} catch (error: any) {
			console.error("Failed to fetch ICE servers", error);
			await logout();
		}
	}, [setIceServers, token, logout]);

	useEffect(() => {
		if (token === null) return;
		setLoading(true);
		fetchUserData();
		fetchIceConfig();
		setLoading(false);
	}, [token, fetchUserData, fetchIceConfig]);

	useEffect(() => {
		if (userData?.userId) {
			initSocket({
				userId: String(userData.userId),
				token: token ?? undefined,
			});
		}
	}, [token, initSocket, userData, fetchIceConfig, fetchUserData]);

	const renderContactItem = ({ item }: { item: Contact }) => {
		const isOnline = onlineUsers.has(item.user ?? "");
		const alias = item.alias || "Unnamed";
		const initial = alias.charAt(0).toUpperCase();

		const handlePress = () => {
			const myId = userData?.userId ?? null;
			if (!myId || !item.user) return;
			console.log("Navigating to chat with", item.user, myId);

			router.push({
				pathname: "/Chat",
				params: {
					userId: String(myId),
					otherUserId: String(item.user),
				},
			});
		};

		const handleLongPress = () => {
			setSelectedContact(item);
			setContactMenuVisible(true);
		};

		return (
			<TouchableOpacity
				onPress={() => handlePress()}
				onLongPress={() => handleLongPress()}
				style={styles.contactCard}
				testID="contactCard"
			>
				<View style={styles.avatar}>
					<Text style={styles.avatarText}>{initial}</Text>
					{isOnline && <View style={styles.onlineBadge} />}
				</View>

				<View style={styles.contactInfo}>
					<Text style={styles.contactAlias}>{alias}</Text>
					{isOnline && (
						<Text style={styles.contactStatus}>Active now</Text>
					)}
				</View>

				<Ionicons
					name="chevron-forward"
					size={18}
					color={Colors.icon}
				/>
			</TouchableOpacity>
		);
	};

	const handleAddContact = async (identifier: string) => {
		if (!identifier.trim()) {
			Toast.show({
				type: "error",
				text1: "Enter email or username",
			});
			return;
		}

		try {
			const res = await axios.post(
				`${BASE_URL}${API_ENDPOINTS.ADD_CONTACT}`,
				{ identifier },
				{
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${token}`,
					},
				}
			);

			const newContact = res.data.contact;
			setContacts((prev) => [...prev, newContact]);
			setUserData((prev) => {
				if (!prev) return prev;
				return {
					...prev,
					contacts: [...(prev.contacts || []), newContact],
				};
			});

			setAddModalVisible(false);
			setContactIdentifier("");

			Toast.show({
				type: "success",
				text1: "Contact added",
				position: "top",
			});
		} catch (err: any) {
			if (err.response?.status === 400) {
				console.error(
					"Invalid identifier provided:",
					err.response.data
				);
				return Toast.show({
					type: "error",
					text1: "Invalid identifier",
					text2: "Please enter a valid username or email",
					position: "top",
				});
			} else if (err.response?.status === 404) {
				console.error(
					"User not found with identifier:",
					identifier,
					err.response.data
				);
				return Toast.show({
					type: "info",
					text1: "User not found",
					position: "top",
				});
			} else if (err.response?.status === 409) {
				console.error(
					"Contact already exists for identifier:",
					identifier,
					err.response.data
				);
				return Toast.show({
					type: "info",
					text1: "Already a contact",
					text2: "This user is already in your contacts",
					position: "top",
				});
			}
			Toast.show({
				type: "error",
				text1: "Failed to add contact",
				position: "top",
			});
		}
	};

	const handleUpdateAlias = async () => {
		if (!selectedContact?.user || !aliasInput.trim()) {
			Toast.show({
				type: "error",
				text1: "Alias cannot be empty",
			});
			return;
		}

		try {
			await axios.put(
				`${BASE_URL}${API_ENDPOINTS.UPDATE_CONTACT_ALIAS}`,
				{
					user: selectedContact.user,
					alias: aliasInput.trim(),
				},
				{
					headers: {
						Authorization: `Bearer ${token}`,
					},
				}
			);

			const updateList = (prev: Contacts) =>
				prev.map((c) =>
					c.user === selectedContact.user
						? { ...c, alias: aliasInput.trim() }
						: c
				);

			setContacts((prev) => updateList(prev));
			setUserData((prev) =>
				prev
					? { ...prev, contacts: updateList(prev.contacts || []) }
					: null
			);

			setAliasModalVisible(false);
			setContactMenuVisible(false);
			setAliasInput("");
			Toast.show({
				type: "success",
				text1: "Alias updated",
			});
			setSelectedContact(null);
		} catch (err: any) {
			if (err.response?.status === 400) {
				console.error("Invalid alias provided:", err.response.data);
				return Toast.show({
					type: "error",
					text1: "Invalid alias", // Invalid alias or user ID
					position: "top",
				});
			} else if (err.response?.status === 404) {
				console.error(
					"Contact not found for user:",
					selectedContact?.user,
					err.response.data
				);
				return Toast.show({
					type: "error",
					text1: "Contact not found",
					position: "top",
				});
			}

			console.error("Failed to update alias:", err);
			Toast.show({
				type: "error",
				text1: "Failed to update alias",
			});
		}
	};

	const handleDeleteContact = async (contact: Contact | null) => {
		if (!contact?.user) return;

		try {
			await axios.delete(`${BASE_URL}${API_ENDPOINTS.DELETE_CONTACT}`, {
				data: { user: contact.user },
				headers: {
					Authorization: `Bearer ${token}`,
				},
			});

			setContacts((prev) => prev.filter((c) => c.user !== contact.user));

			Toast.show({
				type: "success",
				text1: "Contact removed",
			});
		} catch (err: any) {
			if (err.response?.status === 400) {
				console.error(
					"Invalid contact ID provided:",
					err.response.data
				);
				Toast.show({
					type: "error",
					text1: "Invalid contact",
					position: "top",
				});
			} else if (err.response?.status === 404) {
				console.error(
					"Contact not found for user:",
					contact.user,
					err.response.data
				);
				Toast.show({
					type: "error",
					text1: "Contact not found",
					position: "top",
				});
			} else {
				console.error("Failed to delete contact:", err);
				Toast.show({
					type: "error",
					text1: "Failed to remove contact",
				});
			}
		}
	};

	return (
		<KeyboardLayout>
			<Stack.Screen
				options={{
					headerShown: true,
					title: "Oxa",
					headerLargeTitle: true,
					headerTintColor: Colors.text,
					headerRight: () => (
						<TouchableOpacity
							onPress={() => router.push("/(MainApp)/Profile")}
							style={styles.headerIcon}
							testID="profileButton"
						>
							<Ionicons
								name="person-circle-outline"
								size={28}
								color={Colors.text}
							/>
						</TouchableOpacity>
					),
				}}
			/>

			{loading ? (
				<View style={styles.center}>
					<ActivityIndicator size="large" color={Colors.tint} />
				</View>
			) : (
				<FlatList
					data={contacts.filter((contact) => {
						const query = searchQuery.trim().toLowerCase();
						if (!query) return true;
						return contact.alias?.toLowerCase().includes(query);
					})}
					keyExtractor={(item: any) =>
						item.user || String(Math.random())
					}
					renderItem={renderContactItem}
					contentContainerStyle={styles.listContent}
					keyboardShouldPersistTaps="always"
					ListHeaderComponent={
						<View style={styles.searchContainer}>
							<Ionicons
								name="search-outline"
								size={18}
								color={Colors.icon}
							/>
							<TextInput
								placeholder="Enter alias"
								placeholderTextColor={Colors.lightPlaceHolder}
								caretHidden={searchQuery === ""}
								value={searchQuery}
								onChangeText={setSearchQuery}
								style={styles.searchInput}
								autoCapitalize="none"
								testID="searchInput"
							/>
							{searchQuery.length > 0 && (
								<TouchableOpacity
									onPress={() => {
										setSearchQuery("");
									}}
									accessibilityLabel="Empty search"
									testID="clearSearchButton"
								>
									<Ionicons
										name="close-circle"
										size={22}
										color={Colors.borderColor}
									/>
								</TouchableOpacity>
							)}
						</View>
					}
					ListEmptyComponent={
						<View style={styles.emptyContainer}>
							<Ionicons
								name="chatbubbles-outline"
								size={64}
								color={Colors.darkGrey}
							/>
							<Text style={styles.emptyText}>
								No conversations yet
							</Text>
						</View>
					}
				/>
			)}

			{/* Floating Action Button Add Contact Button */}
			<TouchableOpacity
				style={styles.fab}
				onPress={() => setAddModalVisible(true)}
				testID="addContactButton"
			>
				<Ionicons name="add" size={30} color={Colors.text} />
			</TouchableOpacity>

			{/* Add Contact Modal - Cleaned Up */}
			<Modal visible={addModalVisible} transparent animationType="slide">
				<View style={styles.modalOverlay}>
					<View style={styles.modalContent}>
						<Text style={styles.modalTitle}>New Contact</Text>
						<TextInput
							placeholder="Username or Email"
							placeholderTextColor={Colors.lightPlaceHolder}
							value={contactIdentifier}
							onChangeText={setContactIdentifier}
							style={styles.input}
							autoCapitalize="none"
							testID="addContactIdentifierInput"
							onSubmitEditing={() =>
								handleAddContact(contactIdentifier)
							}
							returnKeyType="done"
						/>
						<View style={styles.modalActions}>
							<TouchableOpacity
								onPress={() => setAddModalVisible(false)}
								style={styles.modalButton}
								testID="cancelAddContactButton"
							>
								<Text
									style={{ color: Colors.lightPlaceHolder }}
								>
									Cancel
								</Text>
							</TouchableOpacity>
							<TouchableOpacity
								onPress={() => {
									handleAddContact(contactIdentifier);
								}}
								style={[styles.modalButton, styles.confirmBtn]}
								testID="confirmAddContactButton"
							>
								<Text style={styles.confirmBtnText}>
									Add Contact
								</Text>
							</TouchableOpacity>
						</View>
					</View>
				</View>
			</Modal>

			{/* Contact Options Sheet (Long Press) */}
			<Modal
				visible={contactMenuVisible}
				transparent
				animationType="fade"
			>
				<Pressable
					style={styles.sheetOverlay}
					onPress={() => setContactMenuVisible(false)}
				>
					<View style={styles.bottomSheet}>
						<View style={styles.sheetHandle} />
						<MenuItem
							label="Edit Alias"
							icon="pencil-outline"
							onPress={() => {
								setContactMenuVisible(false);
								setAliasModalVisible(true);
							}}
							testID="editAliasButton"
						/>
						<MenuItem
							label="Delete Contact"
							icon="trash-outline"
							color={Colors.red}
							onPress={() => {
								setContactMenuVisible(false);
								handleDeleteContact(selectedContact);
							}}
							testID="deleteContactButton"
						/>
					</View>
				</Pressable>
			</Modal>
			<Modal
				visible={aliasModalVisible}
				transparent
				animationType="fade"
				onRequestClose={() => setAliasModalVisible(false)}
			>
				<View style={styles.modalOverlay}>
					<View style={styles.modalContent}>
						<Text style={styles.modalTitle}>Update Alias</Text>

						<TextInput
							placeholder="Enter alias"
							placeholderTextColor={Colors.lightPlaceHolder}
							value={aliasInput}
							onChangeText={setAliasInput}
							style={styles.input}
							autoCapitalize="none"
							testID="updateAliasInput"
							onSubmitEditing={() => handleUpdateAlias()}
							returnKeyType="done"
						/>

						<View style={styles.modalActions}>
							<Pressable
								style={[styles.modalButton, styles.cancel]}
								onPress={() => setAliasModalVisible(false)}
								testID="cancelUpdateAliasButton"
							>
								<Text style={styles.modalButtonText}>
									Cancel
								</Text>
							</Pressable>

							<Pressable
								style={[styles.modalButton, styles.confirm]}
								onPress={() => handleUpdateAlias()}
								testID="confirmUpdateAliasButton"
							>
								<Text style={styles.modalButtonText}>Save</Text>
							</Pressable>
						</View>
					</View>
				</View>
			</Modal>
		</KeyboardLayout>
	);
}

const styles = StyleSheet.create({
	cancel: {
		backgroundColor: "#444",
	},
	confirm: {
		backgroundColor: Colors.tint,
	},
	modalButtonText: {
		color: Colors.text,
		fontWeight: "bold",
	},
	container: {
		flex: 1,
		backgroundColor: Colors.background,
	},
	center: { flex: 1, justifyContent: "center", alignItems: "center" },
	listContent: {
		padding: 16,
		paddingBottom: 100, // Space for FAB
	},
	contactCard: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: Colors.veryDarkGrey, // Slightly lighter than pure black
		padding: 12,
		borderRadius: 16,
		marginBottom: 12,
		borderWidth: 1,
		borderColor: Colors.border,
	},
	avatar: {
		width: 50,
		height: 50,
		borderRadius: 25,
		backgroundColor: Colors.tint,
		justifyContent: "center",
		alignItems: "center",
		marginRight: 15,
	},
	avatarText: {
		color: Colors.text,
		fontSize: 20,
		fontWeight: "bold",
	},
	onlineBadge: {
		width: 14,
		height: 14,
		borderRadius: 7,
		backgroundColor: "#4CAF50",
		position: "absolute",
		bottom: 0,
		right: 0,
		borderWidth: 2,
		borderColor: Colors.border,
	},
	contactInfo: {
		flex: 1,
	},
	searchContainer: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: Colors.veryDarkGrey,
		borderRadius: 16,
		paddingHorizontal: 12,
		paddingVertical: 10,
		borderWidth: 1,
		borderColor: Colors.border,
		marginBottom: 16,
		gap: 10,
	},
	searchInput: {
		flex: 1,
		color: Colors.text,
		fontSize: 15,
	},
	contactAlias: {
		color: Colors.text,
		fontSize: 17,
		fontWeight: "600",
		marginBottom: 2,
	},
	contactStatus: {
		color: Colors.lightGrey,
		fontSize: 13,
	},
	fab: {
		position: "absolute",
		bottom: 30,
		right: 20,
		backgroundColor: Colors.tint,
		width: 56,
		height: 56,
		borderRadius: 28,
		justifyContent: "center",
		alignItems: "center",
		elevation: 5,
		shadowColor: Colors.black,
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.3,
		shadowRadius: 4,
	},
	emptyContainer: {
		alignItems: "center",
		marginTop: 100,
		opacity: 0.5,
	},
	emptyText: {
		color: Colors.text,
		marginTop: 10,
		fontSize: 16,
	},
	headerIcon: {
		marginRight: 4,
	},
	modalOverlay: {
		flex: 1,
		backgroundColor: Colors.veryDarkGrey,
		opacity: 0.7,
		justifyContent: "center",
		alignItems: "center",
	},
	modalContent: {
		width: "85%",
		backgroundColor: "#1c1c1c",
		borderRadius: 20,
		padding: 24,
	},
	modalTitle: {
		fontSize: 20,
		fontWeight: "bold",
		color: Colors.text,
		marginBottom: 20,
	},
	input: {
		backgroundColor: "#2c2c2c",
		borderRadius: 12,
		padding: 14,
		color: Colors.text,
		fontSize: 16,
		marginBottom: 20,
	},
	modalActions: {
		flexDirection: "row",
		justifyContent: "flex-end",
		alignItems: "center",
		gap: 20,
	},
	confirmBtn: {
		backgroundColor: Colors.tint,
		paddingHorizontal: 20,
		paddingVertical: 10,
		borderRadius: 10,
	},
	confirmBtnText: {
		color: Colors.text,
		fontWeight: "600",
	},
	sheetOverlay: {
		flex: 1,
		backgroundColor: Colors.veryDarkGrey,
		opacity: 0.7,
		justifyContent: "flex-end",
	},
	bottomSheet: {
		backgroundColor: "#1c1c1c",
		borderTopLeftRadius: 20,
		borderTopRightRadius: 20,
		padding: 20,
		paddingBottom: 40,
	},
	sheetHandle: {
		width: 40,
		height: 5,
		backgroundColor: Colors.darkGrey,
		borderRadius: 3,
		alignSelf: "center",
		marginBottom: 20,
	},
	menuItem: {
		flexDirection: "row",
		alignItems: "center",
		paddingVertical: 15,
		gap: 15,
	},
	menuText: {
		fontSize: 16,
		fontWeight: "500",
	},
	modalButton: { padding: 5 },
});
