import { inject, Injectable, signal } from '@angular/core';
import { GameState, GameType, RoomData } from '@gandogames/common/api';
import { AuthService } from './auth.service';
import { BackendService } from './backend.service';

@Injectable({ providedIn: 'root' })
export class RoomService {
	private readonly backend = inject(BackendService);
	private readonly auth = inject(AuthService);

	public rooms = signal<RoomData[]>(this.loadRooms());

	private get ticket(): string {
		return this.auth.user()!.sessionTicket;
	}

	private pollTimer?: ReturnType<typeof setInterval>;

	private loadRooms() {
		const poll = async () => {
			try {
				const rooms = await this.backend.post<RoomData[]>('/rooms/list', { sessionTicket: this.ticket });
				this.rooms.set(rooms);
			} catch (e) {
				console.error('Failed to load rooms:', e);
				this.pollTimer = undefined;
			}
		}
		if (!this.pollTimer) this.pollTimer = setInterval(poll, 5000);

		return [] as RoomData[]; // initial value, will be replaced by poll
	}

	public createRoom(game: GameType, name: string): Promise<RoomData> {
		return this.backend.post<RoomData>('/rooms/create', { sessionTicket: this.ticket, game, name });
	}

	public getRoom(roomId: string): Promise<RoomData> {
		return this.backend.post<RoomData>('/rooms/get', { sessionTicket: this.ticket, roomId });
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
