const TITLE_ID = process.env['PLAYFAB_TITLE_ID']!;
const SECRET_KEY = process.env['PLAYFAB_SECRET_KEY']!;
const BASE_URL = `https://${TITLE_ID}.playfabapi.com`;

interface PlayFabResponse<T> {
	code: number;
	data: T;
	errorMessage?: string;
}

export async function playfabClientPost<T>(endpoint: string, body: object): Promise<T> {
	const response = await fetch(`${BASE_URL}${endpoint}`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ TitleId: TITLE_ID, ...body }),
	});
	const json = await response.json() as PlayFabResponse<T>;
	if (json.code !== 200) throw new Error(json.errorMessage ?? 'PlayFab error');
	return json.data;
}

export async function playfabServerPost<T>(endpoint: string, body: object): Promise<T> {
	const response = await fetch(`${BASE_URL}${endpoint}`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'X-SecretKey': SECRET_KEY,
		},
		body: JSON.stringify(body),
	});
	const json = await response.json() as PlayFabResponse<T>;
	if (json.code !== 200) throw new Error(json.errorMessage ?? 'PlayFab error');
	return json.data;
}
