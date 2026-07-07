import { GamePlayer } from '@gandogames/shared/dto';

/** `felt` = poker-green surface; `neutral` = themed surface for non-card games. */
export type TableVariant = 'felt' | 'neutral';

/**
 * `contain` sizes the felt by aspect-ratio and sits in scroll flow (the lobby, where
 * `ion-content` scrolls). `fill` makes the felt fill leftover flex height so a pinned
 * footer/action bar stays reachable (in-game, where `ion-content` does not scroll).
 */
export type TableFit = 'contain' | 'fill';

/**
 * A game's table look, read identically by its lobby and its in-game view so the two
 * phases stay consistent. Lives on the game registry (see `GameDescriptor.table`).
 */
export interface TablePreset {
	variant: TableVariant;
	/** Faint label rendered on the felt (usually the game name). */
	label?: string;
}

/** One seat around the table. `player` is null for an open seat. */
export interface TableSeat {
	/** Stable identity for `@for` tracking — survives hero-rotation as players join/leave. */
	key: string;
	/** The seated player, or null for an empty seat. */
	player: GamePlayer | null;
	/** The viewer's own seat (pinned to bottom-centre). */
	isHero?: boolean;
	/** Whose turn it is right now — drives the highlight ring. */
	isCurrentTurn?: boolean;
	/** Holds the dealer button (poker). */
	isDealer?: boolean;
	/** Dimmed — folded, eliminated, or otherwise out of the action. */
	faded?: boolean;
	/** Optional per-seat payload a game may want to thread through (rarely needed). */
	data?: unknown;
}

/** A seat's centre, as a percentage of the table box. */
export interface SeatPosition {
	left: number;
	top: number;
}

const DEG = Math.PI / 180;

/**
 * Seat-centre positions (percent) around the table ellipse. Seat 0 is the hero,
 * pinned to bottom-centre (θ = 90°, screen y-down). The remaining `M = n − 1`
 * opponents spread across a top arc centred on 270° (top-centre) and never dip
 * into the bottom ±50°, so they can't crowd the hero seat or the footer/action bar.
 *
 * `r` is the percentage radius; the surrounding container's aspect-ratio warps the
 * circle into a tall (mobile) or wide (desktop) oval, so the same numbers serve both.
 * `ry` overrides the vertical radius — pass a smaller value to flatten the ring where
 * vertical room is tight (e.g. the non-scrolling in-game view).
 */
export function layoutSeats(n: number, r = 40, ry = r): SeatPosition[] {
	if (n <= 0) return [];

	const at = (deg: number): SeatPosition => ({
		left: 50 + r * Math.cos(deg * DEG),
		top: 50 + ry * Math.sin(deg * DEG),
	});

	const positions: SeatPosition[] = [at(90)]; // hero — bottom-centre
	const m = n - 1;

	if (m === 1) {
		positions.push(at(270)); // heads-up: the lone opponent sits dead-top
	} else if (m >= 2) {
		const spread = Math.min(260, 90 + 40 * (m - 1));
		const start = 270 - spread / 2;
		for (let j = 0; j < m; j++) {
			positions.push(at(start + (j * spread) / (m - 1)));
		}
	}

	return positions;
}

/** Extra per-seat flags a game supplies for an occupied seat. */
export interface SeatFlags {
	isCurrentTurn?: boolean;
	isDealer?: boolean;
	faded?: boolean;
}

/**
 * Build the seat ring shared by a game's lobby and its in-game view. Players keep
 * their playing order; the viewer is rotated to seat 0 (bottom-centre) and the ring
 * is padded to `maxSeats` with open seats. Because the ring size is fixed by
 * `maxSeats`, the lobby ring and the game ring line up exactly — the "same layout"
 * guarantee lives here, not in each caller.
 *
 * When the viewer isn't seated (a spectator in the lobby) there's no hero to rotate
 * to, so the order simply starts at the first player.
 */
export function buildTableSeats<P extends GamePlayer>(
	players: readonly P[],
	myId: string | null,
	maxSeats: number,
	flags?: (player: P) => SeatFlags,
): TableSeat[] {
	const ringSize = Math.max(players.length, maxSeats);
	const heroIndex = myId ? players.findIndex(p => p.id === myId) : -1;
	const offset = heroIndex >= 0 ? heroIndex : 0;

	const seats: TableSeat[] = [];
	for (let i = 0; i < ringSize; i++) {
		const player = i < players.length ? players[(offset + i) % players.length] : null;
		seats.push({
			key: player ? player.id : `empty-${i}`,
			player,
			isHero: !!player && player.id === myId,
			...(player && flags ? flags(player) : {}),
		});
	}
	return seats;
}
