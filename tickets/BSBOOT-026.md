# BSBOOT-026: Correct stale `pages-prose/` path in engine-envelope-shape.md

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: None — single-line documentation edit inside `.claude/skills/branching-story-bootstrap/references/engine-envelope-shape.md`.
**Deps**: None.

## Problem

`references/engine-envelope-shape.md` line 288 (Section 8, "Worked example: minimal bootstrap submit sequence") instructs the operator to verify the receipt before proceeding to the post-engine markdown writes, and lists those writes as `(STORY_KERNEL.md, pages-prose/PG-0001.md, INDEX.md, stories/INDEX.md per Phase 11 steps 4-6)`. The reference to `pages-prose/PG-0001.md` is a leftover from before the prose-strip rework (PROSESPLIT-007 / 008 / 009): bootstrap no longer writes rendered prose. SKILL.md Phase 11 step 4 writes `pages-prose-plans/PG-0001.md` (the comprehensive plan), and step 1 leaves `pages-prose/` containing only a `.gitkeep`. An operator reading the worked-example block in isolation would mistakenly produce a `pages-prose/PG-0001.md` write at bundle commit, violating the skill's own "Never write rendered prose" guardrail.

## Assumption Reassessment (2026-05-11)

1. `references/engine-envelope-shape.md` line 288 verbatim: `Verify the receipt before proceeding to the post-engine markdown writes (STORY_KERNEL.md, pages-prose/PG-0001.md, INDEX.md, stories/INDEX.md per Phase 11 steps 4-6).` Confirmed by direct read.
2. SKILL.md Phase 11 step 4 (line 367 verbatim): `Write worlds/<world-slug>/stories/<story-slug>/pages-prose-plans/PG-0001.md (the populated canonical plan template from Phase 7's working buffer ...). Bootstrap NEVER writes pages-prose/PG-0001.md itself`. Confirmed by direct read.
3. SKILL.md "Guardrails" block (line 392 verbatim): `Never write rendered prose. This skill writes only pages-prose-plans/PG-0001.md (the comprehensive plan). The rendered prose file pages-prose/PG-0001.md is supplied externally (manual author or external LLM renderer) after bundle commit and merged via branching-story-page-prose-finalize.` Confirmed by direct read.
4. No other line in `references/engine-envelope-shape.md` mentions `pages-prose/` outside this one occurrence. `grep -n "pages-prose" .claude/skills/branching-story-bootstrap/references/engine-envelope-shape.md` returns only line 288. The fix is bounded.
5. No external sibling skill cites this exact line. The reference is heavily cited (storylet-pool-authoring SKILL.md and page-cycle SKILL.md both link §1-§6) but the §8 worked example is bootstrap-internal narrative; sibling citations target §1-§6 only.
6. Mismatch + correction: line 288 must read `pages-prose-plans/PG-0001.md` to match Phase 11 step 4's contract and the Guardrails statement.

## Architecture Check

1. One-character-class edit. No semantic re-design. The intent of line 288 ("verify the receipt before the surrounding markdown writes") is correct; only the path component is stale.
2. No backwards-compatibility aliasing introduced — the stale path is replaced outright.

## Verification Layers

1. `references/engine-envelope-shape.md` mentions `pages-prose/PG-0001.md` zero times after the edit → codebase grep-proof (`grep -n "pages-prose/PG-0001" .claude/skills/branching-story-bootstrap/references/engine-envelope-shape.md` returns no matches).
2. Every `pages-prose-plans/` occurrence in the file pairs with the plan-write contract; every `pages-prose/` occurrence (if any remain) refers ONLY to the externally-supplied rendered prose, not to a bootstrap write → manual review (skim each occurrence post-edit).

## What to Change

### 1. Single line in `references/engine-envelope-shape.md`

Change line 288 from:

```
The CLI submit returns the same `PatchReceipt` object as `mcp__worldloom__submit_patch_plan`: `applied_at`, `files_written[]`, `new_nodes[]`, `id_allocations_consumed`, `index_sync_duration_ms`, and `validators_run[]`. Verify the receipt before proceeding to the post-engine markdown writes (STORY_KERNEL.md, pages-prose/PG-0001.md, INDEX.md, stories/INDEX.md per Phase 11 steps 4-6).
```

to:

```
The CLI submit returns the same `PatchReceipt` object as `mcp__worldloom__submit_patch_plan`: `applied_at`, `files_written[]`, `new_nodes[]`, `id_allocations_consumed`, `index_sync_duration_ms`, and `validators_run[]`. Verify the receipt before proceeding to the post-engine markdown writes (STORY_KERNEL.md, pages-prose-plans/PG-0001.md, INDEX.md, stories/INDEX.md per Phase 11 steps 4-6).
```

## Files to Touch

- `.claude/skills/branching-story-bootstrap/references/engine-envelope-shape.md` (modify)

## Out of Scope

- The §1-§6 sections of `engine-envelope-shape.md` (cross-skill canonical authority — unchanged).
- Any rename of the file or its move to `_shared-templates/` — flagged in the audit report as an architecture concern, deliberately deferred.
- Any change to the rest of the §8 worked example — only line 288 carries the stale path.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -n "pages-prose/PG-0001" .claude/skills/branching-story-bootstrap/references/engine-envelope-shape.md` returns no matches.
2. `grep -n "pages-prose-plans/PG-0001" .claude/skills/branching-story-bootstrap/references/engine-envelope-shape.md` returns line 288 (or whichever line the worked-example summary lands on after edit).
3. `grep -rn "pages-prose/PG-0001" .claude/skills/branching-story-bootstrap/` returns no results across the whole skill directory.

### Invariants

1. Bootstrap writes `pages-prose-plans/PG-0001.md` at Phase 11 step 4; bootstrap NEVER writes `pages-prose/PG-0001.md`. Every reference document inside `.claude/skills/branching-story-bootstrap/` must reflect this — drift like the line-288 leftover silently invites guardrail violations.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `grep -n "pages-prose" .claude/skills/branching-story-bootstrap/references/engine-envelope-shape.md` — visually verify every remaining `pages-prose` occurrence either refers to `pages-prose-plans/` (bootstrap's plan-write surface) or to the externally-supplied `pages-prose/PG-NNNN.md` rendered prose file (never a bootstrap write).
2. `grep -rn "pages-prose/PG-0001" .claude/skills/branching-story-bootstrap/` — full skill-directory sweep returns no occurrences; the bootstrap surface is path-consistent post-fix.
