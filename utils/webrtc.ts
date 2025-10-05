export type PeerEntry = {
	pc: RTCPeerConnection;
	dc?: RTCDataChannel;
	iceQueue: any[];
	dcOpen: boolean;
};

export const createPeer = (iceServers: RTCIceServer[]) => {
	const pc = new RTCPeerConnection({ iceServers } as any);
	const entry: PeerEntry = {
		pc,
		iceQueue: [],
		dcOpen: false,
	};
	return entry;
};
