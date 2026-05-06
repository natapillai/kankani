# kankani — Progress Log

> AI assisted observability for Node.js

This file is the project journal. Claude Code updates it after every commit. Read it like a diary of what has been done and any decisions made along the way.

## Current status

Not started. See `DESIGN.md` for the plan.

## Milestone 1: Captures traces

* [x] `chore: project setup` — a2a7432, 2026-05-01
* [x] `feat: add span and trace types` — 289a6d8, 2026-05-01
* [x] `feat: add SpanStore class` — 29323cf, 2026-05-01
* [x] `feat: add Express middleware` — b888ef2, 2026-05-01
* [x] `feat: add manual trace() helper` — 3de904c, 2026-05-01
* [x] `test: add unit tests and example app` — e926684, 2026-05-01

## Milestone 2: Dashboard shows

* [x] `feat: add HTTP server on port 9100` — a15d133, 2026-05-01
* [x] `feat: add traces API endpoints` — f72b60f, 2026-05-01
* [x] `feat: scaffold dashboard frontend` — 05a997e, 2026-05-01
* [ ] `feat: add trace list view`
* [ ] `feat: add trace detail with waterfall`
* [ ] `feat: bundle dashboard into package`

## Milestone 3: AI explains

* [ ] `chore: add Anthropic SDK dependency`
* [ ] `feat: add prompt builder for span data`
* [ ] `feat: add analyze API endpoint`
* [ ] `feat: handle errors gracefully`
* [ ] `feat: add Analyze button to dashboard`
* [ ] `feat: render markdown analysis response`

## Milestone 4: Live on npm

* [ ] `docs: write README`
* [ ] `chore: add LICENSE`
* [ ] `chore: configure package.json for publish`
* [ ] `chore: build and test from local tarball`
* [ ] `ci: add GitHub Actions for tests`
* [ ] `release: first npm publish`

## Notes and decisions

This section is for things worth remembering across sessions. Examples once the project is underway:

* "Decided to use snake_case for endpoint paths."
* "Found a bug in the example app, fixed in commit abc1234."
* "Renamed `trace()` to `withSpan()` based on review."

* Pinned `engines.node` to `^20.19.0 || ^22.13.0 || >=24.0.0` rather than `>=20`. eslint v10's transitive deps (`@eslint/js`, `eslint-visitor-keys`) enforce this floor, and `.npmrc` sets `engine-strict=true` — so the package.json field has to match what `pnpm install` will actually accept. (a2a7432, 2026-05-01)
* Express peer-dep range is `^4 || ^5`, not just `^4`. DESIGN.md targeted Express 4 but Express 5 has been the default release since late 2024; our middleware only uses APIs (`req.method`, `req.path`, `res.on('close')`, `res.statusCode`, `RequestHandler`) that are stable across both, so accepting either widens the audience at no implementation cost. (b888ef2, 2026-05-01)
* Split into `tsconfig.json` (typecheck + lint, includes `src/` and `examples/`) and `tsconfig.build.json` (publish, `rootDir: src`, excludes `*.test.ts`). Single-config setups either lose typechecking on examples/tests or ship test files in `dist/`. (e926684, 2026-05-01)
* `trace()` takes the `SpanStore` as an explicit argument rather than reading from `AsyncLocalStorage`. Async-context propagation is the correct long-term shape for an observability lib, but for v0.1 explicit DI is simpler to reason about and matches CLAUDE.md's "favor clarity over cleverness." Revisit if Milestone 2 dashboard work shows the friction of threading the store through. (3de904c, 2026-05-01)
* Top-level `kankani(options)` returns an object `{ middleware, store, url, stop }` rather than a `RequestHandler` with properties stapled on it. The function-with-properties pattern would shave a line off setup (`app.use(kankani())`) but is "clever" — CLAUDE.md prefers clarity, and an object handle reads obviously to anyone skimming the code. Lower-level building blocks (`SpanStore`, `expressMiddleware`, `trace`) stay exported for power users. (a15d133, 2026-05-01)
* Dashboard server uses Node's built-in `http`, not Express. Adding Express as a runtime dep would conflict with our Express peer-dep model and add weight; the dashboard's needs (a few JSON routes, eventually static asset serving) are well within `http.createServer`. Independent runtime stack also means a future Fastify/Koa adapter wouldn't drag the dashboard with it. (a15d133, 2026-05-01)
* Bind-host security: `kankani()` throws if `host` is anything other than `127.0.0.1` / `localhost` / `::1` and no `token` is supplied. TLS-when-non-local refusal (called out in DESIGN.md) is deferred until token auth is wired in mini-commit 2 — there's nothing to authorize until the API endpoints exist. (a15d133, 2026-05-01)
* Dashboard is a pnpm workspace package (`@kankani/dashboard`) at `dashboard/`, not a sub-folder under the library. Keeps React/Vite out of the library's dep tree and the library's `dist/` free of frontend code; lets us build them independently. The library and dashboard are listed under `packages` in `pnpm-workspace.yaml`. (05a997e, 2026-05-01)
* Lint rules `no-default-export` and `no-explicit-any` are scoped to `src/**` and `examples/**` (library code) only. React components conventionally `export default`, and dashboard is allowed to follow that convention. Dashboard is in the root eslint ignores; it can grow its own lint config later if it wants stricter rules. (05a997e, 2026-05-01)
