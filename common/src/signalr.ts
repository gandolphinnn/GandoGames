import type { GameState } from './game';
import type { ChatMessage, RoomData } from './room';
import type { Friend } from './friends';

export interface NegotiateResponse {
	url: string;
	accessToken: string;
}

export type SignalREventType = 'roomUpsert' | 'roomDeleted' | 'gameStateUpdated' | 'chatMessage' | 'roomInvite' | 'friendRequest' | 'friendsChanged';

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

/** Sent to a recipient when another (registered) player sends them a friend request. */
export interface FriendRequestEvent extends SignalREvent {
	type: 'friendRequest';
	from: Friend;
}

/** Sent to a user whose friend graph changed (accepted/declined/cancelled/removed) so they reload. */
export interface FriendsChangedEvent extends SignalREvent {
	type: 'friendsChanged';
}