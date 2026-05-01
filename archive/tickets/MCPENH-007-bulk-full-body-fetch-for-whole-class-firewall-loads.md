# MCPENH-007: Bulk full-body fetch for whole-class firewall loads (`list_records` `include_full_body` flag)

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — `tools/world-mcp/src/tools/list-records.ts` (input schema extension + projection-vs-full-body branch); `tools/world-mcp/src/server.ts` (Zod input schema update); `tools/world-mcp/tests/tools/list-records.test.ts` and `tools/world-mcp/tests/server/dispatch.test.ts` (package-local proof); `.claude/skills/emergent-pressure-events/SKILL.md` (Phase 6a / Phase 6b loading guidance simplification); `.claude/skills/continuity-audit/SKILL.md` (parallel whole-class firewall loading); `tools/world-mcp/README.md`, `docs/MACHINE-FACING-LAYER.md`, and `docs/CONTEXT-PACKET-CONTRACT.md` (tool/contract documentation updates).
**Deps**: `archive/tickets/MCPENH-005.md` (registered the `emergent_pressure_events` task_type and established whole-class firewall expectations on the MCP retrieval surface); `archive/tickets/MCPENH-006-add-epe-to-id-class-enum.md` (EPE skill/MCP-source currency precedent); none on the patch engine or validators.

## Problem

At intake, `mcp__worldloom__list_records` exposed a `fields` projection parameter for token-efficient bulk listing — callers pass a list of field names (e.g., `['id', 'category', 'statement']`) and receive only those fields per record. When `fields` was omitted, the live handler already returned parsed full records, but it did not provide a named full-body mode or the `content_hash` / `file_path` metadata that `get_record` provides. This worked well for index-style listings (skim the world's full CF set; pull headlines from the M record set) but did not give skills whose primary loading pattern is **whole-class firewall enumeration with full-body access** a clear, metadata-bearing bulk affordance.

Two skills currently have this shape:

1. **`emergent-pressure-events`** (Phase 6a Invariant Conformance + Phase 6b Mystery Reserve Firewall): the skill's discipline is to test every candidate event against EVERY INV record's full statement and EVERY M record's full body — including `disallowed_cheap_answers`, `extensions[]`, `forbidden_answers`, `future_resolution_safety`, and the per-CF cross-application clauses appended via `extensions[].body`. At intake, a headline projection such as `list_records(record_type='mystery_record', fields=['id', 'title', 'status', 'future_resolution_safety'])` did NOT include the firewall surface (`disallowed_cheap_answers`, `extensions[]`). Without an explicit full-body mode, the skill either relied on unnamed default full-record behavior or had to follow up with N individual `get_record(record_id='M-N')` calls for every M record. For the animalia world (20 M records, 16 INV records), that could be up to 36 follow-up calls per Phase 6 batch.
2. **`continuity-audit`** (per `.claude/skills/continuity-audit/` description): cross-checks every CF against every INV against every M record. Same whole-class enumeration shape.

The `get_context_packet(task_type='emergent_pressure_events', ...)` profile (per archived MCPENH-005) includes every invariant and Mystery Reserve record in `governing-world-context` for safety-required inclusion in source, but this is gated by token budget and deployed MCP-server currency. Per session evidence from BATCH-0004 on 2026-04-30, the deployed MCP server schema enum may not yet accept `emergent_pressure_events` as a `task_type` value. Until the deployed-schema-stale issue is resolved (see ENGINESYNC-002), the skill must be able to use `list_records(... include_full_body=true)` as a single-call whole-class load.

The friction was that **the skill's primary firewall load either relied on an unnamed default full-record behavior without metadata or fell back to a per-record retrieval loop**. This was a structural mismatch between the MCP's current loading affordances (seed-based packet retrieval + projection/default bulk listing) and the firewall-discipline-driven skills' loading shape (whole-class enumeration with full bodies plus staleness metadata).

## Assumption Reassessment (2026-04-30)

1. The `list_records` tool input schema at `tools/world-mcp/src/tools/list-records.ts` accepted `world_slug`, `record_type`, and `fields`. Reassessment correction: the live implementation projected rows only when `fields` was non-empty; with `fields` omitted it already returned top-level parsed record fields. The missing contract was a named full-body mode that ignores `fields` and returns `get_record`-style metadata. Adding `include_full_body: boolean` is additive: when `true`, the tool returns `{ record_id, content_hash, file_path, body }` per record; when omitted or `false`, behavior is unchanged.
2. The `record_type` enum at `list_records.ts` currently accepts seven atomic-record types: `canon_fact`, `change_log_entry`, `invariant_record`, `mystery_record`, `open_question_record`, `named_entity_record`, `section_record`. EPE Phase 6 firewall loads target `invariant_record` and `mystery_record` specifically; `continuity-audit` additionally needs `canon_fact` whole-class loading. All three already exist in the enum; no enum extension is required by this ticket.
3. The atomic-source storage layout per FOUNDATIONS §Mandatory World Files is one record per YAML file under `worlds/<slug>/_source/<subdir>/`; the index stores parsed source rows in `nodes.body` with `content_hash` and `file_path`. The compiled live-handler probe after implementation confirmed `animalia` currently has 20 M records, 16 invariant records, and 48 CF records available through `include_full_body=true`.
4. Cross-skill / cross-tool boundary under audit: the contract between (a) skills with whole-class firewall loading shapes (`emergent-pressure-events` Phase 6, `continuity-audit` cross-check) as consumers of `list_records`, and (b) `tools/world-mcp/src/tools/list-records.ts` (provider). The shared schema is the `list_records` input contract and the `record_type` enum. Adding `include_full_body` to the input schema is additive; the response shape changes when the flag is `true` (full body instead of projected fields) — this is a per-call contract differentiation, not a global schema change.
5. FOUNDATIONS principle motivating this ticket: §Tooling Recommendation — "LLM agents should never operate on prose alone. They should always receive — directly or via the documented context-packet + targeted-retrieval pattern — current World Kernel + current Invariants + relevant canon fact records + affected domain files + unresolved contradictions list + mystery reserve entries touching the same domain." The phrase "current Invariants" (plural, definite article) and "mystery reserve entries touching the same domain" implies whole-class invariant access for skills whose validation surface tests against all invariants. At intake, `list_records` lacked an explicit metadata-bearing full-body mode for such loads, which pushed callers toward unnamed default behavior or per-record loops. (See also the FOUNDATIONS amendment proposal in this ticket's §Out of Scope: a brief acknowledgment that whole-class enumeration is a legitimate primary loading pattern would harden the FOUNDATIONS reference for future skills with similar shape.)
6. Adjacent FOUNDATIONS principle: §Validation Rules Rule 7 (Preserve Mystery Deliberately) requires "Unknowns must be chosen, bounded, and tracked." The EPE skill's Phase 6b firewall ("test against every M record in the loaded packet — overlap or not") is the runtime expression of Rule 7 at the candidate-event scale. A whole-class M-record load is the structural enabler of this firewall.
7. Not applicable — this ticket does not touch HARD-GATE semantics, canon-write ordering, or Canon Safety Check enforcement. The change is purely on the input retrieval surface; Canon Safety Checks remain skill-side and read-only against whatever the loaded records say.
8. Schema extension: additive new boolean flag. Existing `list_records` callers that omit the flag continue to receive the current default/projection behavior. New callers that set `include_full_body: true` receive metadata-bearing full bodies. No existing call signature is broken.
9. Adjacent contradiction surfaced during reassessment: the `emergent-pressure-events` skill still contained stale MCPENH-005-era `task_type='other'` and "enum does not yet include `emergent_pressure_events`" guidance, even though MCPENH-005 is archived as completed. This ticket corrected that same consumer paragraph while adding `include_full_body=true` Phase 6a / 6b load guidance.
10. Direct external `mcp__worldloom__list_records(...)` invocation is not exposed as a callable Codex tool in this session. Verification uses the truthful package-local substitute: direct handler tests, in-memory MCP server dispatch tests, and a compiled direct handler probe against live `animalia`.

## Architecture Check

1. Adding an `include_full_body` flag to the existing `list_records` tool is the minimal change preserving the tool's invariants (typed retrieval, bounded by record_type enum, atomic-record storage discipline). The alternative — a separate `list_full_records` tool — duplicates the input schema (world_slug, record_type) and fragments the contract; operators would need to learn two tools for what is conceptually one operation parameterized by depth.
2. No backwards-compatibility shims — the flag defaults to `false`, preserving existing behavior. No aliasing, no deprecation period required.
3. The flag's response shape is documented in the tool description and the README: when omitted or `false`, response remains `{ records: [{ record_id, ...existing top-level parsed/projected fields }], total, truncated }`; when `true`, response is `{ records: [{ record_id, content_hash, file_path, body: {...full parsed YAML...} }], total, truncated }` (matching the metadata returned by `get_record` for a single record, replicated per record in the list).

## Verification Layers

1. `list_records(world_slug='seeded', record_type='mystery_record', include_full_body=true)` returns metadata-bearing full bodies and ignores `fields` → package-local direct handler test in `tools/world-mcp/tests/tools/list-records.test.ts`.
2. `list_records(... include_full_body=true)` covers all seven supported atomic record types in a deterministic fixture → same test file.
3. Compiled direct handler probe against live `animalia` confirms the current full-body counts: `mystery_record: 20`, `invariant_record: 16`, `canon_fact: 48`.
4. `list_records(world_slug='seeded', record_type='mystery_record', fields=['disallowed_cheap_answers'])` (no `include_full_body` flag) returns the projected listing as before — unchanged behavior → same test file (regression coverage).
5. The MCP server's wrapped Zod input schema accepts `include_full_body: true` without raising "unknown property" → in-memory MCP server dispatch test in `tools/world-mcp/tests/server/dispatch.test.ts`.
6. After the skill prose updates land (§Files to Touch §3), `.claude/skills/emergent-pressure-events/SKILL.md` Phase 6a / 6b loading guidance no longer recommends per-record `get_record` loops as the primary path → grep-proof: `rg -n "individual get_record|N individual" .claude/skills/emergent-pressure-events/SKILL.md` returns zero hits.

## What to Change

### 1. Extend the `list_records` input schema

In `tools/world-mcp/src/tools/list-records.ts`:
- Add an optional input field `include_full_body: boolean` defaulting to `false`.
- Branch the implementation: when omitted/`false`, current projection/default logic; when `true`, ignore `fields` and return the parsed body from the indexed row alongside `record_id`, `content_hash`, and `file_path`.
- Update the response type to cover `{records: ProjectedRecord[]}` and `{records: FullBodyRecord[]}`.

In `tools/world-mcp/src/server.ts`:
- Update the Zod input schema for `list_records` to include the new optional flag.

### 2. Add tests

- `tools/world-mcp/tests/tools/list-records.test.ts`: add full-body-mode tests for each of the seven `record_type` enum values, asserting that the response contains full-body metadata and parsed bodies.
- `tools/world-mcp/tests/server/dispatch.test.ts`: add an MCP-server-boundary test asserting `include_full_body: true` is accepted by the Zod schema and produces the expected response shape.
- Regression: add an explicit test asserting that `fields` projection still works when `include_full_body` is omitted or `false`.

### 3. Simplify skill prose for whole-class firewall loads

In `.claude/skills/emergent-pressure-events/SKILL.md`:
- **Phase 6a (line ~222 in current file)**: replace the current prose directing per-record `get_record` follow-up with a recommendation to use `list_records(world_slug, record_type='invariant_record', include_full_body=true)` as the primary Phase 6a load. The skill's discipline (test every INV) becomes a single-call operation.
- **Phase 6b (line ~224)**: same treatment — `list_records(world_slug, record_type='mystery_record', include_full_body=true)` as the primary Phase 6b load.
- **§World-State Prerequisites (line ~110)**: update the "For records the packet does not surface, retrieve on demand" bullet list to add a `list_records(... include_full_body=true)` recommendation for whole-class loads alongside the existing `get_record` / `search_nodes` / `get_neighbors` / `find_named_entities` entries.

In `.claude/skills/continuity-audit/SKILL.md` (if the skill exists and uses similar whole-class enumeration patterns — verify at implementation time): add parallel guidance.

### 4. Update documentation

- `tools/world-mcp/README.md` and `docs/MACHINE-FACING-LAYER.md`: extend the `list_records` documentation describing the `include_full_body` flag and naming the whole-class firewall / audit consumers.
- `docs/CONTEXT-PACKET-CONTRACT.md`: add a brief subsection or footnote acknowledging that whole-class enumeration via `list_records(... include_full_body=true)` is a legitimate primary loading pattern for skills whose validation surface requires testing against every record of a class — distinct from seeded packet retrieval. (If FOUNDATIONS amendment lands per this ticket's §Out of Scope, cross-reference it.)

## Files to Touch

- `tools/world-mcp/src/tools/list-records.ts` (modify — input schema + projection-vs-full-body branch)
- `tools/world-mcp/src/server.ts` (modify — Zod input schema update for `list_records`)
- `tools/world-mcp/tests/tools/list-records.test.ts` (modify — full-body-mode coverage + regression)
- `tools/world-mcp/tests/server/dispatch.test.ts` (modify — `include_full_body` schema acceptance)
- `tools/world-mcp/README.md` (modify — `list_records` documentation update)
- `docs/MACHINE-FACING-LAYER.md` (modify — retrieval tool scope update for `include_full_body`)
- `.claude/skills/emergent-pressure-events/SKILL.md` (modify — Phase 6a / 6b primary-loading guidance + §World-State Prerequisites bullet update)
- `.claude/skills/continuity-audit/SKILL.md` (modify if applicable — parallel guidance for cross-check whole-class loads; verify shape at implementation time)
- `docs/CONTEXT-PACKET-CONTRACT.md` (modify — whole-class enumeration as a legitimate primary loading pattern)

## Out of Scope

- A new dedicated `list_full_records` tool. Operator judgment: a single tool with a flag is a smaller learning surface than two tools with overlapping schemas. If future evidence shows the flag's branch logic introduces correctness drift, that warrants a separate ticket to split the tools.
- Streaming or paginated full-body responses. Current animalia firewall surface (20 Ms × ~5KB + 16 INVs × ~500B = ~108 KB) fits a single response. If a future world reaches >50 M records or M records grow to >20 KB each, a streaming affordance becomes warranted; that's a separate ticket.
- Whole-class loads for hybrid records (`character_record`, `diegetic_artifact_record`, `adjudication_record`). These are out of scope because: (a) hybrid records are typically queried by consumer skills that DON'T have whole-class firewall discipline (character-generation reads neighbors, not the whole roster); (b) hybrid record bodies are larger (multi-paragraph prose) and risk response-budget overflow at world scale.
- A FOUNDATIONS.md amendment hardening "whole-class enumeration is a legitimate primary loading pattern". This ticket assumes the FOUNDATIONS principle is currently broad enough to permit either pattern; the proposed amendment is included as a recommendation in the prior reflection rather than a tightly-coupled change. If the user requests a FOUNDATIONS amendment, that becomes its own ticket.
- Extending the deployed MCP server's schema introspection to expose the new flag's acceptance dynamically. That falls under ENGINESYNC-002 (deployed-vs-source schema currency).

## Acceptance Criteria

### Tests That Must Pass

1. `list_records(world_slug='seeded', record_type='mystery_record', include_full_body=true)` returns full bodies with `content_hash`, `file_path`, and firewall-load fields; compiled live probe confirms `animalia` currently returns 20 M records in this shape.
2. `list_records(... include_full_body=true)` covers all seven supported atomic record types in package-local tests; compiled live probe confirms `animalia` currently returns 16 INV records and 48 CF records in this shape.
3. `list_records(world_slug='seeded', record_type='mystery_record', fields=['disallowed_cheap_answers'])` (no `include_full_body` flag) returns the projected listing — regression-safe.
4. `cd tools/world-mcp && npm test` — passes with the new test cases included.
5. `rg -n "include_full_body" tools/world-mcp/src/tools/list-records.ts tools/world-mcp/src/server.ts` confirms the flag landed in both source files.
6. `rg -n "individual get_record|N individual" .claude/skills/emergent-pressure-events/SKILL.md` returns zero hits after the skill prose update.

### Invariants

1. Existing `list_records` callers (with `fields` projection or default field set) see no behavior change.
2. The `include_full_body` flag is read-only at the MCP layer — the tool never mutates record state regardless of flag value.
3. Full-body-mode responses include the same `content_hash` and `file_path` metadata that single-record `get_record` calls return per-record, so callers can verify staleness across batched and individual retrieval paths.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/tools/list-records.test.ts` — add whole-class full-body coverage for all seven supported atomic record types, plus a regression test for projection-mode behavior.
2. `tools/world-mcp/tests/server/dispatch.test.ts` — add MCP-server-boundary test for `include_full_body` schema acceptance.

### Commands

1. `cd tools/world-mcp && npm run build`
2. `cd tools/world-mcp && npm test`
3. `rg -n "include_full_body" tools/world-mcp/src/tools/list-records.ts tools/world-mcp/src/server.ts`
4. `! rg -n "individual get_record|N individual" .claude/skills/emergent-pressure-events/SKILL.md`
5. Compiled direct handler probe: `node --input-type=module -e "import { listRecords } from './dist/src/tools/list-records.js'; ..."` returns `mystery_record: 20`, `invariant_record: 16`, and `canon_fact: 48` for live `animalia` with `{ record_id, content_hash, file_path, body }` records. Direct external MCP invocation remains post-rebuild/restart operational smoke outside this Codex session.

## Outcome

Completed on 2026-04-30.

- Added `include_full_body` to `tools/world-mcp/src/tools/list-records.ts` and the MCP server Zod schema in `tools/world-mcp/src/server.ts`.
- Full-body mode now ignores `fields` and returns `{ record_id, content_hash, file_path, body }` per atomic record while preserving existing default/projection behavior when the flag is omitted.
- Added direct handler coverage for metadata-bearing full-body mode, all seven supported atomic `record_type` values, and projection-mode regression.
- Added in-memory MCP dispatch coverage proving the wrapped schema accepts `include_full_body: true`.
- Updated `tools/world-mcp/README.md`, `docs/MACHINE-FACING-LAYER.md`, and `docs/CONTEXT-PACKET-CONTRACT.md` to document whole-class full-body enumeration.
- Updated `.claude/skills/emergent-pressure-events/SKILL.md` and `.claude/skills/continuity-audit/SKILL.md` to use `list_records(... include_full_body=true)` for deliberate whole-class firewall/audit loads.

## Verification Result

1. `cd tools/world-mcp && npm run build` — passed.
2. `cd tools/world-mcp && node --test dist/tests/tools/list-records.test.js dist/tests/server/dispatch.test.js` — passed.
3. `cd tools/world-mcp && npm test` — passed; package build plus 211 tests passed with 0 failures.
4. `cd tools/world-mcp && node --input-type=module -e "import { listRecords } from './dist/src/tools/list-records.js'; for (const record_type of ['mystery_record','invariant_record','canon_fact']) { const result = await listRecords({ world_slug: 'animalia', record_type, include_full_body: true }); console.log(record_type, JSON.stringify('records' in result ? { total: result.total, first: result.records[0] && { record_id: result.records[0].record_id, keys: Object.keys(result.records[0]).sort(), body_kind: result.records[0].body?.record_kind } } : result)); }"` — returned `mystery_record` total 20, `invariant_record` total 16, and `canon_fact` total 48, each with `["body","content_hash","file_path","record_id"]` keys on the first record.
5. `rg -n "include_full_body" tools/world-mcp/src/tools/list-records.ts tools/world-mcp/src/server.ts` — returned hits in both source files.
6. `rg -n "individual get_record|N individual" .claude/skills/emergent-pressure-events/SKILL.md` — returned no hits.
7. `git diff --check` — passed.

## Deviations

- Reassessment corrected the intake model: `list_records` was not strictly projection-only when `fields` was omitted; the implemented missing affordance is an explicit metadata-bearing full-body mode.
- Verification uses package-local direct handler and in-memory MCP dispatch tests because direct external `mcp__worldloom__list_records(...)` is unavailable in this Codex session. The live-world probe uses the compiled handler against `animalia`.
- The EPE skill still had stale MCPENH-005-era `task_type='other'` prose. This ticket corrected that same consumer paragraph while updating whole-class firewall guidance because leaving it stale would contradict the archived dependency.
- `tools/world-mcp/.secret`, `tools/world-mcp/dist/`, and `tools/world-mcp/node_modules/` are ignored package artifacts present after verification. `dist/` is expected generated output from build/test; `.secret` and `node_modules/` were already present package-local ignored state.
