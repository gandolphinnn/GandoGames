import type { GamePlayer } from '@gandogames/common/api';
import type { Card, PokerGameState, PokerPlayer, Rank, Suit } from '@gandogames/common/poker';
import { Game } from './game';

const STARTING_CHIPS = 1000;
const SMALL_BLIND = 50;
const BIG_BLIND = 100;
const MIN_RAISE = BIG_BLIND;

const SUITS: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs'];
const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const RANK_VALUE: Record<Rank, number> = {
	'2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7,
	'8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14,
};

function createDeck(): Card[] {
	const deck: Card[] = [];
	for (const suit of SUITS) for (const rank of RANKS) deck.push({ suit, rank });
	return deck;
}

function shuffle<T>(arr: T[]): T[] {
	const a = [...arr];
	for (let i = a.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[a[i], a[j]] = [a[j]!, a[i]!];
	}
	return a;
}

function combinations<T>(arr: T[], k: number): T[][] {
	if (k === 0) return [[]];
	if (arr.length < k) return [];
	const [first, ...rest] = arr;
	return [
		...combinations(rest, k - 1).map(c => [first!, ...c]),
		...combinations(rest, k),
	];
}

interface HandRank {
	category: number;
	tiebreakers: number[];
	description: string;
}

function compareHandRanks(a: HandRank, b: HandRank): number {
	if (a.category !== b.category) return a.category - b.category;
	for (let i = 0; i < Math.max(a.tiebreakers.length, b.tiebreakers.length); i++) {
		const diff = (a.tiebreakers[i] ?? 0) - (b.tiebreakers[i] ?? 0);
		if (diff !== 0) return diff;
	}
	return 0;
}

function evaluateFiveCard(cards: Card[]): HandRank {
	const values = cards.map(c => RANK_VALUE[c.rank]).sort((a, b) => b - a);
	const isFlush = cards.every(c => c.suit === cards[0]!.suit);
	const unique = [...new Set(values)].sort((a, b) => b - a);

	const isWheelStraight = unique.length === 5 &&
		unique[0] === 14 && unique[1] === 5 && unique[2] === 4 && unique[3] === 3 && unique[4] === 2;
	const isNormalStraight = unique.length === 5 && unique[0]! - unique[4]! === 4;
	const isStraight = isNormalStraight || isWheelStraight;
	const straightValues = isWheelStraight ? [5, 4, 3, 2, 1] : values;

	const freq: Record<number, number> = {};
	for (const v of values) freq[v] = (freq[v] ?? 0) + 1;
	const groups = Object.entries(freq)
		.map(([k, c]) => ({ v: Number(k), c }))
		.sort((a, b) => b.c - a.c || b.v - a.v);
	const tiebreakers = groups.flatMap(({ v, c }) => Array<number>(c).fill(v));

	const topCount = groups[0]?.c ?? 1;
	const secondCount = groups[1]?.c ?? 0;

	if (isFlush && isStraight) {
		const isRoyal = !isWheelStraight && values[0] === 14;
		return { category: 8, tiebreakers: straightValues, description: isRoyal ? 'Royal Flush' : 'Straight Flush' };
	}
	if (topCount === 4) return { category: 7, tiebreakers, description: 'Four of a Kind' };
	if (topCount === 3 && secondCount === 2) return { category: 6, tiebreakers, description: 'Full House' };
	if (isFlush) return { category: 5, tiebreakers: values, description: 'Flush' };
	if (isStraight) return { category: 4, tiebreakers: straightValues, description: 'Straight' };
	if (topCount === 3) return { category: 3, tiebreakers, description: 'Three of a Kind' };
	if (topCount === 2 && secondCount === 2) return { category: 2, tiebreakers, description: 'Two Pair' };
	if (topCount === 2) return { category: 1, tiebreakers, description: 'One Pair' };
	return { category: 0, tiebreakers: values, description: 'High Card' };
}

function evaluateHand(cards: Card[]): HandRank {
	if (cards.length <= 5) return evaluateFiveCard(cards);
	let best: HandRank | null = null;
	for (const combo of combinations(cards, 5)) {
		const rank = evaluateFiveCard(combo);
		if (!best || compareHandRanks(rank, best) > 0) best = rank;
	}
	return best!;
}

export class PokerGame extends Game<PokerGameState> {
	public override minPlayers = 2;
	public override maxPlayers = 8;

	public override initialize(players: GamePlayer[]): void {
		this.state = {
			lastUpdate: new Date(),
			gamePhase: 'pre-flop',
			players: players.map(p => ({
				id: p.id,
				name: p.name,
				chips: STARTING_CHIPS,
				cards: [],
				streetBet: 0,
				folded: false,
				hasActed: false,
				isAllIn: false,
			})),
			communityCards: [],
			deck: [],
			pot: 0,
			currentBet: 0,
			currentPlayerIndex: 0,
			dealerIndex: 0,
		};
		this.startNewHand();
	}

	public override getPublicState(playerId: string): PokerGameState {
		if (!this.state) throw new Error('Game not initialized');
		const players = this.state.players.map(p => {
			if (p.id === playerId) return p;
			if (this.state!.gamePhase === 'showdown') return p;
			return { ...p, cards: [] as Card[] };
		});
		return { ...this.state, players, deck: [] };
	}

	public override describe(state: PokerGameState): string {
		const current = state.players[state.currentPlayerIndex];
		switch (state.gamePhase) {
			case 'pre-flop': return `Pre-flop — ${current?.name ?? '?'}'s turn`;
			case 'flop': return `Flop — ${current?.name ?? '?'}'s turn`;
			case 'turn': return `Turn — ${current?.name ?? '?'}'s turn`;
			case 'river': return `River — ${current?.name ?? '?'}'s turn`;
			case 'showdown': {
				if (!state.result) return 'Showdown';
				const names = state.result.winners.map((id: string) => state.players.find((p: PokerPlayer) => p.id === id)?.name ?? id);
				return `Showdown — ${names.join(' & ')} wins ${state.result.potAmount}`;
			}
			case 'game-over': return `Game over — ${state.winnerName ?? '?'} wins!`;
			default: return '';
		}
	}

	public override action(player: GamePlayer, action: string, data: any): PokerGameState {
		if (!this.state) throw new Error('Game not initialized');

		if (action === 'next-hand') return this.applyNextHand();

		const isBettingPhase = ['pre-flop', 'flop', 'turn', 'river'].includes(this.state.gamePhase);
		if (!isBettingPhase) return this.state;
		if (this.state.players[this.state.currentPlayerIndex]?.id !== player.id) return this.state;

		switch (action) {
			case 'fold': return this.applyFold(player.id);
			case 'check': return this.applyCheck(player.id);
			case 'call': return this.applyCall(player.id);
			case 'raise': return this.applyRaise(player.id, data?.amount as number ?? MIN_RAISE);
			default: return this.state;
		}
	}

	private applyFold(playerId: string): PokerGameState {
		const state = this.state!;
		const player = state.players.find(p => p.id === playerId)!;
		player.folded = true;
		player.hasActed = true;
		this.advanceAfterAction();
		state.lastUpdate = new Date();
		return state;
	}

	private applyCheck(playerId: string): PokerGameState {
		const state = this.state!;
		const player = state.players.find(p => p.id === playerId)!;
		if (player.streetBet !== state.currentBet) return state;
		player.hasActed = true;
		this.advanceAfterAction();
		state.lastUpdate = new Date();
		return state;
	}

	private applyCall(playerId: string): PokerGameState {
		const state = this.state!;
		const player = state.players.find(p => p.id === playerId)!;
		const callAmount = Math.min(state.currentBet - player.streetBet, player.chips);
		if (callAmount <= 0) return state;
		player.chips -= callAmount;
		player.streetBet += callAmount;
		state.pot += callAmount;
		if (player.chips === 0) player.isAllIn = true;
		player.hasActed = true;
		this.advanceAfterAction();
		state.lastUpdate = new Date();
		return state;
	}

	private applyRaise(playerId: string, raiseBy: number): PokerGameState {
		const state = this.state!;
		const player = state.players.find(p => p.id === playerId)!;
		const newTotalBet = state.currentBet + Math.max(raiseBy, MIN_RAISE);
		const actualTotalBet = Math.min(newTotalBet, player.chips + player.streetBet);
		const toPut = actualTotalBet - player.streetBet;
		if (toPut <= 0 || toPut > player.chips) return state;
		player.chips -= toPut;
		player.streetBet = actualTotalBet;
		state.pot += toPut;
		state.currentBet = actualTotalBet;
		if (player.chips === 0) player.isAllIn = true;
		player.hasActed = true;
		for (const p of state.players) {
			if (p.id !== playerId && !p.folded && !p.isAllIn) p.hasActed = false;
		}
		this.advanceAfterAction();
		state.lastUpdate = new Date();
		return state;
	}

	private applyNextHand(): PokerGameState {
		const state = this.state!;
		if (state.gamePhase !== 'showdown') return state;
		if (state.result) {
			const share = Math.floor(state.result.potAmount / state.result.winners.length);
			const remainder = state.result.potAmount % state.result.winners.length;
			for (let i = 0; i < state.result.winners.length; i++) {
				const p = state.players.find(q => q.id === state.result!.winners[i]);
				if (p) p.chips += share + (i === 0 ? remainder : 0);
			}
			state.pot = 0;
		}
		state.dealerIndex = (state.dealerIndex + 1) % state.players.length;
		state.players = state.players.filter(p => p.chips > 0);
		if (state.dealerIndex >= state.players.length) state.dealerIndex = 0;
		if (state.players.length <= 1) {
			state.gamePhase = 'game-over';
			state.winnerName = state.players[0]?.name;
		} else {
			this.startNewHand();
		}
		state.lastUpdate = new Date();
		return state;
	}

	private advanceAfterAction(): void {
		const state = this.state!;
		const nonFolded = state.players.filter(p => !p.folded);
		if (nonFolded.length === 1) {
			state.result = { winners: [nonFolded[0]!.id], hands: {}, potAmount: state.pot };
			state.gamePhase = 'showdown';
			return;
		}
		if (this.isBettingRoundOver()) {
			this.advanceStreet();
		} else {
			this.moveToNextPlayer();
		}
	}

	private isBettingRoundOver(): boolean {
		const state = this.state!;
		const active = state.players.filter(p => !p.folded && p.chips > 0);
		return active.length === 0 ||
			active.every(p => p.isAllIn || (p.hasActed && p.streetBet === state.currentBet));
	}

	private moveToNextPlayer(): void {
		const state = this.state!;
		const n = state.players.length;
		let idx = state.currentPlayerIndex;
		for (let i = 1; i <= n; i++) {
			idx = (idx + 1) % n;
			const p = state.players[idx]!;
			if (!p.folded && !p.isAllIn && p.chips > 0) {
				state.currentPlayerIndex = idx;
				return;
			}
		}
	}

	private advanceStreet(): void {
		const state = this.state!;
		for (const p of state.players) { p.streetBet = 0; p.hasActed = false; }
		state.currentBet = 0;
		this.dealNextStreet();
		// Auto-run remaining streets if all active players are all-in
		while (['flop', 'turn', 'river'].includes(state.gamePhase)) {
			const canAct = state.players.filter(p => !p.folded && !p.isAllIn && p.chips > 0);
			if (canAct.length > 0) break;
			this.dealNextStreet();
		}
		if (['pre-flop', 'flop', 'turn', 'river'].includes(state.gamePhase)) {
			this.setFirstActorPostFlop();
		}
	}

	private dealNextStreet(): void {
		const state = this.state!;
		switch (state.gamePhase) {
			case 'pre-flop':
				state.communityCards = [state.deck.pop()!, state.deck.pop()!, state.deck.pop()!];
				state.gamePhase = 'flop';
				break;
			case 'flop':
				state.communityCards.push(state.deck.pop()!);
				state.gamePhase = 'turn';
				break;
			case 'turn':
				state.communityCards.push(state.deck.pop()!);
				state.gamePhase = 'river';
				break;
			case 'river':
				this.resolveShowdown();
				break;
		}
	}

	private setFirstActorPostFlop(): void {
		const state = this.state!;
		const n = state.players.length;
		for (let i = 1; i <= n; i++) {
			const idx = (state.dealerIndex + i) % n;
			const p = state.players[idx]!;
			if (!p.folded && !p.isAllIn && p.chips > 0) {
				state.currentPlayerIndex = idx;
				return;
			}
		}
	}

	private resolveShowdown(): void {
		const state = this.state!;
		const contenders = state.players.filter(p => !p.folded);
		const ranks = new Map<string, HandRank>();
		for (const p of contenders) {
			ranks.set(p.id, evaluateHand([...p.cards, ...state.communityCards]));
		}
		let bestRank: HandRank | null = null;
		for (const r of ranks.values()) {
			if (!bestRank || compareHandRanks(r, bestRank) > 0) bestRank = r;
		}
		const winners = contenders
			.filter(p => compareHandRanks(ranks.get(p.id)!, bestRank!) === 0)
			.map(p => p.id);
		const hands: Record<string, string> = {};
		for (const [id, r] of ranks) hands[id] = r.description;
		state.result = { winners, hands, potAmount: state.pot };
		state.gamePhase = 'showdown';
	}

	private startNewHand(): void {
		const state = this.state!;
		for (const p of state.players) {
			p.cards = [];
			p.streetBet = 0;
			p.folded = false;
			p.hasActed = false;
			p.isAllIn = false;
		}
		state.deck = shuffle(createDeck());
		state.communityCards = [];
		state.pot = 0;
		state.result = undefined;
		const n = state.players.length;
		for (const p of state.players) p.cards = [state.deck.pop()!, state.deck.pop()!];
		const sbIdx = (state.dealerIndex + 1) % n;
		const bbIdx = (state.dealerIndex + 2) % n;
		const sb = state.players[sbIdx]!;
		const bb = state.players[bbIdx]!;
		const sbAmount = Math.min(SMALL_BLIND, sb.chips);
		sb.chips -= sbAmount;
		sb.streetBet = sbAmount;
		state.pot += sbAmount;
		if (sb.chips === 0) sb.isAllIn = true;
		const bbAmount = Math.min(BIG_BLIND, bb.chips);
		bb.chips -= bbAmount;
		bb.streetBet = bbAmount;
		state.pot += bbAmount;
		if (bb.chips === 0) bb.isAllIn = true;
		state.currentBet = BIG_BLIND;
		// Heads-up: dealer/SB acts first pre-flop; otherwise UTG (after BB) acts first
		state.currentPlayerIndex = n === 2 ? sbIdx : (bbIdx + 1) % n;
		state.gamePhase = 'pre-flop';
	}
}
