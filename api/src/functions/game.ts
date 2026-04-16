import { InnerFunction, InnerFunctionOptions, pfPromise, PlayFabServer, registerFunction } from '..';

const roomsIndexId = (gameId: string) => `${gameId.toUpperCase()}_ROOMS`;

async function loadIndex(gameId: string): Promise<RoomSummary[]> {
	try {
		const result = await pfPromise<PlayFabServerModels.GetSharedGroupDataResult>(
			cb => PlayFabServer.GetSharedGroupData({ SharedGroupId: roomsIndexId(gameId), Keys: ['rooms'] }, cb),
		);
		const value = result.Data?.['rooms']?.Value;
		return value ? (JSON.parse(value) as RoomSummary[]) : [];
	} catch {
		return [];
	}
}

async function saveIndex(gameId: string, rooms: RoomSummary[]): Promise<void> {
	const indexId = roomsIndexId(gameId);
	const data = { rooms: JSON.stringify(rooms) };
	try {
		await pfPromise<PlayFabServerModels.UpdateSharedGroupDataResult>(
			cb => PlayFabServer.UpdateSharedGroupData({ SharedGroupId: indexId, Data: data }, cb),
		);
	} catch {
		// Index group may not exist yet — create it and retry once
		await pfPromise<PlayFabServerModels.CreateSharedGroupResult>(
			cb => PlayFabServer.CreateSharedGroup({ SharedGroupId: indexId }, cb),
		);
		await pfPromise<PlayFabServerModels.UpdateSharedGroupDataResult>(
			cb => PlayFabServer.UpdateSharedGroupData({ SharedGroupId: indexId, Data: data }, cb),
		);
	}
}

async function removeFromIndex(gameId: string, roomId: string): Promise<void> {
	const rooms = await loadIndex(gameId);
	await saveIndex(gameId, rooms.filter((r) => r.roomId !== roomId));
}

export async function loadState(roomId: string): Promise<StoredRoomState> {
	const result = await pfPromise<PlayFabServerModels.GetSharedGroupDataResult>(
		cb => PlayFabServer.GetSharedGroupData({ SharedGroupId: roomId, Keys: ['state'] }, cb),
	);
	const value = result.Data?.['state']?.Value;
	if (!value) throw new Error('Room not found');
	return JSON.parse(value) as StoredRoomState;
}

export async function saveState(roomId: string, state: StoredRoomState): Promise<void> {
	state.lastUpdated = new Date().toISOString();
	await pfPromise<PlayFabServerModels.UpdateSharedGroupDataResult>(
		cb => PlayFabServer.UpdateSharedGroupData({
			SharedGroupId: roomId,
			Data: { state: JSON.stringify(state) },
		}, cb),
	);
}

export function publicState(state: StoredRoomState): RoomState {
	const { _hiddenState: _ignored, ...pub } = state;
	return pub;
}

// ── Endpoint handlers ─────────────────────────────────────────────────────────

const gameStateInner: InnerFunction<never, RoomState> = async (_body, params, options) => {
	options.errorCode = 404;
	options.errorMessage = 'Room not found';
	const state = await loadState(params['roomId']);
	return publicState(state);
};

const gameStartInner: InnerFunction<StartRoomRequest, RoomState> = async (body, params, options) => {
	options.errorCode = 400;
	const roomId = params['roomId'];
	const playFabId = await getPlayFabId(body.sessionTicket);
	const state = await loadState(roomId);
	if (state.hostId !== playFabId) {
		options.errorCode = 403;
		throw new Error('Only the host can start');
	}
	if (state.players.length < 2) throw new Error('Need at least 2 players');
	const initFn = gameInitRegistry.get(state.gameId);
	if (!initFn) throw new Error(`Unknown game: ${state.gameId}`);
	const { gameState, hiddenState } = initFn(state.players);
	state.phase = 'playing';
	state.gameState = gameState;
	state._hiddenState = hiddenState;
	await saveState(roomId, state);
	await removeFromIndex(state.gameId, roomId).catch(() => { /* non-critical */ });
	return publicState(state);
};

const gameActionInner: InnerFunction<{ sessionTicket: string }, RoomState> = async (body, params, options) => {
	options.errorCode = 400;
	const roomId = params['roomId'];
	const playFabId = await getPlayFabId(body.sessionTicket);
	const state = await loadState(roomId);
	if (state.phase !== 'playing') throw new Error('Game is not in progress');
	const handler = gameActionRegistry.get(state.gameId);
	if (!handler) throw new Error(`No action handler for game: ${state.gameId}`);
	return handler(playFabId, body, options, roomId, state);
};

registerFunction('game_state', 'GET', 'game/{roomId}', gameStateInner);
registerFunction('game_start', 'POST', 'game/{roomId}/start', gameStartInner);
registerFunction('game_action', 'POST', 'game/{roomId}/action', gameActionInner);
