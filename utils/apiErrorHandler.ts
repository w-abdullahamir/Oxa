export const getErrorMessage = (error: any): string => {
	console.error("Error:", error);

	const status = error.response?.status;
	const data = error.response?.data;

	switch (status) {
		case 400:
			return data?.error || "Invalid input. Please check your data.";
		case 401:
			return data?.error || "Wrong email or password";
		case 404:
			return data?.error || "Incorrect credentials";
		case 409:
			return data?.error || "An account with this email or username already exists.";
		case 429:
			return data?.error || "Too many attempts. Please try again later.";
		case 500:
			return data?.error || "Server error. Our engineers are on it!";
		case 503:
			return data?.error || "Service unavailable. Please try again later.";
		default:
			return "Oxa services are down at the moment. Please try again later.";
	}
};
