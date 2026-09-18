import { inject, Service, signal } from '@angular/core';
import { RoomData } from '../../../../shared/dto/room';
import { API, Label } from '@gandogames/shared/dto';
import { BackendService } from '@gandogames/services';

@Service()
export class AdminService {
	private readonly backend = inject(BackendService);

	public readonly rooms = signal<RoomData[]>([]);
	public async loadRooms() {
		const result = await this.backend.call(API.moderator.rooms.list);
		this.rooms.set(result);
	}
	public async deleteRoom(roomId: string) {
		const rooms = await this.backend.call(API.moderator.rooms.delete, { params: { roomId } });
		this.rooms.set(rooms);
	}

	public readonly labels = signal<Label[]>([]);
	public async loadLabels() {
		const result = await this.backend.call(API.moderator.labels.list);
		this.labels.set(result);
	}
	public async deleteLabel(labelId: string) {
		const labels = await this.backend.call(API.moderator.labels.delete, { params: { labelId } });
		this.labels.set(labels);
	}
}
