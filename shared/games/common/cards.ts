// The standard 52-card French deck, shared by every card game (e.g. poker).
// Environment-agnostic: no Node/Angular/browser APIs, so both the API and the site
// can compile and run it.

export type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export interface Card {
	suit: Suit;
	rank: Rank;
}

type CardKey = `${Rank}-${Suit}`
function toCardKey(card: Card): CardKey {
	return `${card.rank}-${card.suit}`;
}
function toCard(cardKey: CardKey): Card {
	const [rank, suit] = cardKey.split('-') as [Rank, Suit];
	return { rank, suit };
}

const SUITS: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs'];
const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

export class Deck {
	private cards = new Set<CardKey>;
	
	public get length() {
		return this.cards.size;
	}

	public constructor(cards?: Card[]) {
		if (cards) {
			this.cards = new Set(cards.map(toCardKey));
			return;
		}

		for (const suit of SUITS) 
			for (const rank of RANKS) 
				this.cards.add(toCardKey({ suit, rank }));
	}

	public shuffle(): this {
		const cards = [...this.cards]
		for (let i = cards.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[cards[i], cards[j]] = [cards[j]!, cards[i]!];
		}
		this.cards = new Set(cards);
		return this;
	}

	public remove(cards: Card[]) {
		for (const card of cards)
			this.cards.delete(toCardKey(card));
		return this;
	}

	public draw(): Card;
	public draw(amount: number): Card[];
	/**
	 * Draws the requested number of cards from the deck.
	 * Removes the drawn cards from the deck and returns them.
	 * Returns a smaller array than expected if the deck does not contain enough cards.
	 */
	public draw(amount: number = 1): Card | Card[] {
		if (!Number.isInteger(amount) || amount < 0)
			throw new RangeError('Amount must be a non-negative integer.');
		
		const keys = [...this.cards].slice(0, amount);
		for (const key of keys)
			this.cards.delete(key);

		const cards = keys.map(toCard);
		return amount === 1 ? cards[0]! : cards;
	}
}