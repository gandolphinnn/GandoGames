import { MorraGame } from './morra'

export enum GameType {
	Morra = 'morra',
	//Pankov = 'pankov',
}

export interface GamePlayer {
	id: string,
}

export interface GameState {
	lastUpdate: Date;
}

export abstract class Game<TState extends GameState> {

	public abstract minPlayers: number;
	public abstract maxPlayers: number;

	public state: TState | null = null;
	public abstract getPublicState(requestingPlayerId: string): TState;
	public setState(json: string) {
		this.state = JSON.parse(json) as TState;
	}

	public static Factory(type: GameType) {
		switch (type) {
			case GameType.Morra:
				return new MorraGame();
			/* case GameType.Pankov:
				return new PankovGame(); */
		}
	}
}