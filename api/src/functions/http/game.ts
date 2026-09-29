import { API, GameId, GamePlayer, GAMES_CONFIG, GameSettings, GameSettingsSchema, GameState, resolveSettings, RoomData } from '@gandogames/shared/dto';
import { MASTERMIND_SETTINGS_SCHEMA } from '@gandogames/shared/mastermind';
import { PANKOV_SETTINGS_SCHEMA } from '@gandogames/shared/pankov';
import { POKER_SETTINGS_SCHEMA } from '@gandogames/shared/poker';
import { InnerFunction, PlayfabCtx, registerEndpoint } from '../..';
import { Game } from '../../games';

/**
 * Per-game settings schema, keyed by game type. The single backend-side lookup for validating a
 * host's settings edit (defaults are filled from each field's `default` by `resolveSettings`).
 * The site reaches the same schemas through the game registry, so both sides share one definition.
 */
const GAME_SETTINGS: Record<GameId, GameSettingsSchema> = {
	mastermind: MASTERMIND_SETTINGS_SCHEMA,
	pankov: PANKOV_SETTINGS_SCHEMA,
	poker: POKER_SETTINGS_SCHEMA,
};

async function getData(gameId: GameId, entityId: string, roomId?: string): Promise<[GameState | null, RoomData | null]> {
	const category = GAMES_CONFIG[gameId].category;
	if (category == 'room' && !roomId)
		throw new Error(`Missing room id`);
	if (category == 'single' && roomId)
		throw new Error(`Room id should not be provided`);

	const gamePlayFabEntity = PlayfabCtx.game[gameId];

	if (roomId) {
		return await Promise.all([
			gamePlayFabEntity.get(roomId!),
			PlayfabCtx.rooms.get(roomId!),
		]);
	}
	else {
		return [await gamePlayFabEntity.get(entityId), null];
	}
}

const gameStateInner: InnerFunction<typeof API.game.state> = async (body, params, _notifier, player) => {
	const gameId = params.gameId as GameId
	const [savedState, _] = await getData(gameId, player.entityId, body.roomId);
	console.log('@992907:', savedState);
	if (!savedState) return null;
	const game = Game.Factory(gameId);
	game.state = savedState;
	return game.getPublicState(player.id);
};

const gameActionInner: InnerFunction<typeof API.game.action> = async (body, params, notifier, player) => {
	const gameId = params.gameId as GameId
	const [savedState, room] = await getData(gameId, player.entityId, body.roomId);
	const gamePlayFabEntity = PlayfabCtx.game[gameId];

	if (body.roomId) {
		if (!savedState || !room) throw new Error('Game not found');
	
		const game = Game.Factory(gameId);
		game.state = savedState;
		game.action(player, body.action, body.data);
	
		await Promise.all([
			gamePlayFabEntity.upsert(body.roomId!, game.state!),
			PlayfabCtx.rooms.upsert(body.roomId!, room),
		]);
	
		notifier.gameStateUpdatedForAll(room, game);
		notifier.roomUpsert(room);

		return game.getPublicState(player.id);
	}
	else {
		const savedState = await gamePlayFabEntity.get(player.entityId);
		if (!savedState) throw new Error('Game not found');

		const game = Game.Factory(gameId);
		game.state = savedState;
		game.action(player, body.action, body.data);

		await gamePlayFabEntity.upsert(player.entityId, game.state!);

		const publicState = game.getPublicState(player.id);
		notifier.gameStateUpdatedForPlayer(player.id, publicState);

		return publicState;
	}
};

const gameSettingsSetInner: InnerFunction<typeof API.game.setSettings> = async (body, params, notifier, player) => {
	const gameId = params.gameId as GameId
	const [savedState, room] = await getData(gameId, player.entityId, body.roomId);

	if (body.roomId) {

	}
	if (!room) throw new Error('Room not found');
	if (room.hostId !== player.id) throw new Error('You are not the host of this room');
	if (room.phase !== 'waiting') throw new Error('Game already started');

	room.settings = resolveSettings(GAME_SETTINGS[room.gameId], body.settings);
	await PlayfabCtx.rooms.upsert(body.roomId!, room);
	notifier.roomUpsert(room);
	return room;
};

const resetInner: InnerFunction<typeof API.game.reset> = async (body, params, notifier, player) => {
	const gameId = params.gameId as GameId;
	const [savedState, room] = await getData(gameId, player.entityId, body.roomId);

	const resetGame = async (players: GamePlayer[], settings?: GameSettings) => {
		const game = Game.Factory(gameId);
		game.initialize(players, settings);
		await PlayfabCtx.game[gameId].upsert(player.entityId, game.state!);
		return game;
	}
	
	if (body.roomId && room) {
		const game = await resetGame(room.players, room.settings);
		// //TODO remove reset button for non host on the frontend
		//if (room.hostId !== player.id) throw new Error('You are not the host of this room');
		room.phase = 'waiting';
		await PlayfabCtx.rooms.upsert(body.roomId!, room);
		notifier.roomUpsert(room);
		return game.getPublicState(player.id);
	}
	else {
		const game = await resetGame([player], savedState?.settings);

		const publicState = game.getPublicState(player.id);
		notifier.gameStateUpdatedForPlayer(player.id, publicState);

		return publicState;
	}
};

// game state is a safe read (QUERY), so it never takes the per-room lock; action and
// settings mutate through unsafe methods on a {roomId} route and are locked automatically.
registerEndpoint(API.game.state, gameStateInner);
registerEndpoint(API.game.action, gameActionInner);
registerEndpoint(API.game.setSettings, gameSettingsSetInner);
registerEndpoint(API.game.reset, resetInner);
