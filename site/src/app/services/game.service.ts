import { inject, Service } from '@angular/core';
import { API, GameActionRequest, GameId, GameSettings, GameSettingsSetRequest, GameState, GameRequest, RoomData } from '@gandogames/shared/dto';
import { BackendService, SignalRService, UserService } from '@gandogames/services';

@Service()
export class GameService {
	private readonly auth = inject(UserService);
	private readonly backend = inject(BackendService);
	private readonly signalR = inject(SignalRService);


	public getGameState(gameId: GameId, roomId?: string): Promise<GameState | null> {
		const request: GameRequest = { roomId };
		return this.backend.call(API.game.state, { params: { gameId }, body: request });
	}

	public gameAction(gameId: GameId, action: string, data?: unknown, roomId?: string): Promise<GameState | null> {
		const request: GameActionRequest = { action, data: data ?? null, roomId };
		return this.backend.call(API.game.action, { params: { gameId }, body: request });
	}

	public setGameSettings(gameId: GameId, settings: GameSettings, roomId?: string): Promise<RoomData> {
		const request: GameSettingsSetRequest = { settings, roomId };
		return this.backend.call(API.game.setSettings, { params: { gameId }, body: request });
	}

	public reset(gameId: GameId, roomId?: string) {
		const request: GameRequest = { roomId };
		return this.backend.call(API.game.reset, { params: { gameId }, body: request });
	}
}
