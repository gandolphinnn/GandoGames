import { AfterViewInit, Component, ComponentRef, computed, DestroyRef, effect, inject, input, OnInit, output, signal, ViewChild, ViewContainerRef } from '@angular/core';
import { outputToObservable, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { GameState, GameId } from '@gandogames/shared/dto';
import { GameComponent, GAME_REGISTRY } from '@gandogames/lib/game-registry';
import { SignalRService, RoomService, UserService, UrlService, ToastService, GameService } from '@gandogames/services';

@Component({
	imports: [],
	selector: 'gg-game-shell',
	styleUrl: './game-shell.component.scss',
	templateUrl: './game-shell.component.html',
})
export class GameShellComponent implements OnInit, AfterViewInit {
	public readonly gameId = input.required<GameId>();
	public readonly descriptor = computed(() => GAME_REGISTRY[this.gameId()])
	public readonly roomId = input<string>();

	@ViewChild('gameSlot', { read: ViewContainerRef })
	private readonly gameSlot!: ViewContainerRef;

	private readonly signalR = inject(SignalRService);
	private readonly gameService = inject(GameService);
	private readonly roomService = inject(RoomService);
	private readonly auth = inject(UserService);
	private readonly urlService = inject(UrlService);
	private readonly destroyRef = inject(DestroyRef);

	private readonly gameState = signal<GameState | null>(null);
	private readonly loading = signal(false);
	private readonly myPlayFabId = computed(() => this.auth.user()?.player.id ?? null);
	private readonly gameRef = signal<ComponentRef<GameComponent> | null>(null);

	public readonly gameAction = output<{action: string, data?: unknown}>();

	constructor() {
		effect(() => {
			const ref = this.gameRef();
			if (!ref) return;
			ref.setInput('gameState', this.gameState());
			ref.setInput('loading', this.loading());
			ref.setInput('myPlayFabId', this.myPlayFabId());
		});
	}

	public async ngOnInit(): Promise<void> {
		this.signalR.events.gameStateUpdated
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe(({ roomId, state }) => {
				if (roomId === this.roomId()) this.gameState.set(state);
			});

		const state = await this.gameService.getGameState(this.gameId(), this.roomId());
		this.gameState.set(state);
	}

	public ngAfterViewInit(): void {
		const ref = this.gameSlot.createComponent(this.descriptor().component) as ComponentRef<GameComponent>;
		const instance = ref.instance;

		outputToObservable(instance.gameAction)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe(({ action, data }) => void this.sendAction(action, data));

		outputToObservable(instance.playAgain)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe(() => void this.playAgain());

		this.gameRef.set(ref);
	}

	private async sendAction(action: string, data?: unknown): Promise<void> {
		this.loading.set(true);
		try {
			await this.gameService.gameAction(this.gameId(), action, data, this.roomId());
		} finally {
			this.loading.set(false);
		}
	}

	private async playAgain(): Promise<void> {
		await this.gameService.reset(this.gameId(), this.roomId());
		//TODO probably do something with the room
	}
}
