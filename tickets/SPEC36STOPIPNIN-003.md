# SPEC36STOPIPNIN-003: Add MCP capability parity tests

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `tools/world-mcp/tests/server/capability-parity.test.ts` (new test file in existing tests/server/ directory)
**Deps**: `specs/SPEC-36-story-pipeline-ninth-iteration-fixes.md`, `tickets/SPEC36STOPIPNIN-005.md`, `tickets/SPEC36STOPIPNIN-006.md`

## Problem

`tools/world-mcp/tests/server/list-tools.test.ts` verifies `client.listTools()` matches `getRegisteredToolNames()` (and thus `MCP_TOOL_ORDER`). It does NOT verify that (a) `describe_capabilities` output includes every registered tool, (b) `describe_envelope_schema` covers every operation kind in `OPERATION_KINDS`, or (c) the validator registry exposes the expected named validators. A fix can land in TypeScript source while one of these capability surfaces drifts silently. The ninth-iteration audit (`reports/story-related-improvements-ninth-iteration.md` §WL-N9-P2-005 / Amendment E) flags this gap; SPEC-36 §D5 closes it at the source level (runtime / deployed-server parity stays out-of-scope as a tenth-iteration carry-over).

## Assumption Reassessment (2026-05-16)

1. `tools/world-mcp/tests/server/` exists with `dispatch.test.ts` + `list-tools.test.ts` — verified by directory listing. `MCP_TOOL_ORDER` lives at `tools/world-mcp/src/tool-names.ts:29-52` (22 tool entries); `OPERATION_KINDS` lives at `tools/patch-engine/src/envelope/schema.ts:58-92` (33 op kinds); both confirmed by parallel-Explore-agent quotes during the SPEC-36 brainstorm session. `structuralValidators` and `ruleValidators` are exported from `tools/validators/src/public/registry.ts` (20 + 10 validators respectively, including the SPEC-36 D1/D2 additions once they land).
2. `specs/SPEC-36-story-pipeline-ninth-iteration-fixes.md` §D5 specifies three test cases. The auditor's Amendment E originally included a "build metadata recency" sub-item; the spec drops that as not operationalizable in CI ("recent enough" cannot be defined). Runtime/deployed parity is deferred to a tenth-iteration carry-over per SPEC-36 §Risks & Open Questions.
3. Cross-artifact boundary under audit: the source-of-truth lists (`MCP_TOOL_ORDER`, `OPERATION_KINDS`, the validator registry exports) are the canonical definitions; the exposed MCP APIs (`describe_capabilities`, `describe_envelope_schema`) and the registry must remain in lockstep with their source-of-truth lists. The parity test is the mechanical proof that the contract holds.
4. FOUNDATIONS principle: §Machine-Facing Layer (capability and schema-discovery currency) — source-level parity is a prerequisite for any runtime parity check. Internal drift between the source-of-truth lists and the exposed APIs is the failure mode this test prevents.
5. 2026-05-16 queue reassessment: live `tools/validators/src/public/registry.ts` does not yet register `causal_dependency_threat_scan` or `expected_witness_coverage`; `rg -n "causal_dependency_threat_scan|expected_witness_coverage" tools/validators/src/public/registry.ts tools/validators/src/structural tools/validators/tests/structural/registry.test.ts` returned no matches for either validator. Because this ticket's registry parity test must hardcode both SPEC-36 additions, the ticket is not independently landable before `tickets/SPEC36STOPIPNIN-005.md` and `tickets/SPEC36STOPIPNIN-006.md` complete. The harness retargeted the queue to process those validator tickets first, then return here.

## Architecture Check

1. New test file extending the existing `list-tools.test.ts` pattern is the minimum change adding the three parity checks. Alternative — extending `list-tools.test.ts` itself with additional cases — was considered but rejected: the capability-parity surface is logically distinct (describe_capabilities + describe_envelope_schema + validator registry vs. listTools), and a dedicated file groups related parity assertions for future extension. Worked precedent for splitting test concerns across files in the same directory: `tools/validators/tests/structural/record-schema-compliance-bel.test.ts` + `record-schema-compliance-story-event.test.ts` etc. — per-concern file granularity is the established pattern.
2. No backwards-compatibility aliasing/shims introduced; the new test file imports source-of-truth lists and exposed APIs and asserts equality with hardcoded expected sets (drift forces a deliberate test update, which IS the design intent).

## Verification Layers

1. `describe_capabilities` output includes every name in `MCP_TOOL_ORDER` → unit test: set equality between the `tools[].name` array and `MCP_TOOL_ORDER` (order-sensitive per the existing `MCP_TOOL_ORDER` contract).
2. `describe_envelope_schema` covers every kind in `OPERATION_KINDS` → unit test: for each kind in `OPERATION_KINDS`, calling `describe_envelope_schema` returns a non-error result with `properties.record.$ref` present.
3. Validator registry exposes every named validator → unit test: import `structuralValidators` and `ruleValidators` from `tools/validators/src/public/registry.ts`, extract the `name` field set, assert equality with a hardcoded expected set that includes the SPEC-36 D1/D2 additions (`causal_dependency_threat_scan`, `expected_witness_coverage`).
4. Cross-artifact ticket — three distinct invariants mapped to three distinct test cases; no collapsing into one generic "parity" assertion.

## What to Change

### 1. Create `tools/world-mcp/tests/server/capability-parity.test.ts`

Three test cases following the `list-tools.test.ts` pattern (Node.js built-in `test` runner, assertion via `node:assert/strict`):

- **`describe_capabilities_lists_every_registered_tool`** — instantiate the source-level `describe_capabilities` builder (per `tools/world-mcp/src/tools/describe-capabilities.ts`). Assert that the `tools[].name` set equals `MCP_TOOL_ORDER` exactly (order-sensitive per its existing contract). Use `assert.deepEqual` on the array of tool names.
- **`describe_envelope_schema_covers_every_operation_kind`** — for each `kind` in `OPERATION_KINDS` (imported from `tools/patch-engine/src/envelope/schema.ts`), call the `describe_envelope_schema` builder and assert: (a) the response is non-error; (b) `result.properties.record.$ref` is a non-empty string. Fail loudly if any kind returns `not_supported` or analogous.
- **`validator_registry_contains_every_named_validator`** — import `structuralValidators` and `ruleValidators` from `tools/validators/src/public/registry.ts`. Build a Set of `validator.name` values. Assert equality with a hardcoded expected set literal (a string array containing every validator name this iteration knows about, including `causal_dependency_threat_scan` and `expected_witness_coverage`). The hardcoded list is the source of audit-trail intent: future additions force a deliberate update to this test.

### 2. Do NOT modify production code

`tools/world-mcp/src/server.ts`, `tools/world-mcp/src/tools/*.ts`, and `tools/validators/src/public/registry.ts` are unchanged by this ticket. The test consumes existing exports.

## Files to Touch

- `tools/world-mcp/tests/server/capability-parity.test.ts` (new)

## Out of Scope

- Runtime / deployed-MCP capability parity verification. The auditor's §14 carry-over remains a tenth-iteration item per SPEC-36 §Risks & Open Questions; source-level tests cannot catch "deployed MCP server stale relative to rebuilt source".
- "Build metadata recency" check (mentioned in the auditor's Amendment E and explicitly dropped by SPEC-36 §D5 — vague, not operationalizable in CI).
- Generated `dist/` freshness check vs. TypeScript source. Routed to tenth-iteration carry-over.
- Production-code changes to MCP tool implementations or the validator registry.

## Acceptance Criteria

### Tests That Must Pass

1. All three new test cases in `tools/world-mcp/tests/server/capability-parity.test.ts` pass under `npm run build && npm test` in `tools/world-mcp/`.
2. The hardcoded validator-name list in `validator_registry_contains_every_named_validator` includes `causal_dependency_threat_scan` and `expected_witness_coverage` — the test will FAIL until SPEC36STOPIPNIN-005 and SPEC36STOPIPNIN-006 land their validators in the registry (this is the intended cross-ticket coupling; the test asserts that D1 and D2 actually registered their validators).
3. Full `npm test` in `tools/world-mcp/` and `tools/validators/` is green after this ticket + 005 + 006 land.

### Invariants

1. `describe_capabilities` output and `MCP_TOOL_ORDER` are in lockstep; any new tool added to one without the other fails this test.
2. `describe_envelope_schema` covers every operation kind in `OPERATION_KINDS`; any new op kind added without a `describe_envelope_schema` mapping fails this test.
3. The validator registry's exported names match the hardcoded expected set in this test; any registry addition / removal without the test update fails this test (and that is the desired audit-trail behavior).

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/server/capability-parity.test.ts` — new test file housing the three parity assertions; rationale per the change list above.

### Commands

1. `cd tools/world-mcp && npm run build && node --test dist/tests/server/capability-parity.test.js` — targeted run.
2. `cd tools/world-mcp && npm test` — full suite.
3. `cd tools/validators && npm test` — confirms registry exports compile and run cleanly (parity test depends on registry exports being valid).
