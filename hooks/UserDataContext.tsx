import React, { createContext, useContext, useState } from "react";

interface Contact {
	otherUserId?: string;
	otherUsername?: string;
	otherEmail?: string;
}

interface UserData {
	userId?: string;
	name?: string;
	username?: string;
	email?: string;
	country?: string;
	city?: string;
	profileQRId?: string;
	joinedCommunities?: string[];
	joinedGroups?: string[];
	contacts?: Contact[];
}

const UserDataContext = createContext<{
	userData: UserData | null;
	setUserData: React.Dispatch<React.SetStateAction<UserData | null>>;
}>({
	userData: null,
	setUserData: () => {},
});

export const UserDataProvider = ({
	children,
}: {
	children: React.ReactNode;
}) => {
	const [userData, setUserData] = useState<UserData | null>(null);

	return (
		<UserDataContext.Provider value={{ userData, setUserData }}>
			{children}
		</UserDataContext.Provider>
	);
};

export const useUserData = () => useContext(UserDataContext);
