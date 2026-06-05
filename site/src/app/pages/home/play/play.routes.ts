import { Routes } from '@angular/router';

export const PLAY_ROUTES: Routes = [
	{
		path: '',
		loadComponent: () => import('./list/room-list.component').then((m) => m.RoomListComponent),
	},
	{
		path: 'new',
		loadComponent: () => import('./new/room-new.component').then((m) => m.RoomNewComponent),
	},
	{
		path: ':roomId',
		loadComponent: () => import('./room/room.component').then((m) => m.RoomComponent),
	},
];
