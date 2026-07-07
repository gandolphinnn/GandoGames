import { TestBed } from '@angular/core/testing';
import { UserService } from './user.service';
import { BackendService } from './backend.service';
import { StorageService } from './storage.service';
import { ToastService } from './toast.service';
import type { AuthResponse } from '@gandogames/shared/dto';

const MOCK_RESPONSE: AuthResponse = {
	sessionTicket: 'ticket-123',
	player: { id: 'player-1', name: 'Alice', isGuest: false, icon: 'profile', theme: 'dark', language: 'en' },
};

const MOCK_GUEST_RESPONSE: AuthResponse = {
	sessionTicket: 'ticket-123',
	player: { id: 'guest-1', name: 'Guest123456', isGuest: true, icon: 'profile', theme: 'dark', language: 'en' },
};

describe('UserService', () => {
	let backendSpy: jasmine.SpyObj<BackendService>;
	let toastSpy: jasmine.SpyObj<ToastService>;

	function createService(): UserService {
		TestBed.configureTestingModule({
			providers: [
				UserService,
				StorageService,
				{ provide: BackendService, useValue: backendSpy },
				{ provide: ToastService, useValue: toastSpy },
			],
		});
		return TestBed.inject(UserService);
	}

	beforeEach(() => {
		localStorage.clear();
		backendSpy = jasmine.createSpyObj('BackendService', ['post']);
		toastSpy = jasmine.createSpyObj('ToastService', ['warning']);
	});

	describe('initial state', () => {
		it('starts with null user and isLoggedIn false', () => {
			backendSpy.post.and.returnValue(Promise.resolve(MOCK_RESPONSE));
			const service = createService();
			expect(service.user()).toBeNull();
			expect(service.isLoggedIn()).toBeFalse();
		});
	});

	describe('auth methods', () => {
		let service: UserService;
		beforeEach(() => {
			backendSpy.post.and.returnValue(Promise.resolve(MOCK_RESPONSE));
			service = createService();
		});

		it('login() calls backend and sets user with isGuest false', async () => {
			backendSpy.post.and.returnValue(Promise.resolve(MOCK_RESPONSE));
			await service.login('alice@example.com', 'pw');
			expect(backendSpy.post).toHaveBeenCalledWith('/auth/login', { email: 'alice@example.com', password: 'pw' });
			expect(service.user()?.sessionTicket).toBe('ticket-123');
			expect(service.user()?.isGuest).toBeFalse();
			expect(service.isLoggedIn()).toBeTrue();
		});

		it('login() persists only the session ticket to localStorage', async () => {
			backendSpy.post.and.returnValue(Promise.resolve(MOCK_RESPONSE));
			await service.login('alice@example.com', 'pw');
			expect(localStorage.getItem('gg_session_ticket')).toBe('ticket-123');
			expect(localStorage.getItem('gg_auth')).toBeNull();
		});

		it('register() sets user with isGuest false', async () => {
			backendSpy.post.and.returnValue(Promise.resolve(MOCK_RESPONSE));
			await service.register('alice@example.com', 'pw', 'Alice');
			expect(backendSpy.post).toHaveBeenCalledWith('/auth/register', { email: 'alice@example.com', password: 'pw', username: 'Alice' });
			expect(service.user()?.isGuest).toBeFalse();
		});

		it('loginAsGuest() sets user with isGuest true and persists ticket', async () => {
			backendSpy.post.and.returnValue(Promise.resolve(MOCK_GUEST_RESPONSE));
			await service.loginAsGuest();
			expect(service.user()?.isGuest).toBeTrue();
			expect(localStorage.getItem('gg_session_ticket')).toBe('ticket-123');
		});

		it('loginAsGuest() creates a guest ID and reuses it across calls', async () => {
			backendSpy.post.and.returnValue(Promise.resolve(MOCK_RESPONSE));
			await service.loginAsGuest();
			const firstId = localStorage.getItem('gg_guest_id');
			expect(firstId).not.toBeNull();

			backendSpy.post.and.returnValue(Promise.resolve(MOCK_RESPONSE));
			await service.loginAsGuest();
			expect(localStorage.getItem('gg_guest_id')).toBe(firstId);

			const [, body] = backendSpy.post.calls.mostRecent().args as [string, unknown];
			expect((body as { customId: string }).customId).toBe(firstId!);
		});

		it('logout() clears user signal and removes session ticket', async () => {
			backendSpy.post.and.returnValue(Promise.resolve(MOCK_RESPONSE));
			await service.login('alice@example.com', 'pw');
			service.logout();
			expect(service.user()).toBeNull();
			expect(localStorage.getItem('gg_session_ticket')).toBeNull();
		});

		it('updateProfileData({ icon }) optimistically updates the icon in the session', async () => {
			backendSpy.post.and.returnValue(Promise.resolve(MOCK_RESPONSE));
			await service.login('alice@example.com', 'pw');
			backendSpy.post.and.returnValue(Promise.resolve({ icon: 'pizza', theme: 'dark', language: 'en' }));
			await service.updateProfileData({ icon: 'pizza' });
			expect(service.user()?.player.icon).toBe('pizza');
		});
	});

	describe('init() — session restore', () => {
		it('does not call auth/check when no ticket is stored', async () => {
			backendSpy.post.and.returnValue(Promise.resolve(MOCK_RESPONSE));
			const service = createService();
			await service.init();
			expect(backendSpy.post).not.toHaveBeenCalled();
			expect(service.user()).toBeNull();
		});

		it('calls auth/check with stored ticket and sets user on success', async () => {
			localStorage.setItem('gg_session_ticket', 'ticket-123');
			backendSpy.post.and.returnValue(Promise.resolve(MOCK_RESPONSE));
			const service = createService();
			await service.init();
			expect(backendSpy.post).toHaveBeenCalledWith('/auth/check', { sessionTicket: 'ticket-123' });
			expect(service.user()?.sessionTicket).toBe('ticket-123');
			expect(service.isLoggedIn()).toBeTrue();
		});

		it('removes the ticket and leaves user null if auth/check fails and no guestId exists', async () => {
			localStorage.setItem('gg_session_ticket', 'ticket-123');
			backendSpy.post.and.returnValue(Promise.reject(new Error('Invalid session')));
			const service = createService();
			await service.init();
			expect(service.user()).toBeNull();
			expect(localStorage.getItem('gg_session_ticket')).toBeNull();
		});

		it('falls back to guestLogin if auth/check fails but guestId is stored', async () => {
			localStorage.setItem('gg_session_ticket', 'expired-ticket');
			localStorage.setItem('gg_guest_id', 'guest-uuid-123');
			backendSpy.post.and.callFake((url: string) => {
				if (url === '/auth/check') return Promise.reject(new Error('Expired'));
				return Promise.resolve(MOCK_GUEST_RESPONSE) as Promise<any>;
			});
			const service = createService();
			await service.init();
			expect(backendSpy.post).toHaveBeenCalledWith('/auth/guestLogin', { customId: 'guest-uuid-123' });
			expect(service.user()?.isGuest).toBeTrue();
			expect(service.isLoggedIn()).toBeTrue();
		});
	});
});
