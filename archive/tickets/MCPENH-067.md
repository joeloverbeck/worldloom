# MCPENH-067: Auto-rebuild world index on `index_version_mismatch` via the freshness-guard pattern

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — extended `tools/world-mcp/src/context-packet/freshness-guard.ts` to detect and recover from `index_version_mismatch` in addition to `stale_index`; extended the existing `freshness_audit` annotation shape; extended focused/integration tests and same-seam docs/skill references
**Deps**: archive/tickets/HOOK-001.md (existing `withIndexFreshnessGuard` wrapper pattern this ticket extends)

## Problem

At intake, `mcp__worldloom__get_context_packet` (and every other read-side MCP retrieval tool wrapped by `withIndexFreshnessGuard` per HOOK-001) surfaced `index_version_mismatch` as an unrecovered error when the world-index DB schema version (`worlds/<slug>/_index/index_version.txt`) was older than the MCP-server-expected schema version. The error response shape was:

```json
{
  "code": "index_version_mismatch",
  "message": "World index schema version does not match the retrieval server expectation.",
  "details": {"expected": "7", "actual": "6", "remedy": "run world-index build"}
}
```

Before this ticket, recovery required the operator to exit the MCP call, run `node tools/world-index/dist/src/cli.js build <world-slug>` from the shell, and retry the original tool call. The error code is distinct from `stale_index` (file-newer-than-index drift, fixed by `world-index sync`) — `index_version_mismatch` is a SCHEMA-version mismatch that requires a full `world-index build` rebuild rather than an incremental sync.

Session evidence: during the `branching-story-bootstrap` invocation that initialized `worlds/erotica-world/stories/red-bunny/` this session, the first `mcp__worldloom__get_context_packet` call returned `index_version_mismatch` with `expected: "7"` / `actual: "6"`. The skill flow aborted; the operator ran `node tools/world-index/dist/src/cli.js build erotica-world` from the shell to rebuild the index to v7, then retried the call successfully. In Auto Mode this manual-recovery dependency breaks unattended skill execution — the skill cannot recover without operator intervention, and the `remedy:` text is operator-readable instruction rather than a programmatic recovery hook.

HOOK-001's `withIndexFreshnessGuard` already implemented the in-handler retry-after-sync pattern for `stale_index`: the wrapper detects the error code, runs `@worldloom/world-index/commands/sync` in-process, retries once, and annotates the recovered response with `freshness_audit.pre_call_index_was_stale: true`. This ticket landed the same pattern for `index_version_mismatch`: detect the error code, run `@worldloom/world-index/commands/build` in-process, retry, and annotate the recovered response with an additive `freshness_audit.pre_call_index_version_was_old: true` plus `index_version_rebuilt_from` / `index_version_rebuilt_to`.

## Assumption Reassessment (2026-05-25)

1. At intake, `tools/world-mcp/src/db/open.ts` emitted `index_version_mismatch` with `details.expected`, `details.actual`, and `remedy: "run world-index build"`, and emitted `stale_index` as the distinct file-drift code HOOK-001 handles. `tools/world-mcp/src/context-packet/freshness-guard.ts` checked `value.code === "stale_index"` but did not branch on `index_version_mismatch`. No auto-rebuild path, `ensure_index` MCP tool, or `index_health` MCP tool existed at HEAD.
2. At intake, `docs/MACHINE-FACING-LAYER.md`, `docs/WORKFLOWS.md`, and `tools/world-mcp/README.md` documented the freshness-guard behavior introduced by HOOK-001 for `stale_index` but did not document an automatic recovery path for `index_version_mismatch`. The `remedy:` field on the error response was the only operator-facing instruction.
3. Cross-skill shared boundary: every skill calling any `withIndexFreshnessGuard`-wrapped explicit-world, index-backed MCP tool benefits. The live wrapper now covers HOOK-001's read-side retrieval handlers plus later index-backed helpers such as allocation, story-state provenance, storylet selection, and PG-state hash verification. The submit-side tools (`validate_patch_plan`, `submit_patch_plan`) remain unwrapped per HOOK-001's deliberate exclusion (the patch engine has its own pre-apply staleness contract).
4. FOUNDATIONS principle under audit: §Machine-Facing Layer item 5 ("Hooks — Claude Code enforcement points for context preface injection, large-read guards, engine-only mutation guards, subagent bootstrap, and post-write validation"). HOOK-001's freshness guard already implements the in-handler auto-recovery shape for one error code in the index-lifecycle family; extending it to the sibling error code is the same family of pipeline behavior. Per FOUNDATIONS §Tooling Recommendation, the retrieval surface should not require operators to drop out of pipeline tools for mechanical recovery loops the pipeline can perform in-process.
5. Schema extension shape: the `freshness_audit` object introduced by HOOK-001 (`pre_call_index_was_stale: true`, `drifted_files_synced: [...]`, `sync_duration_ms: <integer>`) is the existing additive annotation surface for transparent recoveries. This ticket extends it additively with `pre_call_index_version_was_old: boolean`, `index_version_rebuilt_from: string | null` when the old sidecar is readable, `index_version_rebuilt_to: string` when the expected version is readable, and `build_duration_ms: integer`. Existing consumers reading the `freshness_audit` block continue to work unchanged; new consumers can branch on either `pre_call_index_was_stale` (sync recovery) or `pre_call_index_version_was_old` (build recovery) independently. The two flags can be simultaneously true if a single call recovered through both paths (a rebuild that also performed an implicit sync of file drift).
6. Adjacent contradictions surfaced during reassessment: HOOK-001 explicitly named its scope as "auto-recovery for retrieval calls where the stale world is explicit or returned in `details.world_slug`" — its scope was `stale_index` only. The original HOOK-001 ticket did not address `index_version_mismatch` because the work was driven by a single-session `stale_index` incident (`canon-addition` PA-0001 Phase 0). This ticket is a required-consequence follow-up: the `index_version_mismatch` recovery path is the sibling pattern that HOOK-001's same-shape wrapper architecture invites. The two error codes share a recovery pattern (detect, programmatically invoke the recovery, retry once, annotate) but had distinct coverage at the time HOOK-001 landed.
7. Dirty-worktree ledger at intake: no tracked same-seam edits; pre-existing ignored package artifacts are present under `tools/world-mcp/dist/`, `tools/world-mcp/node_modules/`, `tools/world-mcp/.secret`, `tools/world-index/dist/`, and `tools/world-index/node_modules/`. Pre-edit package baseline: `cd tools/world-mcp && npm test` passes, 457 tests.
8. Live export correction: `tools/world-index/src/public/index.ts` does not exist in this checkout. The needed programmatic build entry-point already exists at `tools/world-index/src/commands/build.ts` and is exported as `@worldloom/world-index/commands/build` in `tools/world-index/package.json`. This ticket therefore updates the `tools/world-mcp` interop import/export surface rather than adding a nonexistent `src/public/index.ts` barrel.
9. Existing integration fallout: `tools/world-mcp/tests/integration/spec02-verification.test.ts` has a capstone assertion that a sidecar version drift surfaces `index_version_mismatch` directly through the MCP server. After this ticket, that direct error should only survive when build recovery cannot run or does not repair the mismatch; the test must be truthed to assert build recovery details for its intentionally unbuildable fixture.

## Architecture Check

1. **Extend the existing guard, don't create a sibling.** The cleanest approach is to extend `withIndexFreshnessGuard` to branch on both `stale_index` (existing `sync` recovery) and `index_version_mismatch` (new `build` recovery) within one wrapper, sharing the retry-once + annotation infrastructure. A sibling `withIndexVersionGuard` would force every wrapped handler to compose two wrappers, doubling wrap-time overhead and creating ordering ambiguity (which guard runs first?). One guard handling both index-lifecycle error codes is the simpler shape.
2. **No backwards-compatibility shims.** The `index_version_mismatch` error code is preserved for genuine persistent-mismatch cases (e.g., a rebuild fails or the rebuild produces an index still older than the server expects — the genuine MCP/index version-drift case during deploys). Auto-recovery is internal to the handler; callers see either the recovered response with `freshness_audit.pre_call_index_version_was_old: true` OR the existing `index_version_mismatch` error with new `details.recovery_attempted: "build"` / `details.recovery_outcome: "still_mismatched"` annotations parallel to HOOK-001's persistent-staleness annotations.

## Verification Layers

1. The freshness guard detects `index_version_mismatch` → grep-proof: `grep -nE 'index_version_mismatch' tools/world-mcp/src/context-packet/freshness-guard.ts` returns at least one hit (parallel to the existing `stale_index` check at line 35).
2. Version-mismatched index recovers transparently → package-local test: simulate a first-call `index_version_mismatch`, verify in-process build is invoked with the world slug, verify the retried response gains `freshness_audit.pre_call_index_version_was_old: true` plus `index_version_rebuilt_from` / `index_version_rebuilt_to` / `build_duration_ms`.
3. Persistent version mismatch still surfaces the error → package-local test with an injected no-op build function; verify `index_version_mismatch` returns with `details.recovery_attempted: "build"` and `details.recovery_outcome: "still_mismatched"`.
4. Fresh-index path preserves original response semantics → package-local test verifies an already-current response is returned unchanged.
5. `validate_patch_plan` and `submit_patch_plan` remain unwrapped → grep-proof: `grep -nE 'withIndexFreshnessGuard' tools/world-mcp/src/tools/validate-patch-plan.ts tools/world-mcp/src/tools/submit-patch-plan.ts` returns zero hits (HOOK-001's deliberate exclusion preserved).
6. Both annotations can co-occur → package-local test with a simulated index that is both stale (file drift) AND version-mismatched (schema bump) verifies both `pre_call_index_was_stale: true` and `pre_call_index_version_was_old: true` appear on the recovered response.

## Landed Changes

### 1. Extended `withIndexFreshnessGuard` to detect `index_version_mismatch`

In `tools/world-mcp/src/context-packet/freshness-guard.ts`, added an `isIndexVersionMismatchError` predicate beside `isStaleIndexError`. The wrapper dispatches:

- `stale_index` → invoke `@worldloom/world-index/commands/sync` in-process (existing HOOK-001 path).
- `index_version_mismatch` → invoke `@worldloom/world-index/commands/build` in-process through `tools/world-mcp/src/package-interop.ts`.

After each recovery invocation, the wrapper retries the original handler. On success, it annotates the response with the additive `freshness_audit` fields. On persistent mismatch, it preserves the `index_version_mismatch` error with `details.recovery_attempted: "build"` and `details.recovery_outcome: "still_mismatched"`; if build cannot run, it returns `recovery_outcome: "build_failed"`.

### 2. Extended the `freshness_audit` annotation shape

Added these additive fields (existing fields preserved unchanged):

```yaml
freshness_audit:
  # existing HOOK-001 fields:
  pre_call_index_was_stale: boolean
  drifted_files_synced: [string]
  sync_duration_ms: integer
  # new fields:
  pre_call_index_version_was_old: boolean
  index_version_rebuilt_from: string | null  # e.g., "6"; null when the old sidecar is missing
  index_version_rebuilt_to: string           # e.g., "7"
  build_duration_ms: integer
```

When neither recovery fired, the `freshness_audit` block is absent (matching HOOK-001's current contract). When only one recovery fired, only that recovery's fields are populated. When both fired (a rare same-call combination), both sets are populated.

### 3. Used the existing programmatic build entry-point in `@worldloom/world-index`

`@worldloom/world-index/commands/build` already existed in the package export map. Extended `tools/world-mcp/src/package-interop.ts` to load that command beside `commands/sync`, and the freshness guard now invokes it in-process.

### 4. Updated tests

Extended `tools/world-mcp/tests/context-packet/freshness-guard.test.ts` with three new branches covering:

- recoverable `index_version_mismatch` (build succeeds; second call returns response with `freshness_audit.pre_call_index_version_was_old: true`)
- persistent `index_version_mismatch` (build no-op or fails; second call returns `index_version_mismatch` with `details.recovery_attempted: "build"` / `details.recovery_outcome: "still_mismatched"`)
- co-occurrence (single call recovers from both `stale_index` and `index_version_mismatch`)

Updated `tools/world-mcp/tests/integration/spec02-verification.test.ts` so the intentional unbuildable version-mismatch fixture now proves persistent `index_version_mismatch` carries build recovery details.

### 5. Updated documentation

Updated `tools/world-mcp/README.md`, `docs/MACHINE-FACING-LAYER.md`, `docs/WORKFLOWS.md`, and the HOOK-001-derived canon-addition/create-base-world retrieval failure references to document `index_version_mismatch` auto-recovery alongside existing `stale_index` auto-recovery.

## Files to Touch

- `tools/world-mcp/src/context-packet/freshness-guard.ts` (modify — extend predicate + dispatch logic + annotation)
- `tools/world-mcp/src/package-interop.ts` (modify — load the existing `@worldloom/world-index/commands/build` export)
- `tools/world-mcp/tests/context-packet/freshness-guard.test.ts` (modify — three new test branches)
- `tools/world-mcp/tests/integration/spec02-verification.test.ts` (modify — preserve capstone coverage for persistent `index_version_mismatch` when build recovery fails)
- `tools/world-mcp/README.md` (modify — document extended freshness behavior)
- `docs/WORKFLOWS.md` (modify — update quick-reference retrieval recovery language)
- `docs/MACHINE-FACING-LAYER.md` (modify — document `index_version_mismatch` auto-recovery)
- `.claude/skills/canon-addition/references/engine-envelope-shape.md` (modify — document retrieval-time version-rebuild audit and persistent mismatch)
- `.claude/skills/canon-addition/references/retrieval-tool-tree.md` (modify — update retrieval freshness audit wording)
- `.claude/skills/create-base-world/references/engine-envelope-shape.md` (modify — document retrieval-time version-rebuild audit and persistent mismatch)

## Out of Scope

- Wrapping `validate_patch_plan` or `submit_patch_plan` (HOOK-001's deliberate exclusion preserved — patch engine has its own pre-apply contract).
- Cross-version migration logic (the rebuild is a from-scratch rebuild at the new schema version; this ticket does not add incremental v6→v7 migration).
- Pre-MCP hook (rejected in HOOK-001's Approach B for the same reasons; auto-recovery belongs adjacent to the error detection).
- Auto-rebuild on patch-engine `index_stale` (separate submit-time concern preserved per HOOK-001).

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/world-mcp && npm test` — all existing tests plus the three new freshness-guard branches pass.
2. A retrieval call against a world with version-mismatched index returns the expected response with `freshness_audit.pre_call_index_version_was_old: true` rather than an `index_version_mismatch` error.
3. A retrieval call against a version-current index returns the original response unchanged by the version-mismatch branch (the existing `stale_index` branch's behavior is preserved).
4. A simulated persistent-mismatch scenario (build no-op) correctly returns `index_version_mismatch` with `details.recovery_attempted: 'build'` and `details.recovery_outcome: 'still_mismatched'`.
5. `validate_patch_plan` and `submit_patch_plan` continue to surface index errors directly (no auto-recovery wrapped) — verified by inspection.

### Invariants

1. The `index_version_mismatch` error code is preserved for genuine persistent-mismatch cases (e.g., rebuild fails or rebuild produces a still-older index than the server expects).
2. The auto-build invocation is idempotent — running `world-index build` repeatedly on the same source tree safely rebuilds the derived index to the same schema/current content.
3. The two recovery paths (sync for `stale_index`, build for `index_version_mismatch`) can co-occur in one call without interference.
4. HOOK-001's existing `stale_index` recovery semantics are unchanged.
5. No retrieval call's correctness depends on the build being a no-op when current; the wrapper preserves the original handler's response semantics.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/context-packet/freshness-guard.test.ts` (modify) — three new branches covering recoverable mismatch, persistent mismatch, and co-occurrence.
2. `tools/world-mcp/tests/integration/spec02-verification.test.ts` (modify) — server-level persistent-mismatch capstone now asserts build recovery details.
3. Existing freshness-guard tests verifying `stale_index` recovery and already-fresh paths remain unchanged.

### Commands

1. `cd tools/world-mcp && npm run build`
2. `cd tools/world-mcp && node --test dist/tests/context-packet/freshness-guard.test.js`
3. `cd tools/world-mcp && npm test`
4. `grep -nE "index_version_mismatch" tools/world-mcp/src/context-packet/freshness-guard.ts` — confirms the new detection branch is present.
5. `! grep -nE "withIndexFreshnessGuard" tools/world-mcp/src/tools/validate-patch-plan.ts tools/world-mcp/src/tools/submit-patch-plan.ts` — zero hits (the deliberate exclusion preserved).

## Outcome

Implemented the build-and-retry branch inside the existing `withIndexFreshnessGuard` wrapper. The guard now handles `index_version_mismatch` with an in-process `@worldloom/world-index/commands/build` call, keeps HOOK-001's `stale_index` sync branch intact, and can apply both recovery annotations when a rebuilt index then reports stale files. Persistent failures preserve the original `index_version_mismatch` / `stale_index` error codes with `details.recovery_attempted` and `details.recovery_outcome`.

Updated package docs, machine-facing workflow docs, and the HOOK-001-derived canon-addition/create-base-world retrieval references so operators and skills treat successful version rebuilds as diagnostic audit fields rather than manual retry blockers.

## Verification Result

1. Pre-edit baseline: `cd tools/world-mcp && npm test` — pass, 457 tests.
2. `cd tools/world-mcp && npm run build` — initially failed on TypeScript exact-optional/narrowing issues in `freshness-guard.ts`; fixed by only assigning optional audit fields when defined and by making the recovery loop narrow explicitly. Rerun passed.
3. `cd tools/world-mcp && node --test dist/tests/context-packet/freshness-guard.test.js` — pass, 6 tests.
4. `cd tools/world-mcp && node --test dist/tests/integration/spec02-verification.test.js` — pass, 12 tests; emitted expected fixture diagnostics for intentionally unbuildable `drifted-world` / `skewed-world`.
5. `grep -nE 'index_version_mismatch' tools/world-mcp/src/context-packet/freshness-guard.ts` — pass; detection branch present.
6. `! grep -nE 'withIndexFreshnessGuard' tools/world-mcp/src/tools/validate-patch-plan.ts tools/world-mcp/src/tools/submit-patch-plan.ts` — pass; no wrapper hits in submit/validate paths.
7. `rg -n 'pre_call_index_version_was_old|index_version_rebuilt_from|build_duration_ms|recovery_attempted.*build|recovery_outcome.*still_mismatched' ...` over source, tests, package docs, machine-facing docs, and same-seam skill references — pass; landed audit/persistent-recovery wording is present.
8. Final broad proof: `cd tools/world-mcp && npm test` — pass, 460 tests.
9. Post-ticket review correction: `index_version_rebuilt_from` is documented as `string | null` because `openIndexDb()` can report `details.actual: null` when the old sidecar is missing; the build idempotence invariant is documented as a safe repeatable rebuild rather than a no-op.
10. Post-ticket review cross-boundary probe: a temp atomic world was built, its `index_version.txt` was downgraded to `6`, and the compiled `withIndexFreshnessGuard` + real `openIndexDb()` path recovered through the real `@worldloom/world-index/commands/build` export. The recovered response was `{"ok":true,"freshness_audit":{"pre_call_index_version_was_old":true,"index_version_rebuilt_from":"6","index_version_rebuilt_to":"7","build_duration_ms":39}}`.

## Deviations

- The drafted `tools/world-index/src/public/index.ts` / `tools/world-index/src/commands/build.ts` file edits were not needed. The live package already exports `@worldloom/world-index/commands/build`; this ticket only added `tools/world-mcp/src/package-interop.ts` consumption.
- Same-seam docs widened beyond the original `tools/world-mcp/README.md` and `docs/MACHINE-FACING-LAYER.md` list to include `docs/WORKFLOWS.md` plus canon-addition/create-base-world retrieval references that already documented HOOK-001 freshness behavior.
- Direct external `mcp__worldloom__...` smoke was not available in this Codex session, so behavior was proved through package-local compiled wrapper tests and in-memory MCP server integration tests.
- Verification refreshed ignored package artifacts under `tools/world-mcp/dist/`; pre-existing ignored artifacts remain under `tools/world-mcp/dist/`, `tools/world-mcp/node_modules/`, `tools/world-mcp/.secret`, `tools/world-index/dist/`, and `tools/world-index/node_modules/`.
