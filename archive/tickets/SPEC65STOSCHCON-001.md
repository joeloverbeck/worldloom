# SPEC65STOSCHCON-001: Narrow story-event.schema.json unions + STATE_DELTA_CLASSES

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `tools/validators` (story-event JSON schema + `state-delta-class-integrity` structural validator + focused structural tests)
**Deps**: None

## Problem

At intake, the `story-event.schema.json` enforcement surface drifted wider than the authoritative shared story-state contract on two unions:

- `SE.state_delta.create/supersede/close` allows `STENT|STCHAR|STSTAT|STINT|SF|BEL|SE|OBL|CNSQ|THR|CLK|STSEC|STQ|STPLAN|STEMO|SREL|STLOC|STOBJ|DA|BR|PG|CHC|SLT` (23 classes), but the contract (`story-record-schemas.md` §4.3, `story-state-contract.md` §5a) restricts state_delta to the **18 lifecycle-managed active-state classes** — the same set as `PG.state_snapshot.active_records`. `SE`, `PG`, `BR`, `CHC`, `SLT` are not lifecycle-managed active state and must not appear in an event delta.
- `SE.commitment.alias_bindings` allows the same over-broad 23-class union, but aliases are values bound by the closed predicate DSL — the precondition-bindable classes plus `CLK|STSEC|STQ|STPLAN|STEMO`. `STCHAR` as an alias payload is doubly forbidden (it is authoring authority, not a bindable value — FOUNDATIONS §6.1).

Because the contract is authoritative (FOUNDATIONS §5b: skills must not add fields to these schemas without amending the contract first), narrowing the schema to match is a correctness fix, not speculative hardening.

## Assumption Reassessment (2026-05-21)

1. At intake, `tools/validators/src/schemas/story-event.schema.json` carried the `state_delta` create/supersede/close item pattern and the `commitment.alias_bindings.additionalProperties` value pattern with the 23-class union. `tools/validators/src/structural/state-delta-class-integrity.ts` defined its **own** allow-set `STATE_DELTA_CLASSES` with 23 entries including the 5 structural classes removed by this ticket. The file ALSO defines `STORY_RECORD_NODE_TYPES` — a separate resolution set that this ticket did not edit.
2. The authoritative target set is `story-record-schemas.md` §4.3 + §4.2 (the 18 active-state classes: `STENT, STCHAR, STSTAT, STINT, SF, BEL, OBL, CNSQ, THR, CLK, STSEC, STQ, STPLAN, STEMO, SREL, STLOC, STOBJ, DA`); the alias-bindable set is the precondition-bindable classes plus `CLK, STSEC, STQ, STPLAN, STEMO` per the same §4.3.
3. **Cross-artifact boundary under audit**: the JSON schema (`story-event.schema.json`), the structural validator (`state-delta-class-integrity.ts` `STATE_DELTA_CLASSES`), and the contract (`story-record-schemas.md` §4.3) are three surfaces of one union. The state_delta narrowing edits all three to enumerate the identical 18-class set; SPEC65STOSCHCON-003 adds the parity test that guards this lockstep.
4. **FOUNDATIONS §5b Schema-Minimalism + §6.1 Story-Local Character Authority**: §5b makes the contract authoritative, so the schema must match it; §6.1 forbids `STCHAR` as an operational shortcut/payload, which the alias-binding exclusion enforces.
5. **Canon Safety surface**: `state-delta-class-integrity.ts` is a story-bundle structural validator that gates record writes at engine pre-apply. Narrowing `STATE_DELTA_CLASSES` strictly *tightens* what an `SE.state_delta` may reference — it cannot weaken the Mystery Reserve firewall or silently resolve an `M-<integer>` entry (it touches no mystery surface). The change rejects a strict superset of what it previously rejected.
6. **Removal blast radius**: removing `SE/PG/BR/CHC/SLT` from the schema regex AND `STATE_DELTA_CLASSES` is a removal of accepted values. Grep this session confirmed no current-contract positive fixture needed those classes in `state_delta` create/supersede/close; focused tests now assert they fail as structural records. The `alias_bindings` narrowing retained `STENT`: existing and focused event-schema tests still accept `alias_bindings: { actor: STENT-1 }`.

## Architecture Check

1. Editing the schema regex and the validator's `STATE_DELTA_CLASSES` set together (and only those two surfaces for state_delta) keeps the single union enforced in lockstep without introducing a new shared constants module — the registry framework was rejected at triage (SPEC-65 §3) as over-engineering per §5b. The `alias_bindings` narrowing is schema-only (see §Landed Changes item 2): there is no validator allow-set for alias classes to edit.
2. No backwards-compatibility shim: the narrowed unions reject the 5 structural classes outright; no transitional acceptance window is added (no production records rely on the old breadth).

## Verification Layers

1. State_delta narrowing enforced → schema validation (a focused test case with `SE.state_delta` referencing `PG-1`/`SE-2`/`BR-1`/`CHC-3`/`SLT-1` fails JSON-schema validation) + codebase grep-proof (`STATE_DELTA_CLASSES` has exactly the 18 classes; `SE`/`PG`/`BR`/`CHC`/`SLT` absent).
2. State_delta schema↔validator agreement → codebase grep-proof (the schema regex alternation and `STATE_DELTA_CLASSES` enumerate the identical 18-member set).
3. Alias_bindings narrowing enforced → schema validation (a focused test case binding `alias_bindings: { x: STCHAR-1 }` / `PG-1` / `SE-1` / `CHC-1` / `SLT-1` fails; `{ actor: STENT-1 }` still passes).
4. FOUNDATIONS §6.1 STCHAR-not-bindable → FOUNDATIONS alignment check (alias pattern excludes `STCHAR`).

## Landed Changes

### 1. Narrow `SE.state_delta` (schema + validator, lockstep)

In `tools/validators/src/schemas/story-event.schema.json`, the `create`/`supersede`/`close` item `pattern` now uses the 18-class alternation: `^(STENT|STCHAR|STSTAT|STINT|SF|BEL|OBL|CNSQ|THR|CLK|STSEC|STQ|STPLAN|STEMO|SREL|STLOC|STOBJ|DA)-[0-9]+$`. In `tools/validators/src/structural/state-delta-class-integrity.ts`, `"SE"`, `"BR"`, `"PG"`, `"CHC"`, and `"SLT"` were removed from the `STATE_DELTA_CLASSES` Set so it enumerates the identical 18 classes. `STORY_RECORD_NODE_TYPES` was not changed.

### 2. Narrow `SE.commitment.alias_bindings` (schema-only)

In `tools/validators/src/schemas/story-event.schema.json`, the `commitment.alias_bindings.additionalProperties` value `pattern` now accepts the alias-bindable classes named by `story-record-schemas.md` §4.3 / `story-state-contract.md` §5a: the precondition-bindable active-state classes plus `CLK|STSEC|STQ|STPLAN|STEMO`, excluding `STCHAR`, `SE`, `PG`, `BR`, `CHC`, and `SLT`. No alias resolution helpers changed; the restriction remains schema-only.

### 3. Negative + positive fixtures

The proof landed in existing focused structural test files rather than new YAML fixture files. `record-schema-compliance-story-event.test.ts` covers schema pass/fail for alias bindings and state_delta arrays; `state-delta-class-integrity.test.ts` covers the structural validator rejecting the same structural record classes even when corresponding records are present.

## Files to Touch

- `tools/validators/src/schemas/story-event.schema.json` (modify)
- `tools/validators/src/structural/state-delta-class-integrity.ts` (modify)
- `tools/validators/tests/structural/record-schema-compliance-story-event.test.ts` (modify)
- `tools/validators/tests/structural/state-delta-class-integrity.test.ts` (modify)

## Out of Scope

- The `PG.state_snapshot.active_records` `additionalProperties:false` change (SPEC65STOSCHCON-002).
- The schema↔validator↔contract parity snapshot test (SPEC65STOSCHCON-003).
- Any shared story-record-registry module (rejected at SPEC-65 §3).
- `SLT.effects`/`likely_effects` narrowing (deferred at SPEC-65 §3).
- Editing `STORY_RECORD_NODE_TYPES` or the `alias-binding-utils.ts` resolution helpers.

## Acceptance Criteria

### Tests That Must Pass

1. A `state_delta` (create/supersede/close) referencing `PG-1`, `SE-2`, `BR-1`, `CHC-3`, or `SLT-1` fails both JSON-schema validation and `state_delta_class_integrity`; a delta of only active-state classes passes.
2. An `alias_bindings` value of `STCHAR-1`, `PG-1`, `SE-1`, `CHC-1`, or `SLT-1` fails schema validation; `{ actor: STENT-1 }` passes.
3. `npm test` from `tools/validators` is green.

### Invariants

1. `story-event.schema.json` state_delta pattern and `STATE_DELTA_CLASSES` enumerate the identical 18-class set (byte-for-byte the same members).
2. `STCHAR` is never an `alias_bindings` payload (FOUNDATIONS §6.1).

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/record-schema-compliance-story-event.test.ts` — schema-level fail/pass assertions for narrowed `state_delta` and `alias_bindings`.
2. `tools/validators/tests/structural/state-delta-class-integrity.test.ts` — structural-validator rejection for `PG`/`SE`/`BR`/`CHC`/`SLT` in `state_delta`.

### Commands

1. `npm test` from `tools/validators`
2. `npm run build` from `tools/validators` (typecheck via `tsc`; the package defines no separate `typecheck` script)

## Outcome

Completed: 2026-05-21

The story-event JSON schema now matches the shared story-state contract for the two narrowed unions. `SE.state_delta.create/supersede/close` and `STATE_DELTA_CLASSES` both enumerate the same 18 lifecycle-managed active-state classes, including `STCHAR` and excluding `SE`, `PG`, `BR`, `CHC`, and `SLT`. `SE.commitment.alias_bindings` now excludes `STCHAR` and the structural story records while preserving lawful bindings such as `STENT`, `BEL`, `CLK`, `STSEC`, `STQ`, `STPLAN`, and `STEMO`.

Focused tests were added to the existing structural test files rather than new fixture files. This keeps the proof co-located with existing event-schema and state-delta coverage and avoids creating a parallel fixture convention for a small enum narrowing.

## Verification Result

Commands run from `tools/validators` unless otherwise noted:

1. `npm run build` — passed.
2. `node --test dist/tests/structural/record-schema-compliance-story-event.test.js dist/tests/structural/state-delta-class-integrity.test.js` — passed, 28/28 subtests.
3. `npm test` — passed, 823/823 subtests, after refreshing the ignored `tools/world-index/dist/` artifact with `npm run build` from `tools/world-index`.

## Deviations

- The drafted fixture wording was implemented as inline focused structural tests. Existing tests already use direct parsed-record fixtures for these schema/validator surfaces, so adding YAML fixture files would have duplicated the local pattern without improving the proof.
- The first broad `npm test` run failed in `SPEC-61 capstone builds a temp indexed world with proposal-surface node types` because the ignored `tools/world-index/dist/` artifact was stale and did not emit `pressure_event_card`. Rebuilding `tools/world-index` refreshed the file-dependency artifact; the same SPEC-61 test and the final `npm test` run then passed.
