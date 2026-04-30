import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router, RouterStateSnapshot } from '@angular/router';

import { AuthService } from '@gandogames/services/auth.service';

export const authGuard: CanActivateFn = (_route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
	const auth = inject(AuthService);
	const router = inject(Router);
	return auth.isLoggedIn() || router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};
