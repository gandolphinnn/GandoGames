import { BOARD_SIZE, FLEET } from '@gandogames/shared/battleship';

// Frontend-only display constants for the battleship board. The game logic + types live in the shared
// package (`@gandogames/shared/battleship`); this file adds labels/order the UI needs.

/** 0-based cell indices for one board axis (drives the grid `@for` loops). */
export const AXIS = Array.from({ length: BOARD_SIZE }, (_, i) => i);

/** Column headers A–J. */
export const COLUMN_LABELS = AXIS.map(i => String.fromCharCode(65 + i));

/** Row headers 1–10. */
export const ROW_LABELS = AXIS.map(i => i + 1);

/** The fleet in placement order, for the setup roster. */
export const FLEET_ROSTER = FLEET;
