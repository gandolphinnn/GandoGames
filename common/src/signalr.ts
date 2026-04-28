import type { GameState } from './game';
import type { RoomData } from './room';

export interface NegotiateResponse {
	url: string;
	accessToken: string;
}

export type SignalREventType = 'roomUpsert' | 'roomDeleted' | 'gameStateUpdated';

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