# CBAUTH-003: Operationalize cast-role coverage "engages that role's authoring lane" for all five pressure-bearing roles, not just offstage pressure_source

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — docs/skill only: `.claude/skills/commitment-block-authoring/references/phase-1-coverage-diagnosis.md` (no validator, tool, hook, or schema change)
**Deps**: None

## Problem

Phase 1 coverage target #15 (Cast-role coverage) says: "for each active `STENT` whose `role_in_story` includes a pressure-bearing role (`pressure_source`, `opposing_actor`, `authority`, `dependent`, or `information_source`), the bundle SLT pool should carry at least one block that engages that role's authoring lane." It then operationalizes "engages" concretely for **only one** of the five roles — offstage `pressure_source` (intrusion-shaped `world_pressure`, looms-without-arriving-shaped `status_shift`, pursuit-shaped `pursuit` families). The other four roles (`opposing_actor`, `authority`, `dependent`, `information_source`) get no concrete cue, so the diagnosis is non-deterministic: two operators with the same bundle pool would diagnose role coverage differently.

Observed on the 2026-05-30 red-bunny SLB-4 run: STENT-3 (Marisa) carries `pressure_source, authority`. For `authority` coverage I had to judge whether SLT-23 ("The unmet duty pulls you back" — `any_obligation_open(owed_by_role=dependent)`) "engaged" the authority lane indirectly through its implied counterparty. Both readings (narrow: must use `participant_role=authority` filter; broad: any block that addresses the role's implied dynamic counts) were defensible. I judged broadly and added SLT-29 ("The authority's reach extends") to surface the lane explicitly anyway — but the diagnosis itself was operator-dependent, not skill-deterministic.

The asymmetry is structural: the reference takes the trouble to operationalize one role's lane and leaves the other four to operator judgment. This is the determinism gap.

## Assumption Reassessment (2026-05-30)

1. `.claude/skills/commitment-block-authoring/references/phase-1-coverage-diagnosis.md:21` defines target #15 with concrete authoring-shape cues only for offstage `pressure_source` ("intrusion-shaped (`world_pressure` family), looms-without-arriving-shaped (`status_shift` family), or pursuit-shaped (`pursuit` family) blocks"). Verified by direct Read this session. The other four pressure-bearing roles in the same enumeration (`opposing_actor`, `authority`, `dependent`, `information_source`) are not operationalized.
2. The `role_in_story` enum (12 values, including the 5 pressure-bearing roles named here) lives in `.claude/skills/_shared-templates/story-record-schemas.md` §4.4b (STENT role taxonomy). Verified — each role has an operational definition there that names its authoring-lane shape (e.g., "authority" = "The entity can grant, deny, enforce, or legitimate permissions and consequences"; "information_source" = "The entity is a likely source of branch-relevant knowledge"; "dependent" = "The entity's safety, access, or agency depends on another actor or institution"). The §4.4b operational definitions are the raw material this ticket consumes into Phase 1 authoring-shape cues — no new role semantics are invented.
3. Shared boundary under audit: the `phase-1-coverage-diagnosis.md` cast-role coverage target #15 and the §4.4b STENT role taxonomy. This ticket aligns the Phase 1 prose with the role definitions already in §4.4b; it does not change role semantics or the `STENT.role_in_story` schema.
4. FOUNDATIONS principle under audit: §Story Bundles §6.1 (Story-Local Character Authority) — pressure-bearing roles are the authoring surface through which a story's cast shapes the pool's authoring lanes; underspecified cast-role coverage diagnosis means a pressure-bearing role can sit unrepresented in the pool without detection. Also §Tooling Recommendation determinism property: the diagnosis must produce the same result for the same inputs.
5. Adjacent contradiction classification: CBAUTH-002 added grounding-strength + under-representation semantics to the coverage diagnosis (Phase 1's quantitative axis); this ticket completes Phase 1's qualitative axis on the cast-role target. Required-consequence pairing, not a separate bug. The SPEC-42 conditional-target carve-out for absent record classes is preserved (a cast with zero active actors in a role is neither gap nor under-represented).
6. Out-of-scope creep guard: this ticket does NOT add a Phase 4 batch-diversity gate keyed on role-coverage (cast-role coverage stays a Phase 1 lens, not a Phase 4 hard gate, parallel to CBAUTH-002's grounding-strength-is-guidance-not-gate position). Nor does it extend the `STENT.role_in_story` schema or add a new predicate. Pure prose elaboration of Phase 1 target #15.

## Architecture Check

1. Cleaner than alternatives: per-role authoring-shape cues live in the same reference subsection that already operationalizes `pressure_source` — the lowest-blast-radius fix and the location any operator already reading target #15 will see. The alternative — a Phase 4 batch-diversity gate that hard-fails a batch for missing role coverage — over-constrains authoring (a role's lane is sometimes deliberately deferred to a JIT block at turn-cycle time) and runs counter to the existing Phase 4 contract (move-family / recovery / belief-or-relationship / no-branch-local-deps; cast roles never were a Phase 4 axis).
2. No backwards-compatibility aliasing/shims introduced: the change is prose elaboration within one reference subsection. No predicate, schema, validator, or hook touched.

## Verification Layers

1. Invariant: each of the five pressure-bearing roles in target #15 has a concrete authoring-shape cue, paralleling the existing offstage `pressure_source` triple → codebase grep-proof (`phase-1-coverage-diagnosis.md` target #15 names per-role shapes; the prose enumerates them).
2. Invariant: the per-role shapes consume §4.4b operational role definitions rather than inventing new semantics → FOUNDATIONS alignment check (each per-role shape cites the corresponding §4.4b operational definition or its predicate-DSL realization, e.g., `any_obligation_open(owed_by_role=dependent)` for the `dependent` lane).
3. Invariant: same inputs → same diagnosis across operators → skill dry-run (re-invoke Phase 1 diagnosis on `erotica-world / red-bunny` with the now-31-block pool; confirm that target #15's per-role coverage classification is reproducible from the prose, with the `authority` lane on STENT-3 explicitly diagnosed as engaged via SLT-29 / SLT-23 or unengaged, never operator-dependent).

## What to Change

### 1. Operationalize the four remaining pressure-bearing roles in target #15

In `.claude/skills/commitment-block-authoring/references/phase-1-coverage-diagnosis.md` target #15, after the existing offstage `pressure_source` triple, add concrete authoring-shape cues for each of the four remaining roles. Suggested shape (consumed from §4.4b operational role definitions):

- **`opposing_actor`** (entity actively resists or pressures a primary actor's goals): engaged by `conflict` / `pursuit` / `opposition` move-family blocks that hard-gate on a `THR` / `SREL(axis=hostility)` / `STINT` of the opposing actor, or by `any_relationship_axis(axis=hostility, comparator=">=", value=medium)` existential predicates.
- **`authority`** (entity can grant, deny, enforce, or legitimate permissions and consequences): engaged by `world_pressure` / `ritual_protocol` / `status_shift` blocks that hard-gate on a `THR` carrying the authority's reach, an `OBL` owed to the authority, or `any_relationship_axis(axis=power_imbalance | obligation | approval, participant_role=authority)` predicates.
- **`dependent`** (entity whose safety, access, or agency depends on another actor or institution): engaged by `protection` / `negotiation` / `evasion` blocks that hard-gate on `any_intention(holder_role=dependent)`, `any_obligation_open(owed_by_role=dependent)`, or `any_belief(holder_role=dependent)` predicates.
- **`information_source`** (entity is a likely source of branch-relevant knowledge): engaged by `investigation` / `disclosure` blocks that hard-gate on `any_secret_unrevealed` (when the source carries an STSEC), `any_belief(holder_role=information_source, mode=knows|believes)`, or exact `belief_record(holder, BEL-N)` predicates.

Then state the determinism rule plainly: a role lane is *engaged* when at least one pool SLT names the role in a precondition role-filter (`holder_role` / `owed_by_role` / `owed_to_role` / `participant_role`), or when an exact `record_active(...)` or hard predicate over the role's defining record-class is present. Implied engagement through a counterparty role (e.g., `owed_by_role=dependent` is **not** treated as engagement of the implicit `authority` counterparty) is NOT engagement; surface the unengaged role explicitly in the diagnosis. This converts the §6.1-aware diagnosis from a judgment call to a mechanical check against the pool projection's `preconditions[]` fields already loaded at pre-flight step 4(i).

### 2. Add a worked example mirroring the SLB-4 case

Add a short worked example in the target #15 prose: STENT-3 carries `pressure_source, authority`; pool SLT-23 hard-gates on `any_obligation_open(owed_by_role=dependent)` (so STENT-2's dependent role is engaged) but does NOT name `authority` in a role-filter (so STENT-3's authority role is unengaged); diagnosis = `dependent` engaged, `authority` unengaged. The example makes the per-role determinism rule unambiguous on a real bundle's pool.

## Files to Touch

- `.claude/skills/commitment-block-authoring/references/phase-1-coverage-diagnosis.md` (modify)

## Out of Scope

- Any Phase 4 batch-diversity gate keyed on role coverage (cast-role coverage remains a Phase 1 lens, parallel to CBAUTH-002's authoring-guidance-not-gate stance).
- Any change to `STENT.role_in_story` schema, predicate DSL role-filter semantics, or the `_shared-templates/story-record-schemas.md` §4.4b role taxonomy.
- Any new validator. The diagnosis remains a skill-procedure concern.
- Coverage targets #1–#14, #16, #17 (CBAUTH-002 already gave them grounding-strength; this ticket touches only #15).

## Acceptance Criteria

### Tests That Must Pass

1. `grep -n "opposing_actor\|authority\|dependent\|information_source" .claude/skills/commitment-block-authoring/references/phase-1-coverage-diagnosis.md` returns the four newly-operationalized per-role authoring-shape cues, distinct from the existing offstage `pressure_source` triple at line ~21.
2. `grep -n "engaged" .claude/skills/commitment-block-authoring/references/phase-1-coverage-diagnosis.md` returns the determinism rule ("a role lane is engaged when at least one pool SLT names the role in a precondition role-filter ..."), plus the worked-example sentence anchoring it on a real bundle.
3. Skill dry-run: re-invoke commitment-block-authoring `direct_batch --target_count 0` (diagnosis-only path, or any `target_count`) on `erotica-world / red-bunny` post-SLB-4 (31-block pool); confirm target #15 diagnosis names each of STENT-1/2/3's pressure-bearing roles by id, classifies each as engaged / unengaged via the per-role cue, and the result is reproducible from the prose alone (operator-independent).

### Invariants

1. Target #15 diagnosis is deterministic — the same pool projection + active STENT/role state produces the same engaged/unengaged verdict across runs (FOUNDATIONS §Tooling Recommendation determinism property).
2. The per-role authoring-shape cues consume §4.4b operational definitions and do not invent new role semantics or new predicate-DSL constructs (FOUNDATIONS §Story Bundles §6.1 + shared contract §5 closed predicate DSL).
3. Cast-role coverage stays a Phase 1 lens (authoring guidance + diagnosis disclosure); no Phase 4 batch-diversity gate is added (consistent with the CBAUTH-002 precedent that batch-property checks remain skill-procedure).

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `grep -n "opposing_actor\|^.*authority\|dependent\|information_source\|engaged" .claude/skills/commitment-block-authoring/references/phase-1-coverage-diagnosis.md`
2. Skill dry-run: invoke commitment-block-authoring Phase 1 on red-bunny post-SLB-4 and inspect the working-memory `coverage_diagnosis` for target #15 against the new prose; confirm operator-independence by reading the prose cold and checking the verdict.
3. A grep + skill-dry-run boundary is correct here because the change is authoring-guidance prose with no envelope/schema/validator surface to exercise; the dry-run confirms the per-role cues produce a reproducible diagnosis on a real saturated pool.
