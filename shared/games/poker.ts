import { GamePlayer, GameState, RoomData } from "..";
import { type Card, type Rank, cardKey, createDeck, shuffle } from "./common/cards";

export interface PokerPlayer extends GamePlayer {
	chips: number;
	cards: Card[];
	streetBet: number;
	folded: boolean;
	hasActed: boolean;
	isAllIn: boolean;
}

export interface PokerHandResult {
	winners: string[];
	hands: Record<string, string>;
	potAmount: number;
}

export interface PokerGameState extends GameState {
	gamePhase: 'pre-flop' | 'flop' | 'turn' | 'river' | 'showdown' | 'game-over';
	players: PokerPlayer[];
	communityCards: Card[];
	deck: Card[];
	pot: number;
	currentBet: number;
	currentPlayerIndex: number;
	dealerIndex: number;
	result?: PokerHandResult;
	winnerName?: string;
}

export interface PokerRoomState extends RoomData {
	gameState?: PokerGameState;
}

export interface PokerActionRequest {
	action: 'fold' | 'check' | 'call' | 'raise' | 'next-hand';
	amount?: number;
}

export const STARTING_CHIPS = 1000;
export const MIN_RAISE = 100;

// ── Hand evaluation ──────────────────────────────────────────────────────────────
// Texas Hold'em hand ranking, shared by the server (showdown resolution) and the client
// (live "your current hand" + win-odds hint). Environment-agnostic — no Node/DOM APIs.

const RANK_VALUE: Record<Rank, number> = {
	'2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7,
	'8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14,
};

/** A categorized 5-card hand: higher `category` wins; ties broken left-to-right by `tiebreakers`. */
export interface HandRank {
	category: number;
	tiebreakers: number[];
	description: string;
}

/** Positive if `a` beats `b`, negative if `b` beats `a`, 0 if tied. */
export function compareHandRanks(a: HandRank, b: HandRank): number {
	if (a.category !== b.category) return a.category - b.category;
	for (let i = 0; i < Math.max(a.tiebreakers.length, b.tiebreakers.length); i++) {
		const diff = (a.tiebreakers[i] ?? 0) - (b.tiebreakers[i] ?? 0);
		if (diff !== 0) return diff;
	}
	return 0;
}

/** All k-card subsets of `arr` — used to find the best 5-card hand among 5–7 cards. */
function combinations(arr: Card[], k: number): Card[][] {
	if (k === 0) return [[]];          // exactly one subset of size 0: the empty set
	if (arr.length < k) return [];     // fewer cards left than needed → no subsets
	const [first, ...rest] = arr;
	// Every subset either keeps `first` (then pick k-1 from the rest) or drops it (pick k from the rest).
	return [
		...combinations(rest, k - 1).map(c => [first!, ...c]),
		...combinations(rest, k),
	];
}

/** Rank exactly five cards. */
export function evaluateFiveCard(cards: Card[]): HandRank {
	const values = cards.map(c => RANK_VALUE[c.rank]).sort((a, b) => b - a);
	const isFlush = cards.every(c => c.suit === cards[0]!.suit);
	const unique = [...new Set(values)].sort((a, b) => b - a);

	// Wheel straight (A-2-3-4-5): the ace plays low, so it ranks as a five-high straight.
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

/** Best 5-card hand from 5–7 cards (picks the strongest 5-card combination). */
export function evaluateHand(cards: Card[]): HandRank {
	if (cards.length <= 5) return evaluateFiveCard(cards);
	let best: HandRank | null = null;
	for (const combo of combinations(cards, 5)) {
		const rank = evaluateFiveCard(combo);
		if (!best || compareHandRanks(rank, best) > 0) best = rank;
	}
	return best!;
}

function rankLabel(value: number): string {
	switch (value) {
		case 14: return 'A';
		case 13: return 'K';
		case 12: return 'Q';
		case 11: return 'J';
		default: return String(value);
	}
}

/** Human label including the key ranks, e.g. "Two Pair: K & Q", "High Card: A", "Full House: K over Q". */
export function describeHand(rank: HandRank): string {
	const tb = rank.tiebreakers;
	switch (rank.category) {
		case 8: return rank.description; // Royal / Straight Flush
		case 7: return `Four of a Kind: ${rankLabel(tb[0]!)}`;
		case 6: return `Full House: ${rankLabel(tb[0]!)} over ${rankLabel(tb[3]!)}`;
		case 5: return `Flush: ${rankLabel(tb[0]!)}-high`;
		case 4: return `Straight: ${rankLabel(tb[0]!)}-high`;
		case 3: return `Three of a Kind: ${rankLabel(tb[0]!)}`;
		case 2: return `Two Pair: ${rankLabel(tb[0]!)} & ${rankLabel(tb[2]!)}`;
		case 1: return `Pair: ${rankLabel(tb[0]!)}`;
		default: return `High Card: ${rankLabel(tb[0]!)}`;
	}
}

/**
 * Monte-Carlo win-equity estimate: the share of the pot `hole` expects to win against
 * `opponents` unknown hands given the current `community` cards. Returns 0–1 (ties split the pot).
 * An estimate, not exact — intended as a UI hint once the flop is out.
 */
export function estimateWinOdds(hole: Card[], community: Card[], opponents: number, iterations = 2000): number {
	if (opponents < 1) return 1;
	const used = new Set([...hole, ...community].map(cardKey));
	const remaining = createDeck().filter(c => !used.has(cardKey(c)));
	const boardNeeded = 5 - community.length;
	let score = 0;
	for (let iter = 0; iter < iterations; iter++) {
		const drawn = shuffle(remaining);
		let next = 0;
		const board = [...community, ...drawn.slice(next, next += boardNeeded)];
		const myRank = evaluateHand([...hole, ...board]);
		let beaten = false;
		let ties = 0;
		for (let o = 0; o < opponents; o++) {
			const oppRank = evaluateHand([drawn[next++]!, drawn[next++]!, ...board]);
			const cmp = compareHandRanks(oppRank, myRank);
			if (cmp > 0) { beaten = true; break; }
			if (cmp === 0) ties++;
		}
		if (!beaten) score += 1 / (1 + ties);
	}
	return score / iterations;
}
