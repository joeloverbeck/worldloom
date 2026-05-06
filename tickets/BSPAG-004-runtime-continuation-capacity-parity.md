# BSPAG-004: Propagate CHC continuation-capacity parity to runtime page-cycle and health audit

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes - downstream story-skill contract prose only (`branching-story-page-cycle` and `branching-story-health-audit`). No JSON-schema, validator, patch-engine, world-content, `storylet-pool-authoring`, or `story-fact-promotion-to-canon` code change.
**Deps**: archive/tickets/BSBOOT-013.md (introduces the CHC `continuation_capacity` block and strengthened bootstrap gate 11); archive/tickets/BSPAG-001-extend-storylet-pool-authoring-with-jit-mode-and-delegate-page-cycle-jit.md (page-cycle JIT continuation path exists and delegates to `storylet-pool-authoring mode=jit`).

## Problem

BSBOOT-013 strengthened bootstrap CHCs so every emitted choice records a `continuation_capacity` block: simulated `post_choice_delta`, matching `valid_seed_storylets`, JIT fallback shape, and `validation_basis`. Runtime `branching-story-page-cycle` is the other CHC producer, but its live Phase 8 / Phase 9 / CHC schema prose still uses the older existence-only contract:

- `branching-story-page-cycle/references/phase-8-choice-generation.md` says consequence-capacity is "at least one storylet (existing or JIT-probable) continues from the post-state" and its CHC record example omits `continuation_capacity`.
- `branching-story-page-cycle/references/phase-9-validation-gates.md` gate 9 still says "Every emitted CHC has at least one continuation path (storylet-or-JIT)".
- `branching-story-page-cycle/references/record-schemas.md` says CHC schema is reproduced in Phase 8 but does not name the new block.
- `branching-story-health-audit` consumes PG / SE / CHC records and audits recursive closure, consequence-ledger coverage, and terminal/dead-end health, but does not currently inspect CHC `continuation_capacity` for missing blocks, unresolved `valid_seed_storylets`, empty JIT shapes, or stale branch references inside the new block.

That leaves a split contract: bootstrap-created root choices are stricter than runtime-created later-page choices, and audit cannot detect the same class of "choice appeared viable but had no state-valid continuation" defect in persisted runtime CHCs.

## Assumption Reassessment (2026-05-06)

1. `.claude/skills/branching-story-page-cycle/references/phase-8-choice-generation.md` currently emits CHC records without `continuation_capacity`; Step 3 only requires an existing/JIT-probable continuation.
2. `.claude/skills/branching-story-page-cycle/references/phase-9-validation-gates.md` gate 9 still has existence-only wording, not the BSBOOT-013 post-choice delta / valid-seed / JIT-shape requirement.
3. Cross-skill / cross-artifact boundary: CHC records are produced by `branching-story-bootstrap` and `branching-story-page-cycle`; `branching-story-health-audit` consumes those records as a read-only reviewer; `storylet-pool-authoring` produces SLT records / choice templates, not CHC records; `story-fact-promotion-to-canon` reads source facts, mystery-resolution events, and supporting prose, not CHC continuation-capacity metadata.
4. FOUNDATIONS principle: Rule 5 at story scope says every page must leave at least one continuation storylet eligible. Runtime CHC production should preserve the same consequence-capacity evidence that bootstrap now records.
5. HARD-GATE / Canon Safety Check surface: this ticket strengthens page-cycle Phase 9 gate 9 and health-audit review prose. It must preserve PASS-with-rationale discipline and must not weaken Mystery Reserve firewall or canon-mutation approval behavior.
6. Schema-extension classification: `continuation_capacity` is an additive CHC metadata block. The live story-choice JSON schema remains permissive (`additionalProperties: true`); no validator or patch-engine change is required by this ticket.
7. Downstream consumer decision: `branching-story-page-cycle` should change because it is a downstream CHC producer and validator. `branching-story-health-audit` should change because it consumes persisted CHCs and should audit the new evidence. `storylet-pool-authoring` should not change here because it owns SLT eligibility and `choice_templates`, not emitted CHC continuation proofs. `story-fact-promotion-to-canon` should not change here because promotion provenance may cite the page that emitted a choice, but the skill's authority is canon promotion, not CHC viability auditing.

## Architecture Check

1. The clean design is to make every forward CHC producer record the same continuation-capacity evidence, then let the audit skill inspect that evidence. This avoids a bootstrap-only special case and keeps Rule 5 diagnostics available after the story has advanced.
2. No backwards-compatibility aliasing/shims. Existing bundles may lack the block; health-audit should classify missing `continuation_capacity` on legacy/pre-BSBOOT-013 or pre-BSPAG-004 CHCs as legacy info or warning by bundle age, not mutate them or invent compatibility fields.

## Verification Layers

1. Page-cycle Phase 8 emits `continuation_capacity` with `post_choice_delta`, `valid_seed_storylets`, `jit_shape_spec`, and `validation_basis` -> codebase grep-proof + manual review.
2. Page-cycle Phase 9 gate 9 requires the stronger post-choice capacity check -> codebase grep-proof.
3. Page-cycle record-schema prose names the CHC `continuation_capacity` block -> codebase grep-proof.
4. Health-audit consumes the new CHC block in its recursive closure / consequence-capacity / dead-end checks -> codebase grep-proof + manual review.
5. Non-owner skills remain unchanged -> codebase grep-proof / manual review that `storylet-pool-authoring` and `story-fact-promotion-to-canon` do not acquire CHC-emission responsibilities.

## What to Change

### 1. `.claude/skills/branching-story-page-cycle`

- Update `references/phase-8-choice-generation.md` Step 3 and emitted-CHC example so runtime CHCs populate the same `continuation_capacity` block shape introduced by BSBOOT-013.
- Update `references/phase-9-validation-gates.md` gate 9 to require populated `continuation_capacity` and either non-empty `valid_seed_storylets` whose hard preconditions / cast / location / mystery safety pass under the post-choice delta, or a non-empty `jit_shape_spec`.
- Update `references/record-schemas.md` CHC prose to name `continuation_capacity` as part of the runtime CHC contract.
- Inspect parent `SKILL.md` Phase 8 / Phase 9 summary text; update only if it still implies the old existence-only contract.

### 2. `.claude/skills/branching-story-health-audit`

- Add a read-only audit check for CHC continuation-capacity integrity:
  - missing `continuation_capacity` on new-format CHCs is a finding;
  - both `valid_seed_storylets` empty and `jit_shape_spec` empty is a dead-end finding;
  - `valid_seed_storylets[]` entries must resolve to SLT records legal for the audited branch and remain consistent with recursive closure;
  - `validation_basis` must be non-empty enough to support the PASS rationale trail.
- Update the recursive-reference closure list to include `CHC.continuation_capacity.valid_seed_storylets[]` and any story-local IDs in `post_choice_delta`.
- Keep health-audit read-only; it may propose RSP remediation cards but must not mutate CHC records.

### 3. Explicit non-owner review

- Confirm no changes are needed in `storylet-pool-authoring` for this ticket: it provides SLT records / JIT sub-routine output consumed by page-cycle; it does not emit persisted CHC records.
- Confirm no changes are needed in `story-fact-promotion-to-canon` for this ticket: it may read supporting pages/events for canon promotion but does not validate offered-choice continuation capacity.

## Files to Touch

- `.claude/skills/branching-story-page-cycle/references/phase-8-choice-generation.md` (modify)
- `.claude/skills/branching-story-page-cycle/references/phase-9-validation-gates.md` (modify)
- `.claude/skills/branching-story-page-cycle/references/record-schemas.md` (modify)
- `.claude/skills/branching-story-page-cycle/SKILL.md` (modify only if reassessment finds stale summary wording)
- `.claude/skills/branching-story-health-audit/SKILL.md` (modify)

## Out of Scope

- Editing `branching-story-bootstrap`; BSBOOT-013 already landed the bootstrap side.
- Editing `storylet-pool-authoring` unless reassessment finds a direct CHC-emission claim. Its owned surface is SLT records, `choice_templates`, and JIT storylet output.
- Editing `story-fact-promotion-to-canon` unless reassessment finds a direct CHC continuation-capacity validation claim. Its owned surface is story-to-world canon promotion provenance and Mystery Reserve firewall preservation.
- Adding JSON Schema, validator, patch-engine, or world-content migrations.
- Migrating existing bundles' CHC records.

## Acceptance Criteria

### Tests That Must Pass

1. `rg -n "continuation_capacity|post_choice_delta|valid_seed_storylets|jit_shape_spec|validation_basis" .claude/skills/branching-story-page-cycle/references/phase-8-choice-generation.md .claude/skills/branching-story-page-cycle/references/phase-9-validation-gates.md .claude/skills/branching-story-page-cycle/references/record-schemas.md` shows the runtime producer and gate surfaces.
2. `rg -n "continuation_capacity|valid_seed_storylets|post_choice_delta" .claude/skills/branching-story-health-audit/SKILL.md` shows audit coverage for the persisted CHC block.
3. `rg -n "continuation_capacity" .claude/skills/storylet-pool-authoring .claude/skills/story-fact-promotion-to-canon` returns no matches unless reassessment explicitly proves a same-seam consumer update is needed.
4. Manual review confirms health-audit treats missing blocks on legacy bundles as audit findings or legacy notes, not as a migration instruction.

### Invariants

1. Runtime page-cycle and bootstrap CHC producers share the same forward `continuation_capacity` shape.
2. Health-audit can detect persisted CHCs that lack viable seed/JIT continuation evidence.
3. Storylet-pool-authoring remains the SLT/JIT storylet owner, and story-fact-promotion-to-canon remains the canon-promotion owner; neither gains CHC-emission responsibility.

## Test Plan

### New/Modified Tests

1. None - documentation-only ticket; verification is command-based and manual contract review because these branching-story skills are prose workflow definitions.

### Commands

1. `rg -n "continuation_capacity|post_choice_delta|valid_seed_storylets|jit_shape_spec|validation_basis" .claude/skills/branching-story-page-cycle/references/phase-8-choice-generation.md .claude/skills/branching-story-page-cycle/references/phase-9-validation-gates.md .claude/skills/branching-story-page-cycle/references/record-schemas.md`
2. `rg -n "continuation_capacity|valid_seed_storylets|post_choice_delta" .claude/skills/branching-story-health-audit/SKILL.md`
3. `rg -n "continuation_capacity" .claude/skills/storylet-pool-authoring .claude/skills/story-fact-promotion-to-canon`
4. Manual cross-read against `docs/FOUNDATIONS.md` story-scope Rule 5 and `archive/tickets/BSBOOT-013.md`.
