import { Component, computed, effect, HostListener, inject, input, output, signal } from '@angular/core';
import { IonIcon, IonToggle } from '@ionic/angular/standalone';
import { GameSettings, GameType, SettingField, resolveSettings } from '@gandogames/shared/dto';
import { GAME_REGISTRY } from '@gandogames/lib/game-registry';
import { RoomService } from '@gandogames/services/room.service';
import { ToastService } from '@gandogames/services/toast.service';

/**
 * Schema-driven editor for a room's game settings. Renders the fields declared by
 * GAME_REGISTRY[game].settingsSchema, so it works for any game without per-game code. The host
 * edits and saves; everyone else sees the values read-only.
 */
@Component({
	selector: 'gg-game-settings-modal',
	imports: [IonIcon, IonToggle],
	templateUrl: './game-settings-modal.component.html',
	styleUrl: './game-settings-modal.component.scss',
})
export class GameSettingsModalComponent {
	private readonly roomService = inject(RoomService);
	private readonly toast = inject(ToastService);

	public readonly game = input.required<GameType>();
	public readonly roomId = input.required<string>();
	/** The room's current settings, used to pre-fill the form. */
	public readonly settings = input<GameSettings>({});
	/** Whether the viewer (the host) may edit; otherwise the form is read-only. */
	public readonly editable = input<boolean>(false);

	public readonly closed = output<void>();

	public readonly schema = computed<readonly SettingField[]>(() => GAME_REGISTRY[this.game()].settingsSchema);
	public readonly gameName = computed(() => GAME_REGISTRY[this.game()].name);

	/** Working copy the form mutates; seeded from the room's current (resolved) settings. */
	public readonly working = signal<GameSettings>({});
	public readonly saving = signal(false);

	constructor() {
		// Re-seed whenever the game/settings inputs settle (e.g. a SignalR room update arrives).
		effect(() => this.working.set(resolveSettings(this.schema(), this.settings())));
	}

	public num(key: string): number {
		return Number(this.working()[key] ?? 0);
	}

	public bool(key: string): boolean {
		return Boolean(this.working()[key]);
	}

	public onNumber(field: SettingField, event: Event): void {
		const n = parseInt((event.target as HTMLInputElement).value, 10);
		if (isNaN(n)) return;
		this.working.update(w => ({ ...w, [field.key]: n }));
	}

	public onToggle(field: SettingField, event: Event): void {
		const checked = (event as CustomEvent<{ checked: boolean }>).detail?.checked ?? false;
		this.working.update(w => ({ ...w, [field.key]: checked }));
	}

	public resetDefaults(): void {
		const defaults: GameSettings = {};
		for (const f of this.schema()) defaults[f.key] = f.default;
		this.working.set(defaults);
	}

	public async save(): Promise<void> {
		if (!this.editable() || this.saving()) return;
		this.saving.set(true);
		try {
			// Clamp/normalize once more before sending; the server validates again against the schema.
			const settings = resolveSettings(this.schema(), this.working());
			await this.roomService.setGameSettings(this.game(), this.roomId(), settings);
			this.toast.success('Game settings saved');
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
