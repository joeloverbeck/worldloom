# STPOOL-012: Janitorial sweep — vestigial markers and unqualified cross-skill references

**Status**: COMPLETED
**Priority**: LOW
**Effort**: Small
**Engine Changes**: None — prose/comment edits only.
**Deps**: None

## Problem

Two LOW-severity nits surfaced by storylet-pool-authoring streamlining audit 2026-05-12, bundled into one sweep. At intake, reassessment found one reported F-11 location was already clean, leaving one live vestigial marker plus two unqualified sibling-skill references.

### F-11 — Vestigial "(NEW)" markers

At intake, gate 14 (Rule 11 spectator-caste leverage) was production but still prefixed "NEW" in one live place:

- `references/governance-and-foundations.md` — FOUNDATIONS Alignment table row for Rule 11 begins with "NEW gate 14 — when..."

The "NEW" prefix conveyed semantic content during the ticket that introduced gate 14 but has since become a vestigial marker — readers of the current contract see it as if the gate is still in draft.

### F-12 — Unqualified cross-skill reference to `prose-craft-contract.md`

At intake, two sites in storylet-pool-authoring templates referenced `prose-craft-contract.md` without a path prefix:

- `templates/storylet-record.yaml` — `# default: 2200; engine-only runaway-defense ceiling (NOT a soft target; see prose-craft-contract.md Rule 11)`
- `templates/predicate-dsl.md` — `# Default: 2200 per SPEC-19 §A; engine-only runaway-defense ceiling (NOT a soft target; see prose-craft-contract.md Rule 11).`

The actual file lives at `branching-story-page-cycle/references/prose-craft-contract.md` (a sibling skill's reference). A reader looking for `prose-craft-contract.md` under this skill's references/ will not find it.

## Assumption Reassessment (2026-05-12)

1. Verified `.claude/skills/storylet-pool-authoring/references/phase-4-5-canon-safety-checks.md` is already clean at the gate-14 row; `.claude/skills/storylet-pool-authoring/references/governance-and-foundations.md` still carries the live "NEW gate 14" prefix. No other `NEW gate 14` hits exist in the target skill.
2. Verified `prose-craft-contract.md` exists at `.claude/skills/branching-story-page-cycle/references/prose-craft-contract.md` and is the canonical document the references intend to point at.
3. The source edits are informational wording/comment fixes only; they do not change HARD-GATE ordering, Mystery Reserve firewall behavior, approval-token behavior, or patch-plan validation.
4. `docs/HARD-GATE-DISCIPLINE.md` confirms storylet-pool-authoring is a HARD-GATE story-bundle skill, so the gate wording was checked as non-semantic before implementation.

## Architecture Check

1. Trivial prose cleanup; no structural changes.

## Verification Layers

1. **No "(NEW)" markers on gate 14 in the target** — `grep -n "NEW gate 14" .claude/skills/storylet-pool-authoring/` returns zero matches.
2. **Cross-skill references qualified** — `grep -n "prose-craft-contract.md" .claude/skills/storylet-pool-authoring/templates/` returns matches that include the sibling-skill path prefix.

## Landed Changes

### 1. (F-11) Drop "NEW" prefix from gate 14 references

In `.claude/skills/storylet-pool-authoring/references/governance-and-foundations.md` (Rule 11 row in FOUNDATIONS Alignment table), the vestigial `NEW gate 14` prefix was replaced with `gate 14 (Rule 11 spectator-caste leverage at story scope)`.

### 2. (F-12) Add sibling-skill path prefix to `prose-craft-contract.md` references

In `templates/storylet-record.yaml` and `templates/predicate-dsl.md`, the prose-craft references now point at `branching-story-page-cycle/references/prose-craft-contract.md Rule 11`.

## Files to Touch

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

1. `if grep -R 'NEW gate 14' .claude/skills/storylet-pool-authoring/; then exit 1; fi`
2. `grep -rn 'prose-craft-contract.md' .claude/skills/storylet-pool-authoring/`
3. `if grep -rn 'prose-craft-contract.md' .claude/skills/storylet-pool-authoring/ | grep -v 'branching-story-page-cycle/references/prose-craft-contract.md'; then exit 1; fi`

## Outcome

Completed the janitorial sweep without changing storylet-pool-authoring behavior or HARD-GATE semantics. The live vestigial `NEW gate 14` marker was removed from the governance reference, and both storylet-pool-authoring template references to the prose craft contract now qualify the sibling skill path.

## Verification Result

1. `if grep -R 'NEW gate 14' .claude/skills/storylet-pool-authoring/; then exit 1; fi` — passed; no stale `NEW gate 14` marker remains under the target skill.
2. `grep -rn 'prose-craft-contract.md' .claude/skills/storylet-pool-authoring/` — passed; two references remain, both in the intended template files.
3. `if grep -rn 'prose-craft-contract.md' .claude/skills/storylet-pool-authoring/ | grep -v 'branching-story-page-cycle/references/prose-craft-contract.md'; then exit 1; fi` — passed; there are no remaining unqualified target-skill references.

## Deviations

- Reassessment found `.claude/skills/storylet-pool-authoring/references/phase-4-5-canon-safety-checks.md` was already clean, so it was removed from the owned source-edit set.
