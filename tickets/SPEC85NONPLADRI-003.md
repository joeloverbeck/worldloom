# SPEC85NONPLADRI-003: Secret-reveal ledger-clue golden fixture

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: None — fixture + integration test only; consumes existing validators
**Deps**: None

## Problem

Per SPEC-85, the `secret_reveal` non-player driver kind has schema-level and structural-unit coverage but no rich authored golden fixture exercising end-to-end composition through all 6 driver-primitive validators. Today, a regression in the secret-reveal composition (STSEC reveal-ready record + access-route-licensed DA clue + page-plan §7a recording the reveal mechanism + `unresolved_mystery_claims` evolution consistent with the access route's license) would surface only when a real consumer encountered it in production. This ticket lands the authored fixture + integration test for the secret-reveal kind, whose distinguishing constraint is Mystery Reserve firewall preservation (FOUNDATIONS §Validation Rule 7 + §Story Bundles §6b): the reveal must not exceed what the access route structurally licenses, and `unresolved_mystery_claims` must evolve coherently with the reveal's boundary.

## Assumption Reassessment (2026-05-25)

1. The 6 driver-primitive validators are imported and composed at `tools/validators/tests/integration/spec76-red-kiln-ambush.test.ts:42-49`; the import block + composition pattern carries over. The kind-specific schema constraint `kind = secret_reveal requires driver_records non-empty including at least one STSEC` (per SPEC-76 §3.1) is structurally enforced; the access-route license is enforced by `turn_driver_pov_observer_firewall`'s `turn_driver_missing_access_route` code (§3.6.2).
2. SPEC-85 §3 Non-goals + §4.3 driver-specific rule for `secret_reveal` ("`driver_records[]` cites STSEC; the reveal does not exceed the access route's license — the BEL or DA path is structurally adequate; the parent PG snapshot's `unresolved_mystery_claims` evolves consistently") forbid schema changes and rely on the existing validator composition. This ticket encodes the rule via a fixture whose `unresolved_mystery_claims` on parent PG-1 carries an active mystery claim, the SE.turn_driver references STSEC-1 + DA-1 (the access route), and child PG-2's `unresolved_mystery_claims` shows the partial-narrowing entry per the existing `unresolved_mystery_claims[].status: clue_added | narrowed` vocabulary (FOUNDATIONS §Story Bundles §5 "Mystery Accretion").
3. **Cross-skill boundary**: the fixture-shape contract (`RedKilnFixture` interface) is the shared boundary with the SPEC-76 capstone test pattern; same pipeline applies.
4. **FOUNDATIONS principle**: §Validation Rule 7 "Preserve Mystery Deliberately" + §Story Bundles §6b "Information / Observer Firewall" jointly govern this fixture. The mystery firewall enforcement (FOUNDATIONS §Rule 7's "Mystery firewall enforcement" paragraph) routes through plan-time gates; this fixture exercises the page-commit-time path where the reveal SLT's effect is bounded by the access-route license. A `secret_reveal` mutation that exceeds the access route's license — e.g., the SLT reveals the mystery's full answer when DA-1 supports only a partial clue — must trip the validator composition. A mutation that resolves a `forbidden`-status mystery must NEVER pass (per FOUNDATIONS §Rule 7's prohibition).

## Architecture Check

1. **Per-kind fixture-and-test pairing** mirrors the Red Kiln Ambush precedent. The secret-reveal kind's interaction with Mystery Reserve firewall semantics is a distinguishing structural concern that a kind-specific fixture exercises cleanly; abstracting into a parametrized harness across kinds would obscure the Mystery-firewall assertion.
2. **No backwards-compatibility shim** — new artifact; no existing fixture or validator import is reshaped. The fixture exclusively uses `status: active` or `status: passive` mysteries (per FOUNDATIONS §Mystery Reserve "Resolution-safety semantics") — never `status: forbidden` — so the reveal is structurally permissible and the validator composition is exercised on the licensed path, not on a forbidden-mystery path that the validator must reject regardless of access route.

## Verification Layers

1. **Fixture parse-correctness** → codebase grep-proof + Node JSON parse at integration-test load time.
2. **6-validator composition PASS on unmutated fixture** → integration test assertion (`assert.deepEqual(run.verdicts, [])`).
3. **Secret-reveal-specific FAIL mutations produce expected SPEC-76 codes** → integration test assertion per mutation.
4. **Red Kiln Ambush regression** → existing `spec76-red-kiln-ambush.test.ts` continues to pass.

## What to Change

### 1. Create fixture directory `tools/validators/tests/fixtures/secret-reveal-ledger-clue/`

Add two files:

- `README.md` (~20 lines): name the scenario ("STSEC partial reveal through DA ledger clue; player learns the chamberlain's secret debt but not the creditor's identity"), the driver kind (`secret_reveal`), the STSEC + DA pair forming the access-route license, the parent-PG `unresolved_mystery_claims` baseline, and the expected post-driver `unresolved_mystery_claims` partial-narrowing entry.
- `fixture.json` (~250-300 lines): a `RedKilnFixture`-shaped JSON bundle with:
  - `records[]`: minimal world canon (1 CF naming the chamberlain's role + 1 M-<integer> Mystery Reserve entry with `status: active` and `future_resolution_safety: medium` naming the secret debt as an active mystery — the world-canon side of the secret; 1-2 ENTs for the chamberlain + the ledger artifact; 1 INV anchor — Social Invariant on debt-secrecy norms), plus story-bundle records (1 STORY, 1 BR, 2 PGs — PG-1's `state_snapshot.active_records.STSEC: [STSEC-1]` is the story-local reveal-ready secret, `active_records.DA: [DA-1]` is the ledger clue, `state_snapshot.unresolved_mystery_claims: [{m_id: "M-<n>", status: "apparent", access_record_chain: ["DA-1"]}]`; PG-2's `unresolved_mystery_claims` shows `status: narrowed` for the same M-id with the partial-reveal scope explicitly bounded, 1 SE with `event_kind: turn_resolution` + `turn_driver: {kind: secret_reveal, initiator: world (or system), driver_records: ["STSEC-1"], player_response_mode: witnesses, pov_visibility: discovered_after}`, 1 SLT representing the partial-reveal mechanism (the player discovers the debt via DA-1, NOT the creditor's identity) with grounded `compatible_turn_drivers: [secret_reveal]` and a non-generic `reason_to_exist`, 1+ BEL active on the player POV granting access to DA-1, 1+ CHC in `responds` register grounded in the newly-revealed claim).
  - `files[]`: page-plan §7a content with Observer-firewall note explicitly naming the access route (DA-1 → STSEC-1 partial reveal) and active-pressure disposition table with STSEC-1 as `selected`.

### 2. Create integration test `tools/validators/tests/integration/spec85-secret-reveal-ledger-clue.test.ts`

Mirror `spec76-red-kiln-ambush.test.ts` structure:

- **Test 1 — PASS case**: `runValidators` on the unmutated fixture returns `verdicts: []`.
- **Test 2 — Mutation suite (≥3 mutations)**:
  - **M-1 — Reveal exceeds access-route license**: amend the SLT's effects so the reveal narrates the creditor's identity (state beyond what DA-1's clue supports); assert verdict code from `turn_driver_pov_observer_firewall` — specifically `turn_driver_hidden_state_leak` (the reveal exposes state the access route does not license).
  - **M-2 — Access-route absence**: drop the BEL granting access to DA-1 from `active_records.BEL`; assert verdict code `turn_driver_missing_access_route`.
  - **M-3 — `unresolved_mystery_claims` evolution inconsistency**: keep PG-1's `apparent` mystery claim but mutate PG-2's `unresolved_mystery_claims` to omit the M-<id> entry entirely (silent forget), OR mutate PG-2's entry to `status: resolved` when DA-1 only licenses partial narrowing; assert the corresponding Mystery-firewall verdict code (the specific code depends on which validator catches the inconsistency at page-commit time).

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

1. The fixture's parent-PG `unresolved_mystery_claims` evolves coherently from PG-1 (`apparent`) to PG-2 (`narrowed`) per the DA-1 access route's structural license.
2. The fixture's SLT-effects-reveal scope is bounded by DA-1's clue content; no SLT effect reveals state the DA-1 access route does not license.
3. The Mystery Reserve `M-<n>` referenced by the `unresolved_mystery_claims` chain has `status: active` (not `forbidden`); the fixture exclusively exercises the licensed-reveal path.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/integration/spec85-secret-reveal-ledger-clue.test.ts` — new; mirrors `spec76-red-kiln-ambush.test.ts` structure with `secret_reveal`-specific PASS + ≥3 FAIL mutations covering access-route license, mystery-firewall, and `unresolved_mystery_claims` evolution.

### Commands

1. `cd tools/validators && npm run build && node --test dist/tests/integration/spec85-secret-reveal-ledger-clue.test.js` — targeted per-fixture verification.
2. `cd tools/validators && npm test` — full-package verification.
3. The narrower targeted command is the right verification boundary because the test is independent of every other test in the package; the full-suite invocation only adds orthogonal sanity gates.
