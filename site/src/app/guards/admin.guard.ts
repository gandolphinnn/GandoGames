import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn } from '@angular/router';
import { UserService, UrlService } from '@gandogames/services';

export const adminGuard: CanActivateFn = (_route: ActivatedRouteSnapshot) => {
	const auth = inject(UserService);
	const urlService = inject(UrlService);
	return auth.isAdmin() || urlService.get('').urlTree();
};
