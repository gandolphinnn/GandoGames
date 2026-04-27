import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { noAuthGuard } from './guards/no-auth.guard';

export const routes: Routes = [
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
		path: '',
		loadComponent: () => import('./pages/home/home.component').then((m) => m.HomeComponent),
		canActivate: [authGuard],
		loadChildren: () => import('./pages/home/home.routes').then((m) => m.HOME_ROUTES),
	},
	{
		path: '**',
		redirectTo: '',
	},
];
