import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { UserService, UrlService } from '@gandogames/services';


export const noAuthGuard: CanActivateFn = () => {
	const auth = inject(UserService);
	const urlService = inject(UrlService);
	return !auth.isLoggedIn() || urlService.get('').urlTree();
};
