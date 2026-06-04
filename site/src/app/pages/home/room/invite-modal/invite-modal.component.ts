import { Component, HostListener, input, output } from '@angular/core';
import { IonIcon } from '@ionic/angular/standalone';
import { GameType } from '@gandogames/shared/api';

@Component({
	selector: 'gg-invite-modal',
	imports: [IonIcon],
	templateUrl: './invite-modal.component.html',
	styleUrl: './invite-modal.component.scss',
})
export class InviteModalComponent {
	public readonly roomId = input.required<string>();
	public readonly gameType = input.required<GameType>();
	public readonly isHost = input.required<boolean>();
	public readonly playerCount = input.required<number>();
	public readonly maxPlayers = input.required<number>();

	public readonly closed = output<void>();

	@HostListener('document:keydown.escape')
	public onEscape(): void {
		this.closed.emit();
	}

	public onBackdropClick(): void {
		this.closed.emit();
	}
}
