import { Game } from './game';
import { PankovGame } from './pankov';
import { PokerGame } from './poker';
import { BattleshipGame } from './battleship';

Game.Factory = (type) => {
	switch (type) {
		case 'pankov': return new PankovGame();
		case 'poker': return new PokerGame();
		case 'battleship': return new BattleshipGame();
	}
};

export * from './game';
export * from './pankov';
export * from './poker';
export * from './battleship';
