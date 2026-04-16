import { Routes } from '@angular/router';


export const routes: Routes = [
	{
		path: 'pankov',
		loadChildren: () => import('@gandogames/pankov').then((m) => m.PANKOV_ROUTES),
	},
	{
		path: 'morra',
		loadChildren: () => import('@gandogames/morra').then((m) => m.MORRA_ROUTES),
	},
];
