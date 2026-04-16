import { InnerFunction, registerFunction } from '..';

const aliveInner: InnerFunction<never, { status: string }> = async () => {
	return { status: 'alive' };
};

registerFunction('alive', 'GET', 'alive', aliveInner);