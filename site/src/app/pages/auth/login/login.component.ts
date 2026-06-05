import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { IonButton, IonContent, IonInput } from '@ionic/angular/standalone';

import { UserService } from '@gandogames/services/user.service';

@Component({
	selector: 'gg-login',
	host: { class: 'ion-page' },
	imports: [IonButton, IonContent, IonInput, ReactiveFormsModule, RouterLink],
	templateUrl: './login.component.html',
	styleUrl: './login.component.scss',
})
export class LoginComponent {
	private readonly auth = inject(UserService);
	private readonly router = inject(Router);
	private readonly route = inject(ActivatedRoute);

	public readonly form = new FormGroup({
		email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
		password: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
	});

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
		this.loading.set(true);
		try {
			await fn();
			const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') ?? '/';
			await this.router.navigateByUrl(returnUrl);
		} finally {
			this.loading.set(false);
		}
	}
}
