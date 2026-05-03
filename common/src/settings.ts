import { BaseRequest } from './auth';

export type Theme = 'dark' | 'light';

export interface UserSettings {
	theme: Theme;
}

export interface UpdateSettingsRequest extends BaseRequest {
	theme: Theme;
}
