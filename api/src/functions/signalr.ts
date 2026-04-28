import { app, input } from '@azure/functions';
import { BaseRequest } from '@gandogames/common/api';
import { authenticateSession, InnerFunctionOptions } from '..';

const connInfoInput = input.generic({
	type: 'signalRConnectionInfo',
	name: 'connectionInfo',
	hubName: 'gameHub',
	connectionStringSetting: 'AzureSignalRConnectionString',
	userId: '{query.userId}',
});

app.http('negotiate', {
	methods: ['POST'],
	authLevel: 'anonymous',
	route: 'negotiate',
	extraInputs: [connInfoInput],
	handler: async (request, context) => {
		try {
			const body = await request.json().catch(() => undefined) as BaseRequest;
			const options: InnerFunctionOptions = { signalR: [], errorCode: 401, errorMessage: 'Unauthorized' };
			const player = await authenticateSession(body, options);
			if (player.id !== request.query.get('userId')) {
				return { status: 401, jsonBody: { error: 'Unauthorized' } };
			}
			return { jsonBody: context.extraInputs.get(connInfoInput) };
		} catch {
			return { status: 401, jsonBody: { error: 'Unauthorized' } };
		}
	},
});
