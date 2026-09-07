import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { BranchName, UrlService } from '../url.service';

@Component({ template: '' })
class DummyComponent {}

describe('UrlService', () => {
	let service: UrlService;
	let router: Router;

	beforeEach(() => {
		TestBed.configureTestingModule({
			// A catch-all route lets tests perform real navigations to any url.
			providers: [provideRouter([{ path: '**', component: DummyComponent }])],
		});
		router = TestBed.inject(Router);
		service = TestBed.inject(UrlService);
	});

	describe('get()', () => {
		it('exposes the branch url', () => {
			expect(service.buildState('about').url).toBe('/play');
		});
	});

	describe('get().navigate()', () => {
		let navigateSpy: jasmine.Spy;

		beforeEach(() => {
			navigateSpy = spyOn(router, 'navigate').and.resolveTo(true);
		});

		it('navigates to the branch url', async () => {
			await service.buildState('profile').navigate();
			expect(navigateSpy).toHaveBeenCalledWith(['/profile'], { queryParams: {} });
		});

		it('appends a segment variable as a url segment', async () => {
			await service.buildState('play_room', { roomId: 'V1LYBR' }).navigate();
			expect(navigateSpy).toHaveBeenCalledWith(['/play', 'V1LYBR'], { queryParams: {} });
		});

		it('passes a queryParam variable as a query param', async () => {
			await service.buildState('login', { returnUrl: '/play' }).navigate();
			expect(navigateSpy).toHaveBeenCalledWith(['/login'], { queryParams: { returnUrl: '/play' } });
		});
	});

	describe('get().urlTree()', () => {
		it('builds the tree with segment variables', () => {
			const tree = service.buildState('play_room', { roomId: 'V1LYBR' }).urlTree();
			expect(router.serializeUrl(tree)).toBe('/play/V1LYBR');
		});

		it('builds the tree with queryParam variables', () => {
			const tree = service.buildState('login', { returnUrl: '/play' }).urlTree();
			expect(router.serializeUrl(tree)).toBe('/login?returnUrl=%2Fplay');
		});

		it('builds the root tree for the empty branch', () => {
			expect(router.serializeUrl(service.buildState('').urlTree())).toBe('/');
		});
	});

	describe('current', () => {
		it('starts with the router url', () => {
			expect(service.current().url).toBe('/');
		});

		it('tracks navigations', async () => {
			await router.navigateByUrl('/about');
			expect(service.current().url).toBe('/about');
		});
	});

	describe('isActive()', () => {
		it('is true on the exact branch url', async () => {
			await router.navigateByUrl('/games');
			expect(service.isActive('games')).toBeTrue();
		});

		it('ignores query params', async () => {
			await router.navigateByUrl('/games?foo=bar');
			expect(service.isActive('games')).toBeTrue();
		});

		it('is false on an unrelated url', async () => {
			await router.navigateByUrl('/profile');
			expect(service.isActive('play_global')).toBeFalse();
		});

		it('matches the root branch on /', async () => {
			await router.navigateByUrl('/');
			expect(service.isActive('')).toBeTrue();
		});
	});
});
