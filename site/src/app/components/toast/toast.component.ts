import { Component, inject } from '@angular/core';
import { IonIcon } from '@ionic/angular';
import { TranslatePipe } from '@ngx-translate/core';
import { Toast, ToastService, ToastType } from '@gandogames/services';

const ICONS: Record<ToastType, string> = {
	info: 'information-circle',
	success: 'checkmark-circle',
	warning: 'warning',
	error: 'alert-circle',
	yesNo: 'help-circle',
};

@Component({
	selector: 'gg-toast',
	imports: [IonIcon, TranslatePipe],
	templateUrl: './toast.component.html',
	styleUrl: './toast.component.scss',
	standalone: true,
})
export class ToastComponent {
	public readonly toastService = inject(ToastService);

	public getIcon(toast: Toast): string {
		return ICONS[toast.type];
	}

	public onToastClick(toast: Toast): void {
		if (toast.type === 'yesNo')
			return;

		toast.resolve(true);
		//this.toastService.dismiss(toast.id);
	}

	public doYes(toast: Toast): void {
		toast.resolve(true);
		this.toastService.dismiss(toast.id);
	}

	public doNo(toast: Toast): void {
		toast.resolve(false);
		this.toastService.dismiss(toast.id);
	}
}
