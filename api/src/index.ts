import { app, output, HttpRequest, HttpResponseInit, InvocationContext, Timer, input, HttpHandler, FunctionInput, HttpMethod as AzureHttpMethod } from '@azure/functions';
import { AnyEndpoint, EndpointParams, GamePlayer, HttpMethod, IconType, LangCode, METHODS_WITH_BODY, SAFE_METHODS, Theme } from '@gandogames/shared/dto';
import { PlayFab, PlayFabAdmin as RealPlayFabAdmin, PlayFabClient as RealPlayFabClient, PlayFabServer as RealPlayFabServer } from 'playfab-sdk';
import { mockPlayFabAdmin, mockPlayFabClient, mockPlayFabServer } from './db/mockPlayFab';
import { InnerPublicFunction, InnerFunctionNotifier, InnerFunction, InnerTimeFunction } from './types';
import { withRoomLock } from './lock';

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

// Every function's name, HTTP method, route and request/response types come from its endpoint
// definition in the shared contract (shared/dto/endpoints.ts) — the single source of truth the
// site's BackendService consumes too, so the two sides cannot drift.

/**
 * The @azure/functions HttpMethod union does not include QUERY (the IETF safe-method-with-body
 * draft) yet; the Functions host itself routes custom verbs fine, so widen the type here.
 */
const azureMethods = (method: HttpMethod): AzureHttpMethod[] => [method as AzureHttpMethod];

/** Parse the JSON body for body-carrying methods; GET/DELETE requests have no body by contract. */
async function readBody<E extends AnyEndpoint>(def: E, request: HttpRequest): Promise<Parameters<InnerFunction<E>>[0]> {
	const body = METHODS_WITH_BODY.includes(def.method) ? await request.json().catch(() => undefined) : undefined;
	return body as Parameters<InnerFunction<E>>[0];
}

/** Register a raw handler on an endpoint definition; used for signalr/negotiate, which needs the connection-info input binding. */
export function registerBaseEndpoint(
	def: AnyEndpoint,
	innerHandler: HttpHandler,
	extraInputs?: FunctionInput[],
) {
	app.http(def.name, {
		methods: azureMethods(def.method),
		authLevel: 'anonymous',
		route: def.path,
		extraInputs: extraInputs,
		extraOutputs: [signalROutput],
		handler: innerHandler,
	});
}

/** Register an unauthenticated endpoint (login, register, guest login). */
export function registerPublicEndpoint<E extends AnyEndpoint>(
	def: E,
	innerPublicFunction: InnerPublicFunction<E>,
) {
	app.http(def.name, {
		methods: azureMethods(def.method),
		authLevel: 'anonymous',
		route: def.path,
		extraOutputs: [signalROutput],
		handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
			const toRet = {} as HttpResponseInit;
			const notifier = new InnerFunctionNotifier();
			try {
				const body = await readBody(def, request);
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

/** Register an authenticated endpoint: the session ticket in `Authorization: Bearer` is validated against PlayFab before `innerFunction` runs. */
export function registerEndpoint<E extends AnyEndpoint>(
	def: E,
	innerFunction: InnerFunction<E>,
) {
	app.http(def.name, {
		methods: azureMethods(def.method),
		authLevel: 'anonymous',
		route: def.path,
		extraOutputs: [signalROutput],
		handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
			const toRet = {} as HttpResponseInit;
			const notifier = new InnerFunctionNotifier();
			try {
				const body = await readBody(def, request);
				const params = request.params as unknown as EndpointParams<E>;
				const player = await authenticateSession(extractSessionTicket(request), notifier);
				// Handlers do load → mutate → save against storage with no compare-and-set, so two
				// concurrent calls on the same room can clobber each other. Any unsafe call on a
				// route carrying a {roomId} is therefore serialized per room automatically; safe
				// methods (GET/QUERY) are read-only by contract, so they never take the lock.
				const roomId = request.params['roomId'];
				const runInner = () => innerFunction(body, params, notifier, player);
				const result = roomId && !SAFE_METHODS.includes(def.method)
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

/** Extract the PlayFab session ticket from the `Authorization: Bearer <ticket>` header. */
export function extractSessionTicket(request: HttpRequest): string | undefined {
	const header = request.headers.get('authorization');
	return header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : undefined;
}

export async function authenticateSession(sessionTicket: string | undefined, notifier: InnerFunctionNotifier): Promise<GamePlayer> {
	const { errorCode, errorMessage } = notifier;
	notifier.errorCode = 401;
	notifier.errorMessage = 'Session expired';
	if (!sessionTicket) throw new Error('Missing session ticket');
	const authResult = await pfPromise<PlayFabServerModels.AuthenticateSessionTicketResult>(
		cb => PlayFabServer.AuthenticateSessionTicket({ SessionTicket: sessionTicket }, cb),
	);
	notifier.errorCode = errorCode;
	notifier.errorMessage = errorMessage;
	const id = authResult.UserInfo!.PlayFabId!;
	const name = authResult.UserInfo!.TitleInfo?.DisplayName || authResult.UserInfo!.Username || 'Guest';
	const isGuest = !authResult.UserInfo!.Username;
	const profileResult = await pfPromise<PlayFabServerModels.GetUserDataResult>(
		cb => PlayFabServer.GetUserData({ PlayFabId: id, Keys: ['icon', 'theme', 'language', 'role'] }, cb),
	);
	const data = profileResult.Data;
	const player: GamePlayer = {
		id,
		name,
		icon: (data?.['icon']?.Value as IconType) ?? 'profile',
		theme: (data?.['theme']?.Value as Theme) ?? 'dark',
		language: (data?.['language']?.Value as LangCode) ?? 'en',
		role: (data?.['role']?.Value as PlayerRole) ?? '',
		type: isGuest ? 'guest' : 'user',
	};
	return player;
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
