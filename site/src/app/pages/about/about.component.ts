import { Component } from '@angular/core';
import { BASE_IMPORTS } from '@gandogames/lib/ion-imports';

@Component({
	selector: 'gg-about',
	host: { class: 'ion-page' },
	imports: [...BASE_IMPORTS],
	templateUrl: './about.component.html',
	styleUrl: './about.component.scss',
})
export class AboutComponent {}
