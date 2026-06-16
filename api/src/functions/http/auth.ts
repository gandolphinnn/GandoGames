import { AuthResponse, BaseRequest, GuestLoginRequest, IconType, LangCode, LoginRequest, RegisterRequest, Theme } from '@gandogames/shared/dto';
import { InnerFunction, InnerPublicFunction, pfPromise, PlayFabClient, PlayFabServer, registerFunction, registerPublicFunction } from '../..';

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
	UserDataKeys: ['icon', 'theme', 'language'],
	GetUserInventory: false,
	GetUserReadOnlyData: false,
	GetUserVirtualCurrency: false,
};

const toAuthResponse = (
	response: LoginLike,
	name: string | undefined,
	isGuest: boolean,
	userData?: Record<string, PlayFabClientModels.UserDataRecord>,
): AuthResponse => ({
	player: {
		id: response.PlayFabId!,
		name: name || response.PlayFabId!,
		isGuest,
		icon: (userData?.['icon']?.Value as IconType) ?? 'profile',
		theme: (userData?.['theme']?.Value as Theme) ?? 'dark',
		language: (userData?.['language']?.Value as LangCode) ?? 'en',
	},
	sessionTicket: response.SessionTicket!,
});

const guestUsername = (customId: string): string => {
	let hash = 0;
	for (let i = 0; i < customId.length; i++) {
		hash = (hash * 31 + customId.charCodeAt(i)) % 1_000_000;
	}
	return `Guest${String(hash).padStart(6, '0')}`;
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
	return toAuthResponse(result, name, true, result.InfoResultPayload?.UserData);
};

const loginInner: InnerPublicFunction<LoginRequest, AuthResponse> = async (body, notifier) => {
	notifier.errorCode = 401;
	notifier.errorMessage = 'Invalid email or password';
	const infoRequestParameters = INFO_REQUEST_PARAMS;
	const result = await pfPromise<PlayFabClientModels.LoginResult>(
		cb => PlayFabClient.LoginWithEmailAddress({ Email: body.email, Password: body.password, InfoRequestParameters: infoRequestParameters }, cb),
	);
	return toAuthResponse(result, result.InfoResultPayload?.AccountInfo?.Username, false, result.InfoResultPayload?.UserData);
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
	return toAuthResponse(result, body.username, false);
};

const checkInner: InnerFunction<BaseRequest, AuthResponse> = async (body, _notifier, player) => ({
	player,
	sessionTicket: body.sessionTicket,
});

registerPublicFunction('auth_guestLogin', 'auth/guestLogin', guestLoginInner);
registerPublicFunction('auth_login', 'auth/login', loginInner);
registerPublicFunction('auth_register', 'auth/register', registerInner);
registerFunction('auth_check', 'auth/check', checkInner);