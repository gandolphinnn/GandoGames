import { Routes } from '@angular/router';

export const HOME_ROUTES: Routes = [
	{
		path: '',
		redirectTo: 'play',
		pathMatch: 'full',
	},
	{
		path: 'profile',
		loadComponent: () => import('./profile/profile.component').then((m) => m.ProfileComponent),
	},
	{
		path: 'social',
		loadComponent: () => import('./social/social.component').then((m) => m.SocialComponent),
	},
	{
		path: 'play',
		loadChildren: () => import('./play/play.routes').then((m) => m.PLAY_ROUTES),
	},
];
