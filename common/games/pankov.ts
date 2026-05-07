import { GamePlayer, GameState, RoomData } from "..";

export type RollValue =
	| 31 | 32 | 41 | 42 | 43 | 51 | 52 | 53 | 54 | 61 | 62 | 63 | 64 | 65
	| 11 | 22 | 33 | 44 | 55 | 66
	| 21;

export interface PankovPlayer extends GamePlayer {
	lives: number,
}

export interface RevealResult {
	declared: RollValue,
	actual: RollValue,
	wasLying: boolean,
	loserIndex: number,
}

export interface PankovGameState extends GameState {
	gamePhase: 'turn-start' | 'rolled' | 'result' | 'game-over',
	players: PankovPlayer[],
	currentPlayerIndex: number,
	previousPlayerIndex: number | null,
	previousDeclaration: RollValue | null,
	/** Hidden: actual roll of the previous declarer. Always null in public state. */
	previousActualRoll: RollValue | null,
	/** Hidden: current player's roll. Null for all other players. */
	currentRoll: RollValue | null,
	winnerName?: string,
	revealResult?: RevealResult,
}

export interface PankovRoomState extends RoomData {
	gameState?: PankovGameState,
}

export function formatValue(value: RollValue): string {
	if (value === 21) return 'Pankov!';
	const high = Math.floor(value / 10);
	const low = value % 10;
	if (high === low) return `Pair of ${high}s`;
	return `${high}-${low}`;
}

export function describePankovState(state: PankovGameState): string {
	const current = state.players[state.currentPlayerIndex];
	switch (state.gamePhase) {
		case 'turn-start':
			return state.previousDeclaration != null
				? `${current?.name ?? '?'}'s turn — last claim: ${formatValue(state.previousDeclaration)}`
				: `${current?.name ?? '?'} goes first`;
		case 'rolled':
			return `${current?.name ?? '?'} rolled, choosing a declaration…`;
		case 'result': {
			if (!state.revealResult) return 'Round result';
			const loser = state.players[state.revealResult.loserIndex];
			const claimed = formatValue(state.revealResult.declared);
			const actual = formatValue(state.revealResult.actual);
			return state.revealResult.wasLying
				? `Liar! Claimed ${claimed}, got ${actual} — ${loser?.name ?? '?'} −1 life`
				: `Honest! Claimed ${claimed}, got ${actual} — challenger ${loser?.name ?? '?'} −1 life`;
		}
		case 'game-over':
			return `Game over — ${state.winnerName ?? '?'} wins!`;
	}
}
