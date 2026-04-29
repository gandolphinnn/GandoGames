import { Component, computed, DestroyRef, inject, Input, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';

import { PankovGameState } from '@gandogames/common/pankov';
import { AuthService } from '@gandogames/services/auth.service';
import { BackendService } from '@gandogames/services/backend.service';
import { SignalRService } from '@gandogames/services/signalr.service';
import { formatValue, getRank, INITIAL_LIVES, ROLL_VALUES } from './pankov.models';
import type { RollValue } from './pankov.models';

@Component({
	selector: 'gg-pankov-game',
	standalone: true,
	imports: [],
	templateUrl: './pankov-game.component.html',
	styleUrl: './pankov-game.component.scss',
})
export class PankovGameComponent implements OnInit {
	@Input() roomId!: string;

	private readonly signalR = inject(SignalRService);
	private readonly backend = inject(BackendService);
	private readonly auth = inject(AuthService);
	private readonly router = inject(Router);
	private readonly destroyRef = inject(DestroyRef);

	protected readonly gameState = signal<PankovGameState | null>(null);
	protected readonly loading = signal(false);
	protected readonly error = signal<string | null>(null);

	protected readonly ROLL_VALUES = ROLL_VALUES;
	protected readonly formatValue = formatValue;
	protected readonly livesRange = Array.from({ length: INITIAL_LIVES }, (_, i) => i);

	protected readonly myPlayFabId = computed(() => this.auth.user()?.player.id ?? null);

	protected readonly currentPlayer = computed(() => {
		const gs = this.gameState();
		if (!gs) return null;
		return gs.players[gs.currentPlayerIndex] ?? null;
	});

	protected readonly previousPlayer = computed(() => {
		const gs = this.gameState();
		if (!gs || gs.previousPlayerIndex === null) return null;
		return gs.players[gs.previousPlayerIndex] ?? null;
	});

	protected readonly isMyTurn = computed(() => this.currentPlayer()?.id === this.myPlayFabId());

	protected readonly validDeclarations = computed((): RollValue[] => {
		const gs = this.gameState();
		if (!gs) return [];
		const minRank = gs.previousDeclaration !== null ? getRank(gs.previousDeclaration) : 0;
		return (ROLL_VALUES as readonly RollValue[]).filter(v => getRank(v) >= minRank);
	});

	protected readonly canRoll = computed(() => this.validDeclarations().length > 0);

	private get sessionTicket(): string {
		const user = this.auth.user();
		if (!user) throw new Error('Not logged in');
		return user.sessionTicket;
	}

	ngOnInit(): void {
		void this.loadState();
		this.signalR.events.gameStateUpdated
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe(({ roomId, state }) => {
				if (roomId === this.roomId) this.gameState.set(state as PankovGameState);
			});
	}

	private async loadState(): Promise<void> {
		try {
			const state = await this.backend.post<PankovGameState>('/game/state', {
				sessionTicket: this.sessionTicket,
				game: 'pankov',
				roomId: this.roomId,
			});
			this.gameState.set(state);
		} catch {
			// state arrives via SignalR when the next action occurs
		}
	}

	private async sendAction(action: string, data?: unknown): Promise<void> {
		this.loading.set(true);
		this.error.set(null);
		try {
			await this.backend.post('/game/action', {
				sessionTicket: this.sessionTicket,
				game: 'pankov',
				roomId: this.roomId,
				action,
				data: data ?? null,
			});
		} catch (err) {
			this.error.set((err as Error).message);
		} finally {
			this.loading.set(false);
		}
	}

	protected roll(): Promise<void> { return this.sendAction('roll'); }
	protected challenge(): Promise<void> { return this.sendAction('challenge'); }
	protected declare(declaration: RollValue): Promise<void> { return this.sendAction('declare', { declaration }); }
	protected continueGame(): Promise<void> { return this.sendAction('continue'); }

	protected backToLobby(): void {
		this.router.navigate(['/play']);
	}
}
