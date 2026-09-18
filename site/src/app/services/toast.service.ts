import { computed, Service, signal } from '@angular/core';

export type ToastType = 'info' | 'success' | 'warning' | 'error' | 'yesNo';

export class Toast {

	public result: Promise<boolean>;
	private promiseResolver: (output: boolean) => void = (_= true) => {};

	constructor(
		public id: number,
		public message: string,
		public type: ToastType,
		public duration: number,
		private toastService: ToastService,
	) {
		this.result = new Promise(resolve => {
			this.promiseResolver = resolve;
			if (duration > 0)
				setTimeout(() => { this.resolve(false); }, duration);
		});
	}

	public resolve(output: boolean) {
		this.toastService.dismiss(this.id);
		this.promiseResolver(output);
	}
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

	public info(message: string, duration = DEFAULT_INFO_DURATION): Toast {
		return this.add(message, 'info', duration);
	}

	public success(message: string, duration = DEFAULT_SUCCESS_DURATION): Toast {
		return this.add(message, 'success', duration);
	}

	public warning(message: string, duration = DEFAULT_WARNING_DURATION): Toast {
		return this.add(message, 'warning', duration);
	}

	public error(error: string | Error, duration = DEFAULT_ERROR_DURATION): Toast {
		const message = error instanceof Error ? error.message : error;
		return this.add(message, 'error', duration);
	}

	public yesNo(message: string, duration = DEFAULT_YESNO_DURATION): Toast {
		const duplicateToasts = this.toasts().filter(t => t.type == 'yesNo' && t.message == message);
		duplicateToasts.forEach(t => {
			t.resolve(false);
			this.dismiss(t.id);
		});
		return this.add(message, 'yesNo', duration);
	}
	
	public dismiss(id: number): void {
		this._toasts.update(t => t.filter(toast => toast.id !== id));
	}
	
	private add(message: string, type: ToastType, duration: number): Toast {
		const id = this.nextId++;
		const newToast = new Toast(id, message, type, duration, this);
		this._toasts.update(t => [...t, newToast]);
		return newToast;
	}
}
