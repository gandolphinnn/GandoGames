import type { Card } from '@gandogames/shared/common/cards';
import { compareHandRanks, describeHand, estimateWinOdds, evaluateHand } from '@gandogames/shared/poker';

const c = (rank: Card['rank'], suit: Card['suit']): Card => ({ rank, suit });

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
