import { BaseRequest, Friend, FriendBaseRequest, FriendsListResponse } from '@gandogames/shared/api';
import { InnerFunction, InnerFunctionNotifier, pfPromise, PlayFabServer, registerFunction } from '../..';

/**
 * PlayFab has no native friend-request/pending concept and friendships are one-directional, so we
 * model request state with friend Tags on the directed (owner -> friend) edges, written on both
 * sides via the secret-key Server API. A relationship lives in exactly one tag bucket per edge.
 */
const OUTGOING = 'outgoing';
const INCOMING = 'incoming';
const ACCEPTED = 'accepted';

function fail(notifier: InnerFunctionNotifier, code: number, message: string): never {
	notifier.errorCode = code;
	notifier.errorMessage = message;
	throw new Error(message);
}

function tagOf(info: PlayFabServerModels.FriendInfo | undefined): string | undefined {
	return (info?.Tags ?? [])[0];
}

function toFriend(info: PlayFabServerModels.FriendInfo): Friend {
	return {
		id: info.FriendPlayFabId!,
		// Registered players expose Username; TitleDisplayName covers any with a set display name.
		name: info.TitleDisplayName || info.Username || info.FriendPlayFabId!,
		// Per-player icons live in PlayFab user data, not the friend profile, so default here.
		icon: 'profile',
	};
}

async function getFriendInfos(playFabId: string): Promise<PlayFabServerModels.FriendInfo[]> {
	const result = await pfPromise<PlayFabServerModels.GetFriendsListResult>(
		cb => PlayFabServer.GetFriendsList({ PlayFabId: playFabId }, cb),
	);
	return result.Friends ?? [];
}

/** Ensure the directed edge owner -> friend exists and set its single state tag. */
async function setEdge(owner: string, friend: string, tag: string): Promise<void> {
	// AddFriend rejects with "These users are already friends" when the edge already exists
	// (e.g. accepting a request whose edges were created at request time). That's fine — we
	// only need the edge to exist; tolerate it and let SetFriendTags carry the actual state.
	try {
		await pfPromise<PlayFabServerModels.EmptyResponse>(
			cb => PlayFabServer.AddFriend({ PlayFabId: owner, FriendPlayFabId: friend }, cb),
		);
	} catch {
		// Edge already exists; SetFriendTags below will still fail if it genuinely does not.
	}
	await pfPromise<PlayFabServerModels.EmptyResponse>(
		cb => PlayFabServer.SetFriendTags({ PlayFabId: owner, FriendPlayFabId: friend, Tags: [tag] }, cb),
	);
}

/** Remove the directed edge owner -> friend, tolerating an already-absent edge. */
async function removeEdge(owner: string, friend: string): Promise<void> {
	try {
		await pfPromise<PlayFabServerModels.EmptyResponse>(
			cb => PlayFabServer.RemoveFriend({ PlayFabId: owner, FriendPlayFabId: friend }, cb),
		);
	} catch {
		// Edge may not exist (one-sided drift); removal is best-effort.
	}
}

const friendsListInner: InnerFunction<BaseRequest, FriendsListResponse> = async (_body, _notifier, player) => {
	const infos = await getFriendInfos(player.id);
	const response: FriendsListResponse = { friends: [], incoming: [], outgoing: [] };
	for (const info of infos) {
		switch (tagOf(info)) {
			case ACCEPTED: response.friends.push(toFriend(info)); break;
			case INCOMING: response.incoming.push(toFriend(info)); break;
			case OUTGOING: response.outgoing.push(toFriend(info)); break;
		}
	}
	return response;
};

const friendsRequestInner: InnerFunction<FriendBaseRequest, void> = async (body, notifier, player) => {
	if (player.isGuest) fail(notifier, 403, 'Guest accounts cannot add friends');
	if (!body.friendId || body.friendId === player.id) fail(notifier, 400, 'Invalid friend');

	notifier.errorCode = 404;
	notifier.errorMessage = 'Player not found';
	const account = await pfPromise<PlayFabServerModels.GetUserAccountInfoResult>(
		cb => PlayFabServer.GetUserAccountInfo({ PlayFabId: body.friendId }, cb),
	);
	notifier.errorCode = 500;
	notifier.errorMessage = undefined;
	// Only registered accounts have a Username; guests (custom-id login) cannot be befriended.
	if (!account.UserInfo?.Username) fail(notifier, 400, 'You can only add registered players as friends');

	const existing = (await getFriendInfos(player.id)).find(f => f.FriendPlayFabId === body.friendId);
	const tag = tagOf(existing);
	if (tag === ACCEPTED || tag === OUTGOING) return; // already friends / already requested

	if (tag === INCOMING) {
		// The target already requested the caller — treat this as accepting that request.
		await setEdge(player.id, body.friendId, ACCEPTED);
		await setEdge(body.friendId, player.id, ACCEPTED);
		notifier.friendsChanged(body.friendId);
		return;
	}

	await setEdge(player.id, body.friendId, OUTGOING);
	try {
		await setEdge(body.friendId, player.id, INCOMING);
	} catch (err) {
		// Fail closed: don't leave a one-sided request the recipient never sees.
		await removeEdge(player.id, body.friendId);
		throw err;
	}
	const from: Friend = { id: player.id, name: player.name, icon: player.icon };
	notifier.friendRequest(body.friendId, from);
};

const friendsAcceptInner: InnerFunction<FriendBaseRequest, void> = async (body, notifier, player) => {
	const existing = (await getFriendInfos(player.id)).find(f => f.FriendPlayFabId === body.friendId);
	if (tagOf(existing) !== INCOMING) fail(notifier, 400, 'No pending request from this player');

	await setEdge(player.id, body.friendId, ACCEPTED);
	await setEdge(body.friendId, player.id, ACCEPTED);
	notifier.friendsChanged(body.friendId);
};

const friendsRemoveInner: InnerFunction<FriendBaseRequest, void> = async (body, notifier, player) => {
	// Covers declining an incoming request, cancelling an outgoing one, and unfriending.
	await removeEdge(player.id, body.friendId);
	await removeEdge(body.friendId, player.id);
	notifier.friendsChanged(body.friendId);
};

registerFunction('friends_list', 'friends/list', friendsListInner);
registerFunction('friends_request', 'friends/request', friendsRequestInner);
registerFunction('friends_accept', 'friends/accept', friendsAcceptInner);
registerFunction('friends_remove', 'friends/remove', friendsRemoveInner);
