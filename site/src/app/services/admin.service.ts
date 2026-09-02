import { inject, Service, signal } from '@angular/core';
import { RoomData } from '../../../../shared/dto/room';
import { API } from '@gandogames/shared/dto';
import { BackendService, SignalRService, UserService } from '@gandogames/services';

@Service()
export class AdminService {
	private readonly backend = inject(BackendService);
	private readonly signalR = inject(SignalRService);
	private readonly user = inject(UserService);
	
	private get ticket(): string {
		return this.user.user()!.sessionTicket;
	}

	public readonly rooms = signal<RoomData[]>([]);

	public async loadRooms() {
		const result = await this.backend.call(API.moderator.rooms.list);
		this.rooms.set(result);
	}

	public async deleteRoom(roomId: string) {
		const rooms = await this.backend.call(API.moderator.rooms.delete, { params: { roomId } });
		this.rooms.set(rooms);
	}
}
