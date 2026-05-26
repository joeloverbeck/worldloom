# MNTSNAPDRIFT-001: Story-state maintenance records orphan from page snapshots

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `tools/world-mcp/src/tools/plan-story-state-maintenance.ts` (envelope shape change); `tools/validators/src/structural/snapshot-replay-equality.ts` (recognition of maintenance-emitted PG); possibly `tools/validators/src/_helpers/state-snapshot-replay.ts` (extension of replay surface); docs at `docs/MACHINE-FACING-LAYER.md` and `docs/WORKFLOWS.md` (workflow shape change).
**Deps**: None

## Problem

`mcp__worldloom__plan_story_state_maintenance` emits `create_stemo_record`, `create_stplan_record`, `create_srel_record`, and `create_chc_record` operations into a patch-plan envelope without also emitting a `create_pg_record` that incorporates the new records into a fresh `PG.state_snapshot.active_records[]`. The resulting accepted records become **active on disk** (`supersedes: null`, present in `_source/<class>/<id>.yaml`) but **invisible to every committed `PG`'s `state_snapshot.active_records[]`** because no PG references them.

This violates FOUNDATIONS §Story Bundles §4a (Plan-Authority Boundary): "Story state is authoritative at page-plan commit. A `PG` record is real the moment the patch engine accepts the page-cycle plan." The implicit invariant is that every active record is either (a) created at some PG and reflected in that PG's `state_snapshot.active_records[]`, or (b) descends from a PG ancestor via lawful `supersede` / `close` lifecycle in some intervening `SE.state_delta`. Maintenance records satisfy neither — they have a `created_at_page:` that references a PG which never listed them.

Downstream consequence observed at `red-bunny` PG-3 turn-cycle (2026-05-26): `SREL-4.yaml` was added by a maintenance flow after PG-2 was committed (to satisfy `stemo_agency_effect_compatibility` coverage for `STEMO-3` / `STEMO-4`). PG-2's `state_snapshot.active_records.SREL = [SREL-1, SREL-2, SREL-3]` does not include SREL-4. The PG-3 turn-cycle was forced to choose between (a) including SREL-4 in PG-3's snapshot — which `snapshot_replay_equality` rejected because the replay function `parent.active_records + SE.state_delta` excluded SREL-4 — and (b) dropping SREL-4 from PG-3's snapshot — which kept the orphan record forever invisible to every future page snapshot. Path (b) was taken with a page-plan paragraph documenting the anomaly.

The two validators that read "active records" disagree on what "active" means: `snapshot_replay_equality` reads from PG.state_snapshot; `stemo_agency_effect_compatibility` reads disk-active records directly (which is why it kept passing for SREL-4 coverage even as the SREL was excluded from snapshots). This is the symptom; the maintenance-tool shape is the cause.

## Assumption Reassessment (2026-05-26)

1. `mcp__worldloom__plan_story_state_maintenance` lives at `tools/world-mcp/src/tools/plan-story-state-maintenance.ts:21,85-115`. Its `RECORD_SPECS` table emits exactly four `create_*` operations (STEMO / STPLAN / SREL / CHC) with no `create_pg_record` operation. The tool description at `tools/world-mcp/src/server.ts:549-550` confirms the scope is `STEMO/STPLAN/SREL/CHC` maintenance only. The `replayActiveRecords` algorithm at `tools/validators/src/_helpers/state-snapshot-replay.ts:62-95` strictly computes `parent.active_records + state_delta.create - state_delta.supersede - state_delta.close` with no carve-out for ambient maintenance records.
2. `docs/FOUNDATIONS.md` §Story Bundles §4a (lines 618-622) is the contract under audit: "Story state is authoritative at page-plan commit. Rendered prose is a rendering of that state, not a second state engine. A `PG` record is real the moment the patch engine accepts the page-cycle plan; rendered prose is supplied externally and attached later via a prose receipt. Page snapshots are the fork primitive." Implication: every active state record must appear in some page snapshot, because the page snapshot is the fork primitive that subsequent turn-cycles read from. Records that appear only on disk but in no snapshot break the fork primitive's completeness.
3. Cross-skill / cross-artifact boundary: the maintenance envelope's omission of `create_pg_record` is the shared boundary under audit between `plan_story_state_maintenance` (the producer), `branching-story-turn-cycle` (the downstream consumer of PG snapshots), `branching-story-health-audit` (the validator-of-snapshots), and `snapshot_replay_equality` (the cross-validator that enforces parent-snapshot + delta replay). The shared contract is the §4a Plan-Authority Boundary plus the `replayActiveRecords` algorithm at `state-snapshot-replay.ts:62-95`.
4. FOUNDATIONS principle restated: §4a says the PG is the page-state authority. The HARD-GATE discipline in `docs/HARD-GATE-DISCIPLINE.md` extends this: every state mutation must route through the patch engine. Maintenance records routing through the engine without producing a PG creates a class of "engine-accepted but snapshot-invisible" state that breaks the §4a fork-primitive invariant.
5. Schema extension classification: this ticket extends the `plan_story_state_maintenance` envelope output shape additively (the envelope adds a `create_pg_record` patch op at the end of `patches[]`), and it extends the maintenance tool's input contract additively (the input must name a `parent_page_id` to fork from). The `PG` record schema itself is unchanged. The `state-snapshot-replay` algorithm is unchanged.
6. HARD-GATE / Mystery Reserve impact: this ticket does NOT touch HARD-GATE semantics, canon-write ordering, Canon Safety Checks, or the Mystery Reserve firewall. The maintenance scope is story-bundle records only; world-canon is unaffected.
7. Adjacent contradictions surfaced: the dual-source "active records" reading (`snapshot_replay_equality` reads PG snapshots; `stemo_agency_effect_compatibility` reads disk) is a separate concern this ticket exposes but does NOT fix. After this ticket lands, both readings would agree because every record would be in a snapshot. The dual-source pattern itself remains — that's a separate cleanup candidate if the divergence ever resurfaces.
8. Greppable impact on existing bundles: the `red-bunny` bundle carries one observed orphan (`worlds/erotica-world/stories/red-bunny/_source/relationships/SREL-4.yaml`). A repo-wide check (`grep -rL "SREL-4" worlds/*/stories/*/_source/pages/*.yaml` against bundles that have SREL-4 files) would enumerate other affected bundles. The fix lands forward-only; pre-existing orphans require either a one-time backfill maintenance PG (out of scope for this ticket; named in §Out of Scope) or in-place tolerance via documented page-plan annotation (the pattern `red-bunny` PG-3 already established).

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

## What to Change

### 1. Extend `plan_story_state_maintenance` envelope to include a maintenance PG

Add to the maintenance envelope's `patches[]` a final `create_pg_record` op whose payload carries:

- A fresh `PG-<integer>` id allocated alongside the maintenance record IDs (allocator key `pg_ids` per the existing `expected_id_allocations` shape).
- `parent_page_id` = the active leaf PG of the targeted branch at the time the maintenance envelope is built. (Requires a new required input field on the tool: `parent_page_id: PG-<integer>`. Document this in the tool description at `server.ts:549-550`.)
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
- `validation_trace` = one entry per shared hard gate plus the new `audit_only_se_shape` rationale per `story-state-contract.md` §4.3a, with PASS rationales tailored to the maintenance posture.

Add a corresponding `create_se_record` op for an audit-only SE with `event_kind: audit_repair` (or `system_repair` depending on the maintenance trigger — preserve the existing maintenance-source taxonomy; default to `audit_repair` when the maintenance was triggered by a validator gap; route `system_repair` for engine-internal triggers). The audit-only SE shape is the existing `story-state-contract.md` §4.3a contract and uses the existing `create_se_record` op without changes; no `turn_driver`, no `commitment` (selection_source: `none`, selected_slt_id: null per the existing §4.3 conditional).

### 2. Emit a minimal maintenance page plan

The maintenance PG references `pages-prose-plans/PG-<integer>.md`, so the maintenance envelope's caller must write a maintenance-shaped page plan. Two options; pick (a) for minimum scope:

(a) Maintenance plan template: a thin page-plan markdown that names the maintenance trigger (the validator gap or repair source), enumerates the maintenance records added/superseded, and explicitly states no prose render is expected for the maintenance PG. The template body is short (under 50 lines) and lives at a new path like `tools/world-mcp/src/tools/templates/maintenance-page-plan.md.tpl` interpolated with the maintenance record list at envelope-build time.

(b) Defer page-plan authorship to the operator: the maintenance envelope returns the PG id and the operator hand-authors the page-plan markdown before signing. Higher friction but no template-shape contract.

Pick (a). The plan body inlines §2 / §3 / §19 from `reports/prose-quality-instructions.md` per the shared story-state contract §8 convention (required for every PG plan), plus a `## Maintenance Trigger` section naming the cited maintenance source (validator gap, audit finding, engine repair) and a `## Maintenance Record Delta` section enumerating creates/supersessions. Prose-attach is not expected and not blocked — if an operator later renders prose for a maintenance PG, the bundle accepts it through the normal `branching-story-prose-attach` path.

### 3. Update `snapshot_replay_equality` to recognize maintenance-PG creation patterns

No semantic change to the replay algorithm. The validator continues to compute `parent.active_records + state_delta.create - state_delta.supersede - state_delta.close`. With the maintenance PG present, the new SREL / STEMO / STPLAN / CHC records appear in the maintenance-PG's snapshot via the normal `state_delta.create` route, and `snapshot_replay_equality` passes without modification.

Verify no validator currently special-cases maintenance PGs in a way that would conflict (`grep -rn "audit_repair\|system_repair" tools/validators/src/` and confirm none of those special cases would fire on the new maintenance PG shape).

### 4. Documentation updates

- `docs/MACHINE-FACING-LAYER.md` (line 220): update the `plan_story_state_maintenance` row to describe the new envelope shape (maintenance records + maintenance SE + maintenance PG, all in one approved envelope).
- `docs/WORKFLOWS.md` (line 67): update the "Surgical story-state maintenance" bullet to document the new `parent_page_id` input field and the maintenance-PG output behavior.
- `.claude/skills/branching-story-turn-cycle/SKILL.md` (line 39): update the maintenance pointer paragraph to name the new envelope shape so operators understand that the maintenance flow produces a fork-able PG.
- `docs/HARD-GATE-DISCIPLINE.md`: confirm the existing maintenance-token discipline still applies; the change is additive to the envelope, not to the token-signing flow.

### 5. (Out of this ticket but flagged) Pre-existing orphan backfill

Pre-existing orphan records (e.g., `red-bunny:SREL-4`) remain on disk after this ticket lands. They can be reconciled either by (a) a one-time maintenance PG that incorporates them into a fresh snapshot — operator-driven — or (b) a per-bundle audit + repair turn that supersedes them with re-grounded equivalents. This ticket does not script the backfill; it documents the path in the workflow change so operators know how to reconcile.

## Files to Touch

- `tools/world-mcp/src/tools/plan-story-state-maintenance.ts` (modify — add `parent_page_id` input field; extend envelope output with `create_se_record` audit-only SE and `create_pg_record` maintenance PG; allocate `pg_ids` / `se_ids` alongside the existing maintenance-record IDs)
- `tools/world-mcp/src/tools/templates/maintenance-page-plan.md.tpl` (new — maintenance page-plan template per Change Area 2)
- `tools/world-mcp/src/server.ts` (modify — update the `plan_story_state_maintenance` description at lines 549-550 to name the new envelope shape and `parent_page_id` input)
- `tools/validators/test/structural/snapshot-replay-equality.spec.ts` (modify or new — add a regression test confirming a maintenance-PG envelope produced by the new flow passes `snapshot_replay_equality`)
- `tools/world-mcp/test/tools/plan-story-state-maintenance.spec.ts` (modify or new — extend coverage to confirm the envelope contains the expected maintenance PG + SE + records and the new `parent_page_id` input is required)
- `docs/MACHINE-FACING-LAYER.md` (modify — update the `plan_story_state_maintenance` row at line 220)
- `docs/WORKFLOWS.md` (modify — update the maintenance bullet at line 67)
- `.claude/skills/branching-story-turn-cycle/SKILL.md` (modify — update the maintenance pointer paragraph at line 39)

## Out of Scope

- Pre-existing orphan backfill for bundles like `red-bunny` (operator-driven one-time maintenance PG; flagged in §What to Change Change Area 5).
- Any change to `replayActiveRecords` at `tools/validators/src/_helpers/state-snapshot-replay.ts:62-95` — the algorithm is unchanged; the maintenance envelope feeds it normally.
- Any change to `snapshot_replay_equality` semantics — same.
- The dual-source "active records" reading discrepancy between `snapshot_replay_equality` (PG-snapshot reader) and `stemo_agency_effect_compatibility` (disk reader); after this ticket lands, both readings agree because every record is in a snapshot, but the dual-source pattern itself is not refactored here.
- Any change to the world-canon maintenance flow (`canon-addition`, retcon path) — out of scope; the maintenance tool under audit is story-state-only.
- Any change to the HARD-GATE token / approval semantics — the maintenance envelope continues to require explicit approval per `docs/HARD-GATE-DISCIPLINE.md`.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/world-mcp && npm test -- plan-story-state-maintenance` — maintenance envelope shape test passes; the envelope contains exactly N `create_<class>_record` ops (the maintenance records) + 1 `create_se_record` (audit-only SE) + 1 `create_pg_record` (maintenance PG); `parent_page_id` is a required input.
2. `cd tools/validators && npm test -- snapshot-replay-equality` — regression test passes; a maintenance-PG envelope's `state_snapshot.active_records[]` matches `replayActiveRecords(parent.active_records, state_delta)` without drift.
3. Integration dry-run against the `red-bunny` bundle: invoke `plan_story_state_maintenance` to add a synthetic SREL maintenance record (without committing); inspect the returned envelope; confirm it contains a maintenance PG; mentally apply the maintenance PG → confirm the next turn-cycle envelope built from the maintenance PG passes `snapshot_replay_equality`. (No actual commit required.)
4. `bash scripts/build-all.sh && bash scripts/check-all.sh` — full-pipeline build + test verification.

### Invariants

1. Every accepted maintenance envelope MUST include a `create_pg_record` op whose `state_snapshot.active_records[]` includes every record the envelope's `create_*_record` ops emit. (FOUNDATIONS §4a fork-primitive invariant.)
2. Every accepted maintenance envelope MUST include a `create_se_record` op with `event_kind: audit_repair | system_repair` that grounds the new PG (per shared story-state contract §4.3a audit-only SE shape).
3. The maintenance PG's `validation_trace` MUST include one PASS entry per shared hard gate per `.claude/skills/_shared-templates/story-state-contract.md` §7, each with a one-line rationale per `AGENTS.md`.
4. The maintenance PG MUST NOT emit choices (`emitted_choices = []`); the next real turn-cycle inherits the parent's choice surface.
5. The maintenance envelope MUST NOT advance `canon_revision`; maintenance does not change world canon.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/test/tools/plan-story-state-maintenance.spec.ts` — envelope-shape test verifying `create_pg_record` is emitted with correct snapshot replay; rationale: covers the new envelope contract end-to-end.
2. `tools/validators/test/structural/snapshot-replay-equality.spec.ts` — regression test confirming a maintenance-PG envelope passes the validator (uses a synthetic in-memory bundle fixture rather than a real bundle).
3. `tools/world-mcp/test/tools/plan-story-state-maintenance.spec.ts` — input-validation test confirming the missing `parent_page_id` input produces an `invalid_input` error before any allocation runs.

### Commands

1. `cd tools/world-mcp && npm test -- plan-story-state-maintenance` — targeted maintenance-tool test pass.
2. `cd tools/validators && npm test -- snapshot-replay-equality` — targeted validator regression test pass.
3. `bash scripts/build-all.sh && bash scripts/check-all.sh` — full-pipeline build + test verification.
4. `node tools/world-mcp/dist/src/cli/validate-patch-plan.js <hand-built next-turn-cycle envelope against a freshly-committed maintenance PG fixture>` — integration regression confirming the maintenance PG feeds `snapshot_replay_equality` cleanly on the next turn-cycle.
