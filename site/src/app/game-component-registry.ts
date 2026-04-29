import { Type } from '@angular/core';
import { GameType } from '@gandogames/common/api';
import { MorraGameComponent } from '@gandogames/lib/games/morra';
import { PankovGameComponent } from '@gandogames/lib/games/pankov';

export const GAME_COMPONENT_REGISTRY: Record<GameType, Type<unknown>> = {
	'morra': MorraGameComponent,
	'pankov': PankovGameComponent,
};
