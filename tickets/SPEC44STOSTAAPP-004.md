# SPEC44STOSTAAPP-004: `state_delta_class_integrity` runtime validator

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — new structural validator `state_delta_class_integrity` registered in `tools/validators/src/public/registry.ts`; runtime backstop for the state_delta schema fix that lands in ticket SPEC44STOSTAAPP-001. No impact on existing validators.
**Deps**: SPEC44STOSTAAPP-001

## Problem

Ticket SPEC44STOSTAAPP-001 expands `story-event.schema.json` `state_delta` regex to include STSTAT/CLK/STSEC/STQ. JSON Schema validation enforces the pattern at envelope-validation time, but a schema fix alone doesn't catch two related failure modes:

1. **Class prefix correct, ID doesn't resolve.** `SE.state_delta.create: [STSTAT-99]` matches the regex but no record with id `STSTAT-99` exists in the patch plan or repository. The schema accepts the syntactic form; semantically, the id is dangling.
2. **Class prefix outside the permitted 20-class set.** A future op that produces a new story-bundle class (e.g., a hypothetical `STPLAN`) could leak into `state_delta` ahead of the schema being updated to permit it; a runtime check catches this drift before the schema regression is noticed.

The `state_delta_class_integrity` validator backstops both cases at runtime: every id in `SE.state_delta.create/supersede/close` must (a) match one of the 20 story-bundle class prefixes (the full set, post-Phase-1 schema fix), and (b) resolve to a record present in the patch plan or repository.

## Assumption Reassessment (2026-05-18)

1. The 20 story-bundle class prefixes after the SPEC44STOSTAAPP-001 expansion are: STENT, STSTAT, STINT, SF, BEL, SE, OBL, CNSQ, THR, CLK, STSEC, STQ, SREL, STLOC, STOBJ, DA, BR, PG, CHC, SLT. `tools/validators/src/schemas/story-event.schema.json:90-104` will hold the updated `state_delta` pattern after ticket SPEC44STOSTAAPP-001 lands. `tools/patch-engine/src/ops/create-story-record.ts:21-44` `StoryRecordOperationKind` enumerates the `create_<class>_record` ops; the class set in this Assumption Reassessment item matches the union.
2. SPEC-44 §Approach Phase 2 step 8 specifies this validator's scope and discrimination logic; §Risks & Open Questions item 1 names the failure mode (existing-file overwrite + class-prefix drift) the validator backstops at runtime.
3. **Cross-boundary surface under audit**: this validator gates `SE` record submission via the validator harness; it consumes patch-plan staged writes + repository state to resolve id references. The boundary is the validator-protocol contract (verdict-emit + severity-mode).
4. **FOUNDATIONS principle**: §Story Bundles §5b (Schema-Minimalism At Story Scope) — `state_delta` ids are fields whose load-bearing function is to address records; an unresolvable id fails the load-bearing test. The validator restores load-bearing fidelity by reject-at-runtime when the schema's syntactic check passes but the semantic resolution fails.
5. **Canon Safety surface touched**: the new validator is a structural pre-apply gate under `tools/validators/src/structural/` per the per-ticket-type granularity rule. It gates `SE` record submission; the change does NOT weaken the Mystery Reserve firewall (state_delta ids reference story-bundle records, not Mystery Reserve `M-<integer>` records).

## Architecture Check

1. **Runtime check complements schema check.** JSON Schema enforces syntactic form; runtime resolution enforces semantic referential integrity. The two are layered, not redundant: schema catches form; validator catches reference.
2. **No backwards-compatibility shim.** The validator emits `fail` for any unresolvable id. Pre-SPEC-44 story bundles whose `SE` records contain only resolvable ids validate clean; the validator does not penalize legitimate prior state.

## Verification Layers

1. **Validator registered with `fail` severity** → codebase grep-proof: `grep -n 'state_delta_class_integrity' tools/validators/src/public/registry.ts` returns a registry entry with `severity_mode: "fail"`.
2. **Validator fires on class-prefix drift** → synthetic-fixture test: an `SE` record with `state_delta.create: [INVALID-1]` returns a `fail` verdict.
3. **Validator fires on unresolvable id** → synthetic-fixture test: an `SE` record with `state_delta.create: [STSTAT-99]` where `STSTAT-99.yaml` does not exist in the patch plan or repository returns a `fail` verdict.
4. **Validator validates clean on resolvable ids** → synthetic-fixture test: an `SE` record with `state_delta.create: [STSTAT-1, CLK-1]` where both records exist in the patch plan validates clean.

## What to Change

### 1. Author the validator module

Create `tools/validators/src/structural/state-delta-class-integrity.ts`. The module exports a `stateDeltaClassIntegrity` validator following the existing structural-validator pattern. The validator:
- Targets the pre-apply and full validation phases (`applies_to: ["pre_apply", "full"]`).
- Iterates each `SE` record's `state_delta.create/supersede/close` arrays; for each id, checks (a) the class prefix is in the permitted 20-class set → otherwise fail; (b) the id resolves to a record present in the patch plan or repository → otherwise fail.
- Returns verdicts with `severity: "fail"`, `code: "state_delta_class_integrity_violation"` and a message naming the offending id, the failure mode (class-drift vs unresolvable), and the SE record id (e.g., `"SE-7 state_delta.create references STSTAT-99 which does not resolve to a record in the patch plan or repository"`).
- Embed the 20-class set as a typed constant (matching `tools/validators/src/schemas/story-event.schema.json` post-Phase-1); the constant is the single source of truth for this validator's prefix check.

### 2. Register the validator

Edit `tools/validators/src/public/registry.ts` to add an import for the new validator module and a registry entry alongside the other structural validators.

### 3. Author the test module

Create `tools/validators/tests/structural/state-delta-class-integrity.test.ts` covering:
- **Negative test 1 (class-drift)**: an `SE` record with `state_delta.create: ["BADCLASS-1"]` → expect `fail` verdict.
- **Negative test 2 (unresolvable id)**: an `SE` record with `state_delta.create: ["STSTAT-99"]` where the fixture world has no `STSTAT-99` → expect `fail` verdict.
- **Negative test 3 (supersede unresolvable)**: an `SE` record with `state_delta.supersede: ["CLK-99"]` where the fixture has no `CLK-99` → expect `fail` verdict.
- **Positive test 1 (all classes valid)**: an `SE` record with `state_delta.create: ["STSTAT-1", "CLK-1", "STSEC-1", "STQ-1"]` where all four records exist in the patch plan → expect clean verdict.
- **Positive test 2 (mixed create + supersede)**: an `SE` record with `state_delta.create: ["CLK-3"]` and `state_delta.supersede: ["CLK-2"]` where `CLK-3` is in the plan and `CLK-2` is in the repository → expect clean verdict.

## Files to Touch

- `tools/validators/src/structural/state-delta-class-integrity.ts` (new)
- `tools/validators/src/public/registry.ts` (modify — add import + registry entry)
- `tools/validators/tests/structural/state-delta-class-integrity.test.ts` (new)

## Out of Scope

- The `no_story_state_in_place_mutation` validator (ticket SPEC44STOSTAAPP-003).
- Validation of the SE record's other fields (event_kind, actor, outcome_route, etc.) — handled by the existing `record-schema-compliance-story-event` test.
- Validation of `SE.state_delta.close` semantics (which records are eligible for closing) — distinct from class-prefix + id-resolution checks.

## Acceptance Criteria

### Tests That Must Pass

1. `npm test --prefix tools/validators -- state-delta-class-integrity` passes all 5 test cases (3 negative, 2 positive).
2. `npm test --prefix tools/validators` exits 0 (full validator suite regression).
3. `npm run build --prefix tools/validators` exits 0.

### Invariants

1. Any `SE` record referencing a class prefix outside the permitted 20-class set in `state_delta` returns a `fail` verdict.
2. Any `SE` record referencing an id (with valid class prefix) that doesn't resolve to a record in the patch plan or repository returns a `fail` verdict.
3. SE records with fully-resolvable `state_delta` arrays validate clean.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/state-delta-class-integrity.test.ts` (new) — 5 test cases.
2. No modifications to existing tests.

### Commands

1. `npm test --prefix tools/validators -- state-delta-class-integrity` — targeted validator test.
2. `npm test --prefix tools/validators` — full validator suite regression.
3. `npm run build --prefix tools/validators` — compilation check.
