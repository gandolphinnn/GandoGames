export const BRANCH_DEFINITIONS = {
	'': '',
	about: 'about',
	games: 'games?flags',
	login: 'login?returnUrl',
	signup: 'signup?returnUrl',
	admin: 'admin',
	profile: 'profile',
	social: 'social',
	rooms: 'rooms?gameId',
	play_local: 'play/local/:gameId',
	play_global: 'play/global/:gameId',
	play_room: 'play/room/:roomId',
} as const;

export type BranchName = keyof typeof BRANCH_DEFINITIONS;

export type Branch = {
	url: string;
	segments: string[];
	queryParams: string[];
};
/**
 * Extracts segment names from a branch definition.
 *
 * 'play/room/:roomId'
 * => 'roomId'
 *
 * 'test/:s1/:s2'
 * => 's1' | 's2'
 */
type SegmentNames<S extends string> =
	S extends `${string}:${infer Rest}`
	? Rest extends `${infer Name}/${infer Tail}`
	? Name | SegmentNames<`:${Tail}`>
	: Rest extends `${infer Name}?${string}`
	? Name
	: Rest
	: never;


/**
 * Extracts query parameter names from a branch definition.
 *
 * 'rooms?gameId'
 * => 'gameId'
 *
 * 'test?p1?p2'
 * => 'p1' | 'p2'
 */
type QueryParamNames<S extends string> =
	S extends `${string}?${infer Params}`
	? Params extends `${infer Param}?${infer Rest}`
	? Param | QueryParamNames<`?${Rest}`>
	: Params
	: never;


type SegmentParams<S extends string> = {
	[K in SegmentNames<S>]: string;
};

type QueryParams<S extends string> = {
	[K in QueryParamNames<S>]?: string;
};

type BranchParams<S extends string> =
	SegmentParams<S> & QueryParams<S>;

type BuildStateParams = {
	[K in BranchName]: BranchParams<typeof BRANCH_DEFINITIONS[K]>;
};

export type BuildStateArguments<Name extends BranchName> =
	[SegmentNames<typeof BRANCH_DEFINITIONS[Name]>] extends [never]
		? [params?: BuildStateParams[Name]]
		: [params: BuildStateParams[Name]];