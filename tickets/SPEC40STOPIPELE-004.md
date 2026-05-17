# SPEC40STOPIPELE-004: Add deployed-MCP capability-hash spawned-process smoke + MACHINE-FACING-LAYER.md correction

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — introduces new spawned-process integration test at `tools/world-mcp/tests/integration/server-capabilities-hash-parity.test.ts`; corrects misattribution at `docs/MACHINE-FACING-LAYER.md:123` and adds a new release-checklist sub-section. No production-source modification.
**Deps**: None

## Problem

D4 of SPEC-40 + the out-of-report docs-text drift folded in per the spec's §Key design decisions. `tools/world-mcp/tests/server/capability-parity.test.ts:60-74` uses `InMemoryTransport.createLinkedPair()` to wire client and server in the same Node process; the SPEC-37 D3 `validate_patch_plan` known-bad smoke at `tools/world-mcp/tests/server/dispatch.test.ts:1274-1326` is similarly in-memory. The only spawned-process test, `tools/world-mcp/tests/integration/server-stdio.test.ts:10-46`, spawns the actual `dist/src/server.js` but verifies only process lifecycle — it never invokes `describe_capabilities` or `validate_patch_plan` over the stdio boundary. A stale `dist/` bundle (`dist/src/server.js` built against an older validator-source revision) returns its OWN stale hash; the in-memory parity test compares the in-process server's hash to the in-process `computeValidatorRegistryHash()` and trivially matches because both run against the same source. The deployed bundle is never compared to source. Separately, `docs/MACHINE-FACING-LAYER.md:123` describes `dispatch.test.ts` as the "deployed smoke test" — but `dispatch.test.ts` uses `InMemoryTransport`, not a spawned process; the docs-text is wrong and propagates the same misunderstanding the audit identified.

## Assumption Reassessment (2026-05-17)

1. Codebase: `tools/world-mcp/src/build-info.ts` declares `computeValidatorRegistryHash()` (SHA-256 over sorted validator-source content) at lines 96-104 and `computePatchOperationSchemaHash()` (SHA-256 over the sorted patch-op-schema manifest) at lines 106-114; `createBuildInfo()` at lines 116-125 assembles both into the `BuildInfo` object. `tools/world-mcp/src/tools/describe-capabilities.ts:18-32` returns `build_info: { ...args.buildInfo }`. `tools/world-mcp/tests/server/capability-parity.test.ts:60-74` and `dispatch.test.ts:417-431` both use `InMemoryTransport`. `tools/world-mcp/tests/integration/server-stdio.test.ts:10-46` spawns `dist/src/server.js` via `child_process.spawn` but verifies only that the process stays alive — it never sends an MCP request. `docs/MACHINE-FACING-LAYER.md:123` reads `"The deployed smoke test at tools/world-mcp/tests/server/dispatch.test.ts complements these passive fingerprints..."` — verified by grep; the file is wrong because `dispatch.test.ts` is in-memory.
2. Spec: SPEC-40 §D4 names the new spawned-process integration test (extending the `server-stdio.test.ts` spawn pattern) + the MACHINE-FACING-LAYER.md correction + the new release-checklist sub-section. The spec's §Key design decisions explicitly folded the docs drift into D4 to avoid touching the same file twice.
3. Cross-skill boundary: the new test lives at `tools/world-mcp/tests/integration/` (the same directory as `server-stdio.test.ts`); it imports the `@modelcontextprotocol/sdk` `Client` over stdio transport. The shared contract under audit is the parity between source-computed `validator_registry_hash` / `patch_operation_schema_hash` and the values the deployed `dist/src/server.js` process returns via `describe_capabilities`. The test does NOT exercise validator behavior beyond one known-bad `validate_patch_plan` fixture (re-used from `dispatch.test.ts`); the parity assertion is the load-bearing addition.
4. FOUNDATIONS principle: §Tooling Recommendation at `docs/FOUNDATIONS.md:510` (non-negotiable tooling discipline) motivates the deployed-smoke gate — the documented tooling layer is authoritative only insofar as the deployed binary matches the documented source. A stale `dist/` that returns its own hash trivially-matches its own in-memory test but silently diverges from source; the spawned-process smoke is the structural fix for the gap the in-memory tests cannot close. The change adds enforcement; it does NOT introduce new schema fields, new records, or new HARD-GATE surfaces.

## Architecture Check

1. Combining hash parity and known-bad validator-bundle currency into ONE spawned-process test is cleaner than splitting into two tests: each spawned `dist/src/server.js` costs ~250ms of process startup; combining keeps the smoke under a single process lifecycle. The combined test surfaces a real failure mode the in-memory tests cannot — a stale `dist/` returning the same hash as source (impossible by construction) vs returning a stale hash AND stale validators (the actual risk).
2. No backwards-compatibility aliasing or shims — the new test is a pure addition; existing in-memory `capability-parity.test.ts` and `dispatch.test.ts` continue to provide source-level parity coverage. The MACHINE-FACING-LAYER.md correction replaces wrong prose with accurate prose; no doc-format-compatibility surface to preserve.

## Verification Layers

1. Spawned-process hash parity → test run: `cd tools/world-mcp && npm test` passes with the new test; the test spawns `dist/src/server.js` as a child process (verified by inspecting the test's `spawn` call against `path.join(REPO_ROOT, "tools", "world-mcp", "dist", "src", "server.js")`), invokes `describe_capabilities` over stdio, and asserts the returned `build_info.validator_registry_hash` and `build_info.patch_operation_schema_hash` match freshly computed source values.
2. Known-bad validator bundle currency → test run: the same spawned process invokes `validate_patch_plan` with a known-bad causal-dependency-clobbering fixture (re-used from `dispatch.test.ts`); the response's verdict has `severity === "fail"` and the expected code.
3. Docs correction → codebase grep-proof: `grep -nE 'tests/server/dispatch.test.ts' docs/MACHINE-FACING-LAYER.md` no longer shows the line that misattributes it as the "deployed smoke test"; `grep -nE 'server-capabilities-hash-parity' docs/MACHINE-FACING-LAYER.md` returns the new release-checklist sub-section's prose pointing to the spawned-process test.

## What to Change

### 1. New spawned-process integration test

Create `tools/world-mcp/tests/integration/server-capabilities-hash-parity.test.ts` following the structural pattern of `tools/world-mcp/tests/integration/server-stdio.test.ts:10-46`:

- Setup: ensure `dist/` is built (test harness or pre-test hook may shell `npm run build` if not present); create a temp repo root with a seeded minimal world (use existing fixture helpers under `tools/world-mcp/tests/integration/` if available, e.g., from `spec02-verification.test.ts`); spawn `node tools/world-mcp/dist/src/server.js` as a child process via `child_process.spawn` with `stdio: ["pipe", "pipe", "pipe"]`.
- Wire an `@modelcontextprotocol/sdk` `Client` over stdio transport to the spawned process.
- **Hash parity assertion**: invoke `describe_capabilities` over the MCP boundary via `client.callTool({ name: "mcp__worldloom__describe_capabilities", arguments: {} })`. Parse the response's `structuredContent.build_info.validator_registry_hash` and `build_info.patch_operation_schema_hash`. Compare each against fresh source-computed values via `import { computeValidatorRegistryHash, computePatchOperationSchemaHash } from "../../src/build-info.js"`. Assert equality; mismatch indicates `dist/` is stale relative to source.
- **Known-bad fixture rejection**: in the same spawned process, invoke `validate_patch_plan` with a known-bad causal-dependency-clobbering fixture (re-use the same fixture shape from `tests/server/dispatch.test.ts:1274-1326`); assert the response carries a verdict with `severity === "fail"` and the expected code. This verifies the deployed validator bundle is wired correctly.
- Teardown: close client; send `SIGTERM` to the child process; await exit.

### 2. MACHINE-FACING-LAYER.md correction + release-checklist sub-section

At `docs/MACHINE-FACING-LAYER.md`:

- **Correction at the existing prose around line 122-125** (`"The deployed smoke test at tools/world-mcp/tests/server/dispatch.test.ts complements these passive fingerprints by actively exercising validator code paths against known-bad fixtures."`): rewrite to distinguish the in-memory `dispatch.test.ts` smoke (catches source-level validator-bundle drift in-process) from the new spawned-process `server-capabilities-hash-parity.test.ts` smoke (catches deployed `dist/` staleness across the MCP stdio boundary). Both are valuable; the labeling must distinguish them clearly.
- **New release-checklist sub-section** (insert under the existing `describe_capabilities` documentation paragraph): add a `### Pre-deploy capability-currency smoke` sub-section listing the required steps before claiming capability currency on a freshly-built `dist/`:
  1. `cd tools/world-mcp && npm run build`
  2. `cd tools/world-mcp && npm test` (or the equivalent test-selection flag to filter to the new integration test, e.g., `npm test -- --grep server-capabilities-hash-parity` if the test runner supports filter syntax)
  3. Confirm the test passes; mismatch indicates `dist/` is stale and must be rebuilt before the server is restarted in a live MCP session.

## Files to Touch

- `tools/world-mcp/tests/integration/server-capabilities-hash-parity.test.ts` (new)
- `docs/MACHINE-FACING-LAYER.md` (modify) — correct the wrong attribution at ~line 123; add the new release-checklist sub-section under the existing `describe_capabilities` documentation.

## Out of Scope

- No production-source modification (`tools/world-mcp/src/build-info.ts` and `tools/world-mcp/src/tools/describe-capabilities.ts` are unchanged).
- No existing test modification (`tests/server/capability-parity.test.ts` and `tests/server/dispatch.test.ts` continue to provide in-memory coverage unchanged).
- No new validator, no new MCP tool, no new schema.
- No CI extension that automatically runs the spawned-process smoke on every PR (the smoke is a release-checklist item; CI automation is deferred to future hardening).
- No fixture re-organization — the known-bad fixture is re-used in shape (not necessarily by import) from `dispatch.test.ts:1274-1326`.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/world-mcp && npm test` passes with the new spawned-process integration test included.
2. The new test spawns the actual `dist/src/server.js` process (verifiable by inspecting the test's `spawn` invocation pattern matching `server-stdio.test.ts`'s).
3. The hash parity assertion passes when `dist/` is current. Manual regression check: rebuild source without rebuilding `dist/`, re-run the test, observe the hash parity assertion fail with a clear error pointing to the source-vs-deployed-bundle drift.
4. The known-bad fixture rejection assertion confirms the deployed validator bundle rejects the same patch the in-memory `dispatch.test.ts` smoke rejects.
5. `grep -nE 'tests/server/dispatch.test.ts' docs/MACHINE-FACING-LAYER.md` no longer matches the wrong "deployed smoke test" attribution line; `grep -nE 'server-capabilities-hash-parity' docs/MACHINE-FACING-LAYER.md` returns the new release-checklist sub-section's mention.

### Invariants

1. The deployed `dist/src/server.js` returns `build_info.validator_registry_hash` and `build_info.patch_operation_schema_hash` values equal to freshly source-computed values; any drift fails the new smoke test.
2. `docs/MACHINE-FACING-LAYER.md` accurately distinguishes in-memory smoke tests from deployed-process smoke tests; no remaining prose misattributes an in-memory test as a deployed test.
3. The release-checklist sub-section is grep-discoverable for future operators by the literal phrase `Pre-deploy capability-currency smoke`.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/integration/server-capabilities-hash-parity.test.ts` (new) — spawns `dist/src/server.js`, asserts hash parity for both `validator_registry_hash` and `patch_operation_schema_hash`, and exercises one known-bad `validate_patch_plan` fixture against the deployed validator bundle.

### Commands

1. `cd tools/world-mcp && npm test` — runs the full world-mcp test suite including the new spawned-process integration test.
2. `cd tools/world-mcp && npm run build` — produces `dist/src/server.js` (required before the spawned-process test can run).
3. `grep -nE 'server-capabilities-hash-parity|Pre-deploy capability-currency smoke' docs/MACHINE-FACING-LAYER.md` — confirms the corrected prose and the new release-checklist sub-section landed.
