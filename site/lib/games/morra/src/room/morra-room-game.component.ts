import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { MorraGameState } from '@gandogames/common/morra';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { Hand } from '@gandogames/common/morra';
import { HAND_LABEL, HANDS, INITIAL_LIVES } from '../morra.models';
import { MorraRoomService } from './morra-room.service';

@Component({
	selector: 'gg-morra-room-game',
	standalone: true,
	imports: [RouterLink],
	templateUrl: './morra-room-game.component.html',
	styleUrl: './morra-room-game.component.scss',
})
export class MorraRoomGameComponent implements OnInit, OnDestroy {
	protected readonly room = inject(MorraRoomService);
	private readonly route = inject(ActivatedRoute);
	private readonly router = inject(Router);

	protected readonly loading = signal(false);
	protected readonly error = signal<string | null>(null);

	protected readonly HANDS = HANDS;
	protected readonly HAND_LABEL = HAND_LABEL;
	protected readonly livesRange = Array.from({ length: INITIAL_LIVES }, (_, i) => i);

	protected pickProgress = computed(() => {
		const gs = this.room.state()?.gameState;
		if (!gs) return null;
		const alive = gs.players.filter(p => p.lives > 0).length;
		const picked = gs.players.filter(p => p.hasPicked && p.lives > 0).length;
		return { picked, alive };
	});

	protected isLoser(playFabId: string): boolean {
		const result = this.room.state()?.gameState?.result;
		return result?.losers.includes(playFabId) ?? false;
	}

	ngOnInit(): void {
		const roomId = this.route.snapshot.paramMap.get('roomId')!;
		if (this.room.roomId() !== roomId) {
			void this.room.loadRoom(roomId);
		}
		this.room.startPolling();
	}

	ngOnDestroy(): void {
		this.room.stopPolling();
	}

	protected async pick(hand: Hand): Promise<void> {
		this.loading.set(true);
		this.error.set(null);
		try {
			await this.room.pick(hand);
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
			await this.room.nextRound();
		} catch (err) {
			this.error.set((err as Error).message);
		} finally {
			this.loading.set(false);
		}
	}

	protected async startGame(): Promise<void> {
		this.loading.set(true);
		this.error.set(null);
		try {
			await this.room.startRoom();
		} catch (err) {
			this.error.set((err as Error).message);
		} finally {
			this.loading.set(false);
		}
	}

	protected copyCode(): void {
		const code = this.room.roomId();
		if (code) void navigator.clipboard.writeText(code);
	}

	protected playAgain(): void {
		this.room.reset();
		this.router.navigate(['/play/morra']);
	}
}
