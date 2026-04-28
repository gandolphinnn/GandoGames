import { RoomCreateRequest, RoomBaseRequest, RoomData, BaseRequest } from '@gandogames/common/api';
import { Game, GAMES_CONFIG } from '../games';
import { InnerFunction, PlayfabCtx, registerFunction } from '..';

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
	await PlayfabCtx.rooms.upsert(roomId, room);
	options.signalR.push({ target: 'roomUpdated', arguments: [room] });
	return room;
};

const roomListInner: InnerFunction<BaseRequest, RoomData[]> = async (_body, _options, _player) => {
	return await PlayfabCtx.rooms.list();
};

const roomGetInner: InnerFunction<RoomBaseRequest, RoomData> = async (body, _options, _player) => {
	const room = await PlayfabCtx.rooms.get(body.roomId);
	if (room == null) throw new Error('Room not found');
	return room;
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
	options.signalR.push({ action: 'add', userId: player.id, groupName: `room-${body.roomId}` });
	options.signalR.push({ target: 'roomUpdated', arguments: [room] });
	return room;
};

const roomStartInner: InnerFunction<RoomBaseRequest, RoomData> = async (body, options, player) => {
	const room = await PlayfabCtx.rooms.get(body.roomId);
	if (room == null) throw new Error('Room not found');
	if (room.hostId != player.id) throw new Error('You are not the host of this room');
	if (room.phase !== 'waiting') throw new Error('Game already started');

	const gameConfig = GAMES_CONFIG[room.game];
	if (room.players.length > gameConfig.maxPlayers) throw new Error('Max player for this game');
	if (room.players.length < gameConfig.minPlayers) throw new Error('Not enought player for this game');

	room.phase = 'playing';
	await PlayfabCtx.rooms.upsert(body.roomId, room);
	const state = Game.Factory(room.game).state!;
	await PlayfabCtx.game[room.game].upsert(body.roomId, state);
	options.signalR.push({ target: 'roomUpdated', arguments: [room] });
	return room;
};

const roomLeaveInner: InnerFunction<RoomBaseRequest, void> = async (body, options, player) => {
	const room = await PlayfabCtx.rooms.get(body.roomId);
	if (room == null) throw new Error('Room not found');
	if (!room.players.some(p => p.id === player.id)) throw new Error('You are not in this room');

	options.signalR.push({ action: 'remove', userId: player.id, groupName: `room-${body.roomId}` });

	if (room.players.length == 1) {
		await PlayfabCtx.rooms.delete(body.roomId);
		options.signalR.push({ target: 'roomDeleted', arguments: [body.roomId] });
		return;
	}

	room.players = room.players.filter(p => p.id != player.id);
	if (room.hostId == player.id) {
		room.hostId = room.players[0].id;
	}
	await PlayfabCtx.rooms.upsert(body.roomId, room);
	options.signalR.push({ target: 'roomUpdated', arguments: [room] });
};

registerFunction('room_create', 'rooms/create', roomCreateInner);
registerFunction('room_list', 'rooms/list', roomListInner);
registerFunction('room_get', 'rooms/get', roomGetInner);
registerFunction('room_join', 'rooms/join', roomJoinInner);
registerFunction('room_start', 'rooms/start', roomStartInner);
registerFunction('room_leave', 'rooms/leave', roomLeaveInner);
