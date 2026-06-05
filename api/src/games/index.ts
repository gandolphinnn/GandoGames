import { Game } from './game';
import { PankovGame } from './pankov';
import { PokerGame } from './poker';
import { BlackjackGame } from './blackjack';

Game.Factory = (type) => {
	switch (type) {
		case 'pankov': return new PankovGame();
		case 'poker': return new PokerGame();
		case 'blackjack': return new BlackjackGame();
	}
};

export * from './game';
export * from './pankov';
export * from './poker';
export * from './blackjack';
