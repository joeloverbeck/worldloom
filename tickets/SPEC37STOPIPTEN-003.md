# SPEC37STOPIPTEN-003: Deployed-MCP validator-currency smoke test

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — extends `tools/world-mcp/tests/server/dispatch.test.ts` with two new smoke tests that boot the compiled `dist/src/server.js` and exercise `validate_patch_plan` through the MCP boundary against known-bad fixtures. Optionally adds a fixture-construction helper module. No production code change; no new MCP tool; no CI config change.
**Deps**: None

## Problem

`tools/world-mcp/tests/server/dispatch.test.ts` at line 948 covers `describe_capabilities` through the MCP boundary, and `tests/integration/server-stdio.test.ts:10-46` covers stdin/stdout liveness — but no existing test invokes `validate_patch_plan` against a known-bad patch plan through the running MCP boundary. The source-level capability-parity test (`tools/world-mcp/tests/server/capability-parity.test.ts`) asserts the validator-registry name list against an expected hardcoded set, but cannot reach validator-execution behavior: a stale validator bundle in `dist/` (for example, a freshly added validator whose source landed in `tools/validators/src/structural/` but whose compiled artifact never reached `tools/world-mcp/dist/`'s validator-bundle dependency) can return a false `pass` verdict while source advertises the fix. The fingerprint extension that ticket SPEC37STOPIPTEN-004 adds is the supporting passive currency indicator; this ticket lands the load-bearing remediation that actually exercises the validator code path through the deployed boundary. Together they close the runtime/deployed parity gap deferred from SPEC-36 §Risks ("Runtime / deployed-MCP parity for D5").

## Assumption Reassessment (2026-05-17)

1. `tools/world-mcp/tests/server/dispatch.test.ts` exists at 1051 lines with the `withServerClient` pattern in active use (24+ existing tests use it; line 948 is the most-recent `describe_capabilities` smoke test landing). The two new smoke tests follow the same pattern verbatim — they boot the compiled `dist/src/server.js` per the integration-test convention and route requests through the MCP client. `MCP_TOOL_NAMES.validate_patch_plan` is already imported and used by existing tests (lines 367, 485) — the constant is in place.
2. `tools/validators/src/structural/causal-dependency-threat-scan.ts` exists; the relevant verdict shape is `{ validator: "causal_dependency_threat_scan", code: "choice_dependency_clobbered", ... }` (two separate fields — `validator` at line 398 and `code` at line 400). SPEC-37 D3 §1 prose shows a combined `code: "causal_dependency_threat_scan.choice_dependency_clobbered"` form; assertions in the new tests must match the actual two-field shape, not the combined-string form. `expected_witness_coverage` verdict codes (`expected_witness_coverage_missing_public_bel`, etc.) are documented at `tools/validators/src/structural/expected-witness-coverage.ts:319-355`.
3. Cross-skill / cross-artifact boundary under audit: the runtime currency contract between source-tree validators (`tools/validators/src/`) and the deployed validator bundle loaded by `tools/world-mcp/dist/src/server.js`. The smoke tests verify the contract by exercising validator code paths through the MCP boundary; if the deployed bundle is stale, the smoke tests fail loudly with a message naming the suspected drift. The contract is not a single-file boundary — it spans the build artifact chain from `tools/validators/dist/` to `tools/world-mcp/dist/`'s import resolution.
4. FOUNDATIONS principle under audit: `docs/FOUNDATIONS.md` §Machine-Facing Layer (line 532) — capability and schema-discovery currency. The patch engine's pre-apply validation is the structural integrity gate; if the deployed validator bundle is silently stale, `validate_patch_plan` returns a false `pass` and the gate fails open. A smoke test that exercises the validator code path through the boundary is the load-bearing currency check; passive fingerprints (SPEC37STOPIPTEN-004) are supporting evidence, not a substitute.

## Architecture Check

1. The smoke-test-first ordering (D3 load-bearing, D4 supporting) is structurally correct, not just a sequencing preference. Fingerprints tell consumers whether something changed but not whether validators actually work; a smoke test that constructs a known-bad fixture and asserts the validator catches it directly proves the validator code path is live. The audit explicitly identified validator-bundle staleness as "especially dangerous after recent validator additions" — direct exercise through the deployed boundary catches the failure class the audit names.
2. Reusing the existing `withServerClient` pattern (rather than authoring a parallel boot harness) keeps the test surface single-source. No new boot infrastructure, no new test framework, no new CI job — the new tests run inside the existing `npm test` invocation that already builds and runs `dist/tests/` artifacts. No backwards-compatibility shims; this is pure additive test coverage.

## Verification Layers

1. Validator bundle currency is exercised through the MCP boundary → the two new tests call `validate_patch_plan` via `withServerClient` and assert the expected verdict codes appear in the response.
2. Verdict shape matches the actual `{ validator, code }` two-field shape → assertions explicitly check `verdict.validator === "causal_dependency_threat_scan" && verdict.code === "choice_dependency_clobbered"` (and analogous for the expected-witness path).
3. Loud-failure semantics on staleness → each test's assertion message names the suspected drift; if the deployed validator returns `pass` on a fixture engineered to fail, the test's assertion failure points the implementer at "the deployed validator bundle is stale relative to source."
4. CI integration is automatic → the new tests live in an existing test file that the existing `npm test` script invokes; `.github/workflows/ci-world-mcp.yml` already runs `npm test` for this package, so no CI config change is required.

## What to Change

### 1. Smoke test 1 — `deployed_mcp_rejects_known_bad_causal_dependency_plan`

Add to `tools/world-mcp/tests/server/dispatch.test.ts` after the existing `describe_capabilities` test (line 948+). Use the `withServerClient` pattern. Construct a minimal patch plan via the public envelope shape:

- One `create_se_record` op for an SE with `payload.se_record.state_delta.close: ["STOBJ-1"]` and other required SE fields satisfied (actor, location, world_logic_rationale, etc.).
- One `create_pg_record` op for a child PG whose `payload.pg_record.snapshot.active_records.CHC` includes `CHC-1`, where the same plan includes `CHC-1` (a `create_chc_record` op) whose `payload.chc_record.grounded_in.records` contains `STOBJ-1` — i.e., a choice grounded in a closed object.
- All other envelope shape requirements satisfied so the envelope passes schema validation and reaches validator delegation.

Invoke `validate_patch_plan` through the MCP client (`client.callTool({ name: MCP_TOOL_NAMES.validate_patch_plan, args: { patch_plan: <plan>, world_slug: <fixture-slug> } })` — match the exact arg shape used by the existing dispatch tests at lines 485+). Parse the response and assert it includes at least one verdict where `verdict.validator === "causal_dependency_threat_scan"` AND `verdict.code === "choice_dependency_clobbered"`. If the response status is `pass` (no failing verdicts), the assertion failure message must name the suspected drift, e.g., `"deployed validator bundle appears stale: expected causal_dependency_threat_scan.choice_dependency_clobbered verdict on choice grounded in closed STOBJ; got pass — run 'cd tools/validators && npm run build' and restart the MCP server/client session"`.

### 2. Smoke test 2 — `deployed_mcp_rejects_known_bad_expected_witness_plan`

Add after smoke test 1. Construct a patch plan:

- One `create_se_record` op for an SE at a non-concealed STLOC with two active co-located STENTs other than the actor (referenced via `state_delta.active_records` or whichever field carries the active-cast snapshot — match the existing fixture conventions in the dispatch tests).
- Do NOT include the BEL records the direct-witness check requires.
- Do NOT include a valid non-propagation tag in `SE.world_logic_rationale`.

Invoke `validate_patch_plan` through the MCP client. Assert the response contains a verdict where `verdict.validator === "expected_witness_coverage"` AND `verdict.code` is one of the existing direct-witness failure codes (e.g., `"expected_witness_coverage_missing_public_bel"`). The v1 test exercises the direct-witness path because it is the longest-standing validator behavior and the best smoke-test signal for "validator bundle current at all." If SPEC37STOPIPTEN-002 lands first, the same smoke-test infrastructure can be extended later with a fixture variant exercising the new `expected_witness_coverage_missing_indirect_propagation` verdict — that extension is out of scope for this ticket.

Loud-failure message convention identical to smoke test 1.

### 3. Fixture-construction helper (optional)

If the inline fixture construction in either smoke test exceeds ~50 lines, factor the two patch-plan fixtures into a helper module at `tools/world-mcp/tests/server/known-bad-plan-fixtures.ts` exporting `buildKnownBadCausalDependencyPlan()` and `buildKnownBadExpectedWitnessPlan()`. Helper-style fixtures keep the test bodies readable and let future smoke-test additions reuse the same fixtures. If the inline form stays under ~50 lines per test, skip the helper — implementer judgment call.

## Files to Touch

- `tools/world-mcp/tests/server/dispatch.test.ts` (modify — add two test cases)
- `tools/world-mcp/tests/server/known-bad-plan-fixtures.ts` (new, optional — only if inline fixtures exceed ~50 lines per test)

## Out of Scope

- New MCP tools, new dispatch surfaces, new patch-engine ops, new validators — this ticket is pure test extension on existing infrastructure.
- CI workflow changes — `.github/workflows/ci-world-mcp.yml` already runs `npm test`; the new tests run inside that invocation automatically.
- A separate `npm run test:smoke` script — only justified if the new tests add >10s wall-clock to CI per the spec's contingency clause; v1 keeps the tests inside the main test suite. If boot time becomes a problem, split-out is a follow-up.
- Smoke-test coverage for the new `expected_witness_coverage_missing_indirect_propagation` verdict — that requires SPEC37STOPIPTEN-002 to land and is a follow-up extension of this same fixture infrastructure.
- Validator-source-content fingerprinting — that is SPEC37STOPIPTEN-004's scope (passive currency indicator).

## Acceptance Criteria

### Tests That Must Pass

1. `deployed_mcp_rejects_known_bad_causal_dependency_plan` passes against current source.
2. `deployed_mcp_rejects_known_bad_expected_witness_plan` passes against current source.
3. If validator-bundle currency drift is artificially induced (e.g., by stubbing `causal_dependency_threat_scan` to always return `[]` and rebuilding only `tools/validators/dist/` without rebuilding `tools/world-mcp/dist/`), both tests fail loudly with the named-drift message.
4. `cd tools/world-mcp && npm run build && npm test` exits 0.
5. The existing `describe_capabilities` test at line 948 and all other dispatch tests remain green.

### Invariants

1. The two smoke tests exercise validator code paths through the running MCP server boundary, not through direct in-process import — that is what makes them load-bearing currency checks.
2. Loud-failure messages name the suspected drift class and the recovery command (`cd tools/validators && npm run build` + session restart), so a failing CI surfaces an actionable signal.
3. The fixtures are known-bad by construction — they exist solely to trigger the named validator codes; any change to the patch envelope schema that makes a fixture pass-by-default is a fixture maintenance signal, not a regression in the validator.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/server/dispatch.test.ts` — two new smoke tests per §What to Change §1 and §2.
2. `tools/world-mcp/tests/server/known-bad-plan-fixtures.ts` — optional helper module per §What to Change §3.

### Commands

1. `cd tools/world-mcp && npm run build && npm test` — full world-mcp package verification including the new smoke tests.
2. Drift-induction sanity check (manual, post-implementation): temporarily stub `causal_dependency_threat_scan.run` to `async () => []` in `tools/validators/src/structural/causal-dependency-threat-scan.ts`, run `cd tools/validators && npm run build` (without rebuilding `tools/world-mcp`), then `cd tools/world-mcp && npm test` — expect smoke test 1 to fail loudly with the suspected-drift message. Revert the stub after verifying.
