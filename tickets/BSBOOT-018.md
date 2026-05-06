# BSBOOT-018: Propagate STENT character-anchor semantics to downstream story skills

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: None — downstream branching-story skill prose only. No engine, validator, schema, hook, or world-content change.
**Deps**: archive/tickets/BSBOOT-003.md

## Problem

BSBOOT-003 clarified the story-identity contract:

- `STENT.character_id` is the world `CHAR-NNNN` anchor for character mirrors.
- `STENT.world_ent_id` is `null` for character mirrors and is only populated when the STENT mirrors a world-level `ENT-NNNN`.
- `STINT.stent_id` points to the story-local `STENT-NNNN` that the intention snapshot drives.
- `STINT.world_character_id` is the optional world `CHAR-NNNN` anchor.

Several downstream story skills still phrase world-canon retrieval or intention-history lookup as if cast-bound STENTs always expose a usable `world_ent_id`, or as if STINT history can be associated to a character without naming `stent_id`. That leaves operators with two competing anchor paths and can cause character mirrors to be dropped from context-packet seed resolution because their `world_ent_id` is intentionally `null`.

## Assumption Reassessment (2026-05-06)

1. `archive/tickets/BSBOOT-003.md` completed the forward-looking STINT rename and STENT example correction: STINT records now use `stent_id` + `world_character_id`; STENT character mirrors keep `character_id: CHAR-NNNN` and `world_ent_id: null`.
2. `docs/FOUNDATIONS.md` §Tooling Recommendation requires story-pipeline skills to receive relevant current world context through context packets or targeted retrieval. Seed-node guidance must therefore preserve character mirrors instead of silently dropping them when `world_ent_id` is null.
3. Cross-skill boundary: downstream branching-story skills consume bootstrap story-bundle identity records. The shared contract under audit is how STENT/STINT records map story-local cast to world-canon retrieval anchors and intention histories.
4. `branching-story-health-audit/SKILL.md` still says context-packet seed nodes are resolved from cast-bound STENTs' `world_ent_id` (`World-State Prerequisites` + Pre-flight). That is false for character mirrors after BSBOOT-003.
5. `branching-story-page-cycle/references/pre-flight-and-prerequisites.md` still says `cast_present` STENTs are followed through `world_ent_id`; `phase-5-state-mutation.md` says intention refresh replaces prior STINT "for that character" rather than "for that STENT / stent_id".
6. `storylet-pool-authoring/references/pre-flight-and-prerequisites.md` still says seed nodes are resolved from `STORY_KERNEL.cast_bind_list` / each STENT's `world_ent_id`; bootstrap parent invocations pass cast-bound STENT/STINT records where character mirrors have `world_ent_id: null`.
7. `story-fact-promotion-to-canon/SKILL.md` already treats `source_stent_id` as the story-local evolved entity, but character-arc promotion says to load STINT history along the branch without specifying that matching is by `STINT.stent_id == source_stent_id`.

## Architecture Check

1. **Why cleaner**: A single resolver rule keeps downstream skills aligned with the bootstrap schema authority: use `STENT.character_id` / `STINT.world_character_id` for world CHAR anchors, `STENT.world_ent_id` only for non-CHAR world ENT mirrors, and `STINT.stent_id` for story-local intention ownership.
2. No backwards-compatibility aliasing introduced. This is forward-looking prose guidance; legacy local bundles with old STINT `character_id: STENT-*` remain historical content and are not migrated.

## Verification Layers

1. Health-audit seed resolution names `character_id` for CHAR mirrors and `world_ent_id` only for non-CHAR ENT mirrors -> codebase grep-proof + manual review.
2. Page-cycle seed resolution and intention-refresh prose names the same STENT/STINT resolver rule -> codebase grep-proof + manual review.
3. Storylet-pool-authoring parent/bootstrap seed resolution names the same resolver rule -> codebase grep-proof + manual review.
4. Story-fact-promotion-to-canon character-arc STINT history lookup explicitly matches `STINT.stent_id == source_stent_id` -> codebase grep-proof.

## What to Change

### 1. `branching-story-health-audit`

- In `SKILL.md` `World-State Prerequisites` and Pre-flight, replace "cast-bound STENTs' `world_ent_id`" seed-node guidance with a resolver rule:
  - for character mirrors, resolve through `STENT.character_id` to the CHAR dossier / character name;
  - for non-CHAR world mirrors, resolve through `STENT.world_ent_id`;
  - for `story_only: true` STENTs with no world anchor, do not use them as world-canon seed nodes unless another explicit world anchor exists.

### 2. `branching-story-page-cycle`

- In `references/pre-flight-and-prerequisites.md`, update `cast_present` context-packet seed-node prose to use the same resolver rule.
- In `references/phase-5-state-mutation.md`, change intention refresh language from "for that character" to "for that STENT / `stent_id`".

### 3. `storylet-pool-authoring`

- In `references/pre-flight-and-prerequisites.md`, update parent/bootstrap and top-up seed-node prose to use the same resolver rule for `STORY_KERNEL.cast_bind_list` / parent-supplied STENT records.

### 4. `story-fact-promotion-to-canon`

- In `SKILL.md` `source_kind == character_arc_outcome`, specify that the STINT history along `promotion_branch_path` is selected by `STINT.stent_id == source_stent_id`; `world_character_id` / `STENT.character_id` are world CHAR anchors, not the story-local ownership key.

## Files to Touch

- `.claude/skills/branching-story-health-audit/SKILL.md` (modify)
- `.claude/skills/branching-story-page-cycle/references/pre-flight-and-prerequisites.md` (modify)
- `.claude/skills/branching-story-page-cycle/references/phase-5-state-mutation.md` (modify)
- `.claude/skills/storylet-pool-authoring/references/pre-flight-and-prerequisites.md` (modify)
- `.claude/skills/story-fact-promotion-to-canon/SKILL.md` (modify)

## Out of Scope

- Editing `branching-story-bootstrap`; BSBOOT-003 already landed the producer contract.
- Migrating existing story-bundle `_source/*.yaml` records.
- Adding or changing validators, patch-engine ops, MCP handlers, or JSON schemas.
- Changing world-canon retrieval APIs.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -rn "world_ent_id" .claude/skills/branching-story-health-audit/SKILL.md .claude/skills/branching-story-page-cycle/references/pre-flight-and-prerequisites.md .claude/skills/storylet-pool-authoring/references/pre-flight-and-prerequisites.md` shows only prose that distinguishes `character_id`-backed character mirrors from `world_ent_id`-backed non-CHAR ENT mirrors.
2. `grep -rn "STINT.*stent_id\\|stent_id.*STINT" .claude/skills/branching-story-page-cycle/references/phase-5-state-mutation.md .claude/skills/story-fact-promotion-to-canon/SKILL.md` shows intention refresh / character-arc history keyed by `stent_id`.
3. `grep -rn "STENTs' world_ent_id\\|each STENT's world_ent_id\\|STENT.world_ent_id" .claude/skills/branching-story-health-audit .claude/skills/branching-story-page-cycle .claude/skills/storylet-pool-authoring` returns no stale unconditional cast-seed guidance.

### Invariants

1. Character mirror STENTs are never required to have `world_ent_id`.
2. Non-CHAR world-entity mirror STENTs may still use `world_ent_id` as their world anchor.
3. STINT ownership is by `stent_id`, not by STINT `character_id`.
4. Story-only STENTs without world anchors do not become world-canon seed nodes by guesswork.

## Test Plan

### New/Modified Tests

1. None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.

### Commands

1. `grep -rn "world_ent_id" .claude/skills/branching-story-health-audit/SKILL.md .claude/skills/branching-story-page-cycle/references/pre-flight-and-prerequisites.md .claude/skills/storylet-pool-authoring/references/pre-flight-and-prerequisites.md`
2. `grep -rn "STINT.*stent_id\\|stent_id.*STINT" .claude/skills/branching-story-page-cycle/references/phase-5-state-mutation.md .claude/skills/story-fact-promotion-to-canon/SKILL.md`
3. `grep -rn "STENTs' world_ent_id\\|each STENT's world_ent_id\\|STENT.world_ent_id" .claude/skills/branching-story-health-audit .claude/skills/branching-story-page-cycle .claude/skills/storylet-pool-authoring`
