# PEENH-002: Clean stale story-skill read-discipline Hook wording after PEENH-001

**Status**: PENDING
**Priority**: LOW
**Effort**: Small
**Engine Changes**: None — skill-prose cleanup only.
**Deps**: `archive/tickets/PEENH-001.md`

## Problem

Post-ticket review of PEENH-001 found that story-bundle `_source` write discipline is now correctly engine-routed, but a few story-pipeline read sections still explain direct story-bundle reads using stale Hook 3 match-pattern wording.

The issue is not that the skills still direct-write story `_source` records. They do not. The issue is that read-discipline prose says story-bundle records are direct-readable because they are not under Hook 3's old `worlds/<slug>/_source/` match pattern. After PEENH-001, Hook 3 does cover story-bundle `_source` for writes, while direct story-bundle reads remain permitted because Hook 2 read redirection is world-canon-only.

## Assumption Reassessment (2026-05-03)

1. **PEENH-001 landed the write-discipline migration** — `archive/tickets/PEENH-001.md` records Shape B routing for story-bundle `_source/<class>/*.yaml`, with Hook 3 blocking direct writes and story markdown remaining direct.
2. **FOUNDATIONS read/write split is now explicit** — `docs/FOUNDATIONS.md` §Story Bundles states story-bundle source records remain directly readable, while §Story Bundles §Write Discipline states story-bundle `_source` YAML writes route through `submit_patch_plan`.
3. **Shared boundary under audit** — the affected boundary is story-pipeline skill prose that distinguishes direct reads, engine-routed writes, and Hook 2 vs Hook 3 responsibilities.
4. **FOUNDATIONS principle** — do not weaken the PEENH-001 engine-only write discipline; this ticket only corrects stale explanatory text for reads.
5. **Observed stale anchors** — post-review grep found:
   - `.claude/skills/branching-story-page-cycle/SKILL.md` lines describing direct story-bundle reads as "not under Hook 3's `worlds/<slug>/_source/` match pattern".
   - `.claude/skills/storylet-pool-authoring/SKILL.md` line describing `STORY_KERNEL.md` direct read as "not under Hook 3's `worlds/<slug>/_source/` match pattern".
6. **Out-of-scope but related true prose** — references to story markdown writes being outside Hook 3 are still true when they point at non-`_source` markdown surfaces such as `INDEX.md`, `audits/`, `storylet-batches/`, and `story-promotions/`.

## Architecture Check

1. Replace stale Hook 3 read explanations with the current Hook 2/read-discipline explanation rather than adding compatibility aliases or alternate write paths.
2. No backwards-compatibility aliasing/shims introduced.

## Verification Layers

1. Direct story-bundle reads remain described as allowed because Hook 2 does not redirect nested story-bundle `_source` reads -> codebase grep-proof and manual review.
2. Story-bundle `_source` writes remain described as engine-routed through story-bundle patch-engine ops -> codebase grep-proof.
3. Story markdown write carve-outs remain intact -> manual review of the edited skill sections.

## What to Change

### 1. Update stale read-discipline prose

In the affected story skills, replace references to old Hook 3 match-pattern gaps in read sections with Hook 2/read-discipline wording:

- direct story-bundle `_source` reads are permitted because Hook 2 does not redirect nested story-bundle `_source` paths;
- story-bundle `_source` writes remain blocked by Hook 3 and must route through patch-engine ops.

## Files to Touch

- `.claude/skills/branching-story-page-cycle/SKILL.md` (modify)
- `.claude/skills/storylet-pool-authoring/SKILL.md` (modify)

## Out of Scope

- Any changes to patch-engine, hooks, validators, or MCP tooling.
- Any weakening of story-bundle `_source` write routing.
- Any changes to world content.

## Acceptance Criteria

### Tests That Must Pass

1. Grep for `not under Hook 3's \`worlds/<slug>/_source/\`` in story-pipeline read sections returns no stale read-discipline hits.
2. Grep confirms story-bundle `_source` write sections still say direct writes are forbidden and `submit_patch_plan` / story-bundle ops are required.
3. Manual review confirms markdown write carve-outs still name non-`_source` surfaces only.

### Invariants

1. Story-bundle `_source` YAML writes remain engine-routed.
2. Story-bundle `_source` direct reads remain allowed under the current read discipline.
3. Story markdown surfaces remain direct-write carve-outs.

## Test Plan

### New/Modified Tests

1. None — skill-prose cleanup only; verification is grep/manual-review based.

### Commands

1. Stale read-discipline sweep:

```bash
rg -n -F "story-bundle records are not under Hook 3" .claude/skills/branching-story-page-cycle/SKILL.md .claude/skills/storylet-pool-authoring/SKILL.md
```

2. Write-discipline preservation sweep:

```bash
rg -n -F 'Direct `Write` is forbidden' .claude/skills/branching-story-page-cycle/SKILL.md .claude/skills/storylet-pool-authoring/SKILL.md
rg -n 'submit_patch_plan|story-bundle patch-engine ops' .claude/skills/branching-story-page-cycle/SKILL.md .claude/skills/storylet-pool-authoring/SKILL.md
```
