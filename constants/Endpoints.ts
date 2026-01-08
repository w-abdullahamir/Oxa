export const BASE_URL = "https://ectodermal-aphorismic-jenny.ngrok-free.dev";

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
};

export const ICE_SERVERS = [
	{
		urls: "stun:stun.relay.metered.ca:80",
	},
	{
		urls: "turn:global.relay.metered.ca:80",
		username: "63f89b1e319a86f5738f2cdd",
		credential: "IIV6ncetsPfKK687",
	},
	{
		urls: "turn:global.relay.metered.ca:80?transport=tcp",
		username: "63f89b1e319a86f5738f2cdd",
		credential: "IIV6ncetsPfKK687",
	},
	{
		urls: "turn:global.relay.metered.ca:443",
		username: "63f89b1e319a86f5738f2cdd",
		credential: "IIV6ncetsPfKK687",
	},
	{
		urls: "turns:global.relay.metered.ca:443?transport=tcp",
		username: "63f89b1e319a86f5738f2cdd",
		credential: "IIV6ncetsPfKK687",
	},
];
