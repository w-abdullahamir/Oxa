import { API_ENDPOINTS, BASE_URL } from "@/constants/Endpoints";
import { useAuth } from "@/hooks/useAuth";
import axios from "axios";
import { useRouter } from "expo-router";
import { hideAsync } from "expo-splash-screen";
import { useEffect } from "react";
import Toast from "react-native-toast-message";

export default function MainAppLayout() {
	const router = useRouter();
	const { token, loading, logout } = useAuth();

	useEffect(() => {
		if (loading) return;

		const verifySession = async () => {
			if (token === null) {
				await hideAsync();
				router.replace("/(auth)/Login");
				return;
			}

			try {
				const res = await axios.get(
					`${BASE_URL}${API_ENDPOINTS.USER_PROFILE}`,
					{
						headers: {
							"Content-Type": "application/json",
							Authorization: `Bearer ${token}`,
						},
					}
				);

				// If response status is 401, treat it as unauthorized
				if (
					res.status === 401 ||
					res.data?.message === "Unauthorised"
				) {
					throw new Error("Session expired");
				}
				router.replace("./(MainApp)/Home");
			} catch (error) {
				console.error("Session verification error:", error);
				Toast.show({
					type: "error",
					text1: "Session Expired",
					text2: "Please log in again.",
					position: "top",
				});
				await logout();
				router.replace("/(auth)/Login");
			} finally {
				hideAsync();
			}
		};

		verifySession();
	}, [token, loading, logout, router]);

	return null;
}
