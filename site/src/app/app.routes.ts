import { Routes } from '@angular/router';

import { GamePickerComponent } from './pages/game-picker/game-picker.component';
import { PlayComponent } from './pages/play/play.component';
import { authGuard } from './guards/auth.guard';
import { noAuthGuard } from './guards/no-auth.guard';

export const routes: Routes = [
	{
		path: '',
		component: GamePickerComponent,
		canActivate: [authGuard],
	},
	{
		path: 'play',
		component: PlayComponent,
		canActivate: [authGuard],
		loadChildren: () => import('./pages/play/play.routes').then((m) => m.routes),
	},
	{
		path: 'login',
		loadComponent: () => import('./pages/auth/login/login.component').then((m) => m.LoginComponent),
		canActivate: [noAuthGuard],
	},
	{
		path: 'signup',
		loadComponent: () => import('./pages/auth/signup/signup.component').then((m) => m.SignupComponent),
		canActivate: [noAuthGuard],
	},
	{
		path: '**',
		redirectTo: '',
	},
];
