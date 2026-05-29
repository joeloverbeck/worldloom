# PGMAP-002: Audit whether PG active-record full-map warnings are load-bearing

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — `tools/validators/src/structural/compatibility-drift.ts` rationale comment only; validator behavior, schema behavior, PG-authoring guidance, and tests remain unchanged.
**Deps**: `archive/tickets/PGMAP-001.md`

## Problem

At intake, PGMAP-001 had aligned PG-authoring prose to the live structural-validator current contract: new/current-contract `PG.state_snapshot.active_records` maps materialize every `ACTIVE_RECORDS_CLASSES` key and use `[]` for inactive classes. During that closeout, reassessment preserved a real unresolved question instead of changing validator behavior: `compatibility_drift` warns for missing optional active-record keys on new/current-contract pages, while replay/compatibility paths normalize legacy missing optional keys to `[]`.

That created a FOUNDATIONS §Story Bundles §5b question. If every consumer can derive absent optional keys as empty arrays, the stored empty arrays may be forward-shape hygiene rather than load-bearing data. If any consumer branches on key presence or needs the materialized map for deterministic replay, schema discovery, context-packet assembly, or authoring safety, the full-map warning remains justified. This ticket audited that boundary and preserved the full-map warning because it is load-bearing as validation/audit discipline for current pages, not because optional empty arrays carry distinct replay state.

## Assumption Reassessment (2026-05-29)

1. **Codebase check.** `tools/validators/src/_helpers/state-snapshot-replay.ts` defines `ACTIVE_RECORDS_CLASSES` as the full 18-key active-record vocabulary and `OPTIONAL_ACTIVE_RECORDS_CLASSES` as `DA`, `CLK`, `STSEC`, `STQ`, `STPLAN`, and `STEMO`. It also replays active records by seeding every active class and treating missing parent lists as `[]`.
2. **Validator check.** `tools/validators/src/structural/compatibility-drift.ts` reports `compat_requires_migration_patch` WARNs for missing optional active-record keys on in-plan/current-contract-parented pages, but its legacy branch says replay validators normalize missing keys to `[]`. `tools/validators/src/structural/active-records-full-shape.ts` separately warns/fails in full-world mode for every missing `ACTIVE_RECORDS_CLASSES` key.
3. **Shared boundary under audit.** The `PG.state_snapshot.active_records` shape contract across validators, replay helpers, PG-authoring skills, context-packet/story-bundle retrieval, and story turn/scene planning consumers.
4. **FOUNDATIONS principle under audit.** FOUNDATIONS §Story Bundles §5b requires every story-bundle record field to be load-bearing: directly consumed by a validation gate, replay primitive, predicate, fork operation, or audit-trail discipline. Empty active-record arrays are acceptable only if materializing them is load-bearing for one of those purposes.
5. **Dependency state.** `archive/tickets/PGMAP-001.md` intentionally made authoring guidance match the current validators without deciding whether the validator requirement itself should remain.
6. **Consumer audit result.** Hard replay/submit validators (`state_snapshot_integrity` and `snapshot_replay_equality`) normalize absent optional keys to `[]`; `compatibility_drift` is the current-page WARN surface; `active_records_full_shape` is full-world only; `tools/world-mcp/src/tools/plan-story-state-maintenance.ts` always emits a replayed full map; `tools/world-mcp/src/tools/select-storylet-candidates.ts` derives active classes only from non-empty arrays; `world-index` emits `page_active_record` edges only for listed ids. No audited consumer needs optional key presence for replay value distinct from an empty array.
7. **Contract decision.** Preserve full-map authoring and WARNs for current pages. The load-bearing role is not the semantic content of each empty array; it is the explicit per-class validation/audit surface that lets pre-apply and full-world review distinguish current-contract omissions from intentionally inactive classes while preserving legacy normalization.
8. **HARD-GATE boundary.** `compatibility_drift` can run in pre-apply when a patch plan creates a PG record. This ticket does not weaken that HARD-GATE-facing signal: missing optional keys on new/current pages still warn as `compat_requires_migration_patch`, legacy missing optional keys remain `info`, and hard replay validators continue to fail closed for substantive drift and missing `STCHAR`.

## Architecture Check

1. Preserving the current WARN contract is the cleanest result after audit because it keeps replay normalization available for legacy/compatibility paths while leaving current pages explicit enough for validator, hash, and operator review. Relaxing the WARN would erase the only current-page signal distinguishing omitted optional classes from intentionally inactive classes.
2. No backwards-compatibility aliasing/shims introduced. Legacy normalization remains explicit; no schema, validator severity, authoring guidance, or retrieval API changed.

## Verification Layers

1. Consumer behavior classification -> codebase grep-proof/manual review over validators, replay helpers, world-mcp story helpers, world-index edge emission, and PG-authoring guidance.
2. Chosen contract remains FOUNDATIONS-aligned -> FOUNDATIONS §Story Bundles §5b alignment check: explicit empty arrays are retained as validation/audit discipline for current records, while hard replay value still normalizes legacy absence.
3. Validator behavior matches the chosen contract -> focused validator tests prove preserved WARN behavior, full-world warning behavior, hard replay normalization, and hard pre-apply normalization.
4. Authoring guidance matches the chosen contract -> stale-anchor grep over `branching-story-bootstrap`, `branching-story-turn-cycle`, and shared story-record schema prose.

## Landed Changes

### 1. Consumer audit

Completed. Audited the active-record constants, replay validators, current-page compatibility warning, full-world shape validator, state-maintenance helper, storylet-candidate selection, world-index edge emission, and active PG-authoring guidance. The audit found no consumer where missing optional keys and empty arrays produce different replay state.

### 2. Contract decision

Kept full-map authoring and validator WARNs, with the load-bearing rationale tied to current-page validation/audit discipline and hash/fork review, not to distinct replay semantics for optional empty arrays.

### 3. Proof and guidance alignment

Added a source comment to `compatibility_drift` documenting why hard replay validators normalize legacy missing optional keys while current pages still warn on omitted optional keys. No PG-authoring guidance or tests needed behavior edits because the existing tests already prove the preserved contract.

## Files to Touch

- `tools/validators/src/_helpers/state-snapshot-replay.ts` (inspected; unchanged)
- `tools/validators/src/structural/compatibility-drift.ts` (modified rationale comment only)
- `tools/validators/src/structural/active-records-full-shape.ts` (inspected; unchanged)
- `tools/validators/src/structural/state-snapshot-integrity.ts` (inspected; unchanged)
- `tools/validators/src/structural/snapshot-replay-equality.ts` (inspected; unchanged)
- `tools/world-mcp/src/tools/plan-story-state-maintenance.ts` (inspected; unchanged)
- `tools/world-mcp/src/tools/select-storylet-candidates.ts` (inspected; unchanged)
- `tools/world-index/src/parse/atomic.ts` (inspected; unchanged)
- `.claude/skills/branching-story-bootstrap/references/phase-7-root-event-and-page.md` (inspected; unchanged)
- `.claude/skills/branching-story-turn-cycle/references/phase-6-page-snapshot.md` (inspected; unchanged)
- `.claude/skills/_shared-templates/story-record-schemas.md` (inspected; unchanged)
- `archive/tickets/PGMAP-002.md` (modified closeout/reassessment)

## Out of Scope

- Editing live story-bundle `_source/` records.
- Changing `story-page.schema.json` before the consumer audit proves a schema-level change is necessary.
- Broad story-bundle migration of historical pages.

## Acceptance Criteria

### Tests That Must Pass

1. Consumer inventory proved absent optional active-record keys are not semantically distinguishable from empty arrays in hard replay/retrieval surfaces, but omitted keys remain distinguishable as a current-page validation/audit signal.
2. The final contract decision is clear and is reflected consistently in validators and PG-authoring guidance.
3. Focused validator tests prove the preserved WARN behavior, full-world shape behavior, and hard replay/pre-apply normalization behavior.

### Invariants

1. The chosen `PG.state_snapshot.active_records` contract satisfies FOUNDATIONS §Story Bundles §5b.
2. Legacy grandfathering remains explicit and does not weaken pre-apply validation or HARD-GATE-facing story-state checks.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/compatibility-drift.test.ts` — preserved focused coverage for missing optional active-record keys.
2. `tools/validators/tests/structural/active-records-full-shape.test.ts` — preserved full-world shape coverage.
3. `tools/validators/tests/structural/snapshot-replay-equality.test.ts` — preserved hard replay normalization coverage.
4. `tools/validators/tests/structural/state-snapshot-integrity.test.ts` — preserved hard pre-apply normalization coverage.

### Commands

1. `npm run build` from `tools/validators`.
2. `node --test dist/tests/structural/compatibility-drift.test.js dist/tests/structural/active-records-full-shape.test.js dist/tests/structural/snapshot-replay-equality.test.js dist/tests/structural/state-snapshot-integrity.test.js` from `tools/validators`.
3. `rg -n 'active_records|ACTIVE_RECORDS_CLASSES|OPTIONAL_ACTIVE_RECORDS_CLASSES' tools/validators/src tools/world-mcp/src .claude/skills/branching-story-bootstrap .claude/skills/branching-story-turn-cycle .claude/skills/_shared-templates` — classify remaining current-contract hits against the chosen contract.

## Outcome

Completed: 2026-05-29.

The audit preserved the current full-map contract. Current/new `PG.state_snapshot.active_records` maps still materialize every `ACTIVE_RECORDS_CLASSES` key with `[]` for inactive classes. Legacy and hard replay paths still normalize missing optional keys to `[]`. The load-bearing rationale is now explicit: the full map is an audit and validation surface for current records, while replay value remains normalized for legacy compatibility.

No validator behavior, JSON Schema behavior, PG-authoring guidance, or runtime helper behavior changed.

## Verification Result

1. `npm run build` from `tools/validators` passed.
2. `node --test dist/tests/structural/compatibility-drift.test.js dist/tests/structural/active-records-full-shape.test.js dist/tests/structural/snapshot-replay-equality.test.js dist/tests/structural/state-snapshot-integrity.test.js` from `tools/validators` passed: 65 tests, 65 pass.
3. Manual/code review classified current consumers: `state_snapshot_integrity` and `snapshot_replay_equality` normalize optional absence for hard validation; `compatibility_drift` warns for current-page omissions; `active_records_full_shape` warns/fails in full-world mode; `plan_story_state_maintenance` emits the full replayed map; `select_storylet_candidates` derives active classes only from non-empty lists; `world-index` emits `page_active_record` edges only for listed ids; PG-authoring prose already requires the full map.
4. `rg -n 'active_records|ACTIVE_RECORDS_CLASSES|OPTIONAL_ACTIVE_RECORDS_CLASSES' tools/validators/src tools/world-mcp/src .claude/skills/branching-story-bootstrap .claude/skills/branching-story-turn-cycle .claude/skills/_shared-templates` completed; remaining hits were classified as current full-map guidance, hard replay normalization, current-page/full-world validator warnings, active-record consumers, or legitimate story-record examples.

## Deviations

The drafted ticket expected possible validator/test/guidance changes if the audit chose relaxation. Live reassessment chose preservation, so the only source edit is a rationale comment in `compatibility_drift`; existing focused tests already covered the preserved behavior. The initial package proof passed before the comment edit and was rerun after closeout because the proof consumes compiled `dist` output.

Post-ticket review created `tickets/WMCP-016.md` for the separate drift-risk cleanup that `plan_story_state_maintenance` carries a local copy of the active-record class list instead of consuming or proving parity with the validator helper. That is adjacent maintainability work, not unfinished PGMAP-002 behavior.
