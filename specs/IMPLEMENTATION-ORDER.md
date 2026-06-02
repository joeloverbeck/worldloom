# Implementation Order — Manual Story Studio Third Iteration (SPEC-112 … SPEC-115)

**Date:** 2026-06-02
**Source triage:** `docs/triage/2026-06-02-manual-story-studio-third-iteration-triage.md`
**Report:** `reports/manual-story-studio-third-iteration.md` (ChatGPT-Pro, third iteration)

These active specs implement the remaining accepted findings of the third-iteration audit of `tools/manual-story-studio`. All are **tooling-adjacent**; none touch world canon or the story-bundle pipeline. The guiding acceptance question (report §39): *can an author maintain continuity after every accepted segment in under a minute without touching an internal ID?*

## Completed

- **SPEC-116** — Backend integrity hardening is complete and archived at `archive/specs/SPEC-116-manual-story-studio-backend-integrity-hardening.md`. It landed first because it closed the live `included_template_path` arbitrary-file-read vulnerability and scoped health blocking.
- **SPEC-112** — Record pickers are complete and archived at `archive/specs/SPEC-112-manual-story-studio-record-pickers.md`. The landed surface is `RecordPicker` plus extended `RecordCard` presentation, current-context/record-form/current-state/Moment Composer mounts, and the source-structure capstone test.

## Order

| # | Spec | Why here | Hard dependency |
|---|------|----------|-----------------|
| 1 | **SPEC-113** — Inclusion ledger + Prompt Preview inspector | The "confidence UX" backbone. Extends the deterministic compose result and rebuilds Prompt Preview around the ledger; the inspector renders records via SPEC-112's archived picker/card surface. | SPEC-102, SPEC-109 (landed); archive/specs/SPEC-112-manual-story-studio-record-pickers.md |
| 2 | **SPEC-114** — Mutable-record delete lifecycle | Corrects the soft-delete-as-archive default to block-on-referrer; referrer cards reuse the archived SPEC-112 picker/card surface, and its referrer-resolution pass also backs SPEC-112's deferred referenced-by count. | SPEC-101 (landed); archive/specs/SPEC-112-manual-story-studio-record-pickers.md |
| 3 | **SPEC-115** — World source browser | Largest single build; no downstream blocker. The copy-into-story-record form reuses SPEC-112's pickers/cards and forms, so it lands after they exist. | SPEC-100 (landed); archive/specs/SPEC-112-manual-story-studio-record-pickers.md |

## Dependency notes

- **SPEC-112 is landed and archived**: 113, 114, and 115 all reuse its `RecordPicker` / extended `RecordCard` surface.
- **113, 114, 115 are mutually independent** now that 112 has landed; they may be implemented in parallel. The numeric order above reflects descending value-per-effort, not a hard chain.
- SPEC-112/113 composer-caller changes must use the archived SPEC-116 contained form: `selected_template` as an `mtemplate-<integer>` id. The raw `included_template_path` request field is no longer accepted.

## Explicitly deferred (not specs in this batch)

Recorded in the companion triage file with lift-conditions:

- **Schema deepening** (report §11) — defer until SPEC-112/113 land and real use surfaces concrete gaps (also deferred by the landed SPEC-109 and by the report's own Stage 9).
- **Beat-template global library / field demotion** (report §17, §35) — defer until the core loop is validated (report Stage 9).
- **Post-segment record workbench** (report §24, Stage 7) — defer to a follow-up now that SPEC-112 pickers + card patterns exist; lift-condition: pickers validated in real use.
- **One-real-story browser-like acceptance test** (report §23, Stage 8) — each feature spec carries its own acceptance criteria; a dedicated capstone test spec defers until the feature specs land.

## Build & test (all specs)

Per-package, no pnpm workspace. From `tools/manual-story-studio/`:
- `npm run build` — `build:backend` (`tsc -p tsconfig.json`) + `npm --prefix web run build`.
- `npm run test:backend` — backend `node --test` suite.
- `npm test` — backend tests + `npm --prefix web test` (web `tsc --noEmit` baseline).

There is no `typecheck` script and no monorepo filter command; invoke the package-local scripts above.
