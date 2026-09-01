import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { BackendService } from '../backend.service';
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
		toastSpy = jasmine.createSpyObj('ToastService', ['error', 'show']);
		TestBed.configureTestingModule({
			providers: [
				BackendService,
				provideHttpClient(withXhr()),
				provideHttpClientTesting(),
				{ provide: ToastService, useValue: toastSpy },
			],
		});
		service = TestBed.inject(BackendService);
		httpMock = TestBed.inject(HttpTestingController);
	});

	afterEach(() => httpMock.verify());

	describe('post()', () => {
		it('sends a POST to baseUrl+route and returns the response body', async () => {
			const body = { sessionTicket: 'tkt' };
			const response = [{ id: 'r1' }];
			const promise = service.post('/rooms/list', body);

			const req = httpMock.expectOne(`${API_BASE}/rooms/list`);
			expect(req.request.method).toBe('POST');
			expect(req.request.body).toEqual(body);
			req.flush(response);

			await expectAsync(promise).toBeResolvedTo(response);
		});

		it('calls toast.error and rejects on HTTP error with server error message', async () => {
			const promise = service.post('/rooms/list', {}).catch(() => {});
			const req = httpMock.expectOne(`${API_BASE}/rooms/list`);
			req.flush({ error: 'Room not found' }, { status: 404, statusText: 'Not Found' });
			await promise;
			expect(toastSpy.error).toHaveBeenCalledWith('Room not found');
		});

		it('falls back to HttpErrorResponse message when error body has no .error field', async () => {
			const promise = service.post('/rooms/list', {}).catch(() => {});
			const req = httpMock.expectOne(`${API_BASE}/rooms/list`);
			req.flush(null, { status: 500, statusText: 'Internal Server Error' });
			await promise;
			expect(toastSpy.error).toHaveBeenCalled();
		});

		it('rejects with an Error on failure', async () => {
			const promise = service.post('/rooms/list', {});
			httpMock.expectOne(`${API_BASE}/rooms/list`).flush(
				{ error: 'Forbidden' },
				{ status: 403, statusText: 'Forbidden' },
			);
			await expectAsync(promise).toBeRejectedWithError('Forbidden');
		});
	});

	describe('get()', () => {
		it('sends a GET to baseUrl+route and returns the response body', async () => {
			const response = { alive: true };
			const promise = service.get('/alive');

			const req = httpMock.expectOne(`${API_BASE}/alive`);
			expect(req.request.method).toBe('GET');
			req.flush(response);

			await expectAsync(promise).toBeResolvedTo(response);
		});

		it('calls toast.error and rejects on HTTP error', async () => {
			const promise = service.get('/alive').catch(() => {});
			const req = httpMock.expectOne(`${API_BASE}/alive`);
			req.flush({ error: 'Forbidden' }, { status: 403, statusText: 'Forbidden' });
			await promise;
			expect(toastSpy.error).toHaveBeenCalledWith('Forbidden');
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
			const response = { alive: true };
			const promise = service.get<typeof response>('/alive');

			httpMock.expectOne(`${API_BASE}/alive`).error(new ProgressEvent('error')); // status 0
			await flushMicrotasks(); // the fallback request is issued from the catch handler
			httpMock.expectOne(`${FALLBACK}/alive`).flush(response);

			await expectAsync(promise).toBeResolvedTo(response);
			expect(toastSpy.error).not.toHaveBeenCalled();
		});

		it('does not fall back on a normal HTTP error (server responded)', async () => {
			enableFallback();
			const promise = service.get('/alive').catch(() => {});

			httpMock.expectOne(`${API_BASE}/alive`).flush({ error: 'Bad request' }, { status: 400, statusText: 'Bad Request' });
			await promise;

			httpMock.expectNone(`${FALLBACK}/alive`);
			expect(toastSpy.error).toHaveBeenCalledWith('Bad request');
		});

		it('sticks to the fallback for subsequent requests once it has switched', async () => {
			enableFallback();

			const first = service.get('/alive');
			httpMock.expectOne(`${API_BASE}/alive`).error(new ProgressEvent('error'));
			await flushMicrotasks(); // the fallback request is issued from the catch handler
			httpMock.expectOne(`${FALLBACK}/alive`).flush({});
			await first;

			const second = service.get('/alive');
			httpMock.expectOne(`${FALLBACK}/alive`).flush({}); // primary no longer tried
			await second;
		});
	});
});
