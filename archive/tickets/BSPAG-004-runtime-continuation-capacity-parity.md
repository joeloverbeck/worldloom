# BSPAG-004: Propagate CHC continuation-capacity parity to runtime page-cycle and health audit

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes - downstream story-skill contract prose only (`branching-story-page-cycle` and `branching-story-health-audit`). No JSON-schema, validator, patch-engine, world-content, `storylet-pool-authoring`, or `story-fact-promotion-to-canon` code change.
**Deps**: archive/tickets/BSBOOT-013.md (introduces the CHC `continuation_capacity` block and strengthened bootstrap gate 11); archive/tickets/BSPAG-001-extend-storylet-pool-authoring-with-jit-mode-and-delegate-page-cycle-jit.md (page-cycle JIT continuation path exists and delegates to `storylet-pool-authoring mode=jit`).

## Problem

BSBOOT-013 strengthened bootstrap CHCs so every emitted choice records a `continuation_capacity` block: simulated `post_choice_delta`, matching `valid_seed_storylets`, JIT fallback shape, and `validation_basis`. Runtime `branching-story-page-cycle` is the other CHC producer. At intake, its live Phase 8 / Phase 9 / CHC schema prose still used the older existence-only contract:

- `branching-story-page-cycle/references/phase-8-choice-generation.md` said consequence-capacity was "at least one storylet (existing or JIT-probable) continues from the post-state" and its CHC record example omitted `continuation_capacity`.
- `branching-story-page-cycle/references/phase-9-validation-gates.md` gate 9 said "Every emitted CHC has at least one continuation path (storylet-or-JIT)".
- `branching-story-page-cycle/references/record-schemas.md` said CHC schema was reproduced in Phase 8 but did not name the new block.
- At intake, `branching-story-health-audit` consumed PG / SE / CHC records and audited recursive closure, consequence-ledger coverage, and terminal/dead-end health, but did not inspect CHC `continuation_capacity` for missing blocks, unresolved `valid_seed_storylets`, empty JIT shapes, or stale branch references inside the new block.

That left a split contract at intake: bootstrap-created root choices were stricter than runtime-created later-page choices, and audit could not detect the same class of "choice appeared viable but had no state-valid continuation" defect in persisted runtime CHCs.

## Assumption Reassessment (2026-05-06)

1. At intake, `.claude/skills/branching-story-page-cycle/references/phase-8-choice-generation.md` emitted CHC records without `continuation_capacity`; Step 3 only required an existing/JIT-probable continuation.
2. At intake, `.claude/skills/branching-story-page-cycle/references/phase-9-validation-gates.md` gate 9 still had existence-only wording, not the BSBOOT-013 post-choice delta / valid-seed / JIT-shape requirement.
3. Cross-skill / cross-artifact boundary: CHC records are produced by `branching-story-bootstrap` and `branching-story-page-cycle`; `branching-story-health-audit` consumes those records as a read-only reviewer; `storylet-pool-authoring` produces SLT records / choice templates, not CHC records; `story-fact-promotion-to-canon` reads source facts, mystery-resolution events, and supporting prose, not CHC continuation-capacity metadata.
4. FOUNDATIONS principle: Rule 5 at story scope says every page must leave at least one continuation storylet eligible. Runtime CHC production should preserve the same consequence-capacity evidence that bootstrap now records.
5. HARD-GATE / Canon Safety Check surface: this ticket strengthens page-cycle Phase 9 gate 9 and health-audit review prose. It must preserve PASS-with-rationale discipline and must not weaken Mystery Reserve firewall or canon-mutation approval behavior.
6. Schema-extension classification: `continuation_capacity` is an additive CHC metadata block. The live story-choice JSON schema remains permissive (`additionalProperties: true`); no validator or patch-engine change is required by this ticket.
7. Downstream consumer decision: `branching-story-page-cycle` is the owned producer/validator because it emits runtime CHCs. `branching-story-health-audit` is the owned consumer because it audits persisted CHCs. `storylet-pool-authoring` remains out of scope because it owns SLT eligibility and `choice_templates`, not emitted CHC continuation proofs. `story-fact-promotion-to-canon` remains out of scope because promotion provenance may cite the page that emitted a choice, but the skill's authority is canon promotion, not CHC viability auditing.
8. Reassessment correction: `.claude/skills/branching-story-page-cycle/SKILL.md` Phase 8 summary still only named `choice_contract`; it was included in the landed file set to keep the parent skill summary aligned with the updated Phase 8 / Phase 9 references.
9. Post-ticket-review correction: `.claude/skills/branching-story-health-audit/templates/story-audit-report.md` is a same-seam consumer of the health-audit finding-category enum. It was added to the landed file set so reports can use `choice_continuation_capacity` as a valid category.

## Architecture Check

1. The clean design is to make every forward CHC producer record the same continuation-capacity evidence, then let the audit skill inspect that evidence. This avoids a bootstrap-only special case and keeps Rule 5 diagnostics available after the story has advanced.
2. No backwards-compatibility aliasing/shims. Existing bundles may lack the block; health-audit should classify missing `continuation_capacity` on legacy/pre-BSBOOT-013 or pre-BSPAG-004 CHCs as legacy info or warning by bundle age, not mutate them or invent compatibility fields.

## Verification Layers

1. Page-cycle Phase 8 emits `continuation_capacity` with `post_choice_delta`, `valid_seed_storylets`, `jit_shape_spec`, and `validation_basis` -> codebase grep-proof + manual review.
2. Page-cycle Phase 9 gate 9 requires the stronger post-choice capacity check -> codebase grep-proof.
3. Page-cycle record-schema prose names the CHC `continuation_capacity` block -> codebase grep-proof.
4. Health-audit consumes the new CHC block in its recursive closure / consequence-capacity / dead-end checks, and its report template accepts the new finding category -> codebase grep-proof + manual review.
5. Non-owner skills remain unchanged -> codebase grep-proof / manual review that `storylet-pool-authoring` and `story-fact-promotion-to-canon` do not acquire CHC-emission responsibilities.

## Landed Changes

### 1. `.claude/skills/branching-story-page-cycle`

- Updated `references/phase-8-choice-generation.md` Step 2 / Step 3 and the emitted-CHC example so runtime CHCs populate the same `continuation_capacity` block shape introduced by BSBOOT-013.
- Updated `references/phase-9-validation-gates.md` gate 3 and gate 9 so recursive closure includes the new block's story-local references and choice consequence-capacity requires populated `continuation_capacity` with seed/JIT evidence.
- Updated `references/record-schemas.md` CHC prose to name `continuation_capacity` as part of the runtime CHC contract.
- Updated parent `SKILL.md` Phase 8 summary to name populated `choice_contract` and `continuation_capacity` blocks.

### 2. `.claude/skills/branching-story-health-audit`

- Added a read-only audit check for CHC continuation-capacity integrity:
  - missing `continuation_capacity` on new-format CHCs is a finding;
  - both `valid_seed_storylets` empty and `jit_shape_spec` empty is a dead-end finding;
  - `valid_seed_storylets[]` entries must resolve to SLT records legal for the audited branch and remain consistent with recursive closure;
  - `validation_basis` must be non-empty enough to support the PASS rationale trail.
- Updated the recursive-reference closure list to include `CHC.continuation_capacity.valid_seed_storylets[]` and story-local IDs in `post_choice_delta`.
- Updated `templates/story-audit-report.md` so the finding category list includes `choice_continuation_capacity`.
- Kept health-audit read-only; it may propose RSP remediation cards but must not mutate CHC records.

### 3. Explicit non-owner review

- Confirmed no changes are needed in `storylet-pool-authoring` for this ticket: it provides SLT records / JIT sub-routine output consumed by page-cycle; it does not emit persisted CHC records.
- Confirmed no changes are needed in `story-fact-promotion-to-canon` for this ticket: it may read supporting pages/events for canon promotion but does not validate offered-choice continuation capacity.

## Files to Touch

- `.claude/skills/branching-story-page-cycle/references/phase-8-choice-generation.md` (modify)
- `.claude/skills/branching-story-page-cycle/references/phase-9-validation-gates.md` (modify)
- `.claude/skills/branching-story-page-cycle/references/record-schemas.md` (modify)
- `.claude/skills/branching-story-page-cycle/SKILL.md` (modify)
- `.claude/skills/branching-story-health-audit/SKILL.md` (modify)
- `.claude/skills/branching-story-health-audit/templates/story-audit-report.md` (modify)

## Out of Scope

- Editing `branching-story-bootstrap`; BSBOOT-013 already landed the bootstrap side.
- Editing `storylet-pool-authoring` unless reassessment finds a direct CHC-emission claim. Its owned surface is SLT records, `choice_templates`, and JIT storylet output.
- Editing `story-fact-promotion-to-canon` unless reassessment finds a direct CHC continuation-capacity validation claim. Its owned surface is story-to-world canon promotion provenance and Mystery Reserve firewall preservation.
- Adding JSON Schema, validator, patch-engine, or world-content migrations.
- Migrating existing bundles' CHC records.

## Acceptance Criteria

### Tests That Passed

1. `rg -n "continuation_capacity|post_choice_delta|valid_seed_storylets|jit_shape_spec|validation_basis" .claude/skills/branching-story-page-cycle/references/phase-8-choice-generation.md .claude/skills/branching-story-page-cycle/references/phase-9-validation-gates.md .claude/skills/branching-story-page-cycle/references/record-schemas.md` shows the runtime producer and gate surfaces.
2. `rg -n "continuation_capacity|valid_seed_storylets|post_choice_delta" .claude/skills/branching-story-health-audit/SKILL.md` shows audit coverage for the persisted CHC block.
3. `rg -n "continuation_capacity" .claude/skills/storylet-pool-authoring .claude/skills/story-fact-promotion-to-canon` returned no matches.
4. `rg -n "choice_continuation_capacity" .claude/skills/branching-story-health-audit/SKILL.md .claude/skills/branching-story-health-audit/templates/story-audit-report.md` shows both the skill enum/diagnostic surface and report-template category surface.
5. Manual review confirmed health-audit treats missing blocks on legacy bundles as audit findings or legacy notes, not as a migration instruction.

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
4. `rg -n "choice_continuation_capacity" .claude/skills/branching-story-health-audit/SKILL.md .claude/skills/branching-story-health-audit/templates/story-audit-report.md`
5. Manual cross-read against `docs/FOUNDATIONS.md` story-scope Rule 5 and `archive/tickets/BSBOOT-013.md`.

## Outcome

Completed on 2026-05-06. Runtime page-cycle CHC production now records and validates `continuation_capacity` with post-choice delta, valid seed-storylet evidence, JIT fallback shape, and validation rationale. Page-cycle recursive closure now names the new block's story-local references. Health-audit now has a read-only CHC continuation-capacity integrity check, includes the block in recursive closure, and keeps legacy/missing-block handling diagnostic rather than migratory. The health-audit report template now lists `choice_continuation_capacity` as a valid finding category.

`storylet-pool-authoring` and `story-fact-promotion-to-canon` remain unchanged because they do not emit persisted CHC records or own CHC continuation-capacity auditing.

## Verification Result

1. `rg -n "continuation_capacity|post_choice_delta|valid_seed_storylets|jit_shape_spec|validation_basis" .claude/skills/branching-story-page-cycle/references/phase-8-choice-generation.md .claude/skills/branching-story-page-cycle/references/phase-9-validation-gates.md .claude/skills/branching-story-page-cycle/references/record-schemas.md` — passed; hits cover the runtime CHC producer, gate 3 closure, gate 9, and record-schema prose.
2. `rg -n "continuation_capacity|valid_seed_storylets|post_choice_delta" .claude/skills/branching-story-health-audit/SKILL.md` — passed; hits cover the new audit focus, diagnostic check, recursive closure, and Rule 5 alignment.
3. `rg -n "continuation_capacity" .claude/skills/storylet-pool-authoring .claude/skills/story-fact-promotion-to-canon` — passed; exited 1 with no matches, confirming non-owner skills were not given CHC-emission/audit responsibility.
4. `rg -n 'Every emitted CHC has at least one continuation path|at least one storylet \(existing or JIT-probable\) continues from the post-state|storylet-or-JIT' .claude/skills/branching-story-page-cycle/SKILL.md .claude/skills/branching-story-page-cycle/references/phase-8-choice-generation.md .claude/skills/branching-story-page-cycle/references/phase-9-validation-gates.md .claude/skills/branching-story-page-cycle/references/record-schemas.md` — passed; exited 1 with no matches, confirming the owned page-cycle surfaces no longer use the old existence-only wording.
5. `rg -n "choice_continuation_capacity" .claude/skills/branching-story-health-audit/SKILL.md .claude/skills/branching-story-health-audit/templates/story-audit-report.md` — passed; the audit focus/diagnostic surface and report-template category list both contain the new category.
6. Manual cross-read — passed; FOUNDATIONS story-scope Rule 5 requires every page to leave at least one eligible continuation storylet, BSBOOT-013 introduced the same CHC `continuation_capacity` block on bootstrap CHCs, and the landed runtime/audit prose preserves HARD-GATE PASS-with-rationale discipline without changing world-canon or story-bundle write behavior.
7. `git diff --check` — passed.

## Deviations

- Reassessment added `.claude/skills/branching-story-page-cycle/SKILL.md` to the landed file set because the parent Phase 8 summary was stale after the reference updates.
- Post-ticket review added `.claude/skills/branching-story-health-audit/templates/story-audit-report.md` to the landed file set because the template is a same-seam consumer of the new health-audit category.
- Verification stayed on grep proof plus manual contract review. This is a prose workflow ticket; no executable page-cycle or health-audit fixture runner exists in the repo for this contract surface.
