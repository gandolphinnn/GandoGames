import { Component, computed, input, output, signal } from '@angular/core';
import type { Card, PokerGameState } from '@gandogames/common/poker';
import { GameComponent } from '@gandogames/lib/game-registry';
import { MIN_RAISE, SUIT_SYMBOL } from './poker.models';

@Component({
	selector: 'gg-poker-game',
	standalone: true,
	imports: [],
	templateUrl: './poker-game.component.html',
	styleUrl: './poker-game.component.scss',
})
export class PokerGameComponent implements GameComponent<PokerGameState> {
	public readonly gameState = input.required<PokerGameState | null>();
	public readonly loading = input.required<boolean>();
	public readonly error = input.required<string | null>();
	public readonly myPlayFabId = input.required<string | null>();
	public readonly gameAction = output<{ action: string; data?: unknown }>();
	public readonly back = output<void>();
	public readonly playAgain = output<void>();

	protected readonly raiseAmount = signal(MIN_RAISE * 2);

	protected readonly myPlayer = computed(() => {
		const gs = this.gameState();
		const me = this.myPlayFabId();
		if (!gs || !me) return null;
		return gs.players.find(p => p.id === me) ?? null;
	});

	protected readonly isMyTurn = computed(() => {
		const gs = this.gameState();
		const me = this.myPlayFabId();
		if (!gs || !me) return false;
		return gs.players[gs.currentPlayerIndex]?.id === me;
	});

	protected readonly currentPlayer = computed(() => {
		const gs = this.gameState();
		if (!gs) return null;
		return gs.players[gs.currentPlayerIndex] ?? null;
	});

	protected readonly canCheck = computed(() => {
		const gs = this.gameState();
		const me = this.myPlayer();
		if (!gs || !me) return false;
		return me.streetBet === gs.currentBet;
	});

	protected readonly callAmount = computed(() => {
		const gs = this.gameState();
		const me = this.myPlayer();
		if (!gs || !me) return 0;
		return Math.min(gs.currentBet - me.streetBet, me.chips);
	});

	protected readonly minRaise = computed(() => {
		const gs = this.gameState();
		return gs ? gs.currentBet + MIN_RAISE : MIN_RAISE;
	});

	protected readonly communityPlaceholders = computed((): number[] => {
		const gs = this.gameState();
		const count = Math.max(0, 5 - (gs?.communityCards.length ?? 0));
		return Array.from({ length: count }, () => 0);
	});

	protected readonly showdownPlayers = computed(() => {
		const gs = this.gameState();
		if (!gs || gs.gamePhase !== 'showdown') return [];
		return gs.players.filter(p => !p.folded);
	});

	protected formatCard(card: Card): string {
		return `${card.rank}${SUIT_SYMBOL[card.suit]}`;
	}

	protected updateRaiseAmount(event: Event): void {
		const val = parseInt((event.target as HTMLInputElement).value, 10);
		if (!isNaN(val) && val > 0) this.raiseAmount.set(val);
	}

	protected fold(): void { this.gameAction.emit({ action: 'fold' }); }
	protected check(): void { this.gameAction.emit({ action: 'check' }); }
	protected call(): void { this.gameAction.emit({ action: 'call' }); }
	protected raise(amount: number): void { this.gameAction.emit({ action: 'raise', data: { amount } }); }
	protected nextHand(): void { this.gameAction.emit({ action: 'next-hand' }); }
}
