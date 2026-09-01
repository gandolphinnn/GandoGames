export type LangCode = 'en' | 'it';

type LangDefinition = {
	value: LangCode;
	text: string;
	locale: string;
};

export const LANGUAGES: LangDefinition[] = [
	{ value: 'en', text: 'English', locale: 'en-US' },
	{ value: 'it', text: 'Italiano', locale: 'it-IT' },
];