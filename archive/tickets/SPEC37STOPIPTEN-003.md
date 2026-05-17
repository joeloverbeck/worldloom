# SPEC37STOPIPTEN-003: Deployed-MCP validator-currency smoke test

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — extends `tools/world-mcp/tests/server/dispatch.test.ts` with two new smoke tests that exercise `validate_patch_plan` through the existing in-memory MCP dispatch boundary against known-bad fixtures. No helper module, production code change, new MCP tool, or CI config change.
**Deps**: None

## Problem

At intake, `tools/world-mcp/tests/server/dispatch.test.ts` covered `describe_capabilities` through the MCP boundary, and `tests/integration/server-stdio.test.ts` covered stdin/stdout liveness, but no existing test invoked `validate_patch_plan` against a known-bad patch plan through the running MCP boundary. The source-level capability-parity test (`tools/world-mcp/tests/server/capability-parity.test.ts`) asserted the validator-registry name list against an expected hardcoded set, but could not reach validator-execution behavior: a stale validator bundle in `dist/` could return a false `pass` verdict while source advertised the fix. The fingerprint extension that ticket SPEC37STOPIPTEN-004 adds is the supporting passive currency indicator; this ticket lands the load-bearing remediation that exercises the validator code path through the deployed boundary. Together they close the runtime/deployed parity gap deferred from SPEC-36 §Risks ("Runtime / deployed-MCP parity for D5").

## Assumption Reassessment (2026-05-17)

1. `tools/world-mcp/tests/server/dispatch.test.ts` had the `withServerClient` pattern in active use, and the two new smoke tests follow that pattern: they run against the built test artifact and route requests through the MCP client/server dispatch boundary. `MCP_TOOL_NAMES.validate_patch_plan` was already imported and used by existing tests.
2. `tools/validators/src/structural/causal-dependency-threat-scan.ts` exposes verdicts as `{ validator: "causal_dependency_threat_scan", code: "choice_dependency_clobbered", ... }` (two separate fields). SPEC-37 D3 §1 prose shows a combined `code: "causal_dependency_threat_scan.choice_dependency_clobbered"` form; assertions in the new tests match the actual two-field shape, not the combined-string form. `expected_witness_coverage` verdict codes (`expected_witness_coverage_missing_public_bel`, etc.) are documented in `tools/validators/src/structural/expected-witness-coverage.ts`.
3. Cross-skill / cross-artifact boundary under audit: the runtime currency contract between source-tree validators (`tools/validators/src/`) and the deployed validator bundle loaded by `tools/world-mcp/dist/src/server.js`. The smoke tests verify the contract by exercising validator code paths through the MCP boundary; if the deployed bundle is stale, the smoke tests fail loudly with a message naming the suspected drift. The contract is not a single-file boundary — it spans the build artifact chain from `tools/validators/dist/` to `tools/world-mcp/dist/`'s import resolution.
4. FOUNDATIONS principle under audit: `docs/FOUNDATIONS.md` §Machine-Facing Layer (line 532) — capability and schema-discovery currency. The patch engine's pre-apply validation is the structural integrity gate; if the deployed validator bundle is silently stale, `validate_patch_plan` returns a false `pass` and the gate fails open. A smoke test that exercises the validator code path through the boundary is the load-bearing currency check; passive fingerprints (SPEC37STOPIPTEN-004) are supporting evidence, not a substitute.
5. Baseline proof correction: before implementation, `cd tools/world-mcp && npm test` rebuilt successfully but the broad package suite was already red in `dist/tests/server/capability-parity.test.js` (`validator registry contains every named validator`) because the runtime registry includes `prose_receipt_schema_compliance` and the hardcoded expected list does not. The focused `node --test dist/tests/server/dispatch.test.js` lane was green. This ticket keeps the owned proof on the dispatch smoke boundary; the stale capability-parity registry expectation is outside D3 and belonged to the capability/fingerprint sibling surface now archived at `archive/tickets/SPEC37STOPIPTEN-004.md`, not to this deployed-validator smoke-test ticket.

## Architecture Check

1. The smoke-test-first ordering (D3 load-bearing, D4 supporting) is structurally correct, not just a sequencing preference. Fingerprints tell consumers whether something changed but not whether validators actually work; a smoke test that constructs a known-bad fixture and asserts the validator catches it directly proves the validator code path is live. The audit explicitly identified validator-bundle staleness as "especially dangerous after recent validator additions" — direct exercise through the deployed boundary catches the failure class the audit names.
2. Reusing the existing `withServerClient` pattern (rather than authoring a parallel boot harness) keeps the test surface single-source. No new boot infrastructure, no new test framework, no new CI job — the new tests run inside the existing `npm test` invocation that already builds and runs `dist/tests/` artifacts. No backwards-compatibility shims; this is pure additive test coverage.

## Verification Layers

1. Validator bundle currency is exercised through the MCP boundary → the two new tests call `validate_patch_plan` via `withServerClient` and assert the expected verdict codes appear in the response.
2. Verdict shape matches the actual `{ validator, code }` two-field shape → assertions explicitly check `verdict.validator === "causal_dependency_threat_scan" && verdict.code === "choice_dependency_clobbered"` (and analogous for the expected-witness path).
3. Loud-failure semantics on staleness → each test's assertion message names the suspected drift; if the deployed validator returns `pass` on a fixture engineered to fail, the test's assertion failure points the implementer at "the deployed validator bundle is stale relative to source."
4. CI integration is automatic once the sibling capability-parity baseline is repaired → the new tests live in an existing test file that the existing `npm test` script invokes. No CI config change is required for this D3 surface.

## Landed Changes

### 1. Smoke test 1 — `deployed_mcp_rejects_known_bad_causal_dependency_plan`

Added to `tools/world-mcp/tests/server/dispatch.test.ts` after the existing `describe_capabilities` test. It uses the existing `withServerClient` pattern and constructs a minimal patch plan via the public envelope shape:

- One `create_se_record` op for an SE with `payload.record.state_delta.close: ["STOBJ-1"]` and other required SE fields satisfied (actor, world_logic_rationale, etc.).
- One `create_pg_record` op for a child PG whose `payload.record.state_snapshot.active_records.CHC` includes `CHC-1`, where the same plan includes `CHC-1` (a `create_chc_record` op) whose `payload.record.grounded_in.records` contains `STOBJ-1` — i.e., a choice grounded in a closed object.
- All other envelope shape requirements satisfied so the envelope passes schema validation and reaches validator delegation.

The test invokes `validate_patch_plan` through the MCP client with `{ patch_plan: <plan> }`, then asserts `status === "fail"` and at least one verdict where `verdict.validator === "causal_dependency_threat_scan"` and `verdict.code === "choice_dependency_clobbered"`. Its assertion messages name the suspected deployed-validator-bundle drift and the rebuild/restart recovery command.

### 2. Smoke test 2 — `deployed_mcp_rejects_known_bad_expected_witness_plan`

Added after smoke test 1. It constructs a patch plan:

- One `create_se_record` op for an SE at a non-concealed STLOC with one active co-located STENT other than the actor. The active cast is carried by the parent `PG-1` page's `state_snapshot.active_records.STSTAT`.
- Do NOT include the BEL records the direct-witness check requires.
- Do NOT include a valid non-propagation tag in `SE.world_logic_rationale`.

The test invokes `validate_patch_plan` through the MCP client, then asserts `status === "fail"` and a verdict where `verdict.validator === "expected_witness_coverage"` and `verdict.code === "expected_witness_coverage_missing_public_bel"`. The v1 test exercises the direct-witness path because it is the longest-standing validator behavior and the best smoke-test signal for "validator bundle current at all." `archive/tickets/SPEC37STOPIPTEN-002.md` has now landed the `expected_witness_coverage_missing_indirect_propagation` verdict; a fixture variant exercising that new verdict can extend the same smoke-test infrastructure later, but remains out of scope for this ticket.

Loud-failure message convention identical to smoke test 1.

### 3. Fixture-construction helper

No helper module was added. The patch-plan builders live in `dispatch.test.ts` beside the dispatch tests, keeping the test ownership in one file.

## Files to Touch

- `tools/world-mcp/tests/server/dispatch.test.ts` (modify — add two test cases)

## Out of Scope

- New MCP tools, new dispatch surfaces, new patch-engine ops, new validators — this ticket is pure test extension on existing infrastructure.
- CI workflow changes — `.github/workflows/ci-world-mcp.yml` already runs `npm test`; the new tests run inside that invocation automatically.
- A separate `npm run test:smoke` script — only justified if the new tests add >10s wall-clock to CI per the spec's contingency clause; v1 keeps the tests inside the main test suite. If boot time becomes a problem, split-out is a follow-up.
- Smoke-test coverage for the new `expected_witness_coverage_missing_indirect_propagation` verdict landed by `archive/tickets/SPEC37STOPIPTEN-002.md` — this is a follow-up extension of the same fixture infrastructure, not part of this v1 smoke-test ticket.
- Validator-source-content fingerprinting — that is SPEC37STOPIPTEN-004's scope (passive currency indicator).

## Acceptance Criteria

### Tests That Must Pass

1. `deployed_mcp_rejects_known_bad_causal_dependency_plan` passes against current source.
2. `deployed_mcp_rejects_known_bad_expected_witness_plan` passes against current source.
3. The two assertions include loud-failure messages that name validator-bundle drift and the rebuild/restart recovery command.
4. `cd tools/world-mcp && npm run build && node --test dist/tests/server/dispatch.test.js` exits 0, proving the owned deployed-boundary smoke tests plus the existing dispatch coverage. The broader `npm test` lane should be rerun and recorded, but any pre-existing `capability-parity.test.js` validator-registry-list failure remains outside this ticket's acceptance boundary unless the active sibling ticket absorbs it.
5. The existing `describe_capabilities` test and all other dispatch tests remain green.

### Invariants

1. The two smoke tests exercise validator code paths through the running MCP server boundary, not through direct in-process import — that is what makes them load-bearing currency checks.
2. Loud-failure messages name the suspected drift class and the recovery command (`cd tools/validators && npm run build` + session restart), so a failing CI surfaces an actionable signal.
3. The fixtures are known-bad by construction — they exist solely to trigger the named validator codes; any change to the patch envelope schema that makes a fixture pass-by-default is a fixture maintenance signal, not a regression in the validator.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/server/dispatch.test.ts` — two new smoke tests per §Landed Changes §1 and §2.
2. No helper module was added; fixture builders are inline in `dispatch.test.ts`.

### Commands

1. `cd tools/world-mcp && npm run build && node --test dist/tests/server/dispatch.test.js` — focused world-mcp dispatch verification including the new smoke tests.
2. `cd tools/world-mcp && npm test` — broad package regression sweep; if it remains red only at the pre-existing `capability-parity.test.js` validator-registry expectation, record that as sibling-surface baseline noise rather than D3 failure.
3. Drift-induction sanity check (manual, post-implementation): temporarily stub `causal_dependency_threat_scan.run` to `async () => []` in `tools/validators/src/structural/causal-dependency-threat-scan.ts`, run `cd tools/validators && npm run build` (without rebuilding `tools/world-mcp`), then `cd tools/world-mcp && node --test dist/tests/server/dispatch.test.js` — expect smoke test 1 to fail loudly with the suspected-drift message. Revert the stub after verifying.

## Outcome

Completed: 2026-05-17

`tools/world-mcp/tests/server/dispatch.test.ts` now has two validator-currency smoke tests through the MCP dispatch boundary:

1. `deployed_mcp_rejects_known_bad_causal_dependency_plan` builds a known-bad story patch plan where a choice remains active while grounded in a closed `STOBJ`, then asserts the deployed validator path emits `causal_dependency_threat_scan` / `choice_dependency_clobbered`.
2. `deployed_mcp_rejects_known_bad_expected_witness_plan` builds a known-bad public event with a co-located witness and no BEL witness coverage, then asserts the deployed validator path emits `expected_witness_coverage` / `expected_witness_coverage_missing_public_bel`.

Both tests use the existing `withServerClient` in-memory MCP dispatch harness. No production code, helper module, MCP registration, or CI workflow changed. `specs/SPEC-37-story-pipeline-tenth-iteration-fixes.md` now records the D3 implementation note and the remaining D4/capability-parity boundary.

## Verification Result

1. `cd tools/world-mcp && npm run build` — passed; TypeScript compiled and refreshed `tools/world-mcp/dist/`.
2. `cd tools/world-mcp && node --test dist/tests/server/dispatch.test.js` — passed; 32 dispatch tests passed, including `deployed_mcp_rejects_known_bad_causal_dependency_plan` and `deployed_mcp_rejects_known_bad_expected_witness_plan`.
3. `cd tools/world-mcp && npm test` — rebuilt successfully but exited 1; the suite reported 377 passing and 1 failing test after the new dispatch tests. The remaining failure is the pre-existing `dist/tests/server/capability-parity.test.js` subtest `validator registry contains every named validator`, where actual includes `prose_receipt_schema_compliance` and the hardcoded expected list does not.
4. `cd tools/world-mcp && node --test dist/tests/server/capability-parity.test.js` — diagnostic rerun confirmed the same isolated pre-existing failure: `validator registry contains every named validator` expects 32 validators but actual exposes 33 with `prose_receipt_schema_compliance`.

## Deviations

- The broad package suite was red before implementation on the stale capability-parity validator registry expectation. This ticket did not edit `tools/world-mcp/tests/server/capability-parity.test.ts`; that surface belonged to the capability/fingerprint sibling now archived at `archive/tickets/SPEC37STOPIPTEN-004.md`.
- The optional `known-bad-plan-fixtures.ts` helper was not created. Inline fixture builders in `dispatch.test.ts` were sufficient and keep the current smoke-test ownership local.
- The manual drift-induction sanity check was not run because it requires intentionally stubbing validator source and rebuilding only part of the dependency chain. The accepted proof is the compiled dispatch smoke lane plus the broad-suite diagnostic classification above.
