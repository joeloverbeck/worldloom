# BSBOOT-013: Strengthen gate 11 with simulated post-choice continuation validation

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: None — `branching-story-bootstrap/references/phase-8-choice-generation.md` and `references/phase-9-validation-gates.md` only. The `continuation_capacity` block is a CHC-record metadata addition; story-bundle JSON schemas are permissive (`tools/validators/src/schemas/story-choice.schema.json`).
**Deps**: `archive/tickets/BSBOOT-008.md` (gate 12 broadens to PG-0001 closure root, which the new `continuation_capacity` field extends).

## Problem

`references/phase-8-choice-generation.md:45` and gate 11 (`references/phase-9-validation-gates.md:19`) currently require:

> "Every emitted CHC has at least one continuation storylet (in seed pool or `jit_generatable`)"

This catches the most-blatant dead-end case (a CHC with literally no continuation storylet anywhere) but does NOT validate that the named continuation actually MATCHES the post-choice state. A CHC can satisfy the existence check while:

- pointing to a continuation SLT whose `hard_preconds` would not pass after the choice's `minimum_state_change` lands;
- pointing to a continuation SLT whose `cast_requirements` reference an entity not in `cast_present` after the choice's actor moves;
- pointing to a continuation SLT whose `location_requirements` exclude the post-choice `current_location`;
- pointing to a continuation SLT whose `mystery_safety` would resolve a `forbidden`-status M after the choice's `likely_effects` reveal a fact.

The runtime page-cycle catches these at the next tick (its Phase 3 consequence-capacity check + Phase 4 eligibility filter), but by then the CHC has already been offered to the user. The bootstrap-time gate should be at least as strong as the runtime check.

## Assumption Reassessment (2026-05-06)

1. `references/phase-8-choice-generation.md:45` — verified weak existence check.
2. `references/phase-9-validation-gates.md:19` — verified gate 11 wording.
3. `branching-story-page-cycle/references/phase-2-3-impact-and-feasibility.md:71` and `phase-4-storylet-and-mystery-authority.md:41` — verified the runtime's stricter check exists. Bootstrap should mirror this.
4. Cross-skill / cross-artifact boundary: gate 11 lives on the bootstrap; the page-cycle inherits the `continuation_capacity` block on PG-0001's CHC records when the runtime forks. The block is forward-compatible with page-cycle's Phase 3 consequence-capacity check.
5. FOUNDATIONS / hard-gate principle: this strengthens Rule 5 (No Consequence Evasion) at the bootstrap-time gate. Phase 9's HARD-GATE per-gate-PASS-with-rationale discipline is preserved.
6. Schema-extension classification: `continuation_capacity` is a NEW optional CHC field. Story-bundle JSON schemas are permissive (`additionalProperties: true`); no validator change required. The block carries enough structure that a future strict validator (BSBOOT-015) can cross-check the named storylet ids resolve.
7. Adjacency to BSBOOT-008: gate 12's broadened closure traverses CHC's effect graph; `continuation_capacity.valid_seed_storylets` is a new edge in that graph that gate 12 will traverse. The two tickets compose naturally.

## Architecture Check

1. **Why cleaner**: a CHC that "has a continuation by name" but doesn't pass post-choice state validation is functionally a dead-end at runtime. Bootstrap-time gate 11 should fail those cases, not just the absent-name cases.
2. **Alternative considered**: deferring the check entirely to the runtime page-cycle (Phase 3 catches it on the next tick). Rejected: the user has already seen and chosen the CHC by then; the bootstrap's contract is "every emitted CHC is a real path forward".
3. No backwards-compatibility shim. The `continuation_capacity` field is required on all new CHCs; gate 11's stricter form fires for them.

## Verification Layers

1. CHC schema in `templates/story-records.yaml` declares the new `continuation_capacity` block → codebase grep-proof.
2. Phase 8 reference describes how the bootstrap simulates the post-choice state delta → manual review.
3. Gate 11 wording requires the new block to be populated and validated → codebase grep-proof.
4. Cross-skill — `branching-story-page-cycle` Phase 8 (Amendment B Pipeline, which bootstrap delegates to) emits the same `continuation_capacity` block → codebase grep-proof in `phase-8-choice-generation.md` (page-cycle's reference, if reused) or page-cycle SKILL.md.

## What to Change

### 1. `.claude/skills/branching-story-bootstrap/templates/story-records.yaml`

- CHC example block (lines 352-385): add a `continuation_capacity` field after `likely_effects`:

  ```yaml
  continuation_capacity:
    post_choice_delta:
      facts_added_or_changed: []        # SF-NNNN ids that change after this CHC's minimum_state_change
      obligations_changed: []           # OBL-NNNN ids whose status / salience would shift
      location_changed: null            # null if no location change; STLOC-NNNN id if changed
      cast_present_changed: []          # STENT ids that enter or leave cast_present
      mystery_resolution_risk: []       # M-NNNN ids whose safety status the post-choice state would test
    valid_seed_storylets: []            # SLT-NNNN ids whose hard_preconds + cast_requirements + location_requirements + mystery_safety all pass under the post-choice delta
    jit_shape_spec: null                # one-line shape sketch when no seed-pool storylet matches; null if valid_seed_storylets is non-empty
    validation_basis: ""                # one-line: "hard_preconds satisfied after simulated minimum_state_change with cast_present + location + mystery_safety updates"
  ```

  Either `valid_seed_storylets` is non-empty OR `jit_shape_spec` is populated; both empty is a gate-11 fail.

### 2. `.claude/skills/branching-story-bootstrap/references/phase-8-choice-generation.md`

- Replace the §Consequence-capacity check section (lines 43-47) with:

  ```
  ## Consequence-capacity check (gate 11 backstop)

  Every emitted CHC must populate `continuation_capacity`:

  1. Compute `post_choice_delta` from the CHC's `choice_contract.minimum_state_change` + `likely_effects`. Sketch:
     - facts_added_or_changed: SFs whose value or epistemic_class would change.
     - obligations_changed: OBLs whose status (open/paid_off/abandoned/failed) or salience would shift.
     - location_changed: the new `current_location` if the CHC moves the actor.
     - cast_present_changed: STENTs that enter or leave the room.
     - mystery_resolution_risk: M-NNNN ids whose safety the post-choice prose would test.
  2. For each candidate seed-pool SLT, check whether its `hard_preconds`, `cast_requirements`, `location_requirements`, and `mystery_safety` ALL pass under the post-choice delta. The candidate enters `valid_seed_storylets` if all four pass.
  3. If `valid_seed_storylets` is empty, populate `jit_shape_spec` with a one-line sketch of the storylet shape the runtime would need to JIT-author (per the page-cycle's `storylet-pool-authoring mode=jit` path).
  4. Record `validation_basis` as a one-line rationale ("hard_preconds satisfied after simulated minimum_state_change with cast_present + location + mystery_safety updates").

  A CHC where `valid_seed_storylets` is empty AND `jit_shape_spec` is null is a dead-end — halt and re-derive the choice.
  ```

### 3. `.claude/skills/branching-story-bootstrap/references/phase-9-validation-gates.md`

- Replace gate 11's "Check" cell:

  **Before:** "Every emitted CHC has at least one continuation storylet (in seed pool or `jit_generatable`)"

  **After:** "Every emitted CHC's `continuation_capacity` block is populated AND either `valid_seed_storylets` is non-empty (each named SLT's `hard_preconds`, `cast_requirements`, `location_requirements`, and `mystery_safety` pass under the post-choice delta) OR `jit_shape_spec` is non-empty (with a one-line shape sketch)"

## Files to Touch

- `.claude/skills/branching-story-bootstrap/templates/story-records.yaml` (modify)
- `.claude/skills/branching-story-bootstrap/references/phase-8-choice-generation.md` (modify)
- `.claude/skills/branching-story-bootstrap/references/phase-9-validation-gates.md` (modify)

## Out of Scope

- Implementing a programmatic post-choice-delta simulator in code. The simulation is operator-discipline at bootstrap; the runtime page-cycle has its own (broader) Phase 3 consequence-capacity check.
- Editing `branching-story-page-cycle` Phase 8 (Amendment B Pipeline) wholesale. Page-cycle's Phase 8 is reused; bootstrap's call site adds the `continuation_capacity` requirement on top of what page-cycle already produces. If page-cycle later adopts the same block, that becomes its own ticket.
- Migration of existing bundles' CHCs.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -nE "continuation_capacity" .claude/skills/branching-story-bootstrap/templates/story-records.yaml .claude/skills/branching-story-bootstrap/references/phase-8-choice-generation.md .claude/skills/branching-story-bootstrap/references/phase-9-validation-gates.md` returns matches in all three files.
2. `grep -nE "valid_seed_storylets|jit_shape_spec|post_choice_delta" .claude/skills/branching-story-bootstrap/` returns matches in the template and Phase 8 reference.
3. Gate 11's wording requires the broader check, not just the existence check.
4. The CHC `continuation_capacity` block is structurally consistent with the page-cycle's Phase 3 / Phase 4 consequence-capacity discipline (manual cross-read).

### Invariants

1. Every emitted CHC carries a `continuation_capacity` block.
2. Either `valid_seed_storylets` is non-empty OR `jit_shape_spec` is non-empty — both empty is a gate-11 fail.
3. Gate 11 records PASS only with a one-line rationale citing the validation_basis.

## Test Plan

### New/Modified Tests

1. None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.

### Commands

1. `grep -rn "continuation_capacity" .claude/skills/` — surfaces every documented usage.
2. (Manual) walk through three hypothetical CHCs against a sample storylet pool: (a) all-pass case (valid_seed_storylets has 3 entries); (b) jit-shape-only case (no seed matches but the JIT shape is spelled); (c) dead-end case (both empty) and verify gate 11 fails it.
