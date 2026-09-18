import { Routes } from '@angular/router';

export const ADMIN_ROUTES: Routes = [
	{
		path: 'rooms',
		loadComponent: () => import('./admin-rooms/admin-rooms.component').then((m) => m.AdminRoomsComponent),
	},
	{
		path: 'playground',
		loadComponent: () => import('./playground/playground.component').then((m) => m.PlaygroundComponent),
	},
];
