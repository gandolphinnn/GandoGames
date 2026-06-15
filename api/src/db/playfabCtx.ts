import { GameState, GameType, RoomData } from "@gandogames/shared/api";
import { PankovGameState } from "@gandogames/shared/pankov";
import { PokerGameState } from "@gandogames/shared/poker";
import { pfPromise, PlayFabServer } from "..";

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

export interface PlayFabEntityHooks<T> {
	onParse?(value: T | null): T | null;
	beforeUpsert?(id: string, value: T): void | Promise<void>;
}

class PlayFabEntity<T> {

	constructor(
		public readonly groupId: string,
		public readonly hooks: PlayFabEntityHooks<T> = {},
	) {
	}
	
	private parse(raw: string | undefined): T | null {
		const deserialized = raw ? JSON.parse(raw, (_key, value) => {
			if (typeof value === 'string' && DATE_REGEX.test(value))
				return new Date(value);
			return value;
		}) as T : null;
		return this.hooks.onParse ? this.hooks.onParse(deserialized) : deserialized;
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
		if (this.hooks.beforeUpsert) await this.hooks.beforeUpsert(id, value);
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
	public static readonly rooms = new PlayFabEntity<RoomData>('ROOMS_INDEX', {
		beforeUpsert: (_id, value) => { value.lastUpdate = new Date() }
	});

	public static readonly game: Record<GameType, PlayFabEntity<GameState>> = {
		'pankov': new PlayFabEntity<PankovGameState>('PANKOV_GAMES_INDEX'),
		'poker': new PlayFabEntity<PokerGameState>('POKER_GAMES_INDEX'),
	}
}