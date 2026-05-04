# MCPENH-031: `get_records` and `describe_envelope_schema` — second-level oversize persist-with-summary mechanism

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — `tools/world-mcp/src/tools/get-records.ts`, `tools/world-mcp/src/tools/describe-envelope-schema.ts`, `tools/world-mcp/src/tools/get-persisted-packet-slice.ts`, MCP registration metadata in `tools/world-mcp/src/server.ts`, focused package tests, and retrieval-contract documentation updates in `docs/CONTEXT-PACKET-CONTRACT.md`, `docs/MACHINE-FACING-LAYER.md`, `tools/world-mcp/README.md`, and canon-addition references.
**Deps**: archive/tickets/MCPENH-020-document-persisted-with-summary-fallback-and-batch-retrieval.md, archive/tickets/MCPENH-022-document-persisted-with-summary-fallback-in-canon-addition-retrieval-tool-tree.md, archive/tickets/MCPENH-021-get-record-frontmatter-and-body-whole-section-projection.md

## Problem

`mcp__worldloom__get_context_packet` has a structured oversize-recovery mechanism: when the packet's serialized size exceeds the inline-result budget, the tool returns `delivery_status: "persisted_with_summary"` plus a `persisted_output_path`, and operators recover targeted slices via `mcp__worldloom__get_persisted_packet_slice(persisted_path, slice_path)`. The pattern was documented in MCPENH-020 and surfaced into canon-addition's retrieval-tool-tree.md by MCPENH-022.

At intake, `mcp__worldloom__get_records` and `mcp__worldloom__describe_envelope_schema` lacked the equivalent mechanism. When their combined output exceeded the inline budget, the harness saved the full JSON to the `tool-results/` directory and returned an error of the form `"result exceeds maximum allowed tokens. Output has been saved to <path>"`. There was no MCP-side `delivery_status` indicator, no structured slice-recovery tool, and no canonical operator pattern beyond direct file slicing (`jq`, Python) against the harness-saved file.

Before this ticket, this forced operators to:
1. Recognize the harness-level error format and parse the `<path>` out of it.
2. Probe the file shape via ad-hoc `jq 'keys' / 'type, length'` calls.
3. Extract specific records or schemas via `jq` paths, working blind without the structured `slice_path` discipline `get_persisted_packet_slice` documents.

The skill-prose convention in canon-addition (and other canon-pipeline-adjacent skills) names `get_records` as the structured fallback when `get_context_packet` returns `persisted_with_summary` — implying `get_records` itself will deliver inline. When it does not, operators improvise.

## Assumption Reassessment (2026-05-04)

1. Verified at HEAD: `tools/world-mcp/src/tools/get-records.ts` contains zero references to `delivery_status`, `oversize`, `persisted`, or `max_tokens` (`grep -nE "delivery_status|oversize|persisted|max.{0,20}token" tools/world-mcp/src/tools/get-records.ts` → 0 matches). Same for `tools/world-mcp/src/tools/describe-envelope-schema.ts`. Only `tools/world-mcp/src/tools/get-record.ts` carries the `delivery_status: "oversize_with_projection_suggestions"` mechanism (lines 84, 533) and that mechanism is for hybrid-record projection, not multi-record batch sizing — different shape than what the present ticket addresses.
2. Verified against `docs/CONTEXT-PACKET-CONTRACT.md`: the `persisted_with_summary` contract is documented for `get_context_packet` only; the contract is silent on whether the same recovery shape applies to `get_records` and `describe_envelope_schema`.
3. Cross-skill / cross-artifact boundary: this ticket touched the MCP retrieval contract that canon-addition's `references/retrieval-tool-tree.md` documents (per MCPENH-022). Updating the retrieval contract required synchronized changes to (i) the MCP server tool implementations, (ii) the contract docs, and (iii) the canon-addition retrieval-tool-tree / envelope-shape references. Other canon-pipeline-adjacent skills were swept for stale packet-only or harness-error wording; no additional same-seam edits were required.
4. Per FOUNDATIONS §Tooling Recommendation: structured retrieval is non-negotiable. At intake, the state where `get_records` and `describe_envelope_schema` had no MCP-side oversize handling fell back to harness-level tool-result persistence — not structured retrieval. The retrieval happened at file-system level, outside the MCP contract. Restating the principle: operators should not need to know about `~/.claude/projects/.../tool-results/` paths or `jq` paths to recover from oversize MCP responses.
5. Package/tool proof correction: `tools/world-mcp/package.json` exposes package-local `npm run build` and `npm test` scripts; there is no root `pnpm -C tools/world-mcp test` lane in this repository. Direct deployed `mcp__worldloom__...` calls are not exposed in this Codex session, so post-change proof uses fresh compiled handler tests and in-memory MCP dispatch tests.
6. Schema extension scope: this ticket extends the `delivery_status` enum on `get_records` and `describe_envelope_schema` responses to include `inline` and `persisted_with_summary`, parallel to `get_context_packet`. The extension is additive-only for normal callers and replaces external harness-level overflow with package-owned bounded responses when the full response would exceed the configured inline ceiling.
7. Slice recovery scope: the live `get_persisted_packet_slice` implementation already reads JSON from the package-owned tool-results directory and follows dot paths, but it only supports object keys plus `[id=...]` selectors. This ticket keeps the existing tool name and extends its path parser to support array indexes such as `records[0].record.record`, avoiding new sibling slice tools or aliases.

## Architecture Check

1. The landed design extends the existing `persisted_with_summary` pattern from `get_context_packet` to `get_records` and `describe_envelope_schema`, reusing and generalizing `mcp__worldloom__get_persisted_packet_slice` for slice recovery. This preserves the single recovery-tool surface and the operator pattern documented in MCPENH-020. Alternative: each oversize-prone tool could ship its own bespoke recovery — rejected because it fragments the operator pattern.
2. No backwards-compatibility shims. `delivery_status` is now a top-level field on `get_records` and `describe_envelope_schema` responses, with `inline` for fitted responses and `persisted_with_summary` for bounded oversize summaries.

## Verification Layers

1. `get_records` second-level oversize → compiled handler test: low-ceiling batch retrieval returns `delivery_status: "persisted_with_summary"` plus `persisted_output_path` rather than a harness-level error.
2. `describe_envelope_schema()` (no `op_kind`) oversize → compiled handler test: low-ceiling unscoped call returns `persisted_with_summary`; high-ceiling and `op_kind`-filtered calls prove the inline path.
3. Slice recovery → compiled handler test: `get_persisted_packet_slice` recovers an individual record via `records[0].record.record` and a schema via `op_schemas.create_cf_record`.
4. Documentation alignment → FOUNDATIONS alignment check / manual review: `docs/CONTEXT-PACKET-CONTRACT.md` covers all three `persisted_with_summary` tools (`get_context_packet`, `get_records`, `describe_envelope_schema`); `.claude/skills/canon-addition/references/retrieval-tool-tree.md` documents the second-level oversize fallback for `get_records` and the `op_kind` narrowing pattern for `describe_envelope_schema`.

## Landed Changes

### 1. `tools/world-mcp/src/tools/get-records.ts` — added `persisted_with_summary` mechanism

When the constructed response would exceed the effective inline ceiling, `get_records` now persists the full inline-shaped JSON to the package-owned tool-results directory and returns a bounded summary response with `delivery_status: "persisted_with_summary"`, `persisted_output_path`, `summary.records[]`, and suggested slice paths. Inline responses now carry `delivery_status: "inline"`.

The threshold uses the same configured harness ceiling and envelope-overhead reserve as `get_context_packet`.

### 2. `tools/world-mcp/src/tools/describe-envelope-schema.ts` — added `persisted_with_summary` mechanism

When the unscoped response exceeds the effective inline ceiling, `describe_envelope_schema` now persists the full inline-shaped JSON and returns `delivery_status: "persisted_with_summary"` with `summary.available_op_kinds`, source paths, ceiling metadata, and suggested schema slice paths. `op_kind`-filtered calls remain inline when they fit.

### 3. Generalize `get_persisted_packet_slice` to handle records and envelope-schema slices

The existing `get_persisted_packet_slice` tool now supports array indexes in addition to the existing `[id=...]` selector, so it can recover packet layer paths, `records[<N>]` / `records[<N>].record.record`, and schema paths such as `op_schemas.create_cf_record`.

### 4. `docs/CONTEXT-PACKET-CONTRACT.md` — extend the `delivery_status` contract

Documented that `persisted_with_summary` applies to `get_records` and `describe_envelope_schema` in addition to `get_context_packet`, with `persisted_output_path` + `summary` envelopes and slice-recovery patterns.

### 5. `.claude/skills/canon-addition/references/retrieval-tool-tree.md` — document the second-level oversize fallback

The canon-addition retrieval reference now documents second-level `get_records` oversize recovery with `records[<N>]` / `records[<N>].record.record`, and the envelope-shape reference now documents `describe_envelope_schema(op_kind)` narrowing plus persisted schema slicing.

### 6. Cross-skill ripple — update other canon-pipeline-adjacent skills' retrieval references

Grep sweeps found no remaining harness-level-error recovery wording in the owned docs/package surfaces. Other skills that mention packet-level `persisted_with_summary` still remain truthful because the new second-level behavior is documented in the shared package docs and canon-addition-owned references touched here.

## Files to Touch

- `tools/world-mcp/src/tools/get-records.ts` (modify) — add `persisted_with_summary` mechanism.
- `tools/world-mcp/src/tools/describe-envelope-schema.ts` (modify) — add `persisted_with_summary` mechanism.
- `tools/world-mcp/src/tools/get-persisted-packet-slice.ts` (modify) — generalize slice paths to package-persisted `get_records` and `describe_envelope_schema` JSON.
- `tools/world-mcp/src/tools/oversize-delivery.ts` (new) — shared ceiling/persistence helpers for package-owned persisted-with-summary delivery.
- `tools/world-mcp/src/server.ts` (modify) — update registered tool descriptions and capability metadata; no new tool registration.
- `tools/world-mcp/tests/tools/get-records.test.ts` (modify) — add persisted-summary coverage.
- `tools/world-mcp/tests/tools/describe-envelope-schema.test.ts` (modify) — add persisted-summary coverage.
- `tools/world-mcp/tests/tools/get-persisted-packet-slice.test.ts` (modify) — add array-index and non-packet JSON slice coverage.
- `docs/CONTEXT-PACKET-CONTRACT.md` (modify) — extend `delivery_status` contract.
- `.claude/skills/canon-addition/references/retrieval-tool-tree.md` (modify) — document second-level oversize fallback.
- `.claude/skills/canon-addition/references/engine-envelope-shape.md` (modify) — `describe_envelope_schema(op_kind?)` guidance extended with `persisted_with_summary` narrowing and schema-slice recovery.
- `tools/world-mcp/README.md` (modify) — update tool descriptions to name the new `delivery_status` value.
- `docs/MACHINE-FACING-LAYER.md` (modify) — update quick-reference recovery semantics.
- `tools/world-mcp/tests/tools/get-record.story-bundle.test.ts` (modify) — update inline `get_records` assertion for the new `delivery_status` discriminator.

## Out of Scope

- Changes to `get_context_packet`'s existing `persisted_with_summary` mechanism (already in place; this ticket extends the pattern, does not modify it).
- Changes to `get_record` (single-record retrieval; already has the orthogonal `oversize_with_projection_suggestions` mechanism per MCPENH-021 territory).
- A generic harness-level recovery API for arbitrary tool-result-persisted files — the harness behavior is upstream of the MCP server and outside this skill's surface.
- Compression / deflation of MCP responses to fit the inline budget — the goal is a clean recovery contract, not a budget-stretching mechanism.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/world-mcp && npm run build` succeeds and refreshes compiled artifacts.
2. `cd tools/world-mcp && node dist/tests/tools/get-records.test.js` proves `get_records` returns `delivery_status: "persisted_with_summary"` with a non-empty `persisted_output_path` and bounded `summary` when the response would exceed the configured inline ceiling.
3. `cd tools/world-mcp && node dist/tests/tools/describe-envelope-schema.test.js` proves unfiltered `describe_envelope_schema` can return `delivery_status: "persisted_with_summary"` with `summary.available_op_kinds`, while an `op_kind`-filtered call remains inline.
4. `cd tools/world-mcp && node dist/tests/tools/get-persisted-packet-slice.test.js` proves `get_persisted_packet_slice(persisted_path, "records[0].record.record")` and schema dot paths work against package-persisted non-packet JSON.
5. `cd tools/world-mcp && node dist/tests/server/dispatch.test.js` proves registered tool metadata and dispatch expose the updated recovery descriptions.
6. `cd tools/world-mcp && npm test` passes the full package lane.

### Invariants

1. The `delivery_status` field is present on every response from `get_records`, `describe_envelope_schema`, and `get_context_packet`. The set of allowed values is `{"inline", "persisted_with_summary"}` for these three tools; `get_record` keeps its separate `oversize_with_projection_suggestions` discriminator for unprojected hybrid-record projection recovery.
2. Every `persisted_with_summary` response includes a non-empty `persisted_output_path` AND a `summary` block sufficient for the operator to decide which `slice_path` to fetch.
3. The persisted JSON file structure is documented in `docs/CONTEXT-PACKET-CONTRACT.md` and is stable across invocations of the same tool with the same arguments (modulo `generated_at` timestamp).

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/tools/get-records.test.ts` — add a persisted-summary test using a low configured harness ceiling and oversized batch response.
2. `tools/world-mcp/tests/tools/describe-envelope-schema.test.ts` — add an unfiltered persisted-summary test plus filtered-inline regression.
3. `tools/world-mcp/tests/tools/get-persisted-packet-slice.test.ts` — extend slice recovery from `get_records` / `describe_envelope_schema` persisted shapes.

### Commands

1. `cd tools/world-mcp && npm run build` — producer step for compiled test artifacts.
2. `cd tools/world-mcp && node dist/tests/tools/get-records.test.js` — focused batch-retrieval proof.
3. `cd tools/world-mcp && node dist/tests/tools/describe-envelope-schema.test.js` — focused envelope-schema proof.
4. `cd tools/world-mcp && node dist/tests/tools/get-persisted-packet-slice.test.js` — focused persisted-slice proof.
5. `cd tools/world-mcp && node dist/tests/server/dispatch.test.js` — in-memory MCP metadata/dispatch proof.
6. `cd tools/world-mcp && npm test` — full package verification.

## Outcome

Completed: 2026-05-04.

`get_records` and `describe_envelope_schema` now perform package-owned oversize handling before the external MCP harness boundary. Both tools return inline responses with `delivery_status: "inline"` when they fit, and persist full inline-shaped JSON plus a bounded `delivery_status: "persisted_with_summary"` summary when they exceed the configured effective inline ceiling. `get_persisted_packet_slice` now supports array-index slice paths, so the single existing recovery tool can read persisted packet, batch-record, and envelope-schema JSON.

The public MCP descriptions, package README, machine-facing docs, context-packet contract, and canon-addition references now document the new recovery shape.

## Verification Result

1. `cd tools/world-mcp && npm run build` — passed.
2. `cd tools/world-mcp && node dist/tests/tools/get-records.test.js` — passed; 3 subtests.
3. `cd tools/world-mcp && node dist/tests/tools/describe-envelope-schema.test.js` — passed; 4 subtests.
4. `cd tools/world-mcp && node dist/tests/tools/get-persisted-packet-slice.test.js` — passed; 6 subtests.
5. `cd tools/world-mcp && node dist/tests/server/dispatch.test.js` — passed; 27 subtests.
6. `cd tools/world-mcp && npm test` — passed; full lane reported 329 passing tests. The run emitted pre-existing live-fixture warnings for two skipped `worlds/erotica-world` story intention records with ids `STINT-0001-iker` and `STINT-0001-marla` that do not match `^STINT-[0-9]{4}$`; the warnings are outside this ticket's owned seam.
7. `rg -n 'get_persisted_packet_slice.*full context packet|get_persisted_packet_slice.*context packet|Structured recovery from a \`get_context_packet\`|retrieves a structured slice from a full packet|package-persisted full context packet' tools/world-mcp docs .claude/skills -g '!dist'` — passed; no stale packet-only slice wording remained in the swept surfaces.

## Deviations

- Direct deployed MCP calls were not run because this Codex session does not expose the `mcp__worldloom__...` tools. Package-local compiled handler tests and in-memory server dispatch are the truthful post-change proof.
- The drafted pipeline-wide canon-addition Phase-1 smoke was not run as an end-to-end skill execution; this ticket changed package retrieval behavior and documentation, and the full `tools/world-mcp` package suite plus canon-addition prose review is the verified boundary.
- Other canon-pipeline-adjacent skills that mention packet-level `persisted_with_summary` were searched for stale packet-only or harness-error wording and left unchanged when their current wording remained true; the second-level behavior is covered by the shared contract docs and canon-addition-owned references updated here.
