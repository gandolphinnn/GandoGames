import {
	RoomPlayer, RoomState, RoomSummary,
	CreateRoomRequest, JoinRoomRequest, StartRoomRequest,
} from '@gandogames/common/api';
import { InnerFunction, InnerFunctionOptions, pfPromise, PlayFabServer, registerAzureHttpFunction } from '..';

export type { RoomPlayer, RoomState, RoomSummary };

// StoredRoomState is the API-internal shape — extends the public RoomState
// with _hiddenState, which is stripped before sending responses to clients.
export interface StoredRoomState extends RoomState {
	_hiddenState: unknown;
}

// ── Game registry ─────────────────────────────────────────────────────────────

type GameInitFn = (players: RoomPlayer[]) => { gameState: unknown; hiddenState: unknown };
const gameRegistry = new Map<string, GameInitFn>();

export function registerGameInit(gameId: string, fn: GameInitFn): void {
	gameRegistry.set(gameId, fn);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const roomsIndexId = (gameId: string) => `${gameId.toUpperCase()}_ROOMS`;

function generateRoomCode(): string {
	return Math.random().toString(36).substring(2, 8).toUpperCase();
}

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

async function addToIndex(gameId: string, summary: RoomSummary): Promise<void> {
	const rooms = await loadIndex(gameId);
	rooms.push(summary);
	await saveIndex(gameId, rooms);
}

async function updateIndexPlayers(gameId: string, roomId: string, playerNames: string[]): Promise<void> {
	const rooms = await loadIndex(gameId);
	const entry = rooms.find((r) => r.roomId === roomId);
	if (entry) {
		entry.players = playerNames;
		await saveIndex(gameId, rooms);
	}
}

export async function removeFromIndex(gameId: string, roomId: string): Promise<void> {
	const rooms = await loadIndex(gameId);
	await saveIndex(gameId, rooms.filter((r) => r.roomId !== roomId));
}

export async function getPlayFabId(sessionTicket: string): Promise<string> {
	const result = await pfPromise<PlayFabServerModels.AuthenticateSessionTicketResult>(
		cb => PlayFabServer.AuthenticateSessionTicket({ SessionTicket: sessionTicket }, cb),
	);
	return result.UserInfo!.PlayFabId!;
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

// ── Game action registry ──────────────────────────────────────────────────────

export type GameActionHandler = (
	playFabId: string,
	body: unknown,
	options: InnerFunctionOptions,
	roomId: string,
	state: StoredRoomState,
) => Promise<RoomState>;

const gameActionRegistry = new Map<string, GameActionHandler>();

export function registerGameAction(gameId: string, fn: GameActionHandler): void {
	gameActionRegistry.set(gameId, fn);
}

// ── Endpoint handlers ─────────────────────────────────────────────────────────

const roomListInner: InnerFunction<never, RoomSummary[]> = async (_body, _params, _options, query) => {
	const gameId = query.get('gameId') ?? 'pankov';
	return loadIndex(gameId);
};

const roomCreateInner: InnerFunction<CreateRoomRequest, { roomId: string }> = async (body, _params, options) => {
	options.errorCode = 400;
	options.successCode = 201;
	const hostId = await getPlayFabId(body.sessionTicket);
	const roomId = generateRoomCode();
	await pfPromise<PlayFabServerModels.CreateSharedGroupResult>(
		cb => PlayFabServer.CreateSharedGroup({ SharedGroupId: roomId }, cb),
	);
	const trimmedName = body.playerName.trim();
	const state: StoredRoomState = {
		phase: 'waiting',
		hostId,
		gameId: body.gameId,
		players: [{ playFabId: hostId, name: trimmedName }],
		gameState: null,
		lastUpdated: new Date().toISOString(),
		_hiddenState: null,
	};
	await saveState(roomId, state);
	await addToIndex(body.gameId, { roomId, players: [trimmedName], createdAt: new Date().toISOString() });
	return { roomId };
};

const roomJoinInner: InnerFunction<JoinRoomRequest, { roomId: string }> = async (body, _params, options) => {
	options.errorCode = 400;
	const playFabId = await getPlayFabId(body.sessionTicket);
	const roomId = body.roomCode.trim().toUpperCase();
	const state = await loadState(roomId);
	if (state.phase !== 'waiting') throw new Error('Game already started');
	if (state.players.length >= 6) throw new Error('Room is full');
	if (state.players.some((p) => p.playFabId === playFabId)) throw new Error('Already in this room');
	const trimmedName = body.playerName.trim();
	state.players.push({ playFabId, name: trimmedName });
	await saveState(roomId, state);
	await updateIndexPlayers(state.gameId, roomId, state.players.map((p) => p.name)).catch(() => { /* non-critical */ });
	return { roomId };
};

const roomGetStateInner: InnerFunction<never, RoomState> = async (_body, params, options) => {
	options.errorCode = 404;
	options.errorMessage = 'Room not found';
	const state = await loadState(params['roomId']);
	return publicState(state);
};

const roomStartInner: InnerFunction<StartRoomRequest, RoomState> = async (body, params, options) => {
	options.errorCode = 400;
	const roomId = params['roomId'];
	const playFabId = await getPlayFabId(body.sessionTicket);
	const state = await loadState(roomId);
	if (state.hostId !== playFabId) {
		options.errorCode = 403;
		throw new Error('Only the host can start');
	}
	if (state.players.length < 2) throw new Error('Need at least 2 players');
	const initFn = gameRegistry.get(state.gameId);
	if (!initFn) throw new Error(`Unknown game: ${state.gameId}`);
	const { gameState, hiddenState } = initFn(state.players);
	state.phase = 'playing';
	state.gameState = gameState;
	state._hiddenState = hiddenState;
	await saveState(roomId, state);
	await removeFromIndex(state.gameId, roomId).catch(() => { /* non-critical */ });
	return publicState(state);
};

const roomActionInner: InnerFunction<{ sessionTicket: string }, RoomState> = async (body, params, options) => {
	options.errorCode = 400;
	const roomId = params['roomId'];
	const playFabId = await getPlayFabId(body.sessionTicket);
	const state = await loadState(roomId);
	if (state.phase !== 'playing') throw new Error('Game is not in progress');
	const handler = gameActionRegistry.get(state.gameId);
	if (!handler) throw new Error(`No action handler for game: ${state.gameId}`);
	return handler(playFabId, body, options, roomId, state);
};

registerAzureHttpFunction('room_list', 'GET', 'rooms', roomListInner);
registerAzureHttpFunction('room_create', 'POST', 'rooms', roomCreateInner);
registerAzureHttpFunction('room_join', 'POST', 'rooms/join', roomJoinInner);
registerAzureHttpFunction('room_getState', 'GET', 'rooms/{roomId}', roomGetStateInner);
registerAzureHttpFunction('room_start', 'POST', 'rooms/{roomId}/start', roomStartInner);
registerAzureHttpFunction('room_action', 'POST', 'rooms/{roomId}/action', roomActionInner);
