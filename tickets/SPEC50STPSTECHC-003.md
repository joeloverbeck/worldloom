# SPEC50STPSTECHC-003: SE.commitment.alias_bindings accepts CLK/STSEC/STQ/STPLAN/STEMO

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — `tools/validators` (story-event schema), shared contract docs.
**Deps**: None

## Problem

`SE.commitment.alias_bindings` (`tools/validators/src/schemas/story-event.schema.json:56`) allows `STENT|STSTAT|STINT|SF|BEL|SE|OBL|CNSQ|THR|SREL|STLOC|STOBJ|DA|BR|PG|CHC|SLT` and omits `CLK`, `STSEC`, `STQ`, `STPLAN`, `STEMO`. The closed predicate DSL includes existential predicates over exactly these classes (`any_clock_active`, `any_secret_unrevealed`, `any_story_question_open`, `any_plan_active`, `any_emotion_active`). A storylet can be selected because one of these classes exists, but the selected event cannot bind the exact record — eligibility outruns commitment binding, so existential prefiltering cannot become exact branch-local execution.

## Assumption Reassessment (2026-05-19)

1. Codebase: `story-event.schema.json:56` `alias_bindings` value regex confirmed to omit the five classes; the SLT predicate enum at `tools/validators/src/schemas/story-storylet.schema.json:266-271` confirms `any_plan_active`/`any_emotion_active`/`any_clock_active`/`any_secret_unrevealed`/`any_story_question_open` exist. Verified this session.
2. Specs/contract: `SE.commitment.alias_bindings` field documented in `story-state-contract.md` §4 and mirrored in `story-record-schemas.md`.
3. Cross-artifact boundary: the alias-binding value regex must enumerate exactly the existential-predicate-bindable classes the DSL can select; schema and contract mirror must agree.
4. FOUNDATIONS §Story Bundles §6b (Information / Observer Firewall): binding an actor/record to a selected move requires the record be branch-local and access-routed; widening alias_bindings to the five classes extends — does not bypass — the firewall, since binding-validity validators apply to the newly-bindable classes too.
5. Schema extension: extends `story-event` record schema's `commitment.alias_bindings` class set. Consumers: selected-binding-validity validation + turn-cycle event commit. Additive-only; scope strictly bounded to the five existential-predicate-bindable classes (do not widen beyond what the DSL can existentially select).

## Architecture Check

1. The addition is bounded to exactly the classes the existential DSL predicates can select; this keeps eligibility expressiveness and binding expressiveness aligned without opening alias_bindings to classes that have no existential predicate.
2. No shim — existing alias bindings are unaffected.

## Verification Layers

1. The five classes accepted in `alias_bindings` -> schema validation against a selected-storylet event fixture binding each class.
2. A binding to a class outside the bindable set still fails -> negative validator test.
3. Eligibility/binding parity (every `any_*` predicate's class is alias-bindable) -> FOUNDATIONS §6b alignment check cross-referencing the DSL enum.

## What to Change

### 1. story-event alias_bindings regex

Add `CLK`, `STSEC`, `STQ`, `STPLAN`, `STEMO` to the value regex at line 56.

### 2. Contract mirror

Mirror in `story-state-contract.md` §4 and `story-record-schemas.md`, noting the binding set equals the existential-predicate-bindable class set.

## Files to Touch

- `tools/validators/src/schemas/story-event.schema.json` (modify)
- `.claude/skills/_shared-templates/story-state-contract.md` (modify)
- `.claude/skills/_shared-templates/story-record-schemas.md` (modify)
- `tools/validators/tests/` selected-storylet alias-binding fixture (new or modify)

## Out of Scope

- `SE.state_delta` STPLAN/STEMO (archive/tickets/SPEC50STPSTECHC-001.md).
- Selected-binding-validity validator logic beyond the schema class set (covered where the eligibility-source grounding validator lands, SPEC50STPSTECHC-009).
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

1. `tools/validators/tests/` — selected-storylet event fixture binding each of the five classes (positive) + an out-of-set binding (negative).

### Commands

1. `npm run build --prefix tools/validators`
2. `npm test --prefix tools/validators`
