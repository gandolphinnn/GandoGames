import { Type } from '@angular/core';
import { MorraGameComponent } from '@gandogames/lib/games/morra';
import { PankovGameComponent } from '@gandogames/lib/games/pankov';

export const GAME_COMPONENT_REGISTRY: Record<string, Type<unknown>> = {
	morra: MorraGameComponent,
	pankov: PankovGameComponent,
};
