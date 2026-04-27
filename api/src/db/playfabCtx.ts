import { GameState, GameType, RoomData } from "@gandogames/common/api";
import { MorraGameState } from "@gandogames/common/morra";
import { pfPromise, PlayFabClient, PlayFabServer } from "..";

class PlayFabEntity<T> {
	constructor(
		public readonly groupId: string
	) {
	}
	
	private parse(raw: string | undefined) {
		return this.OnDeserialized(raw ? JSON.parse(raw) as T : null);
	}

	protected OnDeserialized(value: T | null): T | null {
		// can be overridden to do some processing after deserialization
		return value;
	}
	
	private hasInit = false;
	/** Init the entity shared group ensuring it exists */
	private async init(): Promise<void> {
		if (this.hasInit)
			return;

		this.hasInit = true;
		try {
			await pfPromise<PlayFabServerModels.CreateSharedGroupResult>(
				cb => PlayFabServer.CreateSharedGroup({ SharedGroupId: this.groupId }, cb),
			);
		} catch (err) {
		}
	}
	
	public async list(): Promise<T[]> {
		await this.init();
		try {
			const result = await pfPromise<PlayFabServerModels.GetSharedGroupDataResult>(
				cb => PlayFabServer.GetSharedGroupData({ SharedGroupId: this.groupId }, cb),
			);
			const values = Object.values(result.Data ?? {});
			return values.map(v => this.parse(v.Value)).filter(r => r != null);
		} catch {
			return [];
		}
	}

	public async get(id: string): Promise<T | null> {
		await this.init();
		try {
			const result = await pfPromise<PlayFabServerModels.GetSharedGroupDataResult>(
				cb => PlayFabServer.GetSharedGroupData({ SharedGroupId: this.groupId, Keys: [id] }, cb),
			);
			return this.parse(result.Data?.[id]?.Value);
		} catch {
			return null;
		}
	}

	public async upsert(id: string, value: T): Promise<PlayFabServerModels.UpdateSharedGroupDataResult> {
		await this.init();
		const data = {
			[id]: JSON.stringify(value),
		}
		return await pfPromise<PlayFabServerModels.UpdateSharedGroupDataResult>(
			cb => PlayFabServer.UpdateSharedGroupData({ SharedGroupId: this.groupId, Data: data }, cb),
		);
	}
	
	public async delete(id: string): Promise<PlayFabServerModels.UpdateSharedGroupDataResult> {
		await this.init();
		return await pfPromise<PlayFabServerModels.UpdateSharedGroupDataResult>(
			cb => PlayFabServer.UpdateSharedGroupData({ SharedGroupId: this.groupId, KeysToRemove: [id] }, cb),
		);
	}

	public async exists(id: string): Promise<boolean> {
		await this.init();
		try {
			const result = await pfPromise<PlayFabServerModels.GetSharedGroupDataResult>(
				cb => PlayFabServer.GetSharedGroupData({ SharedGroupId: this.groupId, Keys: [id] }, cb),
			);
			return !!result.Data?.[id]?.Value;
		} catch {
			return false;
		}
	}
}

export class PlayfabCtx {
	public static readonly rooms = new PlayFabEntity<RoomData>('ROOMS_INDEX')

	public static readonly game: Record<GameType, PlayFabEntity<GameState>> = {
		'morra': new PlayFabEntity<MorraGameState>('MORRA_GAMES_INDEX'),
	}
}