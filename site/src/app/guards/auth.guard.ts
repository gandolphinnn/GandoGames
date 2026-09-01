import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, RouterStateSnapshot } from '@angular/router';
import { UserService, UrlService } from '@gandogames/services';


export const authGuard: CanActivateFn = (_route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
	const auth = inject(UserService);
	const urlService = inject(UrlService);
	return auth.isLoggedIn() || urlService.get('login').urlTree({ returnUrl: state.url });
};
