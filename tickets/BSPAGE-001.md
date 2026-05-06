# BSPAGE-001: Update page-cycle INDEX storylet-pool summary after JIT SLT creation

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: None — `branching-story-page-cycle/SKILL.md` only.
**Deps**: `archive/tickets/BSBOOT-004.md` (clarifies that the initial bootstrap INDEX uses seven bootstrap-mix labels, while later storylet-pool summaries may use the full storylet shape domain).

## Problem

`BSBOOT-004` aligned the initial `branching-story-bootstrap/templates/story-bundle-index.md` `Shape distribution` line to the seven bootstrap-mix labels used in `STORY_KERNEL.md`. A downstream sweep found that most named consumers do not need changes:

- `branching-story-health-audit` does not parse or update the top-level bundle `INDEX.md` storylet-pool shape line; it is read-only against top-level story state and its RSP card template already uses the full SLT shape enum.
- `story-fact-promotion-to-canon` updates only the `## Promotions` section and contradicting-branch markers in the top-level bundle `INDEX.md`.
- `storylet-pool-authoring` direct invocation already uses full-domain shape summaries in its Phase 6 deliverable and updates the `INDEX.md` storylet-pool section with per-shape distribution after direct batches.

The remaining mismatch is in `branching-story-page-cycle`: its Phase 4 may JIT-create a runtime `SLT-NNNN` via `storylet-pool-authoring mode=jit`, and `storylet-pool-authoring/SKILL.md` says the page-cycle parent writes the returned JIT SLT and updates `INDEX.md`. But `branching-story-page-cycle/SKILL.md` currently lists the per-bundle INDEX update as branch rows, thread status, latest health snapshot, fork rows, terminal status, and supersession entries only. It omits updating the storylet-pool total / per-shape distribution when `create_slt_record` fires.

That omission can leave the bundle's top-level `INDEX.md` storylet-pool summary stale after a runtime JIT storylet, especially when the JIT shape is outside the seven bootstrap-mix labels (`mystery_edge_brush`, `fork_recovery`, `thread_resolution`, `aftermath_residue`, `intimacy`, `confrontation`, `other`).

## Assumption Reassessment (2026-05-06)

1. `archive/tickets/BSBOOT-004.md` — verified the completed boundary: initial bootstrap INDEX template uses the seven bootstrap-mix labels; the full per-storylet shape domain remains broader and unchanged.
2. `.claude/skills/branching-story-page-cycle/SKILL.md:223-230` and `:367-372` — verified the per-bundle `INDEX.md` update list omits the storylet-pool section even though Phase 11 can submit `create_slt_record` when Phase 4 JIT expansion fires.
3. Cross-skill / cross-artifact boundary: the shared artifact is `worlds/<world-slug>/stories/<story-slug>/INDEX.md`, written by `branching-story-bootstrap`, `branching-story-page-cycle`, `storylet-pool-authoring`, and `story-fact-promotion-to-canon`. This ticket owns only the page-cycle JIT-SLT update path for the storylet-pool summary.
4. `.claude/skills/storylet-pool-authoring/SKILL.md:331-340` — verified the direct storylet-pool writer updates total count and per-shape distribution, and the JIT parent path says `branching-story-page-cycle` owns the write.
5. `.claude/skills/branching-story-health-audit/templates/remediation-storylet-proposal-card.md:30-31` — verified RSP cards already use the full SLT shape enum; no health-audit change is required for this concern.
6. `.claude/skills/story-fact-promotion-to-canon/SKILL.md:553-563` — verified promotion updates only the Promotions section and contradicting-branch markers; no promotion-skill change is required.
7. FOUNDATIONS principle: `docs/FOUNDATIONS.md §Story Bundles §2 Storage Form` defines per-bundle `INDEX.md` as a derived rendering of bundle state. When page-cycle creates a new JIT storylet, the derived storylet-pool summary must be refreshed so the rendering remains truthful.
8. HARD-GATE / canon discipline: the change is documentation/procedure for a direct-write markdown surface after the existing page-cycle gate. It does not alter approval tokens, validators, patch-engine submission, Mystery Reserve enforcement, or world-canon mutation.
9. Adjacent contradiction classification: this is separate downstream page-cycle fallout exposed by BSBOOT-004's shape-summary review. It does not prove BSBOOT-004 unfinished, because BSBOOT-004 only owned the initial bootstrap INDEX template.

## Architecture Check

1. The clean path is to make `branching-story-page-cycle` explicitly refresh the storylet-pool summary only when it actually JIT-creates an SLT. That keeps bootstrap's initial seven-label summary truthful while preserving the full-domain shape distribution for later runtime/focus/audit additions.
2. No backwards-compatibility aliasing or synonym maps are introduced. Page-cycle should use canonical SLT `shape` values exactly as written on storylet records.

## Verification Layers

1. Page-cycle JIT path updates the storylet-pool section after `create_slt_record` → codebase grep-proof in `branching-story-page-cycle/SKILL.md`.
2. Shape vocabulary remains canonical full-domain SLT values, with no abbreviated aliases → manual review against `storylet-pool-authoring/templates/storylet-record.yaml`.
3. Non-owning downstream skills remain unchanged and correctly scoped → codebase grep-proof / manual review of health-audit RSP shape enum and story-fact-promotion `INDEX.md` section ownership.
4. FOUNDATIONS derived-index alignment → FOUNDATIONS alignment check against `docs/FOUNDATIONS.md §Story Bundles §2 Storage Form`.

## What to Change

### 1. `.claude/skills/branching-story-page-cycle/SKILL.md`

- In the `### Per-bundle index update` list near lines 223-230, add a conditional bullet:

  ```markdown
  - If Phase 4 JIT created an `SLT-NNNN`: update the `## Storylet pool` total and per-shape distribution using canonical SLT `shape` values from the storylet records; do not use abbreviated bootstrap labels.
  ```

- In Phase 11 step 3 near lines 367-372, add the same conditional operation to the concrete `INDEX.md` edit list, after branch/thread/health updates and before terminal/supersession notes:

  ```markdown
  - If `create_slt_record` fired for a JIT SLT: increment the storylet-pool total and update the per-shape distribution line/table with the JIT storylet's canonical `shape` value. Preserve existing shapes not touched this turn.
  ```

## Files to Touch

- `.claude/skills/branching-story-page-cycle/SKILL.md` (modify)

## Out of Scope

- Editing `branching-story-bootstrap`; BSBOOT-004 already landed the initial bootstrap template fix.
- Editing `storylet-pool-authoring`; direct invocation already updates storylet-pool totals/distribution, and its JIT parent contract correctly delegates the write to page-cycle.
- Editing `branching-story-health-audit`; RSP cards already use the full SLT shape enum and the audit skill does not update the top-level storylet-pool summary.
- Editing `story-fact-promotion-to-canon`; promotion owns the Promotions section, not storylet-pool counts.
- Migrating existing bundle `INDEX.md` files.
- Adding a parser, validator, or runtime tool. This is workflow-prose alignment for a direct-write markdown summary.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -nE "JIT.*Storylet pool|create_slt_record.*storylet-pool|canonical SLT.*shape" .claude/skills/branching-story-page-cycle/SKILL.md` returns matches in both the per-bundle index summary and Phase 11 concrete write list.
2. `grep -nE "opening:|escalation:|relational:|routine:|aftermath:|reflection:" .claude/skills/branching-story-page-cycle/SKILL.md` returns no abbreviated shape-label aliases.
3. Manual review confirms page-cycle preserves the existing `INDEX.md` storylet-pool distribution and only increments/adds the JIT storylet's canonical shape bucket when a JIT SLT is actually created.

### Invariants

1. Runtime JIT-created storylets appear in the top-level bundle `INDEX.md` storylet-pool summary.
2. Page-cycle uses canonical SLT `shape` values, not bootstrap-only abbreviated labels.
3. Non-JIT page ticks do not change storylet-pool totals/distribution.

## Test Plan

### New/Modified Tests

1. None — documentation-only ticket; verification is command-based and manual review of the page-cycle write procedure.

### Commands

1. `grep -nE "JIT|create_slt_record|storylet-pool|canonical SLT.*shape" .claude/skills/branching-story-page-cycle/SKILL.md` — confirms the JIT INDEX update is documented in the page-cycle skill.
2. `grep -nE "opening:|escalation:|relational:|routine:|aftermath:|reflection:" .claude/skills/branching-story-page-cycle/SKILL.md` — confirms no abbreviated shape aliases were introduced.
3. Manual cross-read `.claude/skills/storylet-pool-authoring/templates/storylet-record.yaml` and `.claude/skills/storylet-pool-authoring/SKILL.md` Phase 7 to confirm page-cycle's new wording uses the same canonical shape vocabulary and write ownership.
