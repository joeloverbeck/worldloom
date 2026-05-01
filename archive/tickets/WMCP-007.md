# WMCP-007: When `get_context_packet` would overflow the harness ceiling, return a structured inline summary plus a package-persisted full packet

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — `tools/world-mcp` now emits `task_header.delivery_status`, persists the fully assembled context packet through a package-local tool-results path when it would exceed the configured harness ceiling, returns a bounded `governing_summary` inline, and registers `mcp__worldloom__get_persisted_packet_slice` for structured persisted-packet recovery; docs and character/diegetic-artifact consumer SKILLs now use the inline summary as the fast path
**Deps**: `archive/tickets/WMCP-005-reconcile-context-packet-budget-harness-ceiling.md` (completed harness-ceiling-aware budget enforcement; overflow is now the exception rather than the typical path, but this ticket is still load-bearing for the cases that genuinely exceed the ceiling — large worlds, broad seed sets, or the rare ceiling-edge call); `archive/tickets/WMCP-006.md` (completed `get_records` batch retrieval surface used by this ticket's persisted-packet recovery guidance)

## Problem

At intake, when `get_context_packet` produced a response that the Claude Code MCP harness rejected as too large for inline delivery, the harness wrote the response to a temp file and returned an error of the shape:

```
Error: result (102,105 characters) exceeds maximum allowed tokens.
Output has been saved to /home/.../tool-results/<uuid>-<filename>.txt.
Format: JSON with schema: {task_header: {...}, local_authority: {...}, ...}
```

The caller was then expected to extract the relevant content from the persisted file via `jq` or a structured-extract subagent. During the May 2026 character-generation session for `worlds/erotica-world`, this recovery cost ~5 minutes of session time and a subagent-extraction round-trip with a ~15K-token prompt to recover: `governing_world_context.active_rules`, `governing_world_context.protected_surfaces`, `governing_world_context.prohibited_moves`, the parsed bodies of all 10 invariants, the firewall fields of all 4 Mystery Reserve entries, and seed-relevant CF + SEC bodies. Most of this content is small in aggregate — the `governing_world_context` block is 1-3 KB; the invariants are 5-10 KB; the M-record firewall fields are 2-4 KB. The persisted-file roundtrip was overkill for surfacing that small content.

The landed structured inline summary gives the caller the fast canon-safety scope (Phase 7a/b/c discipline) without parsing the persisted file first. The persisted file is now the optional "I need more than the summary" path, not the obligatory recovery path.

This ticket is paired with archived WMCP-005 (which prevents the overflow in the typical case by aligning the assembler's ceiling with the harness's). WMCP-005 reduced how often overflow happens; WMCP-007 makes package-local recovery fast when a fully assembled packet still exceeds the configured ceiling.

## Assumption Reassessment (2026-05-01)

1. The current overflow behavior was originally observed as a Claude Code harness response, but WMCP-005 changed the live package boundary: `tools/world-mcp/src/context-packet/assemble.ts` now enforces `WORLDLOOM_MCP_HARNESS_CEILING_CHARS` before returning, so the external harness no longer sees an oversize packet to persist. The fast-summary path must therefore be package-local: when the fully assembled packet would exceed the configured harness ceiling, `world-mcp` persists that full packet itself and returns a bounded inline summary response with a readable persisted path.
2. FOUNDATIONS principle under audit: §Tooling Recommendation completeness guarantees. Currently when overflow happens, the consumer's first-leg load (the packet) is unusable inline, forcing a full-recovery flow. A structured inline summary preserves the first-leg load's most load-bearing slice (governing context — Phase 7a invariants, Phase 7b M-record firewalls, the active rules and protected surfaces) so the consumer can proceed with canon-safety checks without parsing the persisted file. The completeness guarantee is preserved (every record-id is still listed; full bodies are retrievable via targeted `get_record` or via persisted-file slice extraction); the delivery shape is degraded gracefully rather than erroring out.
3. Cross-skill shared boundary: every skill that calls `get_context_packet` consumes the response shape. The fast-summary inline payload is a new sub-shape of the existing response that consumers must learn to handle. The landed `task_header.delivery_status` discriminator lets consumers branch on `inline | persisted_with_summary` cleanly.
4. FOUNDATIONS alignment: §Tooling Recommendation already permits "directly or via the documented context-packet + targeted-retrieval pattern". Returning a fast-summary inline payload + persisted full body is a refinement of "documented context-packet" — the documented context-packet has multiple delivery statuses. FOUNDATIONS now names `mcp__worldloom__get_persisted_packet_slice` as a targeted-retrieval surface.
5. Existing same-seam behavior to preserve: when the full response fits inline (the typical case after WMCP-005), the response remains a normal packet and gains only the additive `task_header.delivery_status='inline'` discriminator. When the fully assembled response does not fit, `world-mcp` writes the full response under its configured tool-results directory and returns `delivery_status='persisted_with_summary'` inline instead of layer-dropping away the governing context.
6. Schema extension shape: additive on response — adds `task_header.delivery_status: 'inline' | 'persisted_with_summary'`, `task_header.persisted_output_path?: string`, `governing_summary: { active_rules, protected_surfaces, prohibited_moves, required_output_schema, dropped_node_ids_by_class }` (a new top-level summary block populated only when delivery_status='persisted_with_summary'). Existing consumers that branch on `task_header.delivery_status` (or its absence — old tools without the field default to 'inline') keep working.
7. Adjacent contradictions: WMCP-005 landed a `task_header.harness_ceiling_chars` field; this ticket proposes `task_header.delivery_status` and a `governing_summary` block. The two field sets are independent additive `task_header` extensions.
8. Mismatch + correction: the current contract claims `truncation_summary` is "always present on a successful packet response" — but in the overflow case the full response (including `truncation_summary`) is persisted while the inline response is a summary. The landed fast-summary response also includes `truncation_summary`, so consumers can read it unconditionally regardless of `delivery_status`.

## Architecture Check

1. **A proactive package-local fast-summary payload is cleaner than trying to depend on harness-side persistence.** WMCP-005 means the assembler already owns the character-ceiling decision. With this ticket, the assembler computes the response size, branches when overflow is imminent, persists the full response through a package-local tool-results path, and emits the small fast-summary inline. The decision point lives where the packet context exists.
2. **A dedicated MCP tool for persisted-file slice extraction is cleaner than re-parsing JSON via subagent each time.** `mcp__worldloom__get_persisted_packet_slice(persisted_path, slice_path)` returns a specific slice (`governing_world_context.nodes`, `local_authority.nodes[id=X]`, etc.) by path. This avoids the subagent extraction tax for any slice that's needed beyond the fast-summary, while keeping the persisted file as the canonical source of truth for the full response.
3. No backwards-compatibility aliasing/shims introduced. The `task_header.delivery_status` field is additive; the `governing_summary` block is additive (and only present in the new shape); the new tool is additive.

## Verification Layers

1. Fast-summary inline payload is emitted when overflow is imminent -> `tools/world-mcp/tests/context-packet/harness-ceiling.test.ts` constructs a packet that would exceed the harness ceiling, calls `assembleContextPacket`, and proves the inline response carries `task_header.delivery_status='persisted_with_summary'`, `task_header.persisted_output_path`, `governing_summary` with load-bearing fields populated, and per-class omitted node-id sets.
2. The persisted file's content matches the would-be-inline response -> the same test reads the persisted file at the returned path and proves it is the oversize full packet that would have been emitted inline if the ceiling were higher.
3. Consumer can resolve a slice via the new tool -> `tools/world-mcp/tests/tools/get-persisted-packet-slice.test.ts` (new) calls `get_persisted_packet_slice(persisted_path, 'governing_world_context.nodes')` and proves the returned slice matches the persisted file's `.governing_world_context.nodes` content.
4. Existing inline-deliverable case is unchanged -> existing context-packet tests and the full package suite pass with additive `task_header.delivery_status='inline'` on normal responses.
5. FOUNDATIONS alignment -> manual review of `docs/FOUNDATIONS.md` §Tooling Recommendation; the new fast-summary delivery shape is an additional valid expression of the packet-plus-targeted-retrieval contract.
6. Cross-skill consumer SKILL update -> manual review that `character-generation/references/world-state-prerequisites.md` §Context-packet-too-large fallback (and parallel reference in `diegetic-artifact-generation`) are updated to use the fast-summary inline payload as the primary recovery surface, with subagent-extraction reframed as the rare case where the consumer needs a slice the fast-summary doesn't already cover.

## What to Change

### 1. Pre-emit overflow detection in the assembler

After full layer assembly and class filtering, check whether the assembled packet would exceed the harness ceiling before layer drops remove context. If yes, write the full packet JSON under the package-local tool-results directory and return a fast-summary inline payload with `task_header.persisted_output_path` set to that file. The default tool-results directory is package-controlled and can be overridden for tests/operators with `WORLDLOOM_MCP_TOOL_RESULTS_DIR`.

The live harness API does not expose a two-payload "persist this but deliver that" hook to this package, and WMCP-005 prevents oversize packets from reaching the external harness. The landed implementation therefore uses the package-local persistence path.

### 2. Define the fast-summary inline payload shape

Updated `docs/CONTEXT-PACKET-CONTRACT.md` with a new sub-section "§Fast-Summary Inline Delivery" documenting:

```yaml
# Inline response when full packet would exceed harness ceiling
task_header:
  task_type: character_generation
  world_slug: erotica-world
  generated_at: 2026-05-01T18:30:55.582Z
  token_budget: { requested: 33000, allocated: <amount> }
  seed_nodes: [entity:donostia, entity:spain, entity:basque-country]
  packet_version: 2
  delivery_status: 'persisted_with_summary'         # 'inline' | 'persisted_with_summary'
  persisted_output_path: '/home/.../tool-results/<uuid>-<filename>.txt'
  harness_ceiling_chars: 80000                      # per WMCP-005
  estimator_version: 'chars-per-token-v1'           # per WMCP-005

# Always present in the fast-summary case; small-and-essential governing context
governing_summary:
  active_rules: [...]                                # full list (small)
  protected_surfaces: [...]                          # full list (small)
  prohibited_moves: [...]                            # full list (small)
  required_output_schema: [...]                     # full list (small)
  open_risk_ids: ['M-1', 'M-2', 'M-3', 'M-4']       # ids only; bodies live in persisted file
  invariant_ids: ['ONT-1', 'ONT-2', ...]            # ids only; bodies live in persisted file
  seed_relevant_cf_ids: ['CF-0001', 'CF-0002']      # ids only; bodies live in persisted file

# Always present in the fast-summary case; tells consumer what's in the persisted file by class
truncation_summary:
  dropped_layers: []                                 # empty in this case — overflow is total, not layered
  dropped_node_ids_by_layer: {}
  full_body_downgrades: []
  fallback_advice: "Full packet body persisted at task_header.persisted_output_path. Use mcp__worldloom__get_persisted_packet_slice for structured slice extraction, or mcp__worldloom__get_record for individual nodes by id."

# Inline layer arrays are empty; ids by class live in governing_summary, and
# full layer contents live in the persisted packet.
local_authority:
  nodes: []
  why_included: [...]
governing_world_context:
  nodes: []
  why_included: [...]
exact_record_links: { nodes: [], why_included: [] }
scoped_local_context: { nodes: [], why_included: [...] }
impact_surfaces: { nodes: [], rationale: [...] }
```

The fast-summary inline payload's total size is bounded (thousands of characters max), well within harness ceiling.

### 3. Implement `mcp__worldloom__get_persisted_packet_slice`

Created `tools/world-mcp/src/tools/get-persisted-packet-slice.ts`:

```ts
input: {
  persisted_path: string,
  slice_path: string                                 // dot-path: 'governing_world_context.nodes' or 'local_authority.nodes[id=entity:donostia]'
}

output: {
  found: boolean,
  slice?: any,                                       // the JSON sub-tree at the path
  error?: { code: string, detail: string }
}
```

The tool reads the persisted file from disk (the path is harness-controlled, never user-controlled, so no path-traversal concern; validate that the path is under the harness's tool-results directory). Parses the JSON and extracts the slice via the dot-path syntax. Returns the slice or a `not found` error.

This tool sits alongside `get_record` and `get_records` (per archived `archive/tickets/WMCP-006.md`) as a third targeted-retrieval surface, specifically for the persisted-packet recovery flow.

### 4. Register the new tool and update the dispatcher

Registered `mcp__worldloom__get_persisted_packet_slice` in `tools/world-mcp/src/tool-names.ts` and `tools/world-mcp/src/server.ts`; extended `tools/world-mcp/tests/server/dispatch.test.ts` and `tools/world-mcp/tests/server/list-tools.test.ts` coverage.

### 5. Update consumer SKILL fallback prose

`character-generation/references/world-state-prerequisites.md` §Context-packet-too-large fallback and the parallel diegetic-artifact reference now use the `persisted_with_summary` path first:

> **Step 2a (after WMCP-007) — fast-summary inline payload**: when `task_header.delivery_status === 'persisted_with_summary'`, the inline response already carries the governing_summary (active_rules, protected_surfaces, prohibited_moves, required_output_schema), the open_risk_ids list (Phase 7b firewall scope), the invariant_ids list (Phase 7a scope), and the seed_relevant_cf_ids list (Phase 7c scope). Use these to scope the canon-safety checks; for any specific id whose body is needed, call `mcp__worldloom__get_record(id)` (or `get_records([...])` per archived `archive/tickets/WMCP-006.md`) directly. The persisted file is available at `task_header.persisted_output_path` for slice extraction via `mcp__worldloom__get_persisted_packet_slice` if the fast-summary plus per-id retrieval doesn't cover the need.

> **Step 2b (legacy) — subagent extraction of persisted file**: only required when the fast-summary doesn't expose what's needed AND the slice path isn't easily expressible via `get_persisted_packet_slice`.

`diegetic-artifact-generation/references/world-state-prerequisites.md` §Context-packet-too-large fallback gets the parallel update.

## Files to Touch

- `tools/world-mcp/src/context-packet/assemble.ts` (modify) — emit fast-summary inline payload when overflow detected
- `tools/world-mcp/src/context-packet/shared.ts` (modify) — extend `ContextPacket` with `delivery_status`, `persisted_output_path`, and `governing_summary`
- `tools/world-mcp/src/context-packet/persistence.ts` (new) — package-local persisted-packet writer/root validator
- `tools/world-mcp/src/tools/get-persisted-packet-slice.ts` (new)
- `tools/world-mcp/src/tool-names.ts` (modify) — add the public tool name and deterministic inventory order
- `tools/world-mcp/src/server.ts` (modify) — register the new tool
- `tools/world-mcp/src/errors.ts` (modify) — add `slice_not_found`
- `tools/world-mcp/tests/context-packet/harness-ceiling.test.ts` (modify) — proves overflow case emits the fast-summary
- `tools/world-mcp/tests/tools/get-persisted-packet-slice.test.ts` (new) — proves slice-extraction tool
- `tools/world-mcp/tests/server/dispatch.test.ts` (modify) — extend dispatcher coverage
- `tools/world-mcp/tests/server/list-tools.test.ts` (modify) — update exact tool inventory count
- `tools/world-mcp/tests/errors.test.ts` (modify) — update exact error taxonomy
- `tools/world-mcp/README.md` (modify) — document package-local tool inventory and recovery behavior
- `docs/CONTEXT-PACKET-CONTRACT.md` (modify) — add §Fast-Summary Inline Delivery sub-section
- `docs/FOUNDATIONS.md` (modify) — add `get_persisted_packet_slice` to §Tooling Recommendation list of targeted-retrieval surfaces
- `docs/MACHINE-FACING-LAYER.md` (modify) — document the overflow recovery flow
- `.claude/skills/character-generation/SKILL.md` (modify) — top-level fallback summary names `persisted_with_summary`
- `.claude/skills/character-generation/references/world-state-prerequisites.md` (modify) — update §Context-packet-too-large fallback to use fast-summary as primary recovery
- `.claude/skills/diegetic-artifact-generation/SKILL.md` (modify) — top-level fallback summary names `persisted_with_summary`
- `.claude/skills/diegetic-artifact-generation/references/world-state-prerequisites.md` (modify) — parallel update

## Out of Scope

- Eliminating the persisted file entirely (keeping it preserves the full-response audit trail for debugging and gives consumers an escape hatch when they really need the full body).
- Streaming response shape (the persisted-file path is enough; streaming adds complexity without obvious benefit for the use cases).
- Changing the harness's persistence behavior (outside our control).
- Auto-resolving every persisted-packet slice request via the new tool (consumer-driven; the tool is opt-in by call shape).

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/world-mcp && npm run build && node --test dist/tests/context-packet/harness-ceiling.test.js` — proves overflow case emits the fast-summary structure with all expected fields and persists the full packet.
2. `cd tools/world-mcp && npm run build && node --test dist/tests/tools/get-persisted-packet-slice.test.js` — proves the slice-extraction tool returns expected slices and handles missing paths gracefully.
3. `cd tools/world-mcp && npm run build && node --test dist/tests/server/dispatch.test.js dist/tests/server/list-tools.test.js` — proves the new tool is registered and listed.
4. `cd tools/world-mcp && npm test` — full pipeline.

### Invariants

1. Every `get_context_packet` response carries a `task_header.delivery_status` field with value `'inline'` or `'persisted_with_summary'`.
2. When `delivery_status === 'persisted_with_summary'`, the response carries a populated `governing_summary` block AND a `task_header.persisted_output_path` pointing to a readable file.
3. The persisted file's JSON content equals the would-be-inline-full response (i.e., the fast-summary is a strict subset of the persisted file's content; no information is unique to the inline response).
4. `mcp__worldloom__get_persisted_packet_slice(persisted_path, slice_path)` returns the same content as parsing the persisted file's JSON and traversing the slice_path manually.
5. `truncation_summary` is present on every successful response (inline or fast-summary), so consumers can read it unconditionally.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/context-packet/harness-ceiling.test.ts` — fixture test proving (a) overflow case emits `delivery_status='persisted_with_summary'`; (b) `governing_summary` block is populated; (c) inline layer arrays are empty while omitted ids are listed by class; (d) persisted file is readable and is the oversize would-be-inline packet.
2. `tools/world-mcp/tests/tools/get-persisted-packet-slice.test.ts` — fixture test proving (a) basic slice extraction (governing_world_context.nodes); (b) indexed slice (local_authority.nodes[id=X]); (c) missing-path graceful error; (d) path traversal sanity check (only paths under tool-results directory accepted).
3. `tools/world-mcp/tests/server/dispatch.test.ts` — extend with one case proving `get_persisted_packet_slice` is registered.
4. `tools/world-mcp/tests/context-packet/full-body-delivery.test.ts` (existing) — re-run to verify backward compatibility.

### Commands

1. `cd tools/world-mcp && npm run build && node --test dist/tests/context-packet/harness-ceiling.test.js dist/tests/tools/get-persisted-packet-slice.test.js dist/tests/server/dispatch.test.js dist/tests/server/list-tools.test.js` — targeted verification.
2. `cd tools/world-mcp && npm test` — full pipeline.
3. Manual check replaced by mechanized package tests using a temp seeded world and a package-local tool-results directory.

## Outcome

Completion date: 2026-05-01.

Implemented the fast-summary recovery path in `tools/world-mcp`:

- `assembleContextPacket` now sets `task_header.delivery_status='inline'` for ordinary responses.
- When the fully assembled packet exceeds `task_header.harness_ceiling_chars`, `world-mcp` writes the full packet JSON under the package-local tool-results directory, returns `delivery_status='persisted_with_summary'`, includes `task_header.persisted_output_path`, and carries a compact `governing_summary` inline.
- Added `mcp__worldloom__get_persisted_packet_slice(persisted_path, slice_path)` with dot-path traversal and `nodes[id=...]` selection, guarded to the configured tool-results root.
- Registered the new tool in `tool-names.ts` / `server.ts`, updated list-tools and dispatch coverage, and extended the MCP error taxonomy with `slice_not_found`.
- Updated `docs/CONTEXT-PACKET-CONTRACT.md`, `docs/FOUNDATIONS.md`, `docs/MACHINE-FACING-LAYER.md`, `tools/world-mcp/README.md`, and the character/diegetic-artifact skill fallback prose so consumers use `governing_summary`, `get_records`, and `get_persisted_packet_slice` before legacy extraction.

## Verification Result

Passed:

1. `cd tools/world-mcp && npm run build`
2. `cd tools/world-mcp && node --test dist/tests/context-packet/harness-ceiling.test.js dist/tests/tools/get-persisted-packet-slice.test.js dist/tests/server/dispatch.test.js dist/tests/server/list-tools.test.js`
3. `cd tools/world-mcp && npm test` — passed, 252 tests.

Manual/closeout checks:

1. Re-read `docs/CONTEXT-PACKET-CONTRACT.md`, `docs/MACHINE-FACING-LAYER.md`, `tools/world-mcp/README.md`, and both updated skill prerequisite references for same-seam stale fallback wording.
2. `git status --short --ignored tools/world-mcp` shows expected pre-existing/generated ignored package artifacts: `tools/world-mcp/.secret`, `tools/world-mcp/dist/`, and `tools/world-mcp/node_modules/`.

## Deviations

- The original draft assumed the external Claude Code harness could persist the full packet while `world-mcp` supplied a sibling inline summary. WMCP-005 made that boundary stale: `world-mcp` now enforces the harness ceiling before return. The landed implementation uses package-local persistence with `WORLDLOOM_MCP_TOOL_RESULTS_DIR` override.
- No separate `tools/world-mcp/tests/context-packet/fast-summary-inline.test.ts` was created. The existing harness-ceiling test is the correct same-seam regression witness and now proves the fast-summary overflow behavior.
- No `tools/world-mcp/src/context-packet/types.ts` edit was needed; the live `ContextPacket` type lives in `shared.ts`.
- No `tools/world-mcp/src/context-packet/governing-world-context.ts` edit was needed; `governing_summary` is derived from the already assembled packet in `assemble.ts`.
- Inline fast-summary layer `nodes` arrays are empty rather than id+kind mini-nodes; the omitted ids are carried compactly in `governing_summary.dropped_node_ids_by_class`, and the persisted full packet remains the structured source for full layer payloads.
