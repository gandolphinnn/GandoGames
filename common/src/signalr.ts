import type { GameState } from './game';
import type { ChatMessage, RoomData } from './room';

export interface NegotiateResponse {
	url: string;
	accessToken: string;
}

export type SignalREventType = 'roomUpsert' | 'roomDeleted' | 'gameStateUpdated' | 'chatMessage' | 'roomInvite';

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