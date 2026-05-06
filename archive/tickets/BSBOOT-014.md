# BSBOOT-014: Phase 7.5 — Visible Affordance Extraction

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: None — new reference file under `branching-story-bootstrap/references/` + minor SKILL.md update + Phase 8 reference update.
**Deps**: none

## Problem

At intake, Phase 8 anchored choice generation on:

- `PG-0001.state_snapshot` (the structured world state).
- The selected root storylet's `choice_templates` (per `.claude/skills/branching-story-bootstrap/references/phase-8-choice-generation.md`).

It did not explicitly parse the **rendered prose at PG-0001** for affordances. But the LLM prose may emphasize objects, gestures, lines of dialogue, or emotional ruptures that are not fully represented in the storylet template — a knife laid on a table the storylet didn't list, a confession the storylet didn't anticipate, a glance at a closed door.

The resulting risk was that choices generated purely from state + storylet templates could miss what the prose had actually made psychologically salient. This ticket adds a Phase 7.5 memory-only Visible Affordance Map so bootstrap choice generation now receives prose-emphasized affordances before Phase 8.

## Assumption Reassessment (2026-05-06)

1. `.claude/skills/branching-story-bootstrap/references/phase-8-choice-generation.md` — verified at intake that Phase 8 inputs were `state_snapshot` + storylet `choice_templates`; rendered prose was not enumerated as an input.
2. `.claude/skills/branching-story-bootstrap/references/phase-7-root-page-render.md` — Phase 7 writes prose to a working buffer before Phase 11 disk write. The prose is available in memory between Phase 7 and Phase 8; adding a Phase 7.5 parsing step does not require disk I/O.
3. Cross-skill / cross-artifact boundary: Phase 8 delegates to `branching-story-page-cycle` Phase 8 (Amendment B Pipeline) per `.claude/skills/branching-story-bootstrap/references/phase-8-choice-generation.md`. The new Phase 7.5 step inserts before the delegation, augmenting the inputs the delegated skill receives.
4. FOUNDATIONS / hard-gate principle: this strengthens the prose-state coupling that Rule 1 (No Floating Facts) already implies — every affordance the prose makes salient should be either grounded in state or explicitly mapped/rejected. HARD-GATE per-gate-PASS-with-rationale discipline is preserved (this ticket does not add a new gate; it informs Phase 8's existing gates 9 and 11 with richer inputs).
5. Schema-extension classification: this is a new working-buffer artifact (the Visible Affordance Map), not a persisted record. Nothing is written to disk by Phase 7.5; the artifact is consumed by Phase 8 and discarded. No schema change.
6. Worked example: a Phase 7 prose render places "the magistrate's letter on the desk, unopened" in the room, but the selected storylet's `choice_templates` only enumerated three verbal-confrontation options. Phase 7.5 surfaces "magistrate's letter (STOBJ-NNNN if grounded; ungrounded if newly-introduced)" as an affordance; Phase 8 then has the affordance available to generate "Open the letter" as a 4th-6th choice — or, if the letter is ungrounded (no STOBJ exists for it), Phase 7.5 routes it back to Phase 7 as a re-prompt trigger ("the prose introduced an ungrounded object; either ground it in state or re-render without it").
7. Final classification: `skill rewrite or skill-local behavior` with a cross-artifact Phase 8 handoff. The live page-cycle Phase 8 already has an affordance-space collection step; this ticket only adds bootstrap-local prose-affordance extraction before delegation, without editing `branching-story-page-cycle`.

## Architecture Check

1. **Why cleaner**: prose and state become a closed-loop input pair. Anything the prose emphasizes either resolves to a state id (and becomes a Phase 8 anchor) or is ungrounded (and re-prompts Phase 7) — no third "salient but ignored" path.
2. **Alternative considered**: extend Phase 7's deterministic post-LLM cross-check to surface affordances. Rejected: the cross-check is a re-prompt trigger, not a Phase 8 input pipeline. Keeping affordance extraction as its own phase makes the input dependency explicit.
3. No backwards-compatibility shim. Phase 7.5 is a new step; existing bootstrap runs do not skip it.

## Verification Layers

1. New reference file exists at `references/phase-7-5-visible-affordance-extraction.md` → codebase grep-proof.
2. `SKILL.md` Process Flow + procedure list reference Phase 7.5 → codebase grep-proof.
3. Phase 8 reference acknowledges the additional input from Phase 7.5 → codebase grep-proof.
4. The Visible Affordance Map is described as a memory-only artifact, not a persisted record → manual review.
5. Ungrounded affordances route back to Phase 7 as re-prompt triggers → manual review of the new reference.

## Landed Changes

### 1. NEW: `.claude/skills/branching-story-bootstrap/references/phase-7-5-visible-affordance-extraction.md`

Created with the landed contract:

- Phase 7.5 runs after Phase 7's prose render and post-LLM cross-check and before Phase 8's delegated choice generation.
- The Visible Affordance Map is a memory-only working-buffer artifact consumed by Phase 8 and discarded.
- Named actors, objects, locations, exits, visible tensions, and implied questions are mapped to existing state surfaces when grounded.
- Ungrounded actors, objects, locations, and exits route back to Phase 7 re-prompts.
- Purely atmospheric prose can emit an empty map; Phase 8 then proceeds with its standard state and storylet inputs.

### 2. `.claude/skills/branching-story-bootstrap/SKILL.md`

- Process Flow diagram: inserted a new Phase 7.5 step between Phase 7 and Phase 8:

  ```
  Phase 7.5: Visible Affordance         (parse rendered PG-0001 prose for
            Extraction                   visible objects/actors/locations/
                                         tensions; map each to state id;
                                         ungrounded → re-prompt Phase 7;
                                         grounded → feed to Phase 8 as
                                         additional anchors)
  ```

- Procedure list: inserted a new step:

  > 7. **Phase 7.5: Visible Affordance Extraction.** Parse the Phase 7 prose buffer for visible affordances; map each to a state id; route ungrounded affordances back to Phase 7 as re-prompt triggers; feed the Visible Affordance Map to Phase 8. Load `references/phase-7-5-visible-affordance-extraction.md`.

  Renumbered subsequent steps so Phase 8 is step 8, Phase 9 is step 9, Phase 10 is step 10, and Phase 11 is step 11.

### 3. `.claude/skills/branching-story-bootstrap/references/phase-8-choice-generation.md`

- Updated the input paragraph so bootstrap supplies `PG-0001.state_snapshot`, the selected root storylet's `choice_templates`, and the Phase 7.5 Visible Affordance Map as anchors.
- Added the diversification rule that grounded visible affordances should be preferred over fully storylet-template-driven choices when the emitted CHCs otherwise ignore them, while preserving the existing diversification and consequence-capacity gates.

## Files to Touch

- `.claude/skills/branching-story-bootstrap/references/phase-7-5-visible-affordance-extraction.md` (new)
- `.claude/skills/branching-story-bootstrap/SKILL.md` (modify)
- `.claude/skills/branching-story-bootstrap/references/phase-8-choice-generation.md` (modify)

## Out of Scope

- Programmatic prose-parsing implementation. The "parse for visible objects/actors" step is operator-discipline; an LLM-driven extractor is the natural implementation but is not specified in this ticket.
- Persisting the Visible Affordance Map. The artifact is memory-only; if a future audit-trail requirement appears, it can be added to STORY_KERNEL.md as a non-load-bearing field.
- Editing `branching-story-page-cycle` Phase 8 (Amendment B Pipeline). The page-cycle's runtime Phase 8 may benefit from the same step on later pages, but that's a separate ticket.

## Acceptance Criteria

### Tests Passed

1. `ls .claude/skills/branching-story-bootstrap/references/phase-7-5-visible-affordance-extraction.md` exists.
2. `grep -nE "Phase 7\.5|Visible Affordance" .claude/skills/branching-story-bootstrap/SKILL.md` returns matches in both the Process Flow diagram and the procedure list.
3. `grep -nE "Visible Affordance Map" .claude/skills/branching-story-bootstrap/references/phase-8-choice-generation.md` returns matches.
4. Manual review confirmed Phase 7.5 routing rules forbid ungrounded affordances by routing them back to Phase 7 re-prompts.

### Invariants

1. Phase 7.5 runs between Phase 7 and Phase 8 in every bootstrap; it does not write to disk.
2. Ungrounded affordances trigger Phase 7 re-prompt, not Phase 11 write.
3. The Visible Affordance Map is a memory-only artifact.
4. Phase 8's existing diversification + consequence-capacity gates remain authoritative; Phase 7.5 widens inputs without weakening gates.

## Test Plan

### New/Modified Tests

1. None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.

### Commands

1. `ls .claude/skills/branching-story-bootstrap/references/phase-7-5-visible-affordance-extraction.md`
2. `grep -nE "Phase 7\.5|Visible Affordance" .claude/skills/branching-story-bootstrap/SKILL.md`
3. `grep -nE "Visible Affordance Map" .claude/skills/branching-story-bootstrap/references/phase-8-choice-generation.md`
4. `grep -nE "ungrounded|re-prompt Phase 7|does not write to disk|working-buffer artifact|memory-only" .claude/skills/branching-story-bootstrap/references/phase-7-5-visible-affordance-extraction.md`
5. `git diff --check -- .claude/skills/branching-story-bootstrap/SKILL.md .claude/skills/branching-story-bootstrap/references/phase-8-choice-generation.md archive/tickets/BSBOOT-014.md`
6. `grep -n '[[:blank:]]$' .claude/skills/branching-story-bootstrap/references/phase-7-5-visible-affordance-extraction.md`
7. `rg -n "genesis state produced by Phases 2, 3, 5, 6, and 7\\." .claude/skills/branching-story-bootstrap/references/phase-8-choice-generation.md`

## Outcome

Implemented Phase 7.5 as a bootstrap-local, memory-only Visible Affordance Map. The new reference maps prose-emphasized actors, objects, locations, exits, tensions, and questions to state ids or explicit rejection reasons. Ungrounded actors, objects, locations, and exits route back to Phase 7 re-prompts and share the existing Phase 7 re-prompt budget.

Updated `branching-story-bootstrap/SKILL.md` so Phase 7.5 appears between Phase 7 and Phase 8 in both the process flow and procedure list. Updated bootstrap Phase 8 guidance so the delegated choice-generation phase receives three anchor sources: `PG-0001.state_snapshot`, the selected root storylet's `choice_templates`, and the Phase 7.5 Visible Affordance Map.

## Verification Result

1. `ls .claude/skills/branching-story-bootstrap/references/phase-7-5-visible-affordance-extraction.md` — passed; the new reference file exists.
2. `grep -nE "Phase 7\.5|Visible Affordance" .claude/skills/branching-story-bootstrap/SKILL.md` — passed; matches appear in the process flow and procedure list.
3. `grep -nE "Visible Affordance Map" .claude/skills/branching-story-bootstrap/references/phase-8-choice-generation.md` — passed; Phase 8 names the new additional anchor source and affordance-diversification rule.
4. `grep -nE "ungrounded|re-prompt Phase 7|does not write to disk|working-buffer artifact|memory-only" .claude/skills/branching-story-bootstrap/references/phase-7-5-visible-affordance-extraction.md` — passed; the new reference states the map is memory-only, not written to disk, and ungrounded affordances re-prompt Phase 7.
5. `git diff --check -- .claude/skills/branching-story-bootstrap/SKILL.md .claude/skills/branching-story-bootstrap/references/phase-8-choice-generation.md archive/tickets/BSBOOT-014.md` — passed; tracked edited files have no whitespace errors.
6. `grep -n '[[:blank:]]$' .claude/skills/branching-story-bootstrap/references/phase-7-5-visible-affordance-extraction.md` — passed with no matches; this explicitly covered the new untracked file because `git add -N` could not create `.git/index.lock` in the sandbox.
7. `rg -n "genesis state produced by Phases 2, 3, 5, 6, and 7\\." .claude/skills/branching-story-bootstrap/references/phase-8-choice-generation.md` — passed with no matches; the post-review stale summary blocker is resolved in the implementation reference.

## Deviations

Post-ticket review found one same-seam implementation blocker before archival: `.claude/skills/branching-story-bootstrap/references/phase-8-choice-generation.md` still had an opening summary that said Phase 8 ran against the genesis state produced by Phases 2, 3, 5, 6, and 7. This ticket resolved that blocker by updating the summary to include Phase 7.5, matching the body paragraph and landed contract. No package code, schema, world content, or `branching-story-page-cycle` files were edited.

## Post-Ticket Review Result (2026-05-06)

Archival blocker resolved. The stale opening summary in `.claude/skills/branching-story-bootstrap/references/phase-8-choice-generation.md` now includes Phase 7.5, so the reference is internally consistent about the added Visible Affordance Map input stage.
