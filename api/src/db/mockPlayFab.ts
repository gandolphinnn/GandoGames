/**
 * In-memory PlayFab simulation, activated by MOCK_BACKEND=true (see ../index.ts).
 *
 * Lets any collaborator run the entire API locally with NO PlayFab secrets: the SDK
 * clients re-exported from the barrel are swapped for these fakes, so every function,
 * PlayfabCtx, and the friend-tag model run unchanged against in-memory state instead
 * of the real PlayFab service. Only the SDK surface the codebase actually calls is
 * implemented; anything else is intentionally absent and will throw at runtime.
 *
 * State lives for the lifetime of the `func` process. Session tickets are stateless
 * (they encode the player), so a restart never logs anyone out; guest ids hash from
 * the browser's customId so guest login is stable too. Registered accounts, profiles,
 * rooms, and friend edges are reset on restart.
 */

//#region State
interface MockUser {
	id: string;
	/** Registered accounts only — guests (custom-id login) have none. */
	username?: string;
	email?: string;
	password?: string;
	displayName?: string;
	isGuest: boolean;
	/** icon / theme / language, mirroring PlayFab user data. */
	data: Record<string, string>;
	lastLogin: string;
}

const users = new Map<string, MockUser>();
const usersByEmail = new Map<string, string>();
const sharedGroups = new Map<string, Map<string, string>>();
const titleData = new Map<string, string>();
/** owner id -> (friend id -> single state tag bucket), mirroring directed friend edges. */
const friends = new Map<string, Map<string, string[]>>();

/** Emulates the client SDK's "currently logged-in session" used by UpdateUserTitleDisplayName. */
let currentClientId: string | undefined;
//#endregion State

//#region Helpers
type Cb<T extends PlayFabModule.IPlayFabResultCommon> = PlayFabModule.ApiCallback<T>;

// PlayFab result types require the IPlayFabResultCommon fields (code/status/error/...), but the
// callers (via pfPromise) only ever read result.data's business fields. Accept Partial<T> so each
// call still gets excess-property typo-checking on the fields we set without supplying the boilerplate.
function ok<T extends PlayFabModule.IPlayFabResultCommon>(callback: Cb<T>, data: Partial<T>): void {
	callback(null as any, { code: 200, status: 'OK', data } as any);
}

function fail(callback: (error: any, result: any) => void, errorMessage: string, code = 400): void {
	callback({ code, status: 'BadRequest', error: 'MockError', errorCode: 0, errorMessage } as any, null);
}

function nowIso(): string {
	return new Date().toISOString();
}

/** Stable, deterministic id from an input string so the same customId/username maps to the same player. */
function hashId(prefix: string, input: string): string {
	let hash = 0;
	for (let i = 0; i < input.length; i++) hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
	return `${prefix}_${hash.toString(36)}`;
}

function encodeTicket(id: string, username?: string): string {
	return Buffer.from(JSON.stringify({ id, username })).toString('base64url');
}

function decodeTicket(ticket: string): { id: string; username?: string } | null {
	try {
		return JSON.parse(Buffer.from(ticket, 'base64url').toString('utf8'));
	} catch {
		return null;
	}
}

function clientInfoPayload(user: MockUser): PlayFabClientModels.GetPlayerCombinedInfoResultPayload {
	const userData: Record<string, PlayFabClientModels.UserDataRecord> = {};
	for (const [key, value] of Object.entries(user.data)) userData[key] = { Value: value } as PlayFabClientModels.UserDataRecord;
	return {
		PlayerProfile: { DisplayName: user.displayName },
		AccountInfo: { Username: user.username } as PlayFabClientModels.UserAccountInfo,
		UserData: userData,
	} as PlayFabClientModels.GetPlayerCombinedInfoResultPayload;
}
//#endregion Helpers

//#region Client API
export const mockPlayFabClient = {
	LoginWithCustomID(request: any, callback: Cb<PlayFabClientModels.LoginResult>): void {
		const id = hashId('G', request.CustomId);
		let user = users.get(id);
		const newlyCreated = !user;
		if (!user) {
			if (!request.CreateAccount) return fail(callback, 'Account not found', 404);
			user = { id, isGuest: true, data: {}, lastLogin: nowIso() };
			users.set(id, user);
		}
		user.lastLogin = nowIso();
		currentClientId = id;
		ok<PlayFabClientModels.LoginResult>(callback, {
			PlayFabId: id,
			SessionTicket: encodeTicket(id),
			NewlyCreated: newlyCreated,
			InfoResultPayload: clientInfoPayload(user),
		});
	},

	LoginWithEmailAddress(request: any, callback: Cb<PlayFabClientModels.LoginResult>): void {
		const id = usersByEmail.get(String(request.Email ?? '').toLowerCase());
		const user = id ? users.get(id) : undefined;
		if (!user || user.password !== request.Password) return fail(callback, 'Invalid email or password', 401);
		user.lastLogin = nowIso();
		currentClientId = user.id;
		ok<PlayFabClientModels.LoginResult>(callback, {
			PlayFabId: user.id,
			SessionTicket: encodeTicket(user.id, user.username),
			NewlyCreated: false,
			InfoResultPayload: clientInfoPayload(user),
		});
	},

	RegisterPlayFabUser(request: any, callback: Cb<PlayFabClientModels.RegisterPlayFabUserResult>): void {
		const email = String(request.Email ?? '').toLowerCase();
		if (email && usersByEmail.has(email)) return fail(callback, 'Email already registered', 400);
		for (const existing of users.values()) {
			if (existing.username && existing.username === request.Username) return fail(callback, 'Username already taken', 400);
		}
		const id = hashId('P', `${request.Username}:${email}`);
		const user: MockUser = {
			id,
			username: request.Username,
			email: email || undefined,
			password: request.Password,
			displayName: request.Username,
			isGuest: false,
			data: {},
			lastLogin: nowIso(),
		};
		users.set(id, user);
		if (email) usersByEmail.set(email, id);
		currentClientId = id;
		ok<PlayFabClientModels.RegisterPlayFabUserResult>(callback, {
			PlayFabId: id,
			SessionTicket: encodeTicket(id, user.username),
			Username: user.username,
		});
	},

	UpdateUserTitleDisplayName(request: any, callback: Cb<PlayFabClientModels.UpdateUserTitleDisplayNameResult>): void {
		if (currentClientId) {
			const user = users.get(currentClientId);
			if (user) user.displayName = request.DisplayName;
		}
		ok<PlayFabClientModels.UpdateUserTitleDisplayNameResult>(callback, { DisplayName: request.DisplayName });
	},
};
//#endregion Client API

//#region Server API
export const mockPlayFabServer = {
	AuthenticateSessionTicket(request: any, callback: Cb<PlayFabServerModels.AuthenticateSessionTicketResult>): void {
		const decoded = decodeTicket(request.SessionTicket);
		if (!decoded) return fail(callback, 'Session expired', 401);
		const user = users.get(decoded.id);
		ok<PlayFabServerModels.AuthenticateSessionTicketResult>(callback, {
			UserInfo: {
				PlayFabId: decoded.id,
				Username: decoded.username ?? user?.username,
				TitleInfo: { DisplayName: user?.displayName } as PlayFabServerModels.UserTitleInfo,
			} as PlayFabServerModels.UserAccountInfo,
		});
	},

	GetUserData(request: any, callback: Cb<PlayFabServerModels.GetUserDataResult>): void {
		const user = users.get(request.PlayFabId);
		const keys: string[] | undefined = request.Keys;
		const data: Record<string, PlayFabServerModels.UserDataRecord> = {};
		for (const [key, value] of Object.entries(user?.data ?? {})) {
			if (!keys || keys.includes(key)) data[key] = { Value: value } as PlayFabServerModels.UserDataRecord;
		}
		ok<PlayFabServerModels.GetUserDataResult>(callback, { Data: data, DataVersion: 1 });
	},

	UpdateUserData(request: any, callback: Cb<PlayFabServerModels.UpdateUserDataResult>): void {
		let user = users.get(request.PlayFabId);
		if (!user) {
			// Registered user editing their profile after a process restart wiped the table — create a shell.
			user = { id: request.PlayFabId, isGuest: true, data: {}, lastLogin: nowIso() };
			users.set(request.PlayFabId, user);
		}
		for (const [key, value] of Object.entries(request.Data ?? {})) user.data[key] = String(value);
		ok<PlayFabServerModels.UpdateUserDataResult>(callback, { DataVersion: 1 });
	},

	GetUserAccountInfo(request: any, callback: Cb<PlayFabServerModels.GetUserAccountInfoResult>): void {
		const user = users.get(request.PlayFabId);
		if (!user) return fail(callback, 'Player not found', 404);
		ok<PlayFabServerModels.GetUserAccountInfoResult>(callback, {
			UserInfo: {
				PlayFabId: user.id,
				Username: user.username,
				TitleInfo: { DisplayName: user.displayName, LastLogin: user.lastLogin } as PlayFabServerModels.UserTitleInfo,
			} as PlayFabServerModels.UserAccountInfo,
		});
	},

	GetTitleInternalData(request: any, callback: Cb<PlayFabServerModels.GetTitleDataResult>): void {
		const keys: string[] = request.Keys ?? Array.from(titleData.keys());
		const data: Record<string, string> = {};
		for (const key of keys) {
			const value = titleData.get(key);
			if (value !== undefined) data[key] = value;
		}
		ok<PlayFabServerModels.GetTitleDataResult>(callback, { Data: data });
	},

	SetTitleInternalData(request: any, callback: Cb<PlayFabServerModels.SetTitleDataResult>): void {
		if (request.Value === undefined || request.Value === null) titleData.delete(request.Key);
		else titleData.set(request.Key, String(request.Value));
		ok<PlayFabServerModels.SetTitleDataResult>(callback, {});
	},

	CreateSharedGroup(request: any, callback: Cb<PlayFabServerModels.CreateSharedGroupResult>): void {
		const id = request.SharedGroupId;
		if (!sharedGroups.has(id)) sharedGroups.set(id, new Map());
		ok<PlayFabServerModels.CreateSharedGroupResult>(callback, { SharedGroupId: id });
	},

	GetSharedGroupData(request: any, callback: Cb<PlayFabServerModels.GetSharedGroupDataResult>): void {
		const group = sharedGroups.get(request.SharedGroupId) ?? new Map<string, string>();
		// PlayFab returns all entries when Keys is null/empty; the callers pass either [id] or nothing.
		const keys: string[] | null = request.Keys && request.Keys.length ? request.Keys : null;
		const data: Record<string, PlayFabServerModels.SharedGroupDataRecord> = {};
		for (const [key, value] of group) {
			if (!keys || keys.includes(key)) data[key] = { Value: value } as PlayFabServerModels.SharedGroupDataRecord;
		}
		ok<PlayFabServerModels.GetSharedGroupDataResult>(callback, { Data: data });
	},

	UpdateSharedGroupData(request: any, callback: Cb<PlayFabServerModels.UpdateSharedGroupDataResult>): void {
		let group = sharedGroups.get(request.SharedGroupId);
		if (!group) {
			group = new Map();
			sharedGroups.set(request.SharedGroupId, group);
		}
		for (const [key, value] of Object.entries(request.Data ?? {})) group.set(key, String(value));
		for (const key of request.KeysToRemove ?? []) group.delete(key);
		ok<PlayFabServerModels.UpdateSharedGroupDataResult>(callback, {});
	},

	GetFriendsList(request: any, callback: Cb<PlayFabServerModels.GetFriendsListResult>): void {
		const edges = friends.get(request.PlayFabId) ?? new Map<string, string[]>();
		const list: PlayFabServerModels.FriendInfo[] = [];
		for (const [friendId, tags] of edges) {
			const friend = users.get(friendId);
			list.push({
				FriendPlayFabId: friendId,
				Username: friend?.username,
				TitleDisplayName: friend?.displayName,
				Tags: tags,
			});
		}
		ok<PlayFabServerModels.GetFriendsListResult>(callback, { Friends: list });
	},

	AddFriend(request: any, callback: Cb<PlayFabServerModels.EmptyResponse>): void {
		let edges = friends.get(request.PlayFabId);
		if (!edges) {
			edges = new Map();
			friends.set(request.PlayFabId, edges);
		}
		// Mirror PlayFab: adding an existing edge rejects; callers tolerate this and rely on SetFriendTags.
		if (edges.has(request.FriendPlayFabId)) return fail(callback, 'These users are already friends', 400);
		edges.set(request.FriendPlayFabId, []);
		ok<PlayFabServerModels.EmptyResponse>(callback, {});
	},

	SetFriendTags(request: any, callback: Cb<PlayFabServerModels.EmptyResponse>): void {
		const edges = friends.get(request.PlayFabId);
		if (!edges || !edges.has(request.FriendPlayFabId)) return fail(callback, 'Friend not found', 404);
		edges.set(request.FriendPlayFabId, request.Tags ?? []);
		ok<PlayFabServerModels.EmptyResponse>(callback, {});
	},

	RemoveFriend(request: any, callback: Cb<PlayFabServerModels.EmptyResponse>): void {
		friends.get(request.PlayFabId)?.delete(request.FriendPlayFabId);
		ok<PlayFabServerModels.EmptyResponse>(callback, {});
	},
};
//#endregion Server API

//#region Admin API
export const mockPlayFabAdmin = {
	GetUserAccountInfo(request: any, callback: Cb<PlayFabAdminModels.LookupUserAccountInfoResult>): void {
		const user = users.get(request.PlayFabId);
		if (!user) return fail(callback, 'Player not found', 404);
		ok<PlayFabAdminModels.LookupUserAccountInfoResult>(callback, {
			UserInfo: {
				PlayFabId: user.id,
				Username: user.username,
				TitleInfo: { LastLogin: user.lastLogin } as PlayFabAdminModels.UserTitleInfo,
			} as PlayFabAdminModels.UserAccountInfo,
		});
	},

	DeletePlayer(request: any, callback: Cb<PlayFabAdminModels.DeletePlayerResult>): void {
		const user = users.get(request.PlayFabId);
		if (user?.email) usersByEmail.delete(user.email);
		users.delete(request.PlayFabId);
		friends.delete(request.PlayFabId);
		for (const edges of friends.values()) edges.delete(request.PlayFabId);
		ok<PlayFabAdminModels.DeletePlayerResult>(callback, {});
	},
};
//#endregion Admin API
