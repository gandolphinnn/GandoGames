import { HttpHandler, InvocationContext } from '@azure/functions';
import { createHmac, timingSafeEqual } from 'crypto';
import { BaseRequest } from '@gandogames/shared/dto';
import { authenticateSession, InnerFunctionNotifier, registerBaseFunction, signalRInput } from '../..';

function validateSignature(body: string, signature: string): boolean {
	const match = (process.env['AzureSignalRConnectionString'] ?? '').match(/AccessKey=([^;]+)/i);
	const key = match?.[1];
	if (!key) return true; // local dev without connection string
	const expected = 'sha256=' + createHmac('sha256', key).update(body).digest('hex');
	if (expected.length !== signature.length) return false;
	try {
		return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
	} catch {
		return false;
	}
}

const negotiateHandler: HttpHandler = async (request, context: InvocationContext) => {
	try {
		const body = await request.json().catch(() => undefined) as BaseRequest;
		const notifier = new InnerFunctionNotifier();
		notifier.errorCode = 401;
		notifier.errorMessage = 'Unauthorized';
		const player = await authenticateSession(body, notifier);
		if (player.id !== request.query.get('userId')) {
			return { status: 401, jsonBody: { error: 'Unauthorized' } };
		}
		//if (process.env['AZURE_FUNCTIONS_ENVIRONMENT'] !== 'Development') {
		//	const names = upsertPresence(player.id, player.name);
		//	const broadcast: SignalRMessage = { target: 'onlineCountUpdated', arguments: [names] };
		//	context.extraOutputs.set(signalROutput, [broadcast]);
		//}
		return { jsonBody: context.extraInputs.get(signalRInput) };
	} catch {
		return { status: 401, jsonBody: { error: 'Unauthorized' } };
	}
};

/* const signalrEventsHandler: HttpHandler = async (request, context: InvocationContext) => {
	const body = await request.text();
	if (!validateSignature(body, request.headers.get('X-ASRS-Signature') ?? '')) {
		return { status: 401 };
	}
	const event = request.headers.get('X-ASRS-Event');
	if (event !== 'disconnected') return { status: 200 };
	const userId = request.headers.get('X-ASRS-User-Id');
	if (!userId) return { status: 200 };
	const onlineNames = deletePresence(userId);
	const broadcast: SignalRMessage = { target: 'onlineCountUpdated', arguments: [onlineNames] };
	context.extraOutputs.set(signalROutput, [broadcast]);
	return { status: 200 };
}; */

registerBaseFunction('signalr_negotiate', 'signalr/negotiate', negotiateHandler, [signalRInput]);
//registerBaseFunction('signalr_events', 'signalr/events', signalrEventsHandler);
