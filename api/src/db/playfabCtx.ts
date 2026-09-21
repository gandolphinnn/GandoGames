import { PlayFabData, PlayFabServer } from "playfab-sdk";
import { pfPromise } from "..";
import { GameState, GameName, RoomData } from "@gandogames/shared/dto";
import { PankovGameState } from "@gandogames/shared/pankov";
import { PokerGameState } from "@gandogames/shared/poker";
import { MastermindGameState } from "@gandogames/shared/mastermind";

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

interface PlayFabEntityHooks<T> {
	beforeUpsert?(id: string, value: T): void | Promise<void>;
	afterParse?(value: T | null): T | null;
}

const HOOKS = {
	lastUpdate: <T extends { lastUpdate?: Date }>(): PlayFabEntityHooks<T> => ({
		beforeUpsert: (_id, value) => { value.lastUpdate = new Date() }
	})
}


abstract class PlayFabEntity<T> {
	constructor(
		public readonly hooks: PlayFabEntityHooks<T>,
	) {
	}

	protected parse(raw: string | undefined): T | null {
		const deserialized = raw ? JSON.parse(raw, (_key, value) => {
			if (typeof value === 'string' && DATE_REGEX.test(value))
				return new Date(value);
			return value;
		}) as T : null;
		return this.hooks.afterParse ? this.hooks.afterParse(deserialized) : deserialized;
	}

	public abstract get(id: string): Promise<T | null>;
	public abstract upsert(id: string, value: T): Promise<PlayFabServerModels.UpdateSharedGroupDataResult>;
	public abstract delete(id: string): Promise<PlayFabServerModels.UpdateSharedGroupDataResult>;
}

class PlayFabSharedGroupEntity<T> extends PlayFabEntity<T> {
	protected hasInit = false;
	constructor(
		public readonly groupId: string,
		hooks: PlayFabEntityHooks<T> = {},
	) {
		super(hooks);
	}

	/** Init the entity shared group ensuring it exists */
	protected async init(): Promise<void> {
		if (this.hasInit)
			return;

		this.hasInit = true;
		try {
			await pfPromise<PlayFabServerModels.CreateSharedGroupResult>(
				cb => PlayFabServer.CreateSharedGroup({ SharedGroupId: this.groupId }, cb),
			);
		} catch (err) {
			console.error(err);
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
}

class PlayFabPlayerObjectEntity<T> extends PlayFabEntity<T> {
	constructor(
		public readonly objectName: string,
		hooks: PlayFabEntityHooks<T> = {},
	) {
		super(hooks);
	}

	public async get(id: string): Promise<T | null> {
		try {
			const result = await pfPromise<PlayFabDataModels.GetObjectsResponse>(
				cb => PlayFabData.GetObjects({ Entity: { Id: id, Type: 'title_player_account' } }, cb),
			);
			return this.parse(result?.Objects?.[this.objectName]?.DataObject);
		} catch {
			return null;
		}
	}

	public async upsert(id: string, value: T): Promise<PlayFabServerModels.UpdateSharedGroupDataResult> {
		if (this.hooks.beforeUpsert) await this.hooks.beforeUpsert(id, value);

		return await pfPromise<PlayFabDataModels.SetObjectsResponse>(
			cb => PlayFabData.SetObjects({
				Entity: { Id: id, Type: 'title_player_account' },
				Objects: [
					{
						ObjectName: this.objectName,
						DataObject: value,
					}
				]
			}, cb),
		);
	}

	public async delete(id: string): Promise<PlayFabServerModels.UpdateSharedGroupDataResult> {
		return await pfPromise<PlayFabDataModels.SetObjectsResponse>(
			cb => PlayFabData.SetObjects({
				Entity: { Id: id, Type: 'title_player_account' },
				Objects: [
					{
						ObjectName: this.objectName,
						DeleteObject: true,
					}
				]
			}, cb),
		);
	}
}

export class PlayfabCtx {
	public static readonly rooms = new PlayFabSharedGroupEntity<RoomData>('ROOMS_INDEX', HOOKS.lastUpdate());

	public static readonly game: Record<GameName, PlayFabEntity<GameState>> = {
		'mastermind': new PlayFabPlayerObjectEntity<MastermindGameState>('MASTERMIND_GAMES', HOOKS.lastUpdate()),
		'pankov': new PlayFabSharedGroupEntity<PankovGameState>('PANKOV_GAMES_INDEX', HOOKS.lastUpdate()),
		'poker': new PlayFabSharedGroupEntity<PokerGameState>('POKER_GAMES_INDEX', HOOKS.lastUpdate()),
	}
}