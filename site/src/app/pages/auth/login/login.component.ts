import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../../services/auth.service';

@Component({
	selector: 'gg-login',
	standalone: true,
	imports: [FormsModule, RouterLink],
	templateUrl: './login.component.html',
	styleUrl: './login.component.scss',
})
export class LoginComponent {
	private readonly auth = inject(AuthService);
	private readonly router = inject(Router);

	public email = '';
	public password = '';
	public error = signal<string | null>(null);
	public loading = signal(false);

	public async submit(): Promise<void> {
		await this.try(() => this.auth.login(this.email, this.password));
	}

	public async continueAsGuest(): Promise<void> {
		await this.try(this.auth.loginAsGuest);
	}

	private async try(fn: () => Promise<void>) {
		this.error.set(null);
		this.loading.set(true);
		try {
			await fn();
			await this.router.navigate(['/']);
		} catch (err) {
			this.error.set((err as Error).message);
		} finally {
			this.loading.set(false);
		}
	}

	public async continueOffline() {

	}
}
