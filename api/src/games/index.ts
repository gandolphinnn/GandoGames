import { Game } from './game';
import { MorraGame } from './morra';
import { PankovGame } from './pankov';

Game.Factory = (type) => {
	switch (type) {
		case 'morra': return new MorraGame();
		case 'pankov': return new PankovGame();
	}
};

export * from './game';
export * from './morra';
export * from './pankov';
