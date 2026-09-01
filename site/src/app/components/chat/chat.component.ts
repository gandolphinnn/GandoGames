import { afterRenderEffect, Component, computed, DestroyRef, effect, ElementRef, inject, input, signal, viewChildren } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe, NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonIcon, IonTextarea } from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';
import { ChatMessage } from '@gandogames/shared/dto';
import { RoomService, SignalRService, UserService } from '@gandogames/services';

@Component({
	selector: 'gg-chat',
	standalone: true,
	imports: [DatePipe, FormsModule, IonIcon, IonTextarea, NgTemplateOutlet, TranslatePipe],
	templateUrl: './chat.component.html',
	styleUrl: './chat.component.scss',
})
export class ChatComponent {
	private readonly roomService = inject(RoomService);
	private readonly signalR = inject(SignalRService);
	private readonly auth = inject(UserService);
	private readonly destroyRef = inject(DestroyRef);

	private readonly messageListRefs = viewChildren<ElementRef<HTMLElement>>('messageList');
	private shouldScroll = false;

	public readonly roomId = input.required<string>();
	public readonly chatHistory = input<ChatMessage[]>([]);
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
		effect(() => { this.messages.set(this.chatHistory()); });
		effect(() => {
			if (!this.currentRoom()) { this.open.set(false); this.unread.set(0); }
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
			this.scrollToBottom();
		});
	}

	protected toggle(): void {
		this.open.update(v => !v);
		if (this.open()) { this.unread.set(0); this.shouldScroll = true; }
	}

	protected close(): void { this.open.set(false); }

	private scrollToBottom(): void {
		for (const ref of this.messageListRefs()) {
			const el = ref.nativeElement;
			el.scrollTop = el.scrollHeight;
		}
	}

	protected onInputFocus(): void { this.shouldScroll = true; }

	protected async send(): Promise<void> {
		const text = this.text().trim();
		const room = this.currentRoom();
		if (!text || !room || this.sending()) return;
		this.sending.set(true);
		try {
			await this.roomService.sendChat(room.id, text);
			this.text.set('');
			this.shouldScroll = true;
		} finally {
			this.sending.set(false);
		}
	}

	protected onKeydown(e: KeyboardEvent): void {
		if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void this.send(); }
	}
}
