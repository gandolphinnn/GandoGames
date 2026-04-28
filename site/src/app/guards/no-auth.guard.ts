import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from '@gandogames/services/auth.service';

export const noAuthGuard: CanActivateFn = () => {
	const auth = inject(AuthService);
	const router = inject(Router);
	return !auth.isLoggedIn() || router.createUrlTree(['/']);
};
