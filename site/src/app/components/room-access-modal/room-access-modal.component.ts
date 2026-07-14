import { Component, effect, HostListener, inject, input, output, signal } from '@angular/core';
import { IonIcon } from '@ionic/angular/standalone';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { RoomAccessPolicy } from '@gandogames/shared/dto';
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

	public readonly roomId = input.required<string>();
	public readonly access = input<RoomAccessPolicy>('public');
	/** Whether the viewer (the host) may edit; otherwise the form is read-only. */
	public readonly editable = input<boolean>(false);

	public readonly closed = output<void>();

	public readonly options = ROOM_ACCESS_OPTIONS;

	/** Working copy, re-seeded whenever the room's access input settles (e.g. a SignalR update). */
	public readonly selected = signal<RoomAccessPolicy>('public');
	public readonly saving = signal(false);

	constructor() {
		effect(() => this.selected.set(this.access()));
	}

	public choose(value: RoomAccessPolicy): void {
		if (this.editable()) this.selected.set(value);
	}

	public async save(): Promise<void> {
		if (!this.editable() || this.saving()) return;
		this.saving.set(true);
		try {
			await this.roomService.setRoomAccess(this.roomId(), this.selected());
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
