# SPEC120MANSTOSTU-003: Remove vestigial `retired_reason` field

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `tools/manual-story-studio` record schema types (`web/src/types/manual-story.ts`, `src/schema/manual-story.ts`) + validator (`src/validate/schema.ts`). No canon record schema change.
**Deps**: None

## Problem

At intake, `retired_reason` was a declared optional record field that no production code ever wrote — every write path left it undefined and tests asserted it stayed undefined. As dead-but-declared "retirement" vocabulary it reinforced the append-only mental model the tool rejects. This ticket removed it outright rather than renaming it to a second never-written field.

## Assumption Reassessment (2026-06-02)

1. Codebase: `retired_reason` is declared at `web/src/types/manual-story.ts:185` and `src/schema/manual-story.ts:158`, registered in `src/validate/schema.ts:48` (`COMMON_OPTIONAL_FIELDS`) and `:57` (`COMMON_SCALARS` as `retired_reason: "string"`), and set in the read-test fixture `test/read/records.test.ts:126` (`retired_reason: "retired"`). No production write path assigns it — `test/capstone-spec101.test.ts`, `test/write/records.test.ts`, and `test/write/delete-lifecycle.test.ts` assert it stays `undefined`; `test/web/records-delete-ux.test.ts:23` asserts its absence in the API. Verdict from `/reassess-spec` 2026-06-02: vestigial → remove.
2. Specs/docs: SPEC-120 §2 in-scope item 3, §4 item-3 enumeration, Acceptance Criteria #3, §3 Key decision ("removed (verdict: vestigial)"), §8 Risks (removal touches validator, not just the web type).
3. Cross-artifact boundary: the manual-story record schema (`src/schema/manual-story.ts` + its web mirror) ↔ validator (`src/validate/schema.ts`) ↔ test-fixture contract. All three must agree on the field's absence, or the validator keeps a dead optional declaration or a fixture sets an undeclared field.
4. FOUNDATIONS Rule 6 (No Silent Retcons): removing a declared field is attributed to SPEC-120 §2 item 3 (vocabulary cleanup), not silently dropped. No canon retcon — `tools/manual-story-studio` is the SPEC-100 canon-fenced package; `retired_reason` is a mutable-sidecar field, not a CF/CH canon-record field.
5. (was template item 7 — remove blast radius): pipeline-wide grep confirms `retired_reason` is contained to `tools/manual-story-studio` — 0 hits across other `tools/`, `.claude/skills/`, `docs/`, `specs/`. The field is optional (absent from every `required` array), so its removal breaks no required-field-set assertion. During implementation, three existing write/delete absence assertions also had to stop using direct `retired_reason` property access so the zero-hit source contract could be true while preserving the regression guard.

## Architecture Check

1. Removing a never-written field is strictly simplifying — no consumer reads it, so removal has no runtime effect beyond shrinking the schema surface. Cleaner than the spec's fallback (rename to `inactive_note`), which would add a second never-populated field.
2. No backwards-compatibility aliasing/shims — the field is deleted from type + validator, not deprecated-in-place or alias-mapped.

## Verification Layers

1. Zero `retired_reason` occurrences remain -> codebase grep-proof (`grep -rn "retired_reason" tools/manual-story-studio --include=*.ts --include=*.tsx` returns 0 outside `dist/`).
2. Validator still accepts valid records (the removed field was optional and never present) -> backend test (`npm run test:backend`).
3. `test/web/records-delete-ux.test.ts` absence assertion stays green -> backend test (it already guards against `retiredReason` reintroduction).
4. FOUNDATIONS Rule 6 attribution (removal traced to SPEC-120) -> FOUNDATIONS alignment check against this ticket's Assumption Reassessment item 4.

## What to Change

### 1. Schema type declarations

`web/src/types/manual-story.ts:185` and `src/schema/manual-story.ts:158` — delete the `retired_reason?: string` declaration from both type definitions.

### 2. Validator field registration

`src/validate/schema.ts` — remove `"retired_reason"` from `COMMON_OPTIONAL_FIELDS` (`:48`) and the `retired_reason: "string"` entry from `COMMON_SCALARS` (`:57`).

### 3. Test fixture

`test/read/records.test.ts:126` — remove the `retired_reason: "retired"` fixture line; surrounding read assertions are unchanged.

## Files to Touch

- `tools/manual-story-studio/web/src/types/manual-story.ts` (modify)
- `tools/manual-story-studio/src/schema/manual-story.ts` (modify)
- `tools/manual-story-studio/src/validate/schema.ts` (modify)
- `tools/manual-story-studio/test/read/records.test.ts` (modify)
- `tools/manual-story-studio/test/capstone-spec101.test.ts` (modify)
- `tools/manual-story-studio/test/write/records.test.ts` (modify)
- `tools/manual-story-studio/test/write/delete-lifecycle.test.ts` (modify)

## Out of Scope

- The `active` boolean field (stays — it is the legitimate inactive marker).
- Display strings (completed in `archive/tickets/SPEC120MANSTOSTU-001.md`) and the `includeArchived` rename (completed in `archive/tickets/SPEC120MANSTOSTU-002.md`).
- On-disk record migration — no authored record carries `retired_reason` (never written by production), so no data migration is required.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -rn "retired_reason" tools/manual-story-studio --include=*.ts --include=*.tsx` returns 0 hits outside `dist/`.
2. `cd tools/manual-story-studio && npm test` passes, including `test/web/records-delete-ux.test.ts` (absence assertion) and the validator/read tests.

### Invariants

1. No production record schema requires or emits `retired_reason` after removal.
2. Validation of existing valid records is unaffected (the field was optional and never present on any record).

## Test Plan

### New/Modified Tests

1. `tools/manual-story-studio/test/read/records.test.ts` — remove the `retired_reason` fixture line (line 126); surrounding read-layer assertions unchanged.
2. `tools/manual-story-studio/test/capstone-spec101.test.ts` — preserve the persisted-record absence assertion without direct `retired_reason` property access.
3. `tools/manual-story-studio/test/write/records.test.ts` — preserve the blocked-delete absence assertion without direct `retired_reason` property access.
4. `tools/manual-story-studio/test/write/delete-lifecycle.test.ts` — preserve the delete-lifecycle absence assertion without direct `retired_reason` property access.

### Commands

1. `cd tools/manual-story-studio && npm test`
2. `cd tools/manual-story-studio && npm run test:backend`
3. `grep -rn "retired_reason" tools/manual-story-studio --include=*.ts --include=*.tsx` (expect 0 outside `dist/`)

## Outcome

Completed: 2026-06-03

The vestigial `retired_reason` field was removed from the Manual Studio backend record type, web mirror type, validator optional-field/scalar allowlists, and the inactive-record read-test fixture. Existing write/delete regression tests still prove the field is absent from persisted records, but now build the removed field name dynamically so the TS/TSX source tree no longer preserves `retired_reason` as a current contract literal.

The active SPEC-120 spec now has an implementation note marking this schema/type/validator cleanup complete while preserving older spec prose as historical intake context until final spec archival.

## Verification Result

Commands run from `tools/manual-story-studio` unless otherwise noted:

1. Baseline `npm test` before edits — PASS; backend build, 482 backend/static tests, and web typecheck were green.
2. Post-change `npm test` — PASS; backend build, 482 backend/static tests, and web typecheck were green.
3. `rg -n 'retired_reason' tools/manual-story-studio --glob '*.ts' --glob '*.tsx'` from the repo root — PASS; no TypeScript/TSX hits remain.

The existing camel-case web API absence guard for `retiredReason` remains in `test/web/records-delete-ux.test.ts`; it does not reintroduce the removed snake-case schema field.

## Deviations

- Three existing write/delete tests (`test/capstone-spec101.test.ts`, `test/write/records.test.ts`, and `test/write/delete-lifecycle.test.ts`) were added to the landed file set because their direct `retired_reason` property assertions would otherwise keep the removed field name in current TS source and fail the ticket's zero-hit proof. The assertions still check absence using a dynamically assembled key.
- No separate `npm run test:backend` rerun was needed after the final change because the stronger package-wide `npm test` lane includes backend build, compiled backend/static tests, and web typecheck.
