# SPEC42STOSTADEB-011: commitment-block-authoring coverage extension 11 → 14 targets

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — extends `commitment-block-authoring` SKILL.md's 11-target coverage list to 14 targets (adds `clock_advancing`, `clue_discovering`, `setup_paying_off`); no new skill phases introduced; no schema changes
**Deps**: SPEC42STOSTADEB-005, SPEC42STOSTADEB-006, SPEC42STOSTADEB-007

## Problem

`commitment-block-authoring` Phase 1 currently lists 11 causal-function coverage targets (recovery / belief-repair / movement / bond-status-shift / consequence-resolution / decision-terminal-setup / fallback-continuation / investigation / disclosure / opposition-refusal / negotiation-exchange — verified in SPEC-42 brainstorm agent reports). Once the CLK/STSEC/STQ predicate-DSL entries land (SPEC42STOSTADEB-005 / -006 / -007), authors can write storylets that precondition on clock state / secret state / story-question state, but the coverage-target framework gives no guidance for ensuring authors produce storylets that ADVANCE these mechanisms. Without three new coverage targets (`clock_advancing` storylets that tick clocks, `clue_discovering` storylets that mark secret clues discovered, `setup_paying_off` storylets that answer or pay off open STQs), the per-bundle storylet pool will systematically under-cover the new mechanisms, leaving CLKs un-ticked, secrets stuck at `partially_revealed`, and STQs perpetually open.

## Assumption Reassessment (2026-05-17)

<!-- Items 1-3 always required. Items 4+ are a menu; include only those matching this ticket's scope and renumber surviving items sequentially starting from 4. Lists like 1, 2, 3, 14 are malformed output. -->

1. Codebase verified at Step 2 codebase validation (2026-05-17): `.claude/skills/commitment-block-authoring/SKILL.md` exists with the 11-target coverage list at Phase 1 (verified verbatim in SPEC-42 brainstorm agent reports: "1. Recovery block, 2. Belief-repair block, 3. Movement / evasion block, 4. Bond-shift or status-shift block, 5. Consequence-resolution block, 6. Decision or terminal-setup block, 7. Fallback continuation block, 8. Information-seeking / investigation block, 9. Disclosure block, 10. Opposition / refusal block, 11. Negotiation / resource-exchange block"). Per-class predicates from SPEC42STOSTADEB-005 / -006 / -007 will be available before this ticket's implementation begins (Deps chain).
2. Spec verified at `specs/SPEC-42-story-state-debt-secret-clock-records.md` §E Phase 4: "`commitment-block-authoring` 11-target coverage extension (add `clock_advancing`, `clue_discovering`, `setup_paying_off` as four-target additions where applicable)" — note: spec says "four-target additions" but enumerates three names; this ticket adds three new targets (11 → 14, not 11 → 15) — the spec's "four" appears to be a typo since only three names are enumerated. The three targets correspond to the three new classes (CLK / STSEC / STQ).
3. Cross-skill / cross-tool shared boundary: `commitment-block-authoring` is a Skill Category 2c skill per FOUNDATIONS §Story Bundles §7. It depends on the per-class predicates from -005 / -006 / -007 being available — storylets in the new coverage-target categories use predicates like `any_clock_active`, `secret_unrevealed`, `any_story_question_open` for their preconditions. The shared `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts` is read by this skill (consumer-side schema dependency) but not modified by this ticket.

## Architecture Check

1. **Additive extension preserves existing coverage discipline**: the 11 existing targets continue to apply; 3 new targets are added alongside. Authors who don't use the new classes simply have empty coverage at the new targets; this is not a hard requirement but a coverage-gap diagnostic.
2. **Three new targets map 1:1 to three new classes**: `clock_advancing` ↔ CLK, `clue_discovering` ↔ STSEC, `setup_paying_off` ↔ STQ. The mapping is explicit and reviewable.
3. **No schema change**: this ticket modifies SKILL.md prose only. The `SLT.move_family` enum (16 closed values per SPEC-42 brainstorm agent reports) is NOT extended; new coverage targets describe authoring concerns, not schema enum members.
4. **No new phase**: extends Phase 1 only; preserves the skill's existing structure.

## Verification Layers

1. Skill prose: Phase 1 coverage list contains 14 targets (the 11 existing + 3 new) → grep-proof against the post-implementation SKILL.md
2. Authoring example: `commitment-block-authoring` direct_batch mode includes coverage-target prompts for `clock_advancing` / `clue_discovering` / `setup_paying_off` → skill dry-run on a fixture bundle (manual or fixture-driven)
3. Health-audit consistency: SPEC42STOSTADEB-012's `stalled_clock_check` / `under_supported_critical_revelation_check` / `dropped_high_salience_setup_check` will detect coverage gaps that the new coverage targets are meant to prevent — the two skills compose correctly

## What to Change

### 1. Phase 1 coverage-target list extension

Modify `.claude/skills/commitment-block-authoring/SKILL.md` Phase 1 (the 11-target coverage list). Add three new entries:
- **12. Clock-advancing block** — storylets that tick an active CLK record (typically toward firing), via `tick_pressure_clock` ops. Preconditions use `any_clock_active(alias, kind?, salience?)` to find an eligible clock; effects use the patch-engine op.
- **13. Clue-discovering block** — storylets that flip a STSEC.clue_carriers[].status from `available` to `discovered`, via `mark_secret_clue_discovered` ops. Preconditions use `secret_unrevealed(STSEC-<int>)` or `any_secret_unrevealed(alias, salience?, kind?)`; effects use the patch-engine op.
- **14. Setup-paying-off block** — storylets that resolve an open STQ (status: open → answered, paid_off, or abandoned), via `answer_story_question` or `abandon_story_question` ops. Preconditions use `story_question_open(STQ-<int>)` or `any_story_question_open(alias, salience?, setup_kind?)`; effects use the patch-engine op.

Each new entry follows the existing 11-entry format (one bullet per target, with a brief description naming the mechanism and the canonical predicate(s) used). When all three new mechanisms are inactive in a bundle (no CLK/STSEC/STQ records), authors are not expected to produce storylets in these categories — the coverage targets fire only when the corresponding records exist.

## Files to Touch

- `.claude/skills/commitment-block-authoring/SKILL.md` (modify — Phase 1 coverage list 11 → 14 targets)

## Out of Scope

- CLK/STSEC/STQ class foundations — owned by SPEC42STOSTADEB-001 / -002 / -003
- Per-class predicates — owned by SPEC42STOSTADEB-005 / -006 / -007
- Health-audit checks consuming the new coverage gaps — owned by SPEC42STOSTADEB-012
- Turn-cycle integration — owned by SPEC42STOSTADEB-009
- Bootstrap optional seeding — owned by SPEC42STOSTADEB-010
- Prose-attach verification — owned by SPEC42STOSTADEB-013
- Cross-class contract doc updates — owned by SPEC42STOSTADEB-014
- Extending `SLT.move_family` enum (NOT in scope; the new coverage targets are authoring-concern guidance, not schema enum members)

## Acceptance Criteria

### Tests That Must Pass

1. Grep-proof: `grep -c "^[0-9]\+\." .claude/skills/commitment-block-authoring/SKILL.md` returns 14 (or an exact-match grep for the three new target names returns 3 hits each)
2. Skill dry-run: `commitment-block-authoring` direct_batch mode on a fixture bundle WITH active CLK/STSEC/STQ records includes coverage-target prompts for the three new categories
3. Skill dry-run on a fixture bundle WITHOUT any of the three new classes does not emit warnings about missing coverage in the three new categories (backwards-compat — coverage targets fire only when their classes exist)

### Invariants

1. The 11 existing coverage targets are preserved unchanged
2. The 3 new targets follow the same single-bullet format
3. New targets fire only when their corresponding records exist (no false-positive coverage warnings)
4. No `SLT.move_family` enum extension — coverage targets are authoring-concern guidance, not schema members

## Test Plan

### New/Modified Tests

1. None — documentation-only ticket; verification is command-based (grep-proof) and skill-dry-run-based. Existing skill-test coverage for `commitment-block-authoring` continues to apply.

### Commands

1. `grep -nE '^[0-9]+\. ' .claude/skills/commitment-block-authoring/SKILL.md | head -20` — verify the coverage list grew from 11 to 14 entries
2. `grep -n 'clock_advancing\|clue_discovering\|setup_paying_off' .claude/skills/commitment-block-authoring/SKILL.md` — verify the three new target names appear
3. Skill dry-run (manual or via skill-test harness if available): invoke `commitment-block-authoring` direct_batch on a fixture bundle and verify the coverage-target prompts include the new categories
4. The full-pipeline verification command lands in SPEC42STOSTADEB-015 capstone
