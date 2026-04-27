import { computed, inject, Injectable, signal } from '@angular/core';

import { Hand, MorraGameState, MorraPlayer, MorraRoomState } from '@gandogames/common/morra';
import { RoomData } from '@gandogames/common/api';
import { AuthService } from '../../../../../src/app/services/auth.service';
import { BackendService } from '../../../../../src/app/services/backend.service';

export type { MorraPlayer, MorraGameState, MorraRoomState, RoomData };

@Injectable({ providedIn: 'root' })
export class MorraRoomService {
	private readonly backend = inject(BackendService);
	private readonly auth = inject(AuthService);

	private readonly _roomId = signal<string | null>(null);
	private readonly _state = signal<MorraRoomState | null>(null);

	readonly roomId = this._roomId.asReadonly();
	readonly state = this._state.asReadonly();

	readonly myPlayFabId = computed(() => this.auth.user()?.player.id ?? null);
	readonly isHost = computed(() => this._state()?.hostId === this.myPlayFabId());

	readonly myPlayer = computed(() => {
		const s = this._state();
		const me = this.myPlayFabId();
		if (!s?.gameState || !me) return null;
		return s.gameState.players.find(p => p.id === me) ?? null;
	});

	readonly hasAlreadyPicked = computed(() => this.myPlayer()?.hasPicked ?? false);

	private get sessionTicket(): string {
		const user = this.auth.user();
		if (!user) throw new Error('Not logged in');
		return user.sessionTicket;
	}

	private pollHandle: ReturnType<typeof setInterval> | null = null;
	private refreshing = false;

	// ── API actions ──────────────────────────────────────────────────────────────

	async fetchRooms(): Promise<RoomData[]> {
		const rooms = await this.backend.post<RoomData[]>('/rooms/list', { sessionTicket: this.sessionTicket });
		return rooms.filter(r => r.game === 'morra');
	}

	async createRoom(roomName: string): Promise<string> {
		const result = await this.backend.post<RoomData>('/rooms', {
			sessionTicket: this.sessionTicket,
			game: 'morra',
			name: roomName,
		});
		this._roomId.set(result.id);
		this._state.set(result as MorraRoomState);
		return result.id;
	}

	async joinRoom(roomId: string): Promise<string> {
		const result = await this.backend.post<RoomData>('/rooms/join', {
			sessionTicket: this.sessionTicket,
			roomId,
		});
		this._roomId.set(result.id);
		this._state.set(result as MorraRoomState);
		return result.id;
	}

	async loadRoom(roomId: string): Promise<void> {
		this._roomId.set(roomId);
		await this.refresh();
	}

	async startRoom(): Promise<void> {
		await this.backend.post('/rooms/start', {
			sessionTicket: this.sessionTicket,
			roomId: this._roomId(),
		});
		await this.refresh();
	}

	async pick(hand: Hand): Promise<void> {
		await this.backend.post('/game/action', {
			sessionTicket: this.sessionTicket,
			game: 'morra',
			roomId: this._roomId(),
			action: 'pick',
			data: { hand },
		});
		await this.refresh();
	}

	async nextRound(): Promise<void> {
		await this.backend.post('/game/action', {
			sessionTicket: this.sessionTicket,
			game: 'morra',
			roomId: this._roomId(),
			action: 'next-round',
			data: null,
		});
		await this.refresh();
	}

	// ── Polling ──────────────────────────────────────────────────────────────────

	async refresh(): Promise<void> {
		const roomId = this._roomId();
		if (!roomId || this.refreshing) return;
		this.refreshing = true;
		try {
			const rooms = await this.backend.post<RoomData[]>('/rooms/list', { sessionTicket: this.sessionTicket });
			const room = rooms.find(r => r.id === roomId);
			if (!room) return;
			let gameState: MorraGameState | undefined;
			if (room.phase === 'playing' || room.phase === 'ended') {
				const state = await this.backend.post<MorraGameState | null>('/game/state', {
					sessionTicket: this.sessionTicket,
					game: 'morra',
					roomId,
				});
				gameState = state ?? undefined;
			}
			this._state.set({ ...room, gameState } as MorraRoomState);
		} catch {
			// silently ignore poll errors to keep the interval alive
		} finally {
			this.refreshing = false;
		}
	}

	startPolling(): void {
		this.stopPolling();
		this.pollHandle = setInterval(() => { void this.refresh(); }, 2000);
	}

	stopPolling(): void {
		if (this.pollHandle !== null) {
			clearInterval(this.pollHandle);
			this.pollHandle = null;
		}
	}

	reset(): void {
		this.stopPolling();
		this._roomId.set(null);
		this._state.set(null);
	}
}
