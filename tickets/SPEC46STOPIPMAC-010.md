# SPEC46STOPIPMAC-010: CLK edge extraction (3 edges: linked_records, driver, tick_history.event) + placeholder-skip convention

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `tools/world-index/src/schema/types.ts` (3 new edge types in `STORY_EDGE_TYPES`), `tools/world-index/src/parse/atomic.ts` (new `edgesForStoryClock` helper + dispatch wiring + placeholder-skip convention application), `tools/world-index/tests/story-bundle-edges.test.ts` (append per-class tests including placeholder-skip case)
**Deps**: None

## Problem

The world-index story-edge extraction at `tools/world-index/src/parse/atomic.ts:564` does not extract `CLK` (pressure clock) record relations. Clock-to-linked-record provenance (`CLK.linked_records[]`), clock driver (`CLK.driver` — entity or placeholder), and clock tick-history event provenance (`CLK.tick_history[].event`) are schema-defined on the `CLK` record per SPEC-42 §4.5.14 but are not extracted as edges. The `CLK.driver` field is the first Phase C source field that requires the **placeholder-skip convention** — `driver` accepts `group:<name>`, `system`, `unknown`, or `STENT-<integer>` values, and edges emit only when the value resolves to a known node id (placeholder values are silently skipped per spec §Group/system reference convention). This ticket adds the three `CLK`-rooted edges and applies the placeholder-skip convention for the first time.

## Assumption Reassessment (2026-05-18)

1. `tools/world-index/src/schema/types.ts:84-99` declares `STORY_EDGE_TYPES`; `tools/world-index/src/parse/atomic.ts:564` is the dispatch site. The `CLK` schema at SPEC-42 §4.5.14 (archived spec) and `.claude/skills/_shared-templates/story-record-schemas.md` §4.5.14 carries `linked_records: [THR | OBL | CNSQ | STINT | SREL | STLOC | STOBJ | STQ ids]`, `driver: STENT-<integer> | group:<name> | system | unknown`, and `tick_history: [{event: SE-<integer>, delta, cause}]` fields.
2. `specs/SPEC-46-story-pipeline-machine-facing-foundation-fixes.md` §Phase C table specifies the three CLK edges and explicitly notes the `driver` placeholder-skip behavior (`group:/system/unknown drivers do not emit`). The §Group/system reference convention paragraph names CLK as one of two record classes where this convention applies (the other being STSEC.holders, covered by SPEC46STOPIPMAC-011). The §Tick-history granularity paragraph specifies that `clock_tick_event` emits one row per `event` entry; `delta` and `cause` are not encoded as edge properties.
3. Cross-skill boundary: the world-index edge extraction is consumed by MCP graph-walking helpers. The placeholder-skip convention matches SPEC-45's `creation_evidence` handling of non-id evidence — edges capture record-to-record relations, while abstract drivers (groups, system, unknown) remain on the source record retrievable via `get_record`.
4. FOUNDATIONS §Tooling Recommendation motivates this ticket: making CLK linkage and tick-history graph-queryable supports the `clock_at_least` / `clock_below` / `clock_full` predicates per `story-state-contract.md` §5 and prepares for future audit views (clock-tick walks). FOUNDATIONS §Rule 4 (No Globalization by Accident) is preserved by `createStoryRefEdge`.

## Architecture Check

1. Per-class helper pattern matches SPEC46STOPIPMAC-006's `edgesForStoryBelief`, extended with the placeholder-skip convention for `driver`. The placeholder check is a simple string-prefix / equality test: emit edge only when value starts with a known node-id prefix (`STENT-`, etc.) and not when value equals `system`, `unknown`, or starts with `group:`. The `tick_history[]` iteration follows SPEC-45's `creation_evidence` pattern — one edge per array element, payload-fields (`delta`, `cause`) stay on the source record.
2. No backwards-compatibility aliasing or shims introduced. The placeholder-skip convention is the first per-class application; SPEC46STOPIPMAC-011 (STSEC) reuses it for `STSEC.holders[]`. The implementation ticket may factor the placeholder check into a shared helper if reuse motivates it.

## Verification Layers

1. **Per-edge positive case** → schema validation: fixture `CLK` records with `linked_records[]` and `tick_history[]` populated emit the expected edges with correct source / target / `edge_type`; fixture with `driver: STENT-1` emits one `clock_driver` edge.
2. **Per-edge negative case** → schema validation: fixture `CLK` with empty arrays emits no edges.
3. **Placeholder-skip case** → schema validation: fixture `CLK` with `driver: system`, `driver: unknown`, or `driver: group:watchmen` emits NO `clock_driver` edge — the placeholder values are silently skipped (T-7 scope, placeholder sub-check).
4. **Tick-history granularity** → schema validation: a `tick_history[]` with three entries emits exactly three `clock_tick_event` edges (one per `event` field); `delta` and `cause` payloads are NOT encoded as edge properties.
5. **No regression on existing edges** → `npm test --prefix tools/world-index` passes for the full world-index test suite.

## What to Change

### 1. Extend `STORY_EDGE_TYPES` with three new edge type strings

In `tools/world-index/src/schema/types.ts:84-99`, add three entries to `STORY_EDGE_TYPES`: `"clock_linked_record"`, `"clock_driver"`, `"clock_tick_event"`.

### 2. Implement `edgesForStoryClock` helper with placeholder-skip convention

In `tools/world-index/src/parse/atomic.ts`, add `edgesForStoryClock(node: NodeRow, record: Record<string, unknown>, storySlug: string): EdgeRow[]`:
- `CLK.linked_records[]` → iterate and emit one `clock_linked_record` edge per record id.
- `CLK.driver` → emit one `clock_driver` edge ONLY when the value resolves to a known node-id prefix; skip when value is `system`, `unknown`, or starts with `group:`. Use a small helper function (inline or factored) to encapsulate the placeholder check.
- `CLK.tick_history[].event` → iterate and emit one `clock_tick_event` edge per `event` field; `delta` and `cause` are not encoded as edge properties.

### 3. Wire `edgesForStoryClock` into `edgesForStoryRecord` dispatch

In `tools/world-index/src/parse/atomic.ts:564`, add a dispatch branch for the `story_pressure_clock_record` node type.

### 4. Append CLK tests to `tools/world-index/tests/story-bundle-edges.test.ts`

Append positive + negative + placeholder-skip tests for all three CLK edges. The placeholder-skip test covers the three placeholder forms (`system`, `unknown`, `group:<name>`) for `driver` and asserts no `clock_driver` edge emits.

## Files to Touch

- `tools/world-index/src/schema/types.ts` (modify — add 3 entries to `STORY_EDGE_TYPES`; mechanical merge with sibling per-class tickets)
- `tools/world-index/src/parse/atomic.ts` (modify — add `edgesForStoryClock` + dispatch wiring + placeholder-check helper)
- `tools/world-index/tests/story-bundle-edges.test.ts` (modify — append CLK tests including placeholder-skip cases)

## Out of Scope

- Other per-class extractors (BEL in 006, SREL in 007, STINT in 008, STSTAT in 009, STSEC in 011, STQ in 012, SE extension in 013).
- `STORY_EDGE_TYPES.length === 36` registry-completeness assertion — capstone ticket 015.
- `docs/MACHINE-FACING-LAYER.md` story-edge enumeration update — covered by SPEC46STOPIPMAC-014; that ticket also documents the placeholder-skip convention's rationale per spec §R-3.
- `clock_tick_event` payload-field encoding (`delta`, `cause`) — explicitly excluded per spec §Tick-history granularity; payload remains on the source record.

## Acceptance Criteria

### Tests That Must Pass

1. Positive tests for `clock_linked_record`, `clock_driver` (with STENT-prefixed driver), and `clock_tick_event` — each emits expected edges with correct source / target / `edge_type` (T-7 scope).
2. Negative tests — empty arrays / null fields emit no edges.
3. Placeholder-skip tests for `clock_driver` — `driver: system`, `driver: unknown`, `driver: group:<name>` each emit zero `clock_driver` edges.
4. Tick-history granularity test — 3-entry `tick_history[]` produces exactly 3 `clock_tick_event` edges.
5. `npm test --prefix tools/world-index` passes for the full world-index test suite.
6. `npm run build --prefix tools/world-index` typechecks cleanly.

### Invariants

1. Every emitted edge carries `storySlug` via `createStoryRefEdge` — bundle isolation is preserved (FOUNDATIONS §Rule 4 discipline).
2. Placeholder values (`system`, `unknown`, `group:<name>`) NEVER produce edges — the convention is uniform per spec §Group/system reference convention.
3. `clock_tick_event` edges encode only `event` field references; `delta` and `cause` payloads stay on the source record per spec §Tick-history granularity.

## Test Plan

### New/Modified Tests

1. `tools/world-index/tests/story-bundle-edges.test.ts` — append positive + negative + placeholder-skip + tick-history-granularity tests for the three CLK edges.

### Commands

1. `npm test --prefix tools/world-index` (targeted: full world-index test suite passes including new CLK edge tests + placeholder-skip cases)
2. `npm run build --prefix tools/world-index` (typechecks the extended `STORY_EDGE_TYPES`)
