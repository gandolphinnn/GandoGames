import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { BackendService } from './backend.service';
import { ToastService } from './toast.service';

const API_BASE = 'http://localhost:7071/api';

describe('BackendService', () => {
	let service: BackendService;
	let httpMock: HttpTestingController;
	let toastSpy: jasmine.SpyObj<ToastService>;

	beforeEach(() => {
		toastSpy = jasmine.createSpyObj('ToastService', ['error', 'show']);
		TestBed.configureTestingModule({
			providers: [
				BackendService,
				provideHttpClient(),
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
			req.flush({ error: 'Service unavailable' }, { status: 503, statusText: 'Service Unavailable' });
			await promise;
			expect(toastSpy.error).toHaveBeenCalledWith('Service unavailable');
		});
	});
});
