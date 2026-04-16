import { PankovActionRequest, PankovGameState, PankovPlayer } from '@gandogames/common/pankov';
import { RoomPlayer, RoomState } from '@gandogames/common/api';
import { publicState, registerGameAction, registerGameInit, removeFromIndex, saveState, StoredRoomState } from './rooms';

const INITIAL_LIVES = 8;

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

function nextAlive(players: PankovPlayer[], fromIndex: number): number {
	const n = players.length;
	let i = (fromIndex + 1) % n;
	while (players[i].lives <= 0) i = (i + 1) % n;
	return i;
}

// ── Hidden state ──────────────────────────────────────────────────────────────

interface PankovHiddenState {
	_actualRoll: number | null;
}

// ── Game initializer ──────────────────────────────────────────────────────────

registerGameInit('pankov', (players: RoomPlayer[]) => ({
	gameState: {
		gamePhase: 'turn-start',
		currentPlayerIndex: 0,
		previousDeclaration: null,
		previousPlayerIndex: null,
		revealResult: null,
		winnerName: null,
		players: players.map(p => ({ ...p, lives: INITIAL_LIVES })),
	} satisfies PankovGameState,
	hiddenState: { _actualRoll: null } satisfies PankovHiddenState,
}));

// ── Game action handler ───────────────────────────────────────────────────────

registerGameAction('pankov', async (playFabId, bodyRaw, options, roomId, state): Promise<RoomState> => {
	const body = bodyRaw as PankovActionRequest;
	const gs = state.gameState as PankovGameState;
	const hidden = state._hiddenState as PankovHiddenState;
	const currentPlayer = gs.players[gs.currentPlayerIndex];

	switch (body.type) {
		case 'declare': {
			if (currentPlayer.playFabId !== playFabId) {
				options.errorCode = 403;
				throw new Error('Not your turn');
			}
			if (gs.gamePhase !== 'turn-start') throw new Error('Cannot declare right now');
			const { declaration, actualRoll } = body;
			if (declaration === undefined || actualRoll === undefined) throw new Error('Missing declaration or actualRoll');
			if (gs.previousDeclaration !== null && getRank(declaration) <= getRank(gs.previousDeclaration)) throw new Error('Must declare higher than previous');
			gs.previousPlayerIndex = gs.currentPlayerIndex;
			gs.previousDeclaration = declaration;
			hidden._actualRoll = actualRoll;
			gs.currentPlayerIndex = nextAlive(gs.players, gs.currentPlayerIndex);
			state.gameState = gs;
			state._hiddenState = hidden;
			await saveState(roomId, state);
			return publicState(state);
		}

		case 'call-false': {
			if (currentPlayer.playFabId !== playFabId) {
				options.errorCode = 403;
				throw new Error('Not your turn');
			}
			if (gs.gamePhase !== 'turn-start' || gs.previousDeclaration === null) throw new Error('Cannot call false right now');
			const actual = hidden._actualRoll!;
			const declared = gs.previousDeclaration;
			const wasLying = getRank(actual) < getRank(declared);
			const loserIndex = wasLying ? gs.previousPlayerIndex! : gs.currentPlayerIndex;
			gs.revealResult = { wasLying, loserIndex, declared, actual };
			hidden._actualRoll = null;
			gs.gamePhase = 'result';
			gs.currentPlayerIndex = loserIndex;
			state.gameState = gs;
			state._hiddenState = hidden;
			await saveState(roomId, state);
			return publicState(state);
		}

		case 'next-turn': {
			if (!gs.players.some((p) => p.playFabId === playFabId)) {
				options.errorCode = 403;
				throw new Error('Not in this room');
			}
			if (gs.gamePhase !== 'result') throw new Error('No result to advance');
			const loserIndex = gs.revealResult!.loserIndex;
			gs.players[loserIndex].lives--;
			const alive = gs.players.filter((p) => p.lives > 0);
			if (alive.length <= 1) {
				gs.gamePhase = 'game-over';
				state.phase = 'game-over';
				gs.winnerName = alive[0]?.name ?? null;
				state.gameState = gs;
				state._hiddenState = hidden;
				await saveState(roomId, state);
				await removeFromIndex(state.gameId, roomId).catch(() => { /* non-critical */ });
			} else {
				let nextIndex = loserIndex;
				if (gs.players[nextIndex].lives <= 0) nextIndex = nextAlive(gs.players, nextIndex);
				gs.currentPlayerIndex = nextIndex;
				gs.previousDeclaration = null;
				gs.previousPlayerIndex = null;
				gs.revealResult = null;
				gs.gamePhase = 'turn-start';
				state.gameState = gs;
				state._hiddenState = hidden;
				await saveState(roomId, state);
			}
			return publicState(state);
		}

		default:
			throw new Error('Unknown action');
	}
});
