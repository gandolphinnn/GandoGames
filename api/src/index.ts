import { app, output, HttpRequest, HttpResponseInit, InvocationContext, Timer, input, HttpHandler, FunctionInput } from '@azure/functions';
import { BaseRequest, GamePlayer, IconType, LangCode, Theme } from '@gandogames/shared/dto';
import { PlayFab, PlayFabAdmin as RealPlayFabAdmin, PlayFabClient as RealPlayFabClient, PlayFabServer as RealPlayFabServer } from 'playfab-sdk';
import { mockPlayFabAdmin, mockPlayFabClient, mockPlayFabServer } from './db/mockPlayFab';
import { InnerPublicFunction, InnerFunctionNotifier, InnerFunction, InnerTimeFunction } from './types';
import { withRoomLock } from './lock';

// MOCK_BACKEND swaps the PlayFab SDK clients for an in-memory simulation so collaborators can
// run the full API locally with no secrets. Opt-in only: production never sets it, so the real
// PlayFab clients (and the secret-key settings below) are always used there.
const USE_MOCK_BACKEND = process.env['MOCK_BACKEND'] === 'true';

export const PlayFabClient = (USE_MOCK_BACKEND ? mockPlayFabClient : RealPlayFabClient) as unknown as typeof RealPlayFabClient;
export const PlayFabServer = (USE_MOCK_BACKEND ? mockPlayFabServer : RealPlayFabServer) as unknown as typeof RealPlayFabServer;
export const PlayFabAdmin = (USE_MOCK_BACKEND ? mockPlayFabAdmin : RealPlayFabAdmin) as unknown as typeof RealPlayFabAdmin;
export { PlayfabCtx } from './db/playfabCtx';
export * from './types';

if (USE_MOCK_BACKEND) {
	console.log('[MOCK_BACKEND] PlayFab is served from an in-memory simulation — no secrets required.');
} else {
	PlayFab.settings.titleId = process.env['PLAYFAB_TITLE_ID']!;
	PlayFab.settings.developerSecretKey = process.env['PLAYFAB_SECRET_KEY']!;
}

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

export interface RegisterFunctionOptions {
	/**
	 * Skip the automatic per-room lock even when the request carries a roomId. Use for read-only
	 * handlers — reads can't lose data, so locking them would only add latency and contention.
	 */
	skipLock?: boolean;
	extraInputs?: FunctionInput[];
}

export function registerFunction<TReq extends BaseRequest, TRes>(
	name: string,
	route: string,
	innerFunction: InnerFunction<TReq, TRes>,
	options: RegisterFunctionOptions = {},
) {
	app.http(name, {
		methods: ['POST'],
		authLevel: 'anonymous',
		route: route,
		extraInputs: options.extraInputs,
		extraOutputs: [signalROutput],
		handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
			const toRet = {} as HttpResponseInit;
			const notifier = new InnerFunctionNotifier();
			try {
				const body = await request.json().catch(() => undefined) as TReq;
				const player = await authenticateSession(body, notifier);
				// Handlers do load → mutate → save against storage with no compare-and-set, so two
				// concurrent calls on the same room can clobber each other. Any request carrying a
				// roomId is therefore serialized per room automatically; read-only handlers opt out
				// via skipLock.
				const roomId = (body as { roomId?: unknown })?.roomId;
				const runInner = () => innerFunction(body, notifier, player);
				const result = !options.skipLock && typeof roomId === 'string' && roomId.length > 0
					? await withRoomLock(roomId, runInner)
					: await runInner();
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
	const isGuest = !authResult.UserInfo!.Username;
	const profileResult = await pfPromise<PlayFabServerModels.GetUserDataResult>(
		cb => PlayFabServer.GetUserData({ PlayFabId: id, Keys: ['icon', 'theme', 'language'] }, cb),
	);
	const data = profileResult.Data;
	return {
		id,
		name,
		isGuest,
		icon: (data?.['icon']?.Value as IconType) ?? 'profile',
		theme: (data?.['theme']?.Value as Theme) ?? 'dark',
		language: (data?.['language']?.Value as LangCode) ?? 'en',
	};
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
