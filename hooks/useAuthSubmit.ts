import { getErrorMessage } from "@/utils/apiErrorHandler";
import { useCallback, useState } from "react";

export function useAuthSubmit<T>(
	action: (data: T) => Promise<any>,
	onSuccess?: (data: T) => void
) {
	const [loading, setLoading] = useState(false);
	const [serverError, setServerError] = useState<string | null>(null);

	const submitHandler = useCallback(
		async (data: T) => {
			setLoading(true);
			setServerError(null);
			try {
				await action(data);
				if (onSuccess) {
					onSuccess(data);
				}
			} catch (err: any) {
				setServerError(getErrorMessage(err));
			}
			setLoading(false);
		},
		[action, onSuccess]
	);

	return { loading, serverError, submitHandler };
}
