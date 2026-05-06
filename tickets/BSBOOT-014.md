# BSBOOT-014: Phase 7.5 — Visible Affordance Extraction

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: None — new reference file under `branching-story-bootstrap/references/` + minor SKILL.md update + Phase 8 reference update.
**Deps**: none

## Problem

Phase 8 currently anchors choice generation on:

- `PG-0001.state_snapshot` (the structured world state).
- The selected root storylet's `choice_templates` (per `references/phase-8-choice-generation.md:11-15`).

It does NOT explicitly parse the **rendered prose at PG-0001** for affordances. But the LLM prose may emphasize objects, gestures, lines of dialogue, or emotional ruptures that are not fully represented in the storylet template — a knife laid on a table the storylet didn't list, a confession the storylet didn't anticipate, a glance at a closed door.

Result: choices generated purely from state + storylet templates can miss what the prose has actually made psychologically salient. The reader sees a moment offering certain affordances; the choice list ignores them. Choices feel disconnected from the page they're answering.

## Assumption Reassessment (2026-05-06)

1. `references/phase-8-choice-generation.md:9-16` — verified Phase 8 inputs are `state_snapshot` + storylet `choice_templates`; rendered prose is not enumerated as an input.
2. `references/phase-7-root-page-render.md:67` — Phase 7 writes prose to a working buffer before Phase 11 disk write. The prose IS available in memory between Phase 7 and Phase 8 — adding a Phase 7.5 parsing step does not require disk I/O.
3. Cross-skill / cross-artifact boundary: Phase 8 delegates to `branching-story-page-cycle` Phase 8 (Amendment B Pipeline) per `references/phase-8-choice-generation.md:7`. The new Phase 7.5 step inserts BEFORE the delegation, augmenting the inputs the delegated skill receives.
4. FOUNDATIONS / hard-gate principle: this strengthens the prose-state coupling that Rule 1 (No Floating Facts) already implies — every affordance the prose makes salient should be either grounded in state or explicitly mapped/rejected. HARD-GATE per-gate-PASS-with-rationale discipline is preserved (this ticket does not add a new gate; it informs Phase 8's existing gates 9 and 11 with richer inputs).
5. Schema-extension classification: this is a new working-buffer artifact (the Visible Affordance Map), not a persisted record. Nothing is written to disk by Phase 7.5; the artifact is consumed by Phase 8 and discarded. No schema change.
6. Worked example: a Phase 7 prose render places "the magistrate's letter on the desk, unopened" in the room, but the selected storylet's `choice_templates` only enumerated three verbal-confrontation options. Phase 7.5 surfaces "magistrate's letter (STOBJ-NNNN if grounded; ungrounded if newly-introduced)" as an affordance; Phase 8 then has the affordance available to generate "Open the letter" as a 4th-6th choice — or, if the letter is ungrounded (no STOBJ exists for it), Phase 7.5 routes it back to Phase 7 as a re-prompt trigger ("the prose introduced an ungrounded object; either ground it in state or re-render without it").

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

## What to Change

### 1. NEW: `.claude/skills/branching-story-bootstrap/references/phase-7-5-visible-affordance-extraction.md`

Create with the following content (full file):

```
# Phase 7.5: Visible Affordance Extraction

Reference for `branching-story-bootstrap` Phase 7.5 — the deterministic post-Phase-7 step that parses the rendered PG-0001 prose for visible affordances and maps each to a state id (or rejects as ungrounded), feeding the result to Phase 8 as additional choice-generation anchors.

This phase runs AFTER Phase 7's prose render + post-LLM cross-check and BEFORE Phase 8's delegated choice generation. It does not write to disk; the Visible Affordance Map is a working-buffer artifact consumed by Phase 8 and discarded.

---

## Inputs

- The Phase 7 prose buffer (PG-0001.md as rendered, not yet written to disk).
- `PG-0001.state_snapshot` (cast_present, current_location, accessible_locations, objects_in_scope, intentions_current, threads_active, obligations_open, reader_known_facts).
- The selected root storylet's choice_templates (the upstream choice anchors).

## Process

For each visually salient element the prose emphasizes, attempt to map it to a state id:

| Affordance type | Map to | Reject if ungrounded |
|---|---|---|
| Named character actor / addressee | STENT id from cast_present | Re-prompt Phase 7: ungrounded actor |
| Named object emphasized in prose | STOBJ id from objects_in_scope | Re-prompt Phase 7: ungrounded object |
| Named location reference (door, exit, named place) | STLOC id from accessible_locations OR current_location | Re-prompt Phase 7: ungrounded location |
| Visible tension (unspoken offer, pending threat, withheld information) | Existing OBL / THR / SREL / mystery-edge in state | Allowed (will become a non-state-grounded choice mode for Phase 8 to map to existing tension) |
| Question explicitly asked or implied by the prose | Existing OBL / mystery-edge / belief gap | Allowed |
| Exit / next-move possibility | accessible_locations + cast_present | Re-prompt Phase 7: ungrounded exit |

Output: the Visible Affordance Map — a list of (affordance_text, mapped_state_id_or_rejection_reason) pairs.

## Routing

- All affordances grounded → Phase 8 receives the Visible Affordance Map as an additional input alongside `state_snapshot` and the storylet's `choice_templates`. Phase 8's diversification + consequence-capacity contract MAY now produce a CHC anchored on a prose-emphasized affordance that the storylet template did not enumerate.
- Any affordance ungrounded → re-prompt Phase 7 with the explicit constraint ("the prose introduced an ungrounded <object/actor/location>; either ground it in state by adding the corresponding STOBJ/STENT/STLOC at Phase 5 retroactively, or re-render without it"). Up to 3 Phase-7-cycle re-prompts share the existing Phase 7 budget; if exhausted, escalate to user with the unmapped affordances inlined.
- Atmospheric prose with no specific affordance → no entry in the map; Phase 8 falls back to its standard state + storylet inputs.

## Failure mode

If the prose is purely atmospheric (no object, no exit, no actor address, no question) AND the selected storylet's beat is naturally complete, Phase 7.5 emits an empty Visible Affordance Map. Phase 8 proceeds as today. This is the "tone-only opening" case (rare but legitimate); no re-prompt fires.
```

### 2. `.claude/skills/branching-story-bootstrap/SKILL.md`

- Process Flow diagram (lines 64-165): insert a new Phase 7.5 step between Phase 7 and Phase 8:

  ```
  Phase 7.5: Visible Affordance         (parse rendered PG-0001 prose for
            Extraction                   visible objects/actors/locations/
                                         tensions; map each to state id;
                                         ungrounded → re-prompt Phase 7;
                                         grounded → feed to Phase 8 as
                                         additional anchors)
  ```

- Procedure list (lines 219-228): insert a new step:

  > 7. **Phase 7.5: Visible Affordance Extraction.** Parse the Phase 7 prose buffer for visible affordances; map each to a state id; route ungrounded affordances back to Phase 7 as re-prompt triggers; feed the Visible Affordance Map to Phase 8. Load `references/phase-7-5-visible-affordance-extraction.md`.

  Renumber subsequent steps (Phase 8 becomes step 8 in the procedure list — the existing numbering already places Phase 8 at step 7, so this becomes step 8 after the insert).

### 3. `.claude/skills/branching-story-bootstrap/references/phase-8-choice-generation.md`

- §Inputs paragraph (around line 7): update to read "Bootstrap supplies `PG-0001.state_snapshot` as the current state, the selected root storylet's `choice_templates` as anchors, AND the Phase 7.5 Visible Affordance Map as additional anchors. Diversification + consequence-capacity must consider all three input sources."
- §Required CHC diversification (lines 22-32): add a bullet: "If the Visible Affordance Map contains a grounded affordance that none of the existing 4-6 CHCs engage, prefer a CHC anchored on that affordance over a fully storylet-template-driven choice. Affordance-anchored CHCs still satisfy the diversification + consequence-capacity gates; they are not exempt."

## Files to Touch

- `.claude/skills/branching-story-bootstrap/references/phase-7-5-visible-affordance-extraction.md` (new)
- `.claude/skills/branching-story-bootstrap/SKILL.md` (modify)
- `.claude/skills/branching-story-bootstrap/references/phase-8-choice-generation.md` (modify)

## Out of Scope

- Programmatic prose-parsing implementation. The "parse for visible objects/actors" step is operator-discipline; an LLM-driven extractor is the natural implementation but is not specified in this ticket.
- Persisting the Visible Affordance Map. The artifact is memory-only; if a future audit-trail requirement appears, it can be added to STORY_KERNEL.md as a non-load-bearing field.
- Editing `branching-story-page-cycle` Phase 8 (Amendment B Pipeline). The page-cycle's runtime Phase 8 may benefit from the same step on later pages, but that's a separate ticket.

## Acceptance Criteria

### Tests That Must Pass

1. `ls .claude/skills/branching-story-bootstrap/references/phase-7-5-visible-affordance-extraction.md` exists.
2. `grep -nE "Phase 7\.5|Visible Affordance" .claude/skills/branching-story-bootstrap/SKILL.md` returns matches in both the Process Flow diagram and the procedure list.
3. `grep -nE "Visible Affordance Map" .claude/skills/branching-story-bootstrap/references/phase-8-choice-generation.md` returns matches.
4. Phase 7.5 routing rules forbid ungrounded affordances (re-prompt Phase 7).

### Invariants

1. Phase 7.5 runs between Phase 7 and Phase 8 in every bootstrap; it does not write to disk.
2. Ungrounded affordances trigger Phase 7 re-prompt, not Phase 11 write.
3. The Visible Affordance Map is a memory-only artifact.
4. Phase 8's existing diversification + consequence-capacity gates remain authoritative; Phase 7.5 widens inputs without weakening gates.

## Test Plan

### New/Modified Tests

1. None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.

### Commands

1. `cat .claude/skills/branching-story-bootstrap/references/phase-7-5-visible-affordance-extraction.md` — confirms file content.
2. `grep -nE "Phase 7\.5" .claude/skills/branching-story-bootstrap/SKILL.md` — confirms inclusion in flow + procedure list.
3. (Manual) walk through a hypothetical PG-0001 prose with one ungrounded object and confirm the Phase 7.5 routing fires the Phase 7 re-prompt rather than letting Phase 8 silently ignore the affordance.
