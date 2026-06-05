import { Component } from '@angular/core';
import { ION_IMPORTS } from '@gandogames/lib/ion-imports';

@Component({
	selector: 'gg-about',
	host: { class: 'ion-page' },
	imports: [...ION_IMPORTS],
	templateUrl: './about.component.html',
	styleUrl: './about.component.scss',
})
export class AboutComponent {}
