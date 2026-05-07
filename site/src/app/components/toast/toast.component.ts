import { Component, inject } from '@angular/core';
import { Toast, ToastService } from '@gandogames/services/toast.service';

const ICONS: Record<string, string> = {
	info: 'fa-solid fa-circle-info',
	success: 'fa-solid fa-circle-check',
	warning: 'fa-solid fa-triangle-exclamation',
	error: 'fa-solid fa-circle-exclamation',
};

@Component({
	selector: 'gg-toast',
	templateUrl: './toast.component.html',
	styleUrl: './toast.component.scss',
	standalone: true,
})
export class ToastComponent {
	public readonly toastService = inject(ToastService);

	public getIcon(toast: Toast): string {
		return toast.yesno ? 'fa-solid fa-circle-question' : (ICONS[toast.type] ?? '');
	}

	public onToastClick(toast: Toast): void {
		if (!toast.yesno) this.toastService.dismiss(toast.id);
	}

	public doYes(toast: Toast): void {
		toast.resolve?.(true);
		this.toastService.dismiss(toast.id);
	}

	public doNo(toast: Toast): void {
		toast.resolve?.(false);
		this.toastService.dismiss(toast.id);
	}
}
