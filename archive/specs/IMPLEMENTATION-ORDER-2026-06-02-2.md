# Implementation Order — Manual Story Studio Third Iteration (SPEC-112 … SPEC-115)

**Status:** COMPLETED
**Date:** 2026-06-02
**Source triage:** `docs/triage/2026-06-02-manual-story-studio-third-iteration-triage.md`
**Report:** `reports/manual-story-studio-third-iteration.md` (ChatGPT-Pro, third iteration)

These active specs implement the remaining accepted findings of the third-iteration audit of `tools/manual-story-studio`. All are **tooling-adjacent**; none touch world canon or the story-bundle pipeline. The guiding acceptance question (report §39): *can an author maintain continuity after every accepted segment in under a minute without touching an internal ID?*

## Completed

- **SPEC-116** — Backend integrity hardening is complete and archived at `archive/specs/SPEC-116-manual-story-studio-backend-integrity-hardening.md`. It landed first because it closed the live `included_template_path` arbitrary-file-read vulnerability and scoped health blocking.
- **SPEC-112** — Record pickers are complete and archived at `archive/specs/SPEC-112-manual-story-studio-record-pickers.md`. The landed surface is `RecordPicker` plus extended `RecordCard` presentation, current-context/record-form/current-state/Moment Composer mounts, and the source-structure capstone test.
- **SPEC-113** — Inclusion ledger and Prompt Preview inspector are complete and archived at `archive/specs/SPEC-113-manual-story-studio-prompt-inclusion-ledger.md`. The landed surface is `excluded_records`, backend resolution ledger buckets, `section_map`, the two-pane inspector, and the Prompt Working Set relabel.
- **SPEC-114** — Mutable-record delete lifecycle is complete and archived at `archive/specs/SPEC-114-manual-story-studio-mutable-record-delete-lifecycle.md`. The landed surface is hard-delete-or-block for records and beat templates, summary-bearing referrer blockers, repair-mode force-delete with persisted `repair-log.yaml`, and updated delete/ID-allocation docs.
- **SPEC-115** — World source browser is complete and archived at `archive/specs/SPEC-115-manual-story-studio-world-source-browser.md`. The landed surface is a read-only world-source reader, GET-only source routes, and a per-story Source Browser page that copies literal world text into the existing story-record form.

## Order

All third-iteration specs are complete and archived.

## Dependency notes

- **SPEC-112 is landed and archived**: 113, 114, and 115 all reuse its `RecordPicker` / extended `RecordCard` surface.
- **SPEC-115 is landed and archived**. It reuses the archived SPEC-112 picker/card surface and does not depend on the SPEC-114 delete lifecycle.
- SPEC-112/113 composer-caller changes must use the archived SPEC-116 contained form: `selected_template` as an `mtemplate-<integer>` id. The raw `included_template_path` request field is no longer accepted.

## Explicitly deferred (not specs in this batch)

Recorded in the companion triage file with lift-conditions:

- **Schema deepening** (report §11) — defer until real use surfaces concrete gaps (also deferred by the landed SPEC-109 and by the report's own Stage 9).
- **Beat-template global library / field demotion** (report §17, §35) — defer until the core loop is validated (report Stage 9).
- **Post-segment record workbench** (report §24, Stage 7) — defer to a follow-up now that SPEC-112 pickers/card patterns and SPEC-113 inspector patterns exist; lift-condition: pickers and inspector validated in real use.
- **One-real-story browser-like acceptance test** (report §23, Stage 8) — each feature spec carries its own acceptance criteria; a dedicated capstone test spec defers until the feature specs land.

## Build & test (all specs)

Per-package, no pnpm workspace. From `tools/manual-story-studio/`:
- `npm run build` — `build:backend` (`tsc -p tsconfig.json`) + `npm --prefix web run build`.
- `npm run test:backend` — backend `node --test` suite.
- `npm test` — backend tests + `npm --prefix web test` (web `tsc --noEmit` baseline).

There is no `typecheck` script and no monorepo filter command; invoke the package-local scripts above.

## Outcome

Completed on 2026-06-02.

All active third-iteration Manual Story Studio specs were completed and archived:

- `archive/specs/SPEC-112-manual-story-studio-record-pickers.md`
- `archive/specs/SPEC-113-manual-story-studio-prompt-inclusion-ledger.md`
- `archive/specs/SPEC-114-manual-story-studio-mutable-record-delete-lifecycle.md`
- `archive/specs/SPEC-115-manual-story-studio-world-source-browser.md`
- `archive/specs/SPEC-116-manual-story-studio-backend-integrity-hardening.md`

Final SPEC-115 proof used the package-local Manual Story Studio lanes:

1. PASS: `cd tools/manual-story-studio && npm run test:backend`.
2. PASS: `cd tools/manual-story-studio/web && npm test`.
3. PASS: `cd tools/manual-story-studio && npm run build`.
4. PASS: `cd tools/manual-story-studio && npm test` passed with 482 backend/static tests plus web `tsc --noEmit`.
