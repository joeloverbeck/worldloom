# SPEC113MANSTOSTU-001: Working-set `excluded_records` field (data model + authoring UI)

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `tools/manual-story-studio` (current-context schema + validator + web types + EditCurrentContext form). No impact on the canon pipeline (package is canon-fenced per SPEC-100).
**Deps**: None

## Problem

The manual-story working set (current-context) has no way to explicitly exclude a record from the next composed prompt. `prompt_visibility` (`always | include_when_relevant | only_if_pinned`) covers conditional inclusion but not an explicit "drop this record now" lever. SPEC-113 §2 item 1 adds an optional `excluded_records: string[]` to the working set, authored via the existing `RecordPicker`. This ticket lands the data model + authoring UI; the compose-time enforcement and the inclusion ledger that reports the exclusion land in SPEC113MANSTOSTU-002.

## Assumption Reassessment (2026-06-02)

1. `CurrentContext` is defined at `tools/manual-story-studio/src/schema/current-context.ts` (backend) and `tools/manual-story-studio/web/src/types/manual-story.ts:101` (frontend); the two interfaces are maintained in parallel. `validateCurrentContext` (`src/validate/current-context.ts:15`) validates `pinned_records` via `checkAnyManualRecordList` (any manual record class) — `excluded_records` takes the same treatment. `readCurrentContext` (`src/read/current-context.ts`) returns `parsed as CurrentContext` (whole-object cast) and `writeCurrentContext` serializes the whole object — neither field-maps, so no per-field read/write/route change is needed once both interfaces carry the new field. `EditCurrentContext.tsx` already mounts `<RecordPicker classes={MANUAL_RECORD_CLASSES} mode="multi">` for `pinned_records` (line 385) — the excluded_records picker is symmetric.
2. SPEC-113 §2 item 1 + §4 specify the field as optional, edited via `RecordPicker`. §3 "must-not-reveal stays separate from `excluded_records`" governs the field's semantics (exclusion drops a record entirely); the compose-side enforcement of that semantics is SPEC113MANSTOSTU-002's scope, not this ticket's.
3. Cross-artifact boundary under audit: the `CurrentContext` contract spans backend schema (`src/schema/current-context.ts`), backend validator (`src/validate/current-context.ts`), the whole-object read/write round-trip, the server route (`src/server/routes/current-context.ts`, which passes the typed object through `validateCurrentContext` + `writeCurrentContext`), and the frontend type + form (`web/src/types/manual-story.ts`, `EditCurrentContext.tsx`). Both interface copies must gain `excluded_records` or the frontend form cannot bind it. (The web-type addition is the `(g)` schema-paired site not separately enumerated in SPEC-113 §4 — see Files to Touch.)
4. FOUNDATIONS §Tooling Recommendation (least-privilege packets): `excluded_records` lets the author *narrow* what reaches the external LLM, tightening the deterministic context packet — SPEC-113 §5's alignment for this field. Adding it as an *explicit + validated* selector (not an inferred heuristic) preserves the author-controlled, deterministic packet contract.

## Architecture Check

1. Additive optional field reusing the existing `checkAnyManualRecordList` validation path and the existing `RecordPicker` mount — no new validation mechanism, no new component. The whole-object read/write means the field flows through persistence with zero per-field plumbing.
2. No backwards-compatibility shim: the field is optional (`string[]`, default `[]`); existing `current-context.yaml` files without it parse unchanged.

## Verification Layers

1. Schema carries the field -> codebase grep-proof (`excluded_records` present in both `src/schema/current-context.ts` and `web/src/types/manual-story.ts`).
2. Validator accepts known refs / rejects unknown refs -> `test/current-context/current-context-validate.test.ts` assertions.
3. Authoring UI binds the field -> `cd tools/manual-story-studio/web && npm test` (tsc --noEmit) over `EditCurrentContext.tsx`.

## What to Change

### 1. Backend schema

Add `excluded_records: string[]` to the `CurrentContext` interface in `src/schema/current-context.ts` (optional in YAML; treated as `[]` when absent).

### 2. Backend validator

In `src/validate/current-context.ts`, add `checkAnyManualRecordList(errors, "excluded_records", ctx.excluded_records ?? [], knownIds)` mirroring the existing `pinned_records` call.

### 3. Frontend type + form

Add `excluded_records: string[]` to the web `CurrentContext` interface (`web/src/types/manual-story.ts`), add `excluded_records: []` to `EMPTY_CONTEXT` in `EditCurrentContext.tsx`, and mount a `<RecordPicker classes={MANUAL_RECORD_CLASSES} mode="multi" label="Excluded records">` bound to `ctx.excluded_records` (parallel to the pinned-records picker).

### 4. Validator test

Extend `test/current-context/current-context-validate.test.ts`: a known-ref `excluded_records` entry passes; an unknown ref produces `current-context-reference-broken`.

## Files to Touch

- `tools/manual-story-studio/src/schema/current-context.ts` (modify)
- `tools/manual-story-studio/src/validate/current-context.ts` (modify)
- `tools/manual-story-studio/web/src/types/manual-story.ts` (modify — add `excluded_records` to the web `CurrentContext` interface; the `(g)` schema-paired site not separately listed in SPEC-113 §4)
- `tools/manual-story-studio/web/src/pages/EditCurrentContext.tsx` (modify)
- `tools/manual-story-studio/test/current-context/current-context-validate.test.ts` (modify)

## Out of Scope

- Compose-time suppression of excluded records (SPEC113MANSTOSTU-002).
- The inclusion ledger and its `working_set_excluded` reason (002).
- Renaming `current-context.yaml` on disk (declined per §3).
- The "Prompt Working Set" UI relabel (005).

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/manual-story-studio && npm run test:backend` — current-context-validate suite green including the new `excluded_records` cases.
2. `cd tools/manual-story-studio/web && npm test` — tsc --noEmit clean with the new field on both `CurrentContext` interfaces and the picker mount.

### Invariants

1. `excluded_records` is optional and additive — a legacy `current-context.yaml` without it parses to a valid `CurrentContext`.
2. Both backend and frontend `CurrentContext` interfaces carry the field (parallel-maintained contract stays in sync).

## Test Plan

### New/Modified Tests

1. `tools/manual-story-studio/test/current-context/current-context-validate.test.ts` — known/unknown `excluded_records` ref validation.

### Commands

1. `cd tools/manual-story-studio && npm run test:backend`
2. `cd tools/manual-story-studio/web && npm test`
