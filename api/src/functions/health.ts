import { InnerFunction, registerAzureHttpFunction } from '../utils';

const health: InnerFunction<undefined, { status: string }> = (_body, _params) => ({
	promise: Promise.resolve({ status: 'ok' }),
});

registerAzureHttpFunction('health', 'GET', 'health', health);
