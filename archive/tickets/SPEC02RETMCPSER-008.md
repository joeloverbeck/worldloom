# SPEC02RETMCPSER-008: allocate_next_id tool (12 id classes)

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — introduces `tools/world-mcp/src/tools/allocate-next-id.ts` and `tools/world-mcp/tests/tools/allocate-next-id.test.ts`.
**Deps**: SPEC02RETMCPSER-003

## Problem

Skills currently allocate new structured ids (CF, CH, PA, CHAR, DA, PR, BATCH, NCP, NCB, AU, RP, M) by greping the world directory + scanning the ledger. That pattern is fragile (relies on prose filenames; misses structured-id references inside YAML), slow (re-scans on every skill invocation), and silently drifts when CLAUDE.md's documented id classes fall behind the set world-index actually indexes. Centralizing allocation via `mcp__worldloom__allocate_next_id` pins the id-allocation contract to the indexed state and gives skills a single, exact-scan call.

## Assumption Reassessment (2026-04-23)

1. The live DB opener already exists at `tools/world-mcp/src/db/open.ts` even though active ticket `SPEC02RETMCPSER-003` is not present as a live markdown file. This ticket depends on that landed substrate, and `archive/specs/SPEC-01-world-index.md` §Node ID scheme remains the authority for the 12 structured id classes carried in `nodes.node_id`.
2. `specs/SPEC-02-retrieval-mcp-server.md` §Tool surface Tool 10 is authoritative for `allocate_next_id(world_slug, id_class)`. The enum intentionally includes `M`, `NCP`, and `NCB` beyond the older 9-class docs surface, matching the world-index contract rather than stale prose.
3. Cross-artifact boundary under audit: this ticket owns the package-local tool module and its tests only. `tools/world-mcp/src/server.ts` is still a placeholder, and ticket `SPEC02RETMCPSER-011.md` explicitly owns MCP registration and schema validation for this tool.
4. The live `tools/world-mcp` test harness uses temp repo roots plus SQLite seeding helpers in `tools/world-mcp/tests/tools/_shared.ts`, not a checked-in `tests/fixtures/seeded-world.db`. Verification should use that harness so the proof matches the package's existing boundary.
5. SQLite `REGEXP` is not a truthful dependency in the current package. The implementation should query candidate `node_id` values from `nodes` and apply class-specific regex parsing in TypeScript rather than relying on a database function the harness does not provide.
6. The `M` class uses `M-<n>` per `archive/specs/SPEC-01-world-index.md` §Node ID scheme, while the other 11 classes use four-digit zero padding. The tool must preserve both formats exactly.

## Architecture Check

1. A single tool with a discriminated `id_class` argument is cleaner than 12 per-class helpers because the scan logic is uniform and the only variance is formatting/parsing metadata per class.
2. No backwards-compatibility aliasing/shims.

## Verification Layers

1. Next-id correctness per class -> package-local unit test seeds one max id per class and asserts `allocateNextId({ world_slug, id_class })` returns the next value in the correct format.
2. First-run behavior -> package-local unit test seeds a world without the requested class and asserts `CF-0001`, `NCP-0001`, and `M-1` shapes as appropriate.
3. Class coverage and formatting contract -> codebase grep/manual review of `ID_CLASS_FORMATS` confirms all 12 classes are present and `M` uses non-padded numeric parsing.
4. Server wiring is not part of this ticket -> reassessment check against `tickets/SPEC02RETMCPSER-011.md` keeps registration out of the acceptance boundary.

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

1. Open the DB via `openIndexDb(world_slug)`.
2. Read candidate `node_id` values for the world from `nodes`.
3. Parse numeric components in TypeScript with class-specific regex metadata, track the max, and return the next formatted id.
4. On empty result for a class, return `${prefix}-0001` (or `M-1` for `M`).
5. Reject unsupported `id_class` values in the direct module API rather than silently fabricating a format.

### 2. Tests

- `tools/world-mcp/tests/tools/allocate-next-id.test.ts` — package-local tests using the existing temp-world SQLite seeding helper.

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

1. `cd tools/world-mcp && npm run build && node --test dist/tests/tools/allocate-next-id.test.js` — package-local tool build plus targeted test file pass.
2. `allocateNextId({ world_slug: 'seeded', id_class: 'CF' })` against a seeded temp world with max `CF-0047` returns `CF-0048`.
3. `allocateNextId({ world_slug: 'seeded', id_class: 'M' })` against a seeded temp world with max `M-20` returns `M-21` with no zero padding.
4. `allocateNextId({ world_slug: 'empty-fixture', id_class: 'NCP' })` against a seeded temp world with no `NCP-*` nodes returns `NCP-0001`.

### Invariants

1. All 12 id classes in the enum (`CF`, `CH`, `PA`, `CHAR`, `DA`, `PR`, `BATCH`, `NCP`, `NCB`, `AU`, `RP`, `M`) are handled. Adding a 13th requires a spec amendment.
2. Zero-padding width matches each class's documented format: 4-digit for 11 classes, single-digit numeric for `M` per SPEC-01 §Node ID scheme line 241.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/tools/allocate-next-id.test.ts` — parameterized max-id coverage for all 12 classes plus first-run cases for four-digit and `M` formats.
2. `tools/world-mcp/tests/tools/allocate-next-id.test.ts` — direct-module unsupported-class rejection using a typed escape hatch in the test only.

### Commands

1. `cd tools/world-mcp && npm run build && node --test dist/tests/tools/allocate-next-id.test.js`
2. `grep -cE "^  [A-Z]+:" tools/world-mcp/src/tools/allocate-next-id.ts` returns `12`.

## Outcome

Completed: 2026-04-23

Implemented `allocateNextId` as a read-only `nodes.node_id` scan over the per-world index with class-specific formatting metadata for all 12 structured id classes. Added package-local tests covering next-id allocation for every class, first-run allocation for four-digit and `M` formats, and direct-module rejection of unsupported classes.

## Verification Result

1. Ran `cd tools/world-mcp && npm run build && node --test dist/tests/tools/allocate-next-id.test.js` — passed.
2. Ran `cd tools/world-mcp && grep -cE "^  [A-Z]+:" src/tools/allocate-next-id.ts` — returned `12`.

## Deviations

1. Replaced the drafted SQLite `REGEXP` query and checked-in fixture assumption with the live package pattern: select candidate `node_id` rows, parse them in TypeScript, and prove behavior through the existing temp-world SQLite seeding harness.
2. Kept MCP registration out of scope because `tickets/SPEC02RETMCPSER-011.md` still owns `src/server.ts` wiring for this tool.
