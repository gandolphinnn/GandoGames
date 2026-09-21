import { API, GameId, GameSettingsSchema, resolveSettings } from '@gandogames/shared/dto';
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

const gameStateInner: InnerFunction<typeof API.game.state> = async (body, params, _notifier, player) => {
	const gameId = params.gameId as GameId;
	const state = await PlayfabCtx.game[gameId].get(body.roomId!);
	if (!state) return null;
	const game = Game.Factory(gameId);
	game.state = state;
	return game.getPublicState(player.id);
};

const gameActionInner: InnerFunction<typeof API.game.action> = async (body, params, notifier, player) => {
	const gameId = params.gameId as GameId;
	const [savedState, room] = await Promise.all([
		PlayfabCtx.game[gameId].get(body.roomId!),
		PlayfabCtx.rooms.get(body.roomId!),
	]);
	if (!savedState || !room) throw new Error('Game not found');

	const game = Game.Factory(gameId);
	game.state = savedState;
	game.action(player, body.action, body.data);

	await Promise.all([
		PlayfabCtx.game[gameId].upsert(body.roomId!, game.state!),
		PlayfabCtx.rooms.upsert(body.roomId!, room),
	]);

	notifier.gameStateUpdatedForAll(room, game);

	notifier.roomUpsert(room);

	return game.getPublicState(player.id);
};

const gameSettingsSetInner: InnerFunction<typeof API.game.setSettings> = async (body, params, notifier, player) => {
	const gameId = params.gameId as GameId;
	const room = await PlayfabCtx.rooms.get(body.roomId!);
	if (!room) throw new Error('Room not found');
	if (room.hostId !== player.id) throw new Error('You are not the host of this room');
	if (room.phase !== 'waiting') throw new Error('Game already started');

	room.settings = resolveSettings(GAME_SETTINGS[room.game], body.settings);
	await PlayfabCtx.rooms.upsert(body.roomId!, room);
	notifier.roomUpsert(room);
	return room;
};

const resetInner: InnerFunction<typeof API.game.reset> = async (body, params, notifier, player) => {
	const gameId = params.gameId as GameId;
	const room = await PlayfabCtx.rooms.get(body.roomId ?? 'TODO');
	if (room == null) throw new Error('Room not found');
	//if (room.hostId !== player.id) throw new Error('You are not the host of this room');
	if (room.phase !== 'playing') throw new Error('Game is not in progress');

	room.phase = 'waiting';
	room.lastUpdate = new Date();
	await PlayfabCtx.rooms.upsert(body.roomId!, room);
	notifier.roomUpsert(room);
	return room;
};

// game state is a safe read (QUERY), so it never takes the per-room lock; action and
// settings mutate through unsafe methods on a {roomId} route and are locked automatically.
registerEndpoint(API.game.state, gameStateInner);
registerEndpoint(API.game.action, gameActionInner);
registerEndpoint(API.game.setSettings, gameSettingsSetInner);
registerEndpoint(API.game.reset, resetInner);
