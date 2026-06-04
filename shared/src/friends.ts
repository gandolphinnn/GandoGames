import { BaseRequest, IconType } from './auth';

/** A friend or pending friend-request counterpart (always a registered player). */
export interface Friend {
	id: string;
	name: string;
	icon: IconType;
}

/** The caller's friend graph, split by relationship state. */
export interface FriendsListResponse {
	/** Mutually accepted friends. */
	friends: Friend[];
	/** Requests received by the caller, awaiting their response. */
	incoming: Friend[];
	/** Requests the caller has sent, awaiting the other player's response. */
	outgoing: Friend[];
}

/** Request carrying the target (registered) player's id. */
export interface FriendBaseRequest extends BaseRequest {
	friendId: string;
}
