# SPEC36STOPIPNIN-003: Add MCP capability parity tests

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `tools/world-mcp/tests/server/capability-parity.test.ts` (new), `tools/world-mcp/src/server.ts` (capability ordering), `tools/world-mcp/tests/tools/get-record-schema.test.ts` (schema-discovery proof expectation), `specs/SPEC-36-story-pipeline-ninth-iteration-fixes.md` (D5 implementation note)
**Deps**: `specs/SPEC-36-story-pipeline-ninth-iteration-fixes.md`, `archive/tickets/SPEC36STOPIPNIN-005.md`, `archive/tickets/SPEC36STOPIPNIN-006.md`

## Problem

At intake, `tools/world-mcp/tests/server/list-tools.test.ts` verified `client.listTools()` matched `getRegisteredToolNames()` (and thus `MCP_TOOL_ORDER`) but did not verify that (a) `describe_capabilities` output included every registered tool in order, (b) `describe_envelope_schema` covered every operation kind in `OPERATION_KINDS`, or (c) the validator registry exposed the expected named validators. A fix could land in TypeScript source while one of these capability surfaces drifted silently. The ninth-iteration audit (`reports/story-related-improvements-ninth-iteration.md` §WL-N9-P2-005 / Amendment E) flagged this gap; SPEC-36 §D5 closes it at the source level (runtime / deployed-server parity stays out-of-scope as a tenth-iteration carry-over).

## Assumption Reassessment (2026-05-16)

1. `tools/world-mcp/tests/server/` exists with `dispatch.test.ts` + `list-tools.test.ts` — verified by directory listing. `MCP_TOOL_ORDER` lives at `tools/world-mcp/src/tool-names.ts:29-52` (22 tool entries); `OPERATION_KINDS` lives at `tools/patch-engine/src/envelope/schema.ts:58-92` (33 op kinds); both confirmed by parallel-Explore-agent quotes during the SPEC-36 brainstorm session. `structuralValidators` and `ruleValidators` are exported from `tools/validators/src/public/registry.ts` (20 + 10 validators respectively, including the SPEC-36 D1/D2 additions once they land).
2. `specs/SPEC-36-story-pipeline-ninth-iteration-fixes.md` §D5 specifies three test cases. The auditor's Amendment E originally included a "build metadata recency" sub-item; the spec drops that as not operationalizable in CI ("recent enough" cannot be defined). Runtime/deployed parity is deferred to a tenth-iteration carry-over per SPEC-36 §Risks & Open Questions.
3. Cross-artifact boundary under audit: the source-of-truth lists (`MCP_TOOL_ORDER`, `OPERATION_KINDS`, the validator registry exports) are the canonical definitions; the exposed MCP APIs (`describe_capabilities`, `describe_envelope_schema`) and the registry must remain in lockstep with their source-of-truth lists. The parity test is the mechanical proof that the contract holds.
4. FOUNDATIONS principle: §Machine-Facing Layer (capability and schema-discovery currency) — source-level parity is a prerequisite for any runtime parity check. Internal drift between the source-of-truth lists and the exposed APIs is the failure mode this test prevents.
5. 2026-05-16 queue reassessment: `causal_dependency_threat_scan` is now registered by `archive/tickets/SPEC36STOPIPNIN-005.md`, and `expected_witness_coverage` is now registered by `archive/tickets/SPEC36STOPIPNIN-006.md`. This ticket is now independently landable against both completed validator prerequisites.
6. 2026-05-17 implementation reassessment: pre-edit `cd tools/world-mcp && npm test` is red only on `getRecordSchema returns story-bundle schemas from validator sources`, where the test still expects `^SLT-[0-9]+$` while the live validator schema now exposes SPEC-36 D3's unpadded pattern `^SLT-(0|[1-9][0-9]*)$`. Because this ticket's acceptance includes a green `tools/world-mcp` suite after SPEC-36 D3/D5/D6 land, updating that expected pattern is same-family proof-surface truthing for this ticket's broad gate.
7. 2026-05-17 implementation reassessment: `describe_envelope_schema` does not expose every operation as `payload.properties.record.$ref`; world-canon and hybrid operations use operation-specific payload keys such as `cf_record`, while update/repair/append operations expose structured payload schemas without record refs. The parity test therefore proves every `OPERATION_KINDS` entry returns one inline `op_schemas[kind]` object with the expected operation const and structured `payload` schema, instead of asserting a uniform `record.$ref` path that the live API intentionally does not have.
8. 2026-05-17 focused proof reassessment: the new `describe_capabilities` parity test initially failed because `describe_capabilities` emitted `describe_envelope_schema` before `describe_capabilities`, while `MCP_TOOL_ORDER` lists `describe_capabilities` before `describe_envelope_schema`. This is the exact source-level drift D5 is meant to catch, so `tools/world-mcp/src/server.ts` is now in scope for ordering the described capability list by `MCP_TOOL_ORDER`.

## Architecture Check

1. New test file extending the existing `list-tools.test.ts` pattern is the minimum change adding the three parity checks. Alternative — extending `list-tools.test.ts` itself with additional cases — was considered but rejected: the capability-parity surface is logically distinct (describe_capabilities + describe_envelope_schema + validator registry vs. listTools), and a dedicated file groups related parity assertions for future extension. Worked precedent for splitting test concerns across files in the same directory: `tools/validators/tests/structural/record-schema-compliance-bel.test.ts` + `record-schema-compliance-story-event.test.ts` etc. — per-concern file granularity is the established pattern.
2. No backwards-compatibility aliasing/shims introduced; the new test file imports source-of-truth lists and exposed APIs and asserts equality with hardcoded expected sets (drift forces a deliberate test update, which IS the design intent).

## Verification Layers

1. `describe_capabilities` output includes every name in `MCP_TOOL_ORDER` → unit test: set equality between the `tools[].name` array and `MCP_TOOL_ORDER` (order-sensitive per the existing `MCP_TOOL_ORDER` contract).
2. `describe_envelope_schema` covers every kind in `OPERATION_KINDS` → unit test: for each kind in `OPERATION_KINDS`, calling `describe_envelope_schema` returns one inline schema entry with the matching operation const and a structured payload schema.
3. Validator registry exposes every named validator → unit test: import `structuralValidators` and `ruleValidators` from `tools/validators/src/public/registry.ts`, extract the `name` field set, assert equality with a hardcoded expected set that includes the SPEC-36 D1/D2 additions (`causal_dependency_threat_scan`, `expected_witness_coverage`).
4. Cross-artifact ticket — three distinct invariants mapped to three distinct test cases; no collapsing into one generic "parity" assertion.

## Landed Changes

### 1. Created `tools/world-mcp/tests/server/capability-parity.test.ts`

Three test cases now follow the `list-tools.test.ts` pattern (Node.js built-in `test` runner, assertion via `node:assert/strict`):

- **`describe_capabilities_lists_every_registered_tool`** — calls `describe_capabilities` through an in-memory MCP client/server and asserts that the returned `tools[].name` array equals `MCP_TOOL_ORDER` exactly.
- **`describe_envelope_schema_covers_every_operation_kind`** — for each `kind` in `OPERATION_KINDS` (imported from `tools/patch-engine/src/envelope/schema.ts`), call the `describe_envelope_schema` builder and assert: (a) the response is inline and non-error; (b) exactly that operation schema is returned; (c) the schema's `op` const matches the kind; and (d) the schema exposes a structured `payload` object. Fail loudly if any kind is absent or returns a persisted/error summary for the single-kind request.
- **`validator_registry_contains_every_named_validator`** — loads the built validators registry that the `@worldloom/validators` package resolves at runtime, extracts `structuralValidators` and `ruleValidators`, and asserts equality with a hardcoded expected set literal containing every validator name this iteration knows about, including `causal_dependency_threat_scan` and `expected_witness_coverage`. The hardcoded list is the source of audit-trail intent: future additions force a deliberate update to this test.

### 2. Ordered `describe_capabilities` output by `MCP_TOOL_ORDER`

`tools/world-mcp/src/server.ts` now orders the capability list returned by `describe_capabilities` by `MCP_TOOL_ORDER`, including the two self-description tools.

### 3. Updated stale same-family proof expectation

`tools/world-mcp/tests/tools/get-record-schema.test.ts` now expects the live SPEC-36 D3 schema contract (`^SLT-(0|[1-9][0-9]*)$`) so the broad `tools/world-mcp` suite tests current validator-derived schema discovery.

### 4. Unrelated production code unchanged

`tools/world-mcp/src/tools/*.ts` and `tools/validators/src/public/registry.ts` are unchanged by this ticket. The new parity test consumes existing exports; `tools/world-mcp/src/server.ts` changes only to order the already-built capability list by the existing source-of-truth list.

## Files to Touch

- `tools/world-mcp/tests/server/capability-parity.test.ts` (new)
- `tools/world-mcp/src/server.ts` (modify capability ordering)
- `tools/world-mcp/tests/tools/get-record-schema.test.ts` (modify same-family proof expectation)
- `specs/SPEC-36-story-pipeline-ninth-iteration-fixes.md` (D5 implementation note)

## Out of Scope

- Runtime / deployed-MCP capability parity verification. The auditor's §14 carry-over remains a tenth-iteration item per SPEC-36 §Risks & Open Questions; source-level tests cannot catch "deployed MCP server stale relative to rebuilt source".
- "Build metadata recency" check (mentioned in the auditor's Amendment E and explicitly dropped by SPEC-36 §D5 — vague, not operationalizable in CI).
- Generated `dist/` freshness check vs. TypeScript source. Routed to tenth-iteration carry-over.
- Production-code changes to MCP tool implementations or the validator registry.

## Acceptance Criteria

### Tests That Must Pass

1. All three new test cases in `tools/world-mcp/tests/server/capability-parity.test.ts` pass under `npm run build && npm test` in `tools/world-mcp/`.
2. The hardcoded validator-name list in `validator_registry_contains_every_named_validator` includes `causal_dependency_threat_scan` and `expected_witness_coverage`; both are now registered by the archived prerequisite tickets, so this parity test can land as a current positive assertion.
3. Full `npm test` in `tools/world-mcp/` and `tools/validators/` is green after this ticket + 005 + 006 land.

### Invariants

1. `describe_capabilities` output and `MCP_TOOL_ORDER` are in lockstep; any new tool added to one without the other fails this test.
2. `describe_envelope_schema` covers every operation kind in `OPERATION_KINDS`; any new op kind added without a structured `describe_envelope_schema` mapping fails this test.
3. The validator registry's exported names match the hardcoded expected set in this test; any registry addition / removal without the test update fails this test (and that is the desired audit-trail behavior).

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/server/capability-parity.test.ts` — new test file housing the three parity assertions; rationale per the change list above.
2. `tools/world-mcp/tests/tools/get-record-schema.test.ts` — same-family proof-surface truthing for the SPEC-36 D3 unpadded storylet id schema exposed through `get_record_schema`.
3. `specs/SPEC-36-story-pipeline-ninth-iteration-fixes.md` — D5 implementation note keeps the active originating spec aligned with the landed ticket.

### Commands

1. `cd tools/world-mcp && npm run build && node --test dist/tests/server/capability-parity.test.js` — targeted run.
2. `cd tools/world-mcp && npm test` — full suite.
3. `cd tools/validators && npm test` — confirms registry exports compile and run cleanly (parity test depends on registry exports being valid).

## Outcome

Completed 2026-05-17.

- Added `tools/world-mcp/tests/server/capability-parity.test.ts` with three source-level parity checks for `describe_capabilities`, `describe_envelope_schema`, and the validators registry.
- Updated `tools/world-mcp/src/server.ts` so `describe_capabilities` returns its capability list in `MCP_TOOL_ORDER`.
- Updated `tools/world-mcp/tests/tools/get-record-schema.test.ts` to expect the SPEC-36 D3 unpadded SLT id regex surfaced through validator-backed schema discovery.
- Added a D5 implementation note to `specs/SPEC-36-story-pipeline-ninth-iteration-fixes.md`.

## Verification Result

- `cd tools/validators && npm test` — passed after rebuilding validators; 323 tests passed.
- `cd tools/world-mcp && npm run build && node --test dist/tests/server/capability-parity.test.js` — passed; 3 tests passed.
- `cd tools/world-mcp && npm test` — passed; 376 tests passed.

## Deviations

- The drafted `describe_envelope_schema` assertion expected a uniform `payload.properties.record.$ref` path. The live API intentionally uses operation-specific payload shapes, so the landed parity test asserts one inline schema per `OPERATION_KINDS` entry with the matching operation const and structured payload schema.
- The drafted ticket expected no production-code edits. The new parity test exposed a same-seam ordering drift in `describe_capabilities`, so `tools/world-mcp/src/server.ts` was patched to order the returned capability list by `MCP_TOOL_ORDER`.
- Pre-edit `cd tools/world-mcp && npm test` was red only on stale SPEC-36 D3 regex expectation in `get-record-schema.test.ts`; that same-family proof-surface drift was corrected before the final broad suite rerun.
