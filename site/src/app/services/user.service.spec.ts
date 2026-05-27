import { TestBed } from '@angular/core/testing';
import { UserService } from './user.service';
import { BackendService } from './backend.service';
import { StorageService } from './storage.service';
import { ToastService } from './toast.service';
import type { AuthResponse } from '@gandogames/common/api';

const MOCK_RESPONSE: AuthResponse = {
	sessionTicket: 'ticket-123',
	player: { id: 'player-1', name: 'Alice', icon: 'profile', theme: 'dark', language: 'en' },
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

	describe('with empty localStorage', () => {
		let service: UserService;
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

		it('updateProfileData({ icon }) optimistically updates the icon in the session', async () => {
			backendSpy.post.and.returnValue(Promise.resolve(MOCK_RESPONSE));
			await service.login('alice@example.com', 'pw');
			backendSpy.post.and.returnValue(Promise.resolve({ icon: 'pizza', theme: 'dark', language: 'en' }));
			await service.updateProfileData({ icon: 'pizza' });
			expect(service.user()?.player.icon).toBe('pizza');
		});
	});

	describe('with stored session in localStorage', () => {
		let service: UserService;

		beforeEach(() => {
			localStorage.setItem('gg_auth', JSON.stringify({ ...MOCK_RESPONSE, isGuest: false }));
			service = createService();
		});

		it('loads user from localStorage on construction', () => {
			expect(service.user()?.sessionTicket).toBe('ticket-123');
			expect(service.isLoggedIn()).toBeTrue();
		});
	});
});
