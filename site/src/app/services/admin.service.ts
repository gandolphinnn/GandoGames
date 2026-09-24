import { inject, Service, signal } from '@angular/core';
import { API, GameState, RoomSummary } from '@gandogames/shared/dto';
import { BackendService } from '@gandogames/services';

@Service()
export class AdminService {
	private readonly backend = inject(BackendService);
	
	public readonly rooms = signal<RoomSummary[]>([]);
	public readonly games = signal<GameState[]>([]);

	public async loadRooms() {
		const response = await this.backend.call(API.moderator.rooms.list);
		this.rooms.set(response.rooms);
		this.games.set(response.games);
	}

	public async deleteRoom(roomId: string) {
		const response = await this.backend.call(API.moderator.rooms.delete, { params: { roomId } });
		this.rooms.set(response.rooms);
		this.games.set(response.games);
	}
}
