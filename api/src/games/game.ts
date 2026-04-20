import { GamePlayer, GameState, GameType } from '@gandogames/common/api';

export const GAMES_CONFIG: Record<GameType, {
	minPlayers: number,
	maxPlayers: number,
}> = {
	'morra': {
		minPlayers: 2,
		maxPlayers: 2,
	},
}

export abstract class Game<TState extends GameState> {

	public abstract minPlayers: number;
	public abstract maxPlayers: number;

	public state: TState | null = null;
	public abstract getPublicState(requestingPlayerId: string): TState;
	public parseState(json: string) {
		this.state = JSON.parse(json) as TState;
	}

	public static Factory: (type: GameType) => Game<GameState> = (_type) => {
		throw new Error('Game.Factory not wired — import from api/src/games');
	};

	public abstract action(player: GamePlayer, action: string, data: any): TState;
}