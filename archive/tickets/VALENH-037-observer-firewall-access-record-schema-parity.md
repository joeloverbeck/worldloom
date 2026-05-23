# VALENH-037: reconcile observer-firewall direct access-record ids with the BEL schema

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — `tools/validators/src/structural/observer-firewall.ts`, `tools/validators/src/schemas/story-belief.schema.json`, `tools/validators/tests/structural/observer-firewall.test.ts`, `tools/validators/tests/structural/record-schema-compliance-bel.test.ts`, and same-seam authoring prose under `.claude/skills/branching-story-turn-cycle/references/phase-4-5-belief-and-mystery.md` and `.claude/skills/branching-story-turn-cycle/references/phase-8-choice-generation.md`.
**Deps**: `archive/tickets/VALENH-036-observer-firewall-cross-actor-stemo-stplan-access-route.md`

## Problem

At intake, post-ticket review of `VALENH-036` confirmed a remaining schema/validator parity gap in `observer_firewall`: `actorHasAccessRecord` accepted direct ids matching `STATIC_ACCESS_RECORD_ID`:

```ts
/^(?:STENT|STSTAT|STLOC|STOBJ|DA|BEL|SF|SE|CLK|STSEC|STQ|STPLAN|STEMO)-\d+$/
```

but the BEL schema only allowed `basis.access_records[]` entries matching:

```json
"^(STENT|STLOC|STOBJ|DA|BEL|SF|SE)-[0-9]+$"
```

Before this ticket, the structural validator could accept synthetic BEL access routes that `record_schema_compliance` rejected. The live example was `tools/validators/tests/structural/observer-firewall.test.ts`: the "accepts CHC status grounding through a BEL access route" case used `belief("BEL-1", "STENT-1", "private", ["STSTAT-2"])`, even though `STSTAT-2` was schema-invalid for `BEL.basis.access_records[]`.

`VALENH-036` deliberately avoided widening the BEL schema for cross-actor STEMO/STPLAN by using the schema-legal holder-`STENT` route. This ticket owns the broader direct-access-record parity decision for `STSTAT`, `CLK`, `STSEC`, `STQ`, and any remaining `STPLAN`/`STEMO` direct-id behavior exposed by `actorHasAccessRecord`.

## Assumption Reassessment (2026-05-23)

1. **Codebase check.** `tools/validators/src/structural/observer-firewall.ts` defined `STATIC_ACCESS_RECORD_ID` with `STSTAT`, `CLK`, `STSEC`, `STQ`, `STPLAN`, and `STEMO`, and `actorHasAccessRecord` accepted any matching direct id when an actor-held BEL listed it in `basis.access_records[]`.
2. **Schema check.** Before the fix, `tools/validators/src/schemas/story-belief.schema.json` excluded `STSTAT`, `CLK`, `STSEC`, `STQ`, `STPLAN`, and `STEMO` from `basis.access_records[]`; active turn-cycle belief authoring prose likewise listed only `STENT` / `STLOC` / `STOBJ` / `DA` / `BEL` / `SF` / `SE`.
3. **Shared boundary under audit.** The boundary is BEL access-route evidence across `story-belief.schema.json`, `observer_firewall`'s `actorHasAccessRecord`, structural tests that synthesize BEL records directly, and turn-cycle authoring guidance for `BEL.basis.access_records[]`.
4. **FOUNDATIONS principle.** FOUNDATIONS §Story Bundles §6b permits actor access through active BEL state, direct observation, testimony, documents, inference, surveillance, institutional channels, magic/tech, and other valid mechanisms. The implementation must keep the observer firewall fail-closed while making schema-valid BEL evidence and validator acceptance agree.
5. **Mismatch classification.** This is not unfinished `VALENH-036` work: `VALENH-036` completed the cross-actor STEMO/STPLAN holder-observability path without requiring direct STEMO/STPLAN ids in BEL access records. This ticket owns the remaining direct-access-record parity gap.
6. **Chosen correction.** Reassessment chose a narrowed parity route: keep `STSTAT`, `CLK`, `STSEC`, and `STQ` as direct BEL access-record ids because they are concrete status/hidden-state access surfaces consumed by `observer_firewall`, but exclude direct `STPLAN` and `STEMO` ids because cross-actor plan/emotion access is intentionally mediated through holder-`STENT` observability from `VALENH-036`.
7. **Post-review correction (2026-05-23).** Post-ticket review found that an earlier pass overclaimed direct `STPLAN` / `STEMO` consumption. The final implementation removed those prefixes from the direct BEL access-record contract, added negative tests for direct `STPLAN` / `STEMO` BEL access records, and kept the holder-`STENT` route as the canonical way to ground cross-actor plan/emotion visibility.

## Architecture Check

1. The canonical direct-access route contract is the `observer_firewall` direct-prefix set exported as `STATIC_ACCESS_RECORD_PREFIXES`: `STENT`, `STSTAT`, `STLOC`, `STOBJ`, `DA`, `BEL`, `SF`, `SE`, `CLK`, `STSEC`, and `STQ`. `story-belief.schema.json` and turn-cycle authoring prose now match that set.
2. No backwards-compatibility aliasing or dual route was introduced. The end state has one schema-valid way to express each accepted observer-firewall direct access route.

## Verification Layers

1. `actorHasAccessRecord` accepts only schema-valid BEL access records, or the schema accepts every direct id `actorHasAccessRecord` intentionally supports -> code/schema parity test.
2. Existing observer-firewall status/hidden-state acceptance tests use schema-valid BEL fixtures -> `record_schema_compliance` fixture proof plus focused structural test.
3. Cross-actor STEMO/STPLAN holder-observability behavior from `VALENH-036` remains unchanged -> focused `observer-firewall.test.ts` cases.
4. Turn-cycle authoring prose matches the final BEL `access_records[]` id set -> grep/manual review over Phase 4-5 and Phase 8 references.
5. HARD-GATE-facing validator behavior remains fail-closed for missing access routes -> focused rejection tests plus package `npm test`.

## Landed Changes

### 1. Decide and implement the canonical direct access-record set

`tools/validators/src/structural/observer-firewall.ts` now exports `STATIC_ACCESS_RECORD_PREFIXES` and derives `STATIC_ACCESS_RECORD_ID` from it. `tools/validators/src/schemas/story-belief.schema.json` now accepts the same direct-id prefixes in `BEL.basis.access_records[]`: `STENT`, `STSTAT`, `STLOC`, `STOBJ`, `DA`, `BEL`, `SF`, `SE`, `CLK`, `STSEC`, and `STQ`.

The VALENH-036 cross-actor STEMO/STPLAN holder-observability path is unchanged: actors still need an active BEL whose `basis.access_records[]` names the holder `STENT` and whose route is in the observability set.

### 2. Add parity tests

`tools/validators/tests/structural/observer-firewall.test.ts` now asserts that `STATIC_ACCESS_RECORD_PREFIXES` exactly matches the prefix group in the BEL schema's `basis.access_records[]` pattern.

### 3. Repair historically schema-invalid observer-firewall fixtures

`tools/validators/tests/structural/record-schema-compliance-bel.test.ts` now proves a BEL fixture containing every observer-firewall direct access-record prefix passes `record_schema_compliance`, and proves direct `STPLAN` / `STEMO` ids are rejected by the BEL schema. `tools/validators/tests/structural/observer-firewall.test.ts` also proves a direct `STEMO` access record does not satisfy cross-actor STEMO grounding without the holder-observability route. The existing status and hidden-state observer-firewall fixtures are schema-valid under the widened BEL schema.

## Files to Touch

- `tools/validators/src/structural/observer-firewall.ts` (modified)
- `tools/validators/tests/structural/observer-firewall.test.ts` (modified)
- `tools/validators/src/schemas/story-belief.schema.json` (modified)
- `.claude/skills/branching-story-turn-cycle/references/phase-4-5-belief-and-mystery.md` (modified)
- `.claude/skills/branching-story-turn-cycle/references/phase-8-choice-generation.md` (modified)
- `tools/validators/tests/structural/record-schema-compliance-bel.test.ts` (modified)

## Out of Scope

- Reopening `VALENH-036`'s cross-actor STEMO/STPLAN holder-observability route.
- Direct edits to live story/world records under `worlds/`.
- Changing unrelated STEMO orientation accessibility policy already covered by `archive/tickets/STEMOACC-001.md`.

## Acceptance Criteria

### Tests That Passed

1. `cd tools/validators && npm run build` — PASS.
2. `cd tools/validators && node --test dist/tests/structural/observer-firewall.test.js dist/tests/structural/record-schema-compliance-bel.test.js` — PASS, 31 tests.
3. `cd tools/validators && npm test` — PASS, 908 tests.

### Invariants

1. A BEL access route accepted by `observer_firewall` is expressible by a schema-valid `belief_record`.
2. Missing actor access to another actor's status, hidden state, plan, or emotion remains a fail verdict.
3. Cross-actor STEMO/STPLAN grounding continues to use the holder-`STENT` observability route from `VALENH-036`; direct `STPLAN` / `STEMO` ids remain rejected as BEL access records.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/observer-firewall.test.ts` — added schema/constant parity coverage for the observer-firewall direct BEL access-record prefix set and negative coverage for direct cross-actor `STEMO` access-record ids.
2. `tools/validators/tests/structural/record-schema-compliance-bel.test.ts` — added `record_schema_compliance` positive coverage for every direct id class accepted by `observer_firewall` in `BEL.basis.access_records[]` and negative coverage for direct `STPLAN` / `STEMO` BEL access-record ids.

### Commands

1. `cd tools/validators && npm run build`
2. `cd tools/validators && node --test dist/tests/structural/observer-firewall.test.js dist/tests/structural/record-schema-compliance-bel.test.js`
3. `cd tools/validators && npm test`

## Outcome

Completed: 2026-05-23.

The BEL schema now admits every direct access-record prefix intentionally accepted by `observer_firewall`, and the structural validator exposes that direct-prefix set as `STATIC_ACCESS_RECORD_PREFIXES` so schema parity is testable. The final direct set includes status and hidden-state access surfaces (`STSTAT`, `CLK`, `STSEC`, `STQ`) but excludes direct `STPLAN` / `STEMO` ids. The turn-cycle Phase 4-5 and Phase 8 references now describe that narrowed `BEL.basis.access_records[]` contract and preserve the VALENH-036 holder-`STENT` route as the cross-actor STEMO/STPLAN grounding path.

## Verification Result

Baseline before source edits:

1. `cd tools/validators && npm test` — PASS, 904 tests.

Post-fix proof:

1. `cd tools/validators && npm run build` — PASS.
2. `cd tools/validators && node --test dist/tests/structural/observer-firewall.test.js dist/tests/structural/record-schema-compliance-bel.test.js` — PASS, 31 tests.
3. `cd tools/validators && npm test` — PASS, 908 tests.
4. Stale-anchor sweep:

   ```bash
   rg -n 'STENT / STLOC / STOBJ / DA / BEL / SF / SE|\^\(STENT\|STLOC\|STOBJ\|DA\|BEL\|SF\|SE\)-\[0-9\]|only allows `basis\.access_records|schema-invalid|STSTAT-2\]`|access_records\[\] entries matching|STPLAN\|STEMO.*access_records|access_records.*STPLAN\|STEMO' archive/tickets/VALENH-037-observer-firewall-access-record-schema-parity.md .claude/skills/branching-story-turn-cycle/references tools/validators/src/schemas/story-belief.schema.json tools/validators/tests/structural/observer-firewall.test.ts tools/validators/tests/structural/record-schema-compliance-bel.test.ts
   ```

   PASS — remaining hits are historical intake/post-review evidence in this completed ticket or intentional negative/holder-route references, not current operational claims that direct `STPLAN` / `STEMO` BEL access records are accepted.
5. Package README/docs/examples inspection: `tools/validators/README.md` has no same-seam `BEL.basis.access_records[]` authoring contract to update; repo-level `docs/MACHINE-FACING-LAYER.md` references BEL access-record edge extraction but does not enumerate the allowed BEL schema prefix set.

## Deviations

- The final implementation widened the BEL schema and authoring prose for `STSTAT`, `CLK`, `STSEC`, and `STQ`, but narrowed the prior `STATIC_ACCESS_RECORD_ID` helper by excluding direct `STPLAN` and `STEMO` ids. This is recorded in Assumption Reassessment item 6.
- The existing direct status/hidden-state observer-firewall fixtures were made schema-valid by the schema change rather than by rewriting each fixture to a different holder/source route.
- Post-ticket review initially blocked archival because direct `STPLAN` / `STEMO` access-record ids were schema-valid after the first pass but were not actually consumed by the cross-actor plan/emotion observer-firewall path. The final pass resolved that mismatch by removing those prefixes from the direct-id contract and authoring prose while keeping VALENH-036 holder-observability behavior intact.
- A same-family untracked ticket, `tickets/VALENH-038-midstory-record-introduction-grounding-conflates-supersessions-with-fresh-introductions.md`, appeared in the worktree during this run. It is unrelated to the VALENH-037 schema parity seam and was left untouched.
