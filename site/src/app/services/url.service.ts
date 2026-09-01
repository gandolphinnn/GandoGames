import { computed, inject, Injectable, Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, NavigationExtras, Params, PRIMARY_OUTLET, Router, UrlTree } from '@angular/router';
import { filter, map } from 'rxjs';

/**
 * Insert here and in the TREE object all the url branches of the app
 */
export type BranchName = ''
	| 'about'
	| 'login'
	| 'play'
	| 'play/new'
	| 'profile'
	| 'signup'
	| 'social'
	;

type UrlTreeBranch = {
	url: string,
	variables?: Record<string, { type: 'segment' | 'queryParam'; mandatory: boolean }>,
};

/**
 * `as const` keeps the literal keys and `mandatory` flags of each branch's `variables`,
 * so `BranchVariables` can derive a per-branch typed params object; `satisfies` still
 * enforces the `UrlTreeBranch` shape and that every `BranchName` is present.
 */
const TREE = {
	'': { url: '' },
	'about': { url: '/about' },
	'login': { url: '/login', variables: { returnUrl: { type: 'queryParam', mandatory: false } } },
	'signup': { url: '/signup', variables: { returnUrl: { type: 'queryParam', mandatory: false } } },
	'profile': { url: '/profile' },
	'social': { url: '/social' },
	'play': { url: '/play', variables: { roomId: { type: 'segment', mandatory: false } } },
	'play/new': { url: '/play/new' },
} as const satisfies Record<BranchName, UrlTreeBranch>;

/**
 * The variables object accepted by a branch: `mandatory: true` keys are required,
 * the others are optional. Branches without variables accept no keys at all.
 */
type BranchVariables<B extends BranchName> = typeof TREE[B] extends { variables: infer V }
	? { [K in keyof V as V[K] extends { mandatory: true } ? K : never]: string }
	& { [K in keyof V as V[K] extends { mandatory: false } ? K : never]?: string }
	: Record<string, never>;

/** The `variables` argument itself is optional only when the branch has no mandatory variables. */
type VariablesArg<B extends BranchName> = {} extends BranchVariables<B>
	? [variables?: BranchVariables<B>]
	: [variables: BranchVariables<B>];

type TreeObject<B extends BranchName> = UrlTreeBranch & {
	navigate: (...args: [...VariablesArg<B>, extras?: NavigationExtras]) => Promise<boolean>;
	urlTree: (...args: VariablesArg<B>) => UrlTree;
	/**
	 * The branch's variables as read from the current URL (the inverse of `navigate`).
	 * All keys are optional: they are absent when the current URL is not on this branch.
	 */
	currentVariables: Signal<Partial<BranchVariables<B>>>;
};

@Injectable({
	providedIn: 'root'
})
export class UrlService {
	private readonly router = inject(Router);
	/**
	 * A signal that tracks the current URL of the application.
	 */
	public readonly current = toSignal(
		this.router.events.pipe(
			filter((e): e is NavigationEnd => e instanceof NavigationEnd),
			map(e => e.urlAfterRedirects),
		),
		{ initialValue: this.router.url },
	);

	/**
	 * Usage: `this.urlService.get('play').navigate({ roomId: 'V1LYBR' })`
	 */
	public get<B extends BranchName>(branchName: B): TreeObject<B> {
		const branch: UrlTreeBranch = TREE[branchName];
		if (!branch) throw new Error(`UrlService: unknown branch '${branchName}'`);

		// The closures are loosely typed: TS can't match them against the still-generic
		// VariablesArg<B>, so the per-branch typing is applied via the return type only.
		return {
			...branch,
			navigate: (variables: Record<string, string | undefined> = {}, extras: NavigationExtras = {}) => {
				const { commands, queryParams } = this.resolve(branchName, variables);
				return this.router.navigate(commands, {
					queryParams: queryParams,
					...extras,
				});
			},
			urlTree: (variables: Record<string, string | undefined> = {}) => {
				const { commands, queryParams } = this.resolve(branchName, variables);
				return this.router.createUrlTree(commands, { queryParams: queryParams });
			},
			currentVariables: computed(() => this.readVariables(branchName)),
		} as unknown as TreeObject<B>;
	}

	/**
	 * True when the current URL (ignoring query params) is exactly the given branch's url.
	 */
	public isActive(branchName: BranchName): boolean {
		return this.current().split('?')[0] === (TREE[branchName].url || '/');
	}

	public parse(url: string): UrlTree {
		return this.router.parseUrl(url);
	}

	private resolve(branchName: BranchName, variables: Record<string, string | undefined>): { commands: string[]; queryParams: Params } {
		const branch: UrlTreeBranch = TREE[branchName];
		const segments: string[] = [];
		const queryParams: Params = {};

		for (const [key, variable] of Object.entries(branch.variables ?? {})) {
			const value = variables[key];
			if (value === undefined) {
				if (variable.mandatory) {
					throw new Error(`UrlService: missing mandatory variable '${key}' for branch '${branchName}'`);
				}
				continue;
			}
			if (variable.type === 'segment') {
				segments.push(value);
			} else {
				queryParams[key] = value;
			}
		}

		return { commands: [branch.url, ...segments], queryParams: queryParams };
	}

	/**
	 * Reads the branch's variables out of the current URL: query params by key, segment
	 * variables (in declaration order) from the segments that follow the branch's base url.
	 */
	private readVariables(branchName: BranchName): Record<string, string> {
		const branch: UrlTreeBranch = TREE[branchName];
		const tree = this.router.parseUrl(this.current());
		const segments = tree.root.children[PRIMARY_OUTLET]?.segments.map(s => s.path) ?? [];
		const baseSegments = branch.url.split('/').filter(Boolean);
		// A url that exactly matches another branch belongs to that branch: e.g. '/play/new'
		// is the 'play/new' branch, not the 'play' branch with 'new' as its roomId segment.
		const path = '/' + segments.join('/');
		const isOtherBranchUrl = Object.entries(TREE).some(([name, b]) => name !== branchName && b.url === path);
		const onBranch = !isOtherBranchUrl && baseSegments.every((seg, i) => segments[i] === seg);
		const result: Record<string, string> = {};
		let segmentIndex = baseSegments.length;

		for (const [key, variable] of Object.entries(branch.variables ?? {})) {
			if (variable.type === 'segment') {
				const value = onBranch ? segments[segmentIndex++] : undefined;
				if (value !== undefined) result[key] = value;
			} else {
				const value: unknown = tree.queryParams[key];
				if (typeof value === 'string') result[key] = value;
			}
		}

		return result;
	}
}
