import { Game } from './game';
import { MastermindGame } from './mastermind';
import { PankovGame } from './pankov';
import { PokerGame } from './poker';

Game.Factory = (type) => {
	switch (type) {
		case 'mastermind': return new MastermindGame();
		case 'pankov': return new PankovGame();
		case 'poker': return new PokerGame();
	}
};

export * from './game';
export * from './pankov';
export * from './poker';
