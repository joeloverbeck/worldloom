# MCPENH-067: Auto-rebuild world index on `index_version_mismatch` via the freshness-guard pattern

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — extend `tools/world-mcp/src/context-packet/freshness-guard.ts` to detect and recover from `index_version_mismatch` in addition to its current `stale_index` coverage; extend the existing `freshness_audit` annotation shape; extend the freshness-guard test
**Deps**: archive/tickets/HOOK-001.md (existing `withIndexFreshnessGuard` wrapper pattern this ticket extends)

## Problem

`mcp__worldloom__get_context_packet` (and every other read-side MCP retrieval tool wrapped by `withIndexFreshnessGuard` per HOOK-001) currently surfaces `index_version_mismatch` as an unrecovered error when the world-index DB schema version (`worlds/<slug>/_index/index_version.txt`) is older than the MCP-server-expected schema version. The error response shape is:

```json
{
  "code": "index_version_mismatch",
  "message": "World index schema version does not match the retrieval server expectation.",
  "details": {"expected": "7", "actual": "6", "remedy": "run world-index build"}
}
```

Recovery requires the operator to exit the MCP call, run `node tools/world-index/dist/src/cli.js build <world-slug>` from the shell, and retry the original tool call. The error code is distinct from `stale_index` (file-newer-than-index drift, fixed by `world-index sync`) — `index_version_mismatch` is a SCHEMA-version mismatch that requires a full `world-index build` rebuild rather than an incremental sync.

Session evidence: during the `branching-story-bootstrap` invocation that initialized `worlds/erotica-world/stories/red-bunny/` this session, the first `mcp__worldloom__get_context_packet` call returned `index_version_mismatch` with `expected: "7"` / `actual: "6"`. The skill flow aborted; the operator ran `node tools/world-index/dist/src/cli.js build erotica-world` from the shell to rebuild the index to v7, then retried the call successfully. In Auto Mode this manual-recovery dependency breaks unattended skill execution — the skill cannot recover without operator intervention, and the `remedy:` text is operator-readable instruction rather than a programmatic recovery hook.

HOOK-001's `withIndexFreshnessGuard` already implements the in-handler retry-after-sync pattern for `stale_index`: the wrapper detects the error code, runs `@worldloom/world-index/commands/sync` in-process, retries once, and annotates the recovered response with `freshness_audit.pre_call_index_was_stale: true`. The same pattern applies cleanly to `index_version_mismatch`: detect the error code, run `@worldloom/world-index/commands/build` (or whichever programmatic-build entry-point the world-index package exposes) in-process, retry once, and annotate the recovered response with an additive `freshness_audit.pre_call_index_version_was_old: true` plus `index_version_rebuilt_from: "<old>"` / `index_version_rebuilt_to: "<new>"` entry.

## Assumption Reassessment (2026-05-25)

1. `tools/world-mcp/src/db/open.ts:114` emits `index_version_mismatch` with `details.expected`, `details.actual`, and `remedy: "run world-index build"`. The same file at line 166 emits `stale_index` (the distinct code HOOK-001 handles). `tools/world-mcp/src/context-packet/freshness-guard.ts:35` checks `value.code === "stale_index"` — does NOT branch on `index_version_mismatch`. Per Phase 5 verification, no auto-rebuild path, no `ensure_index` MCP tool, and no `index_health` MCP tool exist at HEAD.
2. `docs/MACHINE-FACING-LAYER.md` and `tools/world-mcp/README.md` document the freshness-guard behavior introduced by HOOK-001 for `stale_index` but do not document an automatic recovery path for `index_version_mismatch`. The `remedy:` field on the error response is the only operator-facing instruction.
3. Cross-skill shared boundary: every skill calling any `withIndexFreshnessGuard`-wrapped MCP retrieval tool (the 12 read-side retrieval handlers HOOK-001 enumerates: `get_context_packet`, `get_record`, `get_record_field`, `list_records`, `find_named_entities`, `find_sections_touched_by`, `find_impacted_fragments`, `search_nodes`, `get_neighbors`, `get_node`, `find_edit_anchors`, `get_firewall_content`) benefits. The submit-side tools (`validate_patch_plan`, `submit_patch_plan`) remain unwrapped per HOOK-001's deliberate exclusion (the patch engine has its own pre-apply staleness contract).
4. FOUNDATIONS principle under audit: §Machine-Facing Layer item 5 ("Hooks — Claude Code enforcement points for context preface injection, large-read guards, engine-only mutation guards, subagent bootstrap, and post-write validation"). HOOK-001's freshness guard already implements the in-handler auto-recovery shape for one error code in the index-lifecycle family; extending it to the sibling error code is the same family of pipeline behavior. Per FOUNDATIONS §Tooling Recommendation, the retrieval surface should not require operators to drop out of pipeline tools for mechanical recovery loops the pipeline can perform in-process.
5. Schema extension shape: the `freshness_audit` object introduced by HOOK-001 (`pre_call_index_was_stale: true`, `drifted_files_synced: [...]`, `sync_duration_ms: <integer>`) is the existing additive annotation surface for transparent recoveries. This ticket extends it additively with `pre_call_index_version_was_old: boolean`, `index_version_rebuilt_from: string`, `index_version_rebuilt_to: string`, and `build_duration_ms: integer`. Existing consumers reading the `freshness_audit` block continue to work unchanged; new consumers can branch on either `pre_call_index_was_stale` (sync recovery) or `pre_call_index_version_was_old` (build recovery) independently. The two flags can be simultaneously true if a single call recovered through both paths (a rebuild that also performed an implicit sync of file drift).
6. Adjacent contradictions surfaced during reassessment: HOOK-001 explicitly named its scope as "auto-recovery for retrieval calls where the stale world is explicit or returned in `details.world_slug`" — its scope was `stale_index` only. The original HOOK-001 ticket did not address `index_version_mismatch` because the work was driven by a single-session `stale_index` incident (`canon-addition` PA-0001 Phase 0). This ticket is a required-consequence follow-up: the `index_version_mismatch` recovery path is the sibling pattern that HOOK-001's same-shape wrapper architecture invites. The two error codes share a recovery pattern (detect, programmatically invoke the recovery, retry once, annotate) but had distinct coverage at the time HOOK-001 landed.

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

## What to Change

### 1. Extend `withIndexFreshnessGuard` to detect `index_version_mismatch`

In `tools/world-mcp/src/context-packet/freshness-guard.ts`, extend the existing `isStaleIndexError` (or equivalent predicate at line 35) with a sibling `isIndexVersionMismatchError` predicate. The main wrapper's branch logic then dispatches:

- `stale_index` → invoke `@worldloom/world-index/commands/sync` in-process (existing HOOK-001 path).
- `index_version_mismatch` → invoke `@worldloom/world-index/commands/build` in-process. If the world-index package does not currently export a programmatic build entry-point at the same level as `commands/sync`, add it as part of this ticket (the CLI's `build` command logic should be wrappable in a function with the same signature as the sync entry-point).

After the recovery invocation, retry the original handler call once. On success, annotate the response with the additive `freshness_audit` fields. On persistent mismatch, preserve the `index_version_mismatch` error with `details.recovery_attempted: "build"` and `details.recovery_outcome: "still_mismatched"` (parallel to HOOK-001's `details.recovery_attempted: "sync"` shape for persistent-`stale_index` cases).

### 2. Extend the `freshness_audit` annotation shape

Add these additive fields (existing fields preserved unchanged):

```yaml
freshness_audit:
  # existing HOOK-001 fields:
  pre_call_index_was_stale: boolean
  drifted_files_synced: [string]
  sync_duration_ms: integer
  # new fields:
  pre_call_index_version_was_old: boolean
  index_version_rebuilt_from: string  # e.g., "6"
  index_version_rebuilt_to: string    # e.g., "7"
  build_duration_ms: integer
```

When neither recovery fired, the `freshness_audit` block is absent (matching HOOK-001's current contract). When only one recovery fired, only that recovery's fields are populated. When both fired (a rare same-call combination), both sets are populated.

### 3. Expose the programmatic build entry-point in `@worldloom/world-index`

If `tools/world-index/src/public/index.ts` does not currently export `commands/build` at the package level (parallel to the existing `commands/sync` export), add the export. The CLI's `build` command at `tools/world-index/src/commands/build.ts` (or equivalent path) is the implementation; the public entry-point is a thin re-export.

### 4. Update tests

Extend `tools/world-mcp/tests/context-packet/freshness-guard.test.ts` with three new branches covering:

- recoverable `index_version_mismatch` (build succeeds; second call returns response with `freshness_audit.pre_call_index_version_was_old: true`)
- persistent `index_version_mismatch` (build no-op or fails; second call returns `index_version_mismatch` with `details.recovery_attempted: "build"` / `details.recovery_outcome: "still_mismatched"`)
- co-occurrence (single call recovers from both `stale_index` and `index_version_mismatch`)

### 5. Update documentation

Update `tools/world-mcp/README.md` to document the extended freshness-guard behavior. Update `docs/MACHINE-FACING-LAYER.md` to document `index_version_mismatch` auto-recovery alongside the existing `stale_index` auto-recovery section.

## Files to Touch

- `tools/world-mcp/src/context-packet/freshness-guard.ts` (modify — extend predicate + dispatch logic + annotation)
- `tools/world-index/src/public/index.ts` (modify — add `commands/build` export if not already present)
- `tools/world-index/src/commands/build.ts` (modify if a programmatic entry-point needs extraction from the CLI shim)
- `tools/world-mcp/tests/context-packet/freshness-guard.test.ts` (modify — three new test branches)
- `tools/world-mcp/README.md` (modify — document extended freshness behavior)
- `docs/MACHINE-FACING-LAYER.md` (modify — document `index_version_mismatch` auto-recovery)

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
2. The auto-build invocation is idempotent — running `world-index build` on an already-current index is a no-op.
3. The two recovery paths (sync for `stale_index`, build for `index_version_mismatch`) can co-occur in one call without interference.
4. HOOK-001's existing `stale_index` recovery semantics are unchanged.
5. No retrieval call's correctness depends on the build being a no-op when current; the wrapper preserves the original handler's response semantics.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/context-packet/freshness-guard.test.ts` (modify) — three new branches covering recoverable mismatch, persistent mismatch, and co-occurrence.
2. Existing freshness-guard tests verifying `stale_index` recovery and already-fresh paths remain unchanged.

### Commands

1. `cd tools/world-mcp && npm run build`
2. `cd tools/world-mcp && node --test dist/tests/context-packet/freshness-guard.test.js`
3. `cd tools/world-mcp && npm test`
4. `grep -nE "index_version_mismatch" tools/world-mcp/src/context-packet/freshness-guard.ts` — confirms the new detection branch is present.
5. `grep -nE "withIndexFreshnessGuard" tools/world-mcp/src/tools/validate-patch-plan.ts tools/world-mcp/src/tools/submit-patch-plan.ts` — zero hits (the deliberate exclusion preserved).
