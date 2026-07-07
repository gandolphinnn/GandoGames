// Battleship has no host-tunable settings. The (empty) schema/defaults are defined once in the shared
// package — so the API validates against the same definition — and re-exported here as this package's
// public settings API, mirroring the other games' packages.
export { BATTLESHIP_SETTINGS_SCHEMA, DEFAULT_BATTLESHIP_SETTINGS } from '@gandogames/shared/battleship';
