# SPEC40STOPIPELE-004: Add deployed-MCP capability-hash spawned-process smoke + MACHINE-FACING-LAYER.md correction

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — introduces new spawned-process integration test at `tools/world-mcp/tests/integration/server-capabilities-hash-parity.test.ts`; corrects misattribution at `docs/MACHINE-FACING-LAYER.md:123` and adds a new release-checklist sub-section. No production-source modification.
**Deps**: None

## Problem

At intake, D4 of SPEC-40 + the out-of-report docs-text drift folded in per the spec's §Key design decisions found that `tools/world-mcp/tests/server/capability-parity.test.ts:60-74` used `InMemoryTransport.createLinkedPair()` to wire client and server in the same Node process; the SPEC-37 D3 `validate_patch_plan` known-bad smoke at `tools/world-mcp/tests/server/dispatch.test.ts:1274-1326` was similarly in-memory. The only spawned-process test, `tools/world-mcp/tests/integration/server-stdio.test.ts:10-46`, spawned the actual `dist/src/server.js` but verified only process lifecycle — it never invoked `describe_capabilities` or `validate_patch_plan` over the stdio boundary. A stale `dist/` bundle (`dist/src/server.js` built against an older validator-source revision) could return its own stale hash; the in-memory parity test compared the in-process server's hash to the in-process `computeValidatorRegistryHash()` and trivially matched because both ran against the same source. Separately, `docs/MACHINE-FACING-LAYER.md:123` described `dispatch.test.ts` as the "deployed smoke test" — but `dispatch.test.ts` uses `InMemoryTransport`, not a spawned process; the docs-text was wrong and propagated the same misunderstanding the audit identified.

## Assumption Reassessment (2026-05-17)

1. Codebase: `tools/world-mcp/src/build-info.ts` declares `computeValidatorRegistryHash()` (SHA-256 over sorted validator-source content) at lines 96-104 and `computePatchOperationSchemaHash()` (SHA-256 over the sorted patch-op-schema manifest) at lines 106-114; `createBuildInfo()` at lines 116-125 assembles both into the `BuildInfo` object. `tools/world-mcp/src/tools/describe-capabilities.ts:18-32` returns `build_info: { ...args.buildInfo }`. `tools/world-mcp/tests/server/capability-parity.test.ts:60-74` and `dispatch.test.ts:417-431` both use `InMemoryTransport`. `tools/world-mcp/tests/integration/server-stdio.test.ts:10-46` spawns `dist/src/server.js` via `child_process.spawn` but verifies only that the process stays alive — it never sends an MCP request. `docs/MACHINE-FACING-LAYER.md:123` reads `"The deployed smoke test at tools/world-mcp/tests/server/dispatch.test.ts complements these passive fingerprints..."` — verified by grep; the file is wrong because `dispatch.test.ts` is in-memory.
2. Spec: SPEC-40 §D4 names the new spawned-process integration test (extending the `server-stdio.test.ts` spawn pattern) + the MACHINE-FACING-LAYER.md correction + the new release-checklist sub-section. The spec's §Key design decisions explicitly folded the docs drift into D4 to avoid touching the same file twice.
3. Cross-skill boundary: the new test lives at `tools/world-mcp/tests/integration/` (the same directory as `server-stdio.test.ts`); it imports the `@modelcontextprotocol/sdk` `Client` over stdio transport. The shared contract under audit is the parity between source-computed `validator_registry_hash` / `patch_operation_schema_hash` and the values the deployed `dist/src/server.js` process returns via `describe_capabilities`. The test does NOT exercise validator behavior beyond one known-bad `validate_patch_plan` fixture (re-used from `dispatch.test.ts`); the parity assertion is the load-bearing addition.
4. FOUNDATIONS principle: §Tooling Recommendation at `docs/FOUNDATIONS.md:510` (non-negotiable tooling discipline) motivates the deployed-smoke gate — the documented tooling layer is authoritative only insofar as the deployed binary matches the documented source. A stale `dist/` that returns its own hash trivially-matches its own in-memory test but silently diverges from source; the spawned-process smoke is the structural fix for the gap the in-memory tests cannot close. The change adds enforcement; it does NOT introduce new schema fields, new records, or new HARD-GATE surfaces.

## Architecture Check

1. Combining hash parity and known-bad validator-bundle currency into ONE spawned-process test is cleaner than splitting into two tests: each spawned `dist/src/server.js` costs ~250ms of process startup; combining keeps the smoke under a single process lifecycle. The combined test surfaces a real failure mode the in-memory tests cannot — a stale `dist/` returning the same hash as source (impossible by construction) vs returning a stale hash AND stale validators (the actual risk).
2. No backwards-compatibility aliasing or shims — the new test is a pure addition; existing in-memory `capability-parity.test.ts` and `dispatch.test.ts` continue to provide source-level parity coverage. The MACHINE-FACING-LAYER.md correction replaces wrong prose with accurate prose; no doc-format-compatibility surface to preserve.

## Verification Layers

1. Spawned-process hash parity → test run: `cd tools/world-mcp && npm test` passes with the new test; the test spawns `dist/src/server.js` as a child process through `StdioClientTransport` with `SERVER_ENTRYPOINT = path.join(REPO_ROOT, "tools", "world-mcp", "dist", "src", "server.js")`, invokes `describe_capabilities` over stdio, and asserts the returned `build_info.validator_registry_hash` and `build_info.patch_operation_schema_hash` match freshly computed expectations.
2. Known-bad validator bundle currency → test run: the same spawned process invokes `validate_patch_plan` with a known-bad causal-dependency-clobbering fixture (re-used from `dispatch.test.ts`); the response's verdict has `severity === "fail"` and the expected code.
3. Docs correction → codebase grep-proof: `grep -nE 'tests/server/dispatch.test.ts' docs/MACHINE-FACING-LAYER.md` no longer shows the line that misattributes it as the "deployed smoke test"; `grep -nE 'server-capabilities-hash-parity' docs/MACHINE-FACING-LAYER.md` returns the new release-checklist sub-section's prose pointing to the spawned-process test.

## Landed Changes

### 1. New spawned-process integration test

Created `tools/world-mcp/tests/integration/server-capabilities-hash-parity.test.ts` following the existing spawned-entrypoint pattern but using `@modelcontextprotocol/sdk/client/stdio.js` `StdioClientTransport` to connect to the compiled server process:

- The test seeds a temp repo root with a minimal indexed `seeded` world, then spawns `node tools/world-mcp/dist/src/server.js` from that temp package cwd.
- It invokes `mcp__worldloom__describe_capabilities` over the stdio MCP boundary and asserts `build_info.validator_registry_hash` and `build_info.patch_operation_schema_hash` match the current computed expectations.
- It invokes `mcp__worldloom__validate_patch_plan` against a known-bad causal-dependency fixture and asserts a fail verdict from `causal_dependency_threat_scan.choice_dependency_clobbered`.
- It closes the MCP client and destroys the temp repo root after the test.

### 2. MACHINE-FACING-LAYER.md correction + release-checklist sub-section

At `docs/MACHINE-FACING-LAYER.md`, the old "deployed smoke test" wording now distinguishes `tools/world-mcp/tests/server/dispatch.test.ts` as an in-memory smoke from `tools/world-mcp/tests/integration/server-capabilities-hash-parity.test.ts` as the spawned-process stdio smoke. A new `### Pre-deploy capability-currency smoke` sub-section instructs operators to run `cd tools/world-mcp && npm run build`, then `cd tools/world-mcp && npm test`, and treat a `server-capabilities-hash-parity` mismatch as stale `dist/` requiring rebuild before server restart.

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
2. The new test spawns the actual `dist/src/server.js` process through `StdioClientTransport`.
3. The hash parity assertion passes when `dist/` is current. The manual stale-`dist/` mutation regression check was not run in this closeout; see `## Deviations`.
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

## Outcome

Completed on 2026-05-17.

- Added `tools/world-mcp/tests/integration/server-capabilities-hash-parity.test.ts`.
- The new integration test spawns the compiled `dist/src/server.js` over stdio, calls `describe_capabilities`, checks both capability hash fields, and submits a known-bad `validate_patch_plan` fixture through the spawned process.
- Corrected `docs/MACHINE-FACING-LAYER.md` so `dispatch.test.ts` is no longer described as the deployed-process smoke and added the `Pre-deploy capability-currency smoke` release-checklist subsection.
- Updated `archive/specs/SPEC-40-story-pipeline-eleventh-iteration-fixes.md` with a dated D4 implementation note.

## Verification Result

- `cd tools/world-mcp && npm run build` — passed.
- `cd tools/world-mcp && node --test dist/tests/integration/server-capabilities-hash-parity.test.js` — passed; the new spawned-process test reported `1` passing test.
- `cd tools/world-mcp && npm test` — passed; package script rebuilt and reported `391` passing tests.
- Docs grep proof:

  ```bash
  grep -nE 'deployed smoke test at `tools/world-mcp/tests/server/dispatch.test.ts`|server-capabilities-hash-parity|Pre-deploy capability-currency smoke' docs/MACHINE-FACING-LAYER.md
  ```

  Returned the new `server-capabilities-hash-parity` and `Pre-deploy capability-currency smoke` hits only; the old wrong "deployed smoke test at dispatch.test.ts" phrase is absent.

## Deviations

- The manual stale-`dist/` mutation regression check from the original acceptance text was not performed. The accepted proof is the fresh build, focused spawned-process test, full package test suite, and docs grep proof.
