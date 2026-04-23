# SPEC02RETMCPSER-008: allocate_next_id tool (12 id classes)

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — introduces `tools/world-mcp/src/tools/allocate-next-id.ts`.
**Deps**: SPEC02RETMCPSER-003

## Problem

Skills currently allocate new structured ids (CF, CH, PA, CHAR, DA, PR, BATCH, NCP, NCB, AU, RP, M) by greping the world directory + scanning the ledger. That pattern is fragile (relies on prose filenames; misses structured-id references inside YAML), slow (re-scans on every skill invocation), and silently drifts when CLAUDE.md's documented id classes fall behind the set world-index actually indexes. Centralizing allocation via `mcp__worldloom__allocate_next_id` pins the id-allocation contract to the indexed state and gives skills a single, exact-scan call.

## Assumption Reassessment (2026-04-23)

1. SPEC02RETMCPSER-003's `openIndexDb` handle is the data source; world-index's `nodes` table carries structured ids as `node_id` for the classes CF/CH/PA/CHAR/DA/PR/BATCH/NCP/NCB/AU/RP/M per `archive/specs/SPEC-01-world-index.md` §Node ID scheme lines 240–243. All 12 classes appear in animalia per SPEC-01 empirical scale.
2. `specs/SPEC-02-retrieval-mcp-server.md` §Tool surface Tool 10 (lines 174–181) is authoritative. The id_class enum extends CLAUDE.md's 9 documented classes with `M`, `NCP`, `NCB` — a known CLAUDE.md drift flagged in SPEC-01 Risks and documented in this spec's §Risks.
3. Cross-artifact boundary under audit: the MCP server returns allocated ids; the world.db is immutable during the allocation call (read-only). Callers issuing concurrent `allocate_next_id` calls for the same class against the same world.db will each get the same "next" id until one commits a write through SPEC-03 engine; in Phase 1 this is acceptable (no concurrent commits), but Phase 2's write path must account for race and re-allocate on `submit_patch_plan` conflict.
7. This ticket introduces a new documented id class handling (M-N single-digit numeric form per SPEC-01 §Node ID scheme line 241) that differs from the 4-digit form for other classes. Code must handle both formats without drift.

## Architecture Check

1. A single tool with a discriminated id_class argument is cleaner than 12 per-class helpers, because the scan logic is uniform (regex over `nodes.node_id`) modulo the class prefix. Per-class variance lives in the format spec, not in control flow.
2. No backwards-compatibility aliasing/shims.

## Verification Layers

1. Next-id correctness per class → unit test per class using a seeded fixture with known highest ids, assert `allocate_next_id({world_slug, id_class})` returns highest + 1 in the correct format.
2. First-run / empty → unit test on a fixture with zero ids of a given class asserts `CF-0001`, `NCP-0001`, `M-1` (note the single-digit form for M).
3. M-class single-digit format → grep-proof: `grep -nE "M-\\\\d+" tools/world-mcp/src/tools/allocate-next-id.ts` shows M uses `\d+` not `\d{4}`.
4. All 12 classes present → unit test iterates every class and asserts the tool returns a non-null value.

## What to Change

### 1. `tools/world-mcp/src/tools/allocate-next-id.ts`

Export async `allocateNextId(args: {world_slug, id_class}): Promise<{next_id: string} | McpError>`:

```typescript
const ID_CLASS_FORMATS = {
  CF:    { width: 4, zeroPad: true,  regex: /^CF-(\d{4})$/ },
  CH:    { width: 4, zeroPad: true,  regex: /^CH-(\d{4})$/ },
  PA:    { width: 4, zeroPad: true,  regex: /^PA-(\d{4})$/ },
  CHAR:  { width: 4, zeroPad: true,  regex: /^CHAR-(\d{4})$/ },
  DA:    { width: 4, zeroPad: true,  regex: /^DA-(\d{4})$/ },
  PR:    { width: 4, zeroPad: true,  regex: /^PR-(\d{4})$/ },
  BATCH: { width: 4, zeroPad: true,  regex: /^BATCH-(\d{4})$/ },
  NCP:   { width: 4, zeroPad: true,  regex: /^NCP-(\d{4})$/ },
  NCB:   { width: 4, zeroPad: true,  regex: /^NCB-(\d{4})$/ },
  AU:    { width: 4, zeroPad: true,  regex: /^AU-(\d{4})$/ },
  RP:    { width: 4, zeroPad: true,  regex: /^RP-(\d{4})$/ },
  M:     { width: 1, zeroPad: false, regex: /^M-(\d+)$/ },
} as const;

export type IdClass = keyof typeof ID_CLASS_FORMATS;
```

1. Open DB via `openIndexDb(world_slug)`.
2. `SELECT node_id FROM nodes WHERE node_id REGEXP ?` with the class regex.
3. Parse numeric component; find max; return `${prefix}-${formatNum(max+1, format)}`.
4. On empty result, return `${prefix}-0001` (or `M-1` for M class).

### 2. Tests

- `tests/tools/allocate-next-id.test.ts` — parameterized test covering every class with seeded fixtures.

## Files to Touch

- `tools/world-mcp/src/tools/allocate-next-id.ts` (new)
- `tools/world-mcp/tests/tools/allocate-next-id.test.ts` (new)

## Out of Scope

- Reserving / locking allocated ids — Phase 1 is single-writer. Race handling is SPEC-03 engine's concern.
- Updating CLAUDE.md's §ID Allocation Conventions to document `M`, `NCP`, `NCB` — SPEC-07 Part B territory; this spec conforms to implementation, not stale docs.
- Supporting id classes not in the enum — new classes require a new spec + new implementation ticket.
- Wiring into `src/server.ts` — lands in -011.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/world-mcp && npm test` — new test passes.
2. `allocate_next_id({world_slug: 'seeded', id_class: 'CF'})` against a fixture with max `CF-0047` returns `CF-0048`.
3. `allocate_next_id({world_slug: 'seeded', id_class: 'M'})` against a fixture with max `M-20` returns `M-21` (no zero-pad).
4. `allocate_next_id({world_slug: 'empty-fixture', id_class: 'NCP'})` against a fresh world returns `NCP-0001`.

### Invariants

1. All 12 id classes in the enum (`CF`, `CH`, `PA`, `CHAR`, `DA`, `PR`, `BATCH`, `NCP`, `NCB`, `AU`, `RP`, `M`) are handled. Adding a 13th requires a spec amendment.
2. Zero-padding width matches each class's documented format: 4-digit for 11 classes, single-digit numeric for `M` per SPEC-01 §Node ID scheme line 241.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/tools/allocate-next-id.test.ts` — 12 scenarios (one per class) + 2 empty-fixture scenarios (first-run for 4-digit and first-run for `M`) + 1 unknown-class rejection.

### Commands

1. `cd tools/world-mcp && npm run build && node --test dist/tests/tools/allocate-next-id.test.js`
2. Enum-exhaustiveness grep-proof: `grep -oE "'[A-Z]+':" tools/world-mcp/src/tools/allocate-next-id.ts | wc -l` returns 12.
