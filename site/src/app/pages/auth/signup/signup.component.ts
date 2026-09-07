import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { BranchName, UserService, UrlService } from '@gandogames/services';
import { IonButton, IonContent, IonInput } from '@ionic/angular/standalone';


@Component({
	selector: 'gg-signup',
	host: { class: 'ion-page' },
	imports: [IonButton, IonContent, IonInput, ReactiveFormsModule, RouterLink, TranslatePipe],
	templateUrl: './signup.component.html',
	styleUrl: './signup.component.scss',
})
export class SignupComponent {
	private readonly auth = inject(UserService);
	private readonly urlService = inject(UrlService);

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
			const returnUrl = this.urlService.current()!.queryParams['returnUrl'];
		} finally {
			this.loading.set(false);
		}
	}
}
