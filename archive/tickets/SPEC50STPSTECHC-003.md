# SPEC50STPSTECHC-003: SE.commitment.alias_bindings accepts CLK/STSEC/STQ/STPLAN/STEMO

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — `tools/validators` (story-event schema), shared contract docs.
**Deps**: None

## Problem

At intake, `SE.commitment.alias_bindings` (`tools/validators/src/schemas/story-event.schema.json`) allowed `STENT|STSTAT|STINT|SF|BEL|SE|OBL|CNSQ|THR|SREL|STLOC|STOBJ|DA|BR|PG|CHC|SLT` and omitted `CLK`, `STSEC`, `STQ`, `STPLAN`, `STEMO`. The closed predicate DSL includes existential predicates over exactly these classes (`any_clock_active`, `any_secret_unrevealed`, `any_story_question_open`, `any_plan_active`, `any_emotion_active`). Before this ticket, a storylet could be selected because one of these classes existed, but the selected event could not bind the exact record — eligibility outran commitment binding.

## Assumption Reassessment (2026-05-20)

1. Codebase: `tools/validators/src/schemas/story-event.schema.json` `alias_bindings` value regex omitted the five classes at intake; the SLT predicate enum at `tools/validators/src/schemas/story-storylet.schema.json` confirms `any_plan_active`/`any_emotion_active`/`any_clock_active`/`any_secret_unrevealed`/`any_story_question_open` exist.
2. Specs/contract: `SE.commitment.alias_bindings` field documented in `story-state-contract.md` §4 and mirrored in `story-record-schemas.md`.
3. Cross-artifact boundary: the alias-binding value regex must enumerate exactly the existential-predicate-bindable classes the DSL can select; schema and contract mirror must agree.
4. FOUNDATIONS §Story Bundles §6b (Information / Observer Firewall): binding an actor/record to a selected move requires the record be branch-local and access-routed; widening `alias_bindings` to the five classes extends the schema-level record-id vocabulary without bypassing observer-firewall checks that read `SE.commitment.alias_bindings`.
5. Schema extension: extends `story-event` record schema's `commitment.alias_bindings` class set. Consumers: `record_schema_compliance`, observer-firewall reads of `SE.commitment.alias_bindings`, and turn-cycle event commit prose. Additive-only; scope strictly bounded to the five existential-predicate-bindable classes added by SPEC-50 (no new non-story-world classes were admitted).

## Architecture Check

1. The addition is bounded to exactly the classes the existential DSL predicates can select; this keeps eligibility expressiveness and binding expressiveness aligned without opening alias_bindings to classes that have no existential predicate.
2. No shim — existing alias bindings are unaffected.

## Verification Layers

1. The five classes accepted in `alias_bindings` -> schema validation against a selected-storylet event fixture binding each class.
2. A binding to a class outside the bindable set still fails -> negative validator test.
3. Eligibility/binding parity (every `any_*` predicate's class is alias-bindable) -> FOUNDATIONS §6b alignment check cross-referencing the DSL enum.

## Landed Changes

### 1. story-event alias_bindings regex

Added `CLK`, `STSEC`, `STQ`, `STPLAN`, and `STEMO` to the `commitment.alias_bindings` value regex.

### 2. Contract mirror

Mirrored the bounded alias-binding rule in `story-state-contract.md` §5 and `story-record-schemas.md` §4.3.

## Files to Touch

- `tools/validators/src/schemas/story-event.schema.json` (modify)
- `.claude/skills/_shared-templates/story-state-contract.md` (modify)
- `.claude/skills/_shared-templates/story-record-schemas.md` (modify)
- `tools/validators/tests/structural/record-schema-compliance-story-event.test.ts` (modify)
- `specs/SPEC-50-stplan-stemo-chc-slt-exploitation-parity.md` (modify; implementation note)

## Out of Scope

- `SE.state_delta` STPLAN/STEMO (archive/tickets/SPEC50STPSTECHC-001.md).
- Eligibility-source grounding or additional selected-move binding validation beyond the schema class set (covered where SPEC50STPSTECHC-009 lands).
- Widening alias_bindings to classes with no existential predicate.

## Acceptance Criteria

### Tests That Must Pass

1. A selected-storylet event binding CLK/STSEC/STQ/STPLAN/STEMO aliases validates.
2. A binding to a class outside the bindable set fails.
3. `npm test --prefix tools/validators` green.

### Invariants

1. Every class an existential predicate (`any_*`) can select is alias-bindable in `SE.commitment.alias_bindings`.
2. No existing alias binding is invalidated.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/record-schema-compliance-story-event.test.ts` — selected-storylet event fixture binding each of the five classes (positive) + an out-of-set binding (negative).

### Commands

1. `npm run build --prefix tools/validators`
2. `npm test --prefix tools/validators`

## Outcome

Completed: 2026-05-20.

The `story-event` JSON Schema now accepts `CLK`, `STSEC`, `STQ`, `STPLAN`, and `STEMO` in `SE.commitment.alias_bindings`. The shared story-state contract and schema mirror now document that this bounded addition lets existential predicate aliases become exact event bindings without adding new packet surfaces or bypassing observer-firewall discipline. SPEC-50 now records the A.3 implementation note beside the delivered A.1/A.2 notes.

## Verification Result

1. `npm run build --prefix tools/validators` — passed; TypeScript build and executable chmod completed.
2. `node --test tools/validators/dist/tests/structural/record-schema-compliance-story-event.test.js` — passed 15/15, including the new positive five-class alias-binding fixture and negative `M-1` rejection fixture.
3. `npm test --prefix tools/validators` — passed 669/669.

## Deviations

- The drafted test location was `tools/validators/tests/` generically; implementation extended the existing focused `record_schema_compliance` story-event test file.
- No separate selected-binding-validity validator was changed. The accepted boundary is schema-level vocabulary parity plus existing observer-firewall consumption of `SE.commitment.alias_bindings`.
