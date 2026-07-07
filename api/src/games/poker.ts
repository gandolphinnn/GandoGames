import type { GamePlayer, GameSettings } from '@gandogames/shared/dto';
import { type Card, createDeck, shuffle } from '@gandogames/shared/common/cards';
import { type PokerGameState, type HandRank, compareHandRanks, describeHand, evaluateHand, levelForElapsed, pokerDeckRanks, resolvePokerSettings, smallBlindFor } from '@gandogames/shared/poker';
import { Game } from './game';

export class PokerGame extends Game<PokerGameState> {
	public override initialize(players: GamePlayer[], settings?: GameSettings): void {
		const resolved = resolvePokerSettings(settings);
		this.state = {
			lastUpdate: new Date(),
			gamePhase: 'pre-flop',
			players: players.map(p => ({
				...p,
				chips: resolved.startingChips,
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
			settings: resolved,
			startedAt: new Date(),
			blindLevel: 0,
			bigBlind: resolved.blindLevels[0]!.bigBlind,
		};
		this.startNewHand();
	}

	public override getPublicState(playerId: string): PokerGameState {
		if (!this.state) throw new Error('Game not initialized');
		// Hole cards are revealed only at a *contested* showdown (more than one player still in).
		// An uncontested win — everyone else folded — is taken without showing, so the lone winner's
		// hand stays hidden. Folded hands are always mucked, even at a real showdown.
		const contestedShowdown = this.state.gamePhase === 'showdown' &&
			this.state.players.filter(p => !p.folded).length > 1;
		const players = this.state.players.map(p => {
			if (p.id === playerId) return p;
			if (contestedShowdown && !p.folded) return p;
			return { ...p, cards: [] as Card[] };
		});
		return { ...this.state, players, deck: [] };
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
			case 'raise': return this.applyRaise(player.id, data?.amount as number ?? this.state.bigBlind);
			case 'all-in': return this.applyAllIn(player.id);
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
		const newTotalBet = state.currentBet + Math.max(raiseBy, state.bigBlind);
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

	private applyAllIn(playerId: string): PokerGameState {
		const state = this.state!;
		const player = state.players.find(p => p.id === playerId)!;
		const toPut = player.chips;
		if (toPut <= 0) return state;
		player.chips = 0;
		player.streetBet += toPut;
		state.pot += toPut;
		player.isAllIn = true;
		player.hasActed = true;
		// Pushing past the current bet is a raise: everyone still in must act again. A short all-in
		// (stack below the call amount) only matches part of it — it must NOT lower the bet for others.
		if (player.streetBet > state.currentBet) {
			state.currentBet = player.streetBet;
			for (const p of state.players) {
				if (p.id !== playerId && !p.folded && !p.isAllIn) p.hasActed = false;
			}
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
		for (const [id, r] of ranks) hands[id] = describeHand(r);
		state.result = { winners, hands, potAmount: state.pot };
		state.gamePhase = 'showdown';
	}

	private startNewHand(): void {
		const state = this.state!;
		// Self-heal a game persisted before blind schedules existed: backfill the schedule/clock so an
		// in-flight legacy hand can advance instead of crashing on the missing fields.
		if (!state.settings.blindLevels?.length) state.settings = resolvePokerSettings(state.settings as unknown as GameSettings);
		if (!state.startedAt) state.startedAt = new Date();
		for (const p of state.players) {
			p.cards = [];
			p.streetBet = 0;
			p.folded = false;
			p.hasActed = false;
			p.isAllIn = false;
		}
		state.deck = shuffle(createDeck(pokerDeckRanks(state.players.length, state.settings.smallerDeck)));
		state.communityCards = [];
		state.pot = 0;
		state.result = undefined;
		const n = state.players.length;
		for (const p of state.players) p.cards = [state.deck.pop()!, state.deck.pop()!];
		// Blinds escalate on a real-time clock: pick the level for how long the game's been running and
		// lock it in for this hand. Big blind = that level's; small blind is half of it (floored).
		const level = levelForElapsed(state.settings.blindLevels, Date.now() - new Date(state.startedAt).getTime());
		state.blindLevel = level;
		const bigBlind = state.settings.blindLevels[level]!.bigBlind;
		state.bigBlind = bigBlind;
		const smallBlind = smallBlindFor(bigBlind);
		const sbIdx = (state.dealerIndex + 1) % n;
		const bbIdx = (state.dealerIndex + 2) % n;
		const sb = state.players[sbIdx]!;
		const bb = state.players[bbIdx]!;
		const sbAmount = Math.min(smallBlind, sb.chips);
		sb.chips -= sbAmount;
		sb.streetBet = sbAmount;
		state.pot += sbAmount;
		if (sb.chips === 0) sb.isAllIn = true;
		const bbAmount = Math.min(bigBlind, bb.chips);
		bb.chips -= bbAmount;
		bb.streetBet = bbAmount;
		state.pot += bbAmount;
		if (bb.chips === 0) bb.isAllIn = true;
		state.currentBet = bigBlind;
		// Heads-up: dealer/SB acts first pre-flop; otherwise UTG (after BB) acts first
		state.currentPlayerIndex = n === 2 ? sbIdx : (bbIdx + 1) % n;
		state.gamePhase = 'pre-flop';
	}
}
