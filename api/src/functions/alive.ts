import { InnerFunction, registerAzureHttpFunction } from '..';

const aliveInner: InnerFunction<never, { status: string }> = async () => {
	return { status: 'alive' };
};

registerAzureHttpFunction('alive', 'GET', 'alive', aliveInner);