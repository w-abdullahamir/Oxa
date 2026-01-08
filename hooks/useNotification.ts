import { router, useGlobalSearchParams } from "expo-router";
import { useEffect } from "react";
import Toast from "react-native-toast-message";
import { useSocket } from "./SocketContext";
import { useUserData } from "./UserDataContext";

export const useNotifications = () => {
	const { socket } = useSocket();
	const params = useGlobalSearchParams();
	const myId = useUserData().userData?.userId ?? null;
	const { userData } = useUserData();

	useEffect(() => {
		if (!socket) return;

		const onNotifyWaiting = ({ from }: { from: string }) => {
			if (params.otherUserId === from) return;

			// Get alias from contacts
			const contact = userData?.contacts?.find((c) => c.user === from);
			const alias = contact?.alias || from;

			Toast.show({
				type: "info",
				text1: "Chat Request",
				text2: `${alias} is waiting for you.`,
				onPress: () => {
					router.push({
						pathname: "/ChatOneToOne",
						params: {
							userId: String(myId),
							otherUserId: String(from),
						},
					});
					Toast.hide();
				},
			});
		};

		socket.on("notify_waiting", onNotifyWaiting);
		return () => {
			socket.off("notify_waiting", onNotifyWaiting);
		};
	}, [socket, params.otherUserId]);
};
