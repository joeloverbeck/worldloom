# SPEC57STCHARPIPINT-005: Commitment-block-authoring STCHAR predicate integration

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — modifies `commitment-block-authoring` to consume STCHAR via the predicate DSL; no new tool/schema (`record_active(STCHAR-*)` already lawful per SPEC-56).
**Deps**: archive/tickets/SPEC57STCHARPIPINT-001.md (STCHAR must exist to be referenced).

## Problem

At intake, commitment-block authoring produced SLT records whose eligibility/beats/effects could be character-specific, but it had no guidance for consuming STCHAR. This ticket wires SPEC-57 Phase 4 into commitment-block authoring through the already-lawful `record_active(STCHAR-*)` predicate, with an anti-drama-manager guard and branch-scope discipline.

## Assumption Reassessment (2026-05-21)

1. At intake, `.claude/skills/commitment-block-authoring/SKILL.md` had zero STCHAR references; it loaded `story_bundle_context` summaries and authored SLT preconditions via the closed predicate DSL (shared contract §5). The DSL's `record_active(<record_id>)` predicate already lists `STCHAR` among its lawful record classes (`_shared-templates/story-state-contract.md` §5: "accepts STENT / STCHAR / STINT / ...") — confirmed landed by SPEC-56; no machine-layer change was needed for this ticket.
2. SPEC-57 §Phase 4 specifies: pre-flight loads active STCHAR summaries (full body only when behavior-dependent); STCHAR enters preconditions only through `record_active(STCHAR-*)`; the anti-drama-manager guard (no `character_has_wound` / `character_arc_stage` predicates); global author-pool blocks carry no `STCHAR-*` ids (branch-local-leak / Rule 4); a deferred `any_story_character_active` existential.
3. Cross-skill boundary under audit: the closed predicate DSL (shared contract §5) is the shared surface — consumed by turn-cycle (runtime SLT eligibility) and authored by commitment-block-authoring. This ticket only documents already-lawful `record_active(STCHAR-*)` usage; it adds no DSL predicate.
4. FOUNDATIONS §5a/§5c (no act structure / no drama manager): character influence is expressed through `record_active` plus existing causal preconditions, never a character-arc field. Rule 4 (No Globalization): global-pool blocks must not name `STCHAR-*` ids.
5. HARD-GATE read: required and completed because the implementation updates commitment-block-authoring's content-generating HARD-GATE / pre-flight prerequisite wording. The edit preserves approval timing, patch-engine routing, validation sequence, and explicit user approval before writes; it only adds STCHAR retrieval and branch-scope checks to the existing gated preparation.
6. Reassessment correction: this repo does not expose an executable runner for `.claude/skills/<slug>/` dry-runs in Codex. The verification boundary is manual contract review plus grep-proof over `commitment-block-authoring` and the shared predicate contract; the existing validators package covers `record_active(STCHAR-*)` predicate parsability as a machine surface.

## Architecture Check

1. Reusing the already-lawful `record_active(STCHAR-*)` predicate (rather than introducing a new persona-state predicate) keeps the SLT schema minimal and avoids drama-manager creep — a new `character_arc_stage`-style predicate would reintroduce future-dramatic-obligation framing the engine explicitly rejects.
2. No backwards-compatibility shim and no new DSL surface — the change is authoring guidance only.

## Verification Layers

1. STCHAR-conditioned eligibility uses `record_active(STCHAR-*)` only → grep-proof of the SKILL.md guidance plus manual contract review of the authored-block prescription.
2. No drama-manager character predicates introduced → grep-proof that the SKILL.md mentions `character_has_wound` / `character_arc_stage` only as prohibited examples.
3. Global-pool blocks carry no `STCHAR-*` ids → manual review of branch-scope discipline guidance.
4. Single-layer note: this is skill-prose authoring guidance; predicate parsability of `record_active(STCHAR-*)` is covered by the existing `rule_storylet_predicate_dsl_parsability` validator (SPEC-56), not by a new test here.

## Landed Changes

### 1. STCHAR consumption guidance in `commitment-block-authoring/SKILL.md`

The skill now loads active STCHAR summaries in pre-flight, retrieves full/projected STCHAR sections only when behavior-dependent, expresses STCHAR eligibility through `record_active(STCHAR-*)`, forbids persona-state predicates, and enforces branch-scope discipline so global-author-pool blocks do not name exact `STCHAR-*` ids. The FOUNDATIONS Alignment table now references Story-Local Character Authority and records that `any_story_character_active` is not introduced.

## Files to Touch

- `.claude/skills/commitment-block-authoring/SKILL.md` (modify)

## Out of Scope

- Any predicate-DSL grammar change (`record_active(STCHAR-*)` already lawful; `any_story_character_active` explicitly deferred).
- The STCHAR authoring skill (archive/tickets/SPEC57STCHARPIPINT-001.md).
- Turn-cycle runtime SLT eligibility (archive/tickets/SPEC57STCHARPIPINT-004.md).

## Acceptance Criteria

### Tests That Must Pass

1. `grep -n "record_active(STCHAR" .claude/skills/commitment-block-authoring/SKILL.md` shows the documented usage; `grep -n "character_has_wound\|character_arc_stage" .claude/skills/commitment-block-authoring/SKILL.md` shows only prohibition text, not introduced predicates.
2. Manual contract review confirms character-specific blocks use `record_active(STCHAR-*)` only when the actor's active STCHAR is branch-visible/bound, while global-author-pool blocks do not name exact `STCHAR-*` ids.

### Invariants

1. No new predicate-DSL value is introduced by this ticket.
2. Global author-pool SLT blocks never name `STCHAR-*` ids.

## Test Plan

### New/Modified Tests

1. `None — skill-prose ticket; predicate parsability of record_active(STCHAR-*) is covered by the existing rule_storylet_predicate_dsl_parsability validator named in Assumption Reassessment.`

### Commands

1. `grep -n "record_active(STCHAR\|character_arc_stage\|character_has_wound\|any_story_character_active" .claude/skills/commitment-block-authoring/SKILL.md` (classify the forbidden-predicate hits as prohibition/deferred text only)
2. Manual review of `.claude/skills/commitment-block-authoring/SKILL.md` against SPEC-57 Phase 4, `docs/FOUNDATIONS.md` §5a/§5c and Rule 4, `docs/HARD-GATE-DISCIPLINE.md`, and `.claude/skills/_shared-templates/story-state-contract.md` §5.
3. The grep + manual-review boundary is correct because the deliverable is authoring guidance over an already-lawful predicate; no new predicate grammar or validator behavior is introduced.

## Outcome

Completed: 2026-05-21

Updated `.claude/skills/commitment-block-authoring/SKILL.md` so commitment-block-authoring consumes story-local character authority without adding new predicate grammar. The HARD-GATE and pre-flight now load active STCHAR summaries and retrieve full/projected STCHAR sections only when a planned block depends on persona, voice, appraisal, pressure behavior, relationship conduct, perception, embodiment, or agency. Predicate guidance now allows `record_active(STCHAR-*)` only for branch-visible character-specific blocks, bars exact STCHAR ids from global-author-pool blocks, and explicitly forbids `any_story_character_active`, `character_has_wound`, and `character_arc_stage`.

## Verification Result

- `grep -n "record_active(STCHAR\|character_arc_stage\|character_has_wound\|any_story_character_active" .claude/skills/commitment-block-authoring/SKILL.md` — PASS; `record_active(STCHAR-*)` appears in the HARD-GATE, prerequisite, predicate, alignment, and guardrail guidance; `any_story_character_active`, `character_has_wound`, and `character_arc_stage` appear only as deferred/prohibited predicates, not as lawful DSL entries.
- `grep -n "record_active(<record_id>)" .claude/skills/_shared-templates/story-state-contract.md` — PASS; the shared predicate contract lists `STCHAR` among accepted `record_active` classes.
- Manual review against SPEC-57 Phase 4, `docs/FOUNDATIONS.md` §5a/§5c and Rule 4, `docs/HARD-GATE-DISCIPLINE.md`, and `.claude/skills/_shared-templates/story-state-contract.md` §5 — PASS; the skill preserves explicit HARD-GATE approval before writes, uses story-scoped STCHAR retrieval, keeps world `CHAR-*` as provenance only, and introduces no new DSL predicate or drama-manager field.
- `git diff --check -- .claude/skills/commitment-block-authoring/SKILL.md archive/tickets/SPEC57STCHARPIPINT-005.md` — PASS; no whitespace errors in owned tracked edits after archival.

## Deviations

- The drafted dry-run / validators-package proof was replaced with manual contract review plus grep proof because the repo has no executable Codex runner for `.claude/skills/<slug>/` dry-runs, and this ticket introduced no new machine predicate grammar. Predicate parsability for `record_active(STCHAR-*)` remains covered by the existing SPEC-56 validator surface named in reassessment.
