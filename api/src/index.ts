import { app, output, HttpMethod, HttpRequest, HttpResponseInit, InvocationContext, Timer } from '@azure/functions';
import { BaseRequest, GamePlayer, RoomData, SignalREventType } from '@gandogames/common/api';
import { run } from 'node:test';
import { PlayFab, PlayFabClient, PlayFabServer } from 'playfab-sdk';

PlayFab.settings.titleId = process.env['PLAYFAB_TITLE_ID']!;
PlayFab.settings.developerSecretKey = process.env['PLAYFAB_SECRET_KEY']!;

export { PlayFabClient, PlayFabServer };
export { PlayfabCtx } from './db/playfabCtx';

//#region SignalR
const signalROutput = output.generic({
	type: 'signalR',
	name: 'signalRMessages',
	hubName: 'gameHub',
	connectionStringSetting: 'AzureSignalRConnectionString',
});

export type SignalRMessage =
	| { target: SignalREventType; arguments: unknown[]; }
	| { target: SignalREventType; arguments: unknown[]; userId: string; }
	| { target: SignalREventType; arguments: unknown[]; groupName: string }
	| { action: 'add' | 'remove'; userId: string; groupName: string };
//#endregion SignalR

//#region Shared types
export class InnerFunctionNotifier {
	/** The HTTP status code for an error response when no FunctionError is thrown. Default is 500. */
	errorCode = 500;
	/** The error message for an error response when no FunctionError is thrown. Default is the caught exception message. */
	errorMessage?: string;

	/** SignalR messages to broadcast after a successful response. */
	private signalR: SignalRMessage[] = [];

	//#region SignalR methods
	addToGroup(userId: string, groupName: string) {
		this.signalR.push({ action: 'add', userId, groupName: `room-${groupName}`});
	}
	removeFromGroup(userId: string, groupName: string) {
		this.signalR.push({ action: 'remove', userId, groupName: `room-${groupName}`});
	}
	roomUpsert(room: RoomData) {
		this.signalR.push({ target: 'roomUpsert', arguments: [room] });
	}
	roomDeleted(roomId: string) {
		this.signalR.push({ target: 'roomDeleted', arguments: [roomId] });
	}
	gameStateUpdated(roomId: string, state: unknown) {
		this.signalR.push({ target: 'gameStateUpdated', arguments: [roomId, state], groupName: `room-${roomId}` });
	}
	//#endregion SignalR methods

	prepareContext(context: InvocationContext) {
		if (this.signalR.length) context.extraOutputs.set(signalROutput, this.signalR);
	}
};
//#endregion Shared types

//#region Non authorized
export type InnerPublicFunction<TReq, TRes> = (body: TReq, notifier: InnerFunctionNotifier) => Promise<TRes>;

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
//#endregion Non authorized

//#region Authorized
export type InnerFunction<TReq extends BaseRequest, TRes> = (body: TReq, notifier: InnerFunctionNotifier, player: GamePlayer) => Promise<TRes>;

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
//#endregion Authorized

//#region Time
export type InnerTimeFunction = (timer: Timer, context: InvocationContext) => Promise<void>;

export function registerTimeFunction(
	name: string,
	cron: string,
	runOnStartup: boolean,
	innerTimeFunction: InnerTimeFunction,
) {
	app.timer(name, {
		schedule: cron,
		runOnStartup: runOnStartup,
		useMonitor: !runOnStartup,
		extraOutputs: [signalROutput],
		handler: async (timer: Timer, context: InvocationContext): Promise<void> => {
			const notifier = new InnerFunctionNotifier();
			try {
				await innerTimeFunction(timer, context);
				notifier.prepareContext(context);
			} catch (err) {
				console.error(err);
			}
		},
	});
}
//#endregion Time

//#region PlayFab
export async function authenticateSession(request: BaseRequest, notifier: InnerFunctionNotifier): Promise<GamePlayer> {
	const { errorCode, errorMessage } = notifier;
	notifier.errorCode = 401;
	notifier.errorMessage = 'Session expired';
	const result = await pfPromise<PlayFabServerModels.AuthenticateSessionTicketResult>(
		cb => PlayFabServer.AuthenticateSessionTicket({ SessionTicket: request.sessionTicket }, cb),
	);
	notifier.errorCode = errorCode;
	notifier.errorMessage = errorMessage;
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
