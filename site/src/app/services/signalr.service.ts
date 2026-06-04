import { effect, inject, Injectable } from '@angular/core';
import { HubConnection, HubConnectionBuilder, HubConnectionState, LogLevel } from '@microsoft/signalr';
import { Subject } from 'rxjs';
import { ChatMessage, Friend, GameState, NegotiateResponse, RoomData, SignalREvent } from '@gandogames/common/api';
import { BackendService } from './backend.service';
import { UserService } from './user.service';

@Injectable({ providedIn: 'root' })
export class SignalRService {
	private readonly userService = inject(UserService);
	private readonly backend = inject(BackendService);
	private connection?: HubConnection;
	private negotiateCache?: { response: NegotiateResponse; expiresAt: number };

	public get connectionStatus() {
		return this.connection?.state;
	}

	public readonly events = {
		roomUpsert: new Subject<RoomData>(),
		roomDeleted: new Subject<string>(),
		gameStateUpdated: new Subject<{ roomId: string; state: GameState }>(),
		chatMessage: new Subject<{ roomId: string; message: ChatMessage }>(),
		roomInvite: new Subject<{ roomId: string; game: string }>(),
		friendRequest: new Subject<Friend>(),
		friendsChanged: new Subject<void>(),
	}

	constructor() {
		effect(() => {
			const user = this.userService.user();
			if (user) void this.connect();
			else void this.disconnect();
		});
	}

	private async getNegotiateResponse(): Promise<NegotiateResponse> {
		const now = Date.now();
		if (this.negotiateCache && now < this.negotiateCache.expiresAt) return this.negotiateCache.response;
		const user = this.userService.user();
		if (!user) throw new Error('Not authenticated');
		const res = await this.backend.post<NegotiateResponse>(`/signalr/negotiate?userId=${encodeURIComponent(user.player.id)}`, { sessionTicket: user.sessionTicket });
		if (!res.url || !res.accessToken) throw new Error('SignalR negotiate failed');
		this.negotiateCache = { response: res, expiresAt: now + 30_000 };
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
			this.connection.on('gameStateUpdated', (roomId: string, state: GameState) => this.events.gameStateUpdated.next({ roomId, state }));
			this.connection.on('chatMessage', (roomId: string, message: ChatMessage) => this.events.chatMessage.next({ roomId, message }));
			this.connection.on('roomInvite', (roomId: string, game: string) => this.events.roomInvite.next({ roomId, game }));
			this.connection.on('friendRequest', (from: Friend) => this.events.friendRequest.next(from));
			this.connection.on('friendsChanged', () => this.events.friendsChanged.next());

			// Re-negotiate after start so the broadcast arrives while the WS is open.
			// Also fires on reconnect so presence is restored after network drops.
			const refreshPresence = () => {
				this.negotiateCache = undefined;
				void this.getNegotiateResponse().catch(() => {});
			};
			await this.connection.start();
			this.connection.onreconnected(refreshPresence);
			refreshPresence();
		} catch (err) {
			console.error('SignalR connection failed:', err);
			this.connection = undefined;
		}
	}

	private async disconnect(): Promise<void> {
		this.negotiateCache = undefined;
		await this.connection?.stop();
		this.connection = undefined;
	}
}
