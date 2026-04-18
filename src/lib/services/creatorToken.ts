const STORAGE_KEY = 'autocross-creator-token';

export function getCreatorToken(): string {
	let token = localStorage.getItem(STORAGE_KEY);
	if (!token) {
		token = crypto.randomUUID();
		localStorage.setItem(STORAGE_KEY, token);
	}
	return token;
}
