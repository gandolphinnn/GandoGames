import { API, LangCode } from '@gandogames/shared/dto';
import { InnerPublicFunction, PlayfabCtx, registerPublicEndpoint } from '../..';

const labelsListInner: InnerPublicFunction<typeof API.labels.list> = async (_body, params, notifier) => {
	const labels = await PlayfabCtx.labels.list();
	const langCode = params.langCode as LangCode;
	const entries = labels.map(l => [l.id, l.translations[langCode]]);
	return Object.fromEntries(entries);
};

registerPublicEndpoint(API.labels.list, labelsListInner);