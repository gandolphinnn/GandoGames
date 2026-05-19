import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
	IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton, IonIcon,
	IonList, IonItem, IonLabel, IonNote, IonBadge, IonFab, IonFabButton, IonRefresher, IonRefresherContent,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { addCircleOutline, arrowBackOutline, refreshOutline, closeOutline } from 'ionicons/icons';

import { GameType, RoomData } from '@gandogames/common/api';
import { GAME_REGISTRY } from '@gandogames/lib/game-registry';
import { RoomService } from '@gandogames/services/room.service';
import { DeviceService } from '@gandogames/services/device.service';

@Component({
	selector: 'gg-room-list',
	host: { '[class.ion-page]': 'device.isMobile()' },
	imports: [
		IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton, IonIcon,
		IonList, IonItem, IonLabel, IonNote, IonBadge, IonFab, IonFabButton,
		IonRefresher, IonRefresherContent,
	],
	templateUrl: './room-list.component.html',
	styleUrl: './room-list.component.scss',
})
export class RoomListComponent implements OnInit {
	private readonly route = inject(ActivatedRoute);
	private readonly router = inject(Router);
	private readonly roomService = inject(RoomService);
	protected readonly device = inject(DeviceService);

	public readonly allGames = GAME_REGISTRY;
	public readonly activeGames = signal<string[]>([]);
	public readonly rooms = this.roomService.rooms;
	public readonly loading = signal(false);
	public readonly error = signal('');
	public readonly mode = signal<'browse' | 'create'>('browse');
	public readonly createGameId = signal('');

	public readonly filteredRooms = computed(() => {
		const active = this.activeGames();
		return this.rooms().filter((r) => active.includes(r.game));
	});

	constructor() {
		addIcons({ addCircleOutline, arrowBackOutline, refreshOutline, closeOutline });
	}

	public gameLabel(id: string): string {
		return this.allGames.find((g) => g.id === id)?.name ?? id;
	}

	public gameIcon(id: string): string {
		return this.allGames.find((g) => g.id === id)?.icon ?? 'fa-solid fa-gamepad';
	}

	public maxPlayers(id: string): number {
		return this.allGames.find((g) => g.id === id)?.maxPlayers ?? 0;
	}

	public playerNames(room: RoomData): string {
		return room.players.map((p) => p.name).join(', ');
	}

	public ngOnInit(): void {
		const paramGameId = this.route.snapshot.params['gameId'] as string | undefined;
		this.activeGames.set(paramGameId ? [paramGameId] : this.allGames.map((g) => g.id));
		this.createGameId.set(paramGameId ?? this.allGames[0]?.id ?? '');
		void this.fetchRooms();
	}

	private async fetchRooms(): Promise<void> {
		try {
			this.loading.set(true);
			await this.roomService.loadRooms();
		} catch (e) {
			this.error.set((e as Error).message);
		} finally {
			this.loading.set(false);
		}
	}

	public async handleRefresh(event: CustomEvent): Promise<void> {
		await this.fetchRooms();
		(event.target as HTMLIonRefresherElement).complete();
	}

	public toggleGame(id: string): void {
		const active = this.activeGames();
		if (active.includes(id)) {
			if (active.length === 1) return;
			this.activeGames.set(active.filter((g) => g !== id));
		} else {
			this.activeGames.set([...active, id]);
		}
	}

	public async create(): Promise<void> {
		if (!this.createGameId()) return;
		try {
			this.loading.set(true);
			this.error.set('');
			const room = await this.roomService.createRoom(this.createGameId() as GameType);
			void this.router.navigate(['/play', room.id]);
		} catch (e) {
			this.error.set((e as Error).message);
		} finally {
			this.loading.set(false);
		}
	}

	public navigateToRoom(room: RoomData): void {
		void this.router.navigate(['/play', room.id]);
	}

	public setCreateGameId(value: string): void {
		this.createGameId.set(value);
	}
}
