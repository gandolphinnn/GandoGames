import { Component, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import {
	IonModal, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton, IonIcon,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { closeOutline } from 'ionicons/icons';

import { type RoomHistoryEntry } from '@gandogames/common/api';

@Component({
	selector: 'gg-game-history',
	standalone: true,
	imports: [
		DatePipe,
		IonModal, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton, IonIcon,
	],
	templateUrl: './game-history.component.html',
	styleUrl: './game-history.component.scss',
})
export class GameHistoryComponent {
	public readonly entries = input.required<RoomHistoryEntry[]>();

	protected readonly open = signal(false);
	protected toggle(): void { this.open.update(v => !v); }
	protected close(): void { this.open.set(false); }

	constructor() {
		addIcons({ closeOutline });
	}
}
