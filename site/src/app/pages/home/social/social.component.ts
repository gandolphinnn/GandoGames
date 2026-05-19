import { Component, inject } from '@angular/core';
import {
	IonHeader, IonToolbar, IonTitle, IonContent,
	IonList, IonItem, IonLabel, IonIcon, IonListHeader,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { personAddOutline, mailOutline, peopleOutline } from 'ionicons/icons';

import { DeviceService } from '@gandogames/services/device.service';

@Component({
	selector: 'gg-social',
	host: { '[class.ion-page]': 'device.isMobile()' },
	imports: [
		IonHeader, IonToolbar, IonTitle, IonContent,
		IonList, IonItem, IonLabel, IonIcon, IonListHeader,
	],
	templateUrl: './social.component.html',
	styleUrl: './social.component.scss',
})
export class SocialComponent {
	protected readonly device = inject(DeviceService);

	constructor() {
		addIcons({ personAddOutline, mailOutline, peopleOutline });
	}
}
