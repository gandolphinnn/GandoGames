import { Injectable, signal } from '@angular/core';

const mobileRegex = /Android|iPhone|iPad|iPod/i;

@Injectable({ providedIn: 'root' })
export class DeviceService {
	public readonly isMobile = signal(mobileRegex.test(navigator.userAgent));
}
