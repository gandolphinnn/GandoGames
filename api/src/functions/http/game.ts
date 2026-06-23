import { GameActionRequest, GameBaseRequest, GameSettings, GameSettingsSetRequest, GameState, RoomData, resolveSettings } from '@gandogames/shared/dto';
import { GAME_SETTINGS } from '@gandogames/shared/settings';
import { InnerFunction, PlayfabCtx, registerFunction } from '../..';
import { Game } from '../../games';

const gameStateInner: InnerFunction<GameBaseRequest, GameState | null> = async (body, _notifier, player) => {
	const state = await PlayfabCtx.game[body.game].get(body.roomId);
	if (!state) return null;
	const game = Game.Factory(body.game);
	game.state = state;
	return game.getPublicState(player.id);
};

const gameActionInner: InnerFunction<GameActionRequest, GameState | null> = async (body, notifier, player) => {
	const [savedState, room] = await Promise.all([
		PlayfabCtx.game[body.game].get(body.roomId),
		PlayfabCtx.rooms.get(body.roomId),
	]);
	if (!savedState || !room) throw new Error('Game not found');

	const game = Game.Factory(body.game);
	game.state = savedState;
	game.action(player, body.action, body.data);

	await Promise.all([
		PlayfabCtx.game[body.game].upsert(body.roomId, game.state!),
		PlayfabCtx.rooms.upsert(body.roomId, room),
	]);

	for (const p of room.players) {
		notifier.gameStateUpdatedForPlayer(p.id, body.roomId, game.getPublicState(p.id));
	}
	notifier.roomUpsert(room);

	return game.getPublicState(player.id);
};

const gameSettingsGetInner: InnerFunction<GameBaseRequest, GameSettings> = async (body, _notifier, _player) => {
	const room = await PlayfabCtx.rooms.get(body.roomId);
	if (!room) throw new Error('Room not found');
	// Resolve against the schema so callers always get a complete, valid object (defaults filled in)
	// even for a room whose settings were never explicitly set.
	return resolveSettings(GAME_SETTINGS[body.game].schema, room.settings);
};

const gameSettingsSetInner: InnerFunction<GameSettingsSetRequest, RoomData> = async (body, notifier, player) => {
	const room = await PlayfabCtx.rooms.get(body.roomId);
	if (!room) throw new Error('Room not found');
	if (room.hostId !== player.id) throw new Error('Only the host can change game settings');
	if (room.phase !== 'waiting') throw new Error('Cannot change settings after the game has started');

	room.settings = resolveSettings(GAME_SETTINGS[room.game].schema, body.settings);
	await PlayfabCtx.rooms.upsert(body.roomId, room);
	notifier.roomUpsert(room);
	return room;
};

// game/state & game/settings/get are read-only, so they opt out of the per-room lock; game/action
// and game/settings/set mutate and are locked automatically (their request carries a roomId).
registerFunction('game_state', 'game/state', gameStateInner, { skipLock: true });
registerFunction('game_action', 'game/action', gameActionInner);
registerFunction('game_settings_get', 'game/settings/get', gameSettingsGetInner, { skipLock: true });
registerFunction('game_settings_set', 'game/settings/set', gameSettingsSetInner);
