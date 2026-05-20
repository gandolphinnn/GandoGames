import { Injectable, signal } from '@angular/core';

const mobileRegex = /Android|iPhone|iPad|iPod/i;
const MOBILE_BREAKPOINT = 730; // keep in sync with $bp-sm in _variables.scss

@Injectable({ providedIn: 'root' })
export class DeviceService {
	public readonly isMobile = signal(
		mobileRegex.test(navigator.userAgent) || window.innerWidth < MOBILE_BREAKPOINT
	);
}
