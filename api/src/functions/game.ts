import { GameActionRequest, RoomPlayer, RoomState } from '@gandogames/common/api';
import { InnerFunction, registerAzureHttpFunction } from '..';
import { getPlayFabId, loadState, publicState, removeFromIndex, saveState } from './rooms';

// ── Pankov roll ranking ───────────────────────────────────────────────────────

const ROLL_VALUES = [
	31, 32, 41, 42, 43, 51, 52, 53, 54, 61, 62, 63, 64, 65,
	11, 22, 33, 44, 55, 66,
	21,
] as const;

const RANK_MAP = new Map<number, number>(ROLL_VALUES.map((v, i) => [v, i]));

function getRank(value: number): number {
	return RANK_MAP.get(value) ?? -1;
}

function nextAlive(players: RoomPlayer[], fromIndex: number): number {
	const n = players.length;
	let i = (fromIndex + 1) % n;
	while (players[i].lives <= 0) i = (i + 1) % n;
	return i;
}

// ── POST /rooms/{roomId}/action ───────────────────────────────────────────────

const roomActionInner: InnerFunction<GameActionRequest, RoomState> = async (body, params, options) => {
	options.errorCode = 400;
	const roomId = params['roomId'];
	const playFabId = await getPlayFabId(body.sessionTicket);
	const state = await loadState(roomId);

	if (state.phase !== 'playing') throw new Error('Game is not in progress');

	const currentPlayer = state.players[state.currentPlayerIndex];

	switch (body.type) {
		case 'declare': {
			if (currentPlayer.playFabId !== playFabId) {
				options.errorCode = 403;
				throw new Error('Not your turn');
			}
			if (state.gamePhase !== 'turn-start') throw new Error('Cannot declare right now');
			const { declaration, actualRoll } = body;
			if (declaration === undefined || actualRoll === undefined) throw new Error('Missing declaration or actualRoll');
			if (state.previousDeclaration !== null && getRank(declaration) <= getRank(state.previousDeclaration)) throw new Error('Must declare higher than previous');
			state.previousPlayerIndex = state.currentPlayerIndex;
			state.previousDeclaration = declaration;
			state._actualRoll = actualRoll;
			state.currentPlayerIndex = nextAlive(state.players, state.currentPlayerIndex);
			await saveState(roomId, state);
			return publicState(state);
		}

		case 'call-false': {
			if (currentPlayer.playFabId !== playFabId) {
				options.errorCode = 403;
				throw new Error('Not your turn');
			}
			if (state.gamePhase !== 'turn-start' || state.previousDeclaration === null) throw new Error('Cannot call false right now');
			const actual = state._actualRoll!;
			const declared = state.previousDeclaration;
			const wasLying = getRank(actual) < getRank(declared);
			const loserIndex = wasLying ? state.previousPlayerIndex! : state.currentPlayerIndex;
			state.revealResult = { wasLying, loserIndex, declared, actual };
			state._actualRoll = null;
			state.gamePhase = 'result';
			state.currentPlayerIndex = loserIndex;
			await saveState(roomId, state);
			return publicState(state);
		}

		case 'next-turn': {
			if (!state.players.some((p) => p.playFabId === playFabId)) {
				options.errorCode = 403;
				throw new Error('Not in this room');
			}
			if (state.gamePhase !== 'result') throw new Error('No result to advance');
			const loserIndex = state.revealResult!.loserIndex;
			state.players[loserIndex].lives--;
			const alive = state.players.filter((p) => p.lives > 0);
			if (alive.length <= 1) {
				state.gamePhase = 'game-over';
				state.phase = 'game-over';
				state.winnerName = alive[0]?.name ?? null;
				await saveState(roomId, state);
				await removeFromIndex(roomId).catch(() => { /* non-critical */ });
			} else {
				let nextIndex = loserIndex;
				if (state.players[nextIndex].lives <= 0) nextIndex = nextAlive(state.players, nextIndex);
				state.currentPlayerIndex = nextIndex;
				state.previousDeclaration = null;
				state.previousPlayerIndex = null;
				state.revealResult = null;
				state.gamePhase = 'turn-start';
				await saveState(roomId, state);
			}
			return publicState(state);
		}

		default:
			throw new Error('Unknown action');
	}
};

registerAzureHttpFunction('game_roomAction', 'POST', 'rooms/{roomId}/action', roomActionInner);