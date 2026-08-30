import { Component, computed, DestroyRef, effect, inject, input, output, signal, untracked } from '@angular/core';
import { IonButton, IonInput } from '@ionic/angular/standalone';
import { type Card, createDeck } from '@gandogames/shared/common/cards';
import { type PokerGameState, type PokerPlayer, MIN_RAISE, describeHand, estimateAllInEquities, evaluateHand, levelEndMs, pokerDeckRanks } from '@gandogames/shared/poker';
import { GameComponent } from '@gandogames/lib/game-registry';
import { buildTableSeats, GameTableComponent, GameTableSeatDef, TableSeat } from '@gandogames/lib/common/game-table';
import { ChipCountComponent } from '@gandogames/lib/common/chips';
import { FrenchCardComponent } from '@gandogames/lib/common/french-card';
import { PlayerAvatarComponent } from '@gandogames/lib/common/player-avatar';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ToastService } from '@gandogames/services';

/** Seconds each street lingers before the next one is revealed during an all-in run-out. */
const REVEAL_DELAY_MS = 2000;

@Component({
	selector: 'gg-poker-game',
	standalone: true,
	imports: [ChipCountComponent, FrenchCardComponent, GameTableComponent, GameTableSeatDef, PlayerAvatarComponent, IonButton, IonInput, TranslatePipe],
	templateUrl: './poker-game.component.html',
	styleUrl: './poker-game.component.scss',
})
export class PokerGameComponent implements GameComponent<PokerGameState> {
	public readonly gameState = input.required<PokerGameState | null>();
	public readonly loading = input.required<boolean>();
	public readonly error = input.required<string | null>();
	public readonly myPlayFabId = input.required<string | null>();
	public readonly gameAction = output<{ action: string; data?: unknown }>();
	public readonly playAgain = output<void>();

	private readonly toast = inject(ToastService);
	private readonly translate = inject(TranslateService);

	/** Raise amount ("raise by"); always defaults to the table minimum at the start of each of my turns. */
	protected readonly raiseAmount = signal(MIN_RAISE);

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

	/** Seat ring: only the seated players, me rotated to bottom-centre — no empty seats in-game. */
	protected readonly seats = computed<TableSeat[]>(() => {
		const gs = this.gameState();
		if (!gs) return [];
		const currentId = gs.players[gs.currentPlayerIndex]?.id;
		const dealerId = gs.players[gs.dealerIndex]?.id;
		const active = gs.gamePhase !== 'game-over';
		return buildTableSeats(gs.players, this.myPlayFabId(), gs.players.length, p => ({
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

	/** The minimum legal raise-by — one big blind (the table minimum, which grows as blinds escalate). */
	protected readonly minRaise = computed(() => this.gameState()?.bigBlind ?? MIN_RAISE);

	// ── Blinds & escalation clock ────────────────────────────────────────────────

	private readonly destroyRef = inject(DestroyRef);
	/** Ticks once a second so the blind countdown stays live between game-state updates. */
	private readonly now = signal(Date.now());

	protected readonly bigBlind = computed(() => this.gameState()?.bigBlind ?? MIN_RAISE);

	/** True when the room has more than one blind level — only then is a level + countdown worth showing. */
	protected readonly hasBlindSchedule = computed(() => (this.gameState()?.settings?.blindLevels?.length ?? 0) > 1);

	/** Milliseconds left on the current level, or null when the level is terminal (no next increase). */
	private readonly blindCountdownMs = computed<number | null>(() => {
		const gs = this.gameState();
		// Guard legacy states persisted before blind schedules existed (no blindLevels/startedAt).
		if (!gs?.settings?.blindLevels?.length || gs.blindLevel == null || !gs.startedAt) return null;
		const end = levelEndMs(gs.settings.blindLevels, gs.blindLevel);
		if (end === null) return null;
		return new Date(gs.startedAt).getTime() + end - this.now();
	});

	/** "4:32"-style time to the next level; null when terminal or the timer has already elapsed. */
	protected readonly blindCountdownLabel = computed<string | null>(() => {
		const ms = this.blindCountdownMs();
		if (ms === null || ms <= 0) return null;
		const total = Math.ceil(ms / 1000);
		const m = Math.floor(total / 60);
		const s = total % 60;
		return `${m}:${s.toString().padStart(2, '0')}`;
	});

	/** The current level's time is up; blinds go up when the next hand deals. */
	protected readonly blindsUpNextHand = computed(() => {
		const ms = this.blindCountdownMs();
		return ms !== null && ms <= 0;
	});

	// ── All-in run-out reveal ──────────────────────────────────────────────────
	// The server runs out an all-in board instantly (jumping to showdown with all five cards). We reveal
	// those cards one street at a time on the client so the board isn't dumped all at once.

	/** How many community cards are currently shown (drives the staggered all-in reveal). */
	private readonly revealCount = signal(0);

	/** Community cards visible right now — capped by the reveal animation. */
	protected readonly displayedCommunity = computed<Card[]>(() => {
		const gs = this.gameState();
		return gs ? gs.communityCards.slice(0, this.revealCount()) : [];
	});

	/** True once every dealt community card is shown (i.e. the run-out finished). */
	protected readonly revealComplete = computed(() => {
		const gs = this.gameState();
		return !gs || this.revealCount() >= gs.communityCards.length;
	});

	/** Five community slots: the shown card, or null while still face down / not yet revealed. */
	protected readonly communitySlots = computed((): (Card | null)[] => {
		const dealt = this.displayedCommunity();
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

	// ── Insights ────────────────────────────────────────────────────────────────

	/** True on the flop/turn/river — community cards are out, so we can show the "your hand" hint. */
	private readonly boardRevealed = computed(() => {
		const phase = this.gameState()?.gamePhase;
		const community = this.gameState()?.communityCards ?? [];
		return (phase === 'flop' || phase === 'turn' || phase === 'river') && community.length >= 3;
	});

	/** The player's best current hand once the flop is out, e.g. "Two Pair: K & Q" (shown during betting). */
	protected readonly myCombo = computed(() => {
		const gs = this.gameState();
		const me = this.myPlayer();
		if (!gs || !me || me.folded || me.cards.length < 2 || !this.boardRevealed()) return null;
		return describeHand(evaluateHand([...me.cards, ...gs.communityCards]));
	});
	
	protected readonly someoneAllIn = computed<boolean>(() => {
		const gs = this.gameState();
		if (!gs) return false;
		return gs.players.some(p => !p.folded && p.isAllIn);
	});

	/**
	 * Tabled contenders in an all-in showdown — the only situation win % is shown. Empty unless the hand
	 * reached showdown with 2+ still-in players, at least one all-in, and their cards revealed.
	 */
	protected readonly allInContenders = computed<PokerPlayer[]>(() => {
		const gs = this.gameState();
		if (!gs || gs.gamePhase !== 'showdown') return [];
		const contenders = gs.players.filter(p => !p.folded);
		if (contenders.length < 2 || !contenders.some(p => p.isAllIn)) return [];
		if (contenders.some(p => p.cards.length < 2)) return [];
		return contenders;
	});

	protected readonly isAllInReveal = computed(() => this.allInContenders().length > 0);

	/** Live all-in win % per player id (whole numbers), recomputed as each street reveals. */
	protected readonly equityPercent = signal<Record<string, number>>({});

	private wasMyTurn = false;

	constructor() {
		// Push the four inputs into the mounted game happens upstream; here we own the reveal + equity.

		// Progressive community reveal for all-in run-outs (one street every 2s); instant otherwise.
		effect(onCleanup => {
			const gs = this.gameState();
			if (!gs) { this.revealCount.set(0); return; }
			const target = gs.communityCards.length;
			const shown = untracked(() => this.revealCount());
			// Only an all-in showdown with cards still to reveal animates; everything else shows at once
			// (a betting street, a normal river showdown, a fold win, or a new hand resetting the board).
			const animate = gs.gamePhase === 'showdown' && this.allInContenders().length > 0 && target > shown;
			if (!animate) {
				this.revealCount.set(target);
				return;
			}
			// Reveal each remaining street 2s apart.
			const steps = [3, 4, 5].filter(b => b > shown && b <= target);
			let i = 0;
			let handle: ReturnType<typeof setTimeout>;
			const tick = (): void => {
				this.revealCount.set(steps[i]!);
				if (++i < steps.length) handle = setTimeout(tick, REVEAL_DELAY_MS);
			};
			handle = setTimeout(tick, REVEAL_DELAY_MS);
			onCleanup(() => clearTimeout(handle));
		});

		// Per-seat all-in equity for the currently-shown board. A few thousand Monte-Carlo trials, deferred
		// off the reveal's critical path so the UI never janks (exact once the board is complete).
		effect(onCleanup => {
			const contenders = this.allInContenders();
			const board = this.displayedCommunity();
			if (!contenders.length) { this.equityPercent.set({}); return; }
			const smallerDeck = untracked(() => this.gameState()?.settings.smallerDeck) ?? false;
			// The hand was dealt from a deck sized to the players at the table for this hand.
			const numPlayers = untracked(() => this.gameState()?.players.length) ?? 0;
			const hands = contenders.map(c => c.cards);
			const handle = setTimeout(() => {
				const deck = createDeck(pokerDeckRanks(numPlayers, smallerDeck));
				const eq = estimateAllInEquities(hands, board, 1500, deck);
				const map: Record<string, number> = {};
				contenders.forEach((c, i) => map[c.id] = Math.round((eq[i] ?? 0) * 100));
				this.equityPercent.set(map);
			});
			onCleanup(() => clearTimeout(handle));
		});

		// The raise input resets to the table minimum whenever it becomes my turn (never leaves a stale 200).
		effect(() => {
			const myTurn = this.isMyTurn();
			if (myTurn && !this.wasMyTurn) {
				this.raiseAmount.set(untracked(() => this.gameState()?.bigBlind) ?? MIN_RAISE);
			}
			this.wasMyTurn = myTurn;
		});

		// Tick the blind countdown every second; the game state only refreshes on actions, so the clock
		// must advance on its own between hands.
		const clock = setInterval(() => this.now.set(Date.now()), 1000);
		this.destroyRef.onDestroy(() => clearInterval(clock));
	}

	protected updateRaiseAmount(event: Event): void {
		const val = parseInt((event as CustomEvent<{ value: string | null | undefined }>).detail?.value ?? '', 10);
		if (!isNaN(val) && val > 0) this.raiseAmount.set(val);
	}

	protected fold(): void { this.gameAction.emit({ action: 'fold' }); }
	protected check(): void { this.gameAction.emit({ action: 'check' }); }
	protected call(): void { this.gameAction.emit({ action: 'call' }); }
	protected raise(amount: number): void {
		const me = this.myPlayer();
		if (!me || me.chips <= 0 || amount < this.minRaise()) return;
		if (amount < me.chips) return this.gameAction.emit({ action: 'raise', data: { amount } });
		// If the raise amount is equal to or greater than my chips, treat it as an all-in.
		this.allIn();
	}
	protected nextHand(): void { this.gameAction.emit({ action: 'next-hand' }); }

	protected async allIn(): Promise<void> {
		const me = this.myPlayer();
		if (!me || me.chips <= 0) return;
		const confirmed = await this.toast.yesNo(this.translate.instant('POKER.ALL_IN_CONFIRM', { amount: me.chips }) as string);
		if (confirmed) this.gameAction.emit({ action: 'all-in' });
	}
}
