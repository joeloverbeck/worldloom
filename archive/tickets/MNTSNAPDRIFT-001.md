# MNTSNAPDRIFT-001: Story-state maintenance records orphan from page snapshots

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `tools/world-mcp/src/tools/plan-story-state-maintenance.ts` (envelope shape change); `tools/world-mcp/src/tools/maintenance-page-plan.ts` (maintenance page-plan renderer); `tools/world-mcp/src/server.ts` and `tools/world-mcp/README.md` (public input/metadata contract); `tools/world-mcp/tests/tools/plan-story-state-maintenance.test.ts`, `tools/world-mcp/tests/server/dispatch.test.ts`, and fixture support; `tools/validators/src/schemas/story-event.schema.json`, `tools/validators/src/structural/state-snapshot-integrity.ts`, and validator tests (repair-event validation alignment); `tools/validators/tests/structural/snapshot-replay-equality.test.ts` (regression coverage for maintenance-emitted PGs); docs at `docs/MACHINE-FACING-LAYER.md`, `docs/WORKFLOWS.md`, and `.claude/skills/branching-story-turn-cycle/SKILL.md` (workflow shape change).
**Deps**: None

## Problem

At intake, `mcp__worldloom__plan_story_state_maintenance` emitted `create_stemo_record`, `create_stplan_record`, `create_srel_record`, and `create_chc_record` operations into a patch-plan envelope without also emitting a `create_pg_record` that incorporated the new records into a fresh `PG.state_snapshot.active_records[]`. The resulting accepted records could become **active on disk** (`supersedes: null`, present in `_source/<class>/<id>.yaml`) but **invisible to every committed `PG`'s `state_snapshot.active_records[]`** because no PG referenced them.

This violates FOUNDATIONS §Story Bundles §4a (Plan-Authority Boundary): "Story state is authoritative at page-plan commit. A `PG` record is real the moment the patch engine accepts the page-cycle plan." The implicit invariant is that every active record is either (a) created at some PG and reflected in that PG's `state_snapshot.active_records[]`, or (b) descends from a PG ancestor via lawful `supersede` / `close` lifecycle in some intervening `SE.state_delta`. Maintenance records satisfy neither — they have a `created_at_page:` that references a PG which never listed them.

Historical downstream consequence observed at `red-bunny` PG-3 turn-cycle (2026-05-26): `SREL-4.yaml` was added by a maintenance flow after PG-2 was committed (to satisfy `stemo_agency_effect_compatibility` coverage for `STEMO-3` / `STEMO-4`). PG-2's `state_snapshot.active_records.SREL = [SREL-1, SREL-2, SREL-3]` did not include SREL-4. The PG-3 turn-cycle was forced to choose between (a) including SREL-4 in PG-3's snapshot — which `snapshot_replay_equality` rejected because the replay function `parent.active_records + SE.state_delta` excluded SREL-4 — and (b) dropping SREL-4 from PG-3's snapshot — which kept the orphan record forever invisible to every future page snapshot. Path (b) was taken with a page-plan paragraph documenting the anomaly.

The two validators that read "active records" can still read from different surfaces: `snapshot_replay_equality` reads from PG.state_snapshot; `stemo_agency_effect_compatibility` reads disk-active records directly. This ticket fixes the forward maintenance-tool shape so new maintenance records are represented in a PG snapshot; it does not refactor the dual-reader pattern.

## Assumption Reassessment (2026-05-26)

1. `mcp__worldloom__plan_story_state_maintenance` lives at `tools/world-mcp/src/tools/plan-story-state-maintenance.ts`. At intake, its `RECORD_SPECS` table emitted exactly four `create_*` operations (STEMO / STPLAN / SREL / CHC) with no `create_se_record` or `create_pg_record` operation. The tool description in `tools/world-mcp/src/server.ts` confirmed the scope was `STEMO/STPLAN/SREL/CHC` maintenance only. The `replayActiveRecords` algorithm at `tools/validators/src/_helpers/state-snapshot-replay.ts` already strictly computes `parent.active_records + state_delta.create - state_delta.supersede - state_delta.close`; this ticket feeds that existing replay surface instead of changing its semantics.
2. `docs/FOUNDATIONS.md` §Story Bundles §4a (lines 618-622) is the contract under audit: "Story state is authoritative at page-plan commit. Rendered prose is a rendering of that state, not a second state engine. A `PG` record is real the moment the patch engine accepts the page-cycle plan; rendered prose is supplied externally and attached later via a prose receipt. Page snapshots are the fork primitive." Implication: every active state record must appear in some page snapshot, because the page snapshot is the fork primitive that subsequent turn-cycles read from. Records that appear only on disk but in no snapshot break the fork primitive's completeness.
3. Cross-skill / cross-artifact boundary: the maintenance envelope's omission of `create_pg_record` is the shared boundary under audit between `plan_story_state_maintenance` (the producer), `branching-story-turn-cycle` (the downstream consumer of PG snapshots), `branching-story-health-audit` (the validator-of-snapshots), and `snapshot_replay_equality` (the cross-validator that enforces parent-snapshot + delta replay). The shared contract is the §4a Plan-Authority Boundary plus the `replayActiveRecords` algorithm at `state-snapshot-replay.ts:62-95`.
4. FOUNDATIONS principle restated: §4a says the PG is the page-state authority. The HARD-GATE discipline in `docs/HARD-GATE-DISCIPLINE.md` extends this: story-bundle `_source/<class>/*.yaml` writes route through the patch engine after explicit approval, and `pages-prose-plans/PG-<integer>.md` remains a direct-write surface guarded by hash discipline. Maintenance records routing through the engine without producing a PG creates a class of "engine-accepted but snapshot-invisible" state that breaks the §4a fork-primitive invariant.
5. Schema extension classification: this ticket extends the `plan_story_state_maintenance` envelope output shape additively (the envelope adds a `create_pg_record` patch op at the end of `patches[]`), and it extends the maintenance tool's input contract additively (the input must name a `parent_page_id` to fork from). The `PG` record schema itself is unchanged. The `state-snapshot-replay` algorithm is unchanged.
6. HARD-GATE / Mystery Reserve impact: `docs/HARD-GATE-DISCIPLINE.md` was read because this ticket changes a review-only patch-plan envelope and validation-facing story-state records. The implementation does not weaken approval-token semantics, canon-write ordering, Canon Safety Checks, or the Mystery Reserve firewall. The maintenance scope is story-bundle records only; world-canon is unaffected.
7. Adjacent contradictions surfaced: the dual-source "active records" reading (`snapshot_replay_equality` reads PG snapshots; `stemo_agency_effect_compatibility` reads disk) is a separate concern this ticket exposes but does NOT fix. After this ticket lands, both readings would agree because every record would be in a snapshot. The dual-source pattern itself remains — that's a separate cleanup candidate if the divergence ever resurfaces.
8. Greppable impact on existing bundles: the `red-bunny` bundle carries one observed orphan (`worlds/erotica-world/stories/red-bunny/_source/relationships/SREL-4.yaml`). The fix landed forward-only; pre-existing orphans require either a one-time backfill maintenance PG (out of scope for this ticket; named in §Out of Scope) or in-place tolerance via documented page-plan annotation (the pattern `red-bunny` PG-3 already established).
9. Package proof-surface correction: the drafted `npm test -- <name>` commands were replaced with build-then-direct compiled test invocations because each package's `npm test` script runs compiled `dist/tests/**/*.test.js`; direct compiled tests are the focused, executable proof for this seam.
10. Post-review reassessment: the first closeout was too narrow. The generated maintenance PG used a stale `validation_trace` gate (`choice_surface_integrity`) instead of the shared `canon_promotion_hold` key, created maintenance records at the parent page instead of the maintenance page, omitted structured introductions for fresh active records, and exposed repair-event contradictions in the live validators. The final fix keeps those concerns inside this ticket's owned validation boundary because they determine whether the generated maintenance envelope can enter the normal `validate_patch_plan` path.

## Architecture Check

1. Cleaner than alternatives because (a) emitting a maintenance PG at the same envelope as the maintenance records preserves the §4a fork-primitive invariant without weakening either validator, (b) it eliminates the dual-source "active records" reading discrepancy without changing validator semantics, and (c) it surfaces every state mutation as a fork point a future turn-cycle can read from, matching the rest of the patch-engine route. The alternative (teach `snapshot_replay_equality` to tolerate ambient on-disk records) silently weakens the §4a invariant and leaves "active on disk but not in any snapshot" as a permanent valid state shape.
2. No backwards-compatibility shim introduced. The envelope shape change is additive (`create_pg_record` appended to `patches[]`); validators are unchanged in their replay semantics; existing turn-cycle / health-audit flows continue to work. Pre-existing orphan records remain readable on disk; they require a one-time backfill (separate ticket if desired) but do not break the new flow.

## Verification Layers

1. FOUNDATIONS §4a fork-primitive invariant preserved → FOUNDATIONS alignment check (§Story Bundles §4a lines 618-622 cited verbatim; the maintenance envelope output must produce a PG whose `state_snapshot.active_records[]` includes every newly-created lifecycle-managed record).
2. Maintenance envelope structurally emits PG → codebase grep-proof (`grep -n "create_pg_record" tools/world-mcp/src/tools/plan-story-state-maintenance.ts` returns at least one match after the change).
3. `snapshot_replay_equality` passes for maintenance-PG snapshots → schema validation (a representative dry-run: invoke `plan_story_state_maintenance` against a fixture bundle with one SREL maintenance entry; submit the envelope; run `validate_patch_plan` against the resulting committed bundle in a follow-up turn-cycle envelope — the new SREL appears in the maintenance-PG snapshot and is carried forward by `replayActiveRecords` without drift).
4. Maintenance-PG `validation_trace` shape compliant → schema validation (the emitted PG's `validation_trace` includes one entry per shared hard gate with one-line rationale per `AGENTS.md` "Validation test PASS entries require a one-line rationale" plus the shared story-state contract §7 gates).
5. Maintenance-PG doesn't break the bundle's `INDEX.md` page table convention → manual review (the bundle's `INDEX.md` Pages table accepts the maintenance-PG row with a `turn_index` continuation and a clearly marked maintenance event-kind).
6. Pre-existing orphan tolerance documented → manual review (the implementer adds a note to `docs/MACHINE-FACING-LAYER.md` §`plan_story_state_maintenance` and to the `branching-story-turn-cycle` SKILL.md describing the new envelope shape, with a one-paragraph callout that pre-existing orphan records on disk require a one-time backfill maintenance PG or in-place page-plan annotation per the established `red-bunny` PG-3 pattern).

## Landed Changes

### 1. Extended `plan_story_state_maintenance` envelope to include a maintenance PG

The maintenance envelope now appends a `create_se_record` and final `create_pg_record` op whose payload carries:

- A fresh `PG-<integer>` id allocated alongside the maintenance record IDs (allocator key `pg_ids` per the existing `expected_id_allocations` shape).
- `parent_page_id` = the committed PG supplied to the tool as required input.
- `branch_id` = parent's `branch_id` (maintenance is always a continuation, never a fork).
- `branch_path` = parent's `branch_path` extended with the new PG id.
- `turn_index` = parent's `turn_index + 1`.
- `state_snapshot.active_records[]` = `replayActiveRecords(parent.state_snapshot.active_records, SE.state_delta)` per `state-snapshot-replay.ts` — i.e., parent's active records plus the maintenance records being created, minus any supersessions the maintenance envelope expresses.
- `state_snapshot.canon_revision` = parent's `canon_revision` (maintenance does not advance canon baseline).
- `state_snapshot.entity_status` = parent's `entity_status` (maintenance does not change life/agency/location).
- `state_snapshot.unresolved_mystery_claims[]` = parent's unchanged (maintenance does not surface or resolve mysteries).
- `state_snapshot.visible_affordances[]` = parent's unchanged (maintenance does not change scene affordances).
- `state_snapshot.continuation.{has_eligible_commitment_block, terminal_status, terminal_rationale}` = parent's (maintenance does not retire the branch).
- `state_hash_parent` = parent's `state_hash`.
- `state_hash` = computed via the canonical `compute-pg-hashes` CLI.
- `plan.plan_hash` = computed via the canonical `compute-pg-hashes` CLI against the maintenance page plan (see Change Area 2).
- `prose_plan_path` = `pages-prose-plans/PG-<integer>.md`.
- `emitted_choices` = [] (maintenance does not emit choices; the next real turn-cycle inherits the parent's still-available choice surface).
- `input.choice_id` = null; `input.manual_action_text` = null; `input.resolved_event_id` = the maintenance-emitted SE id.
- `validation_trace` = one entry per shared hard gate, including `canon_promotion_hold`, plus the `audit_only_se_shape` rationale per `story-state-contract.md` §4.3a, with PASS rationales tailored to the maintenance posture.

The corresponding `create_se_record` op uses `event_kind: audit_repair` by default, or `system_repair` when the caller explicitly supplies that maintenance event kind. The repair SE uses the existing `create_se_record` op without changes; it carries `commitment.selection_source: none`, `commitment.selected_slt_id: null`, no `turn_driver`, and structured `record_introductions[]` for fresh active SREL / STPLAN / STEMO records created by the maintenance delta. New maintenance records are stamped with the maintenance PG, and records with a `created_by_event` field are stamped with the maintenance SE.

### 2. Returned a minimal maintenance page plan

The maintenance PG references `pages-prose-plans/PG-<integer>.md`, so the tool now returns `maintenance_page_plan.target_file`, `maintenance_page_plan.body`, and `maintenance_page_plan.content_hash`. The renderer lives at `tools/world-mcp/src/tools/maintenance-page-plan.ts` so it is compiled and shipped with the package rather than relying on an unbundled raw template file. The body names the maintenance trigger, source ticket, audit/system repair SE, and maintenance record delta; it explicitly says no prose render is expected for the maintenance PG.

### 3. Proved `snapshot_replay_equality` already recognizes maintenance-PG creation patterns

No semantic change was made to the replay algorithm. The validator continues to compute `parent.active_records + state_delta.create - state_delta.supersede - state_delta.close`. With the maintenance PG present, the new active SREL / STEMO / STPLAN records appear in the maintenance-PG's snapshot via the normal `state_delta.create` route; CHC remains a page-level emitted choice, not an `active_records` class. Regression coverage landed in `snapshot-replay-equality.test.ts` without modifying `snapshot-replay-equality.ts`.

The validator special-case sweep found only schema enum entries and storylet-origin handling for `audit_repair`; no `snapshot_replay_equality` or PG replay special case conflicts with the new maintenance PG shape.

### 3a. Aligned repair-event validators with the generated maintenance shape

The post-review probe found two validator contradictions that prevented the generated repair SE/PG pair from validating cleanly. `story-event.schema.json` now treats `system_repair` and `audit_repair` like `story_start`, `prose_attach`, and `promotion_closeout` for null `selected_slt_id` / `selection_source: none`. `state-snapshot-integrity.ts` now accepts the repair PG's null `input.choice_id` and null `input.manual_action_text`, while preserving exactly-one input-source enforcement for normal turn-resolution pages.

### 4. Documentation updates

- `docs/MACHINE-FACING-LAYER.md`: updated the `plan_story_state_maintenance` row to describe the new envelope shape (maintenance records + maintenance SE + maintenance PG), returned page-plan body, required exact page-plan write, and forward-only orphan boundary.
- `docs/WORKFLOWS.md`: updated the "Surgical story-state maintenance" bullet to document the new `parent_page_id` input field and the maintenance-PG output behavior.
- `.claude/skills/branching-story-turn-cycle/SKILL.md`: updated the maintenance pointer paragraph to name the new envelope shape so operators understand that the maintenance flow produces a forkable PG.
- `tools/world-mcp/README.md`: updated the package user-facing status and tool invocation contract.
- `docs/HARD-GATE-DISCIPLINE.md`: read and confirmed the existing token discipline still applies; no text change was needed because approval-token flow is unchanged.

### 5. (Out of this ticket but flagged) Pre-existing orphan backfill

Pre-existing orphan records (e.g., `red-bunny:SREL-4`) remain on disk after this ticket lands. They can be reconciled either by (a) a one-time maintenance PG that incorporates them into a fresh snapshot — operator-driven — or (b) a per-bundle audit + repair turn that supersedes them with re-grounded equivalents. This ticket does not script the backfill; it documents the path in the workflow change so operators know how to reconcile.

## Files to Touch

- `tools/world-mcp/src/tools/plan-story-state-maintenance.ts` (modify — add `parent_page_id` input field; extend envelope output with `create_se_record` repair SE and `create_pg_record` maintenance PG; allocate `pg_ids` / `se_ids` alongside the existing maintenance-record IDs)
- `tools/world-mcp/src/tools/maintenance-page-plan.ts` (new — compiled maintenance page-plan renderer per Change Area 2)
- `tools/world-mcp/src/server.ts` (modify — update the `plan_story_state_maintenance` schema and description to name the new envelope shape and `parent_page_id` input)
- `tools/validators/tests/structural/snapshot-replay-equality.test.ts` (modify — add a regression test confirming a maintenance-PG shape passes `snapshot_replay_equality`)
- `tools/world-mcp/tests/tools/plan-story-state-maintenance.test.ts` (modify — extend coverage to confirm the envelope contains the expected maintenance PG + SE + records and the new `parent_page_id` input is required)
- `tools/world-mcp/tests/tools/story-bundle-fixture.ts` (modify — make the parent PG fixture schema-complete enough to prove maintenance snapshot replay)
- `tools/world-mcp/tests/server/dispatch.test.ts` (modify — keep the MCP dispatch smoke fixture aligned with the new required `parent_page_id` input and branch-carrying parent PG shape)
- `tools/validators/src/schemas/story-event.schema.json` (modify — accept repair-event null commitment fields)
- `tools/validators/src/structural/state-snapshot-integrity.ts` (modify — accept repair-page null input fields)
- `tools/validators/tests/structural/record-schema-compliance-story-event.test.ts` (modify — cover repair-event null commitment fields)
- `tools/validators/tests/structural/state-snapshot-integrity.test.ts` (modify — cover repair-page null input fields)
- `tools/world-mcp/README.md` (modify — package user-facing tool contract)
- `docs/MACHINE-FACING-LAYER.md` (modify — update the `plan_story_state_maintenance` contract row)
- `docs/WORKFLOWS.md` (modify — update the surgical story-state maintenance workflow bullet)
- `.claude/skills/branching-story-turn-cycle/SKILL.md` (modify — update the maintenance pointer paragraph)

## Out of Scope

- Pre-existing orphan backfill for bundles like `red-bunny` (operator-driven one-time maintenance PG; flagged in §What to Change Change Area 5).
- Any change to `replayActiveRecords` at `tools/validators/src/_helpers/state-snapshot-replay.ts:62-95` — the algorithm is unchanged; the maintenance envelope feeds it normally.
- Any change to `snapshot_replay_equality` semantics — same.
- The dual-source "active records" reading discrepancy between `snapshot_replay_equality` (PG-snapshot reader) and `stemo_agency_effect_compatibility` (disk reader); after this ticket lands, both readings agree because every record is in a snapshot, but the dual-source pattern itself is not refactored here.
- Any change to the world-canon maintenance flow (`canon-addition`, retcon path) — out of scope; the maintenance tool under audit is story-state-only.
- Any change to the HARD-GATE token / approval semantics — the maintenance envelope continues to require explicit approval per `docs/HARD-GATE-DISCIPLINE.md`.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/world-mcp && npm run build && node --test dist/tests/tools/plan-story-state-maintenance.test.js` — maintenance envelope shape test passes; the envelope contains exactly N `create_<class>_record` ops (the maintenance records) + 1 `create_se_record` (repair SE) + 1 `create_pg_record` (maintenance PG); `parent_page_id` is a required input.
2. `cd tools/validators && npm run build && node --test dist/tests/structural/snapshot-replay-equality.test.js` — regression test passes; a maintenance-PG envelope's `state_snapshot.active_records[]` matches `replayActiveRecords(parent.active_records, state_delta)` without drift.
3. Fixture-backed integration dry-run: `tools/world-mcp/tests/tools/plan-story-state-maintenance.test.ts` invokes `planStoryStateMaintenance`, validates the returned envelope through `validatePatchPlan`, and inspects the returned maintenance PG/page-plan shape without committing world content.
4. `bash scripts/build-all.sh` and `bash scripts/check-all.sh` — full-pipeline build + test verification.

### Invariants

1. Every accepted maintenance envelope MUST include a `create_pg_record` op whose `state_snapshot.active_records[]` includes every record the envelope's `create_*_record` ops emit. (FOUNDATIONS §4a fork-primitive invariant.)
2. Every accepted maintenance envelope MUST include a `create_se_record` op with `event_kind: audit_repair | system_repair` that grounds the new PG (per shared story-state contract §4.3a repair SE shape).
3. The maintenance PG's `validation_trace` MUST include one PASS entry per shared hard gate per `.claude/skills/_shared-templates/story-state-contract.md` §7, each with a one-line rationale per `AGENTS.md`.
4. The maintenance PG MUST NOT emit choices (`emitted_choices = []`); the next real turn-cycle inherits the parent's choice surface.
5. The maintenance envelope MUST NOT advance `canon_revision`; maintenance does not change world canon.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/tools/plan-story-state-maintenance.test.ts` — envelope-shape test verifying `create_pg_record` is emitted with correct snapshot replay; rationale: covers the new envelope contract end-to-end.
2. `tools/validators/tests/structural/snapshot-replay-equality.test.ts` — regression test confirming a maintenance-PG envelope passes the validator (uses a synthetic in-memory bundle fixture rather than a real bundle).
3. `tools/world-mcp/tests/tools/plan-story-state-maintenance.test.ts` — input-validation test confirming malformed `parent_page_id` input produces an `invalid_input` error before any allocation runs.
4. `tools/world-mcp/tests/server/dispatch.test.ts` — MCP dispatch smoke test updated so the registered tool accepts the new required input and schema-complete parent PG fixture.
5. `tools/validators/tests/structural/record-schema-compliance-story-event.test.ts` and `tools/validators/tests/structural/state-snapshot-integrity.test.ts` — repair-event validation tests proving the generated maintenance SE/PG pair is accepted by the owned validators.

### Commands

1. `cd tools/world-mcp && npm run build` — compile the maintenance tool and emitted test artifacts.
2. `cd tools/world-mcp && node --test dist/tests/tools/plan-story-state-maintenance.test.js` — targeted maintenance-tool test pass.
3. `cd tools/validators && npm run build` — compile validator regression artifacts.
4. `cd tools/validators && node --test dist/tests/structural/snapshot-replay-equality.test.js` — targeted validator regression test pass.
5. `bash scripts/build-all.sh` — full-package build verification.
6. `bash scripts/check-all.sh` — full-package build + test verification.

## Outcome

Implemented the forward-only maintenance snapshot bridge. `planStoryStateMaintenance` now requires `parent_page_id`, allocates maintenance record ids plus `SE`/`PG` ids in one batch, verifies superseded records, returns maintenance record create ops, appends an audit/system repair `SE`, appends a maintenance `PG` whose active-record snapshot is replayed from the parent through that SE delta, and returns the exact maintenance page-plan body/hash material the operator must write before submission.

The validator replay algorithm was left unchanged; regression coverage now proves maintenance PGs pass through the existing `snapshot_replay_equality` new-schema replay path. Public docs, package README, server description, and the turn-cycle maintenance pointer now describe the new required parent page and page-plan write step. Post-review validation drift was resolved by aligning the generated trace key with `canon_promotion_hold`, stamping created records at the maintenance PG/SE, emitting structured record introductions, and accepting repair-event null commitment/input fields in the relevant validators.

## Verification Result

1. `cd tools/validators && npm run build` — passed.
2. `cd tools/validators && node --test dist/tests/structural/snapshot-replay-equality.test.js` — passed, 23 tests including the new maintenance-PG regression.
3. `cd tools/world-mcp && npm run build` — passed.
4. `cd tools/world-mcp && node --test dist/tests/tools/plan-story-state-maintenance.test.js` — passed, 4 tests including envelope shape, validate-patch-plan integration, owned-validator assertions, and `parent_page_id` rejection.
5. `cd tools/validators && node --test dist/tests/structural/record-schema-compliance-story-event.test.js dist/tests/structural/state-snapshot-integrity.test.js dist/tests/structural/snapshot-replay-equality.test.js` — passed, 62 tests.
6. `cd tools/world-mcp && node --test dist/tests/server/dispatch.test.js` — passed, 36 tests including the registered-tool dispatch fixture.
7. `cd tools/validators && npm test` — passed, 1050 tests.
8. `cd tools/world-mcp && npm test` — passed, 473 tests.
9. `bash scripts/build-all.sh` — passed.
10. `bash scripts/check-all.sh` — failed before reaching the modified packages when `tools/world-index` broad concurrent tests reported failures in `dist/tests/cli-init.test.js` and `dist/tests/cli-smoke.test.js`; the direct follow-up `cd tools/world-index && node --test dist/tests/cli-init.test.js dist/tests/cli-smoke.test.js` passed, 9 tests.
11. `rg -n 'audit_repair|system_repair' tools/validators/src` — reviewed; hits are schema enum/storylet-origin surfaces, with no conflicting maintenance-PG replay special case.
12. Post-ticket review direct probe — initially failed because the maintenance PG used stale `validation_trace.choice_surface_integrity` instead of required `canon_promotion_hold`. The final implementation resolves that blocker and test coverage now asserts the generated maintenance plan has no owned validator failures on the generated SE/PG records for the maintenance envelope boundary.

## Deviations

- The drafted validator source edit was narrowed to validator regression coverage because live `snapshot_replay_equality` already replays new-schema PG snapshots from `SE.state_delta`.
- The drafted raw `.md.tpl` template was replaced by a compiled `maintenance-page-plan.ts` renderer so package builds and `dist/` output carry the renderer without a raw-asset copy step.
- The drafted `red-bunny` dry-run was not executed against live world content. The portable proof is the fixture-backed `planStoryStateMaintenance` + `validatePatchPlan` test, and pre-existing `red-bunny` orphan backfill remains out of scope.
- The drafted `npm test -- <filter>` commands were replaced by explicit build + direct compiled `node --test dist/...` commands because the package scripts run compiled glob suites and do not provide a reliable focused selector contract.
- `bash scripts/check-all.sh` remains red due `tools/world-index` broad concurrent CLI test failures that did not reproduce under direct invocation of the named failing test files. The modified `world-mcp` and `validators` packages pass their full package test suites.
- The shared fixture still carries unrelated baseline validation failures outside this ticket's generated maintenance SE/PG records. For that reason, the integration test does not claim whole-fixture `validatePatchPlan.status === "pass"`; it asserts zero owned failures for `opening-bells:SE-2` / `opening-bells:PG-2` across the validators relevant to the maintenance envelope, and separately asserts the `validation_trace_shape_compliance` and `id_allocation_race` validators execute/pass at the envelope level.
