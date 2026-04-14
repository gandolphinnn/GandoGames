import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../../services/auth.service';

@Component({
	selector: 'gg-login',
	standalone: true,
	imports: [ReactiveFormsModule, RouterLink],
	templateUrl: './login.component.html',
	styleUrl: './login.component.scss',
})
export class LoginComponent {
	private readonly auth = inject(AuthService);
	private readonly router = inject(Router);

	public readonly form = new FormGroup({
		email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
		password: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
	});

	public error = signal<string | null>(null);
	public loading = signal(false);

	public async submit(): Promise<void> {
		if (this.form.invalid) return;
		const { email, password } = this.form.getRawValue();
		await this.try(() => this.auth.login(email, password));
	}

	public async continueAsGuest(): Promise<void> {
		await this.try(() => this.auth.loginAsGuest());
	}

	private async try(fn: () => Promise<void>): Promise<void> {
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
}
