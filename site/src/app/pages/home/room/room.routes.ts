import { Routes } from '@angular/router';

export const ROOM_ROUTES: Routes = [
	{
		path: '',
		loadComponent: () => import('./room-list.component').then((m) => m.RoomListComponent),
	},
	{
		path: ':roomId',
		loadComponent: () => import('./room-detail.component').then((m) => m.RoomDetailComponent),
	},
];
