import { computed, inject, Injectable, signal } from '@angular/core';
import { BaseRequest, ChatSendRequest, GameActionRequest, GameBaseRequest, GameState, GameType, RoomBaseRequest, RoomCreateRequest, RoomData, RoomInviteRequest, RoomKickRequest, RoomSummary } from '@gandogames/common/api';
import { UserService } from './user.service';
import { BackendService } from './backend.service';
import { SignalRService } from './signalr.service';

@Injectable({ providedIn: 'root' })
export class RoomService {
	private readonly backend = inject(BackendService);
	private readonly auth = inject(UserService);
	private readonly signalR = inject(SignalRService);

	public readonly rooms = signal<RoomSummary[]>([]);

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
		const request: BaseRequest = { sessionTicket: this.ticket };
		const summaries = await this.backend.post<RoomSummary[]>('/rooms/list', request);
		this.rooms.set(summaries);
	}

	public createRoom(game: GameType): Promise<RoomData> {
		const request: RoomCreateRequest = { sessionTicket: this.ticket, game };
		return this.backend.post<RoomData>('/rooms/create', request);
	}

	public async getRoom(roomId: string): Promise<RoomData> {
		const request: RoomBaseRequest = { sessionTicket: this.ticket, roomId };
		const room = await this.backend.post<RoomData>('/rooms/get', request);
		this.upsertIntoCache(room);
		return room;
	}

	public sendChat(roomId: string, text: string): Promise<void> {
		const request: ChatSendRequest = { sessionTicket: this.ticket, roomId, text };
		return this.backend.post<void>('/chat/send', request);
	}

	public joinRoom(roomId: string): Promise<RoomData> {
		const request: RoomBaseRequest = { sessionTicket: this.ticket, roomId };
		return this.backend.post<RoomData>('/rooms/join', request);
	}

	public startRoom(roomId: string): Promise<RoomData> {
		const request: RoomBaseRequest = { sessionTicket: this.ticket, roomId };
		return this.backend.post<RoomData>('/rooms/start', request);
	}

	public kickPlayer(roomId: string, playerId: string): Promise<void> {
		const request: RoomKickRequest = { sessionTicket: this.ticket, roomId, playerId };
		return this.backend.post<void>('/rooms/kick', request);
	}

	public leaveRoom(roomId: string): Promise<void> {
		const request: RoomBaseRequest = { sessionTicket: this.ticket, roomId };
		return this.backend.post<void>('/rooms/leave', request);
	}

	public deleteRoom(roomId: string): Promise<void> {
		const request: RoomBaseRequest = { sessionTicket: this.ticket, roomId };
		return this.backend.post<void>('/rooms/delete', request);
	}

	public leaveRoomBeacon(roomId: string): void {
		const request: RoomBaseRequest = { sessionTicket: this.ticket, roomId };
		this.backend.postBeacon('/rooms/leave', request);
	}

	public invitePlayer(roomId: string, playerName: string): Promise<void> {
		const request: RoomInviteRequest = { sessionTicket: this.ticket, roomId, playerName };
		return this.backend.post<void>('/rooms/invite', request);
	}

	public addBot(roomId: string): Promise<RoomData> {
		const request: RoomBaseRequest = { sessionTicket: this.ticket, roomId };
		return this.backend.post<RoomData>('/rooms/add-bot', request);
	}

	public getGameState(game: GameType, roomId: string): Promise<GameState | null> {
		const request: GameBaseRequest = { sessionTicket: this.ticket, game, roomId };
		return this.backend.post<GameState | null>('/game/state', request);
	}

	public gameAction(game: GameType, roomId: string, action: string, data?: unknown): Promise<GameState | null> {
		const request: GameActionRequest = { sessionTicket: this.ticket, game, roomId, action, data: data ?? null };
		return this.backend.post<GameState | null>('/game/action', request);
	}
}
