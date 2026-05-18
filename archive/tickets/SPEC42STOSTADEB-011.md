# SPEC42STOSTADEB-011: commitment-block-authoring coverage extension 11 → 14 targets

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — extends `commitment-block-authoring` SKILL.md's 11-target coverage list to 14 targets (adds `clock_advancing`, `clue_discovering`, `setup_paying_off`); no new skill phases introduced; no schema changes
**Deps**: archive/tickets/SPEC42STOSTADEB-005.md, archive/tickets/SPEC42STOSTADEB-006.md, archive/tickets/SPEC42STOSTADEB-007.md

## Problem

At intake, `commitment-block-authoring` Phase 1 listed 11 causal-function coverage targets (recovery / belief-repair / movement / bond-status-shift / consequence-resolution / decision-terminal-setup / fallback-continuation / investigation / disclosure / opposition-refusal / negotiation-exchange). Once the CLK/STSEC/STQ predicate-DSL entries landed (SPEC42STOSTADEB-005 / -006 / -007), authors could write storylets that precondition on clock state / secret state / story-question state, but the coverage-target framework gave no guidance for ensuring authors produce storylets that advance these mechanisms. Without three new coverage targets (`clock_advancing` storylets that tick clocks, `clue_discovering` storylets that mark secret clues discovered, `setup_paying_off` storylets that answer or pay off open STQs), the per-bundle storylet pool would systematically under-cover the new mechanisms, leaving CLKs un-ticked, secrets stuck at `partially_revealed`, and STQs perpetually open.

## Assumption Reassessment (2026-05-17)

<!-- Items 1-3 always required. Items 4+ are a menu; include only those matching this ticket's scope and renumber surviving items sequentially starting from 4. Lists like 1, 2, 3, 14 are malformed output. -->

1. Codebase verified at Step 2 codebase validation (2026-05-17): `.claude/skills/commitment-block-authoring/SKILL.md` existed with the 11-target coverage list at Phase 1 (verified verbatim in SPEC-42 brainstorm agent reports: "1. Recovery block, 2. Belief-repair block, 3. Movement / evasion block, 4. Bond-shift or status-shift block, 5. Consequence-resolution block, 6. Decision or terminal-setup block, 7. Fallback continuation block, 8. Information-seeking / investigation block, 9. Disclosure block, 10. Opposition / refusal block, 11. Negotiation / resource-exchange block"). Per-class predicates from SPEC42STOSTADEB-005 / -006 / -007 are now available through the archived dependency chain.
2. Spec verified at `specs/SPEC-42-story-state-debt-secret-clock-records.md` §E Phase 4: "`commitment-block-authoring` 11-target coverage extension (add `clock_advancing`, `clue_discovering`, `setup_paying_off` as four-target additions where applicable)" — note: spec says "four-target additions" but enumerates three names; this ticket adds three new targets (11 → 14, not 11 → 15) — the spec's "four" appears to be a typo since only three names are enumerated. The three targets correspond to the three new classes (CLK / STSEC / STQ).
3. Cross-skill / cross-tool shared boundary: `commitment-block-authoring` is a Skill Category 2c skill per FOUNDATIONS §Story Bundles §7. It depends on the per-class predicates from -005 / -006 / -007 being available — storylets in the new coverage-target categories use predicates like `any_clock_active`, `secret_unrevealed`, `any_story_question_open` for their preconditions. The shared `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts` is read by this skill (consumer-side schema dependency) but not modified by this ticket.
4. Reassessment update (2026-05-18): live predicate surfaces contain the SPEC-42 predicate names in `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts`, `tools/validators/src/schemas/predicate-dsl-grammar.schema.json`, and `tools/validators/src/schemas/story-storylet.schema.json`. This ticket remains a consumer-side skill update; it does not modify validators, schema, patch-engine ops, or `SLT.move_family`.
5. Reassessment update (2026-05-18): no executable skill dry-run harness for `.claude/skills/commitment-block-authoring` is exposed in the current repo/session. The original skill-dry-run acceptance rows are therefore substituted with grep proof plus manual contract review of the edited skill prose against FOUNDATIONS §5a/§5c/§7 and the live predicate surfaces. End-to-end skill execution remains owned by the capstone ticket SPEC42STOSTADEB-015.
6. Reassessment update (2026-05-18): the edit is outside the skill's `<HARD-GATE>` block and does not change approval, validation, submit, or canon-write semantics. HARD-GATE discipline is preserved; no `docs/HARD-GATE-DISCIPLINE.md` change is needed for this ticket.

## Architecture Check

1. **Additive extension preserves existing coverage discipline**: the 11 existing targets continue to apply; 3 new targets are added alongside. Authors who don't use the new classes simply have empty coverage at the new targets; this is not a hard requirement but a coverage-gap diagnostic.
2. **Three new targets map 1:1 to three new classes**: `clock_advancing` ↔ CLK, `clue_discovering` ↔ STSEC, `setup_paying_off` ↔ STQ. The mapping is explicit and reviewable.
3. **No schema change**: this ticket modifies SKILL.md prose only. The `SLT.move_family` enum (16 closed values per SPEC-42 brainstorm agent reports) is NOT extended; new coverage targets describe authoring concerns, not schema enum members.
4. **No new phase**: extends Phase 1 only; preserves the skill's existing structure.

## Verification Layers

1. Skill prose: Phase 1 coverage list contains 14 targets (the 11 existing + 3 new) → grep-proof against the post-implementation SKILL.md
2. Authoring guidance: `commitment-block-authoring` direct_batch mode includes coverage-target prompts for `clock_advancing` / `clue_discovering` / `setup_paying_off` and names the matching predicates/effects → grep-proof plus manual contract review
3. Health-audit consistency: `archive/tickets/SPEC42STOSTADEB-012.md`'s `stalled_clock_check` / `under_supported_critical_revelation_check` / `dropped_high_salience_setup_check` will detect coverage gaps that the new coverage targets are meant to prevent — the two skills compose correctly

## Landed Changes

### 1. Phase 1 coverage-target list extension

Modified `.claude/skills/commitment-block-authoring/SKILL.md` Phase 1 (the 11-target coverage list) to add three new entries:
- **12. Clock-advancing block** — storylets that tick an active CLK record (typically toward firing), via `tick_pressure_clock` ops. Preconditions use `any_clock_active(alias, kind?, salience?)` to find an eligible clock; effects use the patch-engine op.
- **13. Clue-discovering block** — storylets that flip a STSEC.clue_carriers[].status from `available` to `discovered`, via `mark_secret_clue_discovered` ops. Preconditions use `secret_unrevealed(STSEC-<int>)` or `any_secret_unrevealed(alias, salience?, kind?)`; effects use the patch-engine op.
- **14. Setup-paying-off block** — storylets that resolve an open STQ (status: open → answered, paid_off, or abandoned), via `answer_story_question` or `abandon_story_question` ops. Preconditions use `story_question_open(STQ-<int>)` or `any_story_question_open(alias, salience?, setup_kind?)`; effects use the patch-engine op.

Each new entry follows the existing numbered-list format, names the mechanism and canonical predicate(s), and states that the SPEC-42 targets are conditional authoring targets. When all three new mechanisms are inactive in a bundle (no CLK/STSEC/STQ records), authors are not expected to produce storylets in these categories — the coverage targets fire only when the corresponding records exist.

### 2. Predicate guidance refresh

Updated the skill's global-pool predicate guidance so the old "six `any_*` existential predicates" wording now reflects the nine live existential predicates after SPEC-42. The refresh explicitly names `any_clock_active`, `any_secret_unrevealed`, and `any_story_question_open` for the new mechanism coverage targets.

## Files to Touch

- `.claude/skills/commitment-block-authoring/SKILL.md` (modify — Phase 1 coverage list 11 → 14 targets)

## Out of Scope

- CLK/STSEC/STQ class foundations — owned by SPEC42STOSTADEB-001 / -002 / -003
- Per-class predicates — owned by SPEC42STOSTADEB-005 / -006 / -007
- Health-audit checks consuming the new coverage gaps — landed in `archive/tickets/SPEC42STOSTADEB-012.md`
- Turn-cycle integration — landed in `archive/tickets/SPEC42STOSTADEB-009.md`
- Bootstrap optional seeding — owned by SPEC42STOSTADEB-010
- Prose-attach verification — owned by SPEC42STOSTADEB-013
- Cross-class contract doc updates — owned by SPEC42STOSTADEB-014
- Extending `SLT.move_family` enum (NOT in scope; the new coverage targets are authoring-concern guidance, not schema enum members)

## Acceptance Criteria

### Tests That Must Pass

1. Grep-proof: `awk '/^1[.] Recovery block/{flag=1} flag && /^[0-9]+[.] /{print} /^14[.] Setup-paying-off block/{flag=0}' .claude/skills/commitment-block-authoring/SKILL.md` shows Phase 1 coverage targets 1 through 14.
2. Grep-proof: `grep -n 'clock_advancing\|clue_discovering\|setup_paying_off' .claude/skills/commitment-block-authoring/SKILL.md` shows the three new target names in Phase 1.
3. Manual contract review: the new target prose names the corresponding live predicates/effects and states that the targets are conditional when no CLK/STSEC/STQ records exist.

### Invariants

1. The 11 existing coverage targets are preserved unchanged
2. The 3 new targets follow the same single-bullet format
3. New targets fire only when their corresponding records exist (no false-positive coverage warnings)
4. No `SLT.move_family` enum extension — coverage targets are authoring-concern guidance, not schema members

## Test Plan

### New/Modified Tests

1. None — skill-prose-only ticket; verification is command-based grep proof plus manual contract review. End-to-end executable skill proof is deferred to SPEC42STOSTADEB-015.

### Commands

1. `awk '/^1[.] Recovery block/{flag=1} flag && /^[0-9]+[.] /{print} /^14[.] Setup-paying-off block/{flag=0}' .claude/skills/commitment-block-authoring/SKILL.md` — verify the coverage list grew from 11 to 14 entries
2. `grep -n 'clock_advancing\|clue_discovering\|setup_paying_off' .claude/skills/commitment-block-authoring/SKILL.md` — verify the three new target names appear
3. `grep -n 'any_clock_active\|any_secret_unrevealed\|any_story_question_open' tools/validators/src/rules/_shared/predicate-dsl-grammar.ts tools/validators/src/schemas/predicate-dsl-grammar.schema.json tools/validators/src/schemas/story-storylet.schema.json .claude/skills/commitment-block-authoring/SKILL.md` — verify the skill consumes live predicate names
4. The full-pipeline executable skill verification command lands in SPEC42STOSTADEB-015 capstone

## Outcome

Completed on 2026-05-18.

`commitment-block-authoring` Phase 1 now diagnoses 14 direct-batch coverage targets. The three added SPEC-42 targets are:

- `clock_advancing` for ticking or resolving active CLK pressure clocks
- `clue_discovering` for discovering or making actionable STSEC clue carriers
- `setup_paying_off` for answering, paying off, complicating, or abandoning open STQ records

The skill now explicitly ties those targets to the live SPEC-42 predicate names and states that the targets are conditional on the bundle actually containing the corresponding CLK/STSEC/STQ records. No schema, validator, patch-engine, world-MCP, `SLT.move_family`, or HARD-GATE semantics changed.

## Verification Result

- `awk '/^1[.] Recovery block/{flag=1} flag && /^[0-9]+[.] /{print} /^14[.] Setup-paying-off block/{flag=0}' .claude/skills/commitment-block-authoring/SKILL.md` — PASS; Phase 1 now lists targets 1 through 14.
- `grep -n 'clock_advancing\|clue_discovering\|setup_paying_off' .claude/skills/commitment-block-authoring/SKILL.md` — PASS; all three target names appear in the new Phase 1 entries.
- `grep -n 'any_clock_active\|any_secret_unrevealed\|any_story_question_open' tools/validators/src/rules/_shared/predicate-dsl-grammar.ts tools/validators/src/schemas/predicate-dsl-grammar.schema.json tools/validators/src/schemas/story-storylet.schema.json .claude/skills/commitment-block-authoring/SKILL.md` — PASS; the skill names predicate entries that exist in the live validator grammar/schema surfaces.
- Manual contract review — PASS; the edit preserves FOUNDATIONS §5a / §5c by keeping targets as present-causal authoring guidance, preserves §7 story-pipeline skill discipline, and does not change the skill's HARD-GATE block.

## Deviations

- The draft spec phrase "four-target additions" was treated as a typo because it enumerated only three target names. The landed change is 11 → 14.
- The originally drafted skill dry-run proof was not executed because no executable skill harness is exposed in this repo/session for `.claude/skills/commitment-block-authoring`. The accepted proof is grep plus manual contract review; end-to-end skill execution remains owned by SPEC42STOSTADEB-015.
