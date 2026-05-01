# HOOK-001: Auto-sync stale world index on retrieval-tool calls (or pre-MCP hook integration)

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — modify retrieval-tool handlers under `tools/world-mcp/src/tools/` to detect-and-recover, OR add a pre-MCP hook in `.claude/settings.json` + `tools/hooks/` that runs `world-index sync` on first MCP call of session
**Deps**: None

## Problem

Every skill that invokes any retrieval tool (`get_context_packet`, `get_record`, `find_named_entities`, `find_sections_touched_by`, `search_nodes`, `get_neighbors`, `find_impacted_fragments`, `list_records`) must defensively handle the `stale_index` failure mode — the world index is stale relative to source files (typically because a prior session edited a hybrid-file frontmatter without index sync). The current behavior:

1. Operator calls e.g. `get_context_packet`.
2. MCP returns `{code: "stale_index", message: "...", details: {drifted_files: [...], remedy: "run world-index sync"}}`.
3. Operator must run `node tools/world-index/dist/src/cli.js sync <world-slug>` manually.
4. Operator retries the original call.

During the canon-addition session that produced PA-0001 for `worlds/erotica-world`, the very first MCP retrieval call (Phase 0 pre-flight `get_context_packet`) returned `stale_index` for `_source/entities/ENT-0002.yaml`. The recovery is mechanical and well-documented, but every skill repeats the defensive handling. The discipline lives in skill prose (`canon-addition/SKILL.md` §World-State Prerequisites; `canon-addition/references/retrieval-tool-tree.md` §Pre-flight) plus the new `engine-envelope-shape.md` §6 "Retrieval-time errors" row added by the canon-addition audit.

This is a UX concern, not a correctness concern: the recovery is always the same, the operator always wants the retry, and the MCP server has the information needed to do the sync itself. Two implementation options exist (described under §What to Change); the ticket commits to one approach.

## Assumption Reassessment (2026-05-01)

1. The current retrieval-tool handlers under `tools/world-mcp/src/tools/` (e.g., `get-context-packet.ts`, `get-record.ts`) detect index staleness at handler entry and return an error response with the `stale_index` (or `index_stale`) code. The sync logic exists at `tools/world-index/dist/src/cli.js sync`; it is not currently invoked from inside the MCP server. The sync command is idempotent and safe to run on a fresh index (no-op).
2. `.claude/settings.json` already configures hooks for context preface injection, large-read guards, engine-only mutation guards (Hook 3), subagent bootstrap, and post-write validation. A pre-MCP-call hook is not currently configured. Per `archive/specs/SPEC-05-hooks-discipline.md` and `tools/hooks/`, the hook framework supports session-level setup hooks.
3. Cross-skill shared boundary: every skill calling any `mcp__worldloom__*` retrieval tool benefits.
4. FOUNDATIONS principle under audit: §Machine-Facing Layer item 5 ("Hooks — Claude Code enforcement points for context preface injection, large-read guards, engine-only mutation guards, subagent bootstrap, and post-write validation"). Adding a pre-MCP hook for index-sync extends the existing hook taxonomy.
6. Schema extension shape: no schema changes. The MCP-tool error contract is unchanged for the cases where sync fails or staleness persists; only the auto-recovery path is added.
7. Adjacent contradictions: none. The sync is a no-op when the index is already fresh.

## Architecture Check

Two viable approaches; the ticket commits to **Approach A (in-handler retry-after-sync)** as cleaner; Approach B (pre-MCP hook) is recorded for completeness as the rejected alternative.

**Approach A — In-handler retry-after-sync** (recommended):

- Each retrieval-tool handler detects staleness, runs `world-index sync` programmatically (via `@worldloom/world-index`'s exported sync function rather than spawning the CLI), and retries the original operation once.
- If staleness persists after sync (genuine schema drift, not just write-without-sync), return the existing `stale_index` error so the operator can investigate.
- Pro: localized to MCP server; no Claude Code hook config needed; works regardless of how the MCP is invoked (CLI dry-run, IDE integration, etc.).
- Con: each handler needs the retry wrapper; mitigated by extracting a shared `withIndexFreshnessGuard(handler)` decorator.

**Approach B — Pre-MCP hook** (alternative, rejected):

- Add a session-start hook in `.claude/settings.json` that runs `world-index sync` for the active world before any MCP retrieval call fires.
- Pro: zero MCP-server changes.
- Con: hook only fires for Claude Code sessions; CLI / scripted MCP usage bypasses it. Wastes time syncing on every session even when the index is already fresh. Doesn't help with mid-session staleness if a hybrid-file frontmatter is direct-edited between calls.

This ticket adopts Approach A.

1. Approach A is cleaner because the retrieval-tool layer owns retrieval correctness; staleness recovery belongs adjacent to the staleness detection.
2. No backwards-compatibility aliasing/shims introduced. The `stale_index` error code remains for genuine sync-failure cases; the auto-recovery is internal to the handler.

## Verification Layers

1. Each retrieval handler invokes the sync-and-retry wrapper -> codebase grep-proof: `grep -rn 'withIndexFreshnessGuard\|withFreshnessGuard' tools/world-mcp/src/tools/`.
2. Stale index recovers transparently -> manual MCP call dry-run: edit a hybrid-file frontmatter without syncing; call `get_context_packet` and verify the call succeeds (sync ran internally) AND the response includes a freshness-recovery audit field.
3. Persistent staleness (sync fails to fix) still surfaces the error -> simulated test: monkey-patch sync to no-op; call `get_context_packet` and verify the original `stale_index` error is returned.
4. Sync is no-op when index is fresh -> performance test: time `get_context_packet` against a fresh index pre-ticket vs post-ticket; difference < 100ms.

## What to Change

### 1. Add `withIndexFreshnessGuard` wrapper

Add `tools/world-mcp/src/context-packet/freshness-guard.ts` (or similar) exporting a wrapper:

```ts
export function withIndexFreshnessGuard<TArgs, TResult>(
  handler: (args: TArgs) => Promise<TResult | StaleIndexError>
): (args: TArgs) => Promise<TResult | StaleIndexError> {
  return async (args) => {
    const first = await handler(args);
    if (!isStaleIndexError(first)) return first;
    await syncWorldIndex(extractWorldSlug(args, first));
    const second = await handler(args);
    if (isStaleIndexError(second)) {
      // sync did not resolve; return the original error with a recovery-attempted annotation
      return { ...second, details: { ...second.details, recovery_attempted: 'sync', recovery_outcome: 'still_stale' } };
    }
    return appendFreshnessAuditAnnotation(second);
  };
}
```

The sync invocation should call `@worldloom/world-index`'s exported sync function in-process (NOT spawn the CLI binary), preserving error-handling and avoiding subprocess overhead.

### 2. Wire the wrapper into every retrieval handler

Apply `withIndexFreshnessGuard` to:

- `get_context_packet`
- `get_record`
- `get_record_field`
- `list_records`
- `find_named_entities`
- `find_sections_touched_by`
- `find_impacted_fragments`
- `search_nodes`
- `get_neighbors`

Do NOT apply to `validate_patch_plan` and `submit_patch_plan` (the patch engine handles its own pre-apply staleness check; the existing submit-time `index_stale` recovery flow at `references/engine-envelope-shape.md` §6 stays intact for those).

### 3. Audit annotation on auto-recovered responses

When a sync-and-retry recovers a stale index, the response gains an audit field at the top level:

```yaml
freshness_audit:
  pre_call_index_was_stale: true
  drifted_files_synced: ["_source/entities/ENT-0002.yaml"]
  sync_duration_ms: 47
```

This lets skill prose / audit trails record that auto-sync occurred (for diagnostic purposes; the recovery itself is transparent).

### 4. Update skill prose to drop the defensive handling

After the ticket lands, edit:

- `canon-addition/SKILL.md` §World-State Prerequisites — drop the "If a retrieval call returns `stale_index`..." sentence (the Issue 6 audit's primary edit).
- `canon-addition/references/retrieval-tool-tree.md` §Pre-flight — drop the retrieval-time `stale_index` recovery bullet.
- `canon-addition/references/engine-envelope-shape.md` §6 — keep the submit-time row; mark the retrieval-time row as "auto-recovered transparently per HOOK-001; this row preserved for diagnostic visibility when `freshness_audit.pre_call_index_was_stale: true` appears in a response."
- Same edits in `create-base-world/references/engine-envelope-shape.md` §6 (the parallel cascade target from the canon-addition audit).

## Files to Touch

- `tools/world-mcp/src/context-packet/freshness-guard.ts` (new)
- `tools/world-mcp/src/tools/get-context-packet.ts` (modify — wire wrapper)
- `tools/world-mcp/src/tools/get-record.ts` (modify — wire wrapper)
- `tools/world-mcp/src/tools/get-record-field.ts` (modify — wire wrapper)
- `tools/world-mcp/src/tools/list-records.ts` (modify — wire wrapper)
- `tools/world-mcp/src/tools/find-named-entities.ts` (modify — wire wrapper)
- `tools/world-mcp/src/tools/find-sections-touched-by.ts` (modify — wire wrapper)
- `tools/world-mcp/src/tools/find-impacted-fragments.ts` (modify — wire wrapper)
- `tools/world-mcp/src/tools/search-nodes.ts` (modify — wire wrapper)
- `tools/world-mcp/src/tools/get-neighbors.ts` (modify — wire wrapper)
- `tools/world-index/src/public/index.ts` (modify only if the sync function is not yet a public export)
- `.claude/skills/canon-addition/SKILL.md` (modify — drop defensive prose)
- `.claude/skills/canon-addition/references/retrieval-tool-tree.md` (modify — drop defensive bullet)
- `.claude/skills/canon-addition/references/engine-envelope-shape.md` §6 (modify — annotate the retrieval-time row)
- `.claude/skills/create-base-world/references/engine-envelope-shape.md` §6 (modify — same)

## Out of Scope

- Auto-syncing on submit-time `index_stale` (the patch engine has its own contract; submit-time staleness usually indicates concurrent writes that need operator attention).
- A pre-MCP hook (rejected per Approach B above).
- Changing the world-index sync logic itself (this ticket invokes the existing sync function; it does not modify it).

## Acceptance Criteria

### Tests That Must Pass

1. A retrieval call against a stale index returns the expected response with `freshness_audit.pre_call_index_was_stale: true` rather than a `stale_index` error.
2. A retrieval call against a fresh index has performance overhead < 100ms relative to pre-ticket baseline.
3. A simulated persistent-staleness scenario (sync no-op) correctly returns `stale_index` with `details.recovery_attempted: 'sync'` and `recovery_outcome: 'still_stale'`.
4. `validate_patch_plan` and `submit_patch_plan` still surface `index_stale` directly (no auto-recovery wrapped) — verified by inspection of those handlers' source.

### Invariants

1. The `stale_index` error code is preserved for genuine persistent-staleness cases; only transparent-recoverable cases gain the audit annotation.
2. The auto-sync invocation is idempotent — running it on a fresh index is a no-op.
3. No retrieval call's correctness depends on the sync being a no-op when fresh; the wrapper preserves the original handler's response semantics.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/test/freshness-guard.test.ts` (new) — exercises the wrapper's three branches (already-fresh, recoverable-stale, persistent-stale).
2. `tools/world-mcp/test/get-context-packet.test.ts` (modify) — add cases asserting `freshness_audit` annotation behavior.

### Commands

1. `pnpm --filter @worldloom/world-mcp test`.
2. Manual MCP dry-run: edit a hybrid-file frontmatter under a test world, call `get_context_packet`, verify transparent recovery + audit annotation.
3. After the skill prose update: `grep -rn "stale_index\|index_stale" .claude/skills/canon-addition/ .claude/skills/create-base-world/` should show only the diagnostic/audit-visibility framings, not the defensive-handling instructions.
