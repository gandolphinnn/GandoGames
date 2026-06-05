# SHARED

Code shared between `api/` and `site/`: types, interfaces, pure constants, and
dependency-free helper functions.

Keep everything here **environment-agnostic** — no Node, Azure, DOM, or Angular
APIs — since the same code is compiled into both the Azure Functions runtime and
the Angular browser bundle.

The API resolves the `@gandogames/shared/*` path aliases at build time via
`tsc-alias` (see `api/package.json`); the Angular builder bundles them directly.
