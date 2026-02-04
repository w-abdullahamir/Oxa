import { Colors } from "@/constants/Colors";
import { API_ENDPOINTS, BASE_URL } from "@/constants/Endpoints";
import { useSocket } from "@/hooks/SocketContext";
import { useAuth } from "@/hooks/useAuth";
import { useUserData } from "@/hooks/UserDataContext";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { Stack, useRouter } from "expo-router";
import { useEffect, useState } from "react";
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
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

type Contact = {
	user?: string;
	alias?: string;
};
type Contacts = Array<Contact>;

// Improved Menu Item with better touch feedback
function MenuItem({ label, icon, onPress, color = Colors.text }: any) {
	return (
		<TouchableOpacity style={styles.menuItem} onPress={onPress}>
			<Ionicons name={icon} size={20} color={color} />
			<Text style={[styles.menuText, { color }]}>{label}</Text>
		</TouchableOpacity>
	);
}

export default function HomeScreen() {
	const { token } = useAuth();
	const router = useRouter();
	const [loading, setLoading] = useState(false);
	const { userData, setUserData } = useUserData();
	const [contacts, setContacts] = useState<Contacts | []>([]);
	const { initSocket, onlineUsers } = useSocket();

	const [selectedContact, setSelectedContact] = useState<Contact | null>(
		null
	);
	const [contactMenuVisible, setContactMenuVisible] = useState(false);
	const [addModalVisible, setAddModalVisible] = useState(false);
	const [contactIdentifier, setContactIdentifier] = useState("");
	const [adding, setAdding] = useState(false);
	const [aliasModalVisible, setAliasModalVisible] = useState(false);
	const [aliasInput, setAliasInput] = useState("");
	const [searchQuery, setSearchQuery] = useState("");
	const [isFocused, setIsFocused] = useState(false);

	useEffect(() => {
		if (token === null) return;
		fetchUserData();
	}, [token]);

	const fetchUserData = async () => {
		try {
			setLoading(true);
			const res = await axios.get(
				`${BASE_URL}${API_ENDPOINTS.USER_HOME}`,
				{
					headers: { Authorization: `Bearer ${token}` },
				}
			);
			if (res.data.success) {
				setUserData(res.data.message);
				setContacts(res.data.message.contacts || []);
			}
		} catch (error) {
			Toast.show({ type: "error", text1: "Failed to fetch data" });
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		if (userData?.userId) {
			initSocket({
				userId: String(userData.userId),
				token: token ?? undefined,
			});
		}
	}, [userData]);

	const renderContactItem = ({ item }: { item: Contact }) => {
		const isOnline = onlineUsers.has(item.user ?? "");
		const alias = item.alias || "Unnamed";
		const initial = alias.charAt(0).toUpperCase();

		const handlePress = () => {
			const myId = userData?.userId ?? null;
			if (!myId || !item.user) return;
			console.log("Navigating to chat with", item.user, myId);

			router.push({
				pathname: "/ChatOneToOne",
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
				onLongPress={() => {
					setSelectedContact(item);
					setContactMenuVisible(true);
				}}
				style={styles.contactCard}
			>
				<View style={styles.avatar}>
					<Text style={styles.avatarText}>{initial}</Text>
					{isOnline && <View style={styles.onlineBadge} />}
				</View>

				<View style={styles.contactInfo}>
					<Text style={styles.contactAlias}>{alias}</Text>
					<Text style={styles.contactStatus}>
						{isOnline ? "Active now" : "Offline"}
					</Text>
				</View>

				<Ionicons name="chevron-forward" size={18} color="#555" />
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
			setAdding(true);

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

			if (res.data.success) {
				const newContact = res.data.contact;
				setContacts((prev) => [...prev, newContact]);
				setUserData((prev) => {
					if (!prev) return prev;
					return {
						...prev,
						contacts: [...(prev.contacts || []), newContact],
					};
				});
			}

			setAddModalVisible(false);
			setContactIdentifier("");

			Toast.show({ type: "success", text1: "Contact added" });
		} catch (err: any) {
			Toast.show({
				type: "error",
				text1: err?.response?.data?.message || "Failed to add contact",
			});
		} finally {
			setAdding(false);
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
			const res = await axios.put(
				`${BASE_URL}${API_ENDPOINTS.UPDATE_CONTACT_ALIAS}`,
				{
					user: selectedContact?.user,
					alias: aliasInput.trim(),
				},
				{
					headers: {
						Authorization: `Bearer ${token}`,
					},
				}
			);

			if (res.data.success) {
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
			}
			setSelectedContact(null);
		} catch (err) {
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
		} catch {
			Toast.show({
				type: "error",
				text1: "Failed to remove contact",
			});
		}
	};

	return (
		<SafeAreaView style={styles.container}>
			<Stack.Screen
				options={{
					headerShown: true,
					title: "Messages",
					headerLargeTitle: true,
					headerStyle: { backgroundColor: Colors.background },
					headerTintColor: Colors.text,
					headerRight: () => (
						<TouchableOpacity
							onPress={() => router.push("/(MainApp)/Profile")}
							style={styles.headerIcon}
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
								color="#888"
							/>
							<TextInput
								placeholder="Enter alias"
								placeholderTextColor="#888"
								caretHidden={searchQuery === ""}
								value={searchQuery}
								onChangeText={setSearchQuery}
								style={styles.searchInput}
								autoCapitalize="none"
							/>
							{searchQuery.length > 0 && (
								<TouchableOpacity
									onPress={() => {
										setSearchQuery("");
									}}
									accessibilityLabel="Empty search"
								>
									<Ionicons
										name="close-circle"
										size={22}
										color="gray"
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
								color="#333"
							/>
							<Text style={styles.emptyText}>
								No conversations yet
							</Text>
						</View>
					}
				/>
			)}

			{/* Floating Action Button */}
			<TouchableOpacity
				style={styles.fab}
				onPress={() => setAddModalVisible(true)}
			>
				<Ionicons name="add" size={30} color="#fff" />
			</TouchableOpacity>

			{/* Add Contact Modal - Cleaned Up */}
			<Modal visible={addModalVisible} transparent animationType="slide">
				<View style={styles.modalOverlay}>
					<View style={styles.modalContent}>
						<Text style={styles.modalTitle}>New Contact</Text>
						<TextInput
							placeholder="Username or Email"
							placeholderTextColor="#888"
							value={contactIdentifier}
							onChangeText={setContactIdentifier}
							style={styles.input}
							autoCapitalize="none"
						/>
						<View style={styles.modalActions}>
							<TouchableOpacity
								onPress={() => setAddModalVisible(false)}
								style={styles.modalButton}
							>
								<Text style={{ color: "#888" }}>Cancel</Text>
							</TouchableOpacity>
							<TouchableOpacity
								onPress={() => {
									handleAddContact(contactIdentifier);
								}}
								style={[styles.modalButton, styles.confirmBtn]}
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
						/>
						<MenuItem
							label="Delete Contact"
							icon="trash-outline"
							color="#FF3B30"
							onPress={() => {
								setContactMenuVisible(false);
								handleDeleteContact(selectedContact);
							}}
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
							placeholderTextColor="#888"
							value={aliasInput}
							onChangeText={setAliasInput}
							style={styles.input}
							autoCapitalize="none"
						/>

						<View style={styles.modalActions}>
							<Pressable
								style={[styles.modalButton, styles.cancel]}
								onPress={() => setAliasModalVisible(false)}
							>
								<Text style={styles.modalButtonText}>
									Cancel
								</Text>
							</Pressable>

							<Pressable
								style={[styles.modalButton, styles.confirm]}
								onPress={() => handleUpdateAlias()}
							>
								<Text style={styles.modalButtonText}>Save</Text>
							</Pressable>
						</View>
					</View>
				</View>
			</Modal>
		</SafeAreaView>
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
		color: "#fff",
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
		backgroundColor: "#161616", // Slightly lighter than pure black
		padding: 12,
		borderRadius: 16,
		marginBottom: 12,
		borderWidth: 1,
		borderColor: "#222",
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
		color: "#fff",
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
		borderColor: "#161616",
	},
	contactInfo: {
		flex: 1,
	},
	searchContainer: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: "#161616",
		borderRadius: 16,
		paddingHorizontal: 12,
		paddingVertical: 10,
		borderWidth: 1,
		borderColor: "#222",
		marginBottom: 16,
		gap: 10,
	},
	searchInput: {
		flex: 1,
		color: "#fff",
		fontSize: 15,
	},
	contactAlias: {
		color: Colors.text,
		fontSize: 17,
		fontWeight: "600",
		marginBottom: 2,
	},
	contactStatus: {
		color: "#888",
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
		shadowColor: "#000",
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
		backgroundColor: "rgba(0,0,0,0.7)",
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
		color: "#fff",
		marginBottom: 20,
	},
	input: {
		backgroundColor: "#2c2c2c",
		borderRadius: 12,
		padding: 14,
		color: "#fff",
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
		color: "#fff",
		fontWeight: "600",
	},
	sheetOverlay: {
		flex: 1,
		backgroundColor: "rgba(0,0,0,0.5)",
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
		backgroundColor: "#333",
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
