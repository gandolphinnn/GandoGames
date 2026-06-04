// Placeholder for per-PR preview builds. The CI workflow (.github/workflows/pr-preview.yml)
// replaces __API_BASE_URL__ with the ephemeral Function App URL before `ng build --configuration preview`.
// siteBaseUrl is left empty so invite/share links resolve relative to the preview host.
export const environment = {
	production: true,
	apiBaseUrl: '__API_BASE_URL__',
	siteBaseUrl: '',
};
