import type { AuthResponse, GamePlayer, GuestLoginRequest, LoginRequest, ProfileData, ProfileUpdateRequest, RegisterRequest } from './auth';
import type { FriendsListResponse } from './friends';
import type { GameActionRequest, GameSettingsSetRequest, GameState, GameStateRequest } from './game';
import type { ChatSendRequest, RoomAccessSetRequest, RoomCreateRequest, RoomData, RoomInviteRequest, RoomSummary } from './room';
import type { NegotiateQuery, NegotiateResponse } from './signalr';

/**
 * ─── The API contract ─────────────────────────────────────────────────────────────
 * Single source of truth for every HTTP endpoint: its method, its route and its
 * request/response (and query-string) types. The api registers functions from these
 * definitions (`registerEndpoint(API.rooms.join, …)`) and the site calls them through
 * `BackendService.call(API.rooms.join, …)`, so the two sides cannot drift.
 *
 * Method conventions:
 * - GET     safe reads whose inputs fit the path (ids) — no body.
 * - QUERY   safe reads that carry a JSON body (the IETF safe-method-with-body draft).
 * - POST    creations and non-idempotent actions (join, start, game moves, invites…).
 * - PUT     idempotent replacement of a sub-resource (room access, game settings).
 * - PATCH   partial updates (profile fields).
 * - DELETE  removals — of a resource (room, profile) or a membership (player, friend).
 *
 * Authentication rides in the `Authorization: Bearer <sessionTicket>` header — added
 * centrally by the site's `BackendService`, validated centrally by `registerEndpoint`.
 * Request bodies never carry the ticket, and resource ids (roomId, playerId, friendId)
 * travel as `{param}` path segments, not in the body.
 */

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'QUERY';

/** Methods that carry a JSON request body; GET/DELETE requests put everything in the URL. */
export const METHODS_WITH_BODY: readonly HttpMethod[] = ['POST', 'PUT', 'PATCH', 'QUERY'];

/** Safe (read-only) methods: no side effects, so the api never takes the per-room lock for them. */
export const SAFE_METHODS: readonly HttpMethod[] = ['GET', 'QUERY'];

/** Union of `{param}` names in a route template, e.g. `'rooms/{roomId}'` → `'roomId'`. */
type PathParamNames<Path extends string> =
	Path extends `${string}{${infer Param}}${infer Rest}` ? Param | PathParamNames<Rest> : never;

/** The typed path-parameter object for a route template (`{}` when the route has none). */
export type PathParams<Path extends string> = { [K in PathParamNames<Path>]: string };

/**
 * One API endpoint. `_types` is a phantom marker — never assigned at runtime — that carries
 * the request/response/query types so both sides get full inference from the same value.
 */
export interface Endpoint<Path extends string, TReq, TRes, TQuery = void> {
	/** Azure Function name — stable, it identifies the function in the portal and in logs. */
	readonly name: string;
	readonly method: HttpMethod;
	/** Route template relative to `/api/`, with `{param}` segments. */
	readonly path: Path;
	/** Phantom type carrier — do not read or assign. */
	readonly _types?: { req: TReq; res: TRes; query: TQuery };
}

export type AnyEndpoint = Endpoint<string, any, any, any>;

export type EndpointRequest<E extends AnyEndpoint> = E extends Endpoint<any, infer TReq, any, any> ? TReq : never;
export type EndpointResponse<E extends AnyEndpoint> = E extends Endpoint<any, any, infer TRes, any> ? TRes : never;
export type EndpointQuery<E extends AnyEndpoint> = E extends Endpoint<any, any, any, infer TQuery> ? TQuery : never;
export type EndpointParams<E extends AnyEndpoint> = E extends Endpoint<infer Path, any, any, any> ? PathParams<Path> : never;

/**
 * Builds a typed endpoint. Curried because TypeScript cannot partially infer generics:
 * the first call fixes the request/response (and optional query) types, the second infers
 * the route template as a literal so its `{param}` segments stay typed.
 */
const endpoint = <TReq, TRes, TQuery = void>() =>
	<Path extends string>(name: string, method: HttpMethod, path: Path): Endpoint<Path, TReq, TRes, TQuery> =>
		({ name, method, path });

/** Response of the `alive` health probe. */
export interface AliveResponse {
	status: string;
}

export const API = {
	/** Health probe (registered without the SignalR binding so it works with no configuration). */
	alive: endpoint<void, AliveResponse>()('alive', 'GET', 'alive'),
	auth: {
		/** Log in with email + password; mints a new session ticket. */
		login: endpoint<LoginRequest, AuthResponse>()('auth_login', 'POST', 'auth/login'),
		/** Create a registered account and log it in. */
		register: endpoint<RegisterRequest, AuthResponse>()('auth_register', 'POST', 'auth/register'),
		/** Log in (or lazily create) the guest account tied to a client-generated custom id. */
		guestLogin: endpoint<GuestLoginRequest, AuthResponse>()('auth_guestLogin', 'POST', 'auth/guestLogin'),
		/** Validate the caller's session ticket and return their player. */
		check: endpoint<void, GamePlayer>()('auth_check', 'GET', 'auth/check'),
	},
	chat: {
		send: endpoint<ChatSendRequest, void>()('chat_send', 'POST', 'rooms/{roomId}/chat'),
	},
	friends: {
		list: endpoint<void, FriendsListResponse>()('friends_list', 'GET', 'friends'),
		/** Send a friend request (accepts automatically when the target already requested the caller). */
		request: endpoint<void, void>()('friends_request', 'POST', 'friends/{friendId}/request'),
		accept: endpoint<void, void>()('friends_accept', 'POST', 'friends/{friendId}/accept'),
		/** Decline an incoming request, cancel an outgoing one, or unfriend. */
		remove: endpoint<void, void>()('friends_remove', 'DELETE', 'friends/{friendId}'),
	},
	game: {
		/**
		 * The caller's public view of the game state. A safe read whose input (`game`) is a JSON
		 * body, which is exactly what QUERY exists for — GET could only smuggle it into the URL.
		 */
		state: endpoint<GameStateRequest, GameState | null>()('game_state', 'QUERY', 'rooms/{roomId}/game/state'),
		/** Play a move; returns the caller's updated public state. */
		action: endpoint<GameActionRequest, GameState | null>()('game_action', 'POST', 'rooms/{roomId}/game/action'),
		/** Host only: replace the room's game settings (server re-validates against the schema). */
		setSettings: endpoint<GameSettingsSetRequest, RoomData>()('game_settings_set', 'PUT', 'rooms/{roomId}/game/settings'),
	},
	moderator: {
		rooms: {
			list: endpoint<void, RoomData[]>()('moderator_rooms_list', 'GET', 'moderator/rooms'),
			delete: endpoint<void, RoomData[]>()('moderator_rooms_delete', 'DELETE', 'moderator/rooms/{roomId}'),
		},
	},
	profile: {
		get: endpoint<void, ProfileData>()('profile_get', 'GET', 'profile'),
		/** Partially update the caller's profile; returns the resulting full profile. */
		update: endpoint<ProfileUpdateRequest, ProfileData>()('profile_update', 'PATCH', 'profile'),
		/** Permanently delete the caller's account. */
		delete: endpoint<void, void>()('profile_delete', 'DELETE', 'profile'),
	},
	rooms: {
		/** Rooms visible to the caller: their own plus listed (public/friends) ones. */
		list: endpoint<void, RoomSummary[]>()('room_list', 'GET', 'rooms'),
		create: endpoint<RoomCreateRequest, RoomData>()('room_create', 'POST', 'rooms'),
		get: endpoint<void, RoomData>()('room_get', 'GET', 'rooms/{roomId}'),
		join: endpoint<void, RoomData>()('room_join', 'POST', 'rooms/{roomId}/join'),
		/** Host only: start the game. */
		start: endpoint<void, RoomData>()('room_start', 'POST', 'rooms/{roomId}/start'),
		/** Host only: end the current game and return the room to the lobby. */
		reset: endpoint<void, RoomData>()('room_reset', 'POST', 'rooms/{roomId}/reset'),
		/** Host only: replace the room's access policy. */
		setAccess: endpoint<RoomAccessSetRequest, RoomData>()('room_access', 'PUT', 'rooms/{roomId}/access'),
		/** Host only: invite a friend (delivered as a SignalR `roomInvite`). */
		invite: endpoint<RoomInviteRequest, void>()('room_invite', 'POST', 'rooms/{roomId}/invite'),
		/** Host only: add a bot to the room (delivered as a SignalR `roomInvite`). */
		addBot: endpoint<void, void>()('room_add_bot', 'POST', 'rooms/{roomId}/add_bot'),
		/**
		 * Remove the caller from the room (may migrate the host or delete the room). A POST
		 * action rather than `DELETE players/me`: the Functions host resolves routes without
		 * literal-over-parameter precedence, so that route would collide with `players/{playerId}`.
		 */
		leave: endpoint<void, void>()('room_leave', 'POST', 'rooms/{roomId}/leave'),
		/** Host only: remove another player from the room. */
		kick: endpoint<void, RoomData>()('room_kick', 'DELETE', 'rooms/{roomId}/players/{playerId}'),
		/** Host only: delete the room. */
		delete: endpoint<void, void>()('room_delete', 'DELETE', 'rooms/{roomId}'),
	},
	signalr: {
		/**
		 * POST is fixed by the SignalR protocol. `userId` must travel in the query string:
		 * the signalRConnectionInfo input binding reads it before the handler runs.
		 */
		negotiate: endpoint<void, NegotiateResponse, NegotiateQuery>()('signalr_negotiate', 'POST', 'signalr/negotiate'),
	},
};
