import { inject, Service, signal } from '@angular/core';
import { RoomData, RoomSummary } from '../../../../shared/dto/room';
import { BaseRequest, RoomBaseRequest } from '@gandogames/shared/dto';
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
		const request: BaseRequest = { sessionTicket: this.ticket};
		const rooms = await this.backend.post<RoomData[]>('/moderator/rooms/list', request);
		this.rooms.set(rooms);
	}

	public async deleteRoom(roomId: string) {
		const request: RoomBaseRequest = { sessionTicket: this.ticket, roomId };
		const rooms = await this.backend.post<RoomData[]>('/moderator/rooms/delete', request);
		this.rooms.set(rooms);
	}
}
