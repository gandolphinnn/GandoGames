import type { GamePlayer } from '@gandogames/shared/api';
import type {
	BlackjackGameState, BlackjackPlayer, BlackjackHand, HandOutcome,
} from '@gandogames/shared/blackjack';
import { MIN_BET, STARTING_CHIPS, MAX_HANDS, cardValue, handValue } from '@gandogames/shared/blackjack';
import { createDeck, shuffle } from '@gandogames/shared/cards';
import { Game } from './game';

/** Dealer hits soft 17 (H17 rule). */
const HIT_SOFT_17 = true;

function newHand(bet: number): BlackjackHand {
	return {
		cards: [],
		bet,
		doubled: false,
		stood: false,
		busted: false,
		isBlackjack: false,
		fromSplitAces: false,
	};
}

function handFinalized(h: BlackjackHand): boolean {
	return h.stood || h.busted;
}

export class BlackjackGame extends Game<BlackjackGameState> {
	public override minPlayers = 1;
	public override maxPlayers = 7;

	public override initialize(players: GamePlayer[]): void {
		this.state = {
			lastUpdate: new Date(),
			gamePhase: 'betting',
			players: players.map(p => ({
				...p,
				chips: STARTING_CHIPS,
				hands: [],
				activeHandIndex: 0,
				hasBet: false,
				insuranceBet: 0,
				insuranceResolved: false,
				done: false,
			})),
			dealer: { cards: [], holeRevealed: false },
			deck: [],
			dealerHadBlackjack: false,
			soloMode: players.length === 1,
		};
	}

	public override getPublicState(_playerId: string): BlackjackGameState {
		if (!this.state) throw new Error('Game not initialized');
		// Card values are public (face up); only the deck and the dealer hole card are hidden.
		const dealer = this.state.dealer.holeRevealed
			? this.state.dealer
			: { cards: this.state.dealer.cards.slice(0, 1), holeRevealed: false };
		return { ...this.state, deck: [], dealer };
	}

	public override action(player: GamePlayer, action: string, data: any): BlackjackGameState {
		if (!this.state) throw new Error('Game not initialized');
		switch (action) {
			case 'bet': return this.applyBet(player.id, Number(data?.amount));
			case 'insurance': return this.applyInsurance(player.id, Boolean(data?.take));
			case 'hit': return this.applyHit(player.id);
			case 'stand': return this.applyStand(player.id);
			case 'double': return this.applyDouble(player.id);
			case 'split': return this.applySplit(player.id);
			case 'next-round': return this.applyNextRound();
			default: return this.state;
		}
	}

	// ── Betting ─────────────────────────────────────────────────────────────────

	private applyBet(playerId: string, amount: number): BlackjackGameState {
		const state = this.state!;
		if (state.gamePhase !== 'betting') return state;
		const player = state.players.find(p => p.id === playerId);
		if (!player || player.hasBet) return state;
		if (!Number.isFinite(amount)) return state;
		const bet = Math.floor(amount);
		if (bet < MIN_BET || bet > player.chips) return state;

		player.chips -= bet;
		player.hands = [newHand(bet)];
		player.activeHandIndex = 0;
		player.hasBet = true;

		if (state.players.every(p => p.hasBet)) this.deal();
		state.lastUpdate = new Date();
		return state;
	}

	private deal(): void {
		const state = this.state!;
		state.deck = shuffle(createDeck());
		for (const p of state.players) {
			const h = p.hands[0]!;
			h.cards.push(state.deck.pop()!, state.deck.pop()!);
			if (handValue(h.cards).total === 21) {
				h.isBlackjack = true;
				h.stood = true;
			}
		}
		state.dealer.cards = [state.deck.pop()!, state.deck.pop()!];
		state.dealer.holeRevealed = false;
		state.dealerHadBlackjack = handValue(state.dealer.cards).total === 21;

		const upCard = state.dealer.cards[0]!;
		if (upCard.rank === 'A') {
			// Offer insurance before peeking for blackjack.
			state.gamePhase = 'insurance';
			for (const p of state.players) { p.insuranceResolved = false; p.insuranceBet = 0; }
		} else if (cardValue(upCard.rank) === 10) {
			// Silent peek on a ten-value up card.
			if (state.dealerHadBlackjack) this.resolveRound();
			else this.beginPlayerTurns();
		} else {
			this.beginPlayerTurns();
		}
	}

	// ── Insurance ───────────────────────────────────────────────────────────────

	private applyInsurance(playerId: string, take: boolean): BlackjackGameState {
		const state = this.state!;
		if (state.gamePhase !== 'insurance') return state;
		const player = state.players.find(p => p.id === playerId);
		if (!player || player.insuranceResolved) return state;

		if (take) {
			const ins = Math.min(Math.floor(player.hands[0]!.bet / 2), player.chips);
			if (ins > 0) { player.chips -= ins; player.insuranceBet = ins; }
		}
		player.insuranceResolved = true;

		if (state.players.every(p => p.insuranceResolved)) {
			if (state.dealerHadBlackjack) this.resolveRound();
			else this.beginPlayerTurns();
		}
		state.lastUpdate = new Date();
		return state;
	}

	// ── Player turns ──────────────────────────────────────────────────────────────

	private beginPlayerTurns(): void {
		const state = this.state!;
		state.gamePhase = 'player-turns';
		// Every player acts on their own hands concurrently — there is no turn order.
		for (const p of state.players) {
			const idx = p.hands.findIndex(h => !handFinalized(h));
			if (idx === -1) {
				p.done = true;
			} else {
				p.activeHandIndex = idx;
				p.done = false;
			}
		}
		// Everyone stood pat on a natural blackjack — straight to the dealer.
		if (state.players.every(p => p.done)) this.dealerPlayAndResolve();
	}

	/**
	 * Resolve the requesting player's own active hand, or null if they cannot act.
	 * Keyed strictly by the caller's id, so a player can only ever mutate their own
	 * cards — there is no shared turn pointer for concurrent actions to collide on.
	 */
	private actorFor(playerId: string): { p: BlackjackPlayer; h: BlackjackHand } | null {
		const state = this.state!;
		if (state.gamePhase !== 'player-turns') return null;
		const p = state.players.find(pl => pl.id === playerId);
		if (!p || p.done) return null;
		const h = p.hands[p.activeHandIndex];
		if (!h || handFinalized(h)) return null;
		return { p, h };
	}

	/** Move one player to their next playable hand; when none remain, mark them done. */
	private advancePlayer(p: BlackjackPlayer): void {
		const state = this.state!;
		const nextHand = p.hands.findIndex((h, i) => i > p.activeHandIndex && !handFinalized(h));
		if (nextHand !== -1) { p.activeHandIndex = nextHand; return; }
		p.done = true;
		// The dealer plays only once every player has finished acting.
		if (state.players.every(pl => pl.done)) this.dealerPlayAndResolve();
	}

	private applyHit(playerId: string): BlackjackGameState {
		const state = this.state!;
		const ctx = this.actorFor(playerId);
		if (!ctx) return state;
		ctx.h.cards.push(state.deck.pop()!);
		const { total } = handValue(ctx.h.cards);
		if (total > 21) ctx.h.busted = true;
		else if (total === 21) ctx.h.stood = true;
		if (handFinalized(ctx.h)) this.advancePlayer(ctx.p);
		state.lastUpdate = new Date();
		return state;
	}

	private applyStand(playerId: string): BlackjackGameState {
		const state = this.state!;
		const ctx = this.actorFor(playerId);
		if (!ctx) return state;
		ctx.h.stood = true;
		this.advancePlayer(ctx.p);
		state.lastUpdate = new Date();
		return state;
	}

	private applyDouble(playerId: string): BlackjackGameState {
		const state = this.state!;
		const ctx = this.actorFor(playerId);
		if (!ctx) return state;
		const { p, h } = ctx;
		if (h.cards.length !== 2 || h.fromSplitAces || p.chips < h.bet) return state;
		p.chips -= h.bet;
		h.bet *= 2;
		h.doubled = true;
		h.cards.push(state.deck.pop()!);
		if (handValue(h.cards).total > 21) h.busted = true;
		else h.stood = true;
		this.advancePlayer(p);
		state.lastUpdate = new Date();
		return state;
	}

	private applySplit(playerId: string): BlackjackGameState {
		const state = this.state!;
		const ctx = this.actorFor(playerId);
		if (!ctx) return state;
		const { p, h } = ctx;
		if (h.cards.length !== 2) return state;
		// Split allowed on equal value, so K + J (both 10) can be split.
		if (cardValue(h.cards[0]!.rank) !== cardValue(h.cards[1]!.rank)) return state;
		if (p.hands.length >= MAX_HANDS || p.chips < h.bet) return state;

		const isAces = h.cards[0]!.rank === 'A';
		p.chips -= h.bet;
		const moved = h.cards.pop()!;
		const sibling = newHand(h.bet);
		sibling.cards.push(moved);
		sibling.fromSplitAces = isAces;
		h.fromSplitAces = isAces;
		p.hands.splice(p.activeHandIndex + 1, 0, sibling);

		h.cards.push(state.deck.pop()!);
		sibling.cards.push(state.deck.pop()!);

		if (isAces) {
			// Split aces receive one card each and stand automatically.
			h.stood = true;
			sibling.stood = true;
		} else {
			if (handValue(h.cards).total === 21) h.stood = true;
			if (handValue(sibling.cards).total === 21) sibling.stood = true;
		}

		if (handFinalized(h)) this.advancePlayer(p);
		state.lastUpdate = new Date();
		return state;
	}

	// ── Dealer & resolution ────────────────────────────────────────────────────────

	private dealerPlayAndResolve(): void {
		const state = this.state!;
		state.dealer.holeRevealed = true;
		const anyLive = state.players.some(p => p.hands.some(h => !h.busted));
		if (anyLive && !state.dealerHadBlackjack) {
			for (;;) {
				const { total, soft } = handValue(state.dealer.cards);
				const mustHit = total < 17 || (total === 17 && soft && HIT_SOFT_17);
				if (!mustHit) break;
				state.dealer.cards.push(state.deck.pop()!);
			}
		}
		this.resolveRound();
	}

	private resolveRound(): void {
		const state = this.state!;
		state.dealer.holeRevealed = true;
		const dealer = handValue(state.dealer.cards);
		const dealerBust = dealer.total > 21;
		const dealerBJ = state.dealerHadBlackjack;

		for (const p of state.players) {
			for (const h of p.hands) {
				let outcome: HandOutcome;
				let returned: number;
				if (h.busted) { outcome = 'lose'; returned = 0; }
				else if (h.isBlackjack && !dealerBJ) { outcome = 'blackjack'; returned = h.bet * 2.5; }
				else if (dealerBJ) { outcome = h.isBlackjack ? 'push' : 'lose'; returned = h.isBlackjack ? h.bet : 0; }
				else {
					const total = handValue(h.cards).total;
					if (dealerBust || total > dealer.total) { outcome = 'win'; returned = h.bet * 2; }
					else if (total === dealer.total) { outcome = 'push'; returned = h.bet; }
					else { outcome = 'lose'; returned = 0; }
				}
				h.outcome = outcome;
				h.net = returned - h.bet;
				p.chips += Math.floor(returned);
			}
			if (p.insuranceBet > 0) {
				if (dealerBJ) { p.chips += p.insuranceBet * 3; p.insuranceNet = p.insuranceBet * 2; }
				else { p.insuranceNet = -p.insuranceBet; }
			}
		}
		state.gamePhase = 'result';
		state.lastUpdate = new Date();
	}

	private applyNextRound(): BlackjackGameState {
		const state = this.state!;
		if (state.gamePhase !== 'result') return state;

		for (const p of state.players) {
			p.hands = [];
			p.activeHandIndex = 0;
			p.hasBet = false;
			p.insuranceBet = 0;
			p.insuranceResolved = false;
			p.insuranceNet = undefined;
			p.done = false;
		}
		state.players = state.players.filter(p => p.chips >= MIN_BET);
		state.dealer = { cards: [], holeRevealed: false };
		state.dealerHadBlackjack = false;
		state.deck = [];

		if (state.players.length === 0) {
			// Everyone busted out — the house takes it.
			state.gamePhase = 'game-over';
			state.winnerName = undefined;
		} else if (!state.soloMode && state.players.length === 1) {
			state.gamePhase = 'game-over';
			state.winnerName = state.players[0]!.name;
		} else {
			state.gamePhase = 'betting';
		}
		state.lastUpdate = new Date();
		return state;
	}
}
