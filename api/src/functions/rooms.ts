import {
	RoomPlayer, RevealResult, RoomSummary, RoomState,
	CreateRoomRequest, JoinRoomRequest, StartRoomRequest,
} from '@gandogames/common/api';
import { InnerFunction, pfPromise, PlayFabServer, registerAzureHttpFunction } from '..';

export type { RoomPlayer, RevealResult, RoomSummary, RoomState };


// StoredRoomState is the API-internal shape — extends the public RoomState
// with _actualRoll, which is stripped before sending responses to clients.
export interface StoredRoomState extends RoomState {
	_actualRoll: number | null;
}


const INITIAL_LIVES = 8;
const ROOMS_INDEX_ID = 'PANKOV_ROOMS';

function generateRoomCode(): string {
	return Math.random().toString(36).substring(2, 8).toUpperCase();
}


async function loadIndex(): Promise<RoomSummary[]> {
	try {
		const result = await pfPromise<PlayFabServerModels.GetSharedGroupDataResult>(
			cb => PlayFabServer.GetSharedGroupData({ SharedGroupId: ROOMS_INDEX_ID, Keys: ['rooms'] }, cb),
		);
		const value = result.Data?.['rooms']?.Value;
		return value ? (JSON.parse(value) as RoomSummary[]) : [];
	} catch {
		return [];
	}
}

async function saveIndex(rooms: RoomSummary[]): Promise<void> {
	const data = { rooms: JSON.stringify(rooms) };
	try {
		await pfPromise<PlayFabServerModels.UpdateSharedGroupDataResult>(
			cb => PlayFabServer.UpdateSharedGroupData({ SharedGroupId: ROOMS_INDEX_ID, Data: data }, cb),
		);
	} catch {
		// Index group may not exist yet — create it and retry once
		await pfPromise<PlayFabServerModels.CreateSharedGroupResult>(
			cb => PlayFabServer.CreateSharedGroup({ SharedGroupId: ROOMS_INDEX_ID }, cb),
		);
		await pfPromise<PlayFabServerModels.UpdateSharedGroupDataResult>(
			cb => PlayFabServer.UpdateSharedGroupData({ SharedGroupId: ROOMS_INDEX_ID, Data: data }, cb),
		);
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
	const { _actualRoll: _ignored, ...pub } = state;
	return pub;
}


const roomListInner: InnerFunction<never, RoomSummary[]> = async () => {
	return loadIndex();
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
	state.players.push({ playFabId, name: trimmedName, lives: INITIAL_LIVES });
	await saveState(roomId, state);
	await updateIndexPlayers(roomId, state.players.map((p) => p.name)).catch(() => { /* non-critical */ });
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
	state.phase = 'playing';
	state.gamePhase = 'turn-start';
	state.currentPlayerIndex = 0;
	await saveState(roomId, state);
	await removeFromIndex(roomId).catch(() => { /* non-critical */ });
	return publicState(state);
};

registerAzureHttpFunction('room_list', 'GET', 'rooms', roomListInner);
registerAzureHttpFunction('room_create', 'POST', 'rooms', roomCreateInner);
registerAzureHttpFunction('room_join', 'POST', 'rooms/join', roomJoinInner);
registerAzureHttpFunction('room_getState', 'GET', 'rooms/{roomId}', roomGetStateInner);
registerAzureHttpFunction('room_start', 'POST', 'rooms/{roomId}/start', roomStartInner);