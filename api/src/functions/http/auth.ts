import { AuthResponse, BaseRequest, GuestLoginRequest, LoginRequest, RegisterRequest, UpdateIconRequest } from '@gandogames/common/api';
import { InnerFunction, InnerPublicFunction, pfPromise, PlayFabAdmin, PlayFabClient, PlayFabServer, registerFunction, registerPublicFunction } from '../..';

type LoginLike = {
	PlayFabId?: string;
	SessionTicket?: string;
};

const INFO_REQUEST_PARAMS: PlayFabClientModels.GetPlayerCombinedInfoRequestParams = {
	GetCharacterInventories: false,
	GetCharacterList: false,
	GetPlayerProfile: true,
	GetPlayerStatistics: false,
	GetTitleData: false,
	GetUserAccountInfo: true,
	GetUserData: true,
	UserDataKeys: ['icon'],
	GetUserInventory: false,
	GetUserReadOnlyData: false,
	GetUserVirtualCurrency: false,
};

const CREATOR_ID = '7F29F448E164BF64';
const toAuthResponse = (response: LoginLike, name: string | undefined, icon?: string): AuthResponse => ({
	player: {
		id: response.PlayFabId!,
		name: name || response.PlayFabId!,
		permissions: (response.PlayFabId === CREATOR_ID) ? ['admin'] : [],
		icon,
	},
	sessionTicket: response.SessionTicket!,
});

const guestUsername = (customId: string): string => {
	const n = parseInt(customId.replace(/-/g, '').slice(0, 8), 16) % 1_000_000;
	return `Guest${String(n).padStart(6, '0')}`;
};

const guestLoginInner: InnerPublicFunction<GuestLoginRequest, AuthResponse> = async (body, notifier) => {
	notifier.errorCode = 401;
	notifier.errorMessage = 'Invalid custom ID';
	const result = await pfPromise<PlayFabClientModels.LoginResult>(
		cb => PlayFabClient.LoginWithCustomID({
			CustomId: body.customId,
			CreateAccount: true,
			InfoRequestParameters: INFO_REQUEST_PARAMS,
		}, cb),
	);
	let name = result.InfoResultPayload?.PlayerProfile?.DisplayName;
	if (!name) {
		name = guestUsername(body.customId);
		await pfPromise<PlayFabClientModels.UpdateUserTitleDisplayNameResult>(
			cb => PlayFabClient.UpdateUserTitleDisplayName({ DisplayName: name! }, cb),
		);
	}
	if (result.NewlyCreated) {
		const registryData = await pfPromise<PlayFabServerModels.GetTitleDataResult>(
			cb => PlayFabServer.GetTitleInternalData({ Keys: ['guest_player_ids'] }, cb),
		);
		const guestIds: string[] = JSON.parse(registryData.Data?.['guest_player_ids'] ?? '[]');
		guestIds.push(result.PlayFabId!);
		await pfPromise<PlayFabServerModels.SetTitleDataResult>(
			cb => PlayFabServer.SetTitleInternalData({ Key: 'guest_player_ids', Value: JSON.stringify(guestIds) }, cb),
		);
	}
	const icon = result.InfoResultPayload?.UserData?.['icon']?.Value;
	return toAuthResponse(result, name, icon);
};

const loginInner: InnerPublicFunction<LoginRequest, AuthResponse> = async (body, notifier) => {
	notifier.errorCode = 401;
	notifier.errorMessage = 'Invalid email or password';
	const infoRequestParameters = INFO_REQUEST_PARAMS;
	const result = await pfPromise<PlayFabClientModels.LoginResult>(
		cb => PlayFabClient.LoginWithEmailAddress({ Email: body.email, Password: body.password, InfoRequestParameters: infoRequestParameters }, cb),
	);
	const icon = result.InfoResultPayload?.UserData?.['icon']?.Value;
	return toAuthResponse(result, result.InfoResultPayload?.AccountInfo?.Username, icon);
};

const registerInner: InnerPublicFunction<RegisterRequest, AuthResponse> = async (body, notifier) => {
	notifier.errorCode = 400;
	notifier.errorMessage = 'Invalid registration data';
	const result = await pfPromise<PlayFabClientModels.RegisterPlayFabUserResult>(
		cb => PlayFabClient.RegisterPlayFabUser({
			Email: body.email,
			Password: body.password,
			Username: body.username,
			RequireBothUsernameAndEmail: true,
		}, cb),
	);
	return toAuthResponse(result, body.username);
};

const deleteProfileInner: InnerFunction<BaseRequest, Record<string, never>> = async (_body, _notifier, player) => {
	await pfPromise<PlayFabAdminModels.DeletePlayerResult>(
		cb => PlayFabAdmin.DeletePlayer({ PlayFabId: player.id }, cb),
	);
	return {};
};

const updateIconInner: InnerFunction<UpdateIconRequest, { icon: string }> = async (body, _notifier, player) => {
	await pfPromise<PlayFabServerModels.UpdateUserDataResult>(
		cb => PlayFabServer.UpdateUserData({ PlayFabId: player.id, Data: { icon: body.icon } }, cb),
	);
	return { icon: body.icon };
};

registerPublicFunction('auth_guestLogin', 'auth/guestLogin', guestLoginInner);
registerPublicFunction('auth_login', 'auth/login', loginInner);
registerPublicFunction('auth_register', 'auth/register', registerInner);
registerFunction('auth_deleteProfile', 'auth/delete', deleteProfileInner);
registerFunction('auth_updateIcon', 'auth/updateIcon', updateIconInner);