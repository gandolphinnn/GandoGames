import { PlayFabData, PlayFabServer } from "playfab-sdk";
import { pfPromise } from "..";
import { GameState, GameId, RoomData } from "@gandogames/shared/dto";
import { PankovGameState } from "@gandogames/shared/pankov";
import { PokerGameState } from "@gandogames/shared/poker";
import { MastermindGameState } from "@gandogames/shared/mastermind";

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

interface PlayFabEntityHooks<T> {
	beforeUpsert?(id: string, value: T): void;
	afterParse?(value: T | null): void;
}

const HOOKS = {
	lastUpdate: <T extends { lastUpdate?: Date }>(): PlayFabEntityHooks<T> => ({
		beforeUpsert: (_id, value) => { value.lastUpdate = new Date() }
	}),
	//TODO if a PlayFabEntity gets this hook, it should not return a "T | null" but just a "T". Maybe hange it from "hooks" to "constraint"
	notNullable: <T>(msg?: string): PlayFabEntityHooks<T> => ({
		afterParse: (value) => { if (value == null) throw new Error(msg) }
	})
}


abstract class PlayFabEntity<T> {
	constructor(
		public readonly hooks: PlayFabEntityHooks<T>[],
	) {
	}

	protected parse(raw: string | undefined): T | null {
		const deserialized = raw ? JSON.parse(raw, (_key, value) => {
			if (typeof value === 'string' && DATE_REGEX.test(value))
				return new Date(value);
			return value;
		}) as T : null;

		this.hooks.forEach(h => h.afterParse?.(deserialized));
		return deserialized;
	}

	public abstract list(id?: string): Promise<T[] | null>;
	public abstract get(id: string): Promise<T | null>;
	public abstract upsert(id: string, value: T): Promise<PlayFabServerModels.UpdateSharedGroupDataResult>;
	public abstract delete(id: string): Promise<PlayFabServerModels.UpdateSharedGroupDataResult>;
}

class PlayFabSharedGroupEntity<T> extends PlayFabEntity<T> {
	protected hasInit = false;
	constructor(
		public readonly groupId: string,
		hooks: PlayFabEntityHooks<T>[] = [],
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
		this.hooks.forEach(async h => h.beforeUpsert?.(id, value));
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
		hooks: PlayFabEntityHooks<T>[] = [],
	) {
		super(hooks);
	}

	public async list(id: string) {
		if (!id) return null;
		const get = await this.get(id);
		return get? [get] : null;
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
		this.hooks.forEach(async h => h.beforeUpsert?.(id, value));

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
	public static readonly rooms = new PlayFabSharedGroupEntity<RoomData>('ROOMS_INDEX', [HOOKS.lastUpdate(), HOOKS.notNullable('Room not found')]);

	public static readonly game: Record<GameId, PlayFabEntity<GameState>> = {
		'mastermind': new PlayFabPlayerObjectEntity<MastermindGameState>('MASTERMIND_GAMES', [HOOKS.notNullable('Game not found')]),
		'pankov': new PlayFabSharedGroupEntity<PankovGameState>('PANKOV_GAMES_INDEX', [HOOKS.notNullable('Game not found')]),
		'poker': new PlayFabSharedGroupEntity<PokerGameState>('POKER_GAMES_INDEX', [HOOKS.notNullable('Game not found')]),
	}
}