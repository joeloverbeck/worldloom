# BSBOOT-011: Make storylet pool seed sizing scale-aware

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: None — `branching-story-bootstrap` skill prose only. The storylet-pool-authoring sub-routine already accepts caller-supplied `target_pool_size`; only the bootstrap-side computation of that argument changes.
**Deps**: none

## Problem

`SKILL.md:22-23` (the `intended_scale` argument doc) claims:

> "One of: one_shot | chapter | arc | open_ended. Recorded in STORY_KERNEL.md and used by Phase 6 storylet-pool sizing."

But Phase 6 doesn't actually use `intended_scale` for sizing. `references/phase-6-storylet-pool-seed.md:7` only says "default ~20", and the delegation contract at `:15` passes through `target_pool_size: <storylet_pool_seed_size>` (the user-supplied argument or the ~20 default). `intended_scale` is recorded but is operationally a no-op for the seed pool size.

That's adequate for one-shot or single-chapter bundles but materially under-scaled for arc or open-ended bundles, especially with multiple major cast members and high-salience obligations. A 20-storylet seed pool against a 4-member cast and 6 high-salience OBLs across 4 threads has no slack: every choice's continuation depends on a small pool, and Phase 8 gate 11's "≥1 continuation per CHC" check tightens to a binding constraint very early in the runtime page-cycle.

## Assumption Reassessment (2026-05-06)

1. `SKILL.md:22-23` claim verified.
2. `references/phase-6-storylet-pool-seed.md:7,15` — verified that `intended_scale` is not consumed in Phase 6's sizing logic.
3. `storylet-pool-authoring/SKILL.md:18` defines `target_pool_size` as a free integer; `:195` documents seed-mode default ~20 and per-context overrides. The sub-routine accepts whatever the caller passes; bootstrap is the bottleneck.
4. Cross-skill / cross-artifact boundary: the bootstrap-side `target_pool_size` computation feeds the storylet-pool-authoring `target_pool_size` argument; storylet-pool-authoring's Phase 2 then produces `target_pool_size + ceil(target_pool_size * 0.30)` seeds (per `phase-2-generation-seeds.md:3`). The bootstrap does not need to model the +30% buffer; it just supplies the right `target_pool_size`.
5. FOUNDATIONS / hard-gate principle: Phase 9 gate 9 (storylet diversity) requires "≥5 distinct shapes covered". A larger pool makes shape-diversity coverage easier, not harder; the change strengthens, not weakens, gate 9's headroom. HARD-GATE per-gate PASS+rationale discipline is unchanged.
6. Schema-extension classification: this is a sizing-formula documentation change. No schema, validator, or engine op changes.
7. Worked sizing check against the existing `red-bunny` bundle (gitignored, observable via `worlds/erotica-world/stories/red-bunny/`): if its bootstrap was run against an `arc`-scale premise with 3 majors + 4 high-salience OBLs, the proposed formula yields `32-48 + 6 + 8 = 46-62`, matching ChatGPT-Pro's report-recommended range without overshooting.

## Architecture Check

1. **Why cleaner**: a sizing formula keyed to `intended_scale` + state complexity makes the existing argument actually useful. The current ~20 default works for one-shots but silently under-allocates for arcs; a banded formula gives the operator predictable headroom without inflating one-shots.
2. No backwards-compatibility shim. Existing `storylet_pool_seed_size: 20` user overrides continue to work — the formula only fires when `storylet_pool_seed_size` is unset.

## Verification Layers

1. Phase 6 reference computes `target_pool_size` from `intended_scale` + state complexity → manual review (read the new formula).
2. The `storylet_pool_seed_size` user-override continues to short-circuit the formula → codebase grep-proof + manual review (the bootstrap argument doc at `SKILL.md:46` already says "Default: ~20" — clarify that the default is the formula, with an explicit-numeric override).
3. Phase 9 gate 9 ("≥5 distinct shapes covered") still passes with the new sizing → manual review (a larger pool only widens the shape-coverage headroom).

## What to Change

### 1. `.claude/skills/branching-story-bootstrap/references/phase-6-storylet-pool-seed.md`

- Replace lines 7-9 (the opening) with:

  ```
  Use `storylet-pool-authoring` as an in-memory sub-routine to generate `target_pool_size` (computed below) approved `SLT-NNNN` records for `_source/storylets/`.

  ## Computing `target_pool_size`

  The bootstrap computes `target_pool_size` from `intended_scale` + state complexity. The `storylet_pool_seed_size` argument, if explicitly supplied by the user, short-circuits this computation.

  Base by `intended_scale`:

  | `intended_scale` | base range |
  |---|---|
  | `one_shot` | 14-18 |
  | `chapter` | 18-26 |
  | `arc` | 32-48 |
  | `open_ended` | 45-70 |

  Pick the midpoint of the range, then add complexity modifiers:

  - +2 per non-protagonist major in `cast_bind_list`
  - +2 per high-salience OBL emitted in Phase 5 (`salience >= 7`)
  - +1 per active mystery-edge thread in Phase 5
  - +1 per `accessible_locations` entry beyond `current_location` (per the PG-0001 state snapshot sketch)

  Cap the result at the upper end of the next-larger band (e.g. an `arc` bundle that complexity-scales above 48 may go up to 70 — the `open_ended` cap — but no higher). If the user supplied `storylet_pool_seed_size` explicitly, use that value directly and record a one-line note in `STORY_KERNEL.md.storylet_pool_summary` ("explicit user override; formula-suggested would have been N").

  If the formula yields fewer than the minimum coverage floor for gate 9 (≥5 distinct shapes covered, plus ≥1 storylet per shape), raise to the minimum and record a warning at Phase 10 deliverable summary.
  ```

- Update line 20 (the bootstrap-mix shape weights line) to: "`storylet-pool-authoring` Phase 2 §Bootstrap-mix shape weighting is the coverage contract: entry_pressure 3-5, cast_introduction 1 per non-protagonist major, threat_escalation 2-4, relational_dynamics 3-5, routine_disruption 2-3, aftermath_sequel 2-3, reflection_dilemma 2-3. The bootstrap-supplied `target_pool_size` (computed above) sets the upper bound; the storylet-pool-authoring sub-routine then produces `target_pool_size + ceil(target_pool_size * 0.30)` candidate seeds (per `storylet-pool-authoring/references/phase-2-generation-seeds.md:3`'s +30% replacement buffer rule)."

### 2. `.claude/skills/branching-story-bootstrap/SKILL.md`

- Argument doc for `storylet_pool_seed_size` (line 45-47): replace "Default: ~20." with "Default: computed from `intended_scale` + state complexity (see `references/phase-6-storylet-pool-seed.md` §Computing target_pool_size). Setting this argument explicitly overrides the formula."

### 3. `.claude/skills/branching-story-bootstrap/templates/story-kernel.md`

- `storylet_pool_summary` block (lines 70-79): the `total: 20` example is now misleading. Add a comment line above it: "# total: derived from intended_scale + complexity per references/phase-6-storylet-pool-seed.md §Computing target_pool_size; user override permitted via `storylet_pool_seed_size` argument."

## Files to Touch

- `.claude/skills/branching-story-bootstrap/references/phase-6-storylet-pool-seed.md` (modify)
- `.claude/skills/branching-story-bootstrap/SKILL.md` (modify)
- `.claude/skills/branching-story-bootstrap/templates/story-kernel.md` (modify)

## Out of Scope

- Editing storylet-pool-authoring. The sub-routine's `target_pool_size` argument is unchanged; only the bootstrap's computation of that argument changes.
- Migrating committed bundles. Forward-only.
- Moving the formula to a shared reference between bootstrap and any future story-creation skill. If a sibling story-bundle producer ever appears, the formula can be hoisted then.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -nE "intended_scale|one_shot|chapter|arc|open_ended" .claude/skills/branching-story-bootstrap/references/phase-6-storylet-pool-seed.md` returns matches that include the four scale tiers + their banded ranges.
2. `grep -nE "salience >= 7|mystery-edge|accessible_locations" .claude/skills/branching-story-bootstrap/references/phase-6-storylet-pool-seed.md` returns matches for the complexity modifiers.
3. `SKILL.md` argument doc for `storylet_pool_seed_size` no longer states `Default: ~20` as the sole default — it references the formula instead.
4. The bootstrap-mix shape weights line preserves the `storylet-pool-authoring` cross-reference and does not duplicate the +30% buffer rule (which lives upstream).

### Invariants

1. `intended_scale` is a load-bearing input into Phase 6 sizing.
2. Explicit `storylet_pool_seed_size` argument always wins over the formula.
3. The +30% replacement-buffer rule remains storylet-pool-authoring's concern, not bootstrap's.
4. Gate 9's ≥5-distinct-shapes-covered floor is honored by the formula's minimum coverage clause.

## Test Plan

### New/Modified Tests

1. None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.

### Commands

1. `grep -nE "target_pool_size|intended_scale" .claude/skills/branching-story-bootstrap/references/phase-6-storylet-pool-seed.md` — confirms the formula is documented and `intended_scale` is consumed.
2. (Manual) compute the formula against three representative bundles (one_shot 2-cast no-modifiers; chapter 3-cast 2 high-OBL 1 mystery-edge; arc 4-cast 5 high-OBL 2 mystery-edges 3 extra locations) and verify the results land in plausible ranges (≈16, ≈26, ≈54 respectively).
