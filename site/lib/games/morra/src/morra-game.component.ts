import { Component, computed, DestroyRef, inject, Input, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';

import { MorraGameState } from '@gandogames/common/morra';
import { AuthService } from '@gandogames/services/auth.service';
import { BackendService } from '@gandogames/services/backend.service';
import { SignalRService } from '@gandogames/services/signalr.service';
import { HAND_LABEL, HANDS, INITIAL_LIVES } from './morra.models';
import type { Hand } from './morra.models';

@Component({
	selector: 'gg-morra-game',
	standalone: true,
	imports: [],
	templateUrl: './morra-game.component.html',
	styleUrl: './morra-game.component.scss',
})
export class MorraGameComponent implements OnInit {
	@Input() roomId!: string;

	private readonly signalR = inject(SignalRService);
	private readonly backend = inject(BackendService);
	private readonly auth = inject(AuthService);
	private readonly router = inject(Router);
	private readonly destroyRef = inject(DestroyRef);

	protected readonly gameState = signal<MorraGameState | null>(null);
	protected readonly loading = signal(false);
	protected readonly error = signal<string | null>(null);

	protected readonly HANDS = HANDS;
	protected readonly HAND_LABEL = HAND_LABEL;
	protected readonly livesRange = Array.from({ length: INITIAL_LIVES }, (_, i) => i);

	protected readonly myPlayFabId = computed(() => this.auth.user()?.player.id ?? null);

	protected readonly myPlayer = computed(() => {
		const gs = this.gameState();
		const me = this.myPlayFabId();
		if (!gs || !me) return null;
		return gs.players.find(p => p.id === me) ?? null;
	});

	protected readonly hasAlreadyPicked = computed(() => this.myPlayer()?.hasPicked ?? false);

	protected readonly pickProgress = computed(() => {
		const gs = this.gameState();
		if (!gs) return null;
		const alive = gs.players.filter(p => p.lives > 0).length;
		const picked = gs.players.filter(p => p.hasPicked && p.lives > 0).length;
		return { picked, alive };
	});

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
				if (roomId === this.roomId) {
					this.gameState.set(state as MorraGameState);
				}
			});
	}

	private async loadState(): Promise<void> {
		try {
			const state = await this.backend.post<MorraGameState>('/game/state', {
				sessionTicket: this.sessionTicket,
				game: 'morra',
				roomId: this.roomId,
			});
			this.gameState.set(state);
		} catch {
			// state arrives via SignalR when the next action occurs
		}
	}

	protected isLoser(playFabId: string): boolean {
		return this.gameState()?.result?.losers.includes(playFabId) ?? false;
	}

	protected async pick(hand: Hand): Promise<void> {
		this.loading.set(true);
		this.error.set(null);
		try {
			await this.backend.post('/game/action', {
				sessionTicket: this.sessionTicket,
				game: 'morra',
				roomId: this.roomId,
				action: 'pick',
				data: { hand },
			});
		} catch (err) {
			this.error.set((err as Error).message);
		} finally {
			this.loading.set(false);
		}
	}

	protected async nextRound(): Promise<void> {
		this.loading.set(true);
		this.error.set(null);
		try {
			await this.backend.post('/game/action', {
				sessionTicket: this.sessionTicket,
				game: 'morra',
				roomId: this.roomId,
				action: 'next-round',
				data: null,
			});
		} catch (err) {
			this.error.set((err as Error).message);
		} finally {
			this.loading.set(false);
		}
	}

	protected backToLobby(): void {
		this.router.navigate(['/play']);
	}
}
