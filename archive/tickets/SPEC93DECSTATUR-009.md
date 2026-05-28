# SPEC93DECSTATUR-009: Retire branching-story-prose-attach skill; reconcile downstream cross-references

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — retired `.claude/skills/branching-story-prose-attach/SKILL.md`; updated `branching-story-health-audit/SKILL.md`, `skill-audit/references/cross-skill-consistency.md`, `commitment-block-authoring/references/governance-and-foundations.md`, `story-fact-promotion-to-canon/SKILL.md`; verified `mcp-integration-audit/SKILL.md` already has no live `page_plan_drafts` reference
**Deps**: None

## Problem

At intake, `branching-story-prose-attach` validated rendered page prose against a page record + page plan and emitted a `pages-prose-receipts/PG-<integer>.yaml` receipt — superseded by SPEC-92's `branching-story-scene-prose-attach` + `scene-prose-receipt.schema.json`. SPEC-93 §2.5 retired the skill and reconciled the cross-references that named it. Per SPEC-93 reassessment Improvement M2, the `cross-skill-consistency.md` Category 2c roster was independently stale (listed 8 skills including prose-attach but missing the two SPEC-92 scene skills); this ticket fully reconciled it.

## Assumption Reassessment (2026-05-28)

1. At intake, `branching-story-prose-attach/SKILL.md` existed; `skill-audit/references/cross-skill-consistency.md:12` listed **8** Category 2c skills ("the eight story-pipeline skills per §7") with `branching-story-prose-attach` but WITHOUT `branching-story-scene-plan` / `branching-story-scene-prose-attach`, and its shared-surface bullet (v) pointed content-policy inlining at `pages-prose-plans/…§2` / page-plan §8; `branching-story-health-audit/SKILL.md`, `commitment-block-authoring/references/governance-and-foundations.md`, `mcp-integration-audit/SKILL.md`, `story-fact-promotion-to-canon/SKILL.md` carried page-plan / prose-attach cross-references — all confirmed during SPEC-93 reassessment (this session, Improvement M2).
2. SPEC-93 §2.5 (retire prose-attach) + §5 §7/§9 (roster) + §6 skills bullet (full cross-skill-consistency reconcile) + reassessment M2 (add the two scene skills, fix the count, retarget bullet (v)).
3. Cross-artifact boundary: the Category 2c roster is the shared cross-skill surface (defined in FOUNDATIONS §7/§9 — amended in SPEC93DECSTATUR-011 — and mirrored in `cross-skill-consistency.md`); this ticket reconciles the `cross-skill-consistency.md` mirror to match the post-SPEC-93 FOUNDATIONS roster of nine.
4. (was template item 7 — skill removal blast radius) Grep pipeline-wide for `branching-story-prose-attach`: `cross-skill-consistency.md` (roster + bullet v), `branching-story-health-audit/SKILL.md` (page-plan audit refs → scene/PG), `commitment-block-authoring/references/governance-and-foundations.md`, `mcp-integration-audit/SKILL.md` (drop the `page_plan_drafts` required-argument reference), `story-fact-promotion-to-canon/SKILL.md`, plus FOUNDATIONS §4a/§7/§9 (owned by SPEC93DECSTATUR-011) and `docs/WORKFLOWS.md` / `docs/REPOSITORY-MAP.md` (owned by 011).
5. Implementation reassessment found `mcp-integration-audit/SKILL.md` already has no `page_plan_drafts` hit. Its remaining `branching-story-prose-attach` hit is a labelled worked-precedent citation inside the MCP retrieval-gap rubric, not a live invocation or required argument, so this ticket left that pre-existing unrelated hunk untouched and made no ticket-owned edit to `mcp-integration-audit/SKILL.md`.

## Architecture Check

1. Retiring the skill outright (vs. aliasing to scene-prose-attach) is correct: the page-receipt path is superseded, not renamed, and SPEC-92 already provides the scene replacement.
2. No backwards-compatibility shim: `branching-story-prose-attach/SKILL.md` is deleted; cross-references are reconciled to the scene replacement or removed.

## Verification Layers

1. Skill retired -> codebase grep-proof (`branching-story-prose-attach/SKILL.md` absent).
2. Category 2c roster reconciled -> codebase grep-proof (`cross-skill-consistency.md` lists nine skills — the two scene skills present, prose-attach absent, count word and "per §7" claim updated, bullet (v) retargeted to scene-plan Content Policy).
3. Downstream cross-refs reconciled -> codebase grep-proof (health-audit / commitment-block / mcp-integration-audit / story-fact-promotion no longer carry live prose-attach / page-plan-authoring references; `mcp-integration-audit` drops the `page_plan_drafts` required-argument reference).

## Landed Changes

### 1. Retire the skill

Deleted `.claude/skills/branching-story-prose-attach/SKILL.md`. No prose-attach-only reference files remained in that skill directory.

### 2. Reconcile cross-skill-consistency.md (full M2 reconcile)

In `skill-audit/references/cross-skill-consistency.md`: removed `branching-story-prose-attach` from the Category 2c roster; added `branching-story-scene-plan` + `branching-story-scene-prose-attach`; fixed the "eight story-pipeline skills per §7" count/claim to nine; retargeted shared-surface bullet (v) so the content-policy-inlining note points at the scene-plan Content Policy section rather than page-plan §2 / §8.

### 3. Reconcile downstream skill cross-references

Updated `branching-story-health-audit/SKILL.md` (page-plan audit references → scene/PG and scene-prose attach), `commitment-block-authoring/references/governance-and-foundations.md`, and `story-fact-promotion-to-canon/SKILL.md` (page-plan evidence-context references removed). `mcp-integration-audit/SKILL.md` was checked and required no ticket-owned edit because `page_plan_drafts` was already absent.

## Files to Touch

- `.claude/skills/branching-story-prose-attach/SKILL.md` (delete)
- `.claude/skills/skill-audit/references/cross-skill-consistency.md` (modify)
- `.claude/skills/branching-story-health-audit/SKILL.md` (modify)
- `.claude/skills/commitment-block-authoring/references/governance-and-foundations.md` (modify)
- `.claude/skills/mcp-integration-audit/SKILL.md` (checked only; no ticket-owned edit)
- `.claude/skills/story-fact-promotion-to-canon/SKILL.md` (modify)

## Out of Scope

- The FOUNDATIONS §4a/§7/§9 roster amendments (SPEC93DECSTATUR-011).
- `docs/WORKFLOWS.md` / `docs/REPOSITORY-MAP.md` prose-attach references (SPEC93DECSTATUR-011).
- SPEC-92's `branching-story-scene-prose-attach` skill (already landed; only referenced here).

## Acceptance Criteria

### Tests That Must Pass

1. `branching-story-prose-attach/SKILL.md` no longer exists.
2. `cross-skill-consistency.md` Category 2c roster lists exactly nine skills (the two scene skills present; prose-attach absent), the count word reads "nine", and bullet (v) names the scene-plan Content Policy section.
3. `grep -rn "branching-story-prose-attach\|page_plan_drafts" .claude/skills/branching-story-health-audit .claude/skills/commitment-block-authoring .claude/skills/mcp-integration-audit .claude/skills/story-fact-promotion-to-canon` returns no live references (only annotated legacy mentions).

### Invariants

1. The `cross-skill-consistency.md` Category 2c roster matches the post-SPEC-93 FOUNDATIONS §7 roster of nine.
2. No downstream skill carries a live `branching-story-prose-attach` invocation or `page_plan_drafts` required-argument reference.

## Test Plan

### New/Modified Tests

1. `None — skill-doc ticket; verification is command-based (grep-proofs above) and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `grep -rn "branching-story-prose-attach" .claude/skills/` — expect only annotated legacy/retirement mentions.
2. `rg -o "branching-story-[a-z-]+" .claude/skills/skill-audit/references/cross-skill-consistency.md | sort | uniq -c` and manual review of the nine-skill roster.

## Outcome

Completed on 2026-05-28.

Retired the legacy page prose-attach skill by deleting `.claude/skills/branching-story-prose-attach/SKILL.md`. Reconciled the Category 2c roster in `cross-skill-consistency.md` to nine story-pipeline skills with the SPEC-92 scene-plan and scene-prose-attach skills present and the retired page prose-attach skill absent. Updated health-audit, commitment-block, and story-fact-promotion prose so live handoffs and audit checks point at PG/SE state and the scene prose-attach layer rather than the retired page-plan/page-prose-attach flow.

## Verification Result

1. `test ! -e .claude/skills/branching-story-prose-attach/SKILL.md` — passed; the retired skill file is absent.
2. `rg -n "branching-story-prose-attach|page_plan_drafts" .claude/skills/branching-story-health-audit .claude/skills/commitment-block-authoring .claude/skills/mcp-integration-audit .claude/skills/story-fact-promotion-to-canon` — returned one historical worked-precedent hit in `mcp-integration-audit/SKILL.md` and no live invocation or `page_plan_drafts` hit.
3. `rg -n "branching-story-prose-attach" .claude/skills/branching-story-health-audit .claude/skills/commitment-block-authoring .claude/skills/story-fact-promotion-to-canon .claude/skills/skill-audit/references/cross-skill-consistency.md` — passed with no matches.
4. `rg -o "branching-story-[a-z-]+" .claude/skills/skill-audit/references/cross-skill-consistency.md | sort | uniq -c` plus manual review — confirmed the Category 2c roster has the two scene skills present and no prose-attach entry; broader file references to bootstrap / turn-cycle / health-audit are outside the roster count.

## Deviations

- `mcp-integration-audit/SKILL.md` was not edited by this ticket. It already had no `page_plan_drafts` reference; its remaining `branching-story-prose-attach` mention is historical worked-precedent evidence. The file has pre-existing unrelated dirty hunks from a separate ticket-authoring/audit-discipline change and was left unstaged.
- The drafted `grep -c "branching-story"` roster proof was replaced with an occurrence/classification proof because `grep -c` counts matching lines, not roster items.
