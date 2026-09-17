import { Component, effect, HostListener, inject, input, output, signal } from '@angular/core';
import { IonIcon } from '@ionic/angular';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { RoomAccessPolicy, RoomData } from '@gandogames/shared/dto';
import { ROOM_ACCESS_OPTIONS } from '@gandogames/lib/room-access';
import { RoomService, ToastService } from '@gandogames/services';

/**
 * Lets the host pick a room's access policy (public / friends-only / with-link / closed).
 * Everyone else sees the current choice read-only. Mirrors the game-settings modal pattern.
 */
@Component({
	selector: 'gg-room-access-modal',
	imports: [IonIcon, TranslatePipe],
	templateUrl: './room-access-modal.component.html',
	styleUrl: './room-access-modal.component.scss',
})
export class RoomAccessModalComponent {
	private readonly roomService = inject(RoomService);
	private readonly toast = inject(ToastService);
	private readonly translate = inject(TranslateService);

	public readonly room = input.required<RoomData>();

	public readonly closed = output<void>();

	public readonly options = ROOM_ACCESS_OPTIONS;

	/** Working copy, re-seeded whenever the room's access input settles (e.g. a SignalR update). */
	public readonly selected = signal<RoomAccessPolicy>('public');
	public readonly saving = signal(false);

	constructor() {
		effect(() => this.selected.set(this.room().access));
	}

	public async save(): Promise<void> {
		if (this.saving()) return;
		this.saving.set(true);
		try {
			await this.roomService.setRoomAccess(this.room().id, this.selected());
			this.toast.success(this.translate.instant('ACCESS_MODAL.SAVED') as string);
			this.closed.emit();
		} finally {
			this.saving.set(false);
		}
	}

	@HostListener('document:keydown.escape')
	public onEscape(): void {
		this.closed.emit();
	}

	public onBackdropClick(): void {
		this.closed.emit();
	}
}
