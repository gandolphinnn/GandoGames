// Placeholder for per-PR preview builds. The CI workflow (.github/workflows/pr-preview.yml)
// replaces __API_BASE_URL__ with the ephemeral Function App URL before `ng build --configuration preview`.
// No apiFallbackUrl: a preview build must never silently fall back to the production API.
import { Environment } from './environment.model';

export const environment: Environment = {
	production: true,
	apiBaseUrl: '__API_BASE_URL__',
};
