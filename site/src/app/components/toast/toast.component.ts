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

const PROGRESSBAR_MIN_DURATION = 2000;
const PROGRESSBAR_TYPES: ToastType[] = [
	'yesNo',
];
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
	}

	public doYes(toast: Toast): void {
		toast.resolve(true);
	}

	public doNo(toast: Toast): void {
		toast.resolve(false);
	}

	public displayProgress(toast: Toast) {
		return toast.duration > PROGRESSBAR_MIN_DURATION && PROGRESSBAR_TYPES.includes(toast.type)
	}
}
