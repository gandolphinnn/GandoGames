import { Routes } from '@angular/router';

export const PLAY_ROUTES: Routes = [
	{
		path: 'local/:game',
		loadComponent: () => import('./room/room.component').then((m) => m.RoomComponent),
	},
	{
		path: 'single/:game',
		loadComponent: () => import('./room/room.component').then((m) => m.RoomComponent),
	},
	{
		path: 'room/:room',
		loadComponent: () => import('./room/room.component').then((m) => m.RoomComponent),
	},
];
