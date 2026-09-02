import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { API } from '@gandogames/shared/dto';
import { BackendService } from '../backend.service';
import { StorageService } from '../storage.service';
import { ToastService } from '../toast.service';

const API_BASE = '/api'; // environment.apiBaseUrl in the dev/test build

// Lets the promise chain in BackendService.send() run far enough to issue the
// fallback request before we assert on it.
const flushMicrotasks = () => new Promise<void>(resolve => setTimeout(resolve));

describe('BackendService', () => {
	let service: BackendService;
	let httpMock: HttpTestingController;
	let toastSpy: jasmine.SpyObj<ToastService>;

	beforeEach(() => {
		localStorage.clear();
		toastSpy = jasmine.createSpyObj('ToastService', ['error', 'show']);
		TestBed.configureTestingModule({
			providers: [
				BackendService,
				StorageService,
				provideHttpClient(withXhr()),
				provideHttpClientTesting(),
				{ provide: ToastService, useValue: toastSpy },
			],
		});
		service = TestBed.inject(BackendService);
		httpMock = TestBed.inject(HttpTestingController);
	});

	afterEach(() => httpMock.verify());

	describe('call()', () => {
		it('uses the method and route from the endpoint definition', async () => {
			const promise = service.call(API.rooms.list);

			const req = httpMock.expectOne(`${API_BASE}/rooms`);
			expect(req.request.method).toBe('GET');
			req.flush([]);

			await expectAsync(promise).toBeResolvedTo([]);
		});

		it('sends the typed body on body-carrying methods', async () => {
			const body = { email: 'alice@example.com', password: 'pw' };
			const promise = service.call(API.auth.login, { body });

			const req = httpMock.expectOne(`${API_BASE}/auth/login`);
			expect(req.request.method).toBe('POST');
			expect(req.request.body).toEqual(body);
			req.flush({});

			await promise;
		});

		it('fills {param} segments of the route from options.params', async () => {
			const promise = service.call(API.rooms.get, { params: { roomId: 'ROOM42' } });

			const req = httpMock.expectOne(`${API_BASE}/rooms/ROOM42`);
			expect(req.request.method).toBe('GET');
			req.flush({});

			await promise;
		});

		it('sends QUERY reads with their JSON body', async () => {
			const promise = service.call(API.game.state, { params: { roomId: 'R1' }, body: { game: 'pankov' } });

			const req = httpMock.expectOne(`${API_BASE}/rooms/R1/game/state`);
			expect(req.request.method).toBe('QUERY');
			expect(req.request.body).toEqual({ game: 'pankov' });
			req.flush(null);

			await promise;
		});

		it('appends options.query as the query string', async () => {
			const promise = service.call(API.signalr.negotiate, { query: { userId: 'p1' } });

			const req = httpMock.expectOne(`${API_BASE}/signalr/negotiate?userId=p1`);
			expect(req.request.method).toBe('POST');
			req.flush({ url: 'u', accessToken: 'a' });

			await promise;
		});

		it('sends the stored session ticket as an Authorization Bearer header', async () => {
			localStorage.setItem('gg_session_ticket', 'tkt-1');
			const promise = service.call(API.rooms.list);

			const req = httpMock.expectOne(`${API_BASE}/rooms`);
			expect(req.request.headers.get('Authorization')).toBe('Bearer tkt-1');
			req.flush([]);

			await promise;
		});

		it('omits the Authorization header when no ticket is stored', async () => {
			const promise = service.call(API.rooms.list);

			const req = httpMock.expectOne(`${API_BASE}/rooms`);
			expect(req.request.headers.has('Authorization')).toBeFalse();
			req.flush([]);

			await promise;
		});

		it('calls toast.error and rejects on HTTP error with server error message', async () => {
			const promise = service.call(API.rooms.list).catch(() => {});
			const req = httpMock.expectOne(`${API_BASE}/rooms`);
			req.flush({ error: 'Room not found' }, { status: 404, statusText: 'Not Found' });
			await promise;
			expect(toastSpy.error).toHaveBeenCalledWith('Room not found');
		});

		it('falls back to HttpErrorResponse message when error body has no .error field', async () => {
			const promise = service.call(API.rooms.list).catch(() => {});
			const req = httpMock.expectOne(`${API_BASE}/rooms`);
			req.flush(null, { status: 500, statusText: 'Internal Server Error' });
			await promise;
			expect(toastSpy.error).toHaveBeenCalled();
		});

		it('rejects with an Error on failure', async () => {
			const promise = service.call(API.rooms.list);
			httpMock.expectOne(`${API_BASE}/rooms`).flush(
				{ error: 'Forbidden' },
				{ status: 403, statusText: 'Forbidden' },
			);
			await expectAsync(promise).toBeRejectedWithError('Forbidden');
		});
	});

	describe('fallback', () => {
		const FALLBACK = 'https://fallback.example/api';

		// fallbackUrl is read from `environment` at construction and is unset in the
		// dev/test build, so inject one to exercise the fallback path.
		function enableFallback(): void {
			(service as unknown as { fallbackUrl: string }).fallbackUrl = FALLBACK;
		}

		it('retries against the fallback when the primary host is unreachable', async () => {
			enableFallback();
			const response = { status: 'alive' };
			const promise = service.call(API.alive);

			httpMock.expectOne(`${API_BASE}/alive`).error(new ProgressEvent('error')); // status 0
			await flushMicrotasks(); // the fallback request is issued from the catch handler
			httpMock.expectOne(`${FALLBACK}/alive`).flush(response);

			await expectAsync(promise).toBeResolvedTo(response);
			expect(toastSpy.error).not.toHaveBeenCalled();
		});

		it('does not fall back on a normal HTTP error (server responded)', async () => {
			enableFallback();
			const promise = service.call(API.alive).catch(() => {});

			httpMock.expectOne(`${API_BASE}/alive`).flush({ error: 'Bad request' }, { status: 400, statusText: 'Bad Request' });
			await promise;

			httpMock.expectNone(`${FALLBACK}/alive`);
			expect(toastSpy.error).toHaveBeenCalledWith('Bad request');
		});

		it('sticks to the fallback for subsequent requests once it has switched', async () => {
			enableFallback();

			const first = service.call(API.alive);
			httpMock.expectOne(`${API_BASE}/alive`).error(new ProgressEvent('error'));
			await flushMicrotasks(); // the fallback request is issued from the catch handler
			httpMock.expectOne(`${FALLBACK}/alive`).flush({});
			await first;

			const second = service.call(API.alive);
			httpMock.expectOne(`${FALLBACK}/alive`).flush({}); // primary no longer tried
			await second;
		});
	});
});
