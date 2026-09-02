import { Component, computed, inject, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { ION_IMPORTS } from '@gandogames/lib/ion-imports';
import { ToastService, AdminService, UserService } from '@gandogames/services';
import { RefreshableContentComponent } from '@gandogames/components';
import { DatePipe } from '@angular/common';

@Component({
	selector: 'gg-admin',
	host: { class: 'ion-page' },
	imports: [...ION_IMPORTS, RefreshableContentComponent, DatePipe],
	templateUrl: './admin.component.html',
	styleUrl: './admin.component.scss',
})
export class AdminComponent {
	private readonly admin = inject(AdminService);
	private readonly user = inject(UserService);
	private readonly toast = inject(ToastService);
	private readonly translate = inject(TranslateService);

	public readonly locale = this.user.locale;
	public readonly loading = signal(false);
	public readonly rooms = computed(() => this.admin.rooms().map(room => {
		const host = room.players.find(u => u.id === room.hostId);
		return {
			id: room.id,
			host: host?.name ?? room.hostId,
			game: room.game,
			phase: room.phase,
			lastUpdate: room.lastUpdate
		}
	}));

	public ngOnInit(): void {
		void this.fetchRooms();
	}

	public readonly refreshFn = async (): Promise<void> => {
		await this.fetchRooms();
	};
	
	private async fetchRooms(): Promise<void> {
		try {
			this.loading.set(true);
			await this.admin.loadRooms();
		} finally {
			this.loading.set(false);
		}
	}
	
	public async deleteRoom(roomId: string) {
		try {
			this.loading.set(true);
			await this.admin.deleteRoom(roomId);
		} finally {
			this.loading.set(false);
		}
	}
}
