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
* [ ] `test: add unit tests and example app`

## Milestone 2: Dashboard shows

* [ ] `feat: add HTTP server on port 9100`
* [ ] `feat: add traces API endpoints`
* [ ] `feat: scaffold dashboard frontend`
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
