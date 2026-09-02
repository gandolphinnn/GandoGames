import { computed, inject, Service, signal } from '@angular/core';
import { API, ChatSendRequest, GameActionRequest, GameSettings, GameSettingsSetRequest, GameState, GameStateRequest, GameType, RoomAccessPolicy, RoomAccessSetRequest, RoomCreateRequest, RoomData, RoomInviteRequest, RoomSummary } from '@gandogames/shared/dto';
import { BackendService } from './backend.service';
import { SignalRService } from './signalr.service';
import { UserService } from './user.service';

@Service()
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
		const summaries = await this.backend.call(API.rooms.list);
		this.rooms.set(summaries);
	}

	public createRoom(game: GameType): Promise<RoomData> {
		const request: RoomCreateRequest = { game };
		return this.backend.call(API.rooms.create, { body: request });
	}

	public async getRoom(roomId: string): Promise<RoomData> {
		const room = await this.backend.call(API.rooms.get, { params: { roomId } });
		this.upsertIntoCache(room);
		return room;
	}

	public sendChat(roomId: string, text: string): Promise<void> {
		const request: ChatSendRequest = { text };
		return this.backend.call(API.chat.send, { params: { roomId }, body: request });
	}

	public joinRoom(roomId: string): Promise<RoomData> {
		return this.backend.call(API.rooms.join, { params: { roomId } });
	}

	public startRoom(roomId: string): Promise<RoomData> {
		return this.backend.call(API.rooms.start, { params: { roomId } });
	}

	public resetRoom(roomId: string): Promise<RoomData> {
		return this.backend.call(API.rooms.reset, { params: { roomId } });
	}

	public setRoomAccess(roomId: string, access: RoomAccessPolicy): Promise<RoomData> {
		const request: RoomAccessSetRequest = { access };
		return this.backend.call(API.rooms.setAccess, { params: { roomId }, body: request });
	}

	public kickPlayer(roomId: string, playerId: string): Promise<RoomData> {
		return this.backend.call(API.rooms.kick, { params: { roomId, playerId } });
	}

	public leaveRoom(roomId: string): Promise<void> {
		return this.backend.call(API.rooms.leave, { params: { roomId } });
	}

	public deleteRoom(roomId: string): Promise<void> {
		return this.backend.call(API.rooms.delete, { params: { roomId } });
	}

	public invitePlayer(roomId: string, friendId: string): Promise<void> {
		const request: RoomInviteRequest = { friendId };
		return this.backend.call(API.rooms.invite, { params: { roomId }, body: request });
	}

	public addBot(roomId: string): Promise<void> {
		return this.backend.call(API.rooms.addBot, { params: { roomId } });
	}

	public getGameState(game: GameType, roomId: string): Promise<GameState | null> {
		const request: GameStateRequest = { game };
		return this.backend.call(API.game.state, { params: { roomId }, body: request });
	}

	public gameAction(game: GameType, roomId: string, action: string, data?: unknown): Promise<GameState | null> {
		const request: GameActionRequest = { game, action, data: data ?? null };
		return this.backend.call(API.game.action, { params: { roomId }, body: request });
	}

	public setGameSettings(roomId: string, settings: GameSettings): Promise<RoomData> {
		const request: GameSettingsSetRequest = { settings };
		return this.backend.call(API.game.setSettings, { params: { roomId }, body: request });
	}
}
