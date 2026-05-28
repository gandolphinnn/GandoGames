import { Component, computed, HostListener, inject, input, output, signal } from '@angular/core';
import { IonIcon } from '@ionic/angular/standalone';
import { GameType } from '@gandogames/common/api';
import { RoomService } from '@gandogames/services/room.service';

@Component({
	selector: 'gg-invite-modal',
	imports: [IonIcon],
	templateUrl: './invite-modal.component.html',
	styleUrl: './invite-modal.component.scss',
})
export class InviteModalComponent {
	private readonly roomService = inject(RoomService);

	public readonly roomId = input.required<string>();
	public readonly gameType = input.required<GameType>();
	public readonly isHost = input.required<boolean>();
	public readonly playerCount = input.required<number>();
	public readonly maxPlayers = input.required<number>();

	public readonly closed = output<void>();

	public readonly canAddBot = computed(() =>
		this.isHost() && this.playerCount() < this.maxPlayers()
	);

	public readonly addingBot = signal(false);
	public readonly error = signal('');

	@HostListener('document:keydown.escape')
	public onEscape(): void {
		this.closed.emit();
	}

	public onBackdropClick(): void {
		this.closed.emit();
	}

	public async addBot(): Promise<void> {
		this.error.set('');
		this.addingBot.set(true);
		try {
			await this.roomService.addBot(this.roomId());
			this.closed.emit();
		} catch (e) {
			this.error.set((e as Error).message);
		} finally {
			this.addingBot.set(false);
		}
	}
}
