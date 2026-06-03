import { Game } from './game';
import { PankovGame } from './pankov';
import { PokerGame } from './poker';
import { ChessGame } from './chess';

Game.Factory = (type) => {
	switch (type) {
		case 'pankov': return new PankovGame();
		case 'poker': return new PokerGame();
		case 'chess': return new ChessGame();
	}
};

export * from './game';
export * from './pankov';
export * from './poker';
export * from './chess';
