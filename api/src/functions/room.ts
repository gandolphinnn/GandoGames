import { CreateRoomRequest, RoomRequest } from '@gandogames/common/api';
import { authenticateSession, InnerAuthorizedFunction, pfPromise, PlayFabServer, registerAuthorizedFunction } from '..';
import { StoredRoomState, loadState, saveState } from './game';


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

// ── Endpoint handlers ─────────────────────────────────────────────────────────

const roomCreateInner: InnerAuthorizedFunction<CreateRoomRequest, { roomId: string }> = async (body, params, options, playerId) => {
	options.errorCode = 400;
	options.successCode = 201;
	const roomId = generateRoomCode();
	await pfPromise<PlayFabServerModels.CreateSharedGroupResult>(
		cb => PlayFabServer.CreateSharedGroup({ SharedGroupId: roomId }, cb),
	);
	const trimmedName = body.name.trim();
	const state: StoredRoomState = {
		phase: 'waiting',
		hostId,
		gameId: body.game,
		players: [{ id: hostId, name: trimmedName }],
		gameState: null,
		lastUpdated: new Date().toISOString(),
		_hiddenState: null,
	};
	await saveState(roomId, state);
	await addToIndex(body.game, { roomId, players: [trimmedName], createdAt: new Date().toISOString() });
	return { roomId };
};

/* const roomJoinInner: InnerAuthorizedFunction<RoomRequest, { roomId: string }> = async (body, _params, options, playerId) => {
	options.errorCode = 400;
	const roomId = body.roomId.trim().toUpperCase();
	const state = await loadState(roomId);
	if (state.phase !== 'waiting') throw new Error('Game already started');
	if (state.players.length >= 6) throw new Error('Room is full');
	if (state.players.some((p) => p.id === playFabId)) throw new Error('Already in this room');
	const trimmedName = body.playerName.trim();
	state.players.push({ id: playFabId, name: trimmedName });
	await saveState(roomId, state);
	await updateIndexPlayers(state.gameId, roomId, state.players.map((p) => p.name)).catch(() => { /* non-critical */ });
	return { roomId };
}; */

registerAuthorizedFunction('room_create', 'POST', 'rooms', roomCreateInner);
registerAuthorizedFunction('room_list', 'GET', 'rooms', roomListInner);
registerAuthorizedFunction('room_join', 'POST', 'rooms/join', roomJoinInner);
