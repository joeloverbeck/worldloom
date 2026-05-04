# MCPENH-030: Add server-side filter params to `mcp__worldloom__list_records` for shape/intensity/visibility-scoped whole-class loads

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — `tools/world-mcp/src/tools/list-records.ts` (`ListRecordsArgs` extension + filter-evaluation against parsed record body fields), `tools/world-mcp/src/server.ts` (input-schema + capability description), `tools/world-mcp/tests/tools/list-records.test.ts` / `tools/world-mcp/tests/tools/list-records.story-bundle.test.ts` / `tools/world-mcp/tests/server/dispatch.test.ts` (filter-coverage cases), `docs/MACHINE-FACING-LAYER.md` + `tools/world-mcp/README.md` (API surface docs); plus prose-disclosure cross-references in `.claude/skills/branching-story-page-cycle/references/pre-flight-and-prerequisites.md` §`list_records` response-size fallback (link the new filter params as the preferred narrowing path before the jq fallback).
**Deps**: `archive/tickets/MCPENH-024.md` (the Out-of-Scope clause "Per-record filtering on hybrid frontmatter content … Future ticket if needed" defers this work to a future ticket — this ticket is that future ticket, generalized to also cover atomic and story-bundle record types where the Phase 4 hard-filter pass dominates).

## Problem

Before this ticket, `mcp__worldloom__list_records(world_slug, record_type, story_slug?, fields?, include_full_body?)` returned ALL indexed records of the requested record type with no server-side filter / where-clause / pagination. The only narrowing options were:
- `fields=[...]` — projects each row to a subset of top-level body fields, but the row count is unchanged.
- `include_full_body=false` (default) — emits a metadata wrapper without the full body, but the row count is still the whole class.

At intake, high-record-count classes (storylet pools that grow across `seed` → `focus` → `audit` → `jit` modes; per-bundle storylet pool size can exceed 35 records after only one round of audit-driven top-up) could exceed the MCP transport budget even with field projection. In the observed session, the external MCP harness persisted the response and returned an `Error: result (... characters) exceeds maximum allowed tokens` notice naming the persisted path. The operator's recovery was `jq` extraction from the persisted file — operationally functional but consuming an extra round-trip and breaking the MCP-tool-as-canonical-retrieval convention.

The pre-flight pass of `branching-story-page-cycle`'s Phase 4 (storylet selection) is the canonical exemplar of this pattern: every page-cycle turn loads the storylet pool, then **immediately filters it by `shape`, `content_intensity`, `visibility.scope`, `visibility.visible_branch_path_prefix`, and `visibility.allowed_branch_ids`** as the Phase 4 hard-filter step. Server-side filtering at MCP level now lets the operator narrow the response before transport — typically reducing the response from N records (whole class) to <K records (Phase 4 hard-filter survivors) — and avoid the persisted-file-jq dance when filters narrow enough.

Concrete session evidence (2026-05-04): in this session's `branching-story-page-cycle` execution against `worlds/erotica-world/stories/marla-kern-seduction`, pre-flight called `mcp__worldloom__list_records(world_slug='erotica-world', story_slug='marla-kern-seduction', record_type='storylet_record', fields=['id', 'title', 'shape', 'content_intensity', 'hard_preconds', 'soft_preconds', 'cast_requirements', 'location_requirements', 'tone_tags', 'theme_tags', 'tension_delta', 'aftermath_weight', 'complicates_obligations', 'pays_off_obligations', 'opens_obligations', 'mystery_safety', 'visibility', 'provenance'])`. The 17-field projection across 35 storylets returned a 64,145-character response (`Error: result (64,145 characters) exceeds maximum allowed tokens. Output has been saved to /home/joeloverbeck/.claude/projects/-home-joeloverbeck-projects-worldloom/<session-uuid>/tool-results/mcp-worldloom-mcp__worldloom__list_records-<msec>.txt`). Recovery was a jq pipe extracting `id`, `shape`, `content_intensity`, `cast_requirements[].role` per row. The Phase 4 pick (`SLT-0009`) was reached after the jq dance plus per-candidate full-record `Read` calls.

A now-supported call such as `mcp__worldloom__list_records(... record_type='storylet_record', filters={shape: ['routine_disruption', 'reflection_dilemma'], content_intensity: ['mature', 'tame'], 'visibility.scope': 'global_author_pool'}, fields=['id', 'title', 'shape', 'hard_preconds', 'cast_requirements'])` can return the Phase 4 survivor set in a single transport-fitting response when the hard filters narrow enough.

The friction was operationally real (every page-cycle turn against any moderately-large pool incurred the dance) and the prose-side disclosure was added in this session's parallel `/skill-audit` pass at `.claude/skills/branching-story-page-cycle/references/pre-flight-and-prerequisites.md` §`list_records` response-size fallback — but the prose disclosure named the jq fallback as the recovery shape. This ticket landed the engine-side enhancement and truthed that disclosure to prefer filters first.

## Assumption Reassessment (2026-05-04)

1. **`list_records` arg surface confirmed before implementation** — at reassessment, `tools/world-mcp/src/tools/list-records.ts` exported `ListRecordsArgs` with exactly four properties: `record_type`, `story_slug?`, `fields?` (top-level body field projection), `include_full_body?`. No filter / where / pagination params. The tool description at `tools/world-mcp/src/server.ts` read *"list_records: Return all indexed records of a supported atomic, hybrid, or story-bundle record type, with optional field projection or include_full_body metadata/body records"* — confirming whole-class fetch was the only mode.

2. **MCPENH-024 explicitly deferred filter support** — `archive/tickets/MCPENH-024.md:86` reads: *"Per-record filtering on hybrid frontmatter content (e.g., `list_records(record_type='character_record', filters={age_band: 'late-adolescent'})`). The current atomic `list_records` does not support filtering beyond `fields` projection; extending hybrid records with richer filters would diverge from the atomic API. Future ticket if needed."* This ticket is that future ticket, generalized: filtering is needed across all three record-class shapes (atomic, hybrid, story-bundle) — the storylet-pool case in `branching-story-page-cycle` is the first concrete forced-fallback evidence; the character-pool case in `propose-new-characters` and the M / OQ enumeration in `continuity-audit` are plausibly-near-term follow-on consumers per their existing whole-class-load patterns.

3. **Cross-skill / cross-artifact shared boundary under audit** — the contract that `list_records` (the canonical MCP enumeration surface) emits responses fitting the MCP transport budget for typical world-state shapes. Per-skill consumers include: `branching-story-page-cycle` (Phase 4 storylet pool pre-filter), `branching-story-bootstrap` (whole-class M + INV firewall loads — typically fit-budget today but would benefit from filtering in worlds with many invariants), `storylet-pool-authoring` (mode-specific pool-load), `continuity-audit` (per-class enumeration cross-checks), `branching-story-health-audit` (full per-class loads for cross-checks), and `propose-new-characters` / `propose-new-canon-facts` (whole-class enumeration for diversity scoring). Adding optional filter params is additive — every existing consumer continues to work unchanged.

4. **FOUNDATIONS principle motivating this ticket** — `docs/FOUNDATIONS.md` §Tooling Recommendation commits to the "documented context-packet + targeted-retrieval pattern" with the corollary that "whole-class enumeration is a legitimate primary loading pattern" for class-bounded firewalls. The corollary's spirit is that whole-class enumeration is a load-shape, not a transport-shape — server-side filtering preserves the load-shape semantics (the operator still asks for "all storylets meeting these properties") while honoring the transport-budget constraint that `persisted_with_summary` overflow already encodes for `get_context_packet`. Without filter support, every audit-driven scan that re-loads a now-larger pool is silently pushed to the persisted-file recovery path, eroding the "MCP is the canonical retrieval surface" commitment.

5. **Output schema extension scope** — ADDITIVE-only. The `ListRecordsArgs` interface gains an optional `filters` property whose value is an object whose keys are top-level or dotted parsed-body field paths (`shape`, `content_intensity`, `visibility.scope`, etc.) and whose values are scalar or array-of-scalar membership. When `filters` is omitted or `{}`, behavior is byte-identical to the current implementation. Existing test coverage continues to pass; new tests exercise the filter paths. Unknown filter keys are rejected only after at least one parsed row of the requested type is available; an empty result set for a valid type cannot distinguish an unknown key from no matching rows, so it remains an empty success.

6. **Adjacent contradictions classification** — MCPENH-020 (persisted-summary fallback documentation across canon-pipeline-adjacent skill preflight references) and the recently-landed prose disclosure in `branching-story-page-cycle/references/pre-flight-and-prerequisites.md` §`list_records` response-size fallback both treated the persisted-file recovery as the primary remediation. They were correct for the case where filter support was absent. This ticket updated the active page-cycle prose surface to make filter params the FIRST-CHOICE narrowing strategy, with persisted-file `jq` recovery as the secondary fallback when filters cannot narrow enough.

7. **Verification correction from live package reassessment** — `list_records` itself does not implement package-owned persisted-output recovery for oversize whole-class responses; the cited persisted-file behavior is emitted by the external MCP harness when a tool response exceeds the transport budget. This ticket therefore proves filter narrowing through package-local handler and in-memory MCP dispatch tests, plus a synthetic 35+ storylet fixture whose filtered JSON is materially smaller than the unfiltered response and below a conservative transport-fitting threshold. It does not claim an unfiltered package-level persisted fallback integration test.

## Architecture Check

1. **Why this approach is cleaner than alternatives**:
   - **Alternative A — extend `fields` projection to include nested-field selection** (e.g., `fields=['shape', 'visibility.scope']` already nested): rejected because field projection narrows EACH ROW's column set, not the row count. Even with deeper projection, 35 rows × N projected fields can still overflow when N is moderate.
   - **Alternative B — add server-side pagination (`limit` / `offset` / `cursor`) without filtering**: rejected because Phase 4 storylet selection is fundamentally a hard-filter-then-score pattern, not a paginated scan. Pagination would force operators to reconstruct filter logic client-side and emit N MCP calls instead of one. The whole point of moving filtering to the server is to land the typical narrowing primitive (shape ∈ {X, Y}, intensity ∈ {Z, W}) where the index already has the data structurally.
   - **Alternative C — extend `get_context_packet` to register a `task_type='storylet_pool_filter'`** with shape/intensity narrowing built in: rejected because the storylet-pool-load is a flat enumeration, not a context-packet-shaped neighborhood retrieval; adding a packet-task type adds orchestration overhead (seed-resolution, governing-summary-fallback handling, persisted-output-path machinery) for a use case that just wants `WHERE shape IN ('routine_disruption', 'reflection_dilemma')`.
   - The chosen approach (additive `filters` object on `list_records`) follows the principle "extend the existing primitive rather than introduce a new one when the existing primitive's contract permits the extension." `list_records` is already the whole-class enumeration tool; adding filtering preserves the contract surface and minimizes consumer churn.

2. **No backwards-compatibility shims**: when `filters` is absent or empty `{}`, the implementation path is byte-identical to the current code. No alias-tool, no dual-API-version, no deprecation warning. Existing consumers run unchanged; new consumers opt into the new arg.

## Verification Layers

1. **`filters` arg accepted and applied at server side** → codebase grep-proof: `grep -nE 'filters' tools/world-mcp/src/tools/list-records.ts tools/world-mcp/src/server.ts` returns hits in the args interface declaration, server input schema, and row-filter evaluation path.
2. **Filter-applied response fits a conservative transport-size threshold for the canonical storylet-pool case** → `tools/world-mcp/tests/tools/list-records.story-bundle.test.ts` uses a fixture story bundle with 40 storylets, calls `list_records(record_type='storylet_record', filters={shape: ['routine_disruption', 'reflection_dilemma'], content_intensity: ['mature', 'tame'], 'visibility.scope': 'global_author_pool'}, fields=[...])`, and asserts the filtered response is materially smaller than the whole-class response and below 20,000 JSON characters.
3. **Empty / absent `filters` preserves current behavior** → existing test suite continues to pass without modification; an explicit "filter-absent" case asserts byte-identical output to the pre-change implementation against a fixed fixture.
4. **Filter semantics align with index-row schema** → type-check + manual review: filter keys map to top-level body fields (or dotted paths for nested) that exist in the indexer's row representation; unknown filter keys return a structured `invalid_input` error naming the unknown key, parallel to the existing `invalid_input` for unsupported `record_type` values.
5. **Cross-skill prose surfaces updated to recommend filter params first** → grep-proof: `grep -nE 'list_records.*filters|filters.*list_records' .claude/skills/branching-story-page-cycle/references/pre-flight-and-prerequisites.md` returns at least one hit naming filter params before the jq fallback; the docs-side update lands as Item 8 of the Files-to-Touch list.

## Landed Changes

### 1. Extend `ListRecordsArgs` interface

In `tools/world-mcp/src/tools/list-records.ts`, `ListRecordsArgs` now includes optional `filters`:

```typescript
export interface ListRecordsArgs {
  record_type: ListRecordType;
  story_slug?: string;
  fields?: string[];
  include_full_body?: boolean;
  filters?: ListRecordFilters;
}

export type ListRecordFilters = Record<string, ListRecordFilterValue>;
export type ListRecordFilterValue =
  | string                         // exact match
  | number
  | boolean
  | ReadonlyArray<string | number | boolean>;  // membership (any-of)
```

Filter keys are dotted-path strings against the parsed record body or hybrid frontmatter source (e.g., `'shape'`, `'content_intensity'`, `'visibility.scope'`, `'visibility.visible_branch_path_prefix'`). Filter values are scalar exact matches or array any-of membership. Array-valued record fields match when any record value appears in the filter set.

### 2. Apply filters in the row-projection pipeline

The row-projection pipeline now parses each row, validates active filter keys against parsed records when rows exist, evaluates every filter with AND semantics, and drops failing rows before projection / full-body emission. Omitted `filters` and `{}` preserve the pre-change output exactly.

### 3. Server schema + capability description update

`tools/world-mcp/src/server.ts` now accepts `filters` in the Zod input schema and describes scalar, array, and dotted-path usage in the registered `list_records` capability text.

### 4. Filter-eval unit tests

`tools/world-mcp/tests/tools/list-records.test.ts` covers scalar filters, array membership, array-valued record fields, AND semantics, absent-vs-empty filter identity, unknown-key `invalid_input`, and hybrid frontmatter filters.

### 5. Story bundle response-size proof

`tools/world-mcp/tests/tools/list-records.story-bundle.test.ts` includes a 40-storylet fixture; the filtered request uses `shape`, `content_intensity`, `visibility.scope`, and `visibility.allowed_branch_ids`, returns 8 records, is materially smaller than the 40-record response, and stays below a conservative 20,000-character threshold. This intentionally does not assert package-authored persisted-file behavior because the live `list_records` handler returns JSON and the persisted-file notice is an external MCP harness overflow behavior.

### 6. Update `tools/world-mcp/README.md`

Documented the new `filters` arg in the `list_records` API section, with the same dotted-path / scalar-or-array semantics example as the implementation.

### 7. Update `docs/MACHINE-FACING-LAYER.md`

Extended the `list_records` row in §MCP retrieval surface with dotted-path semantics, scalar / array-of-scalars filter-value forms, array-valued record field behavior, and filter-before-fallback guidance.

### 8. Update `branching-story-page-cycle/references/pre-flight-and-prerequisites.md`

The §`list_records` response-size fallback paragraph now recommends server-side `filters={...}` as the first-choice Phase 4 storylet-pool narrowing strategy, with persisted-file `jq` recovery only after filters cannot bring the response under the transport budget.

## Files to Touch

- `tools/world-mcp/src/tools/list-records.ts` (modify)
- `tools/world-mcp/src/server.ts` (modify)
- `tools/world-mcp/tests/tools/list-records.test.ts` (modify)
- `tools/world-mcp/tests/tools/list-records.story-bundle.test.ts` (modify)
- `tools/world-mcp/tests/server/dispatch.test.ts` (modify)
- `tools/world-mcp/README.md` (modify)
- `docs/MACHINE-FACING-LAYER.md` (modify)
- `.claude/skills/branching-story-page-cycle/references/pre-flight-and-prerequisites.md` (modify — update §`list_records` response-size fallback to recommend filter params first)

## Out of Scope

- **Filter-by-arbitrary-prose-content** (e.g., full-text search of `notes` field): rejected as a separate concern — `mcp__worldloom__search_nodes` is the prose-search surface; `list_records` filter is a structured-field narrowing primitive only.
- **Per-skill filter idiom enforcement** (e.g., requiring `branching-story-page-cycle`'s Phase 4 to use filters rather than the manual jq fallback as a structural rule): the prose update in Item 8 above documents the recommendation; structural enforcement (a Phase 9 gate, a validator, a hook) is a separate skill-prose decision and out of scope here.
- **Sibling cascade of the `filters` arg into other MCP tools** (`get_records`, `get_record_field`, `find_named_entities`): each tool has its own narrowing semantics; unifying them would be a much larger refactor. This ticket lands `list_records.filters` only.
- **Pagination / cursor-based scrolling**: Alternative B from the Architecture Check; not in scope.
- **Migrating existing storylet-pool sizes downward** (e.g., truncating SLB batches to fit transport without filters): the storylet-pool-authoring skill's batch sizing is governed by its own design; this ticket adds capability to the retrieval surface, not to the production surface.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/world-mcp && node --test dist/tests/tools/list-records.test.js` — all filter-coverage cases pass: scalar match, array membership, dotted-path navigation, AND combination, empty-filters byte-identity, unknown-key error.
2. `cd tools/world-mcp && node --test dist/tests/tools/list-records.story-bundle.test.js dist/tests/server/dispatch.test.js` — fixture-bundle filter-narrowing fits a conservative response-size threshold and in-memory MCP dispatch accepts the `filters` schema.
3. `cd tools/world-mcp && npm test` — full package suite passes.
4. `grep -nE 'filters' .claude/skills/branching-story-page-cycle/references/pre-flight-and-prerequisites.md` — at least one hit in the §`list_records` response-size fallback section recommending filter params before the jq fallback.

### Invariants

1. **Additive-only API surface**: `list_records` calls without `filters` arg or with `filters={}` produce byte-identical output to the pre-change implementation. No existing consumer breaks.
2. **Index-faithful filter semantics**: every filter key maps to a top-level body field or dotted path that exists in the parsed row shape for the requested `record_type`. For non-empty record sets, unknown keys return `invalid_input` errors with the offending key named — silent acceptance of unknown keys is forbidden because it would mask typos as zero-row results.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/tools/list-records.test.ts` — add filter-coverage cases per Item 4 above.
2. `tools/world-mcp/tests/tools/list-records.story-bundle.test.ts` — fixture bundle with 35+ storylets; response-size reduction and transport-fitting pinning.
3. `tools/world-mcp/tests/server/dispatch.test.ts` — in-memory MCP dispatch schema coverage for `filters`.

### Commands

1. `cd tools/world-mcp && npm run build`.
2. `cd tools/world-mcp && node --test dist/tests/tools/list-records.test.js dist/tests/tools/list-records.story-bundle.test.js dist/tests/server/dispatch.test.js`.
3. `cd tools/world-mcp && npm test`.
4. `grep -nE 'filters' .claude/skills/branching-story-page-cycle/references/pre-flight-and-prerequisites.md` — verify cross-skill prose update landed.
5. `grep -nE 'list_records.*filters|filters.*list_records' tools/world-mcp/README.md docs/MACHINE-FACING-LAYER.md` — verify docs updates.

## Outcome

Implemented additive server-side filtering for `mcp__worldloom__list_records`.

- `ListRecordsArgs` now accepts optional `filters`.
- Filter values support scalar exact match and array any-of membership.
- Filter keys support dotted paths into parsed record bodies, including nested storylet visibility fields.
- Array-valued record fields match when any record value appears in the filter set.
- Hybrid filters can address frontmatter fields directly or through `frontmatter.<key>`.
- Unknown filter keys return `invalid_input` for non-empty record sets.
- Filtering happens before projection / full-body wrapping, while omitted `filters` and `{}` preserve existing output.
- Server schema/capability text, package README, repo machine-facing docs, and the page-cycle pre-flight fallback prose now describe filters as the first-choice narrowing path for large predictable loads.

## Verification Result

Passed:

1. `cd tools/world-mcp && npm run build`.
2. `cd tools/world-mcp && node --test dist/tests/tools/list-records.test.js dist/tests/tools/list-records.story-bundle.test.js dist/tests/server/dispatch.test.js` — focused compiled handler/story-bundle/dispatch proof passed.
3. `cd tools/world-mcp && npm test` — full package suite passed after rebuild (`325` passing tests).
4. `grep -nE 'list_records.*filters|filters.*list_records' .claude/skills/branching-story-page-cycle/references/pre-flight-and-prerequisites.md` — confirmed skill prose recommends server-side filters before persisted-file `jq` fallback.
5. `grep -nE 'list_records.*filters|filters.*list_records' tools/world-mcp/README.md docs/MACHINE-FACING-LAYER.md` — confirmed package and repo machine-facing docs describe the filter surface.
6. Stale-anchor sweep over `tools/world-mcp/src`, `tools/world-mcp/README.md`, `docs/MACHINE-FACING-LAYER.md`, and `.claude/skills/branching-story-page-cycle` found no remaining same-seam `list_records` description that still says only field projection / `include_full_body` is available.

Direct external `mcp__worldloom__list_records(...)` smoke was not claimed because this run changed source and validated through package-local build/tests plus in-memory MCP dispatch, not through a restarted deployed MCP connector.

## Deviations

- The drafted package-level persisted-overflow integration test was replaced with a package-local 40-storylet response-size reduction test. The live `list_records` handler returns JSON; the observed persisted-file notice is external MCP harness behavior, not package-owned behavior.
- Unknown filter keys can only be rejected when at least one parsed row of the requested type exists. For an empty valid record set, the handler returns an empty success because it cannot distinguish an unknown filter path from a valid path with no matching rows.
- `tools/world-mcp/.secret`, `tools/world-mcp/node_modules/`, and `tools/world-mcp/dist/` were ignored package artifacts in the package-scoped status snapshot; `dist/` was refreshed by `npm run build` / `npm test`.
