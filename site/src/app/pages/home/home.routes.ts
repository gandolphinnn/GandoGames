import { Routes } from '@angular/router';
import { adminGuard } from '../../guards/admin.guard';

export const HOME_ROUTES: Routes = [
	{
		path: 'admin',
		loadComponent: () => import('./admin/admin.component').then((m) => m.AdminComponent),
		canActivate: [adminGuard],
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
		path: 'rooms/list',
		loadComponent: () => import('./room/list/room-list.component').then((m) => m.RoomListComponent),
	},
	{
		path: 'rooms/new',
		loadComponent: () => import('./room/new/room-new.component').then((m) => m.RoomNewComponent),
	},
	{
		path: 'play',
		loadChildren: () => import('./play/play.routes').then((m) => m.PLAY_ROUTES),
	},
	{
		path: 'test/palette',
		loadComponent: () => import('./test/palette/palette.component').then((m) => m.PaletteComponent),
		canActivate: [adminGuard],
	},
];
