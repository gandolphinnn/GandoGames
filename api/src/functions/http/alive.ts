import { app, HttpMethod, HttpResponseInit } from '@azure/functions';
import { API, type AliveResponse } from '@gandogames/shared/dto';

// Health probe. Registered raw — not via registerPublicEndpoint — so it carries no SignalR
// output binding and keeps working when AzureSignalRConnectionString is not configured.
app.http(API.alive.name, {
	methods: [API.alive.method as HttpMethod],
	authLevel: 'anonymous',
	route: API.alive.path,
	handler: (): HttpResponseInit => ({
		jsonBody: { status: 'alive' } satisfies AliveResponse,
		status: 200,
	}),
});
