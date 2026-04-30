# MCPENH-007: Bulk full-body fetch for whole-class firewall loads (`list_records` `include_full_body` flag)

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — `tools/world-mcp/src/tools/list-records.ts` (input schema extension + projection-vs-full-body branch); `tools/world-mcp/src/server.ts` (Zod input schema update); `tools/world-mcp/tests/tools/list-records.test.ts` and `tools/world-mcp/tests/server/dispatch.test.ts` (package-local proof); `.claude/skills/emergent-pressure-events/SKILL.md` (Phase 6a / Phase 6b loading guidance simplification); `.claude/skills/continuity-audit/SKILL.md` if applicable (parallel whole-class firewall loading); `tools/world-mcp/README.md` (tool documentation update).
**Deps**: MCPENH-005 (registered the `emergent_pressure_events` task_type and established whole-class firewall expectations on the MCP retrieval surface); none on the patch engine or validators.

## Problem

`mcp__worldloom__list_records` currently exposes a `fields` projection parameter for token-efficient bulk listing — callers pass a list of field names (e.g., `['id', 'category', 'statement']`) and receive only those fields per record. This works well for index-style listings (skim the world's full CF set; pull headlines from the M record set) but does not satisfy skills whose primary loading pattern is **whole-class firewall enumeration with full-body access**.

Two skills currently have this shape:

1. **`emergent-pressure-events`** (Phase 6a Invariant Conformance + Phase 6b Mystery Reserve Firewall): the skill's discipline is to test every candidate event against EVERY INV record's full statement and EVERY M record's full body — including `disallowed_cheap_answers`, `extensions[]`, `forbidden_answers`, `future_resolution_safety`, and the per-CF cross-application clauses appended via `extensions[].body`. The headline projection returned by `list_records(record_type='mystery_reserve', fields=['id', 'title', 'status', 'future_resolution_safety'])` does NOT include the firewall surface (`disallowed_cheap_answers`, `extensions[]`). To do the firewall correctly, the skill must follow up with N individual `get_record(record_id='M-N')` calls for every M record. For the animalia world (20 M records, 16 INV records), that's up to 36 follow-up calls per Phase 6 batch.
2. **`continuity-audit`** (per `.claude/skills/continuity-audit/` description): cross-checks every CF against every INV against every M record. Same whole-class enumeration shape.

The `get_context_packet(task_type='emergent_pressure_events', ...)` profile (per archived MCPENH-005) reportedly includes "every invariant and Mystery Reserve record" in `governing-world-context` for safety-required inclusion — but this is gated by token budget, ranking-profile relevance, and (per session evidence from BATCH-0004 on 2026-04-30) the deployed MCP server schema enum may not yet accept `emergent_pressure_events` as a `task_type` value. Until the deployed-schema-stale issue is resolved (see ENGINESYNC-002), the packet route is unavailable and the skill must use `list_records` + N individual `get_record` calls.

The friction is that **the skill's primary firewall load is forced through a per-record retrieval loop that the MCP could deliver in a single bulk call** if `list_records` had a full-body affordance. This is a structural mismatch between the MCP's current loading affordances (seed-based packet retrieval + projection-based bulk listing) and the firewall-discipline-driven skills' loading shape (whole-class enumeration with full bodies).

## Assumption Reassessment (2026-04-30)

1. The `list_records` tool input schema at `tools/world-mcp/src/tools/list-records.ts` (or the equivalent path under `tools/world-mcp/src/`) currently accepts `world_slug`, `record_type`, and `fields`. The implementation projects each row to the requested fields. Adding an `include_full_body: boolean` flag (default `false`) is additive: when `true`, the tool ignores `fields` and returns the full record body parsed from the atomic YAML file under `worlds/<slug>/_source/<subdir>/`. When `false`, behavior is unchanged.
2. The `record_type` enum at `list_records.ts` currently accepts seven atomic-record types: `canon_fact`, `change_log_entry`, `invariant_record`, `mystery_record`, `open_question_record`, `named_entity_record`, `section_record`. EPE Phase 6 firewall loads target `invariant_record` and `mystery_record` specifically; `continuity-audit` additionally needs `canon_fact` whole-class loading. All three already exist in the enum; no enum extension is required by this ticket.
3. The atomic-source storage layout per FOUNDATIONS §Canonical Storage Layer + §Mandatory World Files is one record per YAML file under `worlds/<slug>/_source/<subdir>/`. The full body for an INV record (e.g., `_source/invariants/ONT-1.yaml`) is small (typically <500 bytes); for an M record with multiple `extensions[]` entries (e.g., `_source/mystery-reserve/M-1.yaml` for animalia, with five `extensions` populated by CH-0008 / CH-0009 / CH-0013 / CH-0014 / CH-0015) it can reach 4–8 KB. A whole-class load of 20 M records for animalia totals approximately 30–60 KB of YAML body content — well within a single MCP response payload budget.
4. Cross-skill / cross-tool boundary under audit: the contract between (a) skills with whole-class firewall loading shapes (`emergent-pressure-events` Phase 6, `continuity-audit` cross-check) as consumers of `list_records`, and (b) `tools/world-mcp/src/tools/list-records.ts` (provider). The shared schema is the `list_records` input contract and the `record_type` enum. Adding `include_full_body` to the input schema is additive; the response shape changes when the flag is `true` (full body instead of projected fields) — this is a per-call contract differentiation, not a global schema change.
5. FOUNDATIONS principle motivating this ticket: §Tooling Recommendation — "LLM agents should never operate on prose alone. They should always receive — directly or via the documented context-packet + targeted-retrieval pattern — current World Kernel + current Invariants + relevant canon fact records + affected domain files + unresolved contradictions list + mystery reserve entries touching the same domain." The phrase "current Invariants" (plural, definite article) and "mystery reserve entries touching the same domain" implies whole-class invariant access for skills whose validation surface tests against all invariants. The current `list_records` projection-only shape forces such skills into per-record retrieval loops, which is a tooling-layer downgrade relative to the FOUNDATIONS principle. (See also the FOUNDATIONS amendment proposal in this ticket's §Out of Scope: a brief acknowledgment that whole-class enumeration is a legitimate primary loading pattern would harden the FOUNDATIONS reference for future skills with similar shape.)
6. Adjacent FOUNDATIONS principle: §Validation Rules Rule 7 (Preserve Mystery Deliberately) requires "Unknowns must be chosen, bounded, and tracked." The EPE skill's Phase 6b firewall ("test against every M record in the loaded packet — overlap or not") is the runtime expression of Rule 7 at the candidate-event scale. A whole-class M-record load is the structural enabler of this firewall.
7. Not applicable — this ticket does not touch HARD-GATE semantics, canon-write ordering, or Canon Safety Check enforcement. The change is purely on the input retrieval surface; Canon Safety Checks remain skill-side and read-only against whatever the loaded records say.
8. Schema extension: additive new boolean flag with `default: false`. Existing `list_records` callers that omit the flag continue to receive projected listings. New callers that set `include_full_body: true` receive full bodies. No existing call signature is broken.
9. Adjacent contradiction surfaced during reassessment: the `emergent-pressure-events` skill's Phase 6a / 6b prose currently directs callers to use `search_nodes` / `get_record` for follow-up retrieval beyond the projection-only `list_records` listing. After this ticket lands, the skill prose should be simplified to recommend `list_records(record_type='invariant_record', include_full_body=true)` as the primary Phase 6a load and `list_records(record_type='mystery_record', include_full_body=true)` as the primary Phase 6b load — with `get_record` as the per-record follow-up only when a specific record needs deeper inspection (e.g., an extension's full body context for adjudication).

## Architecture Check

1. Adding an `include_full_body` flag to the existing `list_records` tool is the minimal change preserving the tool's invariants (typed retrieval, bounded by record_type enum, atomic-record storage discipline). The alternative — a separate `list_full_records` tool — duplicates the input schema (world_slug, record_type) and fragments the contract; operators would need to learn two tools for what is conceptually one operation parameterized by depth.
2. No backwards-compatibility shims — the flag defaults to `false`, preserving existing behavior. No aliasing, no deprecation period required.
3. The flag's response shape is documented in the tool description and the README: when `false`, response is `{records: [{id, ...projected_fields}]}`; when `true`, response is `{records: [{id, content_hash, file_path, body: {...full parsed YAML...}}]}` (matching the shape returned by `get_record` for a single record, replicated per record in the list).

## Verification Layers

1. `list_records(world_slug='animalia', record_type='mystery_record', include_full_body=true)` returns 20 records (the full M-record set for animalia) each with `disallowed_cheap_answers`, `extensions[]`, `domains_touched`, and other body fields populated → package-local direct handler test in `tools/world-mcp/tests/tools/list-records.test.ts`.
2. `list_records(world_slug='animalia', record_type='invariant_record', include_full_body=true)` returns 16 records each with the full `statement` plus any optional fields (`rationale`, `examples`, `non_examples`, `break_conditions`, `revision_difficulty` if present per the FOUNDATIONS schema) → same test file.
3. `list_records(world_slug='animalia', record_type='canon_fact', include_full_body=true)` returns the full CF set with full-body retrieval (every `costs_and_limits`, `visible_consequences`, `distribution`, `epistemic_profile` entry populated) → same test file.
4. `list_records(world_slug='animalia', record_type='mystery_record', fields=['id', 'title', 'status'])` (existing call signature, no `include_full_body` flag) returns the projected listing as before — unchanged behavior → same test file (regression coverage).
5. The MCP server's wrapped Zod input schema accepts `include_full_body: true` without raising "unknown property" → in-memory MCP server dispatch test in `tools/world-mcp/tests/server/dispatch.test.ts`.
6. After the skill prose updates land (§Files to Touch §3), `.claude/skills/emergent-pressure-events/SKILL.md` Phase 6a / 6b loading guidance no longer recommends per-record `get_record` loops as the primary path → grep-proof: `rg -n "individual get_record|N individual" .claude/skills/emergent-pressure-events/SKILL.md` returns zero hits.

## What to Change

### 1. Extend the `list_records` input schema

In `tools/world-mcp/src/tools/list-records.ts`:
- Add an optional input field `include_full_body: boolean` defaulting to `false`.
- Branch the implementation: when `false`, current projection logic; when `true`, ignore `fields` and read each record's atomic YAML file in full, returning the parsed body alongside `id`, `content_hash`, and `file_path`.
- Update the response type to be a discriminated union over the flag (`{records: ProjectedRecord[]}` vs `{records: FullBodyRecord[]}`), or use a uniform shape where the body is `null` when the flag is `false`.

In `tools/world-mcp/src/server.ts`:
- Update the Zod input schema for `list_records` to include the new optional flag.

### 2. Add tests

- `tools/world-mcp/tests/tools/list-records.test.ts`: add full-body-mode tests for each of the seven `record_type` enum values, asserting that the response contains the full body fields appropriate to the record class.
- `tools/world-mcp/tests/server/dispatch.test.ts`: add an MCP-server-boundary test asserting `include_full_body: true` is accepted by the Zod schema and produces the expected response shape.
- Regression: add an explicit test asserting that `fields` projection still works when `include_full_body` is omitted or `false`.

### 3. Simplify skill prose for whole-class firewall loads

In `.claude/skills/emergent-pressure-events/SKILL.md`:
- **Phase 6a (line ~222 in current file)**: replace the current prose directing per-record `get_record` follow-up with a recommendation to use `list_records(world_slug, record_type='invariant_record', include_full_body=true)` as the primary Phase 6a load. The skill's discipline (test every INV) becomes a single-call operation.
- **Phase 6b (line ~224)**: same treatment — `list_records(world_slug, record_type='mystery_record', include_full_body=true)` as the primary Phase 6b load.
- **§World-State Prerequisites (line ~110)**: update the "For records the packet does not surface, retrieve on demand" bullet list to add a `list_records(... include_full_body=true)` recommendation for whole-class loads alongside the existing `get_record` / `search_nodes` / `get_neighbors` / `find_named_entities` entries.

In `.claude/skills/continuity-audit/SKILL.md` (if the skill exists and uses similar whole-class enumeration patterns — verify at implementation time): add parallel guidance.

### 4. Update documentation

- `tools/world-mcp/README.md`: add a `list_records` documentation section (or extend an existing one) describing the `include_full_body` flag and naming the two whole-class firewall consumers (EPE Phase 6, continuity-audit cross-check).
- `docs/CONTEXT-PACKET-CONTRACT.md`: add a brief subsection or footnote acknowledging that whole-class enumeration via `list_records(... include_full_body=true)` is a legitimate primary loading pattern for skills whose validation surface requires testing against every record of a class — distinct from seeded packet retrieval. (If FOUNDATIONS amendment lands per this ticket's §Out of Scope, cross-reference it.)

## Files to Touch

- `tools/world-mcp/src/tools/list-records.ts` (modify — input schema + projection-vs-full-body branch)
- `tools/world-mcp/src/server.ts` (modify — Zod input schema update for `list_records`)
- `tools/world-mcp/tests/tools/list-records.test.ts` (modify — full-body-mode coverage + regression)
- `tools/world-mcp/tests/server/dispatch.test.ts` (modify — `include_full_body` schema acceptance)
- `tools/world-mcp/README.md` (modify — `list_records` documentation update)
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

1. `list_records(world_slug='animalia', record_type='mystery_record', include_full_body=true)` returns 20 M records with full bodies (animalia's current mystery-reserve registry per BATCH-0004 enumeration), each including `disallowed_cheap_answers`, `extensions[]`, and other firewall-load fields.
2. `list_records(world_slug='animalia', record_type='invariant_record', include_full_body=true)` returns 16 INV records with full bodies including the `statement` field for each.
3. `list_records(world_slug='animalia', record_type='mystery_record', fields=['id', 'title', 'status'])` (no `include_full_body` flag) returns the projected listing — regression-safe.
4. `cd tools/world-mcp && npm test` — passes with the new test cases included.
5. `rg -n "include_full_body" tools/world-mcp/src/tools/list-records.ts tools/world-mcp/src/server.ts` confirms the flag landed in both source files.
6. `rg -n "individual get_record|N individual" .claude/skills/emergent-pressure-events/SKILL.md` returns zero hits after the skill prose update.

### Invariants

1. Existing `list_records` callers (with `fields` projection or default field set) see no behavior change.
2. The `include_full_body` flag is read-only at the MCP layer — the tool never mutates record state regardless of flag value.
3. Full-body-mode responses include the same `content_hash` and `file_path` metadata that single-record `get_record` calls return per-record, so callers can verify staleness across batched and individual retrieval paths.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/tools/list-records.test.ts` — add whole-class full-body coverage for `mystery_record`, `invariant_record`, `canon_fact`, plus a regression test for projection-mode behavior.
2. `tools/world-mcp/tests/server/dispatch.test.ts` — add MCP-server-boundary test for `include_full_body` schema acceptance.

### Commands

1. `cd tools/world-mcp && npm run build`
2. `cd tools/world-mcp && npm test`
3. `rg -n "include_full_body" tools/world-mcp/src/tools/list-records.ts tools/world-mcp/src/server.ts`
4. `! rg -n "individual get_record|N individual" .claude/skills/emergent-pressure-events/SKILL.md`
5. `mcp__worldloom__list_records(world_slug='animalia', record_type='mystery_record', include_full_body=true)` invoked against the live MCP server (after rebuild + restart) — returns 20 M records with full firewall-load bodies.
