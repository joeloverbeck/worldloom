# STOEXPFIX-010: Audit story-explorer SUMMARY_RULES + FIELD_ALIASES against canonical story-bundle schemas

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: None — tooling-only audit + fix in `tools/story-explorer/`; no canon, skill, hook, or schema mutation.
**Deps**: `archive/tickets/STOEXPFIX-001.md` (the SF/STEMO fix that established the alignment pattern and the regression-test shape this ticket extends).

## Problem

At intake, `archive/tickets/STOEXPFIX-001.md` had already fixed `SF.claim` -> `statement` and `STEMO.emotion`/`target` -> `affect_kind`/`orientation.toward_records`, but the same read-side drift pattern remained in additional story-explorer record-card surfaces:

- `CLK` still used non-canonical `current_tick`, `max_tick`, and `stakes`.
- `SLT` still used non-canonical `author_scope` and `eligibility`, and the renderer did not resolve canonical `grounding.compatible_turn_drivers`.
- `STSEC` still used non-canonical `reveal_conditions`.
- `CHC` read the wrapper object `grounded_in`, which did not stringify, instead of canonical `grounded_in.records`.

The package tests passed at baseline because representative fixtures did not assert that every configured rule path resolves on a canonical-shaped body.

## Assumption Reassessment (2026-05-27)

1. `tools/story-explorer/src/read/record-card.ts` is the read-side projection layer for story-bundle record cards. `buildRecordCard` resolves dotted paths with `nestedValue` and only emits fields whose value can be stringified, so wrapper objects such as `scope`, `preconditions`, and `grounded_in` are not useful summary fields unless they expose scalar/list subpaths.
2. `tools/story-explorer/web/src/components/xray/RecordCardRenderers.tsx` `FIELD_ALIASES` is the renderer-side lookup layer and already supports dotted paths. Extending aliases to canonical dotted names is additive and preserves the older flat fixture names.
3. Cross-artifact boundary under audit: canonical story-bundle YAML field names as consumed by story-explorer record cards. The ticket remains read-side only; no `_source/` records, schemas, validators, or skills were mutated.
4. FOUNDATIONS principle under audit: §Canonical Storage Layer and deterministic read tooling. The `_source/` record shape is authority; story-explorer must adapt its read model to that shape.
5. Baseline before this run: `cd tools/story-explorer && npm test` passed with the already-present STOEXPFIX-001 working-tree changes (backend 90 tests, web 185 tests). Those SF/STEMO hunks are pre-existing same-seam work, not newly authored by this run.
6. Draft mismatch corrected: the drafted SLT fix named wrapper fields `scope` and `preconditions`, but those objects do not stringify under the live `buildRecordCard` contract. The landed rule uses canonical dotted paths: `scope.visibility`, `scope.branch_id`, `preconditions.hard`, `preconditions.soft`, `saliency.urgency`, and `grounding.compatible_turn_drivers`.
7. Draft mismatch corrected: the drafted CLK fix included `thresholds`, but live threshold entries are object arrays and do not stringify into a useful compact field. The landed rule uses canonical scalar/list fields that do render: `clock_kind`, `value`, `max`, `driver`, and `resolution_event`.
8. Public/package surface check: `tools/story-explorer/README.md` documents package usage and read-only behavior, not record-card field mappings; no README update was needed.
9. Adjacent architectural option: no generated-vocabulary layer was introduced. The audit found the named drift cluster plus the CHC dotted-path repair; the strengthened tests now enforce the rule/fixture mapping without adding a schema-generation abstraction.

## Architecture Check

1. The fix keeps the read model explicit and minimal: `SUMMARY_RULES` now points at canonical scalar/list paths that `buildRecordCard` can actually render, and `FIELD_ALIASES` accepts canonical dotted names where the UI needs semantic lookup.
2. No backwards-compatibility shims were introduced. Existing renderer aliases remain accepted, but no legacy fields are written, generated, or added to canonical records.

## Verification Layers

1. Every configured `SUMMARY_RULES` path resolves on a representative body -> package test: `recordCardClassRules()` exposes test-visible rule metadata, and `record-card.test.ts` asserts each primary, secondary, status, visibility, confidence, urgency, and participant rule path resolves for every class.
2. `FIELD_ALIASES` covers canonical renderer paths -> web test: `RecordCardRenderers.test.tsx` uses canonical `grounded_in.records`, `value`, `max`, and `grounding.compatible_turn_drivers` in compact-line fixtures.
3. Removed drift names no longer appear in current read rules -> grep proof over `record-card.ts`; preserved renderer aliases are separately accepted as backwards-compatible input names.
4. Live record API returns canonical record-card fields -> API smoke against the local Story Explorer server for `CLK-1`, `SLT-1`, `STSEC-1`, and `CHC-1`.

## Landed Changes

### 1. `tools/story-explorer/src/read/record-card.ts`

- Corrected `CHC.secondaryFields` from `grounded_in` to `grounded_in.records`.
- Corrected `CLK.secondaryFields` from `current_tick` / `max_tick` / `stakes` to canonical renderable fields `value`, `max`, `driver`, and `resolution_event` plus `clock_kind`.
- Corrected `SLT.secondaryFields` and `visibilityField` to canonical dotted paths under `scope`, `preconditions`, `saliency`, and `grounding`.
- Corrected `STSEC.secondaryFields` from `reveal_conditions` to `reveal_event` and `reveal_records`.
- Added `recordCardClassRules()` as package-internal test-visible metadata so fixture coverage can assert the actual configured rule paths.

### 2. `tools/story-explorer/web/src/components/xray/RecordCardRenderers.tsx`

- Extended aliases for `currentValue`, `threshold`, `compatibleTurnDrivers`, and `groundedIn` to canonical paths while preserving older accepted names.
- The existing STOEXPFIX-001 alias extensions for `appraisal` and `orientation` were already present before this run.

### 3. Tests

- Expanded every `REPRESENTATIVE_RECORDS` fixture in `tools/story-explorer/test/record-card.test.ts` so it exercises all configured fields for that class.
- Added regression assertions for canonical `CLK`, `SLT`, `STSEC`, and `CHC` paths.
- Updated `tools/story-explorer/web/src/components/xray/__tests__/RecordCardRenderers.test.tsx` to prove compact rendering from canonical `grounded_in.records`, `value`, `max`, and `grounding.compatible_turn_drivers`.

## Files to Touch

- `tools/story-explorer/src/read/record-card.ts` (modify)
- `tools/story-explorer/test/record-card.test.ts` (modify)
- `tools/story-explorer/web/src/components/xray/RecordCardRenderers.tsx` (modify)
- `tools/story-explorer/web/src/components/xray/__tests__/RecordCardRenderers.test.tsx` (modify)
- `archive/tickets/STOEXPFIX-010.md` (modify)

## Out of Scope

- Generated-vocabulary layer binding `SUMMARY_RULES` to a canonical-schema source of truth.
- Changes to canonical record schemas, skill prescriptions, validators, patch engine, or `_source/` records.
- Row-by-row rewriting of historical/archive ticket evidence that intentionally preserves the old field names as intake context.

## Acceptance Criteria

### Tests That Passed

1. `cd tools/story-explorer && npm run test:backend`
2. `cd tools/story-explorer && npm --prefix web test`
3. `cd tools/story-explorer && npm test`
4. `rg -n '"current_tick"|"max_tick"|"stakes"|"author_scope"|"eligibility"|"reveal_conditions"' tools/story-explorer/src/read/record-card.ts`

### Invariants

1. **Schema alignment**: every configured record-card rule path resolves on a representative canonical-shaped body.
2. **Alias coverage**: compact-line aliases accept canonical dotted or renamed paths for the fixed classes.
3. **Read-only discipline**: no `_source/` file was mutated; all changes are package/test/ticket surfaces.

## Test Plan

### New/Modified Tests

1. `tools/story-explorer/test/record-card.test.ts` — expanded fixture coverage and rule-path assertions for every record class; added focused canonical drift regression for `CLK`, `SLT`, `STSEC`, and `CHC`.
2. `tools/story-explorer/web/src/components/xray/__tests__/RecordCardRenderers.test.tsx` — compact-line fixtures now exercise canonical paths for the fixed renderer aliases.

### Commands

1. `cd tools/story-explorer && npm run test:backend`
2. `cd tools/story-explorer && npm --prefix web test`
3. `cd tools/story-explorer && npm test`
4. API smoke with `node dist/src/cli.js --port 5174 --repo-root /home/joeloverbeck/projects/worldloom`, then `curl -s` for `/api/worlds/erotica-world/stories/red-bunny/records/{CLK-1,SLT-1,STSEC-1,CHC-1}`.

## Outcome

Completion date: 2026-05-27.

Completed. Story Explorer now surfaces canonical record-card fields for the known `CLK`, `SLT`, `STSEC`, and `CHC` drift sites, preserves older renderer aliases additively, and has per-class fixture coverage that fails when configured rule paths do not resolve on representative record bodies.

## Verification Result

1. Baseline before STOEXPFIX-010 edits: `cd tools/story-explorer && npm test` passed (backend 90 tests, web 185 tests) with existing React Router warnings and the expected ErrorBoundary test throw in web output.
2. After source/test edits: `cd tools/story-explorer && npm run test:backend` passed (15 compiled backend test files).
3. After renderer test edits: `cd tools/story-explorer && npm --prefix web test` passed (76 files, 185 tests); output included existing React Router warnings and the expected ErrorBoundary test throw.
4. Stale-field grep over `tools/story-explorer/src/read/record-card.ts` found no stale summary-rule hits. A broader discovery grep still finds intentionally preserved renderer aliases (`current_tick`, `max_tick`, `author_scope.visibility`) and negative assertions in `record-card.test.ts`.
5. API smoke: sandbox-local server bind failed with `listen EPERM`, then the same server command was rerun with approval and listened on `http://127.0.0.1:5174`. Escalated `curl -s` calls showed:
   - `CLK-1.recordCard.secondaryFields` includes `value` and `max`.
   - `SLT-1.recordCard.secondaryFields` includes `scope.visibility`, `saliency.urgency`, and `grounding.compatible_turn_drivers`.
   - `CHC-1.recordCard.secondaryFields` includes `grounded_in.records`.
   - `STSEC-1` uses canonical `secret_kind` and `holders`; the live record has `reveal_event: null` and empty `reveal_records`, so those optional fields correctly do not render in that live response. Synthetic regression coverage proves non-empty reveal fields render.
6. Final full package proof after closeout edits: `cd tools/story-explorer && npm test` passed (backend 92 tests, web 185 tests); output included existing React Router warnings and the expected ErrorBoundary test throw.

## Deviations

- The drafted SLT `scope` / `preconditions` wrapper-field plan was corrected to dotted scalar/list paths because wrapper objects do not stringify in the live view-model.
- The drafted CLK `thresholds` plan was corrected to renderable canonical fields `value`, `max`, `driver`, and `resolution_event`; object-array threshold entries remain raw-record detail rather than compact secondary fields.
- The drafted `/api/page/PG-6` smoke shape was replaced with the live record route `/api/worlds/:slug/stories/:storySlug/records/:recordId`.
- `STSEC-1` in red-bunny has no non-empty reveal state, so live API smoke cannot demonstrate rendered reveal fields for that specific record; `record-card.test.ts` covers the non-empty canonical reveal shape.
