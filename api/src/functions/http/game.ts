import { GameActionRequest, GameBaseRequest, GameState } from '@gandogames/common/api';
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

registerFunction('game_state', 'game/state', gameStateInner);
registerFunction('game_action', 'game/action', gameActionInner);
