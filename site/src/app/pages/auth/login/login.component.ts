import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { BranchName, UserService, UrlService } from '@gandogames/services';
import { IonButton, IonContent, IonInput } from '@ionic/angular/standalone';


@Component({
	selector: 'gg-login',
	host: { class: 'ion-page' },
	imports: [IonButton, IonContent, IonInput, ReactiveFormsModule, RouterLink, TranslatePipe],
	templateUrl: './login.component.html',
	styleUrl: './login.component.scss',
})
export class LoginComponent {
	private readonly auth = inject(UserService);
	private readonly urlService = inject(UrlService);

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
			const returnUrl = this.urlService.get('login').currentVariables().returnUrl?.substring(1) ?? '';
			await this.urlService.get(returnUrl as BranchName).navigate();
		} finally {
			this.loading.set(false);
		}
	}
}
