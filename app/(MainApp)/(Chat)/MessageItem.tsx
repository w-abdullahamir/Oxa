// deleteable
import { IMessage } from "@/types/Chat";
import { Ionicons } from "@expo/vector-icons";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

// Partial logic for the new render item
const MessageItem = ({ item, isMe }: { item: IMessage; isMe: boolean }) => {
	const handleDownload = (uri: string) => {};
	return (
		<View style={[styles.container, isMe ? styles.me : styles.them]}>
			{item.type === "text" && <Text>{item.content}</Text>}
			{item.type === "image" && (
				<Image source={{ uri: item.content }} style={styles.image} />
			)}
			{item.type === "file" && (
				<TouchableOpacity onPress={() => handleDownload(item.content)}>
					<Ionicons name="document-attach" size={24} />
					<Text>{item.fileName}</Text>
				</TouchableOpacity>
			)}
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	meContainer: {
		justifyContent: "flex-end",
	},
	themContainer: {
		justifyContent: "flex-start",
	},
	me: {},
	them: {},
	image: {},
});

export default MessageItem;
