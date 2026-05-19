import { inject, Injectable } from '@angular/core';
import { AlertController, ToastController } from '@ionic/angular/standalone';

export type ToastType = 'info' | 'success' | 'warning' | 'error';

// Kept for backward compat — no longer used internally
export interface Toast {
	id: number;
	message: string;
	type: ToastType;
	yesno?: boolean;
	resolve?: (result: boolean) => void;
}

const ION_COLOR: Record<ToastType, string> = {
	info: 'primary',
	success: 'success',
	warning: 'warning',
	error: 'danger',
};

@Injectable({ providedIn: 'root' })
export class ToastService {
	private readonly toastCtrl = inject(ToastController);
	private readonly alertCtrl = inject(AlertController);
	private readonly progressRefs = new Map<number, Promise<HTMLIonToastElement>>();
	private nextId = 0;

	public show(message: string, type: ToastType = 'info', duration = 4000): void {
		void this.toastCtrl.create({
			message,
			duration: duration > 0 ? duration : 0,
			color: ION_COLOR[type],
			position: 'top',
			swipeGesture: 'vertical',
			buttons: [{ icon: 'close', role: 'cancel' }],
		}).then(t => t.present());
	}

	public error(message: string | Error): void {
		this.show(message instanceof Error ? message.message : message, 'error', 0);
	}

	public success(message: string, duration = 5000): void {
		this.show(message, 'success', duration);
	}

	public warning(message: string, duration = 5000): void {
		this.show(message, 'warning', duration);
	}

	public progress(message: string): number {
		const id = this.nextId++;
		const ref = this.toastCtrl.create({
			message,
			duration: 0,
			color: 'primary',
			position: 'top',
		}).then(async (t) => { await t.present(); return t; });
		this.progressRefs.set(id, ref);
		return id;
	}

	public dismiss(id: number): void {
		const ref = this.progressRefs.get(id);
		if (ref) {
			void ref.then(t => t.dismiss());
			this.progressRefs.delete(id);
		}
	}

	public yesNo(message: string): Promise<boolean> {
		return new Promise(async (resolve) => {
			const alert = await this.alertCtrl.create({
				message,
				cssClass: 'gg-alert',
				buttons: [
					{ text: 'No', role: 'cancel', handler: () => { resolve(false); } },
					{ text: 'Yes', role: 'confirm', cssClass: 'alert-btn-confirm', handler: () => { resolve(true); } },
				],
			});
			await alert.present();
			setTimeout(async () => { await alert.dismiss(); resolve(false); }, 30000);
		});
	}
}
