# SPEC44STOSTAAPP-004: `state_delta_class_integrity` runtime validator

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — new structural validator `state_delta_class_integrity` registered in `tools/validators/src/public/registry.ts`; runtime backstop for the state_delta schema fix that landed in `archive/tickets/SPEC44STOSTAAPP-001.md`; validator inventory/count tests updated.
**Deps**: archive/tickets/SPEC44STOSTAAPP-001.md

## Problem

Archived ticket `archive/tickets/SPEC44STOSTAAPP-001.md` expanded `story-event.schema.json` `state_delta` regex to include STSTAT/CLK/STSEC/STQ. JSON Schema validation enforces the pattern at envelope-validation time, but a schema fix alone doesn't catch two related failure modes:

1. **Class prefix correct, ID doesn't resolve.** `SE.state_delta.create: [STSTAT-99]` matches the regex but no record with id `STSTAT-99` exists in the patch plan or repository. The schema accepts the syntactic form; semantically, the id is dangling.
2. **Class prefix outside the permitted 20-class set.** A future op that produces a new story-bundle class (e.g., a hypothetical `STPLAN`) could leak into `state_delta` ahead of the schema being updated to permit it; a runtime check catches this drift before the schema regression is noticed.

The `state_delta_class_integrity` validator backstops both cases at runtime: every id in `SE.state_delta.create/supersede/close` must (a) match one of the 20 story-bundle class prefixes (the full set, post-Phase-1 schema fix), and (b) resolve to a record present in the patch plan or repository.

## Assumption Reassessment (2026-05-18)

1. The 20 story-bundle class prefixes after `archive/tickets/SPEC44STOSTAAPP-001.md` are: STENT, STSTAT, STINT, SF, BEL, SE, OBL, CNSQ, THR, CLK, STSEC, STQ, SREL, STLOC, STOBJ, DA, BR, PG, CHC, SLT. `tools/validators/src/schemas/story-event.schema.json` now holds the updated `state_delta` pattern. `tools/patch-engine/src/ops/create-story-record.ts:21-44` `StoryRecordOperationKind` enumerates the `create_<class>_record` ops; the class set in this Assumption Reassessment item matches the union.
2. SPEC-44 §Approach Phase 2 step 8 specifies this validator's scope and discrimination logic; §Risks & Open Questions item 1 names the failure mode (existing-file overwrite + class-prefix drift) the validator backstops at runtime.
3. **Cross-boundary surface under audit**: this validator gates `SE` record submission via the validator harness; it consumes patch-plan staged writes + repository state to resolve id references. The boundary is the validator-protocol contract (verdict-emit + severity-mode).
4. **FOUNDATIONS principle**: §Story Bundles §5b (Schema-Minimalism At Story Scope) — `state_delta` ids are fields whose load-bearing function is to address records; an unresolvable id fails the load-bearing test. The validator restores load-bearing fidelity by reject-at-runtime when the schema's syntactic check passes but the semantic resolution fails.
5. **Canon Safety surface touched**: the new validator is a structural pre-apply gate under `tools/validators/src/structural/` per the per-ticket-type granularity rule. It gates `SE` record submission; the change does NOT weaken the Mystery Reserve firewall (state_delta ids reference story-bundle records, not Mystery Reserve `M-<integer>` records).
6. Live package reassessment found same-seam inventory surfaces that must move with any new registered validator: `tools/validators/README.md`, `tools/validators/tests/structural/registry.test.ts`, `tools/validators/tests/integration/spec04-verification.test.ts`, and `tools/validators/tests/integration/validate-patch-plan.test.ts`'s clean-plan execution-status inventory. These were added to the landed file set so the registry count, inventory prose, and non-SE pre-apply skip assertions stay truthful.

## Architecture Check

1. **Runtime check complements schema check.** JSON Schema enforces syntactic form; runtime resolution enforces semantic referential integrity. The two are layered, not redundant: schema catches form; validator catches reference.
2. **No backwards-compatibility shim.** The validator emits `fail` for any unresolvable id. Pre-SPEC-44 story bundles whose `SE` records contain only resolvable ids validate clean; the validator does not penalize legitimate prior state.

## Verification Layers

1. **Validator registered with `fail` severity** → codebase grep-proof: `grep -n 'state_delta_class_integrity' tools/validators/src/public/registry.ts` returns a registry entry with `severity_mode: "fail"`.
2. **Validator fires on class-prefix drift** → synthetic-fixture test: an `SE` record with `state_delta.create: [INVALID-1]` returns a `fail` verdict.
3. **Validator fires on unresolvable id** → synthetic-fixture test: an `SE` record with `state_delta.create: [STSTAT-99]` where `STSTAT-99.yaml` does not exist in the patch plan or repository returns a `fail` verdict.
4. **Validator validates clean on resolvable ids** → synthetic-fixture test: an `SE` record with `state_delta.create: [STSTAT-1, CLK-1]` where both records exist in the patch plan validates clean.

## Landed Changes

### 1. Authored the validator module

`tools/validators/src/structural/state-delta-class-integrity.ts` now exports `stateDeltaClassIntegrity`. The validator runs for full-world validation, pre-apply plans that create SE records, and incremental SE touches. It checks each `SE.state_delta.create/supersede/close` id against the permitted 20-class set and the story-scoped record set materialized from the repository plus pre-apply overlay. It emits `fail` verdicts with `code: "state_delta_class_integrity_violation"` and `failure_mode: "class_drift"` or `"unresolved_id"`.

### 2. Registered the validator and inventory surfaces

`tools/validators/src/public/registry.ts` imports and registers the validator after `no_story_state_in_place_mutation`. `tools/validators/README.md`, `tools/validators/tests/structural/registry.test.ts`, and `tools/validators/tests/integration/spec04-verification.test.ts` now reflect 48 structural validators / 60 total mechanized validators.

### 3. Added focused and pre-apply inventory tests

`tools/validators/tests/structural/state-delta-class-integrity.test.ts` covers scope, class-prefix drift, unresolved create ids, unresolved supersede ids, resolved STSTAT/CLK/STSEC/STQ ids, mixed create+supersede resolution, and same-id story-scope isolation. `tools/validators/tests/integration/validate-patch-plan.test.ts` now records that this validator is skipped for clean non-SE pre-apply plans.

## Files to Touch

- `tools/validators/src/structural/state-delta-class-integrity.ts` (new)
- `tools/validators/src/public/registry.ts` (modify — add import + registry entry)
- `tools/validators/tests/structural/state-delta-class-integrity.test.ts` (new)
- `tools/validators/tests/structural/registry.test.ts` (modify — registry inventory)
- `tools/validators/tests/integration/spec04-verification.test.ts` (modify — validator counts)
- `tools/validators/tests/integration/validate-patch-plan.test.ts` (modify — pre-apply execution-status inventory)
- `tools/validators/README.md` (modify — validator inventory/count)

## Out of Scope

- The `no_story_state_in_place_mutation` validator (`archive/tickets/SPEC44STOSTAAPP-003.md`).
- Validation of the SE record's other fields (event_kind, actor, outcome_route, etc.) — handled by the existing `record-schema-compliance-story-event` test.
- Validation of `SE.state_delta.close` semantics (which records are eligible for closing) — distinct from class-prefix + id-resolution checks.

## Acceptance Criteria

### Tests That Must Pass

1. From `tools/validators`: `node --test dist/tests/structural/state-delta-class-integrity.test.js dist/tests/structural/registry.test.js dist/tests/integration/spec04-verification.test.js dist/tests/integration/validate-patch-plan.test.js` passes after `npm run build`.
2. `npm test --prefix tools/validators` exits 0 (full validator suite regression).
3. From `tools/validators`: `npm run build` exits 0.

### Invariants

1. Any `SE` record referencing a class prefix outside the permitted 20-class set in `state_delta` returns a `fail` verdict.
2. Any `SE` record referencing an id (with valid class prefix) that doesn't resolve to a record in the patch plan or repository returns a `fail` verdict.
3. SE records with fully-resolvable `state_delta` arrays validate clean.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/state-delta-class-integrity.test.ts` (new) — 7 cases covering scope, two rejection modes, resolved SPEC-44 classes, mixed create+supersede resolution, and story-scope isolation.
2. `tools/validators/tests/structural/registry.test.ts` and `tools/validators/tests/integration/spec04-verification.test.ts` (modified) — registry/count proof surfaces updated.
3. `tools/validators/tests/integration/validate-patch-plan.test.ts` (modified) — proves clean non-SE pre-apply plans skip the new validator.

### Commands

1. From `tools/validators`: `npm run build` — compilation check.
2. From `tools/validators`: `node --test dist/tests/structural/state-delta-class-integrity.test.js dist/tests/structural/registry.test.js dist/tests/integration/spec04-verification.test.js dist/tests/integration/validate-patch-plan.test.js` — focused validator, registry/count, and pre-apply inventory proof.
3. From `tools/validators`: `npm test` — full validator suite regression.

## Outcome

Completed 2026-05-18. The validators package now has a fail-closed `state_delta_class_integrity` structural validator. It ensures every story-event `state_delta.create/supersede/close` id uses one of the 20 permitted story-state class prefixes and resolves within the same story from repository or pre-apply overlay records. Registry inventory, validator counts, README inventory, and the public pre-apply execution-status inventory were updated for the new validator.

## Verification Result

1. `npm run build` from `tools/validators` — passed.
2. `node --test dist/tests/structural/state-delta-class-integrity.test.js dist/tests/structural/registry.test.js dist/tests/integration/spec04-verification.test.js dist/tests/integration/validate-patch-plan.test.js` from `tools/validators` — passed 35 tests.
3. `npm test` from `tools/validators` — passed 518 tests.

## Deviations

1. The drafted targeted command `npm test --prefix tools/validators -- state-delta-class-integrity` was not the accepted targeted proof because the package `npm test` script rebuilds and runs the compiled glob; extra positional arguments are not a reliable file selector for this package. The accepted targeted proof is the direct compiled `node --test` command after `npm run build`.
2. Live broad-suite proof exposed one same-seam inventory update in `tools/validators/tests/integration/validate-patch-plan.test.ts`: clean non-SE pre-apply plans must record `state_delta_class_integrity` as skipped. The validator behavior was unchanged; the test inventory was truthed and the full suite then passed.
