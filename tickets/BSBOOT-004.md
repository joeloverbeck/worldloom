# BSBOOT-004: Reconcile storylet shape-label enums between STORY_KERNEL and bundle INDEX

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: None — `branching-story-bootstrap/templates/story-bundle-index.md` only.
**Deps**: none

## Problem

Two templates that programmatic consumers (runtime page-cycle, branching-story-health-audit) read together use different label vocabularies for the same underlying enum:

- `templates/story-kernel.md:73-79` (`storylet_pool_summary.shape_distribution`) uses: `entry_pressure`, `cast_introduction`, `threat_escalation`, `relational_dynamics`, `routine_disruption`, `aftermath_sequel`, `reflection_dilemma`.
- `templates/story-bundle-index.md:42` summarizes shapes as: `opening`, `escalation`, `relational`, `routine`, `aftermath`, `reflection`, `other`.

The bundle INDEX.md is consumed by `branching-story-page-cycle` and `branching-story-health-audit` per its own header comment (`templates/story-bundle-index.md:8-10`). Mismatched enums break programmatic shape-distribution reads and force consumers to maintain a synonym map. The kernel enum is the canonical one (it matches `storylet-pool-authoring` Phase 2 §Bootstrap-mix shape weighting and the `storylet-pool-authoring/templates/storylet-record.yaml` `shape` field domain).

## Assumption Reassessment (2026-05-06)

1. `templates/story-kernel.md:73-79` — `storylet_pool_summary.shape_distribution` uses the canonical seven-value enum. Verified.
2. `templates/story-bundle-index.md:42` — INDEX uses the abbreviated seven-label form including `other`. Verified.
3. Cross-skill / cross-artifact boundary: the bundle INDEX.md is the shared artifact between `branching-story-bootstrap` (writer), `branching-story-page-cycle` (writer/updater on every page tick), and `branching-story-health-audit` (reader). The shape-label enum is the boundary under audit.
4. Schema-extension classification: this is a label-vocabulary alignment, not a schema extension. No consumer is currently relying on the abbreviated form because no committed bundle has yet emitted the abbreviated INDEX shape line in production (verify via `find worlds -path "*/stories/*/INDEX.md" -exec grep -l "Shape distribution" {} \;` and inspect any matches before merging).

## Architecture Check

1. **Why cleaner**: aligning to the canonical seven-value enum removes the synonym-map liability for downstream consumers. The kernel enum is the upstream authority (originates in `storylet-pool-authoring`), and the INDEX is the downstream summary — INDEX should adopt the upstream enum, not invent its own.
2. No backwards-compatibility shim. Any committed bundle whose INDEX uses the old labels remains valid as a historical record; new bundles use the canonical enum directly.

## Verification Layers

1. `templates/story-bundle-index.md` shape line uses the seven canonical values → codebase grep-proof.
2. Consumer compatibility — `branching-story-page-cycle` and `branching-story-health-audit` either parse the canonical enum or do not parse this line at all → codebase grep-proof (`grep -rn "shape_distribution\|Shape distribution" .claude/skills/branching-story-page-cycle/ .claude/skills/branching-story-health-audit/`).

## What to Change

### 1. `.claude/skills/branching-story-bootstrap/templates/story-bundle-index.md`

- Replace line 42:

  **Before:**

  ```
  Shape distribution: opening: N | escalation: N | relational: N | routine: N | aftermath: N | reflection: N | other: N
  ```

  **After:**

  ```
  Shape distribution: entry_pressure: N | cast_introduction: N | threat_escalation: N | relational_dynamics: N | routine_disruption: N | aftermath_sequel: N | reflection_dilemma: N
  ```

  Drop the `other:` slot — the upstream enum is closed under `storylet-pool-authoring` Phase 2 §Bootstrap-mix shape weighting; if a future authoring path introduces a new shape, it gets added to the upstream enum first and propagates here.

## Files to Touch

- `.claude/skills/branching-story-bootstrap/templates/story-bundle-index.md` (modify)

## Out of Scope

- Modifying `story-kernel.md` (already canonical).
- Modifying `storylet-pool-authoring` templates (already canonical).
- Migrating any committed bundle's INDEX.md (historical bundles retain whatever labels they shipped with).

## Acceptance Criteria

### Tests That Must Pass

1. `grep -n "Shape distribution" .claude/skills/branching-story-bootstrap/templates/story-bundle-index.md` shows the seven canonical labels (entry_pressure, cast_introduction, threat_escalation, relational_dynamics, routine_disruption, aftermath_sequel, reflection_dilemma).
2. `grep -nE "opening|escalation|relational|routine|aftermath|reflection|other" .claude/skills/branching-story-bootstrap/templates/story-bundle-index.md` returns no abbreviated-form matches on the Shape distribution line.

### Invariants

1. Both `templates/story-kernel.md` and `templates/story-bundle-index.md` reference the same seven shape values.
2. `storylet-pool-authoring` Phase 2 shape vocabulary remains the upstream authority; bootstrap consumes, never invents.

## Test Plan

### New/Modified Tests

1. None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.

### Commands

1. `diff <(grep -oE "entry_pressure|cast_introduction|threat_escalation|relational_dynamics|routine_disruption|aftermath_sequel|reflection_dilemma" .claude/skills/branching-story-bootstrap/templates/story-kernel.md | sort -u) <(grep -oE "entry_pressure|cast_introduction|threat_escalation|relational_dynamics|routine_disruption|aftermath_sequel|reflection_dilemma" .claude/skills/branching-story-bootstrap/templates/story-bundle-index.md | sort -u)` — both files reference the same canonical seven (diff exits empty).
2. `grep -rn "Shape distribution" .claude/skills/` — surface any other skill that templates this line and verify cross-skill alignment.
