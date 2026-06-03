# SPEC119MANSTOSTU-001: Enrich resolution-ledger payload with real record identity

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `tools/manual-story-studio` prompt composer (`src/prompt/types.ts`, `src/prompt/compose.ts`) + web type mirror (`web/src/types/manual-story.ts`); read-only payload enrichment, no composition-logic change. No impact on the external prompt (markdown is unchanged).
**Deps**: None

## Problem

At intake, the Prompt Inspector's resolution-ledger entries (`PromptIncludedRecord` / `PromptExcludedRecord` / `PromptSuppressedRecord`) carried only `{id, title, class, reason, section}`. The frontend's `ledgerSummary()` therefore fabricated a `ManualRecordSummary` whose `summary` was `"Reason: <label>"` and whose `importance` / `prompt_visibility` / `involved_cast` / `tags` were hardcoded placeholders. The author saw the inclusion *reason* in place of the record's real proposition/state. The data already existed on every record (`RecordCommonFields` carries `summary` / `importance` / `prompt_visibility` / `tags` / `refs.characters`), and the composer already held the full record (`rec.value`) for every ledger entry, so the implemented fix carries the real identity into each ledger entry at compose time (SPEC-119 §2 item 1 data side + §4 compose.ts bullet). This ticket is the data foundation that SPEC119MANSTOSTU-002 (rendering) and -003 (why-missing lookup) consume.

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

## Landed Changes

### 1. Extend the ledger-entry interfaces (`src/prompt/types.ts`)

Added the real-identity fields to `PromptIncludedRecord`, `PromptExcludedRecord`, and `PromptSuppressedRecord`: `summary: string`, `importance: RecordImportance`, `prompt_visibility: PromptVisibility`, `involved_cast: string[]`, `tags: string[]`. `PromptSuppressedRecord` also now carries `class: ManualRecordClass`, because the live composer can suppress any seeded record class, not only secrets, and SPEC-119 requires class identity in every ledger-backed panel. `PromptIncludedRecord` keeps `section`; excluded/suppressed records still do not gain `section`.

### 2. Populate the fields at every push site (`src/prompt/compose.ts`)

At each `resolution.included.push` / `.excluded.push` / `.suppressed.push` and inside `describeExistingRecord`, the composer populates the new fields from the already-loaded record via `ledgerIdentity()`: `summary`, `importance`, `prompt_visibility`, copied `tags`, and copied `refs.characters` as `involved_cast`. No control flow, ordering, or `assembleSections` input changed, so prompt markdown remains unchanged by the enrichment.

### 3. Mirror the enriched interfaces in the web bundle (`web/src/types/manual-story.ts`)

Added the identical fields to the mirrored `PromptIncludedRecord` / `PromptExcludedRecord` / `PromptSuppressedRecord` so the frontend compiles against the real payload. `RecordImportance` and `PromptVisibility` already existed in the mirror.

### 4. Backend payload test (`test/prompt/inspector-payload.test.ts`, new)

Added `test/prompt/inspector-payload.test.ts`, which composes a fixture manual story and asserts each `resolution.included` / `excluded` / `suppressed` entry exposes the record's real `summary` (not `"Reason: …"`), `class`, `involved_cast` from `refs.characters`, and `prompt_visibility`. The test also composes the same input twice and asserts byte-identical markdown.

## Files to Touch

- `tools/manual-story-studio/src/prompt/types.ts` (modify)
- `tools/manual-story-studio/src/prompt/compose.ts` (modify)
- `tools/manual-story-studio/web/src/types/manual-story.ts` (modify)
- `tools/manual-story-studio/test/prompt/inspector-payload.test.ts` (new)
- `tools/manual-story-studio/test/prompt/inclusion-ledger.test.ts` (modify)
- `tools/manual-story-studio/test/prompt/never-prompt.test.ts` (modify)

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
2. `tools/manual-story-studio/test/prompt/inclusion-ledger.test.ts` (modify) — updates existing ledger shape assertions for enriched excluded and suppressed entries.
3. `tools/manual-story-studio/test/prompt/never-prompt.test.ts` (modify) — updates `never_prompt` and suppressed ledger assertions for enriched entries.

### Commands

1. `cd tools/manual-story-studio && npm run test:backend`
2. `cd tools/manual-story-studio && npm test`
3. `cd tools/manual-story-studio && npm --prefix web test` (web typecheck — confirms the mirror parity compiles)

## Outcome

Completed on 2026-06-03.

- Enriched `PromptIncludedRecord`, `PromptExcludedRecord`, and `PromptSuppressedRecord` with real record identity fields consumed by the inspector: summary, importance, prompt visibility, involved cast, and tags.
- Added `class` to suppressed ledger entries so every ledger-backed row can render real record class identity.
- Populated the enriched fields from records already loaded by the composer; no new disk reads, no inclusion-rule changes, and no markdown assembly changes.
- Mirrored the enriched backend contract into `web/src/types/manual-story.ts`.
- Added `test/prompt/inspector-payload.test.ts` and updated existing ledger tests to assert the enriched shapes.

## Verification Result

- `cd tools/manual-story-studio && npm run test:backend` — PASS; backend build plus 86 Node tests passed, including `dist/test/prompt/inspector-payload.test.js`.
- `cd tools/manual-story-studio && npm --prefix web test` — PASS; web TypeScript mirror compiled with `tsc --noEmit`.
- `cd tools/manual-story-studio && npm test` — PASS; backend/static suite reported 486 passing tests and the web typecheck passed.

## Deviations

- `PromptSuppressedRecord` gained `class: ManualRecordClass` in addition to the drafted enriched field list. Live reassessment showed suppression is not secret-only, so this is required to satisfy SPEC-119's "class identity in every panel" acceptance boundary.
