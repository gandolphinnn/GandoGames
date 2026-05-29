import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { IonButton, IonContent, IonInput } from '@ionic/angular/standalone';

import { UserService } from '@gandogames/services/user.service';
import { ToastService } from '@gandogames/services/toast.service';

@Component({
	selector: 'gg-signup',
	host: { class: 'ion-page' },
	imports: [ReactiveFormsModule, RouterLink, IonButton, IonInput, IonContent],
	templateUrl: './signup.component.html',
	styleUrl: './signup.component.scss',
})
export class SignupComponent {
	private readonly auth = inject(UserService);
	private readonly router = inject(Router);
	private readonly route = inject(ActivatedRoute);
	private readonly toast = inject(ToastService);

	public readonly form = new FormGroup({
		username: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(3), Validators.maxLength(20)] }),
		email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
		password: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(6)] }),
	});

	public loading = signal(false);

	public async submit(): Promise<void> {
		if (this.form.invalid) return;
		const { username, email, password } = this.form.getRawValue();
		this.loading.set(true);
		try {
			await this.auth.register(email, password, username);
			const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') ?? '/';
			await this.router.navigateByUrl(returnUrl);
		} catch (err) {
			this.toast.error((err as Error).message);
		} finally {
			this.loading.set(false);
		}
	}
}
