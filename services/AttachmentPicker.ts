import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { Alert } from "react-native";

export interface AttachmentResult {
	uri: string;
	type: "image" | "file";
	fileName: string;
	fileSize?: number;
}

/**
 * Opens the system gallery to pick an image or video.
 */
export const pickImage = async (): Promise<AttachmentResult | null> => {
	try {
		const { status } =
			await ImagePicker.requestMediaLibraryPermissionsAsync();

		if (status !== "granted") {
			Alert.alert(
				"Permission Denied",
				"We need gallery access to send images."
			);
			return null;
		}

		const result = await ImagePicker.launchImageLibraryAsync({
			mediaTypes: ImagePicker.MediaTypeOptions.Images,
			allowsEditing: false, // Set to true if you want cropping
			quality: 0.7, // Compress slightly to save data on WebRTC
		});

		if (!result.canceled && result.assets && result.assets.length > 0) {
			const asset = result.assets[0];
			return {
				uri: asset.uri,
				type: "image",
				fileName: asset.fileName || `IMG_${Date.now()}.jpg`,
				fileSize: asset.fileSize,
			};
		}
	} catch (error) {
		console.error("Error picking image:", error);
	}
	return null;
};

/**
 * Opens the system document picker for PDFs, Zips, etc.
 */
export const pickDocument = async (): Promise<AttachmentResult | null> => {
	try {
		const result = await DocumentPicker.getDocumentAsync({
			type: "*/*", // Allow all file types
			copyToCacheDirectory: true,
		});

		if (!result.canceled && result.assets && result.assets.length > 0) {
			const asset = result.assets[0];
			return {
				uri: asset.uri,
				type: "file",
				fileName: asset.name,
				fileSize: asset.size,
			};
		}
	} catch (error) {
		console.error("Error picking document:", error);
	}
	return null;
};
