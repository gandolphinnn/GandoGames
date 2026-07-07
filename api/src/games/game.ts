import { GamePlayer, GameSettings, GameState, GameType } from '@gandogames/shared/dto';

export { GAMES_CONFIG } from '@gandogames/shared/config';

export abstract class Game<TState extends GameState> {

	public state: TState | null = null;

	public abstract initialize(players: GamePlayer[], settings?: GameSettings): void;
	public abstract getPublicState(requestingPlayerId: string): TState;
	public abstract action(player: GamePlayer, action: string, data: any): TState;

	public static Factory: (type: GameType) => Game<GameState> = (_type) => {
		throw new Error('Game.Factory not wired — import from api/src/games');
	};
}
