import { InnerPublicFunction, registerPublicFunction } from '..';

const aliveInner: InnerPublicFunction<never, { status: string }> = async () => {
	return { status: 'alive' };
};

registerPublicFunction('alive', 'GET', 'alive', aliveInner);