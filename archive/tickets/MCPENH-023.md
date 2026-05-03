# MCPENH-023: Hybrid-record oversize handling in `mcp__worldloom__get_record`

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `tools/world-mcp/` (`get_record` tool implementation), and the persisted-output path convention shared with `get_context_packet`.
**Deps**: None (independent enhancement to existing `get_record` MCP tool).

## Problem

At intake, when a hybrid record (`CHAR-NNNN`, `DA-NNNN`, `PA-NNNN`) exceeded the MCP's response token cap, `mcp__worldloom__get_record(record_id)` returned an oversize error message directing the caller to a persisted-output file at `/home/joeloverbeck/.claude/projects/<session-id>/tool-results/<file>.txt`. That path lay OUTSIDE the calling agent's permission scope — Claude Code agents are sandboxed from reading their own session-state directory (`~/.claude/projects/`) per the agent's permission model. The fallback hint to "use jq / python on the file directly" was therefore unactionable for the agent; the recovery required manual operator intervention or fallback to direct `Read worlds/<slug>/<hybrid-dir>/<file>.md` with `offset` / `limit` chunking.

Direct-Read fallback worked but bypassed the MCP's structured retrieval guarantee that FOUNDATIONS §Tooling Recommendation (and the §Canonical Storage Layer §Read discipline) commits to. The MCP's section_path projection (`section_path='frontmatter'` / `section_path='body.<section-name>'` / etc.) exists precisely to handle large hybrid records; this ticket makes the oversize branch suggest specific projections immediately and persist the full JSON response under the package-owned readable results root.

Real-world intake evidence (this session, 2026-05-03): During `branching-story-bootstrap` on `worlds/erotica-world/`, the user's premise cited `DA-0001` by ID. Calling `mcp__worldloom__get_record('DA-0001')` returned an 83,912-character response that exceeded the cap. The persisted_output_path was `/home/joeloverbeck/.claude/projects/<id>/tool-results/mcp-worldloom-mcp__worldloom__get_record-<timestamp>.txt`; agent permissions blocked reading it. Recovery: direct `Read worlds/erotica-world/diegetic-artifacts/marla-kerns-journal-the-iker-entries.md` with `offset` + `limit` chunks across two reads (lines 1-365 for frontmatter + `claim_map`; lines 367-645 for body sections). The fallback worked but required 2 manual reads instead of the documented MCP-projection retrieval path. The bootstrap skill's pre-existing Pre-flight bullet for premise-cited DAs was amended in the same session to document the offset/limit fallback explicitly; this ticket fixed the underlying MCP recovery gap.

## Assumption Reassessment (2026-05-03)

1. `mcp__worldloom__get_record` is implemented at `tools/world-mcp/src/tools/get-record.ts`, registered in `tools/world-mcp/src/server.ts`, and covered by `tools/world-mcp/tests/tools/get-record-hybrid.test.ts` / `tools/world-mcp/tests/tools/get-record-section-path.test.ts`. Pre-edit reassessment found that `getRecord()` returned the full hybrid payload for no-`section_path` calls; oversize persistence was therefore happening outside the handler in the MCP harness rather than through the package-local persistence contract.
2. `docs/FOUNDATIONS.md` §Canonical Storage Layer §Read discipline reads: *"Hybrid records (`CHAR-NNNN`, `DA-NNNN`, `PA-NNNN`) are also retrievable via `get_record(record_id)` with optional `section_path` projection — frontmatter blocks (`frontmatter.world_consistency`, `frontmatter.author_profile`) and body sections (`body.Capabilities`) project as structured slices, paralleling `get_record_field` for atomic records."* This authorizes the projection API but does not prescribe what `get_record` must do when the full-record retrieval (no `section_path` supplied) exceeds the response cap.
3. Cross-skill / cross-artifact: the persisted-output path convention is shared between `get_record` and `get_context_packet`. Live package code writes context-packet overflow JSON through `tools/world-mcp/src/context-packet/persistence.ts`, defaulting to `/tmp/worldloom-mcp-tool-results/` with `WORLDLOOM_MCP_TOOL_RESULTS_DIR` override. Pre-edit `get_record` had no internal oversize branch, so the observed `/home/joeloverbeck/.claude/projects/<session-id>/tool-results/<file>.txt` path was harness fallout from returning a too-large handler response. The landed shared boundary is package-owned persisted-output policy for MCP tools that can exceed the inline ceiling.
4. FOUNDATIONS principle motivating this ticket: §Tooling Recommendation — *"LLM agents should never operate on prose alone. They should always receive — directly or via the documented context-packet + targeted-retrieval pattern — current World Kernel; current Invariants; relevant canon fact records; affected domain files; ..."* At intake, `get_record` oversize behavior broke the targeted-retrieval surface for hybrid records by emitting an unactionable harness path; agents were forced into raw-file reads that bypassed the documented pattern. The landed fix restores targeted-retrieval coverage.
5. N/A (this ticket does not touch HARD-GATE / canon-write / Mystery Reserve firewall surfaces).
6. Output schema extension: additive MCP response-shape extension only, not a world-record schema change. The no-`section_path` hybrid overflow branch now returns `delivery_status: "oversize_with_projection_suggestions"`, `persisted_output_path`, `total_chars`, `response_cap_chars`, bounded `suggested_section_paths`, optional `suggested_section_paths_omitted_count`, and `fallback_advice`. Existing atomic responses and successful hybrid projection responses remain unchanged.
7. Rename / removal: NONE — no symbols renamed or removed; existing `get_record` and `section_path` API surface preserved.
8. Adjacent contradictions exposed: the persisted-output-path divergence between `get_record` (`~/.claude/projects/...`) and `get_context_packet` (`/tmp/worldloom-mcp-tool-results/...`) is itself an inconsistency. This ticket treats the divergence as a required consequence to fix (unify on `/tmp/worldloom-mcp-tool-results/`), not a separate ticket.
9. Mismatch + correction: the drafted acceptance used direct `mcp__worldloom__get_record(...)` live-session calls and `world-validate`. The active Codex session does not expose live `mcp__worldloom__...` tools, and this ticket does not change validators or world source content. Acceptance is corrected to package-local `tools/world-mcp` build/tests plus direct handler proof against a temp-seeded oversize hybrid record. Direct live-MCP retry remains an operational smoke outside this session's mechanized proof.

## Architecture Check

1. The proposed fix has two complementary layers — both increase the targeted-retrieval surface area without breaking existing callers:
   - **(a) Suggest specific projections in oversize responses**: when full-record hybrid retrieval exceeds the cap, the response enumerates the available `section_path` values (frontmatter keys + body section names from the parsed record metadata) so the operator can immediately retry with a projection.
   - **(b) Move persisted output into the package-owned results root**: this path is already used by `get_context_packet` and is readable by Claude Code agents. Moving package-owned overflow persistence under `/tmp/worldloom-mcp-tool-results/` by default removes the recovery cliff without extending permissions to read `~/.claude/projects/...`.
2. No backwards-compatibility aliasing/shims introduced. The existing `get_record(record_id)` (no projection) call shape is preserved; only the oversize branch changes to a bounded recovery response and package-owned persisted-output path. Existing callers that use `section_path` projections are unaffected. There is no old path to maintain; the `~/.claude/projects/...` location was never a documented stable contract.

## Verification Layers

1. **Oversize response includes projection suggestions** → targeted tool command: the compiled `get-record-hybrid` test calls `getRecord()` on a temp-seeded oversize hybrid record and asserts a non-empty `suggested_section_paths` array containing frontmatter keys and body section names.
2. **Persisted-output path is readable under the package-owned results root** → targeted tool command: the same compiled test sets `WORLDLOOM_MCP_TOOL_RESULTS_DIR`, asserts the persisted path uses that root, reads the JSON file, and confirms it contains the full record response.
3. **Existing projected-retrieval API unchanged** → targeted tool command: `get-record-section-path.test.js` passes unchanged, proving the existing `section_path` response shape and error behavior still work.
4. **Context-packet persisted-output convention remains aligned** → targeted tool command: `harness-ceiling.test.js` passes, proving `get_context_packet` still persists full packets through the shared helper.

## Landed Changes

### 1. `get_record` oversize-error response extension

When full-record hybrid retrieval (no `section_path` supplied) exceeds the effective inline response cap, `tools/world-mcp/src/tools/get-record.ts` returns a structured oversize response:

```json
{
  "record_id": "DA-0001",
  "delivery_status": "oversize_with_projection_suggestions",
  "persisted_output_path": "/tmp/worldloom-mcp-tool-results/<timestamp>-<world>-get_record-DA-0001-<uuid>.json",
  "total_chars": 83912,
  "response_cap_chars": 25000,
  "suggested_section_paths": [
    "frontmatter",
    "frontmatter.author_profile",
    "frontmatter.claim_map",
    "frontmatter.epistemic_horizon",
    "body",
    "body.18 April",
    "body.19 April",
    ...
  ],
  "fallback_advice": "Retry get_record with a suggested section_path, or read persisted_output_path JSON."
}
```

The `suggested_section_paths` field is populated from the same parsed hybrid frontmatter keys and body section names used by the existing projection handler, then trimmed only when needed to keep the recovery response itself under the effective inline cap. When trimming is required, `suggested_section_paths_omitted_count` reports how many valid paths were omitted from the inline hint list. The operator can then immediately re-call `get_record('DA-0001', section_path='body.18 April')` to retrieve a single section without manual chunk-counting.

### 2. Persisted-output path migration

`get_record`'s oversize-response persistence now uses the same helper as `get_context_packet`, defaulting to `/tmp/worldloom-mcp-tool-results/<timestamp>-<world>-get_record-<record-id>-<uuid>.json` with `WORLDLOOM_MCP_TOOL_RESULTS_DIR` override. The persisted file is JSON containing the full record response.

The tool-results directory is created on demand by the MCP server; no additional setup is required.

### 3. Documentation update

Updated `docs/MACHINE-FACING-LAYER.md`, `docs/CONTEXT-PACKET-CONTRACT.md`, `tools/world-mcp/README.md`, and the registered `get_record` description in `tools/world-mcp/src/server.ts` to document the oversize response shape and unified tool-results persistence convention.

## Files to Touch

- `tools/world-mcp/src/tools/get-record.ts` (modify) — add the no-`section_path` hybrid oversize-response branch and suggested projection paths.
- `tools/world-mcp/src/context-packet/persistence.ts` (modify) — extend the existing `/tmp/worldloom-mcp-tool-results/` helper with a generic JSON persistence function used by `get_record`.
- `tools/world-mcp/tests/tools/get-record-hybrid.test.ts` (modify) — cover oversize hybrid handling, persisted JSON output, and projection retry.
- `docs/MACHINE-FACING-LAYER.md` (modify) — document the new oversize-response shape and the unified persistence convention.
- `tools/world-mcp/src/server.ts` (modify) — truth the registered `get_record` capability description.
- `tools/world-mcp/README.md` (modify) — document `get_record` oversize recovery in the package inventory.
- `docs/CONTEXT-PACKET-CONTRACT.md` (modify) — cross-reference the unified convention.

## Out of Scope

- **Auto-pagination across multiple `get_record` calls**: the landed fix surfaces section-path suggestions but does not bundle multiple sections into a single response. If a record's body has 9 sections each 12k chars, the operator needs 9 calls. That's acceptable — the operator can choose which sections matter; auto-pagination would re-introduce the oversize problem at a different boundary.
- **Atomic-record oversize handling**: atomic records (`CF-NNNN.yaml`, `INV-N.yaml`, etc.) are bounded in size by the schema and very rarely exceed the cap. This ticket scopes to hybrid records; if atomic records ever exceed cap (a future schema growth), a sister ticket would extend the same approach.
- **Permission-model changes to allow agents to read `~/.claude/projects/...`**: explicitly rejected in the Architecture Check. The fix is to relocate persisted output to a path agents already can read.

## Acceptance Criteria

### Tests That Must Pass

1. Package-local handler proof against a temp-seeded oversize hybrid record returns `delivery_status: "oversize_with_projection_suggestions"` with non-empty `suggested_section_paths` containing frontmatter keys and body section names.
2. The returned `persisted_output_path` matches the configured `/tmp/worldloom-mcp-tool-results/` policy (or `WORLDLOOM_MCP_TOOL_RESULTS_DIR` override in tests), is readable from the test process, and contains structured JSON for the full record response.
3. Re-calling `get_record` with one of the suggested `section_path` values succeeds and returns the projected slice under the response cap.
4. Existing callers using `section_path` projection (e.g., `get_record('CHAR-0003', section_path='frontmatter')`) continue to return the existing response shape; the package's existing section-path tests remain the regression proof.
5. Full `tools/world-mcp` package tests pass after build; no `world-validate` lane is required because no world source or validator behavior changes.

### Invariants

1. **The `section_path` projection API surface is preserved unchanged**: any existing caller passing a valid `section_path` value receives a response identical to the pre-change implementation. Only the no-`section_path`-oversize branch changes.
2. **Persisted-output paths are agent-readable**: every MCP tool that writes persisted output for oversize responses must use `/tmp/worldloom-mcp-tool-results/`; no MCP tool may write persisted output to `~/.claude/projects/...` or any other path that Claude Code agents cannot read by default.
3. **Oversize responses are recoverable through documented MCP API alone**: the operator no longer needs to fall back to direct `Read` of the source file under `worlds/<slug>/<hybrid-dir>/` for any record retrievable through `get_record` — the projection suggestions + persisted path together cover the recovery surface.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/tools/get-record-hybrid.test.ts` (modify) — covers the new oversize-response shape against a temp-seeded hybrid record exceeding a low configured response cap.
2. `tools/world-mcp/tests/tools/get-record-hybrid.test.ts` (modify) — confirms re-calling `get_record(id, section_path=<suggested>)` after an oversize response returns the projected slice successfully.
3. Existing `tools/world-mcp/tests/context-packet/harness-ceiling.test.ts` remains the context-packet persisted-output-path proof; the new `get-record` test asserts the same shared helper policy for record overflow.

### Commands

1. `cd tools/world-mcp && npm run build`
2. `cd tools/world-mcp && node --test dist/tests/tools/get-record-hybrid.test.js dist/tests/tools/get-record-section-path.test.js dist/tests/context-packet/harness-ceiling.test.js`
3. `cd tools/world-mcp && npm test` — full MCP test suite, confirming no regression. Direct live `mcp__worldloom__get_record` smoke is deferred until a rebuilt/restarted MCP server is available in the caller's session.

## Outcome

Completed 2026-05-03.

Implemented handler-owned oversize recovery for unprojected hybrid `get_record` responses. Oversize hybrid responses now persist the full JSON response through the shared tool-results helper, return a bounded `delivery_status: "oversize_with_projection_suggestions"` recovery payload, and enumerate valid `section_path` retries with an omitted-count field when the inline hint list must be shortened. Existing atomic retrieval and projected hybrid retrieval shapes remain unchanged.

Same-seam docs and capability metadata now describe the readable tool-results directory and recovery shape in `docs/MACHINE-FACING-LAYER.md`, `docs/CONTEXT-PACKET-CONTRACT.md`, `tools/world-mcp/README.md`, and `tools/world-mcp/src/server.ts`.

## Verification Result

Completed:

1. `cd tools/world-mcp && npm run build` — pass.
2. `cd tools/world-mcp && node --test dist/tests/tools/get-record-hybrid.test.js dist/tests/tools/get-record-section-path.test.js dist/tests/context-packet/harness-ceiling.test.js` — pass.
3. `cd tools/world-mcp && npm test` — pass; 292 tests passed.

The focused get-record test seeds an oversize hybrid `DA-0002`, lowers the effective cap through `WORLDLOOM_MCP_HARNESS_CEILING_CHARS`, asserts `oversize_with_projection_suggestions`, reads the persisted JSON under the configured tool-results root, and re-calls `get_record` with `section_path='body.18 April'`.

Post-ticket review blocker resolved (2026-05-03): the recovery payload now uses shorter fallback advice, trims inline projection suggestions only when needed, and reports `suggested_section_paths_omitted_count` when paths are omitted. The focused test now asserts `JSON.stringify(result, null, 2).length <= result.response_cap_chars` for the oversize recovery response. A direct compiled handler probe using the same seeded `DA-0002` shape and `WORLDLOOM_MCP_HARNESS_CEILING_CHARS=5000` returned `delivery_status: "oversize_with_projection_suggestions"` with serialized recovery payload length `920`, `response_cap_chars: 1000`, and `suggested_section_paths_omitted_count: 0`.

## Deviations

Direct live `mcp__worldloom__get_record('DA-0001', world_slug='erotica-world')` smoke was not run because the active Codex session does not expose live worldloom MCP tools and would need a rebuilt/restarted MCP server to prove the newly edited package artifact. The accepted proof is package-local compiled handler coverage plus the full `tools/world-mcp` suite. `world-validate` was removed from acceptance because this ticket does not mutate world content or validator behavior.

Post-ticket review reopened the ticket because the focused cap-size probe found unfinished same-seam work. The reopened seam is now resolved: the recovery response is bounded before reaching the external MCP harness, and the direct cap assertion is part of the focused package proof.
