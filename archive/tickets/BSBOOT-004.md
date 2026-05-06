# BSBOOT-004: Reconcile storylet shape-label enums between STORY_KERNEL and bundle INDEX

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: None — `branching-story-bootstrap/templates/story-bundle-index.md` only.
**Deps**: none

## Problem

At intake, two templates that programmatic consumers (runtime page-cycle, branching-story-health-audit) read together used different label vocabularies for the same underlying bootstrap-mix summary:

- `templates/story-kernel.md:73-79` (`storylet_pool_summary.shape_distribution`) uses: `entry_pressure`, `cast_introduction`, `threat_escalation`, `relational_dynamics`, `routine_disruption`, `aftermath_sequel`, `reflection_dilemma`.
- `templates/story-bundle-index.md:42` summarizes shapes as: `opening`, `escalation`, `relational`, `routine`, `aftermath`, `reflection`, `other`.

The bundle INDEX.md is consumed by `branching-story-page-cycle` and `branching-story-health-audit` per its own header comment (`templates/story-bundle-index.md:8-10`). Mismatched bootstrap-mix labels break programmatic shape-distribution reads and force consumers to maintain a synonym map. The kernel's seven bootstrap-mix labels are the canonical initial-bootstrap summary labels, matching `storylet-pool-authoring` Phase 2 §Bootstrap-mix shape weighting. The full `storylet-pool-authoring/templates/storylet-record.yaml` `shape` field domain is broader for non-bootstrap / later-pool storylets, so this ticket only aligns the initial bootstrap INDEX template to the kernel's bootstrap-mix summary.

## Assumption Reassessment (2026-05-06)

1. `templates/story-kernel.md:73-79` — `storylet_pool_summary.shape_distribution` uses the canonical seven-value enum. Verified.
2. `templates/story-bundle-index.md:42` — INDEX uses the abbreviated seven-label form including `other`. Verified.
3. Cross-skill / cross-artifact boundary: the bundle INDEX.md is the shared artifact between `branching-story-bootstrap` (writer), `branching-story-page-cycle` (writer/updater on every page tick), and `branching-story-health-audit` (reader). The shape-label enum is the boundary under audit.
4. Schema-extension classification: this is a label-vocabulary alignment, not a schema extension. `storylet-pool-authoring/templates/storylet-record.yaml` currently allows additional shapes (`mystery_edge_brush`, `fork_recovery`, `thread_resolution`, `aftermath_residue`, `intimacy`, `confrontation`, `other`) outside the seven bootstrap-mix labels; those later-pool labels are outside this ticket's initial bootstrap INDEX template boundary.
5. Existing world-content check: `find worlds -path "*/stories/*/INDEX.md" -exec grep -Hn "Shape distribution" {} +` found `worlds/erotica-world/stories/red-bunny/INDEX.md` using canonical full-domain labels, not the abbreviated `opening` / `escalation` / `relational` / `routine` / `aftermath` / `reflection` form. This is gitignored world content and is not migrated by this ticket.

## Architecture Check

1. **Why cleaner**: aligning the initial INDEX template to the canonical bootstrap-mix labels removes the synonym-map liability for downstream consumers. The kernel's bootstrap-mix summary is the upstream authority for the initial bundle summary; the per-storylet shape field can remain broader without requiring abbreviated aliases.
2. No backwards-compatibility shim. Any committed bundle whose INDEX uses the old labels remains valid as a historical record; new bundles use the canonical enum directly.

## Verification Layers

1. `templates/story-bundle-index.md` shape line uses the seven canonical values → codebase grep-proof.
2. Consumer compatibility — `branching-story-page-cycle` and `branching-story-health-audit` either parse the canonical enum or do not parse this line at all → codebase grep-proof (`grep -rn "shape_distribution\|Shape distribution" .claude/skills/branching-story-page-cycle/ .claude/skills/branching-story-health-audit/`).

## Landed Changes

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

  Drop the abbreviated `other:` slot from the initial bootstrap template. The full storylet `shape` field remains broader for non-bootstrap / later-pool storylets; this template line documents the bootstrap-mix summary that mirrors `STORY_KERNEL.md`.

## Files to Touch

- `.claude/skills/branching-story-bootstrap/templates/story-bundle-index.md` (modify)
- `tickets/BSBOOT-004.md` (modify — reassessment and closeout)

## Out of Scope

- Modifying `story-kernel.md` (already canonical).
- Modifying `storylet-pool-authoring` templates (already canonical for the full storylet shape domain).
- Migrating any committed bundle's INDEX.md (historical bundles retain whatever labels they shipped with).
- Migrating gitignored/local world bundle INDEX.md files; existing canonical full-domain lines are outside this forward-template fix.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -n "Shape distribution" .claude/skills/branching-story-bootstrap/templates/story-bundle-index.md` shows the seven canonical labels (entry_pressure, cast_introduction, threat_escalation, relational_dynamics, routine_disruption, aftermath_sequel, reflection_dilemma).
2. `grep -nE '(^|[|[:space:]])(opening|escalation|relational|routine|aftermath|reflection|other):' .claude/skills/branching-story-bootstrap/templates/story-bundle-index.md` returns no abbreviated-form matches on the Shape distribution line.

### Invariants

1. Both `templates/story-kernel.md` and the initial `templates/story-bundle-index.md` summary reference the same seven bootstrap-mix shape values.
2. `storylet-pool-authoring` Phase 2 bootstrap-mix vocabulary remains the upstream authority for the initial bootstrap summary; the full per-storylet shape domain remains broader and unchanged.

## Test Plan

### New/Modified Tests

1. None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.

### Commands

1. `diff <(grep -oE "entry_pressure|cast_introduction|threat_escalation|relational_dynamics|routine_disruption|aftermath_sequel|reflection_dilemma" .claude/skills/branching-story-bootstrap/templates/story-kernel.md | sort -u) <(grep -oE "entry_pressure|cast_introduction|threat_escalation|relational_dynamics|routine_disruption|aftermath_sequel|reflection_dilemma" .claude/skills/branching-story-bootstrap/templates/story-bundle-index.md | sort -u)` — both files reference the same canonical seven (diff exits empty).
2. `grep -nE '(^|[|[:space:]])(opening|escalation|relational|routine|aftermath|reflection|other):' .claude/skills/branching-story-bootstrap/templates/story-bundle-index.md` — confirms the old abbreviated labels are absent without matching canonical longer labels such as `threat_escalation` or `relational_dynamics`.
3. `grep -rn "Shape distribution" .claude/skills/` — surface any other skill that templates this line and verify cross-skill alignment.

## Outcome

Completed: 2026-05-06.

`branching-story-bootstrap/templates/story-bundle-index.md` now uses the seven canonical bootstrap-mix labels on its initial `Shape distribution` line: `entry_pressure`, `cast_introduction`, `threat_escalation`, `relational_dynamics`, `routine_disruption`, `aftermath_sequel`, and `reflection_dilemma`.

The ticket was reassessed against the live storylet contract: the initial bootstrap summary is seven-value, while the full storylet `shape` field remains broader for later-pool storylets. No `storylet-pool-authoring` template, consumer skill, or world-content file was changed.

## Verification Result

1. `grep -n 'Shape distribution' .claude/skills/branching-story-bootstrap/templates/story-bundle-index.md` — returned the updated canonical bootstrap-mix line.
2. `grep -nE '(^|[|[:space:]])(opening|escalation|relational|routine|aftermath|reflection|other):' .claude/skills/branching-story-bootstrap/templates/story-bundle-index.md` — returned no abbreviated-label matches after the proof command was tightened to require a label boundary before the old word.
3. `diff <(grep -oE 'entry_pressure|cast_introduction|threat_escalation|relational_dynamics|routine_disruption|aftermath_sequel|reflection_dilemma' .claude/skills/branching-story-bootstrap/templates/story-kernel.md | sort -u) <(grep -oE 'entry_pressure|cast_introduction|threat_escalation|relational_dynamics|routine_disruption|aftermath_sequel|reflection_dilemma' .claude/skills/branching-story-bootstrap/templates/story-bundle-index.md | sort -u)` — exited empty; the kernel and initial INDEX template expose the same seven bootstrap-mix labels.
4. `grep -rn 'shape_distribution\|Shape distribution' .claude/skills/branching-story-page-cycle/ .claude/skills/branching-story-health-audit/` — returned no matches; those consumers do not currently parse or template this line.
5. `grep -rn 'Shape distribution' .claude/skills/` — found the updated bootstrap INDEX line plus `storylet-pool-authoring` full-domain/batch references; no other bootstrap-style abbreviated INDEX line was found.
6. `git diff --check -- .claude/skills/branching-story-bootstrap/templates/story-bundle-index.md tickets/BSBOOT-004.md` — passed.

## Deviations

- The drafted proof command `grep -nE "opening|escalation|relational|routine|aftermath|reflection|other"` was too broad because it matched substrings in canonical labels such as `threat_escalation` and `relational_dynamics`; it was replaced with a boundary-aware old-label grep.
- The draft described the storylet `shape` field domain as the same closed seven-value set. Live reassessment found the full storylet domain is broader; this ticket only aligns the initial bootstrap INDEX summary with `STORY_KERNEL.md`.
