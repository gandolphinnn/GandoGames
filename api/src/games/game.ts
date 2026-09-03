import { GamePlayer, GameSettings, GameState, GameType } from '@gandogames/shared/dto';
import { GAMES_CONFIG } from './game';

export { GAMES_CONFIG } from '@gandogames/shared/config';

export abstract class Game<TState extends GameState = GameState> {

	public state: TState | null = null;
	constructor(public type: GameType) {
	}

	public abstract initialize(players: GamePlayer[], settings?: GameSettings): void;
	public abstract getPublicState(requestingPlayerId: string): TState;
	public abstract action(player: GamePlayer, action: string, data: any): TState;
	/**
	 * @throws new Error('Not implemented'); if the game does not supports bot
	 */
	public abstract botAction(): TState;

	protected shouldBotPlay() {
		const state = this.state!;
		const supportsBots = GAMES_CONFIG[this.type].supportsBots;
		return supportsBots && state.players[state.currentPlayerIndex].type === 'bot';
	}

	public static Factory: (type: GameType) => Game = (_type) => {
		throw new Error('Game.Factory not wired, import from api/src/games');
	};
}
