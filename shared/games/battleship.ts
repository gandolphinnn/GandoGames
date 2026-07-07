import { GamePlayer, GameSettings, GameSettingsSchema, GameState, RoomData } from "..";

// Battleship: two players secretly place a fleet on their own 10×10 grid, then take turns firing at
// the opponent's grid until one fleet is sunk. This module is the single source of truth for the board
// shape, the fleet, and the placement/hit rules — shared by the API (authoritative) and the site (the
// placement editor validates locally against the same helpers so client and server always agree).

export const BOARD_SIZE = 10;

export type ShipName = 'Carrier' | 'Battleship' | 'Cruiser' | 'Submarine' | 'Destroyer';
export type Orientation = 'horizontal' | 'vertical';
export type ShotResult = 'hit' | 'miss';

/** The standard fleet — ship name → length, listed in placement order (largest first). */
export const FLEET: readonly { name: ShipName; size: number }[] = [
	{ name: 'Carrier', size: 5 },
	{ name: 'Battleship', size: 4 },
	{ name: 'Cruiser', size: 3 },
	{ name: 'Submarine', size: 3 },
	{ name: 'Destroyer', size: 2 },
];

export interface Coord {
	row: number;
	col: number;
}

export interface Ship {
	name: ShipName;
	size: number;
	/** The contiguous cells this ship occupies. */
	cells: Coord[];
}

export interface Shot {
	row: number;
	col: number;
	result: ShotResult;
}

export interface BattleshipPlayer extends GamePlayer {
	/** This player's fleet — hidden from the opponent (see `getPublicState`). */
	ships: Ship[];
	/** True once the player has confirmed a valid placement. */
	ready: boolean;
	/** Shots the opponent has fired at this player's board (hits & misses on own water). */
	incomingShots: Shot[];
}

/** The most recent shot, kept on the state for hit/miss/sunk feedback in the UI. */
export interface BattleshipShotEvent {
	/** Player id who fired. */
	by: string;
	row: number;
	col: number;
	result: ShotResult;
	/** Set when this shot sank a ship. */
	sunk?: ShipName;
}

export interface BattleshipGameState extends GameState {
	gamePhase: 'placement' | 'playing' | 'game-over';
	players: BattleshipPlayer[];
	/** Index of the player whose turn it is to fire (playing phase). */
	currentPlayerIndex: number;
	lastShot?: BattleshipShotEvent;
	winnerName?: string;
}

export interface BattleshipRoomState extends RoomData {
	gameState?: BattleshipGameState;
}

// Battleship has no host-tunable settings; the empty schema still satisfies the shared registries.
export const BATTLESHIP_SETTINGS_SCHEMA: GameSettingsSchema = [];
export const DEFAULT_BATTLESHIP_SETTINGS: GameSettings = {};

// ── Coordinate & fleet helpers ─────────────────────────────────────────────────────
// Shared by the site's placement editor and the API's validation so both enforce identical rules.

/** Stable string identity for a cell — for Set/Map keys. */
export function coordKey(row: number, col: number): string {
	return `${row},${col}`;
}

export function inBounds(row: number, col: number): boolean {
	return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
}

/** The cells a ship of `size` occupies anchored at (row, col), extending right or down. */
export function shipCells(row: number, col: number, size: number, orientation: Orientation): Coord[] {
	const cells: Coord[] = [];
	for (let i = 0; i < size; i++) {
		cells.push(orientation === 'horizontal' ? { row, col: col + i } : { row: row + i, col });
	}
	return cells;
}

/** Whether a candidate ship's cells all fit on the board and don't overlap `occupied`. */
export function canPlace(cells: Coord[], occupied: Set<string>): boolean {
	return cells.every(c => inBounds(c.row, c.col) && !occupied.has(coordKey(c.row, c.col)));
}

/** True if cells form a straight, gap-free horizontal or vertical run. */
function isContiguousLine(cells: Coord[]): boolean {
	if (cells.length === 0) return false;
	const sameRow = cells.every(c => c.row === cells[0]!.row);
	const sameCol = cells.every(c => c.col === cells[0]!.col);
	if (!sameRow && !sameCol) return false;
	const line = (sameRow ? cells.map(c => c.col) : cells.map(c => c.row)).sort((a, b) => a - b);
	for (let i = 1; i < line.length; i++) {
		if (line[i]! !== line[i - 1]! + 1) return false;
	}
	return true;
}

/**
 * Validate a full fleet: exactly the standard ships (each once, correct size), every ship contiguous
 * and in-bounds, and no two ships overlapping. Never trusts the incoming shape — used server-side to
 * reject a bad `place` action and client-side to gate the Confirm button.
 */
export function validateFleet(ships: Ship[]): boolean {
	if (!Array.isArray(ships) || ships.length !== FLEET.length) return false;
	const expected = new Map<ShipName, number>(FLEET.map(s => [s.name, s.size]));
	const seen = new Set<ShipName>();
	const occupied = new Set<string>();
	for (const ship of ships) {
		const size = expected.get(ship?.name);
		if (size === undefined || seen.has(ship.name)) return false;
		seen.add(ship.name);
		if (ship.size !== size || !Array.isArray(ship.cells) || ship.cells.length !== size) return false;
		if (!isContiguousLine(ship.cells)) return false;
		for (const c of ship.cells) {
			if (!inBounds(c.row, c.col)) return false;
			const key = coordKey(c.row, c.col);
			if (occupied.has(key)) return false;
			occupied.add(key);
		}
	}
	return seen.size === FLEET.length;
}

function isCellHit(row: number, col: number, shots: Shot[]): boolean {
	return shots.some(s => s.row === row && s.col === col && s.result === 'hit');
}

/** A ship is sunk when every one of its cells has been hit. */
export function isShipSunk(ship: Ship, shots: Shot[]): boolean {
	return ship.cells.every(c => isCellHit(c.row, c.col, shots));
}

/** Whether every ship in the fleet has been sunk. */
export function isFleetDestroyed(ships: Ship[], shots: Shot[]): boolean {
	return ships.length > 0 && ships.every(s => isShipSunk(s, shots));
}
