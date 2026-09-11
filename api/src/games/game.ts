import { GamePlayer, GameSettings, GameState, GameName, GAMES_CONFIG } from '@gandogames/shared/dto';

export abstract class Game<TState extends GameState = GameState> {

	public state: TState | null = null;
	protected constructor(public name: GameName) {
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
		const supportsBots = GAMES_CONFIG[this.name].supportsBots;
		return supportsBots && state.players[state.currentPlayerIndex].type === 'bot';
	}

	public static Factory: (name: GameName) => Game = (_type) => {
		// Not implemented because it will be overridden in @api/src/games
		throw new Error('Not implemented');
	};
}
