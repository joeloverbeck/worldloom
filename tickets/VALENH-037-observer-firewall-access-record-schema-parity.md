# VALENH-037: reconcile observer-firewall direct access-record ids with the BEL schema

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — `tools/validators/src/structural/observer-firewall.ts`, `tools/validators/tests/structural/observer-firewall.test.ts`, and likely `tools/validators/src/schemas/story-belief.schema.json` plus same-seam authoring prose under `.claude/skills/branching-story-turn-cycle/references/phase-4-5-belief-and-mystery.md` if the schema is widened.
**Deps**: `archive/tickets/VALENH-036-observer-firewall-cross-actor-stemo-stplan-access-route.md`

## Problem

Post-ticket review of `VALENH-036` confirmed a remaining schema/validator parity gap in `observer_firewall`: `actorHasAccessRecord` accepts direct ids matching `STATIC_ACCESS_RECORD_ID`:

```ts
/^(?:STENT|STSTAT|STLOC|STOBJ|DA|BEL|SF|SE|CLK|STSEC|STQ|STPLAN|STEMO)-\d+$/
```

but the BEL schema only allows `basis.access_records[]` entries matching:

```json
"^(STENT|STLOC|STOBJ|DA|BEL|SF|SE)-[0-9]+$"
```

This means the structural validator can accept synthetic BEL access routes that `record_schema_compliance` rejects. The live example is `tools/validators/tests/structural/observer-firewall.test.ts`: the "accepts CHC status grounding through a BEL access route" case uses `belief("BEL-1", "STENT-1", "private", ["STSTAT-2"])`, even though `STSTAT-2` is schema-invalid for `BEL.basis.access_records[]`.

`VALENH-036` deliberately avoided widening the BEL schema for cross-actor STEMO/STPLAN by using the schema-legal holder-`STENT` route. This ticket owns the broader direct-access-record parity decision for `STSTAT`, `CLK`, `STSEC`, `STQ`, and any remaining `STPLAN`/`STEMO` direct-id behavior exposed by `actorHasAccessRecord`.

## Assumption Reassessment (2026-05-23)

1. **Codebase check.** `tools/validators/src/structural/observer-firewall.ts` still defines `STATIC_ACCESS_RECORD_ID` with `STSTAT`, `CLK`, `STSEC`, `STQ`, `STPLAN`, and `STEMO`, and `actorHasAccessRecord` still accepts any matching direct id when an actor-held BEL lists it in `basis.access_records[]`.
2. **Schema check.** `tools/validators/src/schemas/story-belief.schema.json` still excludes `STSTAT`, `CLK`, `STSEC`, `STQ`, `STPLAN`, and `STEMO` from `basis.access_records[]`; active turn-cycle belief authoring prose likewise lists only `STENT` / `STLOC` / `STOBJ` / `DA` / `BEL` / `SF` / `SE`.
3. **Shared boundary under audit.** The boundary is BEL access-route evidence across `story-belief.schema.json`, `observer_firewall`'s `actorHasAccessRecord`, structural tests that synthesize BEL records directly, and turn-cycle authoring guidance for `BEL.basis.access_records[]`.
4. **FOUNDATIONS principle.** FOUNDATIONS §Story Bundles §6b permits actor access through active BEL state, direct observation, testimony, documents, inference, surveillance, institutional channels, magic/tech, and other valid mechanisms. The implementation must keep the observer firewall fail-closed while making schema-valid BEL evidence and validator acceptance agree.
5. **Mismatch classification.** This is not unfinished `VALENH-036` work: `VALENH-036` completed the cross-actor STEMO/STPLAN holder-observability path without requiring direct STEMO/STPLAN ids in BEL access records. This ticket owns the remaining direct-access-record parity gap.

## Architecture Check

1. Choose one canonical direct-access route contract and make all surfaces match it. Either widen the BEL schema and authoring prose for the direct ids the validator genuinely supports, or narrow `STATIC_ACCESS_RECORD_ID` / tests to the existing schema-valid classes and route hidden/status/plan/emotion access through holder/entity/source records instead.
2. No backwards-compatibility aliasing or dual route should be introduced. The end state should have one schema-valid way to express each accepted observer-firewall access route.

## Verification Layers

1. `actorHasAccessRecord` accepts only schema-valid BEL access records, or the schema accepts every direct id `actorHasAccessRecord` intentionally supports -> code/schema parity test.
2. Existing observer-firewall status/hidden-state acceptance tests use schema-valid BEL fixtures -> `record_schema_compliance` fixture proof plus focused structural test.
3. Cross-actor STEMO/STPLAN holder-observability behavior from `VALENH-036` remains unchanged -> focused `observer-firewall.test.ts` cases.
4. Turn-cycle authoring prose matches the final BEL `access_records[]` id set -> grep/manual review over Phase 4-5 and Phase 8 references.
5. HARD-GATE-facing validator behavior remains fail-closed for missing access routes -> focused rejection tests plus package `npm test`.

## What to Change

### 1. Decide and implement the canonical direct access-record set

Inspect every `actorHasAccessRecord` caller in `observer-firewall.ts`:

- `STSTAT` choice grounding
- `SF` choice grounding
- hidden `CLK`, `STSEC`, and `STQ` storylet preconditions
- any remaining plan/emotion direct-id assumptions after `VALENH-036`

Then either:

- widen `story-belief.schema.json` and authoring prose to admit the direct classes that are semantically valid in `BEL.basis.access_records[]`; or
- narrow `STATIC_ACCESS_RECORD_ID` and tests to the existing schema-valid set, replacing direct hidden/status ids with schema-valid holder/entity/source routes where needed.

### 2. Add parity tests

Add a focused assertion that the direct id prefixes accepted by `actorHasAccessRecord` are exactly the prefixes allowed by `story-belief.schema.json` for `basis.access_records[]`, or otherwise prove any intentional difference with explicit per-class tests and prose.

### 3. Repair schema-invalid observer-firewall fixtures

Make the `observer-firewall.test.ts` acceptance fixtures pass both the structural validator and `record_schema_compliance`, so a future schema-invalid BEL cannot mask a false-green structural path.

## Files to Touch

- `tools/validators/src/structural/observer-firewall.ts` (modify)
- `tools/validators/tests/structural/observer-firewall.test.ts` (modify)
- `tools/validators/src/schemas/story-belief.schema.json` (modify if the chosen route widens schema)
- `.claude/skills/branching-story-turn-cycle/references/phase-4-5-belief-and-mystery.md` (modify if the chosen route widens or narrows authoring prose)
- `.claude/skills/branching-story-turn-cycle/references/phase-8-choice-generation.md` (modify only if choice-grounding prose needs same-seam clarification)

## Out of Scope

- Reopening `VALENH-036`'s cross-actor STEMO/STPLAN holder-observability route.
- Direct edits to live story/world records under `worlds/`.
- Changing unrelated STEMO orientation accessibility policy already covered by `archive/tickets/STEMOACC-001.md`.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/validators && npm run build && node --test dist/tests/structural/observer-firewall.test.js`
2. A new or updated parity proof that compares `STATIC_ACCESS_RECORD_ID` / accepted direct-access prefixes against `story-belief.schema.json` `basis.access_records[]`.
3. `cd tools/validators && npm test`

### Invariants

1. A BEL access route accepted by `observer_firewall` is expressible by a schema-valid `belief_record`.
2. Missing actor access to another actor's status, hidden state, plan, or emotion remains a fail verdict.
3. Cross-actor STEMO/STPLAN grounding continues to use the holder-`STENT` observability route from `VALENH-036` unless this ticket explicitly chooses and proves a schema-valid direct-id route.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/observer-firewall.test.ts` — update schema-invalid BEL direct-id fixtures and preserve accept/reject behavior with schema-valid records.
2. Add a focused schema/constant parity test near the observer-firewall tests or an existing schema parity suite — rationale: prevent future drift between `actorHasAccessRecord` and `story-belief.schema.json`.
3. If the BEL schema is widened, add a `record_schema_compliance` positive fixture for each newly admitted direct id class and update any negative fixture that intentionally proves rejected ids.

### Commands

1. `cd tools/validators && npm run build && node --test dist/tests/structural/observer-firewall.test.js`
2. `cd tools/validators && node --test <compiled parity test path>`
3. `cd tools/validators && npm test`
