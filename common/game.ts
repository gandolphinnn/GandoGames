import { MorraGame } from './morra'
import { PankovGame } from './pankov';

export enum GameType {
	Morra = 'morra',
	Pankov = 'pankov',
}

export interface GameState {
	lastUpdate: Date;
}

export abstract class Game<TState extends GameState> {

	public abstract minPlayers: number;
	public abstract maxPlayers: number;

	public static Factory(type: GameType) {
		switch (type) {
			case GameType.Morra:
				return new MorraGame();
			case GameType.Pankov:
				return new PankovGame();
		}
	}
}