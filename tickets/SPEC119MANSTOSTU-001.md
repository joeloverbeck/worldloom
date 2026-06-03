# SPEC119MANSTOSTU-001: Enrich resolution-ledger payload with real record identity

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `tools/manual-story-studio` prompt composer (`src/prompt/types.ts`, `src/prompt/compose.ts`) + web type mirror (`web/src/types/manual-story.ts`); read-only payload enrichment, no composition-logic change. No impact on the external prompt (markdown is unchanged).
**Deps**: None

## Problem

The Prompt Inspector's resolution-ledger entries (`PromptIncludedRecord` / `PromptExcludedRecord` / `PromptSuppressedRecord`) carry only `{id, title, class, reason, section}`. The frontend's `ledgerSummary()` therefore fabricates a `ManualRecordSummary` whose `summary` is `"Reason: <label>"` and whose `importance` / `prompt_visibility` / `involved_cast` / `tags` are hardcoded placeholders. The author sees the inclusion *reason* in place of the record's real proposition/state. The data already exists on every record (`RecordCommonFields` carries `summary` / `importance` / `prompt_visibility` / `tags` / `refs.characters`), and the composer already holds the full record (`rec.value`) for every ledger entry — so the fix is to carry the real identity into each ledger entry at compose time (SPEC-119 §2 item 1 data side + §4 compose.ts bullet). This ticket is the data foundation that SPEC119MANSTOSTU-002 (rendering) and -003 (why-missing lookup) consume.

## Assumption Reassessment (2026-06-03)

1. Ledger entries are produced in `src/prompt/compose.ts` (`resolution.included.push({...})` at `:178-184`, `:243-249`; `.excluded.push` at `:217-222`, `:226-231`; `describeExistingRecord` at `:457-472`; `.suppressed.push` at `:237-241`) and typed in `src/prompt/types.ts:97-116` (`PromptIncludedRecord`/`PromptExcludedRecord`/`PromptSuppressedRecord`). Every push site has `rec.value` (a full `ManualRecord`) in scope, so the enrichment source is already loaded — no new disk read. `RecordCommonFields` (`web/src/types/manual-story.ts:174-186`) confirms `summary`, `importance`, `prompt_visibility`, `tags`, `refs` are present on every record.
2. SPEC-119 §2 item 1 and §4 compose.ts bullet prescribe "ensure each resolution ledger entry carries (or is resolvable to) the record's real summary/class/cast/prompt-mode for the inspector (read-only enrichment; no logic change)." §8 Risks (Determinism) requires the enrichment touch `resolution` only, never `markdown`.
3. **Cross-artifact boundary under audit**: the prompt-composer types are mirrored by hand from `src/prompt/types.ts` into `web/src/types/manual-story.ts` (the web bundle cannot import the Node16 backend tree; the mirror's header comment at `web/src/types/manual-story.ts:1-10` documents the manual-sync contract). Both surfaces must gain the identical enriched fields, or the frontend (SPEC119MANSTOSTU-002) fails to typecheck against the real payload.
4. **FOUNDATIONS principle**: the composer commits to SPEC-102 byte-identical output (`compose.ts:1-7`). This enrichment must preserve that determinism — adding fields to `resolution` ledger entries must not change the assembled `markdown` (the `assembleSections` input is unaffected). This is the determinism discipline named in FOUNDATIONS §Machine-Facing Layer (§4.3 CLAUDE.md-invariants) and mirrored at the tooling boundary by SPEC-119 §5.

## Architecture Check

1. Enriching at compose time (where the full record is already in hand) is cleaner than the alternative of a per-record client fetch from the inspector: it keeps the explanation deterministic, adds zero new I/O, and lets the existing route pass the enriched `resolution` through unchanged (`src/server/routes/prompts.ts` returns `PromptComposeResult` wholesale; `web/src/api/prompts.ts` deserializes it).
2. No backwards-compatibility shim: the added fields are required on the enriched interfaces and populated at every push site in the same change; no optional-with-fallback aliasing is introduced.

## Verification Layers

1. Ledger entries carry real identity (not a reason label) -> `node --test` assertion in `test/prompt/inspector-payload.test.ts` (compose a fixture story, assert `resolution.included[i].summary` equals the record's real `summary`, not `"Reason: …"`, and `involved_cast` reflects `refs.characters`).
2. Determinism preserved -> assertion that the assembled `markdown` is byte-identical before/after enrichment for a fixed fixture (the enrichment changes `resolution` only).
3. Backend↔web type-mirror parity -> codebase grep-proof: the enriched field set in `src/prompt/types.ts` matches `web/src/types/manual-story.ts` (same field names on `PromptIncludedRecord`/`PromptExcludedRecord`/`PromptSuppressedRecord`).

## What to Change

### 1. Extend the ledger-entry interfaces (`src/prompt/types.ts`)

Add the real-identity fields to `PromptIncludedRecord`, `PromptExcludedRecord`, and `PromptSuppressedRecord`: `summary: string`, `importance: RecordImportance`, `prompt_visibility: PromptVisibility`, `involved_cast: string[]`, `tags: string[]`. (`PromptIncludedRecord` already has `section`; do not add `section` to the excluded/suppressed interfaces — SPEC-119 §2.1 notes those classes have no `section`, and the renderer shows section only where present.) Import `RecordImportance` / `PromptVisibility` from the schema module as needed.

### 2. Populate the fields at every push site (`src/prompt/compose.ts`)

At each `resolution.included.push` / `.excluded.push` / `.suppressed.push` and inside `describeExistingRecord`, populate the new fields from `rec.value`: `summary: rec.value.summary`, `importance: rec.value.importance`, `prompt_visibility: rec.value.prompt_visibility`, `tags: rec.value.tags`, and `involved_cast` from `rec.value.refs.characters`. Note `involvedCastFromRefs` (`src/read/records.ts:427`) is **not currently exported** — either export it and reuse, or read `rec.value.refs.characters` directly (the helper's underlying source). Do not alter any control flow, ordering, or the `assembleSections` input — `markdown` must be unchanged.

### 3. Mirror the enriched interfaces in the web bundle (`web/src/types/manual-story.ts`)

Add the identical fields to the mirrored `PromptIncludedRecord` / `PromptExcludedRecord` / `PromptSuppressedRecord` (`:327-346`) so the frontend compiles against the real payload. `RecordImportance` (`:161`) and `PromptVisibility` (`:162-166`) already exist in this file.

### 4. Backend payload test (`test/prompt/inspector-payload.test.ts`, new)

Compose a fixture manual story and assert: (a) each `resolution.included` / `excluded` / `suppressed` entry exposes the record's real `summary` (not `"Reason: …"`), `class`, `involved_cast` (from refs), and `prompt_visibility`; (b) the assembled `markdown` is byte-identical to a pre-enrichment baseline for the same fixture (determinism).

## Files to Touch

- `tools/manual-story-studio/src/prompt/types.ts` (modify)
- `tools/manual-story-studio/src/prompt/compose.ts` (modify)
- `tools/manual-story-studio/web/src/types/manual-story.ts` (modify)
- `tools/manual-story-studio/test/prompt/inspector-payload.test.ts` (new)

## Out of Scope

- Any change to the deterministic resolution/inclusion logic in `compose.ts` beyond carrying identity onto existing ledger entries. No new inclusion rules (SPEC-119 §Out of scope).
- Frontend rendering of the enriched fields — that is SPEC119MANSTOSTU-002.
- The "why is this missing?" lookup — SPEC119MANSTOSTU-003.
- Any change to the external prompt markdown or to backend prompt-leakage handling (already correct).

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/manual-story-studio && npm run test:backend` — `inspector-payload.test.ts` asserts real identity per ledger entry + byte-identical markdown.
2. `cd tools/manual-story-studio && npm --prefix web test` — web bundle typechecks against the mirrored enriched interfaces.
3. `cd tools/manual-story-studio && npm test` — full suite green (existing `inclusion-ledger.test.ts`, `never-prompt.test.ts`, `write/prompts.test.ts` still pass).

### Invariants

1. Enrichment is read-only: the assembled `markdown` for any fixed input is byte-identical before and after this ticket (SPEC-102 determinism).
2. `src/prompt/types.ts` and `web/src/types/manual-story.ts` declare the identical enriched field set on the three ledger interfaces (manual-mirror parity).

## Test Plan

### New/Modified Tests

1. `tools/manual-story-studio/test/prompt/inspector-payload.test.ts` (new) — asserts per-entry real identity and markdown determinism.

### Commands

1. `cd tools/manual-story-studio && npm run test:backend`
2. `cd tools/manual-story-studio && npm test`
3. `cd tools/manual-story-studio && npm --prefix web test` (web typecheck — confirms the mirror parity compiles)
