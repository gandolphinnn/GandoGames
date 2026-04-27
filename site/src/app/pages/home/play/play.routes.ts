import { Routes } from '@angular/router';

export const PLAY_ROUTES: Routes = [
	{
		path: '',
		loadComponent: () => import('./rooms.component').then((m) => m.RoomsComponent),
	},
	{
		path: ':roomId',
		loadComponent: () => import('./room-detail.component').then((m) => m.RoomDetailComponent),
	},
];
