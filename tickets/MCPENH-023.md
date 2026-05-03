# MCPENH-023: Hybrid-record oversize handling in `mcp__worldloom__get_record`

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `tools/world-mcp/` (`get_record` tool implementation), and the persisted-output path convention shared with `get_context_packet`.
**Deps**: None (independent enhancement to existing `get_record` MCP tool).

## Problem

When a hybrid record (`CHAR-NNNN`, `DA-NNNN`, `PA-NNNN`) exceeds the MCP's response token cap, `mcp__worldloom__get_record(record_id)` returns an oversize error message directing the caller to a persisted-output file at `/home/joeloverbeck/.claude/projects/<session-id>/tool-results/<file>.txt`. That path lies OUTSIDE the calling agent's permission scope — Claude Code agents are sandboxed from reading their own session-state directory (`~/.claude/projects/`) per the agent's permission model. The fallback hint to "use jq / python on the file directly" is therefore unactionable for the agent; the recovery requires manual operator intervention or fallback to direct `Read worlds/<slug>/<hybrid-dir>/<file>.md` with `offset` / `limit` chunking.

Direct-Read fallback works but bypasses the MCP's structured retrieval guarantee that FOUNDATIONS §Tooling Recommendation (and the §Canonical Storage Layer §Read discipline) commits to. The MCP's section_path projection (`section_path='frontmatter'` / `section_path='body.<section-name>'` / etc.) exists precisely to handle large hybrid records, but operators only discover the projection's necessity AFTER the oversize error fires — too late, since the error doesn't suggest specific projections to retry.

Real-world evidence (this session, 2026-05-03): During `branching-story-bootstrap` on `worlds/erotica-world/`, the user's premise cited `DA-0001` by ID. Calling `mcp__worldloom__get_record('DA-0001')` returned an 83,912-character response that exceeded the cap. The persisted_output_path was `/home/joeloverbeck/.claude/projects/<id>/tool-results/mcp-worldloom-mcp__worldloom__get_record-<timestamp>.txt`; agent permissions blocked reading it. Recovery: direct `Read worlds/erotica-world/diegetic-artifacts/marla-kerns-journal-the-iker-entries.md` with `offset` + `limit` chunks across two reads (lines 1-365 for frontmatter + `claim_map`; lines 367-645 for body sections). The fallback worked but required 2 manual reads instead of the documented MCP-projection retrieval path. The bootstrap skill's pre-existing Pre-flight bullet for premise-cited DAs has now been amended (in a same-session implementation) to document the offset/limit fallback explicitly — but the underlying MCP gap remains.

## Assumption Reassessment (2026-05-03)

1. `mcp__worldloom__get_record` is implemented at `tools/world-mcp/` (per the worldloom CLAUDE.md "Repository Layout" section that names `tools/world-mcp/` as the retrieval MCP server). The exact source-file path within `tools/world-mcp/` requires verification at implementation start; recent commits (MCPENH-001 through MCPENH-022) have iterated on this surface.
2. `docs/FOUNDATIONS.md` §Canonical Storage Layer §Read discipline reads: *"Hybrid records (`CHAR-NNNN`, `DA-NNNN`, `PA-NNNN`) are also retrievable via `get_record(record_id)` with optional `section_path` projection — frontmatter blocks (`frontmatter.world_consistency`, `frontmatter.author_profile`) and body sections (`body.Capabilities`) project as structured slices, paralleling `get_record_field` for atomic records."* This authorizes the projection API but does not prescribe what `get_record` must do when the full-record retrieval (no `section_path` supplied) exceeds the response cap.
3. Cross-skill / cross-artifact: the persisted-output path convention is shared between `get_record` and `get_context_packet`. `get_context_packet` (per the response shape observed in this session) writes to `/tmp/worldloom-mcp-tool-results/<timestamp>-<world>-<task_type>-<uuid>.json`, which IS readable by the calling agent. `get_record` writes to `/home/joeloverbeck/.claude/projects/<session-id>/tool-results/<file>.txt`, which is NOT readable. The shared boundary under audit is the persisted-output path policy across MCP tools that handle oversize responses.
4. FOUNDATIONS principle motivating this ticket: §Tooling Recommendation — *"LLM agents should never operate on prose alone. They should always receive — directly or via the documented context-packet + targeted-retrieval pattern — current World Kernel; current Invariants; relevant canon fact records; affected domain files; ..."* The current `get_record` oversize behavior breaks the targeted-retrieval surface for hybrid records by emitting an unactionable error path; agents are forced into raw-file reads that bypass the documented pattern. The fix restores targeted-retrieval coverage.
5. N/A (this ticket does not touch HARD-GATE / canon-write / Mystery Reserve firewall surfaces).
6. Output schema extension: NONE — this ticket changes runtime tool behavior, not record schemas. The fix is additive (suggest projections in error responses; relocate persisted output to a readable path).
7. Rename / removal: NONE — no symbols renamed or removed; existing `get_record` and `section_path` API surface preserved.
8. Adjacent contradictions exposed: the persisted-output-path divergence between `get_record` (`~/.claude/projects/...`) and `get_context_packet` (`/tmp/worldloom-mcp-tool-results/...`) is itself an inconsistency. This ticket treats the divergence as a required consequence to fix (unify on `/tmp/worldloom-mcp-tool-results/`), not a separate ticket.
9. No mismatch + correction — assumptions confirmed against the in-session MCP behavior (oversize response observed; persisted path observed; agent permission denial observed and recovered via direct Read).

## Architecture Check

1. The proposed fix has two complementary layers — both increase the targeted-retrieval surface area without breaking existing callers:
   - **(a) Suggest specific projections in oversize error responses**: when the full-record retrieval exceeds the cap, the response should enumerate the available `section_path` values (frontmatter keys + body section names from the parsed record metadata) so the operator can immediately retry with a projection. Currently the error says only "use jq on the file directly," which doesn't tell the operator WHICH section to retrieve — they have to guess or run the persisted-output recovery path.
   - **(b) Move persisted output to `/tmp/worldloom-mcp-tool-results/`**: this path is already used by `get_context_packet` (per the in-session observation) and is reliably readable by Claude Code agents. The current `~/.claude/projects/...` path fails consistently for sandboxed agents; moving to `/tmp/` removes the recovery cliff. This is cleaner than narrowly extending agent permissions to read `~/.claude/projects/...` — extending permissions would add a security surface for marginal benefit, while the `/tmp/` path is already a working precedent in the same MCP server.
2. No backwards-compatibility aliasing/shims introduced. The existing `get_record(record_id)` (no projection) call shape is preserved; only the oversize error response improves and the persisted-output path moves. Existing callers that DO use `section_path` projections are unaffected. There is no "old path" to maintain — the `~/.claude/projects/...` location was never a documented stable contract; it was the implicit harness location.

## Verification Layers

1. **Oversize error response includes projection suggestions** → schema validation: `get_record(record_id)` on a hybrid record exceeding the cap returns a response containing a `suggested_section_paths: string[]` field enumerating the parsed record's frontmatter keys + body section names. Verify by calling `get_record('DA-0001')` against `worlds/erotica-world/` (which is known to exceed cap) and asserting the field's presence + non-empty content.
2. **Persisted-output path readable by calling agent** → manual review: invoke `get_record` against an oversize record from a Claude Code agent context; confirm the returned `persisted_output_path` is under `/tmp/worldloom-mcp-tool-results/` and that a subsequent direct `Read` of that path succeeds (no permission denial).
3. **Existing projected-retrieval API unchanged** → codebase grep-proof: grep `tools/world-mcp/` for the `section_path` projection handler signature before and after the change; confirm the function signature and accepted enum values are byte-identical.
4. **Bootstrap skill's documented fallback continues to work** → skill dry-run: re-run `branching-story-bootstrap` against a world containing an oversize hybrid record (e.g., `worlds/erotica-world/diegetic-artifacts/marla-kerns-journal-the-iker-entries.md`); confirm the operator's path-of-least-friction is now MCP projection retrieval rather than direct-Read fallback.

## What to Change

### 1. `get_record` oversize-error response extension

When full-record retrieval (no `section_path` supplied) exceeds the response cap, replace the current error format with a structured oversize response:

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
  "fallback_advice": "Re-call get_record with section_path=<one of suggested_section_paths> to retrieve a structured slice. For full-content recovery, read the persisted_output_path JSON file directly."
}
```

The `suggested_section_paths` field is populated by parsing the record's frontmatter keys and body section names from disk (the parser already runs to assemble the full response; emitting the section list is a trivial additional output). The operator can then immediately re-call `get_record('DA-0001', section_path='body.18 April')` to retrieve a single section without manual chunk-counting.

### 2. Persisted-output path migration

Migrate `get_record`'s oversize-response persistence from `<harness-session-state>/tool-results/<file>.txt` to `/tmp/worldloom-mcp-tool-results/<timestamp>-<world>-get_record-<record-id>-<uuid>.json` (parallel to `get_context_packet`'s existing convention). Use JSON format (not raw text) so the persisted file matches the in-band response shape and can be re-loaded as structured data via direct Read or jq.

The `/tmp/worldloom-mcp-tool-results/` directory is created on demand by the MCP server (already done for `get_context_packet`); no additional setup is required.

### 3. Documentation update

Update `docs/MACHINE-FACING-LAYER.md` (the operational overview document referenced by FOUNDATIONS §Machine-Facing Layer item 5) to document the new oversize-response shape and the unified `/tmp/worldloom-mcp-tool-results/` persistence convention. Cross-reference from `docs/CONTEXT-PACKET-CONTRACT.md` if that document already discusses the packet's `persisted_with_summary` shape (whose `persisted_output_path` convention this ticket aligns with).

## Files to Touch

- `tools/world-mcp/<get-record-implementation>` (modify) — exact path TBD at implementation start; the change is to the oversize-response branch of `get_record`'s handler.
- `tools/world-mcp/<persistence-helper>` (modify or new) — the path-construction helper for persisted oversize responses; if `get_context_packet` already has a `/tmp/worldloom-mcp-tool-results/` helper, extend it to cover `get_record`; otherwise factor the path construction into a shared helper.
- `docs/MACHINE-FACING-LAYER.md` (modify) — document the new oversize-response shape and the unified persistence convention.
- `docs/CONTEXT-PACKET-CONTRACT.md` (modify if it discusses persisted_output_path) — cross-reference the unified convention.

## Out of Scope

- **Auto-pagination across multiple `get_record` calls**: the proposed fix surfaces section-path suggestions but does not bundle multiple sections into a single response. If a record's body has 9 sections each 12k chars, the operator will need 9 calls. That's acceptable — the operator can choose which sections matter; auto-pagination would re-introduce the oversize problem at a different boundary.
- **Atomic-record oversize handling**: atomic records (`CF-NNNN.yaml`, `INV-N.yaml`, etc.) are bounded in size by the schema and very rarely exceed the cap. This ticket scopes to hybrid records; if atomic records ever exceed cap (a future schema growth), a sister ticket would extend the same approach.
- **Permission-model changes to allow agents to read `~/.claude/projects/...`**: explicitly rejected in the Architecture Check. The fix is to relocate persisted output to a path agents already can read.

## Acceptance Criteria

### Tests That Must Pass

1. `mcp__worldloom__get_record('DA-0001', world_slug='erotica-world')` (no `section_path`) returns `delivery_status: "oversize_with_projection_suggestions"` with non-empty `suggested_section_paths` array containing at least the top-level frontmatter keys (`author_profile`, `claim_map`, `epistemic_horizon`, etc.) and body section names (`18 April`, `19 April`, etc.).
2. The returned `persisted_output_path` matches the pattern `^/tmp/worldloom-mcp-tool-results/.*get_record-DA-0001-.*\.json$` and is readable via direct `Read` from a Claude Code agent context (no permission denial).
3. Re-calling `get_record('DA-0001', section_path='body.18 April')` after the oversize response succeeds and returns the single body section under the response cap.
4. Existing callers using `section_path` projection (e.g., `get_record('CHAR-0001', section_path='frontmatter')`) continue to return identical responses to the pre-change implementation — verify via byte-comparison of the response JSON before and after the change.
5. `world-validate` CLI run against `worlds/erotica-world/` reports zero new issues introduced by the change (the validator framework should not be affected by MCP-tool response shape changes).

### Invariants

1. **The `section_path` projection API surface is preserved unchanged**: any existing caller passing a valid `section_path` value receives a response identical to the pre-change implementation. Only the no-`section_path`-oversize branch changes.
2. **Persisted-output paths are agent-readable**: every MCP tool that writes persisted output for oversize responses must use `/tmp/worldloom-mcp-tool-results/`; no MCP tool may write persisted output to `~/.claude/projects/...` or any other path that Claude Code agents cannot read by default.
3. **Oversize responses are recoverable through documented MCP API alone**: the operator should not need to fall back to direct `Read` of the source file under `worlds/<slug>/<hybrid-dir>/` for any record retrievable through `get_record` — the projection suggestions + persisted path together cover the recovery surface.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/<test-suite>/get-record-oversize.test.ts` (new or extend existing) — covers the new oversize-response shape against a fixture hybrid record exceeding the response cap.
2. `tools/world-mcp/<test-suite>/get-record-projection.test.ts` (modify) — add a test that confirms re-calling `get_record(id, section_path=<suggested>)` after an oversize response returns the projected slice successfully.
3. `tools/world-mcp/<test-suite>/persisted-output-path.test.ts` (new) — confirms persisted-output paths are constructed under `/tmp/worldloom-mcp-tool-results/` for both `get_record` and `get_context_packet`, asserting the shared path policy.

### Commands

1. `cd tools/world-mcp && npm test -- --grep "get_record oversize"` — targeted test of the oversize-response branch.
2. `cd tools/world-mcp && npm test` — full MCP test suite, confirming no regression.
3. **Real-world dry-run**: from a Claude Code agent context, invoke `mcp__worldloom__get_record('DA-0001', world_slug='erotica-world')` (no section_path); confirm the response includes `suggested_section_paths` and that the `persisted_output_path` is under `/tmp/worldloom-mcp-tool-results/` and readable via direct `Read`. Then invoke `get_record('DA-0001', section_path='body.18 April')` and confirm the projected slice returns under cap. The narrower test boundary (just the oversize branch, not the full test suite) is appropriate because the change scope is bounded to one tool's response shape and a shared persistence-path helper; full-suite coverage is the secondary check, not the primary one.
