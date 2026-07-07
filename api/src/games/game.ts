import { GamePlayer, GameSettings, GameState, GameType } from '@gandogames/shared/dto';

export const GAMES_CONFIG: Record<GameType, {
	minPlayers: number,
	maxPlayers: number,
}> = {
	'pankov': {
		minPlayers: 2,
		maxPlayers: 6,
	},
	'poker': {
		minPlayers: 2,
		maxPlayers: 8,
	},
	'battleship': {
		minPlayers: 2,
		maxPlayers: 2,
	},
}

export abstract class Game<TState extends GameState> {

	public abstract minPlayers: number;
	public abstract maxPlayers: number;

	public state: TState | null = null;

	public abstract initialize(players: GamePlayer[], settings?: GameSettings): void;
	public abstract getPublicState(requestingPlayerId: string): TState;
	public abstract action(player: GamePlayer, action: string, data: any): TState;

	public static Factory: (type: GameType) => Game<GameState> = (_type) => {
		throw new Error('Game.Factory not wired — import from api/src/games');
	};
}