import { computed, inject, Injectable, signal } from '@angular/core';
import { BaseRequest, ChatSendRequest, GameActionRequest, GameBaseRequest, GameSettings, GameSettingsSetRequest, GameState, GameType, RoomAccessPolicy, RoomAccessSetRequest, RoomBaseRequest, RoomCreateRequest, RoomData, RoomInviteRequest, RoomKickRequest, RoomSummary } from '@gandogames/shared/dto';
import { BackendService } from './backend.service';
import { SignalRService } from './signalr.service';
import { UserService } from './user.service';

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

	/** Rooms to show in the browse list (/play): everything except rooms the player is already in
	 *  (those are surfaced separately in the menu's "Active Rooms" via myRooms) and unlisted rooms
	 *  (link/closed), which are reachable only by code or invite. The cache can receive an unlisted
	 *  room via the global roomUpsert broadcast, so we filter here too, not just on the server list. */
	public readonly browsableRooms = computed(() => {
		const userId = this.auth.user()?.player.id;
		return this.rooms().filter(r => {
			const access = r.access ?? 'public';
			const notInRoom = !userId || !r.players.some(p => p.id === userId);
			return notInRoom && (access === 'public' || access === 'friends');
		});
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

	public resetRoom(roomId: string): Promise<void> {
		const request: RoomBaseRequest = { sessionTicket: this.ticket, roomId };
		return this.backend.post<void>('/rooms/reset', request);
	}

	public setRoomAccess(roomId: string, access: RoomAccessPolicy): Promise<RoomData> {
		const request: RoomAccessSetRequest = { sessionTicket: this.ticket, roomId, access };
		return this.backend.post<RoomData>('/rooms/access', request);
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

	public invitePlayer(roomId: string, friendId: string): Promise<void> {
		const request: RoomInviteRequest = { sessionTicket: this.ticket, roomId, friendId };
		return this.backend.post<void>('/rooms/invite', request);
	}

	public getGameState(game: GameType, roomId: string): Promise<GameState | null> {
		const request: GameBaseRequest = { sessionTicket: this.ticket, game, roomId };
		return this.backend.post<GameState | null>('/game/state', request);
	}

	public gameAction(game: GameType, roomId: string, action: string, data?: unknown): Promise<GameState | null> {
		const request: GameActionRequest = { sessionTicket: this.ticket, game, roomId, action, data: data ?? null };
		return this.backend.post<GameState | null>('/game/action', request);
	}

	public setGameSettings(game: GameType, roomId: string, settings: GameSettings): Promise<RoomData> {
		const request: GameSettingsSetRequest = { sessionTicket: this.ticket, game, roomId, settings };
		return this.backend.post<RoomData>('/game/settings/set', request);
	}
}
