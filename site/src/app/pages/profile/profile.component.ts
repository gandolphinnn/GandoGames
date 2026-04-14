import { Component, inject, Signal } from '@angular/core';
import { Router } from '@angular/router';

import { AuthService, AuthUser } from '../../services/auth.service';

@Component({
	selector: 'gg-profile',
	imports: [],
	templateUrl: './profile.component.html',
	styleUrl: './profile.component.scss',
})
export class ProfileComponent {
	private readonly auth = inject(AuthService);
	private readonly router = inject(Router);

	public readonly user: Signal<AuthUser | null> = this.auth.user;

	public logout(): void {
		this.auth.logout();
		this.router.navigate(['/login']);
	}
}
