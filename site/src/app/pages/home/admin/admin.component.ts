import { Component } from '@angular/core';
import { BASE_IMPORTS, ROUTING_IMPORTS } from '@gandogames/lib/ion-imports';
import { IonList } from '@ionic/angular';

@Component({
	selector: 'gg-admin',
	host: { class: 'ion-page' },
	imports: [...BASE_IMPORTS, ...ROUTING_IMPORTS, IonList],
	templateUrl: './admin.component.html',
	styleUrl: './admin.component.scss',
})
export class AdminComponent {

}
