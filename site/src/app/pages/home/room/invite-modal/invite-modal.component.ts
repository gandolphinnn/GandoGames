import { Component, computed, HostListener, inject, input, output, signal } from '@angular/core';
import { GameType } from '@gandogames/common/api';
import { RoomService } from '@gandogames/services/room.service';
import { SignalRService } from '@gandogames/services/signalr.service';

@Component({
	selector: 'gg-invite-modal',
	templateUrl: './invite-modal.component.html',
	styleUrl: './invite-modal.component.scss',
})
export class InviteModalComponent {
	private readonly roomService = inject(RoomService);
	private readonly signalR = inject(SignalRService);

	public readonly roomId = input.required<string>();
	public readonly gameType = input.required<GameType>();
	public readonly roomPlayerNames = input.required<string[]>();
	public readonly isHost = input.required<boolean>();
	public readonly playerCount = input.required<number>();
	public readonly maxPlayers = input.required<number>();

	public readonly closed = output<void>();

	public readonly availablePlayers = computed(() =>
		this.signalR.onlineUsers().filter(name => !this.roomPlayerNames().includes(name))
	);

	public readonly canAddBot = computed(() =>
		this.isHost() && this.playerCount() < this.maxPlayers()
	);

	public readonly invitingName = signal<string | null>(null);
	public readonly invited = signal<Set<string>>(new Set());
	public readonly addingBot = signal(false);
	public readonly error = signal('');

	@HostListener('document:keydown.escape')
	public onEscape(): void {
		this.closed.emit();
	}

	public onBackdropClick(): void {
		this.closed.emit();
	}

	public async invite(name: string): Promise<void> {
		this.error.set('');
		this.invitingName.set(name);
		try {
			await this.roomService.invitePlayer(this.roomId(), name);
			this.invited.update(s => { const ns = new Set(s); ns.add(name); return ns; });
		} catch (e) {
			this.error.set((e as Error).message);
		} finally {
			this.invitingName.set(null);
		}
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

	public avatarHue(name: string): number {
		let hash = 0;
		for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) & 0xffff;
		return hash % 360;
	}
}
