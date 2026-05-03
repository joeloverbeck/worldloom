# PEENH-002: Clean stale story-skill read-discipline Hook wording after PEENH-001

**Status**: COMPLETED
**Priority**: LOW
**Effort**: Small
**Engine Changes**: None — skill-prose cleanup only.
**Deps**: `archive/tickets/PEENH-001.md`

## Problem

At intake, post-ticket review of PEENH-001 found that story-bundle `_source` write discipline was correctly engine-routed, but a few story-pipeline read sections still explained direct story-bundle reads using stale Hook 3 match-pattern wording.

The issue was not that the skills still direct-wrote story `_source` records. They did not. The issue was that read-discipline prose said story-bundle records were direct-readable because they were not under Hook 3's old `worlds/<slug>/_source/` match pattern. After PEENH-001, Hook 3 does cover story-bundle `_source` for writes, while direct story-bundle reads remain permitted because Hook 2 read redirection is world-canon-only.

## Assumption Reassessment (2026-05-04)

1. **PEENH-001 landed the write-discipline migration** — `archive/tickets/PEENH-001.md` records Shape B routing for story-bundle `_source/<class>/*.yaml`, with Hook 3 blocking direct writes and story markdown remaining direct.
2. **FOUNDATIONS read/write split is now explicit** — `docs/FOUNDATIONS.md` §Story Bundles states story-bundle source records remain directly readable, while §Story Bundles §Write Discipline states story-bundle `_source` YAML writes route through `submit_patch_plan`.
3. **Shared boundary under audit** — the affected boundary is story-pipeline skill prose that distinguishes direct reads, engine-routed writes, and Hook 2 vs Hook 3 responsibilities.
4. **FOUNDATIONS principle** — do not weaken the PEENH-001 engine-only write discipline; this ticket only corrects stale explanatory text for reads.
5. **Observed stale anchors after skill extraction** — post-review grep still found two read-discipline anchors, but the page-cycle skill has since been split into a thin parent `SKILL.md` plus references:
   - `.claude/skills/branching-story-page-cycle/references/pre-flight-and-prerequisites.md` describes direct story-bundle page reads as "not under Hook 3's `worlds/<slug>/_source/` match pattern".
   - `.claude/skills/storylet-pool-authoring/SKILL.md` describes `STORY_KERNEL.md` direct read as "not under Hook 3's `worlds/<slug>/_source/` match pattern".
6. **Parent page-cycle SKILL.md inspected** — `.claude/skills/branching-story-page-cycle/SKILL.md` now delegates full prerequisites and governance details to `references/pre-flight-and-prerequisites.md` and `references/governance-and-foundations.md`; no ticket-owned stale read-discipline Hook 3 anchor remains in the parent file.
7. **Out-of-scope but related true prose** — references to story markdown writes being outside Hook 3 are still true when they point at non-`_source` markdown surfaces such as `INDEX.md`, `audits/`, `storylet-batches/`, and `story-promotions/`.

## Architecture Check

1. Replace stale Hook 3 read explanations with the current Hook 2/read-discipline explanation rather than adding compatibility aliases or alternate write paths.
2. No backwards-compatibility aliasing/shims introduced.

## Verification Layers

1. Direct story-bundle reads remain described as allowed because Hook 2 does not redirect nested story-bundle `_source` reads -> codebase grep-proof and manual review.
2. Story-bundle `_source` writes remain described as engine-routed through story-bundle patch-engine ops -> codebase grep-proof.
3. Story markdown write carve-outs remain intact -> manual review of the edited skill sections.

## Landed Changes

### 1. Updated stale read-discipline prose

In the affected story skills, stale references to old Hook 3 match-pattern gaps in read sections were replaced with Hook 2/read-discipline wording:

- direct story-bundle `_source` reads are permitted because Hook 2 does not redirect nested story-bundle `_source` paths;
- story-bundle `_source` writes remain blocked by Hook 3 and must route through patch-engine ops.

## Files to Touch

- `.claude/skills/branching-story-page-cycle/references/pre-flight-and-prerequisites.md` (modify)
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
rg -n -F 'not under Hook 3' .claude/skills/branching-story-page-cycle .claude/skills/storylet-pool-authoring
```

2. Write-discipline preservation sweep:

```bash
rg -n -F 'Direct `Write` is forbidden' .claude/skills/branching-story-page-cycle/SKILL.md .claude/skills/storylet-pool-authoring/SKILL.md
rg -n 'submit_patch_plan|story-bundle patch-engine ops' .claude/skills/branching-story-page-cycle/SKILL.md .claude/skills/storylet-pool-authoring/SKILL.md
```

## Outcome

PEENH-002 is implemented. The live stale read-discipline anchors now explain direct story-bundle reads via Hook 2's world-canon-only read redirection boundary rather than Hook 3's old write-guard match-pattern gap.

The extracted `branching-story-page-cycle` layout was reassessed before editing. The ticket-owned page-cycle change lives in `references/pre-flight-and-prerequisites.md`; the parent `SKILL.md` was inspected and did not contain the stale read-discipline anchor.

## Verification Result

Passed on 2026-05-04:

- `rg -n -F 'not under Hook 3' .claude/skills/branching-story-page-cycle .claude/skills/storylet-pool-authoring` — no stale read-discipline hits.
- `rg -n -F 'Direct `Write` is forbidden' .claude/skills/branching-story-page-cycle .claude/skills/storylet-pool-authoring` — write-forbidden language remains present in both affected skill surfaces.
- `rg -n 'submit_patch_plan|story-bundle patch-engine ops' .claude/skills/branching-story-page-cycle .claude/skills/storylet-pool-authoring` — engine-routed write language remains present.
- Manual review confirmed the remaining Hook 3 markdown carve-outs refer to non-`_source` surfaces such as `INDEX.md`, `SLB-NNNN.md`, page prose, and direct markdown writes.

## Deviations

- The drafted page-cycle file path was stale because `branching-story-page-cycle` recently extracted most detailed content from `SKILL.md` into reference files. The ticket-owned page-cycle edit therefore landed in `.claude/skills/branching-story-page-cycle/references/pre-flight-and-prerequisites.md`.
- One exploratory grep used a double-quoted pattern containing markdown backticks and triggered shell interpretation. It was discarded and rerun with safe single-quoted/literal patterns; only the safe proof commands are recorded above.
