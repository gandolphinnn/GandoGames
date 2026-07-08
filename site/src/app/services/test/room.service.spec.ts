import { TestBed } from '@angular/core/testing';
import { signal, computed } from '@angular/core';
import { Subject } from 'rxjs';
import { RoomService } from '../room.service';
import { BackendService } from '../backend.service';
import { AuthUser, UserService } from '../user.service';
import { SignalRService } from '../signalr.service';
import type { GamePlayer, RoomData } from '@gandogames/shared/dto';

function makePlayer(id: string, name: string): GamePlayer {
	return { id, name, icon: 'profile', theme: 'dark', language: 'en', isGuest: false };
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

const MOCK_USER: AuthUser = {
	sessionTicket: 'ticket-abc',
	player: makePlayer('player-1', 'Alice'),
	isGuest: false,
};

describe('RoomService', () => {
	let service: RoomService;
	let backendSpy: jasmine.SpyObj<BackendService>;
	let roomUpsert$: Subject<RoomData>;
	let roomDeleted$: Subject<string>;

	beforeEach(() => {
		backendSpy = jasmine.createSpyObj('BackendService', ['post']);
		roomUpsert$ = new Subject<RoomData>();
		roomDeleted$ = new Subject<string>();

		const userSignal = signal<AuthUser | null>(MOCK_USER);
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
		it('calls POST /rooms/list and sets rooms signal', async () => {
			const rooms = [makeRoom()];
			backendSpy.post.and.returnValue(Promise.resolve(rooms));
			await service.loadRooms();
			expect(backendSpy.post).toHaveBeenCalledWith('/rooms/list', { sessionTicket: 'ticket-abc' });
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
		it('calls POST /rooms/create with game and ticket', async () => {
			const room = makeRoom();
			backendSpy.post.and.returnValue(Promise.resolve(room));
			const result = await service.createRoom('pankov');
			expect(backendSpy.post).toHaveBeenCalledWith('/rooms/create', { sessionTicket: 'ticket-abc', game: 'pankov' });
			expect(result).toEqual(room);
		});
	});

	describe('setRoomAccess()', () => {
		it('calls POST /rooms/access with the access policy', async () => {
			backendSpy.post.and.returnValue(Promise.resolve(makeRoom()));
			await service.setRoomAccess('room-1', 'friends');
			expect(backendSpy.post).toHaveBeenCalledWith('/rooms/access', { sessionTicket: 'ticket-abc', roomId: 'room-1', access: 'friends' });
		});
	});

	describe('joinRoom()', () => {
		it('calls POST /rooms/join', async () => {
			const room = makeRoom();
			backendSpy.post.and.returnValue(Promise.resolve(room));
			await service.joinRoom('room-1');
			expect(backendSpy.post).toHaveBeenCalledWith('/rooms/join', { sessionTicket: 'ticket-abc', roomId: 'room-1' });
		});
	});

	describe('leaveRoom()', () => {
		it('calls POST /rooms/leave', async () => {
			backendSpy.post.and.returnValue(Promise.resolve(undefined));
			await service.leaveRoom('room-1');
			expect(backendSpy.post).toHaveBeenCalledWith('/rooms/leave', { sessionTicket: 'ticket-abc', roomId: 'room-1' });
		});
	});

	describe('getRoom()', () => {
		it('fetches room and inserts it into rooms signal if not present', async () => {
			const room = makeRoom();
			backendSpy.post.and.returnValue(Promise.resolve(room));
			await service.getRoom('room-1');
			expect(service.rooms()).toContain(room);
		});

		it('fetches room and updates existing entry in rooms signal', async () => {
			const original = makeRoom({ players: [makePlayer('player-1', 'Alice')] });
			const updated = makeRoom({ players: [makePlayer('player-1', 'Alice'), makePlayer('player-2', 'Bob')] });
			service.rooms.set([original]);
			backendSpy.post.and.returnValue(Promise.resolve(updated));
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
