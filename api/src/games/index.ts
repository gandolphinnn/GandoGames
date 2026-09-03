import { Game } from './game';
import { PankovGame } from './pankov';
import { PokerGame } from './poker';

Game.Factory = (type) => {
	switch (type) {
		case 'pankov': return new PankovGame(type);
		case 'poker': return new PokerGame(type);
	}
};

export * from './game';
export * from './pankov';
export * from './poker';
