import { computed, inject, Injectable, signal } from '@angular/core';

import { Hand, MorraGameState, MorraPlayer, MorraRoomState } from '@gandogames/common/morra';
import { RoomSummary } from '@gandogames/common/api';
import { AuthService } from '../../../../../src/app/services/auth.service';
import { BackendService } from '../../../../../src/app/services/backend.service';

export type { MorraPlayer, MorraGameState, MorraRoomState, RoomSummary };

@Injectable({ providedIn: 'root' })
export class MorraRoomService {
	private readonly backend = inject(BackendService);
	private readonly auth = inject(AuthService);

	private readonly _roomId = signal<string | null>(null);
	private readonly _state = signal<MorraRoomState | null>(null);

	readonly roomId = this._roomId.asReadonly();
	readonly state = this._state.asReadonly();

	readonly myPlayFabId = computed(() => this.auth.user()?.id ?? null);
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

	async fetchRooms(): Promise<RoomSummary[]> {
		return this.backend.get<RoomSummary[]>('/rooms?gameId=morra');
	}

	async createRoom(playerName: string): Promise<string> {
		const result = await this.backend.post<{ roomId: string }>('/rooms', {
			sessionTicket: this.sessionTicket,
			playerName,
			gameId: 'morra',
		});
		this._roomId.set(result.roomId);
		await this.refresh();
		return result.roomId;
	}

	async joinRoom(roomCode: string, playerName: string): Promise<string> {
		const result = await this.backend.post<{ roomId: string }>('/rooms/join', {
			sessionTicket: this.sessionTicket,
			roomCode,
			playerName,
		});
		this._roomId.set(result.roomId);
		await this.refresh();
		return result.roomId;
	}

	async loadRoom(roomId: string): Promise<void> {
		this._roomId.set(roomId);
		await this.refresh();
	}

	async startRoom(): Promise<void> {
		await this.backend.post(`/rooms/${this._roomId()}/start`, {
			sessionTicket: this.sessionTicket,
		});
		await this.refresh();
	}

	async pick(hand: Hand): Promise<void> {
		await this.backend.post(`/rooms/${this._roomId()}/action`, {
			sessionTicket: this.sessionTicket,
			type: 'pick',
			hand,
		});
		await this.refresh();
	}

	async nextRound(): Promise<void> {
		await this.backend.post(`/rooms/${this._roomId()}/action`, {
			sessionTicket: this.sessionTicket,
			type: 'next-round',
		});
		await this.refresh();
	}

	// ── Polling ──────────────────────────────────────────────────────────────────

	async refresh(): Promise<void> {
		const roomId = this._roomId();
		if (!roomId || this.refreshing) return;
		this.refreshing = true;
		try {
			const state = await this.backend.get<MorraRoomState>(`/rooms/${roomId}`);
			this._state.set(state);
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
