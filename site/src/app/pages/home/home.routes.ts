import { Routes } from '@angular/router';
import { adminGuard } from '../../guards/admin.guard';

export const HOME_ROUTES: Routes = [
	{
		path: '',
		redirectTo: 'play',
		pathMatch: 'full',
	},
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
		path: 'play',
		loadChildren: () => import('./play/play.routes').then((m) => m.PLAY_ROUTES),
	},
		{
		path: 'test/palette',
		loadComponent: () => import('./test/palette/palette.component').then((m) => m.PaletteComponent),
	},
];
