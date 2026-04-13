import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../../services/auth.service';

@Component({
	selector: 'gg-signup',
	standalone: true,
	imports: [FormsModule, RouterLink],
	templateUrl: './signup.component.html',
	styleUrl: './signup.component.scss',
})
export class SignupComponent {
	private readonly auth = inject(AuthService);
	private readonly router = inject(Router);

	public email = '';
	public password = '';
	public username = '';
	public error = signal<string | null>(null);
	public loading = signal(false);

	public async submit(): Promise<void> {
		this.error.set(null);
		this.loading.set(true);
		try {
			await this.auth.register(this.email, this.password, this.username);
			await this.router.navigate(['/']);
		} catch (err) {
			this.error.set((err as Error).message);
		} finally {
			this.loading.set(false);
		}
	}
}
