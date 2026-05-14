# SPEC25STOCOHHAR-008: CHC.grounded_in field + gate-7 validator

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — modifies `tools/validators/src/schemas/story-choice.schema.json`, extends `recursive_reference_closure` as the gate-7 grounding home, amends `.claude/skills/_shared-templates/story-state-contract.md` (§4.5.12), modifies `branching-story-bootstrap`, `branching-story-turn-cycle`, `branching-story-health-audit`, and truths the SPEC-25 D5 implementation note.
**Deps**: None

## Problem

At intake, gate 7 (plan grounding) required that "every CHC emitted by this page is grounded," but `CHC` had no grounding field — gate 7 could only weakly infer grounding by matching `target_or_action_families` against affordance action-families, missing grounding in non-affordance state (an `OBL`, a `BEL`, a `SREL`). This ticket added an explicit `CHC.grounded_in` field and a structural check that resolves it against the emitting page's state.

## Assumption Reassessment (2026-05-14)

1. Contract §4.5.12 `CHC` schema carries `id`, `story_id`, `created_at_page`, `supersedes`, `surface_label`, `player_visible_intent`, `target_or_action_families`, `likely_state_pressure`, `associated_commitment_block`, `success_policy` — no `grounded_in`. `tools/validators/src/schemas/story-choice.schema.json` mirrors that. `tools/validators/src/structural/recursive-reference-closure.ts` exists and already resolves in-branch references — a candidate validator home. SPEC-25 D5 and §Risks state gate 7 "may currently be enforced skill-side only" and the implementer "must locate or create a structural validator home."
2. SPEC-25 D5 prescribes `grounded_in: { records: [STENT | STLOC | STOBJ | BEL | OBL | CNSQ | THR | SREL | DA id refs]*, affordance_ordinals: [integer] }` on `CHC` — `records` required, `affordance_ordinals` optional, referencing `PG.state_snapshot.visible_affordances[].ordinal`.
3. Cross-artifact boundary under audit: the `CHC` schema (contract §4.5.12 ↔ `story-choice.schema.json`) plus the gate-7 grounding check that resolves `grounded_in.records` against the emitting page's `PG.state_snapshot.active_records` and `grounded_in.affordance_ordinals` against that page's `visible_affordances[].ordinal`.
4. FOUNDATIONS Rule 1 (No Floating Facts): restated before trusting the spec — a plan is load-bearing engine output, and gate 7 (plan grounding) is one of the eight shared hard gates. D5 makes gate 7's CHC-grounding requirement *structurally enforceable* rather than weakly inferred: every emitted choice must explicitly cite the active records / affordances that ground it.
5. Schema extension: `story-choice.schema.json` is extended. Consumers — `record_schema_compliance`, the gate-7 structural check, `contract-schema-roundtrip`, `branching-story-bootstrap` / `branching-story-turn-cycle` (write side), `branching-story-health-audit` (read side). `grounded_in.records` is a **required non-empty** sub-field (every new `CHC` must carry it); greenfield (zero production story bundles), so no existing-record migration cost. `affordance_ordinals` is optional.
6. Validator-home decision: implement in `tools/validators/src/structural/recursive-reference-closure.ts`. That validator already runs on `create_pg_record`, scopes checks to the created page's story and branch path, follows `emitted_choices`, and fails branch-local dangling references. Extending it with a focused gate-7 `grounded_in` check avoids adding a duplicate structural traversal.
7. Proof mismatch: the drafted "skill dry-run" is not executable in the active Codex context. The truthful skill proof is manual contract review plus stale-anchor grep over the three story skills and shared contract, while the mechanized acceptance boundary is `tools/validators` schema/structural tests.

## Architecture Check

1. An explicit `grounded_in` field — rather than continuing to infer grounding from `target_or_action_families` — lets gate 7 verify grounding against *any* active record (`OBL` / `BEL` / `SREL` / etc.), not just affordance action-families. Structural enforcement replaces weak inference.
2. No shims: gate 7 reads `grounded_in` directly; the old `target_or_action_families`-matching inference is not retained as a fallback path.

## Verification Layers

1. `story-choice.schema.json` carries `grounded_in` (`records` required, `affordance_ordinals` optional) -> schema validation / grep-proof.
2. The structural check fails a `CHC` whose `grounded_in.records` cites a record absent from the emitting page's `active_records` -> validator test.
3. The structural check fails a `CHC` whose `affordance_ordinals` cites a non-existent `visible_affordances[].ordinal` -> validator test.
4. `branching-story-bootstrap` / `branching-story-turn-cycle` populate `grounded_in` on every emitted `CHC`, and `branching-story-health-audit` reads it -> manual skill-contract review plus grep-proof.

## Landed Changes

### 1. Contract §4.5.12

Added the `grounded_in` object to the `CHC` schema: `records` (required non-empty list of `STENT` / `STLOC` / `STOBJ` / `BEL` / `OBL` / `CNSQ` / `THR` / `SREL` / `DA` id refs) and `affordance_ordinals` (optional list of integers referencing `PG.state_snapshot.visible_affordances[].ordinal`).

### 2. story-choice.schema.json

Added `grounded_in` with `records` (required non-empty array of the id-ref union) and `affordance_ordinals` (array of integers, optional) to `properties`; added `grounded_in` to `required`.

### 3. Gate-7 structural validator

Extended `tools/validators/src/structural/recursive-reference-closure.ts` as the grounding-resolution structural-validator home. The check fails every `grounded_in.records` entry that does not resolve to a record in the emitting page's `state_snapshot.active_records`, and every `affordance_ordinals` entry that does not resolve to a `visible_affordances[].ordinal` on that page.

### 4. Skills

`branching-story-bootstrap`: `PG-1` first-choice generation now requires `grounded_in`. `branching-story-turn-cycle`: choice generation now requires `grounded_in`. `branching-story-health-audit`: dangling-choice checks now read `grounded_in`.

## Files to Touch

- `.claude/skills/_shared-templates/story-state-contract.md` (modify — §4.5.12)
- `tools/validators/src/schemas/story-choice.schema.json` (modify)
- `tools/validators/src/structural/recursive-reference-closure.ts` (modify)
- `tools/validators/tests/structural/recursive-reference-closure.test.ts` (modify)
- `tools/validators/tests/structural/record-schema-compliance-arc.test.ts` (modify)
- `tools/validators/tests/structural/contract-schema-roundtrip.test.ts` (modify)
- `.claude/skills/branching-story-bootstrap/SKILL.md` (modify)
- `.claude/skills/branching-story-turn-cycle/SKILL.md` (modify)
- `.claude/skills/branching-story-health-audit/SKILL.md` (modify)
- `archive/specs/SPEC-25-story-coherence-hardening.md` (modify — D5 implementation note / risk truthing)

## Out of Scope

- Removing `target_or_action_families` from `CHC` — it stays; `grounded_in` adds explicit grounding alongside it.
- P1 #10 local salience scoring — rejected by SPEC-25 §Out of Scope (a turn-cycle ranking heuristic touching no schema).
- The `CHC.supersedes` field — already present, not touched.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/validators && npm run build && npm run test` — `record_schema_compliance` rejects a `CHC` missing `grounded_in.records`; the gate-7 structural check fails a `CHC` whose `grounded_in.records` cites a record absent from the emitting page's `active_records`.
2. `cd tools/validators && npm run build && npm run test` — the gate-7 structural check fails a `CHC` whose `affordance_ordinals` cites a non-existent `visible_affordances[].ordinal`.
3. Manual skill-contract review plus grep-proof: `branching-story-bootstrap` and `branching-story-turn-cycle` require `grounded_in` on every emitted `CHC`; `branching-story-health-audit` reads `grounded_in` for choice grounding.

### Invariants

1. Every `CHC` carries `grounded_in.records` with at least one entry.
2. Every `grounded_in.records` entry resolves to a record active in the emitting page's `state_snapshot.active_records`; every `affordance_ordinals` entry resolves to a `visible_affordances[].ordinal` on that page.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/recursive-reference-closure.test.ts` (modify) — pass + fail cases for `grounded_in.records` resolution and `affordance_ordinals` resolution.
2. `tools/validators/tests/structural/record-schema-compliance-arc.test.ts` (modify) — `CHC` with / without `grounded_in`.
3. `tools/validators/tests/structural/contract-schema-roundtrip.test.ts` (modify) — aggregate story-choice field-set guard and representative record.

### Commands

1. `cd tools/validators && npm run build && npm run test`
2. `rg -n 'grounded_in|choice_state_reference_dangling|action-family list requires' .claude/skills/_shared-templates/story-state-contract.md .claude/skills/branching-story-bootstrap/SKILL.md .claude/skills/branching-story-turn-cycle/SKILL.md .claude/skills/branching-story-health-audit/SKILL.md`
3. A `tools/validators`-scoped `npm run test` is the correct mechanized boundary for the schema + validator change; the skill-prose changes are verified by manual contract review and grep-proof because no executable skill dry-run runner is exposed in this session.

## Outcome

Completion date: 2026-05-14.

Completed. `CHC.grounded_in` is now part of the shared story-state contract and the `story-choice` JSON Schema, with `records` required and non-empty. `recursive_reference_closure` now enforces gate-7 choice grounding for `create_pg_record` pre-apply pages by checking emitted choices against the emitting page's active record set and visible-affordance ordinals.

The story-pipeline skills now instruct bootstrap and turn-cycle emitters to populate `grounded_in` for every emitted `CHC`, and health-audit now reads `grounded_in` instead of inferring dangling choice state from action-family lists. SPEC-25's D5 implementation note and risk section were truthed to the landed validator home.

## Verification Result

1. `cd tools/validators && npm run build && npm run test` — passed; 208 tests passed. This covered the updated `story-choice` schema, `record_schema_compliance` rejection of missing / missing-records / empty-records `grounded_in`, `contract-schema-roundtrip`, and the recursive-reference choice-grounding pass/fail cases.
2. `rg -n 'grounded_in|choice_state_reference_dangling|action-family list requires' .claude/skills/_shared-templates/story-state-contract.md .claude/skills/branching-story-bootstrap/SKILL.md .claude/skills/branching-story-turn-cycle/SKILL.md .claude/skills/branching-story-health-audit/SKILL.md` — reviewed hits: contract, bootstrap, turn-cycle, and health-audit now use `grounded_in`; no remaining active `action-family list requires` wording in the owned skill surfaces.

## Deviations

- The drafted skill dry-run was replaced with manual skill-contract review plus grep-proof because no executable story-skill dry-run runner is exposed in this Codex session.
- `docs/FOUNDATIONS.md` still has SPEC-25 D7-owned story-bundle amendments pending; this ticket truthed only the D5 implementation note in `archive/specs/SPEC-25-story-coherence-hardening.md`.
- `tools/validators/dist/` was refreshed by `npm run test`; it is ignored generated output, not a tracked source edit.
