export interface Environment {
	production: boolean;
	/** Primary API origin, including the `/api` suffix. */
	apiBaseUrl: string;
	/** Optional API origin used when {@link apiBaseUrl} is unreachable. */
	apiFallbackUrl?: string;
}
