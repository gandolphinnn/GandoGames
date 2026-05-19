import { Component, computed, HostListener, inject, input, OnInit, output, signal } from '@angular/core';
import {
	IonModal, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton, IonIcon,
	IonList, IonItem, IonLabel, IonAvatar,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { closeOutline, checkmarkOutline, addOutline, sendOutline } from 'ionicons/icons';

import { GameType } from '@gandogames/common/api';
import { playerNameHue } from '../../../../components/player-avatar/player-name-hue';
import { RoomService } from '@gandogames/services/room.service';
import { SignalRService } from '@gandogames/services/signalr.service';

@Component({
	selector: 'gg-invite-modal',
	imports: [
		IonModal, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton, IonIcon,
		IonList, IonItem, IonLabel, IonAvatar,
	],
	templateUrl: './invite-modal.component.html',
	styleUrl: './invite-modal.component.scss',
})
export class InviteModalComponent implements OnInit {
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

	protected readonly isOpen = signal(true);

	constructor() {
		addIcons({ closeOutline, checkmarkOutline, addOutline, sendOutline });
	}

	public ngOnInit(): void {
		this.isOpen.set(true);
	}

	@HostListener('document:keydown.escape')
	public onEscape(): void {
		this.closeModal();
	}

	public closeModal(): void {
		this.isOpen.set(false);
		this.closed.emit();
	}

	public async invite(name: string): Promise<void> {
		this.error.set('');
		this.invitingName.set(name);
		try {
			await this.roomService.invitePlayer(this.roomId(), name);
			this.invited.update(s => new Set([...s, name]));
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
			this.closeModal();
		} catch (e) {
			this.error.set((e as Error).message);
		} finally {
			this.addingBot.set(false);
		}
	}

	public readonly avatarHue = playerNameHue;
}
