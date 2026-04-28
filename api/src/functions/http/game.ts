import { GameActionRequest, GameBaseRequest, GameState } from '@gandogames/common/api';
import { InnerFunction, PlayfabCtx, registerFunction } from '../..';
import { Game } from '../../games';

const gameStateInner: InnerFunction<GameBaseRequest, GameState | null> = async (body, _notifier, _player) => {
	return await PlayfabCtx.game[body.game].get(body.roomId);
};

const gameActionInner: InnerFunction<GameActionRequest, GameState | null> = async (body, notifier, player) => {
	Game.Factory(body.game).action(player, body.action, body.data);
	const state = await PlayfabCtx.game[body.game].get(body.roomId);
	if (state) {
		notifier.gameStateUpdated(body.roomId, state);
	}
	return state;
};

registerFunction('game_state', 'game/state', gameStateInner);
registerFunction('game_action', 'game/action', gameActionInner);
