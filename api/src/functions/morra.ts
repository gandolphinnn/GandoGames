import { BEATS, Hand, MorraActionRequest, MorraGameState, MorraPlayer } from '@gandogames/common/morra';
import { RoomPlayer, RoomState } from '@gandogames/common/api';
import { publicState, registerGameAction, registerGameInit, removeFromIndex, saveState } from './rooms';

const INITIAL_LIVES = 3;

// ── Hidden state ──────────────────────────────────────────────────────────────

interface MorraHiddenState {
	picks: Record<string, Hand>; // playFabId → pick (hidden until all have picked)
}

// ── Round resolution ──────────────────────────────────────────────────────────

function resolveRound(picks: Record<string, Hand>): { losers: string[]; isDraw: boolean } {
	const entries = Object.entries(picks);
	const unique = [...new Set(entries.map(([, h]) => h))] as Hand[];

	// Draw: all same, or all three types present
	if (unique.length !== 2) return { losers: [], isDraw: true };

	const [a, b] = unique;
	const losingHand: Hand = BEATS[a] === b ? b : a;
	const losers = entries.filter(([, h]) => h === losingHand).map(([id]) => id);

	return { losers, isDraw: false };
}

// ── Game initializer ──────────────────────────────────────────────────────────

registerGameInit('morra', (players: RoomPlayer[]) => ({
	gameState: {
		gamePhase: 'picking',
		players: players.map(p => ({ ...p, lives: INITIAL_LIVES, hasPicked: false })),
		result: null,
		winnerName: null,
	} satisfies MorraGameState,
	hiddenState: { picks: {} } satisfies MorraHiddenState,
}));

// ── Game action handler ───────────────────────────────────────────────────────

registerGameAction('morra', async (playFabId, bodyRaw, options, roomId, state): Promise<RoomState> => {
	const body = bodyRaw as MorraActionRequest;
	const gs = state.gameState as MorraGameState;
	const hidden = state._hiddenState as MorraHiddenState;

	switch (body.type) {
		case 'pick': {
			if (gs.gamePhase !== 'picking') throw new Error('Not the picking phase');
			const player = gs.players.find(p => p.playFabId === playFabId);
			if (!player) {
				options.errorCode = 403;
				throw new Error('Not in this room');
			}
			if (player.lives <= 0) throw new Error('You are eliminated');
			if (player.hasPicked) throw new Error('Already picked this round');
			if (!body.hand) throw new Error('Missing hand');

			hidden.picks[playFabId] = body.hand;
			player.hasPicked = true;

			const alivePlayers = gs.players.filter(p => p.lives > 0);
			if (alivePlayers.every(p => p.hasPicked)) {
				const { losers, isDraw } = resolveRound(hidden.picks);
				losers.forEach(id => {
					const p = gs.players.find(pl => pl.playFabId === id);
					if (p) p.lives--;
				});
				gs.result = { picks: { ...hidden.picks }, losers, isDraw };

				const alive = gs.players.filter(p => p.lives > 0);
				if (alive.length <= 1) {
					gs.gamePhase = 'game-over';
					state.phase = 'game-over';
					gs.winnerName = alive[0]?.name ?? null;
					state.gameState = gs;
					state._hiddenState = hidden;
					await saveState(roomId, state);
					await removeFromIndex(state.gameId, roomId).catch(() => { /* non-critical */ });
				} else {
					gs.gamePhase = 'reveal';
					state.gameState = gs;
					state._hiddenState = hidden;
					await saveState(roomId, state);
				}
			} else {
				state.gameState = gs;
				state._hiddenState = hidden;
				await saveState(roomId, state);
			}
			return publicState(state);
		}

		case 'next-round': {
			if (gs.gamePhase !== 'reveal') throw new Error('Nothing to advance');
			if (!gs.players.some(p => p.playFabId === playFabId)) {
				options.errorCode = 403;
				throw new Error('Not in this room');
			}
			gs.players.forEach(p => { p.hasPicked = false; });
			gs.result = null;
			gs.gamePhase = 'picking';
			hidden.picks = {};
			state.gameState = gs;
			state._hiddenState = hidden;
			await saveState(roomId, state);
			return publicState(state);
		}

		default:
			throw new Error('Unknown action');
	}
});
