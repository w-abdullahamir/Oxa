import { API_ENDPOINTS, BASE_URL } from "@/constants/Endpoints";
import {
	getToken,
	removeToken,
	saveToken,
} from "@/services/crypto/secureStorage";
import axios from "axios";
import React, {
	createContext,
	ReactNode,
	useContext,
	useEffect,
	useState,
} from "react";

interface AuthContextProps {
	token: string | null;
	loading: boolean;
	login: (username: string, password: string) => Promise<boolean>;
	logout: () => void;
}

const AuthContext = createContext<AuthContextProps>({
	token: null,
	loading: true,
	login: async () => false,
	logout: async () => false,
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
	const [token, setToken] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const loadUser = async () => {
			try {
				const stored = await getToken();

				if (stored) {
					setToken(stored);
				} else {
					setToken(null);
				}
			} catch (error) {
				console.error("Failed to load user", error);
				setToken(null);
			} finally {
				setLoading(false);
			}
		};

		loadUser();
	}, []);

	const login = async (identifier: string, password: string) => {
		try {
			const res = await axios.post(
				`${BASE_URL}${API_ENDPOINTS.LOGIN}`,
				{ identifier, password },
				{
					headers: {
						"Content-Type": "application/json",
					},
				}
			);
			const token = res.data.token;
			await saveToken(token);
			setToken(token);
			return true;
		} catch (error) {
			throw error;
		}
	};

	const logout = async () => {
		try {
			const res = await axios.post(
				`${BASE_URL}${API_ENDPOINTS.LOGOUT}`,
				{},
				{
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${token}`,
					},
				}
			);
			await removeToken();
			setToken(null);
		} catch (error) {
			console.error("Logout error:", error);
			try {
				await removeToken();
				setToken(null);
			} catch {
				throw error;
			}
			throw error;
		}
	};

	return (
		<AuthContext.Provider value={{ token, loading, login, logout }}>
			{children}
		</AuthContext.Provider>
	);
};

export const useAuth = () => useContext(AuthContext);
