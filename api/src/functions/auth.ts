import { AuthResponse, GuestLoginRequest, LoginRequest, RegisterRequest } from '@gandogames/common/api';
import { InnerPublicFunction, pfPromise, PlayFabClient, registerPublicFunction } from '..';

type LoginLike = PlayFabClientModels.LoginResult | PlayFabClientModels.RegisterPlayFabUserResult;

const toAuthResponse = (r: LoginLike): AuthResponse => ({
	id: r.PlayFabId!,
	sessionTicket: r.SessionTicket!,
});

const guestLoginInner: InnerPublicFunction<GuestLoginRequest, AuthResponse> = async (body, options) => {
	options.errorCode = 401;
	options.errorMessage = 'Invalid custom ID';
	const result = await pfPromise<PlayFabClientModels.LoginResult>(
		cb => PlayFabClient.LoginWithCustomID({ CustomId: body.customId, CreateAccount: true }, cb),
	);
	return toAuthResponse(result);
};

const loginInner: InnerPublicFunction<LoginRequest, AuthResponse> = async (body, options) => {
	options.errorCode = 401;
	options.errorMessage = 'Invalid email or password';
	const result = await pfPromise<PlayFabClientModels.LoginResult>(
		cb => PlayFabClient.LoginWithEmailAddress({ Email: body.email, Password: body.password }, cb),
	);
	return toAuthResponse(result);
};

const registerInner: InnerPublicFunction<RegisterRequest, AuthResponse> = async (body, options) => {
	options.errorCode = 400;
	options.successCode = 201;
	options.errorMessage = 'Invalid registration data';
	const result = await pfPromise<PlayFabClientModels.RegisterPlayFabUserResult>(
		cb => PlayFabClient.RegisterPlayFabUser({
			Email: body.email,
			Password: body.password,
			Username: body.username,
			RequireBothUsernameAndEmail: true,
		}, cb),
	);
	return toAuthResponse(result);
};

registerPublicFunction('auth_guestLogin', 'POST', 'auth/guestLogin', guestLoginInner);
registerPublicFunction('auth_login', 'POST', 'auth/login', loginInner);
registerPublicFunction('auth_register', 'POST', 'auth/register', registerInner);