import { BaseRequest, IconType, LangCode, ProfileUpdateRequest, ProfileData, Theme } from '@gandogames/shared/api';
import { InnerFunction, pfPromise, PlayFabAdmin, PlayFabServer, registerFunction } from '../..';

const DEFAULT_PROFILE_DATA: ProfileData = {
	theme: 'light',
	icon: 'profile',
	language: 'en',
};

async function readProfile(id: string): Promise<ProfileData> {
	const result = await pfPromise<PlayFabServerModels.GetUserDataResult>(
		cb => PlayFabServer.GetUserData({ PlayFabId: id, Keys: ['icon', 'theme', 'language'] }, cb),
	);

	return {
		icon: result.Data?.['icon']?.Value as IconType ?? DEFAULT_PROFILE_DATA.icon,
		theme: result.Data?.['theme']?.Value as Theme ?? DEFAULT_PROFILE_DATA.theme,
		language: result.Data?.['language']?.Value as LangCode ?? DEFAULT_PROFILE_DATA.language,
	};
}

const profileGetInner: InnerFunction<BaseRequest, ProfileData> = async (_body, _notifier, player) => {
	return readProfile(player.id);
};

const profileUpdateInner: InnerFunction<ProfileUpdateRequest, ProfileData> = async (body, _notifier, player) => {
	const data: Record<string, string> = {};
	if (body.icon) data['icon'] = body.icon;
	if (body.theme) data['theme'] = body.theme;
	if (body.language) data['language'] = body.language;

	if (Object.keys(data).length > 0) {
		await pfPromise<PlayFabServerModels.UpdateUserDataResult>(
			cb => PlayFabServer.UpdateUserData({ PlayFabId: player.id, Data: data }, cb),
		);
	}
	return readProfile(player.id);
};

const profileDeleteInner: InnerFunction<BaseRequest, void> = async (_body, _notifier, player) => {
	await pfPromise<PlayFabAdminModels.DeletePlayerResult>(
		cb => PlayFabAdmin.DeletePlayer({ PlayFabId: player.id }, cb),
	);
};

registerFunction('profile_get', 'profile/get', profileGetInner);
registerFunction('profile_update', 'profile/update', profileUpdateInner);
registerFunction('profile_delete', 'profile/delete', profileDeleteInner);
