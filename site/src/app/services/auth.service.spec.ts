import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { BackendService } from './backend.service';
import type { AuthResponse } from '@gandogames/common/api';

const MOCK_RESPONSE: AuthResponse = {
	sessionTicket: 'ticket-123',
	player: { id: 'player-1', name: 'Alice', permissions: [] },
};

describe('AuthService', () => {
	let backendSpy: jasmine.SpyObj<BackendService>;

	function createService(): AuthService {
		TestBed.configureTestingModule({
			providers: [
				AuthService,
				{ provide: BackendService, useValue: backendSpy },
			],
		});
		return TestBed.inject(AuthService);
	}

	beforeEach(() => {
		localStorage.clear();
		backendSpy = jasmine.createSpyObj('BackendService', ['post']);
	});

	describe('with empty localStorage', () => {
		let service: AuthService;
		beforeEach(() => { service = createService(); });

		it('starts with null user and isLoggedIn false', () => {
			expect(service.user()).toBeNull();
			expect(service.isLoggedIn()).toBeFalse();
		});

		it('login() calls backend and sets user with isGuest false', async () => {
			backendSpy.post.and.returnValue(Promise.resolve(MOCK_RESPONSE));
			await service.login('alice@example.com', 'pw');
			expect(backendSpy.post).toHaveBeenCalledWith('/auth/login', { email: 'alice@example.com', password: 'pw' });
			expect(service.user()?.sessionTicket).toBe('ticket-123');
			expect(service.user()?.isGuest).toBeFalse();
			expect(service.isLoggedIn()).toBeTrue();
		});

		it('login() persists session to localStorage', async () => {
			backendSpy.post.and.returnValue(Promise.resolve(MOCK_RESPONSE));
			await service.login('alice@example.com', 'pw');
			expect(localStorage.getItem('gg_auth')).not.toBeNull();
		});

		it('register() sets user with isGuest false', async () => {
			backendSpy.post.and.returnValue(Promise.resolve(MOCK_RESPONSE));
			await service.register('alice@example.com', 'pw', 'Alice');
			expect(backendSpy.post).toHaveBeenCalledWith('/auth/register', { email: 'alice@example.com', password: 'pw', username: 'Alice' });
			expect(service.user()?.isGuest).toBeFalse();
		});

		it('loginAsGuest() sets user with isGuest true', async () => {
			backendSpy.post.and.returnValue(Promise.resolve(MOCK_RESPONSE));
			await service.loginAsGuest();
			expect(service.user()?.isGuest).toBeTrue();
		});

		it('loginAsGuest() creates a guest ID and reuses it across calls', async () => {
			backendSpy.post.and.returnValue(Promise.resolve(MOCK_RESPONSE));
			await service.loginAsGuest();
			const firstId = localStorage.getItem('gg_guest_id');
			expect(firstId).not.toBeNull();

			backendSpy.post.and.returnValue(Promise.resolve(MOCK_RESPONSE));
			await service.loginAsGuest();
			expect(localStorage.getItem('gg_guest_id')).toBe(firstId);

			const [, body] = backendSpy.post.calls.mostRecent().args as [string, any];
			expect(body.customId).toBe(firstId);
		});

		it('logout() clears user signal and removes from localStorage', async () => {
			backendSpy.post.and.returnValue(Promise.resolve(MOCK_RESPONSE));
			await service.login('alice@example.com', 'pw');
			service.logout();
			expect(service.user()).toBeNull();
			expect(localStorage.getItem('gg_auth')).toBeNull();
		});

		it('updateIcon() updates the player icon in the session', async () => {
			backendSpy.post.and.returnValue(Promise.resolve(MOCK_RESPONSE));
			await service.login('alice@example.com', 'pw');
			backendSpy.post.and.returnValue(Promise.resolve({ icon: 'dragon' }));
			await service.updateIcon('dragon');
			expect(service.user()?.player.icon).toBe('dragon');
		});

		it('updateIcon() does nothing when not logged in', async () => {
			await service.updateIcon('cat'); // no-op
			expect(backendSpy.post).not.toHaveBeenCalled();
		});

		it('deleteAccount() clears user and removes session', async () => {
			backendSpy.post.and.returnValue(Promise.resolve(MOCK_RESPONSE));
			await service.login('alice@example.com', 'pw');
			backendSpy.post.and.returnValue(Promise.resolve({}));
			await service.deleteAccount();
			expect(service.user()).toBeNull();
			expect(localStorage.getItem('gg_auth')).toBeNull();
		});

		it('deleteAccount() also removes guest ID when user is a guest', async () => {
			backendSpy.post.and.returnValue(Promise.resolve(MOCK_RESPONSE));
			await service.loginAsGuest();
			backendSpy.post.and.returnValue(Promise.resolve({}));
			await service.deleteAccount();
			expect(localStorage.getItem('gg_guest_id')).toBeNull();
		});
	});

	describe('with stored session in localStorage', () => {
		let service: AuthService;

		beforeEach(() => {
			// Set BEFORE the service is constructed so loadFromStorage() picks it up.
			localStorage.setItem('gg_auth', JSON.stringify({ ...MOCK_RESPONSE, isGuest: false }));
			service = createService();
		});

		it('loads user from localStorage on construction', () => {
			expect(service.user()?.sessionTicket).toBe('ticket-123');
			expect(service.isLoggedIn()).toBeTrue();
		});
	});
});
