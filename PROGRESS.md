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
* [x] `feat: add trace list view` — 960929e, 2026-05-01
* [x] `feat: add trace detail with waterfall` — 3836ae8, 2026-05-01
* [x] `feat: bundle dashboard into package` — f7ffef2, 2026-05-08

## Milestone 3: AI explains

* [x] `chore: add Anthropic SDK dependency` — c626070, 2026-05-08
* [x] `feat: add prompt builder for span data` — 80f0457, 2026-05-08
* [x] `feat: add analyze API endpoint` — cba6810, 2026-05-08
* [x] `feat: handle errors gracefully` — 4788823, 2026-05-08
* [x] `feat: add Analyze button to dashboard` — 5e54c66, 2026-05-08
* [x] `feat: render markdown analysis response` — bundled with 5e54c66, 2026-05-08

## Milestone 4: Live on npm

* [x] `docs: write README` — b0abd62, 2026-05-08
* [x] `chore: add LICENSE` — pre-existing in a99e419 (initial commit), 2026-05-08
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
* Dashboard pulls `Trace` types from the library via `"kankani": "workspace:*"` rather than duplicating the type definitions. Single source of truth, but it means `pnpm build` (root) has to run before `pnpm dashboard:build` will typecheck on a fresh clone. Acceptable for v0.1; revisit with a `prebuild` hook if it bites. (960929e, 2026-05-01)
* Trace list polls `/api/traces` every 5s instead of using SSE/WebSockets. For a localhost dev tool watching a small in-memory store, polling is simpler, has no connection-state to manage, and survives the kankani server restarting. Re-evaluate if the trace volume grows past v0.1. (960929e, 2026-05-01)
* Detail-view navigation is in-app `useState`, not React Router. One transition (list ↔ detail) doesn't justify a router dep — saves ~10kB of bundle weight and keeps the dashboard build dependency-light. If we add more views later (settings, analyze) we'll revisit. (3836ae8, 2026-05-01)
* Dashboard build emits into the library's `dist/ui/` (Vite `outDir: '../dist/ui'`) rather than `dashboard/dist/`. Single `dist/` tree covered by the existing `files: ["dist"]` ships everything via npm — no extra `files` entry, no copy step. Trade-off: the dashboard package's own `dist/` is now empty, which is mildly confusing but only affects the dashboard workspace's local outputs, not the library. (f7ffef2, 2026-05-08)
* Server.ts uses **synchronous** `fs.existsSync` / `fs.readFileSync` for static asset serving. Async would be cleaner but adds Promise plumbing; for a localhost dev tool serving small built assets, sync I/O is fine and one fewer thing to think about. Revisit if the dashboard ever grows large bundles. (f7ffef2, 2026-05-08)
* Prompt builder normalizes traces before sending them to Claude — UUIDs collapsed to `S1`/`S2`/… labels (with parent refs remapped), raw timestamps replaced by relative start offsets and computed durations. Cuts prompt tokens significantly and gives the model cleaner structure to reason about; UUIDs aren't useful for analysis anyway. (80f0457, 2026-05-08)
* System prompt carries a `cache_control: ephemeral` marker even though the prompt is currently below the model's cache threshold (~2K-4K tokens depending on model). Harmless until the prompt grows past the threshold, at which point caching activates with no code change. Cheap forward compatibility per the claude-api skill's caching guidance. (80f0457, 2026-05-08)
* AI is opt-in, not required: `kankani()` works with no Anthropic key (capture + dashboard run normally; analyze endpoint returns 503 with a config hint; `/api/config` reports `aiConfigured: false`). With a key, the analyze button lights up. Three sources for the key, in priority order: `KankaniOptions.anthropicClient` (explicit pre-built client) → `KankaniOptions.anthropicApiKey` → `process.env.ANTHROPIC_API_KEY`. (cba6810, 2026-05-08)
* Default Claude model is `claude-opus-4-7` per the claude-api skill's mandated default ("ALWAYS use claude-opus-4-7 unless the user explicitly names a different model"). Users override via `KankaniOptions.model` — e.g. `claude-haiku-4-5` for cost-sensitive deployments. Documented as a per-click cost trade-off. (cba6810, 2026-05-08)
* Analyze module takes a small `AnalysisClient` interface (`{ messages: { create } }`) rather than the full `Anthropic` class. Unit tests inject a `vi.fn()` stub without `vi.mock()`, and the kankani factory still constructs a real `Anthropic` instance from the API key for production use. (cba6810, 2026-05-08)
* Server uses adaptive thinking (`thinking: { type: 'adaptive' }`) and `max_tokens: 16000` for analyze calls. Per the claude-api skill: adaptive thinking lets the model decide depth; the generous `max_tokens` avoids mid-thought truncation. Output is short markdown so streaming is unnecessary for v0.1. (cba6810, 2026-05-08)
* Error responses include a `code` field (`ai_auth_failed`, `ai_rate_limited`, `ai_upstream_error`, `ai_timeout`, `ai_unreachable`, `ai_not_configured`, plus `not_found` / `unauthorized` / `method_not_allowed`) alongside the human-readable `error`. The dashboard branches on `code` instead of regexing the message, which would be brittle. Reuses Anthropic SDK's typed exception classes via `instanceof` per the claude-api skill's guidance. (4788823, 2026-05-08)
* Analyze call has an explicit 60s timeout. The Anthropic SDK has a default timeout, but pinning ours means we don't drift when the SDK changes defaults, and 60s comfortably covers adaptive thinking on Opus 4.7 while still bounding a stuck request. (4788823, 2026-05-08)
* Tests for the SDK error-class mapping use a `fakeSdkError(cls)` helper that calls `Object.create(cls.prototype)` rather than invoking the constructors. SDK error constructors have moving signatures across releases; the prototype trick keeps `instanceof` checks firing without coupling tests to internal constructor shape. (4788823, 2026-05-08)
* Dashboard fetches `/api/config` once at app mount and prop-drills `aiConfigured` + `model` to `TraceDetail`. Considered a React Context for one config object but it's overkill — two props are cleaner than a Context Provider chain. Refetch would require a real refetch trigger (config doesn't change at runtime in v0.1). (5e54c66, 2026-05-08)
* When `aiConfigured: false`, the Analyze button is **disabled with a visible hint**, not hidden. Hiding the feature behind a config flag makes it undiscoverable; a disabled button + "Set ANTHROPIC_API_KEY" tooltip teaches users that the feature exists and how to turn it on. Interview talking point — feature discoverability vs. UI minimalism. (5e54c66, 2026-05-08)
* `react-markdown` (with `remark-gfm`) renders Claude's markdown response. It's safe by default (no `dangerouslySetInnerHTML`) and supports GFM tables/strikethrough. Adds ~50KB gzipped — acceptable since markdown is the feature's payload. Sanitization matters because trace attributes (untrusted) can flow through Claude's response. (5e54c66, 2026-05-08)
* Per-error-code UX in `AnalyzePanel.friendlyError()`: each `code` from the structured error response maps to a focused recovery message. Unknown codes fall back to the server's prose. The dashboard never parses error messages — it branches on `code` exclusively. (5e54c66, 2026-05-08)
* Mini-commit 6 (`feat: render markdown analysis response`) shipped bundled inside mini-commit 5 rather than as its own commit. DESIGN.md split them assuming the Analyze button would land first with raw-text output and markdown would follow as polish, but in practice `react-markdown` was simpler to wire on first pass than text-stripping. Checked off in PROGRESS.md with a back-reference to 5e54c66 rather than synthesizing a no-op commit. (5e54c66, 2026-05-08)
