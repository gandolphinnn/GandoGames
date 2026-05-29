import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { UserService } from '@gandogames/services/user.service';

export const noAuthGuard: CanActivateFn = () => {
	const auth = inject(UserService);
	const router = inject(Router);
	return !auth.isLoggedIn() || router.createUrlTree(['/']);
};
