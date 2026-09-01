import { AfterViewInit, Component, ComponentRef, computed, DestroyRef, effect, inject, input, OnInit, signal, ViewChild, ViewContainerRef } from '@angular/core';
import { outputToObservable, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { GameState, GameType } from '@gandogames/shared/dto';
import { GameComponent, GAME_REGISTRY } from '@gandogames/lib/game-registry';
import { SignalRService, RoomService, UserService, UrlService } from '@gandogames/services';

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
	private readonly roomService = inject(RoomService);
	private readonly auth = inject(UserService);
	private readonly urlService = inject(UrlService);
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

		outputToObservable(instance.playAgain)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe(() => void this.resetRoom());

		this.gameRef.set(ref);
	}

	private async loadGameState(): Promise<void> {
		try {
			const state = await this.roomService.getGameState(this.gameType(), this.roomId());
			this.gameState.set(state);
		} catch {
			// state arrives via SignalR when the next action occurs
		}
	}

	private async sendAction(action: string, data?: unknown): Promise<void> {
		this.loading.set(true);
		this.error.set(null);
		try {
			await this.roomService.gameAction(this.gameType(), this.roomId(), action, data);
		} catch (err) {
			this.error.set((err as Error).message);
		} finally {
			this.loading.set(false);
		}
	}

	private async resetRoom(): Promise<void> {
		try {
			await this.roomService.resetRoom(this.roomId());
			void this.urlService.get('play').navigate({ roomId: this.roomId() });
		} catch (err) {
			this.error.set((err as Error).message);
		}
	}
}
