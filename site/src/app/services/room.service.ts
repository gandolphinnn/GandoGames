import { inject, Injectable } from '@angular/core';
import { GameState, GameType, RoomData } from '@gandogames/common/api';
import { AuthService } from './auth.service';
import { BackendService } from './backend.service';

@Injectable({ providedIn: 'root' })
export class RoomService {
	private readonly backend = inject(BackendService);
	private readonly auth = inject(AuthService);

	private get ticket(): string {
		return this.auth.user()!.sessionTicket;
	}

	public listRooms(): Promise<RoomData[]> {
		return this.backend.post<RoomData[]>('/rooms/list', { sessionTicket: this.ticket });
	}

	public createRoom(game: GameType, name: string): Promise<RoomData> {
		return this.backend.post<RoomData>('/rooms', { sessionTicket: this.ticket, game, name });
	}

	public joinRoom(roomId: string): Promise<RoomData> {
		return this.backend.post<RoomData>('/rooms/join', { sessionTicket: this.ticket, roomId });
	}

	public startRoom(roomId: string): Promise<RoomData> {
		return this.backend.post<RoomData>('/rooms/start', { sessionTicket: this.ticket, roomId });
	}

	public leaveRoom(roomId: string): Promise<void> {
		return this.backend.post('/rooms/leave', { sessionTicket: this.ticket, roomId });
	}

	public getGameState(game: GameType, roomId: string): Promise<GameState | null> {
		return this.backend.post<GameState | null>('/game/state', { sessionTicket: this.ticket, game, roomId });
	}

	public gameAction(game: GameType, roomId: string, action: string, data?: unknown): Promise<GameState | null> {
		return this.backend.post<GameState | null>('/game/action', { sessionTicket: this.ticket, game, roomId, action, data });
	}
}
