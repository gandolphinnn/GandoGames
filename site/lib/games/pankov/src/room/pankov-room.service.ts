import { computed, inject, Injectable, signal } from '@angular/core';

import { PankovGameState, PankovPlayer, PankovRoomState, RevealResult } from '@gandogames/common/pankov';
import { GameType, RoomData } from '@gandogames/common/api';
import { AuthService } from '../../../../../src/app/services/auth.service';
import { BackendService } from '../../../../../src/app/services/backend.service';

export type { PankovPlayer, PankovGameState, PankovRoomState, RevealResult, RoomData };

const PANKOV_GAME = 'pankov' as GameType;

@Injectable({ providedIn: 'root' })
export class PankovRoomService {
	private readonly backend = inject(BackendService);
	private readonly auth = inject(AuthService);

	private readonly _roomId = signal<string | null>(null);
	private readonly _state = signal<PankovRoomState | null>(null);

	readonly roomId = this._roomId.asReadonly();
	readonly state = this._state.asReadonly();

	readonly myPlayFabId = computed(() => this.auth.user()?.player.id ?? null);
	readonly isHost = computed(() => this._state()?.hostId === this.myPlayFabId());

	readonly isMyTurn = computed(() => {
		const state = this._state();
		const me = this.myPlayFabId();
		if (!state?.gameState || !me || state.phase !== 'playing') return false;
		return state.gameState.players[state.gameState.currentPlayerIndex]?.id === me;
	});

	readonly currentPlayer = computed(() => {
		const s = this._state();
		if (!s?.gameState) return null;
		return s.gameState.players[s.gameState.currentPlayerIndex] ?? null;
	});

	readonly previousPlayer = computed(() => {
		const s = this._state();
		if (!s?.gameState || s.gameState.previousPlayerIndex === null) return null;
		return s.gameState.players[s.gameState.previousPlayerIndex] ?? null;
	});

	readonly mustCallFalse = computed(() => this._state()?.gameState?.previousDeclaration === 21);

	private get sessionTicket(): string {
		const user = this.auth.user();
		if (!user) throw new Error('Not logged in');
		return user.sessionTicket;
	}

	private pollHandle: ReturnType<typeof setInterval> | null = null;
	private refreshing = false;

	// ── API actions ─────────────────────────────────────────────────────────────

	async fetchRooms(): Promise<RoomData[]> {
		const rooms = await this.backend.post<RoomData[]>('/rooms/list', { sessionTicket: this.sessionTicket });
		return rooms.filter(r => r.game === PANKOV_GAME);
	}

	async createRoom(roomName: string): Promise<string> {
		const result = await this.backend.post<RoomData>('/rooms', {
			sessionTicket: this.sessionTicket,
			game: PANKOV_GAME,
			name: roomName,
		});
		this._roomId.set(result.id);
		this._state.set(result as PankovRoomState);
		return result.id;
	}

	async joinRoom(roomId: string): Promise<string> {
		const result = await this.backend.post<RoomData>('/rooms/join', {
			sessionTicket: this.sessionTicket,
			roomId,
		});
		this._roomId.set(result.id);
		this._state.set(result as PankovRoomState);
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

	async declare(declaration: number, actualRoll: number): Promise<void> {
		await this.backend.post('/game/action', {
			sessionTicket: this.sessionTicket,
			game: PANKOV_GAME,
			roomId: this._roomId(),
			action: 'declare',
			data: { declaration, actualRoll },
		});
		await this.refresh();
	}

	async callFalse(): Promise<void> {
		await this.backend.post('/game/action', {
			sessionTicket: this.sessionTicket,
			game: PANKOV_GAME,
			roomId: this._roomId(),
			action: 'call-false',
			data: null,
		});
		await this.refresh();
	}

	async nextTurn(): Promise<void> {
		await this.backend.post('/game/action', {
			sessionTicket: this.sessionTicket,
			game: PANKOV_GAME,
			roomId: this._roomId(),
			action: 'next-turn',
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
			let gameState: PankovGameState | undefined;
			if (room.phase === 'playing' || room.phase === 'ended') {
				const state = await this.backend.post<PankovGameState | null>('/game/state', {
					sessionTicket: this.sessionTicket,
					game: PANKOV_GAME,
					roomId,
				});
				gameState = state ?? undefined;
			}
			this._state.set({ ...room, gameState } as PankovRoomState);
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
