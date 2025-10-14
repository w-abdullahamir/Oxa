export const BASE_URL = "https://example.com";

export const API_ENDPOINTS = {
	USER_HOME: "/home_example",
	USER_PROFILE: "/profile_example",
	LOGIN: "/login_example",
	LOGOUT: "/logout_example",
	REGISTER: "/signup_example",
	FORGOT_PASSWORD: "/forgot-password_example",
	RESET_PASSWORD: "/reset-password_example",
};

export const ICE_SERVERS = [
	{
		urls: "stun:stun.l.google.com:19302",
	},
	{
		urls: "turn:turn.example.com:3478",
		username: "user",
		credential: "pass",
	},
];
