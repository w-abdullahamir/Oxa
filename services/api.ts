import { BASE_URL } from "@/constants/Endpoints";
import { getToken } from "@/services/crypto/secureStorage";
import axios from "axios";

const apiClient = axios.create({
	baseURL: BASE_URL,
	headers: {
		"Content-Type": "application/json",
	},
});

apiClient.interceptors.request.use(
	async (config) => {
		const token = await getToken();

		if (token) {
			config.headers.Authorization = `Bearer ${token}`;
		}
		return config;
	},
	(error) => {
		return Promise.reject(error);
	}
);

export default apiClient;
