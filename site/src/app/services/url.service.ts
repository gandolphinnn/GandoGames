import { inject, Service, Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, UrlTree } from '@angular/router';
import { filter, map } from 'rxjs';
import { Branch, BRANCH_DEFINITIONS, BranchName, BuildStateArguments } from './url.types';
export { type BranchName } from './url.types';


const BRANCHES: Record<BranchName, Branch> = Object.fromEntries(
	Object.entries(BRANCH_DEFINITIONS)
		.map(([name, path]) => {
			const match = path.match(
				/^(?<path>[^?:]+)(?<segments>(?::[^?:]+)*)(?:\?(?<queryParams>[^:]+(?:\?[^:]+)*))?$/
			);

			if (!match?.groups)
				throw new Error(`Invalid URL: ${path}`);

			const branch = {
				url: match.groups['path'].replace(/\/$/, ''),
				segments: match.groups['segments'].split(/\/?:/).filter(Boolean) ?? [],
				queryParams: match.groups['queryParams']?.split(/\/?\?/).filter(Boolean) ?? [],
			};
			return [name, branch];
		})
) as Record<BranchName, Branch>;

export type BranchState = {
	branchName: BranchName;
	url: string;
	segments: Record<string, string>;
	queryParams: Record<string, string>;
	navigate: () => void;
	urlTree: () => UrlTree;
};


/* -------------------------------------------------------------------------- */
/*                                UrlService                                  */
/* -------------------------------------------------------------------------- */

@Service()
export class UrlService {

	private readonly router = inject(Router);


	/**
	 * Current application branch.
	 *
	 * It is updated reactively after every successful navigation.
	 */
	public readonly current: Signal<BranchState> = toSignal(
		this.router.events.pipe(
			filter(
				(event): event is NavigationEnd =>
					event instanceof NavigationEnd
			),
			map(event => this.getState(event.urlAfterRedirects)),
		),
		{
			initialValue: this.getState(this.router.url),
		},
	);

	public isActive(branchName: BranchName) {
		return this.current().branchName == branchName;
	}

	/**
	 * Get the BranchState from a real URL.
	 *
	 * Examples:
	 *
	 * 'play/room/ABC123'
	 * =>
	 * {
	 *   branchName: 'play_room',
	 *   segments: {
	 *     roomId: 'ABC123'
	 *   },
	 *   queryParams: {}
	 * }
	 *
	 * 'rooms?gameId=poker'
	 * =>
	 * {
	 *   branchName: 'rooms',
	 *   segments: {},
	 *   queryParams: {
	 *     gameId: 'poker'
	 *   }
	 * }
	 */
	public getState(url: string): BranchState {
		const urlTree = this.router.parseUrl(url);
		const primary = urlTree.root.children['primary'];

		if (!primary)
			throw new Error(`Invalid URL: ${url}`);

		const actualSegments = primary.segments.map(
			segment => segment.path
		);

		const branchEntry = Object.entries(BRANCHES).find(
			([, branch]) => this.matchesBranch(actualSegments, branch)
		);

		if (!branchEntry)
			throw new Error(`Unknown branch URL: ${url}`);

		const [branchName, branch] =
			branchEntry as [BranchName, Branch];


		/* ----------------------------- Segments ----------------------------- */

		const fixedPathSegments = branch.url
			.split('/')
			.filter(Boolean);

		const segments: Record<string, string> = {};

		branch.segments.forEach((segmentName, index) => {
			const actualIndex =
				fixedPathSegments.length + index;

			const value = actualSegments[actualIndex];

			if (value === undefined)
				throw new Error(
					`Missing segment '${segmentName}' in URL: ${url}`
				);

			segments[segmentName] = value;
		});


		/* --------------------------- Query params --------------------------- */

		const queryParams: Record<string, string> = {};

		for (const paramName of branch.queryParams) {
			const value = urlTree.queryParams[paramName];

			// Query params are optional.
			if (value === undefined)
				continue;

			// This service only supports one string value per parameter.
			if (Array.isArray(value))
				throw new Error(
					`Query parameter '${paramName}' has multiple values: ${url}`
				);

			queryParams[paramName] = String(value);
		}


		/* -------------------------- Unknown params -------------------------- */

		for (const paramName of Object.keys(urlTree.queryParams)) {
			if (!branch.queryParams.includes(paramName))
				throw new Error(
					`Unexpected query parameter '${paramName}' in URL: ${url}`
				);
		}


		return this.createState(
			branchName,
			segments,
			queryParams,
		);
	}


	/**
	 * Build a BranchState from a BranchName and its parameters.
	 *
	 * The required parameters are inferred from the branch definition.
	 *
	 * Examples:
	 *
	 * buildState('about')
	 * buildState('play_room', { roomId: 'ABC123' })
	 * buildState('login', { returnUrl: '/play/room/ABC123' })
	 */
	public buildState<Name extends BranchName>(
		name: Name,
		...args: BuildStateArguments<Name>
	): BranchState {
		const params =
			(args[0] ?? {}) as Record<string, string>;

		const branch = BRANCHES[name];

		const segments: Record<string, string> = {};
		const queryParams: Record<string, string> = {};


		/* ----------------------------- Segments ----------------------------- */

		for (const segmentName of branch.segments) {
			const value = params[segmentName];

			if (value === undefined)
				throw new Error(
					`Missing segment '${segmentName}' for branch '${name}'`
				);

			segments[segmentName] = value;
		}


		/* --------------------------- Query params --------------------------- */

		for (const paramName of branch.queryParams) {
			const value = params[paramName];

			if (value !== undefined)
				queryParams[paramName] = value;
		}


		return this.createState(
			name,
			segments,
			queryParams,
		);
	}


	/* ---------------------------------------------------------------------- */
	/*                              Internals                                 */
	/* ---------------------------------------------------------------------- */

	/**
	 * Checks whether a real URL matches a Branch definition.
	 *
	 * The branch has:
	 *
	 *   fixed path segments
	 *   +
	 *   dynamic segments
	 *
	 * Example:
	 *
	 * Branch:
	 *   play/room/:roomId
	 *
	 * URL:
	 *   play/room/ABC123
	 *
	 * => true
	 */
	private matchesBranch(
		actualSegments: string[],
		branch: Branch,
	): boolean {
		const fixedPathSegments = branch.url
			.split('/')
			.filter(Boolean);

		const expectedSegmentCount =
			fixedPathSegments.length +
			branch.segments.length;

		if (actualSegments.length !== expectedSegmentCount)
			return false;

		for (let i = 0; i < fixedPathSegments.length; i++) {
			if (actualSegments[i] !== fixedPathSegments[i])
				return false;
		}

		return true;
	}


	/**
	 * Creates a fully functional BranchState.
	 *
	 * This is the ONLY place where navigate() and urlTree()
	 * are assigned.
	 */
	private createState(
		branchName: BranchName,
		segments: Record<string, string>,
		queryParams: Record<string, string>,
	): BranchState {
		const branch = BRANCHES[branchName];

		const fixedPathSegments = branch.url
			.split('/')
			.filter(Boolean);

		const commands = [
			...fixedPathSegments,
			...branch.segments.map(
				segmentName => {
					const value = segments[segmentName];

					if (value === undefined)
						throw new Error(
							`Missing segment '${segmentName}'`
						);

					return value;
				},
			),
		];


		const tree = this.router.createUrlTree(
			['/', ...commands],
			{
				queryParams,
			},
		);


		return {
			url: branch.url,
			branchName,
			segments,
			queryParams,

			urlTree: () => tree,

			navigate: () => {
				void this.router.navigateByUrl(tree);
			},
		};
	}
}
