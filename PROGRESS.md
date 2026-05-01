# kankani — Progress Log

> AI assisted observability for Node.js

This file is the project journal. Claude Code updates it after every commit. Read it like a diary of what has been done and any decisions made along the way.

## Current status

Not started. See `DESIGN.md` for the plan.

## Milestone 1: Captures traces

* [ ] `chore: project setup`
* [ ] `feat: add span and trace types`
* [ ] `feat: add SpanStore class`
* [ ] `feat: add Express middleware`
* [ ] `feat: add manual trace() helper`
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

(Empty until something is worth noting.)
