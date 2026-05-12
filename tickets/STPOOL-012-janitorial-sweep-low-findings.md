# STPOOL-012: Janitorial sweep — vestigial markers and unqualified cross-skill references

**Status**: PENDING
**Priority**: LOW
**Effort**: Small
**Engine Changes**: None — prose/comment edits only.
**Deps**: None

## Problem

Two LOW-severity nits surfaced by storylet-pool-authoring streamlining audit 2026-05-12, bundled into one sweep:

### F-11 — Vestigial "(NEW)" markers

Gate 14 (Rule 11 spectator-caste leverage) is production but still prefixed "NEW" in two places:

- `references/phase-4-5-canon-safety-checks.md:30` — gate-14 row begins with "NEW gate 14 — when…"
- `references/governance-and-foundations.md:41` — FOUNDATIONS Alignment table row for Rule 11 begins with "NEW gate 14 — when…"

The "NEW" prefix conveyed semantic content during the ticket that introduced gate 14 but has since become a vestigial marker — readers of the current contract see it as if the gate is still in draft.

### F-12 — Unqualified cross-skill reference to `prose-craft-contract.md`

Two sites in storylet-pool-authoring templates reference `prose-craft-contract.md` without a path prefix:

- `templates/storylet-record.yaml:230` — `# default: 2200; engine-only runaway-defense ceiling (NOT a soft target; see prose-craft-contract.md Rule 11)`
- `templates/predicate-dsl.md:243` — `# Default: 2200 per SPEC-19 §A; engine-only runaway-defense ceiling (NOT a soft target; see prose-craft-contract.md Rule 11).`

The actual file lives at `branching-story-page-cycle/references/prose-craft-contract.md` (a sibling skill's reference). A reader looking for `prose-craft-contract.md` under this skill's references/ will not find it.

## Assumption Reassessment (2026-05-12)

1. Verified `phase-4-5-canon-safety-checks.md:30` and `governance-and-foundations.md:41` both carry the "NEW gate 14" prefix; no other "(NEW)"-prefixed claims in the target.
2. Verified `prose-craft-contract.md` exists at `.claude/skills/branching-story-page-cycle/references/prose-craft-contract.md` and is the canonical document the references intend to point at.
3. Both references are informational (LOW severity); neither is gate-enforced.

## Architecture Check

1. Trivial prose cleanup; no structural changes.

## Verification Layers

1. **No "(NEW)" markers on gate 14 in the target** — `grep -n "NEW gate 14" .claude/skills/storylet-pool-authoring/` returns zero matches.
2. **Cross-skill references qualified** — `grep -n "prose-craft-contract.md" .claude/skills/storylet-pool-authoring/templates/` returns matches that include the sibling-skill path prefix.

## What to Change

### 1. (F-11) Drop "NEW" prefix from gate 14 references

In `.claude/skills/storylet-pool-authoring/references/phase-4-5-canon-safety-checks.md:30`:

`| 14. | Rule 11 spectator-caste leverage | Trigger only when [...]` (current text already reads this way at the row header; the "NEW" appears in the cell body — verify and remove).

Specifically, scan the gate-14 row for any occurrence of "NEW gate 14" or "NEW " (with trailing space) and drop the marker; the surrounding prose ("This is a deliberate non-default story-scope extension of FOUNDATIONS Rule 11; the existing `rule11_action_space` engine validator applies to CF records, not SLTs.") is already production-quality.

In `.claude/skills/storylet-pool-authoring/references/governance-and-foundations.md:41` (Rule 11 row in FOUNDATIONS Alignment table):

Drop the "NEW gate 14" prefix; rewrite as: `NEW gate 14 — when [...]` → `gate 14 (Rule 11 spectator-caste leverage at story scope) — when [...]`.

### 2. (F-12) Add sibling-skill path prefix to `prose-craft-contract.md` references

In `templates/storylet-record.yaml:230`:

`(NOT a soft target; see prose-craft-contract.md Rule 11)` → `(NOT a soft target; see branching-story-page-cycle/references/prose-craft-contract.md Rule 11)`.

In `templates/predicate-dsl.md:243`:

`(NOT a soft target; see prose-craft-contract.md Rule 11).` → `(NOT a soft target; see branching-story-page-cycle/references/prose-craft-contract.md Rule 11).`

## Files to Touch

- `.claude/skills/storylet-pool-authoring/references/phase-4-5-canon-safety-checks.md` (modify)
- `.claude/skills/storylet-pool-authoring/references/governance-and-foundations.md` (modify)
- `.claude/skills/storylet-pool-authoring/templates/storylet-record.yaml` (modify)
- `.claude/skills/storylet-pool-authoring/templates/predicate-dsl.md` (modify)

## Out of Scope

- Sweeping other skills for the same patterns — sibling skills may have their own vestigial markers but those are outside this audit's target.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -rn "NEW gate 14" .claude/skills/storylet-pool-authoring/` returns zero matches.
2. `grep -rn "prose-craft-contract.md" .claude/skills/storylet-pool-authoring/` returns matches that all include the `branching-story-page-cycle/references/` path prefix.

### Invariants

1. No vestigial "(NEW)" markers remain on production gates / claims in the target skill.
2. All cross-skill references in target-skill templates qualify the sibling-skill path explicitly.

## Test Plan

### New/Modified Tests

1. None — prose/comment edits only.

### Commands

1. The two greps from Acceptance Criteria.
