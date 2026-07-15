import { API, resolveSettings } from '@gandogames/shared/dto';
import { GAME_SETTINGS } from '@gandogames/shared/settings';
import { InnerFunction, PlayfabCtx, registerEndpoint } from '../..';
import { Game } from '../../games';

const gameStateInner: InnerFunction<typeof API.game.state> = async (body, params, _notifier, player) => {
	const state = await PlayfabCtx.game[body.game].get(params.roomId);
	if (!state) return null;
	const game = Game.Factory(body.game);
	game.state = state;
	return game.getPublicState(player.id);
};

const gameActionInner: InnerFunction<typeof API.game.action> = async (body, params, notifier, player) => {
	const [savedState, room] = await Promise.all([
		PlayfabCtx.game[body.game].get(params.roomId),
		PlayfabCtx.rooms.get(params.roomId),
	]);
	if (!savedState || !room) throw new Error('Game not found');

	const game = Game.Factory(body.game);
	game.state = savedState;
	game.action(player, body.action, body.data);

	await Promise.all([
		PlayfabCtx.game[body.game].upsert(params.roomId, game.state!),
		PlayfabCtx.rooms.upsert(params.roomId, room),
	]);

	for (const p of room.players) {
		notifier.gameStateUpdatedForPlayer(p.id, params.roomId, game.getPublicState(p.id));
	}
	notifier.roomUpsert(room);

	return game.getPublicState(player.id);
};

const gameSettingsSetInner: InnerFunction<typeof API.game.setSettings> = async (body, params, notifier, player) => {
	const room = await PlayfabCtx.rooms.get(params.roomId);
	if (!room) throw new Error('Room not found');
	if (room.hostId !== player.id) throw new Error('Only the host can change game settings');
	if (room.phase !== 'waiting') throw new Error('Cannot change settings after the game has started');

	room.settings = resolveSettings(GAME_SETTINGS[room.game], body.settings);
	await PlayfabCtx.rooms.upsert(params.roomId, room);
	notifier.roomUpsert(room);
	return room;
};

// game state is a safe read (QUERY), so it never takes the per-room lock; action and
// settings mutate through unsafe methods on a {roomId} route and are locked automatically.
registerEndpoint(API.game.state, gameStateInner);
registerEndpoint(API.game.action, gameActionInner);
registerEndpoint(API.game.setSettings, gameSettingsSetInner);
