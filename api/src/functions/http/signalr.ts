import { HttpHandler, InvocationContext } from '@azure/functions';
import { BaseRequest } from '@gandogames/shared/dto';
import { authenticateSession, InnerFunctionNotifier, registerBaseFunction, signalRInput } from '../..';

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
		return { jsonBody: context.extraInputs.get(signalRInput) };
	} catch {
		return { status: 401, jsonBody: { error: 'Unauthorized' } };
	}
};

registerBaseFunction('signalr_negotiate', 'signalr/negotiate', negotiateHandler, [signalRInput]);
