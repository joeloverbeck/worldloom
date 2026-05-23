# SPEC71STRSTCHARTAM-007: Remove hash-authoring instructions from the five story skills

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Large
**Engine Changes**: Yes — `branching-story-bootstrap`, `story-character-profile`, `branching-story-turn-cycle` phase reference, `branching-story-prose-attach`, `branching-story-health-audit` skill prose.
**Deps**: None

## Problem

At intake, the story-pipeline skills and their turn-cycle phase reference still instructed the LLM to compute, stamp, or validate the four removed content-tamper hashes (SPEC-71 §1.3 skill rows). This ticket removes those instructions so the skills no longer author or check the hashes: bootstrap/story-character-profile stop stamping STCHAR frontmatter hashes; bootstrap/turn-cycle stop emitting §16a hash lines; prose-attach stops the §16a `stchar_authority` hash verdicts; health-audit drops the `source_drift` mode and the `page_plan_stchar_hash_mismatch` finding. Prose-only; coherent with the contract docs (005).

## Assumption Reassessment (2026-05-22)

1. Codebase: all five SKILL.md exist. `branching-story-prose-attach/SKILL.md` (held verbatim this session) authors the §16a `stchar_authority` hash expected-vs-observed verdicts in Phase 3 + invokes `compute-stchar-hashes`. `branching-story-health-audit/SKILL.md` defines `source_drift` as a `mode` enum value (description + args lines 13/108/147), Phase 2n (`:363`), the `stchar_source_drift` finding (`:369`), and the `page_plan_stchar_hash_mismatch` finding in Phase 2m (`:356`). bootstrap/story-character-profile/turn-cycle stamp/emit the hashes per their STCHAR/§16a phases (reassessment agent map).
2. Specs/docs: SPEC-71 §1.3 skill rows + §3 (health-audit `source_drift` removal is the `source_char_hash` consumer; tied to 001/002 but prose-only).
3. Cross-artifact boundary under audit: the skills author per the `_shared-templates` contract (005) — removing the skills' hash instructions must align with the contract no longer prescribing the hashes (005 lands coherently).
4. FOUNDATIONS Rule 6 (No Silent Retcons): each skill edit cites what authoring behavior is changing (stop emitting the hashes) and why (the hashes are gone from schema/validators); the §16a packet still authors `required_because` + voice authority.
5. Removed-mode blast radius (health-audit): `grep -n "source_drift\|page_plan_stchar_hash_mismatch\|stchar_source_drift" .claude/skills/branching-story-health-audit/SKILL.md` → the `mode` enum (description + args + Phase 2n + finding) and the Phase 2m finding; removing `source_drift` must also drop it from the `mode` valid-value enumeration so the arg validator rejects it.
6. Current-run correction (2026-05-23): the broad five-skill acceptance grep exposed same-seam stale §16a packet prose in `.claude/skills/branching-story-turn-cycle/references/phase-7-page-plan.md`, while `.claude/skills/branching-story-turn-cycle/SKILL.md` itself already had no Job-B hash authoring anchors and still retained only Job-A `plan_hash` / `state_hash` guidance. The reference file was absorbed as owned same-seam fallout so the recorded grep proof is honest.

## Architecture Check

1. Editing the five skills together as one prose ticket keeps the "stop authoring the hashes" change coherent across the pipeline; each skill's edit is a small bounded removal of stamping/emit/verdict instructions.
2. No shim: instructions are deleted, not deprecated; Phase 9 `plan_hash`/`state_hash` stamping in turn-cycle (Job A) is explicitly left intact.

## Verification Layers

1. No active story-skill directory instructs `compute-stchar-hashes` or stamping `profile_hash`/`voice_block_hash`/`page_packet_hash` → grep-proof across the five skill directories, including turn-cycle references.
2. prose-attach Phase 3 no longer emits hash verdicts; retains `packet_present`/`active`/`required_because` → manual review of the amended Phase 3 + grep.
3. health-audit `mode` enum no longer lists `source_drift`; Phase 2n + the two findings removed → grep-proof.
4. turn-cycle Phase 9 `plan_hash`/`state_hash` stamping untouched (Job A) → grep-proof confirms the Job-A stamping prose remains.

## Landed Changes

### 1. bootstrap + story-character-profile
Removed the STCHAR-phase `profile_hash`/`voice_block_hash`/`page_packet_hash` compute+stamp instructions and §16a hash authoring from bootstrap. Removed STCHAR hash/frontmatter and compute-step instructions from story-character-profile.

### 2. turn-cycle
Removed stale §16a hash packet prose from the turn-cycle Phase 7 reference. `.claude/skills/branching-story-turn-cycle/SKILL.md` already had no Job-B hash authoring anchors; Phase 9 `plan_hash`/`state_hash` stamping remains intact (Job A).

### 3. prose-attach
Phase 3 `stchar_authority`: removed the profile/voice/`page_packet_hash` expected-vs-observed verdicts; retained `packet_present`/`active_in_snapshot`/`required_because`.

### 4. health-audit
Removed the `source_drift` mode (description, args, process flow, pre-flight parser, SAU report template, validation/alignment prose, and Phase 2n) and the `page_plan_stchar_hash_mismatch` finding from Phase 2m; kept the rest of Phase 2m STCHAR authority health.

## Files to Touch

- `.claude/skills/branching-story-bootstrap/SKILL.md` (modify)
- `.claude/skills/story-character-profile/SKILL.md` (modify)
- `.claude/skills/branching-story-turn-cycle/references/phase-7-page-plan.md` (modify)
- `.claude/skills/branching-story-prose-attach/SKILL.md` (modify)
- `.claude/skills/branching-story-health-audit/SKILL.md` (modify)

## Out of Scope

- The shared contract docs (005) — separate ticket, coherent.
- Code schemas/validators (001/002/006); turn-cycle/bootstrap Phase 9 `plan_hash`/`state_hash` (Job A, SPEC-72).

## Acceptance Criteria

### Tests That Must Pass

1. `! grep -rnE "compute-stchar-hashes|profile_hash|voice_block_hash|page_packet_hash|source_char_hash" .claude/skills/branching-story-bootstrap .claude/skills/story-character-profile .claude/skills/branching-story-turn-cycle .claude/skills/branching-story-prose-attach .claude/skills/branching-story-health-audit` → zero stale Job-B hash anchors across the five skill directories.
2. `! grep -n "source_drift" .claude/skills/branching-story-health-audit/SKILL.md` → zero (mode + finding gone).
3. `grep -n "state_hash\|plan_hash" .claude/skills/branching-story-turn-cycle/SKILL.md` → still present (Job A intact).

### Invariants

1. The §16a packet authoring still emits `required_because` + voice authority; only the hash line is removed.
2. turn-cycle Phase 9 `plan_hash`/`state_hash` stamping is unchanged.

## Test Plan

### New/Modified Tests

1. `None — skill-prose ticket; verification is grep-proof across the five skill directories + manual review of prose-attach Phase 3 and health-audit mode list.`

### Commands

1. `! grep -rnE "compute-stchar-hashes|profile_hash|voice_block_hash|page_packet_hash|source_char_hash" .claude/skills/branching-story-bootstrap .claude/skills/story-character-profile .claude/skills/branching-story-turn-cycle .claude/skills/branching-story-prose-attach .claude/skills/branching-story-health-audit`
2. `! grep -n "source_drift" .claude/skills/branching-story-health-audit/SKILL.md`
3. `grep -n "state_hash\|plan_hash" .claude/skills/branching-story-turn-cycle/SKILL.md`

## Outcome

Completed on 2026-05-23.

The story skill prose no longer asks authors or validators to compute, stamp, compare, or report `profile_hash`, `voice_block_hash`, `page_packet_hash`, or `source_char_hash` across bootstrap, story-character-profile, turn-cycle page-plan guidance, prose-attach receipts, or health-audit. The health-audit `source_drift` mode was removed from the public mode list, process flow, parser instructions, report template, and FOUNDATIONS alignment prose. Turn-cycle Job-A `plan_hash` / `state_hash` guidance was left intact.

## Verification Result

1. `! grep -rnE "compute-stchar-hashes|profile_hash|voice_block_hash|page_packet_hash|source_char_hash" .claude/skills/branching-story-bootstrap .claude/skills/story-character-profile .claude/skills/branching-story-turn-cycle .claude/skills/branching-story-prose-attach .claude/skills/branching-story-health-audit` — passed; no stale Job-B hash anchors remain across the five skill directories.
2. `! grep -n "source_drift" .claude/skills/branching-story-health-audit/SKILL.md` — passed; the removed health-audit mode is gone from the active skill file.
3. `grep -n "state_hash\|plan_hash" .claude/skills/branching-story-turn-cycle/SKILL.md` — passed; Job-A plan/state hash guidance remains present at the turn-cycle write/verification boundary.
4. Manual review of `.claude/skills/branching-story-prose-attach/SKILL.md` Phase 3 confirmed `stchar_authority` now depends on `packet_present`, `active_in_snapshot`, and verbatim `required_because`, with profile fidelity retained as qualitative STCHAR judgment.
5. `git diff --check -- .claude/skills/branching-story-bootstrap/SKILL.md .claude/skills/story-character-profile/SKILL.md .claude/skills/branching-story-turn-cycle/references/phase-7-page-plan.md .claude/skills/branching-story-prose-attach/SKILL.md .claude/skills/branching-story-health-audit/SKILL.md` — passed.

## Deviations

- The drafted `Files to Touch` named `.claude/skills/branching-story-turn-cycle/SKILL.md`, but the live stale Job-B §16a packet prose was in `.claude/skills/branching-story-turn-cycle/references/phase-7-page-plan.md`. The SKILL.md stayed unchanged and was verified for Job-A `plan_hash` / `state_hash` retention.
