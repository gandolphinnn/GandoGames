interface PlayFabResponse<T> {
	code: number;
	data: T;
	errorMessage?: string;
}

export class PlayFabHttp {
	private static readonly TITLE_ID = process.env['PLAYFAB_TITLE_ID']!;
	private static readonly SECRET_KEY = process.env['PLAYFAB_SECRET_KEY']!;
	private static readonly BASE_URL = `https://${PlayFabHttp.TITLE_ID}.playfabapi.com`;

	/** Call a PlayFab Client API endpoint (`/Client/*`). Identifies the title via TitleId in the body. */
	public static async client<T>(endpoint: string, body: object): Promise<T> {
		return PlayFabHttp.post<T>('/Client/' + endpoint, {}, { TitleId: PlayFabHttp.TITLE_ID, ...body });
	}

	/** Call a PlayFab Server API endpoint (`/Server/*`). Authenticates via the secret key header. */
	public static async server<T>(endpoint: string, body: object): Promise<T> {
		return PlayFabHttp.post<T>('/Server/' + endpoint, { 'X-SecretKey': PlayFabHttp.SECRET_KEY }, body);
	}

	private static async post<T>(endpoint: string, headers: Record<string, string>, body: object): Promise<T> {
		const url = `${PlayFabHttp.BASE_URL}${endpoint}`;
		const response = await fetch(url, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', ...headers },
			body: JSON.stringify(body),
		});
		const json = await response.json() as PlayFabResponse<T>;
		if (json.code !== 200) throw new Error(json.errorMessage ?? 'PlayFab error');
		return json.data;
	}
}
