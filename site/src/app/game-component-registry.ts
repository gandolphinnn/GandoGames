import { Type } from '@angular/core';
import { GameType } from '@gandogames/common/api';
import { PankovGameComponent } from '@gandogames/lib/games/pankov';
import { PokerGameComponent } from '@gandogames/lib/games/poker';
import { ChessGameComponent } from '@gandogames/lib/games/chess';

export const GAME_COMPONENT_REGISTRY: Record<GameType, Type<unknown>> = {
	'pankov': PankovGameComponent,
	'poker': PokerGameComponent,
	'chess': ChessGameComponent,
};
