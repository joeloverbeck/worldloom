# Implementation Order — Manual Story Studio Third Iteration (SPEC-112 … SPEC-116)

**Date:** 2026-06-02
**Source triage:** `docs/triage/2026-06-02-manual-story-studio-third-iteration-triage.md`
**Report:** `reports/manual-story-studio-third-iteration.md` (ChatGPT-Pro, third iteration)

These five specs implement the accepted findings of the third-iteration audit of `tools/manual-story-studio`. All are **tooling-adjacent**; none touch world canon or the story-bundle pipeline. The guiding acceptance question (report §39): *can an author maintain continuity after every accepted segment in under a minute without touching an internal ID?*

## Order

| # | Spec | Why here | Hard dependency |
|---|------|----------|-----------------|
| 1 | **SPEC-116** — Backend integrity hardening | Closes a live arbitrary-file-read vulnerability (`included_template_path`, out-of-report finding O1). No UI prerequisites; independent; lands the security fix first. | SPEC-100, SPEC-105 (already landed) |
| 2 | **SPEC-112** — Record pickers | The single highest-value ergonomic fix and the foundation later specs reuse. Introduces `RecordPicker` + `RecordCardMini`, which SPEC-113 (inspector cards), SPEC-114 (referrer cards), and SPEC-115 (copy-into-record form) all consume. | SPEC-109, SPEC-111 (landed) |
| 3 | **SPEC-113** — Inclusion ledger + Prompt Preview inspector | The "confidence UX" backbone. Extends the deterministic compose result and rebuilds Prompt Preview around the ledger; the inspector renders records via SPEC-112's `RecordCardMini`. | SPEC-102, SPEC-109 (landed); SPEC-112 |
| 4 | **SPEC-114** — Mutable-record delete lifecycle | Corrects the soft-delete-as-archive default to block-on-referrer; referrer cards reuse `RecordCardMini`, and its referrer-resolution pass also backs SPEC-112's deferred referenced-by count. | SPEC-101 (landed); SPEC-112 |
| 5 | **SPEC-115** — World source browser | Largest single build; no downstream blocker. The copy-into-story-record form reuses SPEC-112's pickers/cards and forms, so it lands after they exist. | SPEC-100 (landed); SPEC-112 |

## Dependency notes

- **SPEC-116 is independent** and may proceed in parallel with the others; it is sequenced first only because it closes a security hole and has zero UI coupling.
- **SPEC-112 is the linchpin**: 113, 114, and 115 all reuse its `RecordPicker` / `RecordCardMini`. It should land before them even though 113's *backend* ledger work could technically start earlier.
- **113, 114, 115 are mutually independent** once 112 lands; they may be implemented in parallel. The numeric order above reflects descending value-per-effort, not a hard chain.
- One cross-spec coupling to watch: SPEC-116 changes the compose route's template-reference field shape. If the web compose caller passes `included_template_path`, update that call site to the contained form (noted in SPEC-116 §7 AC#6); SPEC-112/113's composer-caller changes must use the contained form.

## Explicitly deferred (not specs in this batch)

Recorded in the companion triage file with lift-conditions:

- **Schema deepening** (report §11) — defer until SPEC-112/113 land and real use surfaces concrete gaps (also deferred by the landed SPEC-109 and by the report's own Stage 9).
- **Beat-template global library / field demotion** (report §17, §35) — defer until the core loop is validated (report Stage 9).
- **Post-segment record workbench** (report §24, Stage 7) — defer to a follow-up once SPEC-112 pickers + card patterns exist; lift-condition: pickers validated in use.
- **One-real-story browser-like acceptance test** (report §23, Stage 8) — each feature spec carries its own acceptance criteria; a dedicated capstone test spec defers until the feature specs land.

## Build & test (all specs)

Per-package, no pnpm workspace. From `tools/manual-story-studio/`:
- `npm run build` — `build:backend` (`tsc -p tsconfig.json`) + `npm --prefix web run build`.
- `npm run test:backend` — backend `node --test` suite.
- `npm test` — backend tests + `npm --prefix web test` (web `tsc --noEmit` baseline).

There is no `typecheck` script and no monorepo filter command; invoke the package-local scripts above.
