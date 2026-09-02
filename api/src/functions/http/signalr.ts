import { HttpHandler, InvocationContext } from '@azure/functions';
import { API } from '@gandogames/shared/dto';
import { authenticateSession, extractSessionTicket, InnerFunctionNotifier, registerBaseEndpoint, signalRInput } from '../..';

const negotiateHandler: HttpHandler = async (request, context: InvocationContext) => {
	try {
		const notifier = new InnerFunctionNotifier();
		notifier.errorCode = 401;
		notifier.errorMessage = 'Unauthorized';
		const player = await authenticateSession(extractSessionTicket(request), notifier);
		if (player.id !== request.query.get('userId')) {
			return { status: 401, jsonBody: { error: 'Unauthorized' } };
		}
		return { jsonBody: context.extraInputs.get(signalRInput) };
	} catch {
		return { status: 401, jsonBody: { error: 'Unauthorized' } };
	}
};

registerBaseEndpoint(API.signalr.negotiate, negotiateHandler, [signalRInput]);
