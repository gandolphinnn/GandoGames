import { TestBed } from '@angular/core/testing';
import { signal, computed } from '@angular/core';
import { Subject } from 'rxjs';
import { RoomService } from './room.service';
import { BackendService } from './backend.service';
import { AuthService, AuthUser } from './auth.service';
import { SignalRService } from './signalr.service';
import type { RoomData } from '@gandogames/common/api';

function makeRoom(overrides: Partial<RoomData> = {}): RoomData {
	return {
		id: 'room-1',
		hostId: 'player-1',
		game: 'morra',
		players: [{ id: 'player-1', name: 'Alice' }],
		kickedPlayers: [],
		phase: 'waiting',
		chat: [],
		lastUpdate: new Date(),
		...overrides,
	};
}

const MOCK_USER: AuthUser = {
	sessionTicket: 'ticket-abc',
	player: { id: 'player-1', name: 'Alice', permissions: [] },
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
			permissions: computed(() => userSignal()?.player.permissions ?? []),
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
				{ provide: AuthService, useValue: mockAuth },
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
			const mine = makeRoom({ id: 'r1', phase: 'waiting', players: [{ id: 'player-1', name: 'Alice' }] });
			const other = makeRoom({ id: 'r2', phase: 'waiting', players: [{ id: 'player-2', name: 'Bob' }] });
			const ended = makeRoom({ id: 'r3', phase: 'ended', players: [{ id: 'player-1', name: 'Alice' }] });
			service.rooms.set([mine, other, ended]);

			const result = service.myRooms();
			expect(result).toHaveSize(1);
			expect(result[0].id).toBe('r1');
		});

		it('returns empty array when no rooms match', () => {
			service.rooms.set([makeRoom({ players: [{ id: 'other', name: 'X' }] })]);
			expect(service.myRooms()).toHaveSize(0);
		});
	});

	describe('createRoom()', () => {
		it('calls POST /rooms/create with game and ticket', async () => {
			const room = makeRoom();
			backendSpy.post.and.returnValue(Promise.resolve(room));
			const result = await service.createRoom('morra');
			expect(backendSpy.post).toHaveBeenCalledWith('/rooms/create', { sessionTicket: 'ticket-abc', game: 'morra' });
			expect(result).toEqual(room);
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
			const original = makeRoom({ players: [{ id: 'player-1', name: 'Alice' }] });
			const updated = makeRoom({ players: [{ id: 'player-1', name: 'Alice' }, { id: 'player-2', name: 'Bob' }] });
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
