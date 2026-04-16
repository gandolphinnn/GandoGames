import { app, HttpMethod, HttpRequest, HttpRequestParams, HttpResponseInit, InvocationContext } from '@azure/functions';
import { PlayFab, PlayFabClient, PlayFabServer } from 'playfab-sdk';

PlayFab.settings.titleId = process.env['PLAYFAB_TITLE_ID']!;
PlayFab.settings.developerSecretKey = process.env['PLAYFAB_SECRET_KEY']!;

export { PlayFabClient, PlayFabServer };

export type InnerFunction<TReq, TRes> = (body: TReq, params: HttpRequestParams, options: InnerFunctionOptions, query: URLSearchParams) => Promise<TRes>;
export type InnerFunctionOptions = {
	/** The HTTP status code for a successful response. Default is 200. */
	successCode?: number,
	/** The HTTP status code for an error response when no FunctionError is thrown. Default is 500. */
	errorCode?: number,
	/** The error message for an error response when no FunctionError is thrown. Default is the caught exception message. */
	errorMessage?: string
};

export function registerAzureHttpFunction<TReq, TRes>(
	name: string,
	method: HttpMethod,
	route: string,
	innerFunction: InnerFunction<TReq, TRes>
) {
	app.http(name, {
		methods: [method],
		authLevel: 'anonymous',
		route: route,
		handler: async (request: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> => {
			const toRet = {} as HttpResponseInit;
			const options: InnerFunctionOptions = {}
			try {
				const body = await request.json().catch(() => undefined) as TReq;
				const params = request.params;
				const result = await innerFunction(body, params, options, request.query);
				toRet.jsonBody = result
				toRet.status = options.successCode ?? 200;
			} catch (err) {
				console.error(err);
				toRet.status = options?.errorCode ?? 500;
				toRet.jsonBody = { error: options?.errorMessage ?? (err as Error).message ?? 'Internal Server Error' };
			}
			return toRet;
		},
	});
}

/** Wraps a PlayFab SDK callback call into a Promise. */
export function pfPromise<T extends PlayFabModule.IPlayFabResultCommon>(
	call: (cb: PlayFabModule.ApiCallback<T>) => void,
): Promise<T> {
	return new Promise((resolve, reject) => {
		call((error, result) => {
			if (result !== null) resolve(result.data);
			else reject(new Error(error?.errorMessage ?? 'PlayFab error'));
		});
	});
}