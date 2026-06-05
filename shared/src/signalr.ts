import type { GameState, GameType } from './game';
import type { ChatMessage, RoomData } from './room';
import type { Friend } from './friends';

/** Response from the SignalR negotiate endpoint: the hub URL + access token the client connects with. */
export interface NegotiateResponse {
	url: string;
	accessToken: string;
}

/**
 * The contract for every server→client SignalR event. Each event name maps to the exact
 * positional argument tuple that the API broadcasts (via `InnerFunctionNotifier`) and the
 * client receives (via `HubConnection.on`). This is the single source of truth for both sides.
 */
export interface SignalREventArgs {
	/** A room was created or changed; carries the full room. */
	roomUpsert: [room: RoomData];
	/** A room was deleted, or the recipient was removed/kicked from it; carries the room id. */
	roomDeleted: [roomId: string];
	/** A game's state advanced; carries the room id and the recipient's public view of the state. */
	gameStateUpdated: [roomId: string, state: GameState];
	/** A chat message was posted to a room. */
	chatMessage: [roomId: string, message: ChatMessage];
	/** The recipient was invited to a room; carries the room id and the game being played. */
	roomInvite: [roomId: string, game: GameType];
	/** Another (registered) player sent the recipient a friend request. */
	friendRequest: [from: Friend];
	/** The recipient's friend graph changed (accepted/declined/cancelled/removed) and should be reloaded. */
	friendsChanged: [];
}

/** Names of all server→client SignalR events. */
export type SignalREventType = keyof SignalREventArgs;

/** The argument tuple broadcast for a given event. */
export type SignalREventPayload<T extends SignalREventType = SignalREventType> = SignalREventArgs[T];

/** The client handler signature for a given event (matches `HubConnection.on(name, handler)`). */
export type SignalREventHandler<T extends SignalREventType = SignalREventType> = (...args: SignalREventArgs[T]) => void;

/** Map of every event name to its client handler signature. */
export type SignalREventHandlers = { [T in SignalREventType]: SignalREventHandler<T> };

//#region Object (discriminated-union) form
/** Base of the object representation of an event, discriminated by `type`. */
export interface SignalREvent {
	type: SignalREventType;
}

export interface RoomUpsertEvent extends SignalREvent {
	type: 'roomUpsert';
	room: RoomData;
}

export interface RoomDeletedEvent extends SignalREvent {
	type: 'roomDeleted';
	roomId: string;
}

export interface GameStateUpdatedEvent extends SignalREvent {
	type: 'gameStateUpdated';
	roomId: string;
	state: GameState;
}

export interface ChatMessageEvent extends SignalREvent {
	type: 'chatMessage';
	roomId: string;
	message: ChatMessage;
}

/** Sent to a recipient when another (registered) player invites them to a room. */
export interface RoomInviteEvent extends SignalREvent {
	type: 'roomInvite';
	roomId: string;
	game: GameType;
}

/** Sent to a recipient when another (registered) player sends them a friend request. */
export interface FriendRequestEvent extends SignalREvent {
	type: 'friendRequest';
	from: Friend;
}

/** Sent to a user whose friend graph changed (accepted/declined/cancelled/removed) so they reload. */
export interface FriendsChangedEvent extends SignalREvent {
	type: 'friendsChanged';
}

/** Discriminated union of every server→client SignalR event in object form. */
export type SignalREventMessage =
	| RoomUpsertEvent
	| RoomDeletedEvent
	| GameStateUpdatedEvent
	| ChatMessageEvent
	| RoomInviteEvent
	| FriendRequestEvent
	| FriendsChangedEvent;
//#endregion Object (discriminated-union) form
