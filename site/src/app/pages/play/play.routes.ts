import { Routes } from '@angular/router';


export const routes: Routes = [
	{
		path: 'pankov',
		loadChildren: () => import('@gandogames/pankov').then((m) => m.PANKOV_ROUTES),
	},
	/* {
		path: 'trio',
		loadChildren: () => import('@gandogames/trio').then((m) => m.PANKOV_ROUTES),
	}, */
];
