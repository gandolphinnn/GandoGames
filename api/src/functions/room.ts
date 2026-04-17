import { RoomCreateRequest, RoomBaseRequest, RoomData, BaseRequest } from '@gandogames/common/api';
import { InnerFunction, registerFunction } from '..';
import { PlayfabDB } from '../db/db';

//#region Endpoint handlers
const roomCreateInner: InnerFunction<RoomCreateRequest, RoomData> = async (body, _params, options, player) => {
	options.successCode = 201;
	const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
	const room: RoomData = {
		id: roomId,
		name: body.name.trim(),
		hostId: player.id,
		gameId: body.game,
		players: [player],
		phase: 'waiting',
	};
	await PlayfabDB.rooms.upsert(roomId, room)
	return room;
};

const roomListInner: InnerFunction<BaseRequest, RoomData[]> = async (_body, _params, _options, _player) => {
	return await PlayfabDB.rooms.list();
};

const roomJoinInner: InnerFunction<RoomBaseRequest, RoomData> = async (body, _params, options, player) => {
	const room = await PlayfabDB.rooms.get(body.roomId);
	if (room == null) throw new Error('Room not found');
	if (room.phase !== 'waiting') throw new Error('Game already started');
	if (room.players.some(p => p.id === player.id)) throw new Error('Already in this room');

	room.players.push(player);
	await PlayfabDB.rooms.upsert(body.roomId, room);
	return room;
};

const roomLeaveInner: InnerFunction<RoomBaseRequest, void> = async (body, _params, options, player) => {
	const room = await PlayfabDB.rooms.get(body.roomId);
	if (room == null) throw new Error('Room not found');
	if (!room.players.some(p => p.id === player.id)) throw new Error('You are not in this room');

	if (room.players.length == 1) {
		await PlayfabDB.rooms.delete(body.roomId);
		return;
	}

	room.players = room.players.filter(p => p.id != player.id);
	if (room.hostId == player.id) {
		room.hostId = room.players[0].id;
	}
	await PlayfabDB.rooms.upsert(body.roomId, room);
};

registerFunction('room_create', 'POST', 'rooms', roomCreateInner);
registerFunction('room_list', 'POST', 'rooms/list', roomListInner);
registerFunction('room_join', 'POST', 'rooms/join', roomJoinInner);
registerFunction('room_leave', 'POST', 'rooms/leave', roomLeaveInner);
//#endregion Endpoint handlers
