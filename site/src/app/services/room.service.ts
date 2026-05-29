import { computed, inject, Injectable, signal } from '@angular/core';
import { GameState, GameType, RoomData } from '@gandogames/common/api';
import { UserService } from './user.service';
import { BackendService } from './backend.service';
import { SignalRService } from './signalr.service';

@Injectable({ providedIn: 'root' })
export class RoomService {
	private readonly backend = inject(BackendService);
	private readonly auth = inject(UserService);
	private readonly signalR = inject(SignalRService);

	public readonly rooms = signal<RoomData[]>([]);

	public readonly myRooms = computed(() => {
		const userId = this.auth.user()?.player.id;
		if (!userId) return [];
		return this.rooms().filter(r => r.phase !== 'ended' && r.players.some(p => p.id === userId));
	});

	private get ticket(): string {
		return this.auth.user()!.sessionTicket;
	}

	private upsertIntoCache(room: RoomData): void {
		this.rooms.update(rooms => {
			const idx = rooms.findIndex(r => r.id === room.id);
			if (idx >= 0) {
				const updated = [...rooms];
				updated[idx] = room;
				return updated;
			}
			return [...rooms, room];
		});
	}

	constructor() {
		this.signalR.events.roomUpsert.subscribe(room => this.upsertIntoCache(room));
		this.signalR.events.roomDeleted.subscribe((roomId) => {
			this.rooms.update((rooms) => rooms.filter((r) => r.id !== roomId));
		});
	}

	public async loadRooms(): Promise<void> {
		const rooms = await this.backend.post<RoomData[]>('/rooms/list', { sessionTicket: this.ticket });
		return this.rooms.set(rooms);
	}

	public createRoom(game: GameType): Promise<RoomData> {
		return this.backend.post<RoomData>('/rooms/create', { sessionTicket: this.ticket, game });
	}

	public async getRoom(roomId: string): Promise<RoomData> {
		const room = await this.backend.post<RoomData>('/rooms/get', { sessionTicket: this.ticket, roomId });
		this.upsertIntoCache(room);
		return room;
	}

	public sendChat(roomId: string, text: string): Promise<void> {
		return this.backend.post('/chat/send', { sessionTicket: this.ticket, roomId, text });
	}

	public joinRoom(roomId: string): Promise<RoomData> {
		return this.backend.post<RoomData>('/rooms/join', { sessionTicket: this.ticket, roomId });
	}

	public startRoom(roomId: string): Promise<RoomData> {
		return this.backend.post<RoomData>('/rooms/start', { sessionTicket: this.ticket, roomId });
	}

	public kickPlayer(roomId: string, playerId: string): Promise<void> {
		return this.backend.post('/rooms/kick', { sessionTicket: this.ticket, roomId, playerId });
	}

	public leaveRoom(roomId: string): Promise<void> {
		return this.backend.post('/rooms/leave', { sessionTicket: this.ticket, roomId });
	}

	public leaveRoomBeacon(roomId: string): void {
		this.backend.postBeacon('/rooms/leave', { sessionTicket: this.ticket, roomId });
	}

	public invitePlayer(roomId: string, playerName: string): Promise<void> {
		return this.backend.post('/rooms/invite', { sessionTicket: this.ticket, roomId, playerName });
	}

	public addBot(roomId: string): Promise<RoomData> {
		return this.backend.post<RoomData>('/rooms/add-bot', { sessionTicket: this.ticket, roomId });
	}

	public getGameState(game: GameType, roomId: string): Promise<GameState | null> {
		return this.backend.post<GameState | null>('/game/state', { sessionTicket: this.ticket, game, roomId });
	}

	public gameAction(game: GameType, roomId: string, action: string, data?: unknown): Promise<GameState | null> {
		return this.backend.post<GameState | null>('/game/action', { sessionTicket: this.ticket, game, roomId, action, data });
	}
}
