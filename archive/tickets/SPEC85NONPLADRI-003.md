# SPEC85NONPLADRI-003: Secret-reveal ledger-clue golden fixture

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: None — fixture + integration test only; consumes existing validators
**Deps**: None

## Problem

At intake, the `secret_reveal` non-player driver kind had schema-level and structural-unit coverage but no rich authored golden fixture exercising end-to-end composition through all 6 driver-primitive validators. This ticket landed the authored fixture + integration test for the secret-reveal kind, whose distinguishing constraint is Mystery Reserve firewall preservation (FOUNDATIONS §Validation Rule 7 + §Story Bundles §6b): the reveal is bounded by an access-route-licensed DA clue, and the page snapshot carries coherent `unresolved_mystery_claims` narrowing data for that partial reveal.

## Assumption Reassessment (2026-05-25)

1. The 6 driver-primitive validators are imported and composed at `tools/validators/tests/integration/spec76-red-kiln-ambush.test.ts`; the import block + composition pattern carries over to this ticket's new test file. The kind-specific schema constraint `kind = secret_reveal requires driver_records non-empty including at least one STSEC` is structurally enforced by `turn_driver_schema_compliance`; access-route posture for `reported` visibility is enforced by `turn_driver_pov_observer_firewall` with `turn_driver_missing_access_route`.
2. SPEC-85 §3 Non-goals + §4.3 driver-specific rule for `secret_reveal` ("`driver_records[]` cites STSEC; the reveal does not exceed the access route's license — the BEL or DA path is structurally adequate; the parent PG snapshot's `unresolved_mystery_claims` evolves consistently") forbid schema changes and rely on the existing validator composition. This ticket encodes the rule via a fixture whose parent PG-1 carries `STSEC-1`, `DA-1`, and `BEL-1`; `SE-1.turn_driver` references `STSEC-1`; and child PG-2 carries a `narrowed` mystery claim with event evidence.
3. **Cross-skill boundary**: the fixture-shape contract (`RedKilnFixture` interface) is the shared boundary with the SPEC-76 capstone test pattern; same pipeline applies.
4. **FOUNDATIONS principle**: §Validation Rule 7 "Preserve Mystery Deliberately" + §Story Bundles §6b "Information / Observer Firewall" jointly govern this fixture. The page-commit-time proof here is limited to existing SPEC-76 driver primitives: hidden/reported access routing, page-plan §7a projection, active-pressure handling, and response CHC grounding. Dedicated mystery-claim replay/invariant validators are outside this ticket because SPEC-85 forbids new validators and the 6-driver composition does not emit a mystery-evolution code.
5. Live validator reassessment corrected the drafted mutation suite: the six SPEC-76 driver validators do not expose a dedicated `unresolved_mystery_claims` evolution verdict. The landed mutation suite therefore proves three concrete existing codes: `turn_driver_hidden_state_leak`, `turn_driver_missing_access_route`, and `chc_response_topical_grounding_missing`.

## Architecture Check

1. **Per-kind fixture-and-test pairing** mirrors the Red Kiln Ambush precedent. The secret-reveal kind's interaction with Mystery Reserve firewall semantics is a distinguishing structural concern that a kind-specific fixture exercises cleanly; abstracting into a parametrized harness across kinds would obscure the Mystery-firewall assertion.
2. **No backwards-compatibility shim** — new artifact; no existing fixture or validator import is reshaped. The fixture exclusively uses `status: active` or `status: passive` mysteries (per FOUNDATIONS §Mystery Reserve "Resolution-safety semantics") — never `status: forbidden` — so the reveal is structurally permissible and the validator composition is exercised on the licensed path, not on a forbidden-mystery path that the validator must reject regardless of access route.

## Verification Layers

1. **Fixture parse-correctness** → codebase grep-proof + Node JSON parse at integration-test load time.
2. **6-validator composition PASS on unmutated fixture** → integration test assertion (`assert.deepEqual(run.verdicts, [])`).
3. **Secret-reveal-specific FAIL mutations produce expected SPEC-76 codes** → integration test assertion per mutation.
4. **Red Kiln Ambush regression** → existing `spec76-red-kiln-ambush.test.ts` continues to pass.

## What to Change

### 1. Created fixture directory `tools/validators/tests/fixtures/secret-reveal-ledger-clue/`

Added two files:

- `README.md`: names the scenario ("STSEC partial reveal through DA ledger clue; player learns the chamberlain's secret debt but not the creditor's identity"), the driver kind (`secret_reveal`), the STSEC + DA + BEL access route, and the expected PASS / FAIL matrix.
- `fixture.json`: a compact `RedKilnFixture`-shaped JSON bundle with:
  - `records[]`: 2 PGs; `STSEC-1` as the hidden story secret; `DA-1` as the ledger clue; `BEL-1` as the document access route; `SE-1` as the `secret_reveal` turn resolution with `driver_records: ["STSEC-1"]`, `player_response_mode: responds`, and `pov_visibility: reported`; `SLT-ledger-debt-reveal` as the bounded reveal mechanism; and `CHC-1` grounded in `STSEC-1` + `DA-1`.
  - `files[]`: one page-plan §7a entry with Observer-firewall note naming the BEL/DA access route and an active-pressure disposition row selecting STSEC-1.

### 2. Created integration test `tools/validators/tests/integration/spec85-secret-reveal-ledger-clue.test.ts`

Mirrors `spec76-red-kiln-ambush.test.ts` structure:

- **Test 1 — PASS case**: `runValidators` on the unmutated fixture returns `verdicts: []`.
- **Test 2 — Mutation suite (3 mutations)**:
  - **M-1 — Hidden secret perceived directly**: mutates `event.turn_driver.pov_visibility = "perceived_directly"` and asserts `turn_driver_hidden_state_leak`.
  - **M-2 — Access-route absence**: removes active `BEL-1` from parent `PG-1` while keeping `pov_visibility: reported`; asserts `turn_driver_missing_access_route`.
  - **M-3 — Response CHC grounded away from secret**: mutates `CHC-1.grounded_in.records` to omit `STSEC-1`; asserts `chc_response_topical_grounding_missing`.

### 3. Acceptance via `npm test`

Same shape as ticket 001.

## Files to Touch

- `tools/validators/tests/fixtures/secret-reveal-ledger-clue/README.md` (new)
- `tools/validators/tests/fixtures/secret-reveal-ledger-clue/fixture.json` (new)
- `tools/validators/tests/integration/spec85-secret-reveal-ledger-clue.test.ts` (new)

## Out of Scope

- Schema changes to `story-event.schema.json` or any other JSON schema (SPEC-85 §3).
- New validator code or modifications to existing validators (SPEC-85 §3).
- Skill prose changes (SPEC-85 §3).
- The prose-attach hidden-mind-leak validator (SPEC-85 §3; deferred).
- Mysteries with `status: forbidden` (the fixture exclusively uses `status: active` mysteries to exercise the licensed-reveal path; forbidden-mystery resolution is structurally prohibited regardless of access route per FOUNDATIONS §Rule 7 and is covered by separate validator surfaces, not by this kind's fixture).
- Fixtures for the other three kinds — landed in sibling tickets SPEC85NONPLADRI-001, -002, -004.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/validators && npm run build && node --test dist/tests/integration/spec85-secret-reveal-ledger-clue.test.js` — both the PASS test and the mutation suite pass.
2. `cd tools/validators && node --test dist/tests/integration/spec76-red-kiln-ambush.test.js` — Red Kiln regression unchanged.
3. `cd tools/validators && npm test` — full suite passes.

### Invariants

1. The fixture's parent-PG `unresolved_mystery_claims` evolves coherently from PG-1 (`preserved`) to PG-2 (`narrowed`) per the DA-1 access route's structural license.
2. The fixture's SLT-effects-reveal scope is bounded by DA-1's clue content; no SLT effect reveals the creditor identity that DA-1 does not license.
3. The Mystery Reserve `M-<n>` referenced by the `unresolved_mystery_claims` chain has `status: active` (not `forbidden`); the fixture exclusively exercises the licensed-reveal path.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/integration/spec85-secret-reveal-ledger-clue.test.ts` — new; mirrors `spec76-red-kiln-ambush.test.ts` structure with `secret_reveal`-specific PASS + 3 FAIL mutations covering hidden direct perception, access-route absence, and response grounding.

### Commands

1. `cd tools/validators && npm run build && node --test dist/tests/integration/spec85-secret-reveal-ledger-clue.test.js` — targeted per-fixture verification.
2. `cd tools/validators && npm test` — full-package verification.
3. The narrower targeted command is the right verification boundary because the test is independent of every other test in the package; the full-suite invocation only adds orthogonal sanity gates.

## Outcome

Completed on 2026-05-25.

Implemented the secret-reveal ledger-clue golden fixture and integration test. The fixture models `STSEC-1` as a hidden debt secret surfaced through `DA-1` and active `BEL-1`; `SE-1.turn_driver` records `secret_reveal`, `reported` POV visibility, and response mode `responds`; the page-plan §7a section names the access route and active-pressure disposition. The integration test composes the same 6 SPEC-76 driver-primitive validators as Red Kiln and covers the PASS case plus three secret-reveal-specific FAIL mutations.

## Verification Result

Commands run from `tools/validators`:

1. `npm run build` — PASS; TypeScript compiled the new fixture test into `dist/`.
2. `node --test dist/tests/integration/spec85-secret-reveal-ledger-clue.test.js` — PASS; 2/2 subtests passed.
3. `node --test dist/tests/integration/spec76-red-kiln-ambush.test.js` — PASS; Red Kiln regression unchanged.
4. `npm test` — PASS; 1019/1019 tests passed.

## Deviations

1. The drafted mutation for `unresolved_mystery_claims` evolution was corrected during reassessment. The six SPEC-76 driver-primitive validators do not emit a dedicated mystery-evolution verdict, so the landed mutation suite proves current enforceable signals: `turn_driver_hidden_state_leak`, `turn_driver_missing_access_route`, and `chc_response_topical_grounding_missing`.
2. The fixture follows the live Red Kiln/SPEC-85 sibling convention of compact structural fixtures rather than the drafted full STORY/BR/world-canon bundle. It still includes the records and page-plan content consumed by the owned 6-validator composition.
3. `player_response_mode` landed as `responds` rather than `witnesses` so `turn_cycle_output_grounding_integrity` can prove that the emitted CHC grounds in the secret driver record.
