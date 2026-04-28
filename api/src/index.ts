import { app, output, HttpMethod, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { BaseRequest, GamePlayer } from '@gandogames/common/api';
import { PlayFab, PlayFabClient, PlayFabServer } from 'playfab-sdk';

PlayFab.settings.titleId = process.env['PLAYFAB_TITLE_ID']!;
PlayFab.settings.developerSecretKey = process.env['PLAYFAB_SECRET_KEY']!;

export { PlayFabClient, PlayFabServer };
export { PlayfabCtx } from './db/playfabCtx';

//#region SignalR
export const signalROutput = output.generic({
	type: 'signalR',
	name: 'signalRMessages',
	hubName: 'gameHub',
	connectionStringSetting: 'AzureSignalRConnectionString',
});

export type SignalRMessage =
	| { target: string; arguments: unknown[]; userId?: string; groupName?: string }
	| { action: 'add' | 'remove'; userId: string; groupName: string };
//#endregion SignalR

//#region Shared types
export type InnerFunctionOptions = {
	/** The HTTP status code for a successful response. Default is 200. */
	successCode?: number,
	/** The HTTP status code for an error response when no FunctionError is thrown. Default is 500. */
	errorCode?: number,
	/** The error message for an error response when no FunctionError is thrown. Default is the caught exception message. */
	errorMessage?: string,
	/** SignalR messages to broadcast after a successful response. */
	signalR: SignalRMessage[],
};
//#endregion Shared types

//#region Non authorized
export type InnerPublicFunction<TReq, TRes> = (body: TReq, options: InnerFunctionOptions) => Promise<TRes>;

export function registerPublicFunction<TReq, TRes>(
	name: string,
	route: string,
	innerPublicFunction: InnerPublicFunction<TReq, TRes>,
) {
	app.http(name, {
		methods: ['POST'],
		authLevel: 'anonymous',
		route: route,
		extraOutputs: [signalROutput],
		handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
			const toRet = {} as HttpResponseInit;
			const options: InnerFunctionOptions = { signalR: [] };
			try {
				const body = await request.json().catch(() => undefined) as TReq;
				const result = await innerPublicFunction(body, options);
				if (options.signalR.length) context.extraOutputs.set(signalROutput, options.signalR);
				toRet.jsonBody = result;
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
//#endregion Non authorized

//#region Authorized
export type InnerFunction<TReq extends BaseRequest, TRes> = (body: TReq, options: InnerFunctionOptions, player: GamePlayer) => Promise<TRes>;
export function registerFunction<TReq extends BaseRequest, TRes>(
	name: string,
	route: string,
	innerFunction: InnerFunction<TReq, TRes>,
) {
	app.http(name, {
		methods: ['POST'],
		authLevel: 'anonymous',
		route: route,
		extraOutputs: [signalROutput],
		handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
			const toRet = {} as HttpResponseInit;
			const options: InnerFunctionOptions = { signalR: [] };
			try {
				const body = await request.json().catch(() => undefined) as TReq;
				const player = await authenticateSession(body, options);
				const result = await innerFunction(body, options, player);
				if (options.signalR.length) context.extraOutputs.set(signalROutput, options.signalR);
				toRet.jsonBody = result;
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
//#endregion Authorized

//#region PlayFab
export async function authenticateSession(request: BaseRequest, options: InnerFunctionOptions): Promise<GamePlayer> {
	const { errorCode, errorMessage } = options;
	options.errorCode = 401;
	options.errorMessage = 'Session expired';
	const result = await pfPromise<PlayFabServerModels.AuthenticateSessionTicketResult>(
		cb => PlayFabServer.AuthenticateSessionTicket({ SessionTicket: request.sessionTicket }, cb),
	);
	options.errorCode = errorCode;
	options.errorMessage = errorMessage;
	return { id: result.UserInfo!.PlayFabId!, name: result.UserInfo!.Username || 'Guest' };
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
//#endregion PlayFab
