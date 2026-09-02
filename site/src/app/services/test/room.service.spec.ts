import { TestBed } from '@angular/core/testing';
import { signal, computed } from '@angular/core';
import { Subject } from 'rxjs';
import { RoomService } from '../room.service';
import { BackendService } from '../backend.service';
import { UserService } from '../user.service';
import { SignalRService } from '../signalr.service';
import { API } from '@gandogames/shared/dto';
import type { AuthResponse, GamePlayer, RoomData } from '@gandogames/shared/dto';

function makePlayer(id: string, name: string): GamePlayer {
	return { id, name, icon: 'profile', theme: 'dark', language: 'en', type: 'user', role: '' };
}

function makeRoom(overrides: Partial<RoomData> = {}): RoomData {
	return {
		id: 'room-1',
		hostId: 'player-1',
		game: 'pankov',
		players: [makePlayer('player-1', 'Alice')],
		kickedPlayers: [],
		phase: 'waiting',
		access: 'public',
		chat: [],
		lastUpdate: new Date(),
		...overrides,
	};
}

const MOCK_USER: AuthResponse = {
	sessionTicket: 'ticket-abc',
	player: makePlayer('player-1', 'Alice'),
};

// jasmine derives a generic method's spy signature from its widest instantiation, where call()'s
// options tuple collapses to [] — intersect with a plain Spy so matchers accept (endpoint, options).
type BackendSpy = jasmine.SpyObj<BackendService> & { call: jasmine.Spy };

describe('RoomService', () => {
	let service: RoomService;
	let backendSpy: BackendSpy;
	let roomUpsert$: Subject<RoomData>;
	let roomDeleted$: Subject<string>;

	beforeEach(() => {
		backendSpy = jasmine.createSpyObj('BackendService', ['call']) as BackendSpy;
		roomUpsert$ = new Subject<RoomData>();
		roomDeleted$ = new Subject<string>();

		const userSignal = signal<AuthResponse | null>(MOCK_USER);
		const mockAuth = {
			user: userSignal.asReadonly(),
			isLoggedIn: computed(() => userSignal() !== null),
		};

		const mockSignalR = {
			events: {
				roomUpsert: roomUpsert$,
				roomDeleted: roomDeleted$,
			},
		};

		TestBed.configureTestingModule({
			providers: [
				RoomService,
				{ provide: BackendService, useValue: backendSpy },
				{ provide: UserService, useValue: mockAuth },
				{ provide: SignalRService, useValue: mockSignalR },
			],
		});
		service = TestBed.inject(RoomService);
	});

	describe('loadRooms()', () => {
		it('calls the rooms.list endpoint and sets rooms signal', async () => {
			const rooms = [makeRoom()];
			backendSpy.call.and.returnValue(Promise.resolve(rooms));
			await service.loadRooms();
			expect(backendSpy.call).toHaveBeenCalledWith(API.rooms.list);
			expect(service.rooms()).toEqual(rooms);
		});
	});

	describe('myRooms (computed)', () => {
		it('returns only rooms where current player is a participant and phase is not ended', () => {
			const mine = makeRoom({ id: 'r1', phase: 'waiting', players: [makePlayer('player-1', 'Alice')] });
			const other = makeRoom({ id: 'r2', phase: 'waiting', players: [makePlayer('player-2', 'Bob')] });
			const ended = makeRoom({ id: 'r3', phase: 'ended', players: [makePlayer('player-1', 'Alice')] });
			service.rooms.set([mine, other, ended]);

			const result = service.myRooms();
			expect(result).toHaveSize(1);
			expect(result[0].id).toBe('r1');
		});

		it('returns empty array when no rooms match', () => {
			service.rooms.set([makeRoom({ players: [makePlayer('other', 'X')] })]);
			expect(service.myRooms()).toHaveSize(0);
		});
	});

	describe('browsableRooms (computed)', () => {
		it('shows only public/friends rooms the player is not already in (link & closed are unlisted)', () => {
			const mine = makeRoom({ id: 'mine', players: [makePlayer('player-1', 'Alice')] });
			const publicRoom = makeRoom({ id: 'pub', players: [makePlayer('other', 'X')] });
			const friendsRoom = makeRoom({ id: 'fr', access: 'friends', players: [makePlayer('other', 'X')] });
			const linkRoom = makeRoom({ id: 'link', access: 'link', players: [makePlayer('other', 'X')] });
			const closedRoom = makeRoom({ id: 'closed', access: 'closed', players: [makePlayer('other', 'X')] });
			service.rooms.set([mine, publicRoom, friendsRoom, linkRoom, closedRoom]);

			expect(service.browsableRooms().map(r => r.id)).toEqual(['pub', 'fr']);
		});
	});

	describe('createRoom()', () => {
		it('calls the rooms.create endpoint with the game in the body', async () => {
			const room = makeRoom();
			backendSpy.call.and.returnValue(Promise.resolve(room));
			const result = await service.createRoom('pankov');
			expect(backendSpy.call).toHaveBeenCalledWith(API.rooms.create, { body: { game: 'pankov' } });
			expect(result).toEqual(room);
		});
	});

	describe('setRoomAccess()', () => {
		it('calls the rooms.setAccess endpoint with the room in the path and the policy in the body', async () => {
			backendSpy.call.and.returnValue(Promise.resolve(makeRoom()));
			await service.setRoomAccess('room-1', 'friends');
			expect(backendSpy.call).toHaveBeenCalledWith(API.rooms.setAccess, { params: { roomId: 'room-1' }, body: { access: 'friends' } });
		});
	});

	describe('joinRoom()', () => {
		it('calls the rooms.join endpoint with the room in the path', async () => {
			const room = makeRoom();
			backendSpy.call.and.returnValue(Promise.resolve(room));
			await service.joinRoom('room-1');
			expect(backendSpy.call).toHaveBeenCalledWith(API.rooms.join, { params: { roomId: 'room-1' } });
		});
	});

	describe('leaveRoom()', () => {
		it('calls the rooms.leave endpoint with the room in the path', async () => {
			backendSpy.call.and.returnValue(Promise.resolve(undefined));
			await service.leaveRoom('room-1');
			expect(backendSpy.call).toHaveBeenCalledWith(API.rooms.leave, { params: { roomId: 'room-1' } });
		});
	});

	describe('getGameState()', () => {
		it('calls the game.state QUERY endpoint with the game in the body', async () => {
			backendSpy.call.and.returnValue(Promise.resolve(null));
			await service.getGameState('pankov', 'room-1');
			expect(backendSpy.call).toHaveBeenCalledWith(API.game.state, { params: { roomId: 'room-1' }, body: { game: 'pankov' } });
		});
	});

	describe('getRoom()', () => {
		it('fetches room and inserts it into rooms signal if not present', async () => {
			const room = makeRoom();
			backendSpy.call.and.returnValue(Promise.resolve(room));
			await service.getRoom('room-1');
			expect(backendSpy.call).toHaveBeenCalledWith(API.rooms.get, { params: { roomId: 'room-1' } });
			expect(service.rooms()).toContain(room);
		});

		it('fetches room and updates existing entry in rooms signal', async () => {
			const original = makeRoom({ players: [makePlayer('player-1', 'Alice')] });
			const updated = makeRoom({ players: [makePlayer('player-1', 'Alice'), makePlayer('player-2', 'Bob')] });
			service.rooms.set([original]);
			backendSpy.call.and.returnValue(Promise.resolve(updated));
			await service.getRoom('room-1');
			expect(service.rooms()[0].players).toHaveSize(2);
		});
	});

	describe('SignalR event handling', () => {
		it('roomUpsert inserts a new room into the signal', () => {
			const room = makeRoom({ id: 'new-room' });
			roomUpsert$.next(room);
			expect(service.rooms().some(r => r.id === 'new-room')).toBeTrue();
		});

		it('roomUpsert replaces an existing room with the same id', () => {
			service.rooms.set([makeRoom({ id: 'r1', phase: 'waiting' })]);
			roomUpsert$.next(makeRoom({ id: 'r1', phase: 'playing' }));
			expect(service.rooms()).toHaveSize(1);
			expect(service.rooms()[0].phase).toBe('playing');
		});

		it('roomDeleted removes a room from the signal', () => {
			service.rooms.set([makeRoom({ id: 'r1' }), makeRoom({ id: 'r2' })]);
			roomDeleted$.next('r1');
			expect(service.rooms().map(r => r.id)).toEqual(['r2']);
		});

		it('roomDeleted is a no-op when room is not in the list', () => {
			service.rooms.set([makeRoom({ id: 'r1' })]);
			roomDeleted$.next('unknown');
			expect(service.rooms()).toHaveSize(1);
		});
	});
});
