import { AuthResponse, GuestLoginRequest, LoginRequest, RegisterRequest } from '@gandogames/common/api';
import { InnerPublicFunction, pfPromise, PlayFabClient, registerPublicFunction } from '..';

type LoginLike = { //PlayFabClientModels.LoginResult
	PlayFabId?: string;
	SessionTicket?: string;
};

const toAuthResponse = (response: LoginLike, name: string | undefined): AuthResponse => ({
	player: {
		id: response.PlayFabId!,
		name: name || response.PlayFabId!,
	},
	sessionTicket: response.SessionTicket!,
});

const guestLoginInner: InnerPublicFunction<GuestLoginRequest, AuthResponse> = async (body, notifier) => {
	notifier.errorCode = 401;
	notifier.errorMessage = 'Invalid custom ID';
	const result = await pfPromise<PlayFabClientModels.LoginResult>(
		cb => PlayFabClient.LoginWithCustomID({ CustomId: body.customId, CreateAccount: true }, cb),
	);
	return toAuthResponse(result, 'Guest');
};

const loginInner: InnerPublicFunction<LoginRequest, AuthResponse> = async (body, notifier) => {
	notifier.errorCode = 401;
	notifier.errorMessage = 'Invalid email or password';
	const infoRequestParameters: PlayFabClientModels.GetPlayerCombinedInfoRequestParams = {
		GetCharacterInventories: false,
		GetCharacterList: false,
		GetPlayerProfile: false,
		GetPlayerStatistics: false,
		GetTitleData: false,
		GetUserAccountInfo: true,
		GetUserData: false,
		GetUserInventory: false,
		GetUserReadOnlyData: false,
		GetUserVirtualCurrency: false,
	};
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

registerPublicFunction('auth_guestLogin', 'auth/guestLogin', guestLoginInner);
registerPublicFunction('auth_login', 'auth/login', loginInner);
registerPublicFunction('auth_register', 'auth/register', registerInner);