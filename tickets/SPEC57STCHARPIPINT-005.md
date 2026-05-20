# SPEC57STCHARPIPINT-005: Commitment-block-authoring STCHAR predicate integration

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — modifies `commitment-block-authoring` to consume STCHAR via the predicate DSL; no new tool/schema (`record_active(STCHAR-*)` already lawful per SPEC-56).
**Deps**: SPEC57STCHARPIPINT-001 (STCHAR must exist to be referenced).

## Problem

Commitment-block authoring produces SLT records whose eligibility/beats/effects can be character-specific, but it has no guidance for consuming STCHAR. SPEC-57 Phase 4 wires STCHAR into commitment-block authoring through the already-lawful `record_active(STCHAR-*)` predicate, with an anti-drama-manager guard and branch-scope discipline.

## Assumption Reassessment (2026-05-21)

1. `.claude/skills/commitment-block-authoring/SKILL.md` currently has zero STCHAR references; it loads `story_bundle_context` summaries and authors SLT preconditions via the closed predicate DSL (shared contract §5). The DSL's `record_active(<record_id>)` predicate already lists `STCHAR` among its lawful record classes (`_shared-templates/story-state-contract.md` §5: "accepts STENT / STCHAR / STINT / ...") — confirmed landed by SPEC-56; no machine-layer change is needed for this ticket.
2. SPEC-57 §Phase 4 specifies: pre-flight loads active STCHAR summaries (full body only when behavior-dependent); STCHAR enters preconditions only through `record_active(STCHAR-*)`; the anti-drama-manager guard (no `character_has_wound` / `character_arc_stage` predicates); global author-pool blocks carry no `STCHAR-*` ids (branch-local-leak / Rule 4); a deferred `any_story_character_active` existential.
3. Cross-skill boundary under audit: the closed predicate DSL (shared contract §5) is the shared surface — consumed by turn-cycle (runtime SLT eligibility) and authored by commitment-block-authoring. This ticket only documents already-lawful `record_active(STCHAR-*)` usage; it adds no DSL predicate.
4. FOUNDATIONS §5a/§5c (no act structure / no drama manager): character influence is expressed through `record_active` plus existing causal preconditions, never a character-arc field. Rule 4 (No Globalization): global-pool blocks must not name `STCHAR-*` ids.

## Architecture Check

1. Reusing the already-lawful `record_active(STCHAR-*)` predicate (rather than introducing a new persona-state predicate) keeps the SLT schema minimal and avoids drama-manager creep — a new `character_arc_stage`-style predicate would reintroduce future-dramatic-obligation framing the engine explicitly rejects.
2. No backwards-compatibility shim and no new DSL surface — the change is authoring guidance only.

## Verification Layers

1. STCHAR-conditioned eligibility uses `record_active(STCHAR-*)` only → grep-proof of the SKILL.md guidance + dry-run inspection of an authored block.
2. No drama-manager character predicates introduced → grep-proof that the SKILL.md adds no `character_has_wound` / `character_arc_stage`.
3. Global-pool blocks carry no `STCHAR-*` ids → manual review of branch-scope discipline guidance.
4. Single-layer note: this is skill-prose authoring guidance; predicate parsability of `record_active(STCHAR-*)` is covered by the existing `rule_storylet_predicate_dsl_parsability` validator (SPEC-56), not by a new test here.

## What to Change

### 1. STCHAR consumption guidance in `commitment-block-authoring/SKILL.md`

Add: pre-flight loads active STCHAR summaries (full/projected only when behavior-dependent); STCHAR eligibility via `record_active(STCHAR-*)` only; the anti-drama-manager guard; branch-scope discipline (no `STCHAR-*` ids in global author-pool blocks; branch-scoped/JIT blocks may cite STCHAR when the actor is bound). Note `any_story_character_active` is deferred (would need a shared-contract §5 amendment). Update the FOUNDATIONS Alignment table to reference STCHAR.

## Files to Touch

- `.claude/skills/commitment-block-authoring/SKILL.md` (modify)

## Out of Scope

- Any predicate-DSL grammar change (`record_active(STCHAR-*)` already lawful; `any_story_character_active` explicitly deferred).
- The STCHAR authoring skill (SPEC57STCHARPIPINT-001).
- Turn-cycle runtime SLT eligibility (SPEC57STCHARPIPINT-004).

## Acceptance Criteria

### Tests That Must Pass

1. `grep -n "record_active(STCHAR" .claude/skills/commitment-block-authoring/SKILL.md` shows the documented usage; `grep -n "character_has_wound\|character_arc_stage" ...` returns zero matches.
2. Dry-run: an authored character-specific block uses `record_active(STCHAR-*)` and parses under `rule_storylet_predicate_dsl_parsability`.

### Invariants

1. No new predicate-DSL value is introduced by this ticket.
2. Global author-pool SLT blocks never name `STCHAR-*` ids.

## Test Plan

### New/Modified Tests

1. `None — skill-prose ticket; predicate parsability of record_active(STCHAR-*) is covered by the existing rule_storylet_predicate_dsl_parsability validator named in Assumption Reassessment.`

### Commands

1. `grep -n "record_active(STCHAR\|character_arc_stage\|character_has_wound\|any_story_character_active" .claude/skills/commitment-block-authoring/SKILL.md`
2. Author a fixture block citing `record_active(STCHAR-*)` and run `npm test --prefix tools/validators` (predicate parsability).
3. The grep + parsability boundary is correct because the deliverable is authoring guidance over an already-lawful predicate.
