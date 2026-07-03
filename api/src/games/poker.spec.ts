import type { Card } from '@gandogames/shared/common/cards';
import type { GamePlayer } from '@gandogames/shared/dto';
import { resolveSettings } from '@gandogames/shared/dto';
import { POKER_SETTINGS_SCHEMA, compareHandRanks, describeHand, estimateAllInEquities, estimateWinOdds, evaluateHand } from '@gandogames/shared/poker';
import { PokerGame } from './poker';

const c = (rank: Card['rank'], suit: Card['suit']): Card => ({ rank, suit });

const player = (id: string, name: string): GamePlayer => ({ id, name, isGuest: false, icon: 'profile', theme: 'dark', language: 'en' });

describe('evaluateHand', () => {
	it('detects a royal flush', () => {
		const hand = evaluateHand([c('10', 'spades'), c('J', 'spades'), c('Q', 'spades'), c('K', 'spades'), c('A', 'spades')]);
		expect(hand.category).toBe(8);
		expect(hand.description).toBe('Royal Flush');
	});

	it('detects the wheel straight (A-2-3-4-5) as five-high', () => {
		const hand = evaluateHand([c('A', 'spades'), c('2', 'hearts'), c('3', 'clubs'), c('4', 'diamonds'), c('5', 'spades')]);
		expect(hand.category).toBe(4);
		expect(hand.tiebreakers[0]).toBe(5);
	});

	it('picks the best five from seven cards', () => {
		// Full house (kings full of queens) hidden among seven cards.
		const hand = evaluateHand([
			c('K', 'spades'), c('K', 'hearts'), c('K', 'clubs'),
			c('Q', 'diamonds'), c('Q', 'spades'),
			c('2', 'hearts'), c('7', 'clubs'),
		]);
		expect(hand.category).toBe(6);
		expect(describeHand(hand)).toBe('Full House: K over Q');
	});

	it('orders hands correctly (flush beats straight)', () => {
		const flush = evaluateHand([c('2', 'spades'), c('5', 'spades'), c('8', 'spades'), c('J', 'spades'), c('K', 'spades')]);
		const straight = evaluateHand([c('5', 'hearts'), c('6', 'clubs'), c('7', 'diamonds'), c('8', 'spades'), c('9', 'hearts')]);
		expect(compareHandRanks(flush, straight)).toBeGreaterThan(0);
	});
});

describe('describeHand', () => {
	it('labels a high card with its top rank', () => {
		const hand = evaluateHand([c('K', 'spades'), c('9', 'hearts'), c('7', 'clubs'), c('4', 'diamonds'), c('2', 'spades')]);
		expect(describeHand(hand)).toBe('High Card: K');
	});

	it('labels two pair with both ranks', () => {
		const hand = evaluateHand([c('K', 'spades'), c('K', 'hearts'), c('Q', 'clubs'), c('Q', 'diamonds'), c('2', 'spades')]);
		expect(describeHand(hand)).toBe('Two Pair: K & Q');
	});
});

describe('estimateWinOdds', () => {
	it('returns certainty for an unbeatable made hand', () => {
		// Royal flush already on the board+hole — no opponent can beat or tie it.
		const odds = estimateWinOdds(
			[c('A', 'spades'), c('K', 'spades')],
			[c('Q', 'spades'), c('J', 'spades'), c('10', 'spades')],
			1,
		);
		expect(odds).toBe(1);
	});

	it('stays within [0, 1] for a marginal hand', () => {
		const odds = estimateWinOdds([c('7', 'spades'), c('2', 'hearts')], [c('K', 'clubs'), c('Q', 'diamonds'), c('9', 'spades')], 3, 500);
		expect(odds).toBeGreaterThanOrEqual(0);
		expect(odds).toBeLessThanOrEqual(1);
	});
});

describe('PokerGame all-in', () => {
	let game: PokerGame;
	const me = () => game.state!.players.find(p => p.id === 'p1')!;

	beforeEach(() => {
		// 3 players (avoids the heads-up special case). Dealer=p1, SB=p2 (50), BB=p3 (100),
		// so UTG p1 is first to act with currentBet=100 and pot=150.
		game = new PokerGame();
		game.initialize([player('p1', 'Alice'), player('p2', 'Bob'), player('p3', 'Charlie')]);
	});

	it('pushes the whole stack in and, when over the bet, raises to that amount', () => {
		game.action(me(), 'all-in', null);
		expect(me().chips).toBe(0);
		expect(me().isAllIn).toBe(true);
		expect(me().streetBet).toBe(1000);
		expect(game.state!.currentBet).toBe(1000);
		expect(game.state!.pot).toBe(1150);
		expect(game.state!.currentPlayerIndex).toBe(1); // action moved on to the SB
	});

	it('does NOT lower the current bet on a short all-in below the call amount', () => {
		me().chips = 30; // short stack — can't cover the 100 bet
		game.action(me(), 'all-in', null);
		expect(me().chips).toBe(0);
		expect(me().isAllIn).toBe(true);
		expect(me().streetBet).toBe(30);
		expect(game.state!.currentBet).toBe(100); // unchanged — others still owe 100, not 30
		expect(game.state!.pot).toBe(180);
	});

	it('is ignored for a player with no chips', () => {
		me().chips = 0;
		const potBefore = game.state!.pot;
		game.action(me(), 'all-in', null);
		expect(me().isAllIn).toBe(false);
		expect(game.state!.pot).toBe(potBefore);
		expect(game.state!.currentPlayerIndex).toBe(0); // turn did not advance
	});
});

describe('PokerGame getPublicState (hole-card visibility)', () => {
	let game: PokerGame;
	const p1 = player('p1', 'Alice');
	const p2 = player('p2', 'Bob');
	const p3 = player('p3', 'Charlie');

	beforeEach(() => {
		game = new PokerGame();
		game.initialize([p1, p2, p3]); // dealer=p1, SB=p2, BB=p3, UTG p1 acts first
	});

	it('hides hole cards from opponents during a betting street', () => {
		const seen = game.getPublicState('p2').players;
		expect(seen.find(p => p.id === 'p1')!.cards).toEqual([]);
		expect(seen.find(p => p.id === 'p2')!.cards.length).toBe(2); // you always see your own
	});

	it('does NOT reveal the winner when the hand is won by everyone folding', () => {
		game.action(p1, 'fold', null); // UTG folds → p2 to act
		game.action(p2, 'fold', null); // p2 folds → p3 wins uncontested
		expect(game.state!.gamePhase).toBe('showdown');
		const winnerId = game.state!.result!.winners[0];
		expect(winnerId).toBe('p3');
		// A folded opponent must not see the uncontested winner's mucked hand…
		expect(game.getPublicState('p1').players.find(p => p.id === 'p3')!.cards).toEqual([]);
		// …but the winner still sees their own cards.
		expect(game.getPublicState('p3').players.find(p => p.id === 'p3')!.cards.length).toBe(2);
	});

	it('reveals non-folded contenders, but still mucks folded hands, at a contested showdown', () => {
		// Simulate a real showdown with p1 and p2 contesting and p3 folded.
		game.state!.gamePhase = 'showdown';
		game.state!.players.find(p => p.id === 'p3')!.folded = true;
		const seen = game.getPublicState('p1').players;
		expect(seen.find(p => p.id === 'p2')!.cards.length).toBe(2); // contender revealed
		expect(seen.find(p => p.id === 'p3')!.cards).toEqual([]);     // folded → mucked
	});
});

describe('PokerGame settings', () => {
	const p1 = player('p1', 'Alice');
	const p2 = player('p2', 'Bob');
	const p3 = player('p3', 'Charlie');

	it('seeds stacks from startingChips and blinds from minBet', () => {
		const game = new PokerGame();
		// Dealer=p1, SB=p2, BB=p3. Big blind = minBet (200), small blind = half (100).
		game.initialize([p1, p2, p3], { startingChips: 5000, minBet: 200, smallerDeck: false });
		const sb = game.state!.players.find(p => p.id === 'p2')!;
		const bb = game.state!.players.find(p => p.id === 'p3')!;
		const utg = game.state!.players.find(p => p.id === 'p1')!;
		expect(utg.chips).toBe(5000);          // dealer/UTG posts nothing pre-deal
		expect(sb.streetBet).toBe(100);
		expect(bb.streetBet).toBe(200);
		expect(sb.chips).toBe(4900);
		expect(bb.chips).toBe(4800);
		expect(game.state!.currentBet).toBe(200);
		expect(game.state!.pot).toBe(300);
	});

	it('deals from a 36-card short deck when smallerDeck is on', () => {
		const game = new PokerGame();
		game.initialize([p1, p2, p3], { startingChips: 1000, minBet: 100, smallerDeck: true });
		const dealt = game.state!.players.reduce((n, p) => n + p.cards.length, 0);
		expect(game.state!.deck.length + dealt).toBe(36);
		const all = [...game.state!.deck, ...game.state!.players.flatMap(p => p.cards)];
		expect(all.some(card => ['2', '3', '4', '5'].includes(card.rank))).toBe(false);
	});

	it('defaults to a 52-card deck and 1000 chips when no settings are given', () => {
		const game = new PokerGame();
		game.initialize([p1, p2, p3]);
		const dealt = game.state!.players.reduce((n, p) => n + p.cards.length, 0);
		expect(game.state!.deck.length + dealt).toBe(52);
		expect(game.state!.players.find(p => p.id === 'p1')!.chips).toBe(1000);
	});
});

describe('resolveSettings', () => {
	it('fills defaults for missing keys', () => {
		const s = resolveSettings(POKER_SETTINGS_SCHEMA, {});
		expect(s['startingChips']).toBe(1000);
		expect(s['minBet']).toBe(100);
		expect(s['smallerDeck']).toBe(false);
		expect('showWinOdds' in s).toBe(false);
	});

	it('clamps numbers into range and drops unknown keys', () => {
		const s = resolveSettings(POKER_SETTINGS_SCHEMA, { startingChips: 9_999_999, minBet: 1, bogus: 5 });
		expect(s['startingChips']).toBe(100000); // clamped to max
		expect(s['minBet']).toBe(10);            // clamped to min
		expect('bogus' in s).toBe(false);        // unknown key dropped
	});

	it('coerces toggles to booleans', () => {
		const s = resolveSettings(POKER_SETTINGS_SCHEMA, { smallerDeck: true });
		expect(s['smallerDeck']).toBe(true);
	});
});

describe('estimateAllInEquities', () => {
	it('is exact and gives the pot to the made hand on a complete board', () => {
		const aces = [c('A', 'spades'), c('A', 'hearts')];
		const kings = [c('K', 'spades'), c('K', 'hearts')];
		const board = [c('A', 'diamonds'), c('5', 'clubs'), c('9', 'diamonds'), c('2', 'spades'), c('7', 'hearts')];
		expect(estimateAllInEquities([aces, kings], board)).toEqual([1, 0]);
	});

	it('splits the pot when both play the board', () => {
		const a = [c('2', 'hearts'), c('3', 'hearts')];
		const b = [c('4', 'diamonds'), c('6', 'diamonds')];
		// Royal flush on the board — neither hole card improves it, so it's a dead tie.
		const board = [c('A', 'spades'), c('K', 'spades'), c('Q', 'spades'), c('J', 'spades'), c('10', 'spades')];
		expect(estimateAllInEquities([a, b], board)).toEqual([0.5, 0.5]);
	});

	it('estimates a running-out board and returns equities that sum to ~1', () => {
		const aces = [c('A', 'spades'), c('A', 'hearts')];
		const conn = [c('7', 'clubs'), c('8', 'clubs')];
		const eq = estimateAllInEquities([aces, conn], [], 2000);
		expect(eq[0]! + eq[1]!).toBeCloseTo(1, 5);
		expect(eq[0]!).toBeGreaterThan(eq[1]!); // aces are a big favourite pre-flop
	});
});
