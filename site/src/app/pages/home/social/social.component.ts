import { Component } from '@angular/core';
import { IonButtons, IonHeader, IonIcon, IonMenuButton, IonTitle, IonToolbar } from '@ionic/angular/standalone';
import { RefreshableContentComponent } from '../../../components/refreshable-content/refreshable-content.component';

@Component({
	selector: 'gg-social',
	host: { class: 'ion-page' },
	imports: [IonHeader, IonToolbar, IonButtons, IonMenuButton, IonTitle, IonIcon, RefreshableContentComponent],
	templateUrl: './social.component.html',
	styleUrl: './social.component.scss',
})
export class SocialComponent {
	public readonly refreshFn = async (): Promise<void> => {
		// TODO: reload friends and friend requests
	};
}
