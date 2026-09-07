import { computed, inject, Service, Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, NavigationExtras, Params, PRIMARY_OUTLET, Router, UrlTree } from '@angular/router';
import { filter, map } from 'rxjs';

const branch = (path: string): UrlBranch => {
		const match = path.match(/^(?<path>[^?:]+)(?<segments>(?::[^?:]+)*)(?:\?(?<queryParams>[^:]+(?:\?[^:]+)*))?$/);

		if (!match?.groups)
			throw new Error(`Invalid URL: ${path}`);

		return {
			url: match.groups['path'].replace(/\/$/, ''),
			segments: match.groups['segments'].split(/\/?:/).filter(Boolean) ?? [],
			queryParams: match.groups['queryParams'].split(/\/?\?/).filter(Boolean) ?? [],
		} as UrlBranch;
	}

interface UrlBranch {
	url: string;
	segments: string[];
	queryParams: string[];
};

interface UrlBranchState {
	/** Dot separated to easily access the BRANCHES const (e.g. 'play.local') */
	branchPath: string;
	segments: Record<string, string> | null;
	queryParams: Record<string, string> | null;
	navigate: () => Promise<void> | void;
}

export const BRANCHES = {
	about:      branch('about'),
	games:      branch('games?flags'),
	login:      branch('login?returnUrl'),
	signup:     branch('signup?returnUrl'),
	admin:      branch('admin'),
	profile:    branch('profile'),
	social:     branch('social'),
	rooms:      branch('rooms?gameId'),
	play: {
		local:  branch('play/local/:gameId'),
		global: branch('play/global/:gameId'),
		room:   branch('play/room/:roomId'),
	},
};

/**
 * transform a real url in a UrlBranchState:
 * 'play/room/ABC123' => { branchPath: 'play.room', segments: { roomId: 'ABC123'}}
 * 'rooms?gameId=poker' => { branchPath: 'rooms', queryParams: { gameId: 'poker'}}
 */
function toBranch(url: string): UrlBranchState {
	//WIP
}

@Service()
export class UrlService {
	public readonly current: Signal<UrlBranchState> = {};//WIP;

	public get(path: UrlBranch, ...args: )
}
