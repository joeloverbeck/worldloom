# STPOOL-005: Remove dangling cross-reference to non-existent `references/beat-functions.md`

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: None — comment edit only.
**Deps**: None

## Problem

At intake, `.claude/skills/storylet-pool-authoring/templates/storylet-record.yaml:189` read:

```yaml
function: <beat_function string>     # open-vocab kebab-case; see references/beat-functions.md
```

There was no `references/beat-functions.md` under `.claude/skills/storylet-pool-authoring/references/`. The references directory contained six files (`governance-and-foundations.md`, `phase-1-coverage-diagnosis.md`, `phase-2-generation-seeds.md`, `phase-3-structured-drafting.md`, `phase-4-5-canon-safety-checks.md`, `pre-flight-and-prerequisites.md`) — none with that name.

Authors following the old comment hit a missing-file dead end. The `function:` field is genuinely open-vocab (it's an authoring vocabulary, not a closed enum), so the practical vocabulary source is `templates/arc-archetypes.md`'s per-archetype `beat_plan` patterns, which already demonstrate the kinds of function values used in production (e.g., `pressure-setup`, `offer-extended`, `question-framed`, `boundary-named`, `line-crossed`, `accusation-or-demand`, etc.).

This was uncovered by storylet-pool-authoring streamlining audit 2026-05-12 finding F-04.

## Assumption Reassessment (2026-05-12)

1. Verified `.claude/skills/storylet-pool-authoring/references/` enumerates six files; `beat-functions.md` is not among them.
2. At intake, verified the comment at `templates/storylet-record.yaml:189` was the only `.claude/skills/` reference to a `beat-functions.md` file (`rg -n 'beat-functions\.md' .claude/skills`).
3. Verified `templates/arc-archetypes.md` already demonstrates the de facto beat-function vocabulary across its 20 archetype entries (lines 30, 56, 80, 104, etc.).
4. Rule 1 (No Floating Facts) applies analogously at the skill-content layer: schema-template cross-references must resolve to existing surfaces.

## Architecture Check

1. The cheapest correct fix is to redirect the comment to `templates/arc-archetypes.md` (the de facto vocabulary source) rather than create a new reference doc — the field is genuinely open-vocab and authoring guidance is already embedded in the archetype library.
2. Alternative (deferred): if a future user wants a dedicated beat-function vocabulary doc, it becomes its own ticket; this ticket addresses only the dangling reference.

## Verification Layers

1. **Cross-reference resolution** — every `see references/<X>.md` or `see templates/<X>.md` comment in `templates/storylet-record.yaml` resolves to a file that exists → `rg -n 'see references/|see templates/' .claude/skills/storylet-pool-authoring/templates/storylet-record.yaml` followed by `test -f` on each cited path.
2. **No silent removals** — the comment was redirected to `templates/arc-archetypes.md`; the redirection target is authoritatively beat-function-bearing.

## Landed Changes

### 1. Replace the dangling reference

Updated `templates/storylet-record.yaml`:

`function: <beat_function string>     # open-vocab kebab-case; see references/beat-functions.md`

→

`function: <beat_function string>     # open-vocab kebab-case; see templates/arc-archetypes.md for per-archetype beat-function examples`

## Files to Touch

- `.claude/skills/storylet-pool-authoring/templates/storylet-record.yaml` (modify)

## Out of Scope

- Creating an actual `references/beat-functions.md` reference doc. If the user wants this, it's a separate ticket.
- Editing `templates/arc-archetypes.md` to add an explicit "beat-function vocabulary" section header (the de facto coverage already exists in the per-archetype `beat_plan` rows).

## Acceptance Criteria

### Tests That Must Pass

1. `! rg -n 'beat-functions\.md' .claude/skills/storylet-pool-authoring/templates/storylet-record.yaml` passes.
2. `rg -n 'arc-archetypes\.md' .claude/skills/storylet-pool-authoring/templates/storylet-record.yaml` returns the new redirection line.

### Invariants

1. Every cross-reference comment in `templates/storylet-record.yaml` resolves to an existing file.

## Test Plan

### New/Modified Tests

1. None — comment edit only.

### Commands

1. `rg -n 'see references/|see templates/' .claude/skills/storylet-pool-authoring/templates/storylet-record.yaml` then `test -f .claude/skills/storylet-pool-authoring/<cited-path>` for each → all cited paths resolve.

## Outcome

Completion date: 2026-05-12.

Replaced the dangling `references/beat-functions.md` comment in `.claude/skills/storylet-pool-authoring/templates/storylet-record.yaml` with a live `templates/arc-archetypes.md` reference to the existing per-archetype beat-function examples.

Deviations from original plan: none.

## Verification Result

1. `! rg -n 'beat-functions\.md' .claude/skills/storylet-pool-authoring/templates/storylet-record.yaml` — passed; the template no longer points at the missing file.
2. `rg -n 'arc-archetypes\.md' .claude/skills/storylet-pool-authoring/templates/storylet-record.yaml` — passed; line 189 contains the replacement reference.
3. `rg -n 'see references/|see templates/' .claude/skills/storylet-pool-authoring/templates/storylet-record.yaml` plus `test -f .claude/skills/storylet-pool-authoring/templates/predicate-dsl.md` and `test -f .claude/skills/storylet-pool-authoring/templates/arc-archetypes.md` — passed; all cross-reference comments in the template resolve to existing files.
