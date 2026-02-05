export const BASE_URL = process.env.EXPO_PUBLIC_OXA_BACKEND_URL;

export const API_ENDPOINTS = {
	USER_HOME: "/user/home",
	USER_PROFILE: "/user/profile",
	ADD_CONTACT: "/user/contacts/add",
	UPDATE_CONTACT_ALIAS: "/user/contacts/update-alias",
	DELETE_CONTACT: "/user/contacts/delete",
	LOGIN: "/user/auth/login",
	LOGOUT: "/user/auth/logout",
	REGISTER: "/user/auth/signup",
	FORGOT_PASSWORD: "/user/auth/forgot-password",
	RESET_PASSWORD: "/user/auth/reset-password",
	ICE_SERVERS: "/user/sensitive-stuff/ice-servers",
};
