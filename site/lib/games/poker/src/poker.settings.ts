// Poker's settings surface for the game-settings editor. The schema/types are defined once in the
// shared package (so the API validates against the same definition) and re-exported here as the
// poker package's public settings API.
export { POKER_SETTINGS_SCHEMA, DEFAULT_POKER_SETTINGS, type PokerSettings } from '@gandogames/shared/poker';
