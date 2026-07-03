import { Component, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { IonButton, IonInput } from '@ionic/angular/standalone';
import { type Card, RANKS, SHORT_DECK_RANKS, cardKey, createDeck } from '@gandogames/shared/common/cards';
import { type PokerGameState, type PokerPlayer, MIN_RAISE, describeHand, estimateWinOdds, evaluateHand } from '@gandogames/shared/poker';
import { GameComponent } from '@gandogames/lib/game-registry';
import { buildTableSeats, GameTableComponent, GameTableSeatDef, TableSeat } from '@gandogames/lib/common/game-table';
import { ChipCountComponent } from '@gandogames/lib/common/chips';
import { FrenchCardComponent } from '@gandogames/lib/common/french-card';
import { PlayerAvatarComponent } from '@gandogames/lib/common/player-avatar';
import { ToastService } from '@gandogames/services/toast.service';
import { POKER_TABLE_PRESET } from './poker.table';

@Component({
	selector: 'gg-poker-game',
	standalone: true,
	imports: [ChipCountComponent, FrenchCardComponent, GameTableComponent, GameTableSeatDef, PlayerAvatarComponent, IonButton, IonInput],
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

	private readonly toast = inject(ToastService);

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

	/** True during the betting streets — when opponents are holding hidden hole cards. */
	protected readonly isBettingPhase = computed(() => {
		const phase = this.gameState()?.gamePhase;
		return phase === 'pre-flop' || phase === 'flop' || phase === 'turn' || phase === 'river';
	});

	/** Seat ring: players in playing order, me rotated to bottom-centre, padded to the table's seat count. */
	protected readonly seats = computed<TableSeat[]>(() => {
		const gs = this.gameState();
		if (!gs) return [];
		const maxSeats = POKER_TABLE_PRESET.seats ?? gs.players.length;
		const currentId = gs.players[gs.currentPlayerIndex]?.id;
		const dealerId = gs.players[gs.dealerIndex]?.id;
		const active = gs.gamePhase !== 'game-over';
		return buildTableSeats(gs.players, this.myPlayFabId(), maxSeats, p => ({
			isCurrentTurn: active && p.id === currentId,
			isDealer: p.id === dealerId,
			faded: p.folded,
		}));
	});

	/** Narrow a seat's player back to the poker shape (`buildTableSeats` preserves the object). */
	protected seatPlayer(seat: TableSeat): PokerPlayer | null {
		return seat.player as PokerPlayer | null;
	}

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
		return gs ? gs.currentBet + gs.settings.minBet : MIN_RAISE;
	});

	/** Five community slots: the dealt card, or null while still face down. */
	protected readonly communitySlots = computed((): (Card | null)[] => {
		const dealt = this.gameState()?.communityCards ?? [];
		return Array.from({ length: 5 }, (_, i) => dealt[i] ?? null);
	});

	protected readonly showdownPlayers = computed(() => {
		const gs = this.gameState();
		if (!gs || gs.gamePhase !== 'showdown') return [];
		return gs.players.filter(p => !p.folded);
	});

	/** An uncontested win: everyone else folded, so the lone winner takes the pot without showing. */
	protected readonly wonByFold = computed(() => {
		const gs = this.gameState();
		return gs?.gamePhase === 'showdown' && this.showdownPlayers().length === 1;
	});

	/** True on the flop/turn/river — community cards are out, so we can show live insights. */
	private readonly boardRevealed = computed(() => {
		const phase = this.gameState()?.gamePhase;
		const community = this.gameState()?.communityCards ?? [];
		return (phase === 'flop' || phase === 'turn' || phase === 'river') && community.length >= 3;
	});

	/** Live insights (current hand + win %) are gated by the host's "Show win %" setting. */
	protected readonly showInsights = computed(() => this.gameState()?.settings.showWinOdds ?? false);

	/** The player's best current hand once the flop is out, e.g. "Two Pair: K & Q". */
	protected readonly myCombo = computed(() => {
		const gs = this.gameState();
		const me = this.myPlayer();
		if (!gs || !me || me.folded || me.cards.length < 2 || !this.boardRevealed() || !this.showInsights()) return null;
		return describeHand(evaluateHand([...me.cards, ...gs.communityCards]));
	});

	/** Inputs the win-odds estimate depends on; null when odds shouldn't be shown. */
	private readonly oddsInputs = computed(() => {
		const gs = this.gameState();
		const me = this.myPlayer();
		if (!gs || !me || me.folded || me.cards.length < 2 || !this.boardRevealed() || !this.showInsights()) return null;
		const opponents = gs.players.filter(p => !p.folded && p.id !== me.id).length;
		if (opponents < 1) return null;
		return { hole: me.cards, community: gs.communityCards, opponents, smallerDeck: gs.settings.smallerDeck };
	});

	/** Stable key over the odds inputs, so the estimate only re-runs when the board/opponents change. */
	private readonly oddsSignature = computed(() => {
		const inp = this.oddsInputs();
		if (!inp) return null;
		return `${inp.community.map(cardKey).join()}#${inp.hole.map(cardKey).join()}#${inp.opponents}`;
	});

	/** Estimated win equity (0–1); null while (re)calculating or not applicable. */
	private readonly winOdds = signal<number | null>(null);

	/** Win equity as a whole-number percentage, or null while calculating. */
	protected readonly winPercent = computed(() => {
		const odds = this.winOdds();
		return odds === null ? null : Math.round(odds * 100);
	});

	constructor() {
		// The estimate is a few thousand Monte-Carlo trials. Recompute only when the board/hole/opponent
		// count changes (not on every state push), and defer off the reveal's critical path so the UI
		// never janks — winPercent() reads null in the meantime and the template shows a placeholder.
		effect(onCleanup => {
			if (this.oddsSignature() === null) { this.winOdds.set(null); return; }
			const inp = untracked(() => this.oddsInputs())!;
			this.winOdds.set(null);
			const iterations = inp.opponents <= 3 ? 2500 : 1200;
			const deck = createDeck(inp.smallerDeck ? SHORT_DECK_RANKS : RANKS);
			const handle = setTimeout(() => {
				this.winOdds.set(estimateWinOdds(inp.hole, inp.community, inp.opponents, iterations, deck));
			});
			onCleanup(() => clearTimeout(handle));
		});
	}

	protected updateRaiseAmount(event: Event): void {
		const val = parseInt((event as CustomEvent<{ value: string | null | undefined }>).detail?.value ?? '', 10);
		if (!isNaN(val) && val > 0) this.raiseAmount.set(val);
	}

	protected fold(): void { this.gameAction.emit({ action: 'fold' }); }
	protected check(): void { this.gameAction.emit({ action: 'check' }); }
	protected call(): void { this.gameAction.emit({ action: 'call' }); }
	protected raise(amount: number): void { this.gameAction.emit({ action: 'raise', data: { amount } }); }
	protected nextHand(): void { this.gameAction.emit({ action: 'next-hand' }); }

	protected async allIn(): Promise<void> {
		const me = this.myPlayer();
		if (!me || me.chips <= 0) return;
		const confirmed = await this.toast.yesNo(`Go all in with ${me.chips} chips? This bets your entire stack.`);
		if (confirmed) this.gameAction.emit({ action: 'all-in' });
	}
}
