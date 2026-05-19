# SPEC49STPSTEINT-001: Add STPLAN/STEMO to PG.state_snapshot.active_records (JSON schema + shared contract)

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `tools/validators/src/schemas/story-page.schema.json` (modify), `tools/validators/tests/structural/record-schema-compliance-story-page.test.ts` (modify), `.claude/skills/_shared-templates/story-record-schemas.md` (modify)
**Deps**: None

## Problem

At intake, `ACTIVE_RECORDS_CLASSES` (runtime, at `tools/validators/src/_helpers/state-snapshot-replay.ts`) included STPLAN and STEMO, but the JSON page schema (`tools/validators/src/schemas/story-page.schema.json`) and the shared contract markdown (`.claude/skills/_shared-templates/story-record-schemas.md` active-records key list) both stopped at STQ. This was a runtime-ahead-of-schema drift introduced by SPEC-47's STPLAN/STEMO integration: replay helper recognized the classes but page-schema validation did not allow them as keys under `PG.state_snapshot.active_records`. Pages that legitimately referenced active STPLAN/STEMO records failed schema validation despite being correct per the SPEC-47 contract. Closing this drift is the foundation for SPEC-49's broader hardening — the schema must allow the classes before A.3's inactive-record lifecycle check (ticket 003) can validate their lifecycle.

## Assumption Reassessment (2026-05-19)

1. At intake, `tools/validators/src/_helpers/state-snapshot-replay.ts` defined `ACTIVE_RECORDS_CLASSES` with 17 entries ending at `STPLAN` and `STEMO`; that runtime surface was already aligned.
2. At intake, `tools/validators/src/schemas/story-page.schema.json` listed 15 active-record class properties (STENT, STINT, SF, BEL, OBL, CNSQ, THR, SREL, STLOC, STOBJ, DA, STSTAT, CLK, STSEC, STQ) and omitted STPLAN/STEMO. `.claude/skills/_shared-templates/story-record-schemas.md` mirrored the same 15-class list per SPEC-49 reassessment evidence. This ticket corrected both surfaces.
3. Cross-skill boundary under audit: the PG.state_snapshot.active_records key schema is consumed by `branching-story-bootstrap` Phase 4 (snapshot construction), `branching-story-turn-cycle` Phase 5 (snapshot replay), and the structural validators `snapshot-replay-equality` + `active-records-full-shape` + `state-snapshot-integrity` at engine pre-apply time. Adding STPLAN/STEMO keys is purely additive — no existing consumer of the schema breaks because the existing 15 classes remain unchanged.
4. FOUNDATIONS §Story Bundles §5 Rule 1 No Floating Facts: the schema-drift gap is a Rule 1 enforcement failure (the runtime allows STPLAN/STEMO in active_records, but the contract that codifies what `PG` records may legitimately carry doesn't). Closing the drift makes the schema's enforcement match the spec's intent. SPEC-49 §FOUNDATIONS Alignment confirms this is the spec's primary Rule 1 alignment.
5. Schema extension is additive-only: new optional keys `STPLAN: [STPLAN-*]` and `STEMO: [STEMO-*]` added to the `state_snapshot.active_records` property object. No existing class entry is renamed or removed. Consumers that already iterate `ACTIVE_RECORDS_CLASSES` (the structural validators above) automatically pick up the new keys without modification because the source-of-truth constant already includes STPLAN/STEMO.
6. Implementation proof did not need the drafted standalone JSON fixture. The strongest focused schema proof is the existing AJV-backed `record_schema_compliance` story-page structural test, extended with positive STPLAN/STEMO active-record entries and an invalid STPLAN rejection case. Existing `active-records-full-shape` and `snapshot-replay-equality` tests already covered runtime alignment and replay behavior for STPLAN/STEMO and were rerun unchanged.

## Architecture Check

1. Schema change matches the runtime constant `ACTIVE_RECORDS_CLASSES` exactly — single source of truth alignment is the cleaner posture than maintaining the schema as a separately-curated subset. Alternative approaches (e.g., keeping the schema as the authoritative source and downgrading the runtime constant) would force a code rewrite of every validator that iterates the constant; the additive schema fix is minimal-blast-radius.
2. No backwards-compatibility aliasing introduced. Migration posture for legacy pages that omit STPLAN/STEMO active_records keys (per SPEC-49 D-CX.1 distributed contract): compatibility-mode WARN, not FAIL, for one revision cycle. Current-contract pages (created or recommitted after SPEC-49 lands) FAIL closed when an active STPLAN/STEMO record on the branch is not listed in `PG.state_snapshot.active_records.STPLAN[]` / `STEMO[]`.

## Verification Layers

1. JSON schema validation: `story-page.schema.json` must accept a PG record with `state_snapshot.active_records.STPLAN: ["STPLAN-1"]` and `state_snapshot.active_records.STEMO: ["STEMO-1"]`. Validator surface: AJV pre-apply gate.
2. Shared-contract conformance: `.claude/skills/_shared-templates/story-record-schemas.md` active-records list must enumerate STPLAN + STEMO with the same one-line description format used for the existing 15 classes. Validator surface: schema-completeness grep at health-audit time.
3. Runtime constant alignment: `tools/validators/src/_helpers/state-snapshot-replay.ts` `ACTIVE_RECORDS_CLASSES` includes both classes. Validator surface: codebase grep-proof (no change required; already aligned).

## Landed Changes

### 1. Extended `tools/validators/src/schemas/story-page.schema.json` active_records property list

Added two new key properties to the `state_snapshot.active_records` property object:

```json
"STPLAN": {
  "type": "array",
  "items": { "type": "string", "pattern": "^STPLAN-[0-9]+$" }
},
"STEMO": {
  "type": "array",
  "items": { "type": "string", "pattern": "^STEMO-[0-9]+$" }
}
```

The new entries follow the surrounding active-record class ordering after `STQ`.

### 2. Extended `.claude/skills/_shared-templates/story-record-schemas.md` active-records key list

Added two new lines to the `state_snapshot.active_records` enumeration, paralleling the existing entries:

```markdown
STPLAN: [STPLAN-<integer>]*           # active tactical plans on the branch at this page
STEMO: [STEMO-<integer>]*             # active causal affective states on the branch at this page
```

The format and indentation match the existing active-record list.

### 3. Extended AJV-backed PG schema tests

Added focused `record_schema_compliance` coverage for:

1. a valid PG record with `active_records.STPLAN` and `active_records.STEMO`;
2. an invalid PG record with `active_records.STPLAN: ["INVALID-1"]`.

## Files to Touch

- `tools/validators/src/schemas/story-page.schema.json` (modify)
- `tools/validators/tests/structural/record-schema-compliance-story-page.test.ts` (modify)
- `.claude/skills/_shared-templates/story-record-schemas.md` (modify)

## Out of Scope

- Modifying the runtime `ACTIVE_RECORDS_CLASSES` constant (already aligned; would be a no-op).
- Adding new active-record classes beyond STPLAN/STEMO. Other ID classes that might want active_records support (e.g., hypothetical future story-bundle classes) are outside SPEC-49's scope.
- Adding `if/then` conditional requirements on STPLAN/STEMO keys (ticket 003 handles inactive-record lifecycle; ticket 005 handles STPLAN's own status-conditioned `current_step` / `belief_basis` requirements).
- Modifying any validator code beyond schema + contract markdown. Ticket 003 handles the validator-side extension.

## Acceptance Criteria

### Tests That Must Pass

1. A PG fixture with `state_snapshot.active_records: { ..., STPLAN: ["STPLAN-1"], STEMO: ["STEMO-1"] }` validates without schema error against `story-page.schema.json`.
2. A PG fixture with `state_snapshot.active_records: { ..., STPLAN: ["INVALID-1"] }` fails schema validation with the regex-mismatch error on the `STPLAN-[0-9]+` pattern.
3. The structural validators `snapshot-replay-equality` and `active-records-full-shape` continue to pass on existing test fixtures (no behavior change for the 15 pre-existing classes).

### Invariants

1. JSON schema enforces the same set of active-record classes as the runtime `ACTIVE_RECORDS_CLASSES` constant — no drift between the two surfaces.
2. The `state_snapshot.active_records` schema is purely additive across revisions: classes may be added (current change) but existing classes are never removed or renamed without a separate retcon-flagged spec.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/record-schema-compliance-story-page.test.ts` — modified to add PASS coverage for legitimate STPLAN/STEMO refs and FAIL coverage for invalid STPLAN IDs.
2. `tools/validators/tests/structural/active-records-full-shape.test.ts` — existing tests already assert full-shape STPLAN/STEMO key coverage through `ACTIVE_RECORDS_CLASSES`; rerun unchanged.
3. `tools/validators/tests/structural/snapshot-replay-equality.test.ts` — existing tests already assert STPLAN/STEMO active-record replay behavior; rerun unchanged.

### Commands

1. From `tools/validators`: `npm run build`
2. From `tools/validators`: `node --test dist/tests/structural/record-schema-compliance-story-page.test.js dist/tests/structural/active-records-full-shape.test.js dist/tests/structural/snapshot-replay-equality.test.js`
3. From `tools/validators`: `npm test`
4. Schema-only check via AJV CLI is not in scope — the test suite's AJV-driven validation is the verification boundary.

## Outcome

Completed: 2026-05-19

The PG JSON schema now accepts `STPLAN` and `STEMO` arrays under `state_snapshot.active_records`, with per-class ID regexes matching the runtime class prefixes. The shared story-record schema contract now lists the same active-record keys with one-line descriptions. The AJV-backed story-page schema compliance test now proves both valid STPLAN/STEMO entries and invalid STPLAN ID rejection.

This keeps the schema and shared contract aligned with the already-live runtime `ACTIVE_RECORDS_CLASSES` constant and leaves ticket 003 as the owner for lifecycle validation on those newly schema-allowed keys.

## Verification Result

1. `npm run build` from `tools/validators` — PASS.
2. `node --test dist/tests/structural/record-schema-compliance-story-page.test.js dist/tests/structural/active-records-full-shape.test.js dist/tests/structural/snapshot-replay-equality.test.js` from `tools/validators` — PASS, 45/45 tests.
3. `npm test` from `tools/validators` — PASS, 628/628 tests.
4. Manual shared-contract review confirmed `.claude/skills/_shared-templates/story-record-schemas.md` now lists `STPLAN` and `STEMO` in the `state_snapshot.active_records` block.

## Deviations

1. No standalone `tools/validators/tests/fixtures/story-page-with-stplan-stemo-active-records.json` fixture was added. The package's existing schema-compliance test pattern uses inline PG payloads, so the accepted proof was added to `record-schema-compliance-story-page.test.ts`.
2. `active-records-full-shape.test.ts` and `snapshot-replay-equality.test.ts` were not modified because their existing `ACTIVE_RECORDS_CLASSES`-driven tests already covered STPLAN/STEMO full-shape and replay behavior. They were rerun as part of the focused proof.
