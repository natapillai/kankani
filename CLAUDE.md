# kankani

> AI assisted observability for Node.js

The name `kankani` (கண்காணி) is the Tamil word for "to observe" or "to watch over." This library does exactly that for Node.js Express apps. The user adds one line of middleware to their Express app and gets a local dashboard with traces plus on demand AI analysis. Portfolio project, v0.1 scope, finishable in 3 to 4 weeks.

The package will be published to npm under a personal scope (e.g. `@yourhandle/kankani`). The descriptive tagline above appears alongside the name everywhere it shows up (npm page, README, GitHub), so the name carries personality while the tagline carries the keywords.

## Tech stack

* Node.js (LTS)
* TypeScript (strict mode)
* Express 4
* Vite plus React 18 (dashboard)
* Anthropic SDK (AI)
* Vitest (tests)
* pnpm (package manager)

## Project structure

```
src/             library source
dashboard/       React app for the dashboard UI
examples/        sample apps for manual testing
tests/           unit tests
DESIGN.md        the project plan and rationale (read on demand)
PROGRESS.md      log of what has been built (updated after each commit)
```

## Commands

* `pnpm install`
* `pnpm build`
* `pnpm test`
* `pnpm dev` (watch mode)
* `pnpm lint`

## Code conventions

* Conventional commit format: `feat:`, `fix:`, `chore:`, `test:`, `docs:`, `refactor:`, `ci:`, `release:`
* One logical change per commit. Keep them small.
* Tests live next to code, suffixed `.test.ts`.
* Named exports only. No default exports.
* No `any` types. Use `unknown` if forced.
* Two space indent, single quotes, semicolons.
* JSDoc on every exported API.

## Workflow rules

* When unsure what to work on next, read `PROGRESS.md` and pick the next unchecked item under the active milestone.
* `DESIGN.md` has the full project plan and rationale. Read it on demand when planning a milestone or making a noteworthy decision. Do not load it for routine work.
* After each commit, check off the matching item in `PROGRESS.md` and append a one line note with the commit hash and date.
* When you make a noteworthy design choice, append a short entry to the "Notes and decisions" section of `PROGRESS.md`.
* After all mini commits in a milestone are complete, stop and ask the human to review before starting the next milestone.
* Pause and confirm before destructive actions (file deletion, force push, dropping data).
* Never run `npm publish` without explicit human approval.
* Never commit secrets, API keys, or `.env` files. Add them to `.gitignore` first.

## Starting out

On the very first session, if `PROGRESS.md` shows no items completed, propose the first commit (`chore: project setup`) and wait for human approval before executing. From later sessions on, just check `PROGRESS.md` for the next unchecked item.

## Context for the human

This is a portfolio project for someone job searching for backend and full stack roles. The code must be readable and the design choices defensible in interviews. Favor clarity over cleverness. Comments explain why, not what. If a choice is interesting enough to come up in an interview, it is interesting enough to note in `PROGRESS.md`.
