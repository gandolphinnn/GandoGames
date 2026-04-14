import { PlayFabHttp } from '../playfab';
import {
	RoomPlayer, RevealResult, RoomSummary, RoomState,
	CreateRoomRequest, JoinRoomRequest, StartRoomRequest,
} from '@gandogames/common/api';
import { FunctionError, InnerFunction, registerAzureHttpFunction } from '../utils';

export type { RoomPlayer, RevealResult, RoomSummary, RoomState };

// ── Types ────────────────────────────────────────────────────────────────────

// StoredRoomState is the API-internal shape — extends the public RoomState
// with _actualRoll, which is stripped before sending responses to clients.
interface StoredRoomState extends RoomState {
	_actualRoll: number | null;
}

// ── Constants ────────────────────────────────────────────────────────────────

const INITIAL_LIVES = 8;
const ROOMS_INDEX_ID = 'PANKOV_ROOMS';

function generateRoomCode(): string {
	return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// ── Room index helpers ────────────────────────────────────────────────────────

async function loadIndex(): Promise<RoomSummary[]> {
	try {
		const result = await PlayFabHttp.server<{
			Data: { rooms?: { Value: string } };
		}>('GetSharedGroupData', { SharedGroupId: ROOMS_INDEX_ID, Keys: ['rooms'] });
		return result.Data?.rooms?.Value ? (JSON.parse(result.Data.rooms.Value) as RoomSummary[]) : [];
	} catch {
		return [];
	}
}

async function saveIndex(rooms: RoomSummary[]): Promise<void> {
	const data = { rooms: JSON.stringify(rooms) };
	try {
		await PlayFabHttp.server('UpdateSharedGroupData', {
			SharedGroupId: ROOMS_INDEX_ID,
			Data: data,
		});
	} catch {
		// Index group may not exist yet — create it and retry once
		await PlayFabHttp.server('CreateSharedGroup', { SharedGroupId: ROOMS_INDEX_ID });
		await PlayFabHttp.server('UpdateSharedGroupData', {
			SharedGroupId: ROOMS_INDEX_ID,
			Data: data,
		});
	}
}

async function addToIndex(summary: RoomSummary): Promise<void> {
	const rooms = await loadIndex();
	rooms.push(summary);
	await saveIndex(rooms);
}

async function updateIndexPlayers(roomId: string, playerNames: string[]): Promise<void> {
	const rooms = await loadIndex();
	const entry = rooms.find((r) => r.roomId === roomId);
	if (entry) {
		entry.players = playerNames;
		await saveIndex(rooms);
	}
}

export async function removeFromIndex(roomId: string): Promise<void> {
	const rooms = await loadIndex();
	await saveIndex(rooms.filter((r) => r.roomId !== roomId));
}

// ── Room state helpers ────────────────────────────────────────────────────────

export async function getPlayFabId(sessionTicket: string): Promise<string> {
	const result = await PlayFabHttp.server<{ UserInfo: { PlayFabId: string } }>(
		'AuthenticateSessionTicket',
		{ SessionTicket: sessionTicket },
	);
	return result.UserInfo.PlayFabId;
}

export async function loadState(roomId: string): Promise<StoredRoomState> {
	const result = await PlayFabHttp.server<{
		Data: { state?: { Value: string } };
	}>('GetSharedGroupData', { SharedGroupId: roomId, Keys: ['state'] });
	if (!result.Data?.state?.Value) throw new Error('Room not found');
	return JSON.parse(result.Data.state.Value) as StoredRoomState;
}

export async function saveState(roomId: string, state: StoredRoomState): Promise<void> {
	state.lastUpdated = new Date().toISOString();
	await PlayFabHttp.server('UpdateSharedGroupData', {
		SharedGroupId: roomId,
		Data: { state: JSON.stringify(state) },
	});
}

export function publicState(state: StoredRoomState): RoomState {
	const { _actualRoll: _ignored, ...pub } = state;
	return pub;
}

// ── GET /rooms — list waiting rooms ──────────────────────────────────────────

const listRooms: InnerFunction<undefined, RoomSummary[]> = (_body, _params) => ({
	promise: loadIndex(),
});

// ── POST /rooms — create a new room ──────────────────────────────────────────

const createRoom: InnerFunction<CreateRoomRequest, { roomId: string }> = (body, _params) => ({
	promise: (async () => {
		const hostId = await getPlayFabId(body.sessionTicket);
		const roomId = generateRoomCode();
		await PlayFabHttp.server('CreateSharedGroup', { SharedGroupId: roomId });
		const trimmedName = body.playerName.trim();
		const state: StoredRoomState = {
			phase: 'waiting',
			hostId,
			players: [{ playFabId: hostId, name: trimmedName, lives: INITIAL_LIVES }],
			currentPlayerIndex: 0,
			previousDeclaration: null,
			previousPlayerIndex: null,
			gamePhase: 'turn-start',
			revealResult: null,
			winnerName: null,
			lastUpdated: new Date().toISOString(),
			_actualRoll: null,
		};
		await saveState(roomId, state);
		await addToIndex({ roomId, players: [trimmedName], createdAt: new Date().toISOString() });
		return { roomId };
	})(),
	successCode: 201,
	errorCode: 400,
});

// ── POST /rooms/join — join an existing room ──────────────────────────────────

const joinRoom: InnerFunction<JoinRoomRequest, { roomId: string }> = (body, _params) => ({
	promise: (async () => {
		const playFabId = await getPlayFabId(body.sessionTicket);
		const roomId = body.roomCode.trim().toUpperCase();
		const state = await loadState(roomId);
		if (state.phase !== 'waiting') throw new FunctionError(400, 'Game already started');
		if (state.players.length >= 6) throw new FunctionError(400, 'Room is full');
		if (state.players.some((p) => p.playFabId === playFabId)) throw new FunctionError(400, 'Already in this room');
		const trimmedName = body.playerName.trim();
		state.players.push({ playFabId, name: trimmedName, lives: INITIAL_LIVES });
		await saveState(roomId, state);
		await updateIndexPlayers(roomId, state.players.map((p) => p.name)).catch(() => { /* non-critical */ });
		return { roomId };
	})(),
	errorCode: 400,
});

// ── GET /rooms/{roomId} — poll room state ─────────────────────────────────────

const getRoomState: InnerFunction<undefined, RoomState> = (_body, params) => ({
	promise: loadState(params['roomId']).then(publicState),
	errorCode: 404,
	errorMessage: 'Room not found',
});

// ── POST /rooms/{roomId}/start — host starts the game ─────────────────────────

const startRoom: InnerFunction<StartRoomRequest, RoomState> = (body, params) => ({
	promise: (async () => {
		const roomId = params['roomId'];
		const playFabId = await getPlayFabId(body.sessionTicket);
		const state = await loadState(roomId);
		if (state.hostId !== playFabId) throw new FunctionError(403, 'Only the host can start');
		if (state.players.length < 2) throw new FunctionError(400, 'Need at least 2 players');
		state.phase = 'playing';
		state.gamePhase = 'turn-start';
		state.currentPlayerIndex = 0;
		await saveState(roomId, state);
		await removeFromIndex(roomId).catch(() => { /* non-critical */ });
		return publicState(state);
	})(),
	errorCode: 400,
});

registerAzureHttpFunction('room_list', 'GET', 'rooms', listRooms);
registerAzureHttpFunction('room_create', 'POST', 'rooms', createRoom);
registerAzureHttpFunction('room_join', 'POST', 'rooms/join', joinRoom);
registerAzureHttpFunction('room_getState', 'GET', 'rooms/{roomId}', getRoomState);
registerAzureHttpFunction('room_start', 'POST', 'rooms/{roomId}/start', startRoom);
