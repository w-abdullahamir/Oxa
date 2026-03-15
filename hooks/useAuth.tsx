import { API_ENDPOINTS, BASE_URL } from "@/constants/Endpoints";
import apiClient from "@/services/api";
import {
	getToken,
	removeToken,
	saveToken,
} from "@/services/crypto/secureStorage";
import axios from "axios";
import React, {
	createContext,
	ReactNode,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";

interface AuthContextProps {
	token: string | null;
	loading: boolean;
	signup: (data: {
		email: string;
		password: string;
		username?: string;
	}) => Promise<void>;
	login: (data: { identifier: string; password: string }) => Promise<void>;
	logout: () => Promise<void>;
	forgotPassword: (data: { email: string }) => Promise<void>;
	resetPassword: (data: {
		email: string;
		resetPin: string;
		password: string;
	}) => Promise<void>;
}

const AuthContext = createContext<AuthContextProps>({
	token: null,
	loading: true,
	signup: async () => {},
	login: async () => {},
	logout: async () => {},
	forgotPassword: async () => {},
	resetPassword: async () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
	const [token, setToken] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const loadUser = async () => {
			const stored = await getToken();

			if (stored) {
				setToken(stored);
			} else {
				setToken(null);
			}
			setLoading(false);
		};

		loadUser();
	}, []);

	const signup = useCallback(
		async (data: {
			email: string;
			password: string;
			username?: string | null;
		}) => {
			const { username, ...rest } = data;
			const payload =
				username && username.trim() !== "" ? { ...data } : rest;

			await axios.post(`${BASE_URL}${API_ENDPOINTS.REGISTER}`, payload, {
				headers: { "Content-Type": "application/json" },
			});
		},
		[]
	);

	const login = useCallback(
		async (data: { identifier: string; password: string }) => {
			setLoading(true);

			const res = await apiClient.post(API_ENDPOINTS.LOGIN, data);

			setToken(res.data.token);
			await saveToken(res.data.token);
			setLoading(false);
		},
		[]
	);

	const logout = useCallback(async () => {
		setLoading(true);

		try {
			await apiClient.post(API_ENDPOINTS.LOGOUT);
		} catch (error) {
			console.error("Logout error: ", error);
		}

		setToken(null);
		await removeToken();
		setLoading(false);
	}, []);

	const forgotPassword = useCallback(async (data: { email: string }) => {
		await axios.post(`${BASE_URL}${API_ENDPOINTS.FORGOT_PASSWORD}`, data);
	}, []);

	const resetPassword = useCallback(
		async (data: { email: string; resetPin: string; password: string }) => {
			await axios.post(
				`${BASE_URL}${API_ENDPOINTS.RESET_PASSWORD}`,
				data
			);
		},
		[]
	);

	const contextValue = useMemo(
		() => ({
			token,
			loading,
			signup,
			login,
			logout,
			forgotPassword,
			resetPassword,
		}),
		[token, loading, signup, login, logout, forgotPassword, resetPassword]
	);

	return (
		<AuthContext.Provider value={contextValue}>
			{children}
		</AuthContext.Provider>
	);
};

export const useAuth = () => useContext(AuthContext);
