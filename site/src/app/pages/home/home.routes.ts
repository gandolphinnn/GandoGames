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
		path: 'play',
		loadChildren: () => import('./room/room.routes').then((m) => m.ROOM_ROUTES),
	},
];
