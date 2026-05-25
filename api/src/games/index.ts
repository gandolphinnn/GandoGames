import { Game } from './game';
import { MorraGame } from './morra';
import { PankovGame } from './pankov';
import { PokerGame } from './poker';

Game.Factory = (type) => {
	switch (type) {
		case 'morra': return new MorraGame();
		case 'pankov': return new PankovGame();
		case 'poker': return new PokerGame();
	}
};

export * from './game';
export * from './morra';
export * from './pankov';
export * from './poker';
