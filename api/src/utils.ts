import { app, HttpMethod, HttpRequest, HttpRequestParams, HttpResponseInit, InvocationContext } from '@azure/functions';

export class FunctionError extends Error {
	constructor(public readonly status: number, message: string) {
		super(message);
		this.name = 'FunctionError';
	}
}

export type InnerFunction<TReq, TRes> = (body: TReq, params: HttpRequestParams) => InnerFunctionReturn<TRes>;
export type InnerFunctionReturn<T> = {
	promise: Promise<T>,
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
			let result: InnerFunctionReturn<TRes> | null = null;
			try {
				const body = await request.json().catch(() => undefined) as TReq;
				const params = request.params;
				result = innerFunction(body, params);
				toRet.jsonBody = await result.promise;
				toRet.status = result.successCode ?? 200;
			} catch (err) {
				if (err instanceof FunctionError) {
					toRet.status = err.status;
					toRet.jsonBody = { error: err.message };
				} else {
					toRet.status = result?.errorCode ?? 500;
					toRet.jsonBody = { error: result?.errorMessage ?? (err as Error).message ?? 'Internal Server Error' };
				}
			}
			return toRet;
		},
	});
}
