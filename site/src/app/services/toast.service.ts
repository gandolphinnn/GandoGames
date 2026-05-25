import { Injectable, signal } from '@angular/core';

export type ToastType = 'info' | 'success' | 'warning' | 'error';

export interface Toast {
	id: number;
	message: string;
	type: ToastType;
	yesno?: boolean;
	resolve?: (result: boolean) => void;
}

const DEFAULT_DURATION = 4000;

@Injectable({ providedIn: 'root' })
export class ToastService {
	private nextId = 0;
	private readonly _toasts = signal<Toast[]>([]);
	public readonly toasts = this._toasts.asReadonly();

	public show(message: string, type: ToastType = 'info', duration = DEFAULT_DURATION): void {
		this.add({ message, type }, duration);
	}

	public error(message: string | Error, duration = DEFAULT_DURATION): void {
		this.add({ message: message instanceof Error ? message.message : message, type: 'error' }, duration);
	}

	public success(message: string, duration = DEFAULT_DURATION): void {
		this.add({ message, type: 'success' }, duration);
	}

	public warning(message: string, duration = DEFAULT_DURATION): void {
		this.add({ message, type: 'warning' }, duration);
	}

	public progress(message: string): number {
		return this.add({ message, type: 'info' }, 0);
	}

	public yesNo(message: string): Promise<boolean> {
		return new Promise(resolve => {
			const id = this.add({ message, type: 'info', yesno: true, resolve }, 0);
			setTimeout(() => { this.dismiss(id); resolve(false); }, 30000);
		});
	}

	public dismiss(id: number): void {
		this._toasts.update(t => t.filter(toast => toast.id !== id));
	}

	private add(partial: Omit<Toast, 'id'>, duration: number): number {
		const id = this.nextId++;
		this._toasts.update(t => [...t, { id, ...partial }]);
		if (duration > 0) setTimeout(() => this.dismiss(id), duration);
		return id;
	}
}
