import { Routes } from '@angular/router';
import { PlayComponent } from './pages/play/play.component';
import { PLAY_ROUTES } from './pages/play/play.routes';
import { authGuard } from './guards/auth.guard';
import { noAuthGuard } from './guards/no-auth.guard';

export const routes: Routes = [
	{
		path: '',
		loadComponent: () => import('./pages/home/home.component').then((m) => m.HomeComponent),
		canActivate: [authGuard],
	},
	{
		path: 'about',
		loadComponent: () => import('./pages/about/about.component').then((m) => m.AboutComponent),
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
		path: 'profile',
		loadComponent: () => import('./pages/profile/profile.component').then((m) => m.ProfileComponent),
		canActivate: [authGuard],
	},
	{
		path: 'play',
		component: PlayComponent,
		canActivate: [authGuard],
		children: PLAY_ROUTES,
	},
	{
		path: '**',
		redirectTo: '',
	},
];
