import { Component, input } from '@angular/core';
import { IonContent, IonRefresher, IonRefresherContent } from '@ionic/angular/standalone';
import type { IonRefresherCustomEvent, RefresherEventDetail } from '@ionic/core';

@Component({
	selector: 'gg-refreshable-content',
	host: { style: 'display: contents' },
	imports: [IonContent, IonRefresher, IonRefresherContent],
	template: `
		<ion-content [fullscreen]="fullscreen()" [scrollY]="scrollY()">
			@if (onRefresh()) {
				<ion-refresher slot="fixed" (ionRefresh)="handleRefresh($event)">
					<ion-refresher-content />
				</ion-refresher>
			}
			<ng-content />
		</ion-content>
	`,
})
export class RefreshableContentComponent {
	public readonly fullscreen = input(false);
	public readonly scrollY = input(true);
	public readonly onRefresh = input<(() => Promise<void>) | undefined>(undefined);

	protected async handleRefresh(event: IonRefresherCustomEvent<RefresherEventDetail>): Promise<void> {
		try {
			await this.onRefresh()?.();
		} finally {
			event.detail.complete();
		}
	}
}
