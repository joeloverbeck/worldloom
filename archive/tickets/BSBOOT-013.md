# BSBOOT-013: Strengthen gate 11 with simulated post-choice continuation validation

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: None — `branching-story-bootstrap/templates/story-records.yaml`, `references/phase-8-choice-generation.md`, and `references/phase-9-validation-gates.md` only. The `continuation_capacity` block is a CHC-record metadata addition; story-bundle JSON schemas are permissive (`tools/validators/src/schemas/story-choice.schema.json`).
**Deps**: `archive/tickets/BSBOOT-008.md` (gate 12 broadens to PG-0001 closure root, which the new `continuation_capacity` field extends).

## Problem

At intake, `references/phase-8-choice-generation.md` and gate 11 (`references/phase-9-validation-gates.md`) required:

> "Every emitted CHC has at least one continuation storylet (in seed pool or `jit_generatable`)"

That caught the most-blatant dead-end case (a CHC with literally no continuation storylet anywhere) but did NOT validate that the named continuation actually MATCHED the post-choice state. A CHC could satisfy the existence check while:

- pointing to a continuation SLT whose `hard_preconds` would not pass after the choice's `minimum_state_change` lands;
- pointing to a continuation SLT whose `cast_requirements` reference an entity not in `cast_present` after the choice's actor moves;
- pointing to a continuation SLT whose `location_requirements` exclude the post-choice `current_location`;
- pointing to a continuation SLT whose `mystery_safety` would resolve a `forbidden`-status M after the choice's `likely_effects` reveal a fact.

The runtime page-cycle catches these at the next tick (its Phase 3 consequence-capacity check + Phase 4 eligibility filter), but by then the CHC has already been offered to the user. This ticket makes the bootstrap-time gate stricter by requiring each emitted CHC to carry a simulated post-choice continuation-capacity record.

## Assumption Reassessment (2026-05-06)

1. `references/phase-8-choice-generation.md` — verified the pre-ticket weak existence check.
2. `references/phase-9-validation-gates.md` — verified the pre-ticket gate 11 wording.
3. `branching-story-page-cycle/references/phase-2-3-impact-and-feasibility.md` and `phase-4-storylet-and-mystery-authority.md` — verified the runtime's stricter consequence-capacity, JIT, and mystery-safety discipline. Bootstrap now mirrors the relevant parts at CHC-emission time.
4. Cross-skill / cross-artifact boundary: gate 11 lives on bootstrap CHC production. The live page-cycle Phase 8 does not yet emit `continuation_capacity`; bootstrap adds it as a stricter startup-time requirement while cross-reading page-cycle Phase 3 / Phase 4 consequence-capacity discipline for semantic alignment.
5. FOUNDATIONS / hard-gate principle: this strengthens Rule 5 (No Consequence Evasion) at the bootstrap-time gate. Phase 9's HARD-GATE per-gate-PASS-with-rationale discipline is preserved.
6. Schema-extension classification: `continuation_capacity` is a NEW optional CHC field. Story-bundle JSON schemas are permissive (`additionalProperties: true`); no validator change required. The block carries enough structure for the active BSBOOT-015 bootstrap-discipline validator follow-up to cross-check named storylet ids.
7. Adjacency to BSBOOT-008: gate 12's broadened closure traverses CHC's effect graph; `continuation_capacity.valid_seed_storylets` is a new CHC-hosted reference surface for that broader PG-0001 closure discipline. The two tickets compose naturally.
8. Reassessment correction: page-cycle Phase 8 is not edited in this ticket and is not a proof target for field emission. It remains the delegated CHC-production authority and runtime comparison surface; bootstrap's Phase 8 reference and template carry the added block.

## Architecture Check

1. **Why cleaner**: a CHC that "has a continuation by name" but doesn't pass post-choice state validation is functionally a dead-end at runtime. Bootstrap-time gate 11 should fail those cases, not just the absent-name cases.
2. **Alternative considered**: deferring the check entirely to the runtime page-cycle (Phase 3 catches it on the next tick). Rejected: the user has already seen and chosen the CHC by then; the bootstrap's contract is "every emitted CHC is a real path forward".
3. No backwards-compatibility shim. The `continuation_capacity` field is required on all new CHCs; gate 11's stricter form fires for them.

## Verification Layers

1. CHC schema in `templates/story-records.yaml` declares the new `continuation_capacity` block → codebase grep-proof.
2. Phase 8 reference describes how the bootstrap simulates the post-choice state delta → manual review.
3. Gate 11 wording requires the new block to be populated and validated → codebase grep-proof.
4. Cross-skill — bootstrap `continuation_capacity` wording remains structurally consistent with page-cycle Phase 3 / Phase 4 consequence-capacity and JIT discipline → manual cross-read.

## Landed Changes

### 1. `.claude/skills/branching-story-bootstrap/templates/story-records.yaml`

- Added a `continuation_capacity` field after `likely_effects` in the CHC example block:

  ```yaml
  continuation_capacity:
    post_choice_delta:
      facts_added_or_changed: []        # SF-NNNN ids changed by minimum_state_change / likely_effects
      obligations_changed: []           # OBL-NNNN ids whose status or salience would shift
      location_changed: null            # null if no move; STLOC-NNNN id if current_location changes
      cast_present_changed: []          # STENT-NNNN ids entering or leaving cast_present
      mystery_resolution_risk: []       # M-NNNN ids whose safety status the post-choice state tests
    valid_seed_storylets: []            # SLT-NNNN ids whose hard_preconds/cast/location/mystery checks pass under the post-choice delta
    jit_shape_spec: null                # one-line JIT continuation sketch when no seed SLT matches
    validation_basis: ""                # one-line rationale for the accepted seed or JIT continuation path
  ```

  Either `valid_seed_storylets` is non-empty OR `jit_shape_spec` is populated; both empty is a gate-11 fail.

### 2. `.claude/skills/branching-story-bootstrap/references/phase-8-choice-generation.md`

- Replaced the consequence-capacity section with a gate-11 backstop requiring every emitted CHC to compute `post_choice_delta`, validate seed-pool SLTs against hard preconditions / cast / location / mystery safety, populate `jit_shape_spec` when no seed storylet matches, and record `validation_basis`.

### 3. `.claude/skills/branching-story-bootstrap/references/phase-9-validation-gates.md`

- Replaced gate 11's "Check" cell:

  **Before:** "Every emitted CHC has at least one continuation storylet (in seed pool or `jit_generatable`)"

  **After:** "Every emitted CHC's `continuation_capacity` block is populated AND either `valid_seed_storylets` is non-empty (each named SLT's `hard_preconds`, `cast_requirements`, `location_requirements`, and `mystery_safety` pass under the post-choice delta) OR `jit_shape_spec` is non-empty (with a one-line shape sketch)"

## Files to Touch

- `.claude/skills/branching-story-bootstrap/templates/story-records.yaml` (modify)
- `.claude/skills/branching-story-bootstrap/references/phase-8-choice-generation.md` (modify)
- `.claude/skills/branching-story-bootstrap/references/phase-9-validation-gates.md` (modify)

## Out of Scope

- Implementing a programmatic post-choice-delta simulator in code. The simulation is operator-discipline at bootstrap; the runtime page-cycle has its own (broader) Phase 3 consequence-capacity check.
- Editing `branching-story-page-cycle` Phase 8 (Amendment B Pipeline) wholesale. Page-cycle's Phase 8 is reused as the CHC-production authority; bootstrap's call site adds the `continuation_capacity` requirement on top of the delegated output. If page-cycle later adopts the same block directly, that becomes its own ticket.
- Migration of existing bundles' CHCs.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -nE "continuation_capacity" .claude/skills/branching-story-bootstrap/templates/story-records.yaml .claude/skills/branching-story-bootstrap/references/phase-8-choice-generation.md .claude/skills/branching-story-bootstrap/references/phase-9-validation-gates.md` returns matches in all three files.
2. `grep -nRE "valid_seed_storylets|jit_shape_spec|post_choice_delta" .claude/skills/branching-story-bootstrap/` returns matches in the template, Phase 8 reference, and gate 11.
3. `rg -n 'Every emitted CHC has at least one continuation storylet|jit_generatable' .claude/skills/branching-story-bootstrap/references/phase-8-choice-generation.md .claude/skills/branching-story-bootstrap/references/phase-9-validation-gates.md` returns no matches.
4. Manual cross-read confirms the CHC `continuation_capacity` block is structurally consistent with the page-cycle's Phase 3 / Phase 4 consequence-capacity discipline.

### Invariants

1. Every emitted CHC carries a `continuation_capacity` block.
2. Either `valid_seed_storylets` is non-empty OR `jit_shape_spec` is non-empty — both empty is a gate-11 fail.
3. Gate 11 records PASS only with a one-line rationale citing the validation_basis.

## Test Plan

### New/Modified Tests

1. None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.

### Commands

1. `grep -nE "continuation_capacity" .claude/skills/branching-story-bootstrap/templates/story-records.yaml .claude/skills/branching-story-bootstrap/references/phase-8-choice-generation.md .claude/skills/branching-story-bootstrap/references/phase-9-validation-gates.md`
2. `grep -nRE "valid_seed_storylets|jit_shape_spec|post_choice_delta" .claude/skills/branching-story-bootstrap/`
3. `rg -n 'Every emitted CHC has at least one continuation storylet|jit_generatable' .claude/skills/branching-story-bootstrap/references/phase-8-choice-generation.md .claude/skills/branching-story-bootstrap/references/phase-9-validation-gates.md`
4. Manual cross-read: walk through three hypothetical CHCs against a sample storylet pool: (a) all-pass case (`valid_seed_storylets` has 3 entries); (b) JIT-shape-only case (no seed matches but `jit_shape_spec` is populated); (c) dead-end case (both empty) and verify gate 11 fails it.

## Outcome

Completed. Bootstrap CHC records now carry `continuation_capacity`, Phase 8 describes how to simulate the post-choice delta and validate seed/JIT continuations, and Phase 9 gate 11 now fails CHCs whose continuation-capacity block is absent or empty on both the seed-storylet and JIT-shape paths.

## Verification Result

1. `grep -nE "continuation_capacity" .claude/skills/branching-story-bootstrap/templates/story-records.yaml .claude/skills/branching-story-bootstrap/references/phase-8-choice-generation.md .claude/skills/branching-story-bootstrap/references/phase-9-validation-gates.md` — pass; all three owned files contain the new field/gate wording.
2. `grep -nRE "valid_seed_storylets|jit_shape_spec|post_choice_delta" .claude/skills/branching-story-bootstrap/` — pass; the template, Phase 8 reference, and gate 11 expose the required fields.
3. `rg -n 'Every emitted CHC has at least one continuation storylet|jit_generatable' .claude/skills/branching-story-bootstrap/references/phase-8-choice-generation.md .claude/skills/branching-story-bootstrap/references/phase-9-validation-gates.md` — pass; exited 1 with no matches, confirming the old bootstrap existence-only wording is gone from the edited gate surfaces.
4. Manual cross-read — pass; FOUNDATIONS Rule 5 at story scope requires per-page consequence capacity, page-cycle Phase 3 checks post-event continuation feasibility and required aftermath, and page-cycle Phase 4 defines the JIT path plus mystery-safety discipline mirrored by the bootstrap `continuation_capacity` fields.
5. Manual three-case walk-through — pass; (a) populated `valid_seed_storylets` passes when all four seed checks pass, (b) empty seed matches with non-empty `jit_shape_spec` passes as JIT-continuable, and (c) both empty fails gate 11 as a dead-end.

## Deviations

- Reassessment corrected the drafted cross-skill proof: page-cycle Phase 8 does not emit `continuation_capacity` today. This ticket did not edit page-cycle; it added the stricter bootstrap requirement and used page-cycle Phase 3 / Phase 4 as the manual alignment surface.
