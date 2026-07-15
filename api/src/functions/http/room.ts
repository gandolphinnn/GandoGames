import { API, RoomData, resolveAccessPolicy } from '@gandogames/shared/dto';
import { Game, GAMES_CONFIG } from '../../games';
import { InnerFunction, PlayfabCtx, registerEndpoint } from '../..';
import { areFriends } from './friends';

const roomCreateInner: InnerFunction<typeof API.rooms.create> = async (body, _params, notifier, player) => {
	const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
	const room: RoomData = {
		id: roomId,
		hostId: player.id,
		game: body.game,
		players: [player],
		kickedPlayers: [],
		phase: 'waiting',
		// Rooms are always created public; the host can change access later from the lobby.
		access: 'public',
		chat: [],
		lastUpdate: new Date(),
	};
	await PlayfabCtx.rooms.upsert(roomId, room);
	notifier.addToGroup(player.id, roomId);
	notifier.roomUpsert(room);
	return room;
};

const roomListInner: InnerFunction<typeof API.rooms.list> = async (_body, _params, _notifier, player) => {
	const rooms = await PlayfabCtx.rooms.list();
	const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
	return rooms
		// Include the caller's own rooms: the client splits them into the menu's "Active Rooms"
		// (myRooms) vs the browsable list (browsableRooms). Only hide rooms they were kicked from.
		// Only public/friends rooms are listed to non-members; link & closed rooms are unlisted
		// (surfaced only to members, who reached them via code/invite).
		.filter(r =>
			!(r.kickedPlayers ?? []).includes(player.id) &&
			new Date(r.lastUpdate) >= oneHourAgo &&
			(r.access === 'public' || r.access === 'friends' || r.players.some(p => p.id === player.id))
		)
		.map(({ chat: _c, kickedPlayers: _k, ...summary }) => summary);
};

const roomGetInner: InnerFunction<typeof API.rooms.get> = async (_body, params, notifier, player) => {
	const room = await PlayfabCtx.rooms.get(params.roomId);
	if (room == null) throw new Error('Room not found');
	const idx = room.players.findIndex(p => p.id === player.id);
	// A closed room is invisible to anyone who isn't already a member — indistinguishable from
	// a missing room, so it can't be reached by code lookup or a direct URL either.
	if (room.access === 'closed' && idx === -1) throw new Error('Room not found');
	if (idx !== -1 && room.players[idx].icon !== player.icon) {
		room.players[idx] = { ...room.players[idx], icon: player.icon };
		await PlayfabCtx.rooms.upsert(params.roomId, room);
		notifier.roomUpsert(room);
	}
	return room;
};

const roomJoinInner: InnerFunction<typeof API.rooms.join> = async (_body, params, notifier, player) => {
	const room = await PlayfabCtx.rooms.get(params.roomId);
	if (room == null) throw new Error('Room not found');
	if (room.phase !== 'waiting') throw new Error('Game already started');
	if (room.players.some(p => p.id === player.id)) throw new Error('Already in this room');
	if (room.kickedPlayers?.includes(player.id)) throw new Error('You have been kicked from this room');
	if (room.access === 'closed') throw new Error('This room is closed');

	const gameConfig = GAMES_CONFIG[room.game];
	if (room.players.length >= gameConfig.maxPlayers) throw new Error('Max players for this game');

	// Friends-only rooms admit only the host's accepted friends. Link rooms need no extra check:
	// reaching join with the right room code is itself proof of access (the code is the room id).
	if (room.access === 'friends' && !(await areFriends(room.hostId, player.id))) {
		throw new Error("Only the host's friends can join this room");
	}

	room.players.push(player);
	await PlayfabCtx.rooms.upsert(params.roomId, room);
	notifier.addToGroup(player.id, params.roomId);
	notifier.roomUpsert(room);
	return room;
};

const roomStartInner: InnerFunction<typeof API.rooms.start> = async (_body, params, notifier, player) => {
	const room = await PlayfabCtx.rooms.get(params.roomId);
	if (room == null) throw new Error('Room not found');
	if (room.hostId !== player.id) throw new Error('You are not the host of this room');
	if (room.phase !== 'waiting') throw new Error('Game already started');

	const gameConfig = GAMES_CONFIG[room.game];
	if (room.players.length > gameConfig.maxPlayers) throw new Error('Max players for this game');
	if (room.players.length < gameConfig.minPlayers) throw new Error('Not enough players for this game');

	room.phase = 'playing';
	await PlayfabCtx.rooms.upsert(params.roomId, room);

	const game = Game.Factory(room.game);
	game.initialize(room.players, room.settings);
	await PlayfabCtx.game[room.game].upsert(params.roomId, game.state!);
	for (const p of room.players) {
		notifier.gameStateUpdatedForPlayer(p.id, params.roomId, game.getPublicState(p.id));
	}

	notifier.roomUpsert(room);
	return room;
};

const roomLeaveInner: InnerFunction<typeof API.rooms.leave> = async (_body, params, notifier, player) => {
	const room = await PlayfabCtx.rooms.get(params.roomId);
	if (room == null) throw new Error('Room not found');
	if (!room.players.some(p => p.id === player.id)) throw new Error('You are not in this room');

	notifier.removeFromGroup(player.id, params.roomId);

	if (room.players.length === 1) {
		await PlayfabCtx.rooms.delete(params.roomId);
		notifier.roomDeleted(params.roomId);
		return;
	}

	room.players = room.players.filter(p => p.id !== player.id);
	if (room.hostId === player.id) {
		room.hostId = room.players[0].id;
	}
	if (room.phase === 'playing') {
		room.phase = 'ended';
	}
	await PlayfabCtx.rooms.upsert(params.roomId, room);
	notifier.roomUpsert(room);
};

const roomResetInner: InnerFunction<typeof API.rooms.reset> = async (_body, params, notifier, player) => {
	const room = await PlayfabCtx.rooms.get(params.roomId);
	if (room == null) throw new Error('Room not found');
	if (room.hostId !== player.id) throw new Error('You are not the host of this room');
	if (room.phase !== 'playing') throw new Error('Game is not in progress');

	room.phase = 'waiting';
	room.lastUpdate = new Date();
	await PlayfabCtx.rooms.upsert(params.roomId, room);
	notifier.roomUpsert(room);
	return room;
};

const roomAccessSetInner: InnerFunction<typeof API.rooms.setAccess> = async (body, params, notifier, player) => {
	const room = await PlayfabCtx.rooms.get(params.roomId);
	if (room == null) throw new Error('Room not found');
	if (room.hostId !== player.id) throw new Error('You are not the host of this room');
	if (room.phase !== 'waiting') throw new Error('Cannot change access after the game has started');

	room.access = resolveAccessPolicy(body.access);
	await PlayfabCtx.rooms.upsert(params.roomId, room);
	notifier.roomUpsert(room);
	return room;
};

const roomKickInner: InnerFunction<typeof API.rooms.kick> = async (_body, params, notifier, player) => {
	const room = await PlayfabCtx.rooms.get(params.roomId);
	if (room == null) throw new Error('Room not found');
	if (room.hostId !== player.id) throw new Error('You are not the host of this room');
	if (room.phase !== 'waiting') throw new Error('Cannot kick players after the game has started');
	if (params.playerId === player.id) throw new Error('You cannot kick yourself');
	if (!room.players.some(p => p.id === params.playerId)) throw new Error('Player not found in this room');

	// The room still exists for the kicked player; the roomUpsert below (carrying them in
	// kickedPlayers) is what notifies them. Don't also send roomDeleted — that would surface a
	// misleading "the host has closed the room" toast on top of the "you have been kicked" one.
	notifier.removeFromGroup(params.playerId, params.roomId);

	room.players = room.players.filter(p => p.id !== params.playerId);
	room.kickedPlayers = [...(room.kickedPlayers ?? []), params.playerId];
	await PlayfabCtx.rooms.upsert(params.roomId, room);
	notifier.roomUpsert(room);
	return room;
};

const roomInviteInner: InnerFunction<typeof API.rooms.invite> = async (body, params, notifier, player) => {
	const room = await PlayfabCtx.rooms.get(params.roomId);
	if (room == null) throw new Error('Room not found');
	if (room.hostId !== player.id) throw new Error('Only the host can invite players');
	if (room.phase !== 'waiting') throw new Error('Cannot invite after game has started');
	const gameConfig = GAMES_CONFIG[room.game];
	if (room.players.length >= gameConfig.maxPlayers) throw new Error('Room is full');
	if (room.players.some(p => p.id === body.friendId)) throw new Error('Player is already in this room');

	// Inviting a previously-kicked player clears their kick, so they can accept and rejoin.
	if (room.kickedPlayers?.includes(body.friendId)) {
		room.kickedPlayers = room.kickedPlayers.filter(id => id !== body.friendId);
		await PlayfabCtx.rooms.upsert(params.roomId, room);
		notifier.roomUpsert(room);
	}

	notifier.roomInviteForPlayer(body.friendId, params.roomId, room.game);
};

const roomDeleteInner: InnerFunction<typeof API.rooms.delete> = async (_body, params, notifier, player) => {
	const room = await PlayfabCtx.rooms.get(params.roomId);
	if (room == null) throw new Error('Room not found');
	if (room.hostId !== player.id) throw new Error('You are not the host of this room');

	await PlayfabCtx.rooms.delete(params.roomId);
	notifier.roomDeleted(params.roomId);
};

// rooms/create has no {roomId} route param yet, and list/get are safe reads (GET), so none of
// them take the per-room lock. Every other endpoint here mutates room state through an unsafe
// method on a {roomId} route, so registerEndpoint serializes it per room automatically and
// concurrent calls — e.g. two players joining at once — can't overwrite each other.
registerEndpoint(API.rooms.create, roomCreateInner);
registerEndpoint(API.rooms.list, roomListInner);
registerEndpoint(API.rooms.get, roomGetInner);
registerEndpoint(API.rooms.join, roomJoinInner);
registerEndpoint(API.rooms.start, roomStartInner);
registerEndpoint(API.rooms.reset, roomResetInner);
registerEndpoint(API.rooms.setAccess, roomAccessSetInner);
registerEndpoint(API.rooms.kick, roomKickInner);
registerEndpoint(API.rooms.leave, roomLeaveInner);
registerEndpoint(API.rooms.invite, roomInviteInner);
registerEndpoint(API.rooms.delete, roomDeleteInner);
