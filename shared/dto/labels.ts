import { LangCode } from './languages';

/** A friend or pending friend-request counterpart (always a registered player). */
export type Label = {
	id: string;
	translations: Record<LangCode, string>;
	lastUpdate: Date;
}

export type LabelCreateRequest = Omit<Label, 'lastUpdate'>