import { AuthResponse, BaseRequest, GuestLoginRequest, LoginRequest, RegisterRequest } from '@gandogames/common/api';
import { InnerFunction, InnerPublicFunction, pfPromise, PlayFabAdmin, PlayFabClient, registerFunction, registerPublicFunction } from '../..';

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
	GetUserData: false,
	GetUserInventory: false,
	GetUserReadOnlyData: false,
	GetUserVirtualCurrency: false,
};

const toAuthResponse = (response: LoginLike, name: string | undefined): AuthResponse => ({
	player: {
		id: response.PlayFabId!,
		name: name || response.PlayFabId!,
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
	return toAuthResponse(result, name);
};

const loginInner: InnerPublicFunction<LoginRequest, AuthResponse> = async (body, notifier) => {
	notifier.errorCode = 401;
	notifier.errorMessage = 'Invalid email or password';
	const infoRequestParameters = INFO_REQUEST_PARAMS;
	const result = await pfPromise<PlayFabClientModels.LoginResult>(
		cb => PlayFabClient.LoginWithEmailAddress({ Email: body.email, Password: body.password, InfoRequestParameters: infoRequestParameters }, cb),
	);
	return toAuthResponse(result, result.InfoResultPayload?.AccountInfo?.Username);
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

registerPublicFunction('auth_guestLogin', 'auth/guestLogin', guestLoginInner);
registerPublicFunction('auth_login', 'auth/login', loginInner);
registerPublicFunction('auth_register', 'auth/register', registerInner);
registerFunction('auth_deleteProfile', 'auth/delete', deleteProfileInner);