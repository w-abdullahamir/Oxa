export const BASE_URL =
	"https://intelligence-kids-produce-maria.trycloudflare.com";

export const API_ENDPOINTS = {
	USER_HOME: "/user/home",
	USER_PROFILE: "/user/profile",
	LOGIN: "/user/auth/login",
	LOGOUT: "/user/auth/logout",
	REGISTER: "/user/auth/signup",
	FORGOT_PASSWORD: "/user/auth/forgot-password",
	RESET_PASSWORD: "/user/auth/reset-password",
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
