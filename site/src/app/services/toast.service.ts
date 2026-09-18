import { computed, Service, signal } from '@angular/core';

export type ToastType = 'info' | 'success' | 'warning' | 'error' | 'yesNo';

type ToastResolve = (result: boolean) => void;
export interface Toast {
	id: number;
	message: string;
	type: ToastType;
	resolve: ToastResolve;
}

const DEFAULT_INFO_DURATION = 2000;
const DEFAULT_ERROR_DURATION = 5000;
const DEFAULT_SUCCESS_DURATION = 2000;
const DEFAULT_WARNING_DURATION = 3500;
const DEFAULT_YESNO_DURATION = 30000;

@Service()
export class ToastService {
	private nextId = 0;
	private readonly _toasts = signal<Toast[]>([]);
	public readonly toasts = this._toasts.asReadonly();

	public info(message: string, duration = DEFAULT_INFO_DURATION): Promise<boolean> {
		return this.add(message, 'info', duration);
	}

	public success(message: string, duration = DEFAULT_SUCCESS_DURATION): Promise<boolean> {
		return this.add(message, 'success', duration);
	}

	public warning(message: string, duration = DEFAULT_WARNING_DURATION): Promise<boolean> {
		return this.add(message, 'warning', duration);
	}

	public error(error: string | Error, duration = DEFAULT_ERROR_DURATION): Promise<boolean> {
		const message = error instanceof Error ? error.message : error;
		return this.add(message, 'error', duration);
	}

	public yesNo(message: string, duration = DEFAULT_YESNO_DURATION): Promise<boolean> {
		/* const yesNoToasts = this.toasts().filter(t => t.type == 'yesNo');
		yesNoToasts.forEach(t => {
			t.resolve(false);
			this.dismiss(t.id);
		}); */
		return this.add(message, 'yesNo', duration);
	}
	
	public dismiss(id: number): void {
		this._toasts.update(t => t.filter(toast => toast.id !== id));
	}
	
	// TODO: add a progress bar counting down the 30 seconds until auto-dismissal, to make it more clear to the user that this is a time-sensitive prompt.
	private add(message: string, type: ToastType, duration: number): Promise<boolean> {
		return new Promise(resolve => {
			const id = this.nextId++;
			const newToast: Toast = {
				id, message, type, resolve
			};
			this._toasts.update(t => [...t, newToast]);
			if (duration > 0)
				setTimeout(() => { this.dismiss(id); resolve(false); }, duration);
		});
	}
}
