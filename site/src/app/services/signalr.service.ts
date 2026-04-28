import { effect, inject, Injectable } from '@angular/core';
import { HubConnection, HubConnectionBuilder, HubConnectionState, LogLevel } from '@microsoft/signalr';
import { Subject } from 'rxjs';
import { GameState, NegotiateResponse, RoomData, SignalREvent } from '@gandogames/common/api';
import { AuthService } from './auth.service';
import { BackendService } from './backend.service';

@Injectable({ providedIn: 'root' })
export class SignalRService {
	private readonly auth = inject(AuthService);
	private readonly backend = inject(BackendService);
	private connection?: HubConnection;

	public get connectionStatus() {
		return this.connection?.state;
	}

	public readonly events = {
		roomUpsert: new Subject<RoomData>(),
		roomDeleted: new Subject<string>(),
		gameStateUpdated: new Subject<GameState>(),
	}

	constructor() {
		effect(() => {
			const user = this.auth.user();
			if (user) void this.connect();
			else void this.disconnect();
		});
	}

	private async getNegotiateResponse(): Promise<NegotiateResponse> {
		const user = this.auth.user();
		if (!user) throw new Error('Not authenticated');
		const res = await this.backend.post<NegotiateResponse>(`/negotiate?userId=${encodeURIComponent(user.player.id)}`, { sessionTicket: user.sessionTicket });
		if (!res.url || !res.accessToken) throw new Error('SignalR negotiate failed');
		return res;
	}

	private async connect(): Promise<void> {
		if (
			this.connection?.state === HubConnectionState.Connected ||
			this.connection?.state === HubConnectionState.Connecting
		) return;

		await this.disconnect();

		try {
			const { url } = await this.getNegotiateResponse();

			this.connection = new HubConnectionBuilder()
				.withUrl(url, { accessTokenFactory: () => this.getNegotiateResponse().then(r => r.accessToken) })
				.withAutomaticReconnect()
				.configureLogging(LogLevel.Information)
				.build();

			this.connection.on('roomUpsert', (room) => this.events.roomUpsert.next(room));
			this.connection.on('roomDeleted', (roomId) => this.events.roomDeleted.next(roomId));
			this.connection.on('gameStateUpdated', (state) => this.events.gameStateUpdated.next(state));

			await this.connection.start();
		} catch (err) {
			console.error('SignalR connection failed:', err);
			this.connection = undefined;
		}
	}

	private async disconnect(): Promise<void> {
		await this.connection?.stop();
		this.connection = undefined;
	}
}
