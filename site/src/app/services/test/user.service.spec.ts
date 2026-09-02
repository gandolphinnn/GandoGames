import { TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { UserService } from '../user.service';
import { BackendService } from '../backend.service';
import { StorageService } from '../storage.service';
import { ToastService } from '../toast.service';
import { API } from '@gandogames/shared/dto';
import type { AnyEndpoint, AuthResponse, GamePlayer } from '@gandogames/shared/dto';

const MOCK_PLAYER: GamePlayer = { id: 'player-1', name: 'Alice', isGuest: false, icon: 'profile', theme: 'dark', language: 'en' };

const MOCK_RESPONSE: AuthResponse = {
	sessionTicket: 'ticket-123',
	player: MOCK_PLAYER,
};

const MOCK_GUEST_RESPONSE: AuthResponse = {
	sessionTicket: 'ticket-123',
	player: { id: 'guest-1', name: 'Guest123456', type: 'guest', icon: 'profile', theme: 'dark', language: 'en', role: '' },
};

// jasmine derives a generic method's spy signature from its widest instantiation, where call()'s
// options tuple collapses to [] — intersect with a plain Spy so matchers accept (endpoint, options).
type BackendSpy = jasmine.SpyObj<BackendService> & { call: jasmine.Spy };

describe('UserService', () => {
	let backendSpy: BackendSpy;
	let toastSpy: jasmine.SpyObj<ToastService>;

	function createService(): UserService {
		TestBed.configureTestingModule({
			providers: [
				UserService,
				StorageService,
				provideTranslateService(),
				{ provide: BackendService, useValue: backendSpy },
				{ provide: ToastService, useValue: toastSpy },
			],
		});
		return TestBed.inject(UserService);
	}

	beforeEach(() => {
		localStorage.clear();
		backendSpy = jasmine.createSpyObj('BackendService', ['call']) as BackendSpy;
		toastSpy = jasmine.createSpyObj('ToastService', ['warning']);
	});

	describe('initial state', () => {
		it('starts with null user and isLoggedIn false', () => {
			backendSpy.call.and.returnValue(Promise.resolve(MOCK_RESPONSE));
			const service = createService();
			expect(service.user()).toBeNull();
			expect(service.isLoggedIn()).toBeFalse();
		});
	});

	describe('auth methods', () => {
		let service: UserService;
		beforeEach(() => {
			backendSpy.call.and.returnValue(Promise.resolve(MOCK_RESPONSE));
			service = createService();
		});

		it('login() calls the auth.login endpoint and sets user with isGuest false', async () => {
			backendSpy.call.and.returnValue(Promise.resolve(MOCK_RESPONSE));
			await service.login('alice@example.com', 'pw');
			expect(backendSpy.call).toHaveBeenCalledWith(API.auth.login, { body: { email: 'alice@example.com', password: 'pw' } });
			expect(service.user()?.sessionTicket).toBe('ticket-123');
			expect(service.user()?.player.type).toBe('user');
			expect(service.isLoggedIn()).toBeTrue();
		});

		it('login() persists only the session ticket to localStorage', async () => {
			backendSpy.call.and.returnValue(Promise.resolve(MOCK_RESPONSE));
			await service.login('alice@example.com', 'pw');
			expect(localStorage.getItem('gg_session_ticket')).toBe('ticket-123');
			expect(localStorage.getItem('gg_auth')).toBeNull();
		});

		it('register() sets user with isGuest false', async () => {
			backendSpy.call.and.returnValue(Promise.resolve(MOCK_RESPONSE));
			await service.register('alice@example.com', 'pw', 'Alice');
			expect(backendSpy.call).toHaveBeenCalledWith(API.auth.register, { body: { email: 'alice@example.com', password: 'pw', username: 'Alice' } });
			expect(service.user()?.isGuest).toBeFalse();
		});

		it('loginAsGuest() sets user with isGuest true and persists ticket', async () => {
			backendSpy.call.and.returnValue(Promise.resolve(MOCK_GUEST_RESPONSE));
			await service.loginAsGuest();
			expect(service.user()?.player.type).toBe('guest');
			expect(localStorage.getItem('gg_session_ticket')).toBe('ticket-123');
		});

		it('loginAsGuest() creates a guest ID and reuses it across calls', async () => {
			backendSpy.call.and.returnValue(Promise.resolve(MOCK_RESPONSE));
			await service.loginAsGuest();
			const firstId = localStorage.getItem('gg_guest_id');
			expect(firstId).not.toBeNull();

			backendSpy.call.and.returnValue(Promise.resolve(MOCK_RESPONSE));
			await service.loginAsGuest();
			expect(localStorage.getItem('gg_guest_id')).toBe(firstId);

			const [, options] = (backendSpy.call as jasmine.Spy).calls.mostRecent().args as [unknown, { body: { customId: string } }];
			expect(options.body.customId).toBe(firstId!);
		});

		it('logout() clears user signal and removes session ticket', async () => {
			backendSpy.call.and.returnValue(Promise.resolve(MOCK_RESPONSE));
			await service.login('alice@example.com', 'pw');
			service.logout();
			expect(service.user()).toBeNull();
			expect(localStorage.getItem('gg_session_ticket')).toBeNull();
		});

	});

	describe('profile preview', () => {
		let service: UserService;
		beforeEach(async () => {
			backendSpy.call.and.returnValue(Promise.resolve(MOCK_RESPONSE));
			service = createService();
			await service.login('alice@example.com', 'pw');
			backendSpy.call.calls.reset();
		});

		it('previewProfileData() applies changes to previewedPlayer/theme without calling the API', () => {
			service.previewProfileData({ icon: 'pizza', theme: 'light' });
			expect(service.previewedPlayer()?.icon).toBe('pizza');
			expect(service.theme()).toBe('light');
			expect(service.hasPendingChanges()).toBeTrue();
			expect(service.user()?.player.icon).toBe('profile'); // saved profile untouched
			expect(backendSpy.call).not.toHaveBeenCalled();
		});

		it('discardPreview() reverts to the saved profile', () => {
			service.previewProfileData({ theme: 'light' });
			service.discardPreview();
			expect(service.theme()).toBe('dark');
			expect(service.previewedPlayer()?.icon).toBe('profile');
			expect(service.hasPendingChanges()).toBeFalse();
		});

		it('hasPendingChanges() is false when the preview matches the saved profile', () => {
			service.previewProfileData({ theme: 'dark' }); // same as saved
			expect(service.hasPendingChanges()).toBeFalse();
		});

		it('saveProfile() sends the pending changes once and merges the result into the user', async () => {
			service.previewProfileData({ icon: 'pizza' });
			backendSpy.call.and.returnValue(Promise.resolve({ icon: 'pizza', theme: 'dark', language: 'en' }));
			await service.saveProfile();
			expect(backendSpy.call).toHaveBeenCalledOnceWith(API.profile.update, { body: { icon: 'pizza' } });
			expect(service.user()?.player.icon).toBe('pizza');
			expect(service.hasPendingChanges()).toBeFalse();
		});

		it('saveProfile() keeps the preview when the API call fails', async () => {
			service.previewProfileData({ icon: 'pizza' });
			backendSpy.call.and.returnValue(Promise.reject(new Error('boom')));
			await expectAsync(service.saveProfile()).toBeRejected();
			expect(service.previewedPlayer()?.icon).toBe('pizza');
			expect(service.hasPendingChanges()).toBeTrue();
			expect(service.user()?.player.icon).toBe('profile');
		});

		it('saveProfile() without a preview does not call the API', async () => {
			await service.saveProfile();
			expect(backendSpy.call).not.toHaveBeenCalled();
		});
	});

	describe('init() — session restore', () => {
		it('does not call auth/check when no ticket is stored', async () => {
			backendSpy.call.and.returnValue(Promise.resolve(MOCK_PLAYER));
			const service = createService();
			await service.init();
			expect(backendSpy.call).not.toHaveBeenCalled();
			expect(service.user()).toBeNull();
		});

		it('calls auth/check (the stored ticket rides in the auth header) and sets user on success', async () => {
			localStorage.setItem('gg_session_ticket', 'ticket-123');
			backendSpy.call.and.returnValue(Promise.resolve(MOCK_PLAYER));
			const service = createService();
			await service.init();
			expect(backendSpy.call).toHaveBeenCalledWith(API.auth.check);
			expect(service.user()?.sessionTicket).toBe('ticket-123');
			expect(service.isLoggedIn()).toBeTrue();
		});

		it('removes the ticket and leaves user null if auth/check fails and no guestId exists', async () => {
			localStorage.setItem('gg_session_ticket', 'ticket-123');
			backendSpy.call.and.returnValue(Promise.reject(new Error('Invalid session')));
			const service = createService();
			await service.init();
			expect(service.user()).toBeNull();
			expect(localStorage.getItem('gg_session_ticket')).toBeNull();
		});

		it('falls back to guestLogin if auth/check fails but guestId is stored', async () => {
			localStorage.setItem('gg_session_ticket', 'expired-ticket');
			localStorage.setItem('gg_guest_id', 'guest-uuid-123');
			backendSpy.call.and.callFake((endpoint: AnyEndpoint) => {
				if (endpoint === API.auth.check) return Promise.reject(new Error('Expired'));
				return Promise.resolve(MOCK_GUEST_RESPONSE);
			});
			const service = createService();
			await service.init();
			expect(backendSpy.call).toHaveBeenCalledWith(API.auth.guestLogin, { body: { customId: 'guest-uuid-123' } });
			expect(service.user()?.isGuest).toBeTrue();
			expect(service.isLoggedIn()).toBeTrue();
		});
	});
});
