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
		it('throws on an unknown branch', () => {
			expect(() => service.get('nope' as BranchName)).toThrowError(/unknown branch 'nope'/);
		});

		it('exposes the branch url', () => {
			expect(service.get('play').url).toBe('/play');
		});
	});

	describe('get().navigate()', () => {
		let navigateSpy: jasmine.Spy;

		beforeEach(() => {
			navigateSpy = spyOn(router, 'navigate').and.resolveTo(true);
		});

		it('navigates to the branch url', async () => {
			await service.get('profile').navigate();
			expect(navigateSpy).toHaveBeenCalledWith(['/profile'], { queryParams: {} });
		});

		it('appends a segment variable as a url segment', async () => {
			await service.get('play').navigate({ roomId: 'V1LYBR' });
			expect(navigateSpy).toHaveBeenCalledWith(['/play', 'V1LYBR'], { queryParams: {} });
		});

		it('omits an optional segment variable that is not provided', async () => {
			await service.get('play').navigate();
			expect(navigateSpy).toHaveBeenCalledWith(['/play'], { queryParams: {} });
		});

		it('passes a queryParam variable as a query param', async () => {
			await service.get('login').navigate({ returnUrl: '/play' });
			expect(navigateSpy).toHaveBeenCalledWith(['/login'], { queryParams: { returnUrl: '/play' } });
		});

		it('forwards NavigationExtras to the router', async () => {
			await service.get('play').navigate({ roomId: 'V1LYBR' }, { replaceUrl: true });
			expect(navigateSpy).toHaveBeenCalledWith(
				['/play', 'V1LYBR'],
				jasmine.objectContaining({ queryParams: {}, replaceUrl: true }),
			);
		});
	});

	describe('get().urlTree()', () => {
		it('builds the tree with segment variables', () => {
			const tree = service.get('play').urlTree({ roomId: 'V1LYBR' });
			expect(router.serializeUrl(tree)).toBe('/play/V1LYBR');
		});

		it('builds the tree with queryParam variables', () => {
			const tree = service.get('login').urlTree({ returnUrl: '/play' });
			expect(router.serializeUrl(tree)).toBe('/login?returnUrl=%2Fplay');
		});

		it('builds the root tree for the empty branch', () => {
			expect(router.serializeUrl(service.get('').urlTree())).toBe('/');
		});
	});

	describe('current', () => {
		it('starts with the router url', () => {
			expect(service.current()).toBe('/');
		});

		it('tracks navigations', async () => {
			await router.navigateByUrl('/about');
			expect(service.current()).toBe('/about');
		});
	});

	describe('isActive()', () => {
		it('is true on the exact branch url', async () => {
			await router.navigateByUrl('/play');
			expect(service.isActive('play')).toBeTrue();
		});

		it('ignores query params', async () => {
			await router.navigateByUrl('/play?foo=bar');
			expect(service.isActive('play')).toBeTrue();
		});

		it('is false on a child url of the branch', async () => {
			await router.navigateByUrl('/play/V1LYBR');
			expect(service.isActive('play')).toBeFalse();
		});

		it('is false on an unrelated url', async () => {
			await router.navigateByUrl('/profile');
			expect(service.isActive('play')).toBeFalse();
		});

		it('matches the root branch on /', async () => {
			await router.navigateByUrl('/');
			expect(service.isActive('')).toBeTrue();
		});
	});

	describe('currentVariables', () => {
		it('reads a segment variable from the current url', async () => {
			await router.navigateByUrl('/play/V1LYBR');
			expect(service.get('play').currentVariables()).toEqual({ roomId: 'V1LYBR' });
		});

		it('is empty when the optional segment is absent', async () => {
			await router.navigateByUrl('/play');
			expect(service.get('play').currentVariables()).toEqual({});
		});

		it('reads a queryParam variable from the current url', async () => {
			await router.navigateByUrl('/login?returnUrl=%2Fplay');
			expect(service.get('login').currentVariables()).toEqual({ returnUrl: '/play' });
		});

		it('is empty when the current url is on another branch', async () => {
			await router.navigateByUrl('/profile');
			expect(service.get('play').currentVariables()).toEqual({});
		});

		it('updates reactively across navigations', async () => {
			const variables = service.get('play').currentVariables;

			await router.navigateByUrl('/play/AAAAAA');
			expect(variables().roomId).toBe('AAAAAA');

			await router.navigateByUrl('/play/BBBBBB');
			expect(variables().roomId).toBe('BBBBBB');

			await router.navigateByUrl('/play');
			expect(variables().roomId).toBeUndefined();
		});
	});

	describe('parse()', () => {
		it('parses a url string into a UrlTree', () => {
			const tree = service.parse('/login?returnUrl=%2Fplay');
			expect(tree.queryParams['returnUrl']).toBe('/play');
		});
	});
});
