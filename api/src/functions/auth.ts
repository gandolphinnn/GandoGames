import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { playfabClientPost } from '../playfab';

interface LoginBody { email: string; password: string; }
interface RegisterBody { email: string; password: string; username: string; }
interface GuestBody { customId: string; }
interface AuthResult { SessionTicket: string; PlayFabId: string; }

app.http('login', {
	methods: ['POST'],
	authLevel: 'anonymous',
	route: 'auth/login',
	handler: async (request: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> => {
		try {
			const { email, password } = await request.json() as LoginBody;
			const data = await playfabClientPost<AuthResult>('/Client/LoginWithEmailAddress', {
				Email: email,
				Password: password,
			});
			return { jsonBody: { sessionTicket: data.SessionTicket, playFabId: data.PlayFabId } };
		} catch (err) {
			return { status: 401, jsonBody: { error: (err as Error).message } };
		}
	},
});

app.http('register', {
	methods: ['POST'],
	authLevel: 'anonymous',
	route: 'auth/register',
	handler: async (request: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> => {
		try {
			const { email, password, username } = await request.json() as RegisterBody;
			const data = await playfabClientPost<AuthResult>('/Client/RegisterPlayFabUser', {
				Email: email,
				Password: password,
				Username: username,
				RequireBothUsernameAndEmail: true,
			});
			return { status: 201, jsonBody: { sessionTicket: data.SessionTicket, playFabId: data.PlayFabId } };
		} catch (err) {
			return { status: 400, jsonBody: { error: (err as Error).message } };
		}
	},
});

app.http('loginAsGuest', {
	methods: ['POST'],
	authLevel: 'anonymous',
	route: 'auth/guest',
	handler: async (request: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> => {
		try {
			const { customId } = await request.json() as GuestBody;
			const data = await playfabClientPost<AuthResult>('/Client/LoginWithCustomId', {
				CustomId: customId,
				CreateAccount: true,
			});
			return { jsonBody: { sessionTicket: data.SessionTicket, playFabId: data.PlayFabId } };
		} catch (err) {
			return { status: 401, jsonBody: { error: (err as Error).message } };
		}
	},
});
