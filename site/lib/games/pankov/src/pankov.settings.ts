// Pankov's settings surface for the game-settings editor. The schema/types are defined once in the
// shared package (so the API validates against the same definition) and re-exported here as the
// pankov package's public settings API.
export { PANKOV_SETTINGS_SCHEMA, DEFAULT_PANKOV_SETTINGS, type PankovSettings } from '@gandogames/shared/pankov';
