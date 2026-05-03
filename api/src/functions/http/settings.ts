import { BaseRequest, UpdateSettingsRequest, UserSettings } from '@gandogames/common/api';
import { InnerFunction, pfPromise, PlayFabServer, registerFunction } from '../..';

const getSettingsInner: InnerFunction<BaseRequest, UserSettings> = async (_body, _notifier, player) => {
	const result = await pfPromise<PlayFabServerModels.GetUserDataResult>(
		cb => PlayFabServer.GetUserData({ PlayFabId: player.id, Keys: ['theme'] }, cb),
	);
	const theme = result.Data?.['theme']?.Value as 'dark' | 'light' | undefined;
	return { theme: theme ?? 'dark' };
};

const updateSettingsInner: InnerFunction<UpdateSettingsRequest, UserSettings> = async (body, _notifier, player) => {
	await pfPromise<PlayFabServerModels.UpdateUserDataResult>(
		cb => PlayFabServer.UpdateUserData({ PlayFabId: player.id, Data: { theme: body.theme } }, cb),
	);
	return { theme: body.theme };
};

registerFunction('settings_get', 'settings/get', getSettingsInner);
registerFunction('settings_update', 'settings/update', updateSettingsInner);
