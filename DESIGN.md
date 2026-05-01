# kankani — Design Doc

> AI assisted observability for Node.js. The name `kankani` (கண்காணி) is the Tamil word for "to observe" or "to watch over."

This file is the full project plan. `CLAUDE.md` is the always loaded rules. This file is the reference, read on demand when planning a milestone or making a noteworthy decision.

## What we're building

A small observability library for Node.js Express applications, with on demand AI assisted analysis. The user installs the package, adds one line of middleware to their Express app, and gets:

1. A local web dashboard showing recent HTTP requests as traces
2. A button on each trace to get an AI generated explanation of what happened, especially useful for slow or errored requests

This is v0.1. The goal is a polished, finishable artifact, not a competitor to Datadog or Honeycomb.

## Why this exists

Most teams running Node.js services do not have great observability tooling. OpenTelemetry exists but has a steep learning curve. AI assisted SRE is a real and growing space. A drop in library that gives you both a dashboard and AI analysis lowers the barrier dramatically.

The project also demonstrates, for the engineer building it:

* Library design and API ergonomics
* Backend systems work (in process storage, HTTP servers, middleware)
* Frontend work (React dashboard, waterfall visualization)
* AI integration (LLM API calls, prompt design, error handling)
* Security thinking (default safe configurations, refusing to start in unsafe modes)
* Shipping discipline (npm publish, README, demo GIF)

## Architecture

Three layers:

1. **Capture.** Express middleware and a manual `trace()` helper that record spans into an in process store.
2. **Dashboard.** A small HTTP server that the library spins up on a configurable port (default 9100), serving a React UI built into the package.
3. **AI analysis.** An on demand endpoint that sends span data to the Anthropic API and returns a natural language analysis.

Conceptual flow:

```
   user's Express app
          |
          | middleware records spans
          v
     SpanStore (in process)
          |
          | queried by
          v
     Dashboard HTTP server (port 9100)
          |
          | served to
          v
     React UI in browser
          |
          | "Analyze" button click
          v
     /api/analyze endpoint
          |
          | sends prompt to
          v
     Anthropic API
```

## Tech stack and rationale

* **Node.js plus TypeScript.** Largest ecosystem for web backends. TypeScript gives library users type safety on the public API.
* **Express 4.** Most common Node web framework. Targeting it first maximizes audience.
* **In process span storage with no persistence.** Keeps v0.1 scope tight. Restart loses data, which is fine for a dev tool.
* **Vite plus React 18.** Standard modern frontend stack. Vite gives fast dev experience and a small production build.
* **Anthropic SDK called direct from the library.** User provides their own API key. Avoids running our own backend service.
* **Vitest.** Fast modern test runner. Better DX than Jest for TypeScript libraries.
* **pnpm.** Faster and uses less disk than npm. Clean default for library development.

## Out of scope for v0.1

These are explicit non goals. They might come later but not now.

* Auto instrumentation. Users wrap things explicitly with `trace()`.
* Database or HTTP client integrations
* Persistence to disk or a real database
* Authentication or multi user support beyond localhost binding
* Anomaly detection or proactive AI analysis
* Multiple framework support (Fastify, Koa, etc.)
* OpenTelemetry compatibility
* Production hardening (rate limits, sampling, backpressure)

## Security defaults

The dashboard server binds to `127.0.0.1` (localhost only) by default. To bind to other interfaces, the user must explicitly set `host` in the config and the library refuses to start without an additional `token` being provided. This is the "secure by default, refuse to start in unsafe configurations" pattern, which is a strong interview talking point.

Other security details:

* Use `crypto.timingSafeEqual` for token comparison (prevents timing attacks)
* Never log the token, even in debug logs
* Refuse to start without TLS when bound to a non local interface

## Milestones

Each milestone is a discrete, shippable chunk. We can stop after any milestone and have something useful to show. Inside each milestone are mini commits, each finishable in a sitting.

### Milestone 1: Captures traces

The library can record spans from an Express app and a manual `trace()` helper. No UI yet, just `console.log` to verify capture works.

Mini commits:

1. `chore: project setup` (package.json, tsconfig, eslint, prettier, gitignore)
2. `feat: add span and trace types` (TypeScript interfaces for Span and Trace)
3. `feat: add SpanStore class` (in process span storage)
4. `feat: add Express middleware` (records a span per request)
5. `feat: add manual trace() helper` (wraps async functions)
6. `test: add unit tests and example app` (Vitest tests plus example/basic.ts)

### Milestone 2: Dashboard shows

The library spins up a local HTTP server with a React dashboard showing the captured traces.

Mini commits:

1. `feat: add HTTP server on port 9100` (Express server inside our library, localhost only)
2. `feat: add traces API endpoints` (`/api/traces` and `/api/traces/:id`)
3. `feat: scaffold dashboard frontend` (Vite plus React in `dashboard/`)
4. `feat: add trace list view` (table of recent traces)
5. `feat: add trace detail with waterfall` (timeline of spans within a trace)
6. `feat: bundle dashboard into package` (the dashboard ships in the npm package)

### Milestone 3: AI explains

Click a button on any trace and get an AI generated analysis.

Mini commits:

1. `chore: add Anthropic SDK dependency`
2. `feat: add prompt builder for span data` (converts trace data into a prompt)
3. `feat: add analyze API endpoint` (calls Anthropic API)
4. `feat: handle errors gracefully` (timeouts, missing API key, rate limits)
5. `feat: add Analyze button to dashboard` (UI integration)
6. `feat: render markdown analysis response`

### Milestone 4: Live on npm

The library is published, installable, and has a clean README.

Mini commits:

1. `docs: write README` (install, demo, how it works)
2. `chore: add LICENSE` (MIT)
3. `chore: configure package.json for publish` (files, exports, types)
4. `chore: build and test from local tarball`
5. `ci: add GitHub Actions for tests`
6. `release: first npm publish`

## Definition of done for v0.1

* All four milestones complete
* Tests passing in CI
* Published on npm under a scoped name
* README has install instructions, demo GIF, and a "how it works" section
* Working install and first run in under 60 seconds

## Open decisions

These are things to figure out as we go. Don't block on them now.

* npm scope (`@yourhandle/kankani`, set during milestone 4)
* License (MIT default, could be Apache 2)
* Whether to support a hosted backend variant in v0.2
