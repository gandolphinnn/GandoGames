import { app, output, HttpRequest, HttpResponseInit, InvocationContext, Timer, input, HttpHandler, FunctionInput } from '@azure/functions';
import { BaseRequest, GamePlayer } from '@gandogames/common/api';
import { PlayFab, PlayFabAdmin, PlayFabClient, PlayFabServer } from 'playfab-sdk';
import { InnerPublicFunction, InnerFunctionNotifier, InnerFunction, InnerTimeFunction } from './types';

export { PlayFabAdmin, PlayFabClient, PlayFabServer };
export { PlayfabCtx } from './db/playfabCtx';
export * from './types';

PlayFab.settings.titleId = process.env['PLAYFAB_TITLE_ID']!;
PlayFab.settings.developerSecretKey = process.env['PLAYFAB_SECRET_KEY']!;

export const signalRInput = input.generic({
	type: 'signalRConnectionInfo',
	name: 'connectionInfo',
	hubName: 'gameHub',
	connectionStringSetting: 'AzureSignalRConnectionString',
	userId: '{query.userId}',
});

export const signalROutput = output.generic({
	type: 'signalR',
	name: 'signalRMessages',
	hubName: 'gameHub',
	connectionStringSetting: 'AzureSignalRConnectionString',
});

export function registerBaseFunction(
	name: string,
	route: string,
	innerHandler: HttpHandler,
	extraInputs?: FunctionInput[],
) {
	app.http(name, {
		methods: ['POST'],
		authLevel: 'anonymous',
		route: route,
		extraInputs: extraInputs,
		extraOutputs: [signalROutput],
		handler: innerHandler,
	});
}

export function registerPublicFunction<TReq, TRes>(
	name: string,
	route: string,
	innerPublicFunction: InnerPublicFunction<TReq, TRes>,
	extraInputs?: FunctionInput[],
) {
	app.http(name, {
		methods: ['POST'],
		authLevel: 'anonymous',
		route: route,
		extraInputs: extraInputs,
		extraOutputs: [signalROutput],
		handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
			const toRet = {} as HttpResponseInit;
			const notifier = new InnerFunctionNotifier();
			try {
				const body = await request.json().catch(() => undefined) as TReq;
				const result = await innerPublicFunction(body, notifier);
				notifier.prepareContext(context);
				toRet.jsonBody = result;
				toRet.status = 200;
			} catch (err) {
				console.error(err);
				toRet.status = notifier?.errorCode ?? 500;
				toRet.jsonBody = { error: notifier?.errorMessage ?? (err as Error).message ?? 'Internal Server Error' };
			}
			return toRet;
		},
	});
}

export function registerFunction<TReq extends BaseRequest, TRes>(
	name: string,
	route: string,
	innerFunction: InnerFunction<TReq, TRes>,
	extraInputs?: FunctionInput[],
) {
	app.http(name, {
		methods: ['POST'],
		authLevel: 'anonymous',
		route: route,
		extraInputs: extraInputs,
		extraOutputs: [signalROutput],
		handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
			const toRet = {} as HttpResponseInit;
			const notifier = new InnerFunctionNotifier();
			try {
				const body = await request.json().catch(() => undefined) as TReq;
				const player = await authenticateSession(body, notifier);
				const result = await innerFunction(body, notifier, player);
				notifier.prepareContext(context);
				toRet.jsonBody = result;
				toRet.status = 200;
			} catch (err) {
				console.error(err);
				toRet.status = notifier?.errorCode ?? 500;
				toRet.jsonBody = { error: notifier?.errorMessage ?? (err as Error).message ?? 'Internal Server Error' };
			}
			return toRet;
		},
	});
}

export function registerTimeFunction(
	name: string,
	cron: string,
	runOnStartup: boolean,
	innerTimeFunction: InnerTimeFunction,
	extraInputs?: FunctionInput[],
) {
	app.timer(name, {
		schedule: cron,
		runOnStartup: runOnStartup,
		useMonitor: !runOnStartup,
		extraInputs: extraInputs,
		extraOutputs: [signalROutput],
		handler: async (timer: Timer, context: InvocationContext): Promise<void> => {
			const notifier = new InnerFunctionNotifier();
			try {
				await innerTimeFunction(timer, notifier);
				notifier.prepareContext(context);
			} catch (err) {
				console.error(err);
			}
		},
	});
}

export async function authenticateSession(request: BaseRequest, notifier: InnerFunctionNotifier): Promise<GamePlayer> {
	const { errorCode, errorMessage } = notifier;
	notifier.errorCode = 401;
	notifier.errorMessage = 'Session expired';
	const authResult = await pfPromise<PlayFabServerModels.AuthenticateSessionTicketResult>(
		cb => PlayFabServer.AuthenticateSessionTicket({ SessionTicket: request.sessionTicket }, cb),
	);
	notifier.errorCode = errorCode;
	notifier.errorMessage = errorMessage;
	const id = authResult.UserInfo!.PlayFabId!;
	const name = authResult.UserInfo!.TitleInfo?.DisplayName || authResult.UserInfo!.Username || 'Guest';
	const iconResult = await pfPromise<PlayFabServerModels.GetUserDataResult>(
		cb => PlayFabServer.GetUserData({ PlayFabId: id, Keys: ['icon'] }, cb),
	);
	return { id, name, icon: iconResult.Data?.['icon']?.Value };
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
