import { Component, inject, signal, Signal } from '@angular/core';
import { Router } from '@angular/router';

import { AuthService, AuthUser } from '@gandogames/services/auth.service';

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
	public readonly confirmingDelete = signal(false);
	public readonly loading = signal(false);
	public readonly error = signal<string | null>(null);

	public logout(): void {
		this.auth.logout();
		this.router.navigate(['/login']);
	}

	public requestDelete(): void {
		this.confirmingDelete.set(true);
		this.error.set(null);
	}

	public cancelDelete(): void {
		this.confirmingDelete.set(false);
	}

	public async confirmDelete(): Promise<void> {
		this.loading.set(true);
		this.error.set(null);
		try {
			await this.auth.deleteAccount();
			await this.router.navigate(['/login']);
		} catch (err) {
			this.error.set((err as Error).message ?? 'Failed to delete account');
			this.loading.set(false);
			this.confirmingDelete.set(false);
		}
	}
}
