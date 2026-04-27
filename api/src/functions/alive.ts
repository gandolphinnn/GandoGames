import { app, HttpResponseInit } from '@azure/functions';

app.http('alive', {
	methods: ['GET', 'POST'],
	authLevel: 'anonymous',
	route: 'alive',
	handler: () => {
		return {
			jsonBody: { status: 'alive' },
			status: 200,
		} as HttpResponseInit;
	},
});