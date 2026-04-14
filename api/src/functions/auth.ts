import { AuthResponse, GuestLoginRequest, LoginRequest, RegisterRequest } from '@gandogames/common/api';
import { PlayFabHttp } from '../playfab';
import { InnerFunction, registerAzureHttpFunction } from '../utils';

const guestLogin: InnerFunction<GuestLoginRequest, AuthResponse> = (request, _params) => {
	const promise = PlayFabHttp.client<AuthResponse>('LoginWithCustomId', {
		CustomId: request.customId,
		CreateAccount: true,
	});
	return {
		promise,
		errorCode: 401,
		errorMessage: 'Invalid custom ID',
	} 
}

const login: InnerFunction<LoginRequest, AuthResponse> = (request, _params) => {
	const promise = PlayFabHttp.client<AuthResponse>('LoginWithEmailAddress', {
		Email: request.email,
		Password: request.password,
	});
	return {
		promise,
		errorCode: 401,
		errorMessage: 'Invalid email or password',
	}
}

const register: InnerFunction<RegisterRequest, AuthResponse> = (request, _params) => {
	const promise = PlayFabHttp.client<AuthResponse>('RegisterPlayFabUser', {
		Email: request.email,
		Password: request.password,
		Username: request.username,
		RequireBothUsernameAndEmail: true,
	});
	return {
		promise,
		successCode: 201,
		errorCode: 400,
		errorMessage: 'Invalid registration data',
	}
}

registerAzureHttpFunction('auth_guestLogin', 'POST', 'auth/guestLogin', guestLogin)
registerAzureHttpFunction('auth_login', 'POST', 'auth/login', login)
registerAzureHttpFunction('auth_register', 'POST', 'auth/register', register)