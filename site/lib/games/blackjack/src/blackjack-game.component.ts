import { Component, computed, input, output, signal } from '@angular/core';
import type { BlackjackGameState, BlackjackHand, Card } from '@gandogames/shared/blackjack';
import { IonButton, IonInput } from '@ionic/angular/standalone';
import { FrenchCardComponent } from '@gandogames/lib/common/french-card';
import { ChipCountComponent } from '@gandogames/lib/common/chips';
import { GameComponent } from '@gandogames/lib/game-registry';
import { BET_STEPS, MAX_HANDS, MIN_BET, cardValue, handLabel, handValue, outcomeLabel } from './blackjack.models';

@Component({
	selector: 'gg-blackjack-game',
	standalone: true,
	imports: [FrenchCardComponent, ChipCountComponent, IonButton, IonInput],
	templateUrl: './blackjack-game.component.html',
	styleUrl: './blackjack-game.component.scss',
})
export class BlackjackGameComponent implements GameComponent<BlackjackGameState> {
	public readonly gameState = input.required<BlackjackGameState | null>();
	public readonly loading = input.required<boolean>();
	public readonly error = input.required<string | null>();
	public readonly myPlayFabId = input.required<string | null>();
	public readonly gameAction = output<{ action: string; data?: unknown }>();
	public readonly back = output<void>();
	public readonly playAgain = output<void>();

	protected readonly MIN_BET = MIN_BET;
	protected readonly BET_STEPS = BET_STEPS;
	protected readonly handLabel = handLabel;
	protected readonly outcomeLabel = outcomeLabel;

	protected readonly betAmount = signal(MIN_BET);

	protected readonly me = computed(() => {
		const gs = this.gameState();
		const id = this.myPlayFabId();
		if (!gs || !id) return null;
		return gs.players.find(p => p.id === id) ?? null;
	});

	/** All players act at once against the dealer — I can act whenever I'm not yet done. */
	protected readonly isActing = computed(() => {
		const gs = this.gameState();
		const me = this.me();
		return gs?.gamePhase === 'player-turns' && !!me && !me.done;
	});

	protected readonly activeHand = computed((): BlackjackHand | null => {
		const me = this.me();
		if (!me || !this.isActing()) return null;
		return me.hands[me.activeHandIndex] ?? null;
	});

	protected readonly dealerTotal = computed(() => {
		const gs = this.gameState();
		if (!gs || !gs.dealer.holeRevealed) return null;
		return handValue(gs.dealer.cards).total;
	});

	protected readonly canDouble = computed(() => {
		const me = this.me();
		const h = this.activeHand();
		return !!me && !!h && h.cards.length === 2 && !h.fromSplitAces && me.chips >= h.bet;
	});

	protected readonly canSplit = computed(() => {
		const me = this.me();
		const h = this.activeHand();
		if (!me || !h || h.cards.length !== 2) return false;
		return cardValue(h.cards[0]!.rank) === cardValue(h.cards[1]!.rank)
			&& me.hands.length < MAX_HANDS && me.chips >= h.bet;
	});

	protected setBet(amount: number): void {
		const me = this.me();
		const max = me?.chips ?? amount;
		this.betAmount.set(Math.max(MIN_BET, Math.min(amount, max)));
	}

	protected updateBet(event: Event): void {
		const val = parseInt((event as CustomEvent<{ value: string | null | undefined }>).detail?.value ?? '', 10);
		if (!isNaN(val)) this.setBet(val);
	}

	protected handTotal(cards: Card[]): string { return handLabel(cards); }

	protected placeBet(): void { this.gameAction.emit({ action: 'bet', data: { amount: this.betAmount() } }); }
	protected insurance(take: boolean): void { this.gameAction.emit({ action: 'insurance', data: { take } }); }
	protected hit(): void { this.gameAction.emit({ action: 'hit' }); }
	protected stand(): void { this.gameAction.emit({ action: 'stand' }); }
	protected double(): void { this.gameAction.emit({ action: 'double' }); }
	protected split(): void { this.gameAction.emit({ action: 'split' }); }
	protected nextRound(): void { this.gameAction.emit({ action: 'next-round' }); }
}
