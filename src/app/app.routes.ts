import { Routes } from '@angular/router';

import { GamePickerComponent } from './pages/game-picker/game-picker.component';
import { PlayComponent } from './pages/play/play.component';

export const routes: Routes = [
	{
		path: '',
		component: GamePickerComponent,
	},
	{
		path: 'play',
		component: PlayComponent,
		loadChildren: () => import('./pages/play/play.routes').then((m) => m.routes),
	},
	{
		path: '**',
		redirectTo: ''
	},
];
