import { afterRenderEffect, Component, computed, DestroyRef, effect, ElementRef, inject, input, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe, NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonInput } from '@ionic/angular/standalone';
import { ChatMessage } from '@gandogames/common/api';
import { AuthService } from '@gandogames/services/auth.service';
import { RoomService } from '@gandogames/services/room.service';
import { SignalRService } from '@gandogames/services/signalr.service';

@Component({
	selector: 'gg-chat',
	standalone: true,
	imports: [DatePipe, NgTemplateOutlet, FormsModule, IonInput],
	templateUrl: './chat.component.html',
	styleUrl: './chat.component.scss',
})
export class ChatComponent {
	private readonly roomService = inject(RoomService);
	private readonly signalR = inject(SignalRService);
	private readonly auth = inject(AuthService);
	private readonly destroyRef = inject(DestroyRef);

	private readonly messageListRef = viewChild<ElementRef<HTMLElement>>('messageList');
	private shouldScroll = false;

	public readonly roomId = input.required<string>();
	public readonly currentRoom = computed(() =>
		this.roomService.rooms().find(r => r.id === this.roomId()) ?? null
	);
	public readonly myId = computed(() => this.auth.user()?.player.id ?? '');

	protected readonly open = signal(false);
	protected readonly text = signal('');
	protected readonly sending = signal(false);
	protected readonly unread = signal(0);
	protected readonly messages = signal<ChatMessage[]>([]);

	constructor() {
		effect(() => {
			const room = this.currentRoom();
			this.messages.set(room?.chat ?? []);
			if (!room) { this.open.set(false); this.unread.set(0); }
		});

		this.signalR.events.chatMessage
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe(({ roomId, message }) => {
				if (roomId !== this.currentRoom()?.id) return;
				this.messages.update(msgs => {
					if (msgs.some(m => +m.timestamp === +message.timestamp && m.playerId === message.playerId)) return msgs;
					return [...msgs, message];
				});
				if (!this.open()) this.unread.update(n => n + 1);
				this.shouldScroll = true;
			});

		afterRenderEffect(() => {
			if (!this.shouldScroll) return;
			this.shouldScroll = false;
			const el = this.messageListRef()?.nativeElement;
			if (el) el.scrollTop = el.scrollHeight;
		});
	}

	protected toggle(): void {
		this.open.update(v => !v);
		if (this.open()) { this.unread.set(0); this.shouldScroll = true; }
	}

	protected close(): void { this.open.set(false); }

	protected async send(): Promise<void> {
		const text = this.text().trim();
		const room = this.currentRoom();
		if (!text || !room || this.sending()) return;
		this.sending.set(true);
		try {
			await this.roomService.sendChat(room.id, text);
			this.text.set('');
		} finally {
			this.sending.set(false);
		}
	}

	protected onKeydown(e: KeyboardEvent): void {
		if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void this.send(); }
	}
}
