import { InvocationContext, Timer } from '@azure/functions';
import { AnyEndpoint, ChatMessage, EndpointParams, EndpointRequest, EndpointResponse, Friend, GamePlayer, GameState, RoomData, SignalREventType } from '@gandogames/shared/dto';
import { signalROutput } from '.';
import { Game } from './games';

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
	public addToGroup(userId: string, groupName: string) {
		this.signalR.push({ action: 'add', userId, groupName: `room-${groupName}`});
	}
	public removeFromGroup(userId: string, groupName: string) {
		this.signalR.push({ action: 'remove', userId, groupName: `room-${groupName}`});
	}
	public roomUpsert(room: RoomData) {
		this.signalR.push({ target: 'roomUpsert', arguments: [room] });
	}
	public roomDeleted(roomId: string) {
		this.signalR.push({ target: 'roomDeleted', arguments: [roomId] });
	}
	public gameStateUpdatedForAll(room: RoomData, game: Game) {
		for (const p of room.players)
			this.gameStateUpdatedForPlayer(p.id, room.id, game.getPublicState(p.id))
	}
	public gameStateUpdatedForPlayer(userId: string, roomId: string, state: GameState) {
		this.signalR.push({ target: 'gameStateUpdated', arguments: [roomId, state], userId });
	}
	public chatMessage(roomId: string, message: ChatMessage) {
		this.signalR.push({ target: 'chatMessage', arguments: [roomId, message], groupName: `room-${roomId}` });
	}
	public roomInviteForPlayer(userId: string, roomId: string, game: string) {
		this.signalR.push({ target: 'roomInvite', arguments: [roomId, game], userId });
	}
	public friendRequest(userId: string, from: Friend) {
		this.signalR.push({ target: 'friendRequest', arguments: [from], userId });
	}
	public friendsChanged(userId: string) {
		this.signalR.push({ target: 'friendsChanged', arguments: [], userId });
	}
	//#endregion SignalR methods

	public prepareContext(context: InvocationContext) {
		if (this.signalR.length) context.extraOutputs.set(signalROutput, this.signalR);
	}
};

// Handler signatures are derived from the endpoint definition (shared/dto/endpoints.ts):
// the body, path params and return type all come from the same contract the site consumes.
export type InnerPublicFunction<E extends AnyEndpoint> = (body: EndpointRequest<E>, notifier: InnerFunctionNotifier) => Promise<EndpointResponse<E>>;
export type InnerFunction<E extends AnyEndpoint> = (body: EndpointRequest<E>, params: EndpointParams<E>, notifier: InnerFunctionNotifier, player: GamePlayer) => Promise<EndpointResponse<E>>;
export type InnerTimeFunction = (timer: Timer, notifier: InnerFunctionNotifier) => Promise<void>;
