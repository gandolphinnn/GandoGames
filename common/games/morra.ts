import { GamePlayer, GameState, RoomData } from "..";

export type Hand = 'rock' | 'paper' | 'scissors';

export interface MorraPlayer extends GamePlayer {
	currentPick?: Hand,
	hasPicked: boolean,
	lives: number,
}

export interface MorraRoundResult {
	losers: string[],
	isDraw: boolean,
	picks: Record<string, Hand>,
}

export interface MorraGameState extends GameState {
	gamePhase: 'picking' | 'reveal' | 'game-over',
	players: MorraPlayer[],
	result?: MorraRoundResult,
	winnerName?: string,
}

export interface MorraRoomState extends RoomData {
	gameState?: MorraGameState,
}

export interface MorraActionRequest {
	action: 'pick' | 'next-round',
	hand?: Hand,
}

const HAND_LABEL: Record<Hand, string> = { rock: 'Rock', paper: 'Paper', scissors: 'Scissors' };

export function describeMorraState(state: MorraGameState): string {
	switch (state.gamePhase) {
		case 'picking':
			return 'Round started — choose your hand';
		case 'reveal': {
			if (!state.result) return 'Reveal';
			if (state.result.isDraw) return 'Draw — no lives lost';
			const parts = state.players.map(p => {
				const hand = HAND_LABEL[state.result!.picks[p.id] as Hand] ?? state.result!.picks[p.id];
				const lost = state.result!.losers.includes(p.id);
				return `${p.name}: ${hand}${lost ? ' (−1)' : ''}`;
			});
			return parts.join(' · ');
		}
		case 'game-over':
			return `Game over — ${state.winnerName ?? '?'} wins!`;
	}
}
