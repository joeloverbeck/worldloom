# SPEC25STOCOHHAR-008: CHC.grounded_in field + gate-7 validator

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — modifies `tools/validators/src/schemas/story-choice.schema.json` and adds / extends a structural validator (gate-7 grounding home); amends `.claude/skills/_shared-templates/story-state-contract.md` (§4.5.12); modifies `branching-story-bootstrap`, `branching-story-turn-cycle`, `branching-story-health-audit`.
**Deps**: None

## Problem

Gate 7 (plan grounding) requires that "every CHC emitted by this page is grounded," but `CHC` has no grounding field — gate 7 can only weakly infer grounding by matching `target_or_action_families` against affordance action-families, missing grounding in non-affordance state (an `OBL`, a `BEL`, a `SREL`). This ticket adds an explicit `CHC.grounded_in` field and a structural check that resolves it against the emitting page's state.

## Assumption Reassessment (2026-05-14)

1. Contract §4.5.12 `CHC` schema carries `id`, `story_id`, `created_at_page`, `supersedes`, `surface_label`, `player_visible_intent`, `target_or_action_families`, `likely_state_pressure`, `associated_commitment_block`, `success_policy` — no `grounded_in`. `tools/validators/src/schemas/story-choice.schema.json` mirrors that. `tools/validators/src/structural/recursive-reference-closure.ts` exists and already resolves in-branch references — a candidate validator home. SPEC-25 D5 and §Risks state gate 7 "may currently be enforced skill-side only" and the implementer "must locate or create a structural validator home."
2. SPEC-25 D5 prescribes `grounded_in: { records: [STENT | STLOC | STOBJ | BEL | OBL | CNSQ | THR | SREL | DA id refs]*, affordance_ordinals: [integer] }` on `CHC` — `records` required, `affordance_ordinals` optional, referencing `PG.state_snapshot.visible_affordances[].ordinal`.
3. Cross-artifact boundary under audit: the `CHC` schema (contract §4.5.12 ↔ `story-choice.schema.json`) plus the gate-7 grounding check that resolves `grounded_in.records` against the emitting page's `PG.state_snapshot.active_records` and `grounded_in.affordance_ordinals` against that page's `visible_affordances[].ordinal`.
4. FOUNDATIONS Rule 1 (No Floating Facts): restated before trusting the spec — a plan is load-bearing engine output, and gate 7 (plan grounding) is one of the eight shared hard gates. D5 makes gate 7's CHC-grounding requirement *structurally enforceable* rather than weakly inferred: every emitted choice must explicitly cite the active records / affordances that ground it.
5. Schema extension: `story-choice.schema.json` is extended. Consumers — `record_schema_compliance`, the gate-7 structural check, `branching-story-bootstrap` / `branching-story-turn-cycle` (write side), `branching-story-health-audit` (read side). `grounded_in.records` is a **required** sub-field (every new `CHC` must carry it); greenfield (zero production story bundles), so no existing-record migration cost. `affordance_ordinals` is optional.
6. Validator-home decision: the implementer must decide between extending `recursive-reference-closure.ts` (which already resolves in-branch references) and adding a new structural validator. Classified as a **required design decision of this ticket**, not a follow-up — the check ("every `grounded_in.records` entry resolves to a record in the emitting page's `state_snapshot.active_records`; every `affordance_ordinals` entry resolves to a `visible_affordances[].ordinal` on that page") must have a structural home before this ticket is complete.

## Architecture Check

1. An explicit `grounded_in` field — rather than continuing to infer grounding from `target_or_action_families` — lets gate 7 verify grounding against *any* active record (`OBL` / `BEL` / `SREL` / etc.), not just affordance action-families. Structural enforcement replaces weak inference.
2. No shims: gate 7 reads `grounded_in` directly; the old `target_or_action_families`-matching inference is not retained as a fallback path.

## Verification Layers

1. `story-choice.schema.json` carries `grounded_in` (`records` required, `affordance_ordinals` optional) -> schema validation / grep-proof.
2. The structural check fails a `CHC` whose `grounded_in.records` cites a record absent from the emitting page's `active_records` -> validator test.
3. The structural check fails a `CHC` whose `affordance_ordinals` cites a non-existent `visible_affordances[].ordinal` -> validator test.
4. `branching-story-bootstrap` / `branching-story-turn-cycle` populate `grounded_in` on every emitted `CHC` -> skill dry-run.

## What to Change

### 1. Contract §4.5.12

Add the `grounded_in` object to the `CHC` schema: `records` (required, a list of `STENT` / `STLOC` / `STOBJ` / `BEL` / `OBL` / `CNSQ` / `THR` / `SREL` / `DA` id refs) and `affordance_ordinals` (optional, a list of integers referencing `PG.state_snapshot.visible_affordances[].ordinal`).

### 2. story-choice.schema.json

Add `grounded_in` with `records` (array of the id-ref union, required) and `affordance_ordinals` (array of integers, optional) to `properties`; add `grounded_in` to `required`.

### 3. Gate-7 structural validator

Add the grounding-resolution check to its structural-validator home — extend `tools/validators/src/structural/recursive-reference-closure.ts` or add a new structural validator (implementer's call per Assumption Reassessment item 6, with registry wiring). The check: every `grounded_in.records` entry resolves to a record in the emitting page's `state_snapshot.active_records`, and every `affordance_ordinals` entry resolves to a `visible_affordances[].ordinal` on that page.

### 4. Skills

`branching-story-bootstrap`: `PG-1` first-choice generation populates `grounded_in`. `branching-story-turn-cycle`: choice generation populates `grounded_in`. `branching-story-health-audit`: dangling-choice checks read `grounded_in`.

## Files to Touch

- `.claude/skills/_shared-templates/story-state-contract.md` (modify — §4.5.12)
- `tools/validators/src/schemas/story-choice.schema.json` (modify)
- `tools/validators/src/structural/recursive-reference-closure.ts` (modify) OR a new `tools/validators/src/structural/<gate7-grounding>.ts` (new) plus its registry wiring — implementer's call per Assumption Reassessment item 6
- `.claude/skills/branching-story-bootstrap/SKILL.md` (modify)
- `.claude/skills/branching-story-turn-cycle/SKILL.md` (modify)
- `.claude/skills/branching-story-health-audit/SKILL.md` (modify)

## Out of Scope

- Removing `target_or_action_families` from `CHC` — it stays; `grounded_in` adds explicit grounding alongside it.
- P1 #10 local salience scoring — rejected by SPEC-25 §Out of Scope (a turn-cycle ranking heuristic touching no schema).
- The `CHC.supersedes` field — already present, not touched.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/validators && npm run build && npm run test` — `record_schema_compliance` rejects a `CHC` missing `grounded_in.records`; the gate-7 structural check fails a `CHC` whose `grounded_in.records` cites a record absent from the emitting page's `active_records`.
2. `cd tools/validators && npm run build && npm run test` — the gate-7 structural check fails a `CHC` whose `affordance_ordinals` cites a non-existent `visible_affordances[].ordinal`.
3. Skill dry-run: `branching-story-turn-cycle` populates `grounded_in` on every emitted `CHC`.

### Invariants

1. Every `CHC` carries `grounded_in.records` with at least one entry.
2. Every `grounded_in.records` entry resolves to a record active in the emitting page's `state_snapshot.active_records`; every `affordance_ordinals` entry resolves to a `visible_affordances[].ordinal` on that page.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/recursive-reference-closure.test.ts` (modify) OR a new `tools/validators/tests/structural/<gate7-grounding>.test.ts` (new) — pass + fail cases for `grounded_in.records` resolution and `affordance_ordinals` resolution, paired to the validator-home decision.
2. `tools/validators/tests/structural/record-schema-compliance.test.ts` (modify) — `CHC` with / without `grounded_in`.

### Commands

1. `cd tools/validators && npm run build && npm run test`
2. Skill dry-run of `branching-story-turn-cycle`, inspecting `grounded_in` on every emitted `CHC`.
3. A `tools/validators`-scoped `npm run test` is the correct boundary for the schema + validator change; the skill-prose changes are verified by the dry-run in command 2.
