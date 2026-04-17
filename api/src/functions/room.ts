import { RoomCreateRequest, RoomBaseRequest, RoomData, BaseRequest } from '@gandogames/common/api';
import { InnerFunction, PlayfabCtx, registerFunction } from '..';
import { GAMES_CONFIG } from '@gandogames/common/games';

const roomCreateInner: InnerFunction<RoomCreateRequest, RoomData> = async (body, options, player) => {
	options.successCode = 201;
	const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
	const room: RoomData = {
		id: roomId,
		name: body.name.trim(),
		hostId: player.id,
		game: body.game,
		players: [player],
		phase: 'waiting',
	};
	await PlayfabCtx.rooms.upsert(roomId, room)
	return room;
};

const roomListInner: InnerFunction<BaseRequest, RoomData[]> = async (_body, _options, _player) => {
	return await PlayfabCtx.rooms.list();
};

const roomJoinInner: InnerFunction<RoomBaseRequest, RoomData> = async (body, options, player) => {
	const room = await PlayfabCtx.rooms.get(body.roomId);
	if (room == null) throw new Error('Room not found');
	if (room.phase !== 'waiting') throw new Error('Game already started');
	if (room.players.some(p => p.id === player.id)) throw new Error('Already in this room');

	const gameConfig = GAMES_CONFIG[room.game];
	if (room.players.length >= gameConfig.maxPlayers) throw new Error('Max player for this game');
	
	room.players.push(player);
	await PlayfabCtx.rooms.upsert(body.roomId, room);
	return room;
};

const roomStartInner: InnerFunction<RoomBaseRequest, RoomData> = async (body, options, player) => {
	const room = await PlayfabCtx.rooms.get(body.roomId);
	if (room == null) throw new Error('Room not found');
	if (room.hostId != player.id) throw new Error('You are not the host of this room');
	if (room.phase !== 'waiting') throw new Error('Game already started');
	
	const gameConfig = GAMES_CONFIG[room.game];
	if (room.players.length >= gameConfig.maxPlayers) throw new Error('Max player for this game');
	if (room.players.length < gameConfig.maxPlayers) throw new Error('Max player for this game');

	room.players.push(player);
	await PlayfabCtx.rooms.upsert(body.roomId, room);
	return room;
};

const roomLeaveInner: InnerFunction<RoomBaseRequest, void> = async (body, options, player) => {
	const room = await PlayfabCtx.rooms.get(body.roomId);
	if (room == null) throw new Error('Room not found');
	if (!room.players.some(p => p.id === player.id)) throw new Error('You are not in this room');

	if (room.players.length == 1) {
		await PlayfabCtx.rooms.delete(body.roomId);
		return;
	}

	room.players = room.players.filter(p => p.id != player.id);
	if (room.hostId == player.id) {
		room.hostId = room.players[0].id;
	}
	await PlayfabCtx.rooms.upsert(body.roomId, room);
};

registerFunction('room_create', 'rooms', roomCreateInner);
registerFunction('room_list', 'rooms/list', roomListInner);
registerFunction('room_join', 'rooms/join', roomJoinInner);
registerFunction('room_start', 'rooms/start', roomStartInner);
registerFunction('room_leave', 'rooms/leave', roomLeaveInner);