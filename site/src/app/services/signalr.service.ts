import { effect, inject, Injectable } from '@angular/core';
import { HubConnection, HubConnectionBuilder, HubConnectionState, LogLevel } from '@microsoft/signalr';
import { Subject } from 'rxjs';
import { API, ChatMessage, Friend, GameState, GameType, NegotiateResponse, RoomData, SignalREventHandler, SignalREventType } from '@gandogames/shared/dto';
import { BackendService } from './backend.service';
import { UserService } from './user.service';

@Injectable({ providedIn: 'root' })
export class SignalRService {
	private readonly userService = inject(UserService);
	private readonly backend = inject(BackendService);
	private connection?: HubConnection;
	private negotiateCache?: { response: NegotiateResponse; expiresAt: number };

	public readonly events = {
		roomUpsert: new Subject<RoomData>(),
		roomDeleted: new Subject<string>(),
		gameStateUpdated: new Subject<{ roomId: string; state: GameState }>(),
		chatMessage: new Subject<{ roomId: string; message: ChatMessage }>(),
		roomInvite: new Subject<{ roomId: string; game: GameType }>(),
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
		const res = await this.backend.call(API.signalr.negotiate, { query: { userId: user.player.id } });
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

			this.on('roomUpsert', (room) => this.events.roomUpsert.next(room));
			this.on('roomDeleted', (roomId) => this.events.roomDeleted.next(roomId));
			this.on('gameStateUpdated', (roomId, state) => this.events.gameStateUpdated.next({ roomId, state }));
			this.on('chatMessage', (roomId, message) => this.events.chatMessage.next({ roomId, message }));
			this.on('roomInvite', (roomId, game) => this.events.roomInvite.next({ roomId, game }));
			this.on('friendRequest', (from) => this.events.friendRequest.next(from));
			this.on('friendsChanged', () => this.events.friendsChanged.next());

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

	/** Registers a typed server→client event handler; its arguments are checked against `SignalREventArgs`. */
	private on<T extends SignalREventType>(event: T, handler: SignalREventHandler<T>): void {
		this.connection?.on(event, handler as (...args: unknown[]) => void);
	}

	private async disconnect(): Promise<void> {
		this.negotiateCache = undefined;
		await this.connection?.stop();
		this.connection = undefined;
	}
}
