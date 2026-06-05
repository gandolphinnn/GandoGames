import { AfterViewInit, Component, ComponentRef, computed, DestroyRef, effect, inject, input, OnInit, signal, ViewChild, ViewContainerRef } from '@angular/core';
import { outputToObservable, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { GameActionRequest, GameBaseRequest, GameState, GameType, RoomBaseRequest } from '@gandogames/shared/api';
import { GameComponent, GAME_REGISTRY } from '@gandogames/lib/game-registry';
import { UserService } from '@gandogames/services/user.service';
import { BackendService } from '@gandogames/services/backend.service';
import { SignalRService } from '@gandogames/services/signalr.service';

@Component({
	selector: 'gg-room-game',
	standalone: true,
	imports: [],
	templateUrl: './room-game.component.html',
	styleUrl: './room-game.component.scss',
})
export class RoomGameComponent implements OnInit, AfterViewInit {
	public readonly roomId = input.required<string>();
	public readonly gameType = input.required<GameType>();

	@ViewChild('gameSlot', { read: ViewContainerRef })
	private readonly gameSlot!: ViewContainerRef;

	private readonly signalR = inject(SignalRService);
	private readonly backend = inject(BackendService);
	private readonly auth = inject(UserService);
	private readonly router = inject(Router);
	private readonly destroyRef = inject(DestroyRef);

	private readonly gameState = signal<GameState | null>(null);
	private readonly loading = signal(false);
	private readonly error = signal<string | null>(null);
	private readonly myPlayFabId = computed(() => this.auth.user()?.player.id ?? null);
	private readonly gameRef = signal<ComponentRef<unknown> | null>(null);

	constructor() {
		effect(() => {
			const ref = this.gameRef();
			if (!ref) return;
			ref.setInput('gameState', this.gameState());
			ref.setInput('loading', this.loading());
			ref.setInput('error', this.error());
			ref.setInput('myPlayFabId', this.myPlayFabId());
		});
	}

	public ngOnInit(): void {
		void this.loadGameState();
		this.signalR.events.gameStateUpdated
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe(({ roomId, state }) => {
				if (roomId === this.roomId()) this.gameState.set(state);
			});
	}

	public ngAfterViewInit(): void {
		const ref = this.gameSlot.createComponent(GAME_REGISTRY[this.gameType()].component);
		const instance = ref.instance as GameComponent;

		outputToObservable(instance.gameAction)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe(({ action, data }) => void this.sendAction(action, data));

		outputToObservable(instance.back)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe(() => this.backToLobby());

		outputToObservable(instance.playAgain)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe(() => void this.resetRoom());

		this.gameRef.set(ref);
	}

	private async loadGameState(): Promise<void> {
		try {
			const request: GameBaseRequest = { sessionTicket: this.sessionTicket, game: this.gameType(), roomId: this.roomId() };
			const state = await this.backend.post<GameState>('/game/state', request);
			this.gameState.set(state);
		} catch {
			// state arrives via SignalR when the next action occurs
		}
	}

	private async sendAction(action: string, data?: unknown): Promise<void> {
		this.loading.set(true);
		this.error.set(null);
		try {
			const request: GameActionRequest = { sessionTicket: this.sessionTicket, game: this.gameType(), roomId: this.roomId(), action, data: data ?? null };
			await this.backend.post<void>('/game/action', request);
		} catch (err) {
			this.error.set((err as Error).message);
		} finally {
			this.loading.set(false);
		}
	}

	protected backToLobby(): void {
		void this.router.navigate(['/play']);
	}

	private async resetRoom(): Promise<void> {
		try {
			const request: RoomBaseRequest = { sessionTicket: this.sessionTicket, roomId: this.roomId() };
			await this.backend.post<void>('/rooms/reset', request);
			void this.router.navigate(['/play', this.roomId()]);
		} catch (err) {
			this.error.set((err as Error).message);
		}
	}

	private get sessionTicket(): string {
		const user = this.auth.user();
		if (!user) throw new Error('Not logged in');
		return user.sessionTicket;
	}
}
