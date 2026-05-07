import { RoomCreateRequest, RoomBaseRequest, RoomKickRequest, RoomData, BaseRequest } from '@gandogames/common/api';
import { Game, GAMES_CONFIG } from '../../games';
import { InnerFunction, PlayfabCtx, registerFunction } from '../..';

const roomCreateInner: InnerFunction<RoomCreateRequest, RoomData> = async (body, notifier, player) => {
	const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
	const room: RoomData = {
		id: roomId,
		hostId: player.id,
		game: body.game,
		players: [player],
		kickedPlayers: [],
		phase: 'waiting',
		history: [],
		chat: [],
		lastUpdate: new Date(),
	};
	await PlayfabCtx.rooms.upsert(roomId, room);
	notifier.addToGroup(player.id, roomId);
	notifier.roomUpsert(room);
	return room;
};

const roomListInner: InnerFunction<BaseRequest, RoomData[]> = async (_body, _notifier, _player) => {
	return await PlayfabCtx.rooms.list();
};

const roomGetInner: InnerFunction<RoomBaseRequest, RoomData> = async (body, _notifier, _player) => {
	const room = await PlayfabCtx.rooms.get(body.roomId);
	if (room == null) throw new Error('Room not found');
	return room;
};

const roomJoinInner: InnerFunction<RoomBaseRequest, RoomData> = async (body, notifier, player) => {
	const room = await PlayfabCtx.rooms.get(body.roomId);
	if (room == null) throw new Error('Room not found');
	if (room.phase !== 'waiting') throw new Error('Game already started');
	if (room.players.some(p => p.id === player.id)) throw new Error('Already in this room');
	if (room.kickedPlayers?.includes(player.id)) throw new Error('You have been kicked from this room');

	const gameConfig = GAMES_CONFIG[room.game];
	if (room.players.length >= gameConfig.maxPlayers) throw new Error('Max player for this game');

	room.players.push(player);
	await PlayfabCtx.rooms.upsert(body.roomId, room);
	notifier.addToGroup(player.id, body.roomId);
	notifier.roomUpsert(room);
	return room;
};

const roomStartInner: InnerFunction<RoomBaseRequest, RoomData> = async (body, notifier, player) => {
	const room = await PlayfabCtx.rooms.get(body.roomId);
	if (room == null) throw new Error('Room not found');
	if (room.hostId != player.id) throw new Error('You are not the host of this room');
	if (room.phase !== 'waiting') throw new Error('Game already started');

	const gameConfig = GAMES_CONFIG[room.game];
	if (room.players.length > gameConfig.maxPlayers) throw new Error('Max player for this game');
	if (room.players.length < gameConfig.minPlayers) throw new Error('Not enought player for this game');

	room.phase = 'playing';
	await PlayfabCtx.rooms.upsert(body.roomId, room);

	const game = Game.Factory(room.game);
	game.initialize(room.players);
	await PlayfabCtx.game[room.game].upsert(body.roomId, game.state!);
	for (const p of room.players) {
		notifier.gameStateUpdatedForPlayer(p.id, body.roomId, game.getPublicState(p.id));
	}

	notifier.roomUpsert(room);
	return room;
};

const roomLeaveInner: InnerFunction<RoomBaseRequest, void> = async (body, notifier, player) => {
	const room = await PlayfabCtx.rooms.get(body.roomId);
	if (room == null) throw new Error('Room not found');
	if (!room.players.some(p => p.id === player.id)) throw new Error('You are not in this room');

	notifier.removeFromGroup(player.id, body.roomId);

	if (room.players.length == 1) {
		await PlayfabCtx.rooms.delete(body.roomId);
		notifier.roomDeleted(body.roomId);
		return;
	}

	room.players = room.players.filter(p => p.id != player.id);
	if (room.hostId == player.id) {
		room.hostId = room.players[0].id;
	}
	await PlayfabCtx.rooms.upsert(body.roomId, room);
	notifier.roomUpsert(room);
};

const roomResetInner: InnerFunction<RoomBaseRequest, RoomData> = async (body, notifier, player) => {
	const room = await PlayfabCtx.rooms.get(body.roomId);
	if (room == null) throw new Error('Room not found');
	if (room.hostId !== player.id) throw new Error('You are not the host of this room');
	if (room.phase !== 'playing') throw new Error('Game is not in progress');

	room.phase = 'waiting';
	room.history = [];
	room.lastUpdate = new Date();
	await PlayfabCtx.rooms.upsert(body.roomId, room);
	notifier.roomUpsert(room);
	return room;
};

const roomKickInner: InnerFunction<RoomKickRequest, RoomData> = async (body, notifier, player) => {
	const room = await PlayfabCtx.rooms.get(body.roomId);
	if (room == null) throw new Error('Room not found');
	if (room.hostId !== player.id) throw new Error('You are not the host of this room');
	if (room.phase !== 'waiting') throw new Error('Cannot kick players after the game has started');
	if (body.playerId === player.id) throw new Error('You cannot kick yourself');
	if (!room.players.some(p => p.id === body.playerId)) throw new Error('Player not found in this room');

	notifier.removeFromGroup(body.playerId, body.roomId);
	notifier.roomDeletedForPlayer(body.playerId, body.roomId);

	room.players = room.players.filter(p => p.id !== body.playerId);
	room.kickedPlayers = [...(room.kickedPlayers ?? []), body.playerId];
	await PlayfabCtx.rooms.upsert(body.roomId, room);
	notifier.roomUpsert(room);
	return room;
};

registerFunction('room_create', 'rooms/create', roomCreateInner);
registerFunction('room_list', 'rooms/list', roomListInner);
registerFunction('room_get', 'rooms/get', roomGetInner);
registerFunction('room_join', 'rooms/join', roomJoinInner);
registerFunction('room_start', 'rooms/start', roomStartInner);
registerFunction('room_reset', 'rooms/reset', roomResetInner);
registerFunction('room_kick', 'rooms/kick', roomKickInner);
registerFunction('room_leave', 'rooms/leave', roomLeaveInner);
