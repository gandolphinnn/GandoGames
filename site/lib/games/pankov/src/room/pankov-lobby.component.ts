import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { RoomData } from '@gandogames/common/api';
import { AuthService } from '../../../../../src/app/services/auth.service';
import { PankovRoomService } from './pankov-room.service';

@Component({
	selector: 'gg-pankov-lobby',
	standalone: true,
	imports: [RouterLink],
	templateUrl: './pankov-lobby.component.html',
	styleUrl: './pankov-lobby.component.scss',
})
export class PankovLobbyComponent implements OnInit, OnDestroy {
	protected readonly room = inject(PankovRoomService);
	private readonly router = inject(Router);
	private readonly auth = inject(AuthService);

	protected readonly mode = signal<'browse' | 'create' | 'join'>('browse');
	protected readonly rooms = signal<RoomData[]>([]);
	protected readonly joiningRoomId = signal<string | null>(null);
	protected readonly roomName = signal('');
	protected readonly loading = signal(false);
	protected readonly loadingRooms = signal(false);
	protected readonly error = signal<string | null>(null);

	private pollHandle: ReturnType<typeof setInterval> | null = null;

	ngOnInit(): void {
		if (!this.auth.isLoggedIn()) {
			this.router.navigate(['/login']);
			return;
		}
		this.room.reset();
		void this.loadRooms();
		this.pollHandle = setInterval(() => { void this.loadRooms(); }, 5000);
	}

	ngOnDestroy(): void {
		if (this.pollHandle !== null) clearInterval(this.pollHandle);
	}

	private async loadRooms(): Promise<void> {
		this.loadingRooms.set(true);
		try {
			this.rooms.set(await this.room.fetchRooms());
		} catch {
			// silently fail — stale list is fine
		} finally {
			this.loadingRooms.set(false);
		}
	}

	protected startCreate(): void {
		this.joiningRoomId.set(null);
		this.roomName.set('');
		this.error.set(null);
		this.mode.set('create');
	}

	protected startJoin(roomId: string): void {
		this.joiningRoomId.set(roomId);
		this.error.set(null);
		this.mode.set('join');
	}

	protected back(): void {
		this.mode.set('browse');
		this.error.set(null);
	}

	protected updateRoomName(value: string): void {
		this.roomName.set(value);
	}

	protected async createRoom(): Promise<void> {
		if (!this.roomName().trim()) return;
		this.loading.set(true);
		this.error.set(null);
		try {
			const roomId = await this.room.createRoom(this.roomName().trim());
			this.router.navigate(['/play/pankov/room', roomId]);
		} catch (err) {
			this.error.set((err as Error).message);
		} finally {
			this.loading.set(false);
		}
	}

	protected async joinRoom(): Promise<void> {
		if (!this.joiningRoomId()) return;
		this.loading.set(true);
		this.error.set(null);
		try {
			const roomId = await this.room.joinRoom(this.joiningRoomId()!);
			this.router.navigate(['/play/pankov/room', roomId]);
		} catch (err) {
			this.error.set((err as Error).message);
		} finally {
			this.loading.set(false);
		}
	}
}
