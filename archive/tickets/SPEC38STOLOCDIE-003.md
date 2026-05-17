# SPEC38STOLOCDIE-003: Amend `branching-story-bootstrap` with DA-triage step

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — modifies `.claude/skills/branching-story-bootstrap/SKILL.md`; truths `specs/SPEC-38-story-local-diegetic-artifact-authoring.md`
**Deps**: archive/tickets/SPEC38STOLOCDIE-001.md

## Problem

At intake, `branching-story-bootstrap` mentioned story-local DAs only as an output-table row (`SKILL.md:131` — `DA-<integer>` produced `IF an in-story diegetic artifact is in play at opening`). No triage step existed, no decision logic for DA-vs-STOBJ-vs-BEL-vs-SF was prescribed, and no opening-access guidance was present. Authors creating opening situations had no prompt to ask "is this a load-bearing artifact?" and no rubric to apply when the answer was yes. This ticket added an explicit DA-triage sub-step inside the bootstrap phase that authors initial story-bundle records, cross-referencing the shared rubric created by ticket 001.

## Assumption Reassessment (2026-05-17)

1. At intake, `.claude/skills/branching-story-bootstrap/SKILL.md` line 131 mentioned DA only in the output table with `IF an in-story diegetic artifact is in play at opening`, and line 372 (patch-engine ops list) mentioned `append_story_diegetic_artifact_record` only as `(if story-local DA records are applicable)`. No DA-triage phase existed in the then-current process flow.
2. Verified SPEC-38 §D3 prescribes a new DA-triage sub-step in the initial-records-authoring phase, referencing `.claude/skills/_shared-templates/da-authoring-reference.md` §Triage + §Decision matrix + §Patch obligations.
3. Cross-skill boundary: bootstrap's new sub-step references the new shared reference at `.claude/skills/_shared-templates/da-authoring-reference.md` (created by ticket 001). The cross-reference path must match 001's output exactly; the cited section names (`§Triage`, `§Decision matrix`, `§Patch obligations`) must match the section headers ticket 001 ships.
4. FOUNDATIONS principles motivating this ticket: §Story Bundles §6b Information / Observer Firewall (opening-access discipline — initial BEL records reflect who has read what); Rule 1 No Floating Facts (DA must have author / audience / circulation / truth-relation / downstream-use before creation, surfaced at the triage step).
5. HARD-GATE read was not required for this implementation: the landed edit does not modify the existing `<HARD-GATE>` block, approval checkpoint semantics, validator behavior, or canon-write ordering. It adds operational triage guidance before the already-gated Phase 10 write path.

## Architecture Check

1. New sub-step references shared reference (cleaner than embedding triage logic in bootstrap SKILL.md): preserves single-source-of-truth for triage rubric; future updates to the rubric land in one place (ticket 001's output) rather than diverging across bootstrap and turn-cycle copies. Symmetric with ticket 004 (turn-cycle) which references the same rubric.
2. No backwards-compatibility shims; adding a new sub-step is additive and does not break existing phase structure or existing DA output-table row.

## Verification Layers

1. DA-triage sub-step exists in bootstrap SKILL.md → codebase grep-proof: `grep -nE 'DA triage at opening|da-authoring-reference' .claude/skills/branching-story-bootstrap/SKILL.md` returns matches.
2. Output table at line 131 cross-references the new sub-step → manual review or grep for cross-reference text in the DA-* row.
3. Cross-reference target path resolves → codebase grep-proof: `test -f .claude/skills/_shared-templates/da-authoring-reference.md` returns success (per ticket 001).
4. Single-layer ticket: documentation-only; verification is grep-based.

## Landed Changes

### 1. Add DA-triage sub-step in the initial-records-authoring phase

Added the sub-step in Phase 3, after initial BEL / STENT / STSTAT guidance and before Phase 4 debts. This placement keeps the triage before `SE-1.state_delta` / `PG-1.state_snapshot` materialization in Phase 6 and before first-choice grounding in Phase 8. Landed content:

```
**DA triage at opening.** Scan the user premise, opening scene, starting
inventory, faction briefings, rumors, public notices, private letters,
requested clues, maps, recordings, inscriptions, object-with-text, and
existing world-level DA references. For each candidate, apply the triage
rubric and decision matrix at
`.claude/skills/_shared-templates/da-authoring-reference.md` §Triage and
§Decision matrix. Create a DA only when content / authorship / circulation
/ truth relation has persistent state value. For every bootstrap DA,
satisfy the patch obligations at
`.claude/skills/_shared-templates/da-authoring-reference.md` §Patch
obligations (allocate via `story_da_ids`; create via
`append_story_diegetic_artifact_record`; include in `SE-1.state_delta.create[]`
and `PG-1.state_snapshot.active_records.DA[]`; create BEL for initial readers
with appropriate `basis.access_route`; create STOBJ if physical custody
matters; satisfy `expected_witness_coverage` for `public`/`factional`
circulation via same-event indirect-route BEL or `non_propagation` tag).
```

### 2. Cross-reference the sub-step from the output table

Updated the output table's `DA-<integer>` row with `see Phase 3 DA triage` so future operators see the entry point from the output enumeration.

### 3. Truth SPEC-38 handoff

Added a dated SPEC-38 §D3 implementation note recording the landed bootstrap amendment and table-row pointer.

## Files to Touch

- `.claude/skills/branching-story-bootstrap/SKILL.md` (modify)
- `specs/SPEC-38-story-local-diegetic-artifact-authoring.md` (modify)

## Out of Scope

- Bootstrap phase reorganization (only a sub-step is added; existing phases are unchanged)
- DA schema changes (deferred per SPEC-38 §Out of Scope)
- Bootstrap of world-level DAs (out of bootstrap's scope; world-level DA generation lives under `.claude/skills/diegetic-artifact-generation/`)
- Validator behavior changes (`expected_witness_coverage` is referenced but unchanged)

## Acceptance Criteria

### Tests That Must Pass

1. DA-triage sub-step present in bootstrap SKILL.md.
2. Cross-reference to `_shared-templates/da-authoring-reference.md` resolves (target file exists per ticket 001).
3. Output table at line 131 cross-references the new sub-step (parenthetical or footnote).

### Invariants

1. Bootstrap's existing phase structure is preserved; the DA-triage sub-step is additive.
2. Cross-reference paths are concrete (file + section name).

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is grep-based against post-implementation file content and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `grep -nE 'DA triage|da-authoring-reference' .claude/skills/branching-story-bootstrap/SKILL.md`
2. `test -f .claude/skills/_shared-templates/da-authoring-reference.md` (cross-reference target exists per ticket 001)

## Outcome

Completed: 2026-05-17

What changed:
- Added Phase 3 `DA triage at opening` guidance to `.claude/skills/branching-story-bootstrap/SKILL.md`.
- Updated the bootstrap output table's `DA-<integer>` row to point to the new Phase 3 triage sub-step.
- Added a dated SPEC-38 §D3 implementation note.

Deviations from original plan:
- The live bootstrap skill's initial-records-authoring boundary is Phase 3 for initial belief/status setup followed by Phase 4 for debts, not the older draft wording that described Phase 3 as debt creation. The triage landed in live Phase 3, before Phase 6 commits the root event/page snapshot and before Phase 10 writes.

## Verification Result

Commands run:

```bash
grep -nE 'DA triage|da-authoring-reference' .claude/skills/branching-story-bootstrap/SKILL.md
```

Result: matched the updated `DA-<integer>` output-table row and the new Phase 3 `DA triage at opening` paragraph with concrete shared-reference links.

```bash
test -f .claude/skills/_shared-templates/da-authoring-reference.md
```

Result: passed; the shared-reference target exists.
