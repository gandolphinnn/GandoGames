import { InvocationContext, Timer } from '@azure/functions';
import { BaseRequest, ChatMessage, Friend, GamePlayer, GameState, RoomData, SignalREventType } from '@gandogames/common/api';
import { signalROutput } from '.';

export type SignalRMessage =
	| { target: SignalREventType; arguments: unknown[]; }
	| { target: SignalREventType; arguments: unknown[]; userId: string; }
	| { target: SignalREventType; arguments: unknown[]; groupName: string }
	| { action: 'add' | 'remove'; userId: string; groupName: string };

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
	roomDeletedForPlayer(userId: string, roomId: string) {
		this.signalR.push({ target: 'roomDeleted', arguments: [roomId], userId });
	}
	gameStateUpdated(roomId: string, state: unknown) {
		this.signalR.push({ target: 'gameStateUpdated', arguments: [roomId, state], groupName: `room-${roomId}` });
	}
	gameStateUpdatedForPlayer(userId: string, roomId: string, state: GameState) {
		this.signalR.push({ target: 'gameStateUpdated', arguments: [roomId, state], userId });
	}
	chatMessage(roomId: string, message: ChatMessage) {
		this.signalR.push({ target: 'chatMessage', arguments: [roomId, message], groupName: `room-${roomId}` });
	}
	roomInviteForPlayer(userId: string, roomId: string, game: string) {
		this.signalR.push({ target: 'roomInvite', arguments: [roomId, game], userId });
	}
	friendRequest(userId: string, from: Friend) {
		this.signalR.push({ target: 'friendRequest', arguments: [from], userId });
	}
	friendsChanged(userId: string) {
		this.signalR.push({ target: 'friendsChanged', arguments: [], userId });
	}
	//#endregion SignalR methods

	prepareContext(context: InvocationContext) {
		if (this.signalR.length) context.extraOutputs.set(signalROutput, this.signalR);
	}
};

export type InnerPublicFunction<TReq, TRes> = (body: TReq, notifier: InnerFunctionNotifier) => Promise<TRes>;
export type InnerFunction<TReq extends BaseRequest, TRes> = (body: TReq, notifier: InnerFunctionNotifier, player: GamePlayer) => Promise<TRes>;
export type InnerTimeFunction = (timer: Timer, notifier: InnerFunctionNotifier) => Promise<void>;
