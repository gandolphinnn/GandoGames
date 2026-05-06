import { Injectable, signal } from '@angular/core';

export interface Toast {
	id: number;
	message: string;
	type: 'info' | 'warning' | 'error';
}

@Injectable({ providedIn: 'root' })
export class ToastService {
	private nextId = 0;
	private readonly _toasts = signal<Toast[]>([]);
	public readonly toasts = this._toasts.asReadonly();

	public show(message: string, type: Toast['type'] = 'info', duration = 4000): void {
		const id = this.nextId++;
		this._toasts.update(t => [...t, { id, message, type }]);
		setTimeout(() => this.dismiss(id), duration);
	}

	public dismiss(id: number): void {
		this._toasts.update(t => t.filter(toast => toast.id !== id));
	}
}
