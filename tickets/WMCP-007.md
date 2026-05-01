# WMCP-007: When `get_context_packet` overflows the harness ceiling, surface a structured inline summary alongside the persisted-output redirect

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — modify `tools/world-mcp/src/context-packet/assemble.ts` and the response-shape contract under `docs/CONTEXT-PACKET-CONTRACT.md` to emit a fast-summary inline payload when the harness redirects oversize responses; add a new MCP tool `mcp__worldloom__get_persisted_packet_slice` for structured slice extraction; update consumer SKILLs (`character-generation`, `diegetic-artifact-generation`) to use the inline summary as the fast path
**Deps**: `archive/tickets/WMCP-005-reconcile-context-packet-budget-harness-ceiling.md` (completed harness-ceiling-aware budget enforcement; overflow is now the exception rather than the typical path, but this ticket is still load-bearing for the cases that genuinely exceed the ceiling — large worlds, broad seed sets, or the rare ceiling-edge call); `archive/tickets/WMCP-006.md` (completed `get_records` batch retrieval surface used by this ticket's persisted-packet recovery guidance)

## Problem

When `get_context_packet` produces a response that the Claude Code MCP harness rejects as too large for inline delivery, the harness writes the response to a temp file and returns an error of the shape:

```
Error: result (102,105 characters) exceeds maximum allowed tokens.
Output has been saved to /home/.../tool-results/<uuid>-<filename>.txt.
Format: JSON with schema: {task_header: {...}, local_authority: {...}, ...}
```

The caller is then expected to extract the relevant content from the persisted file via `jq` or a structured-extract subagent. During the May 2026 character-generation session for `worlds/erotica-world`, this recovery cost ~5 minutes of session time and a subagent-extraction round-trip with a ~15K-token prompt to recover: `governing_world_context.active_rules`, `governing_world_context.protected_surfaces`, `governing_world_context.prohibited_moves`, the parsed bodies of all 10 invariants, the firewall fields of all 4 Mystery Reserve entries, and seed-relevant CF + SEC bodies. Most of this content is small in aggregate — the `governing_world_context` block is 1-3 KB; the invariants are 5-10 KB; the M-record firewall fields are 2-4 KB. The persisted-file roundtrip is overkill for surfacing that small content.

A structured inline summary returned alongside the persisted-output path would give the caller everything they need for canon-safety checks (Phase 7a/b/c discipline) without parsing the persisted file at all. The persisted file would become the optional "I need more than the summary" path, not the obligatory recovery path.

This ticket is paired with archived WMCP-005 (which prevents the overflow in the typical case by aligning the assembler's ceiling with the harness's). WMCP-005 reduced how often overflow happens; WMCP-007 makes recovery fast when it does happen.

## Assumption Reassessment (2026-05-01)

1. The current overflow behavior is a Claude Code harness response — `tools/world-mcp/src/` has no code path for "the response would exceed harness ceiling, return a different shape." The harness intercepts large MCP responses uniformly and persists them. So the fast-summary inline payload must be emitted by the assembler PROACTIVELY when it detects (via either WMCP-005's character-ceiling check OR a pre-emit size check) that the full response will exceed the harness ceiling. The assembler returns a degraded-but-structured response inline; the harness still has the option to persist the FULL response separately.
2. FOUNDATIONS principle under audit: §Tooling Recommendation completeness guarantees. Currently when overflow happens, the consumer's first-leg load (the packet) is unusable inline, forcing a full-recovery flow. A structured inline summary preserves the first-leg load's most load-bearing slice (governing context — Phase 7a invariants, Phase 7b M-record firewalls, the active rules and protected surfaces) so the consumer can proceed with canon-safety checks without parsing the persisted file. The completeness guarantee is preserved (every record-id is still listed; full bodies are retrievable via targeted `get_record` or via persisted-file slice extraction); the delivery shape is degraded gracefully rather than erroring out.
3. Cross-skill shared boundary: every skill that calls `get_context_packet` consumes the response shape. The fast-summary inline payload is a NEW response shape (or a new sub-shape of the existing response) that consumers must learn to handle. The `task_header.delivery_status` discriminator (proposed below) lets consumers branch on `inline | summary_only_inline | persisted_with_summary` cleanly.
4. FOUNDATIONS alignment: §Tooling Recommendation already permits "directly or via the documented context-packet + targeted-retrieval pattern". Returning a fast-summary inline payload + persisted full body is a refinement of "documented context-packet" — the documented context-packet has multiple delivery modes; this ticket adds one. No FOUNDATIONS amendment required.
5. Existing same-seam behavior to preserve: when the full response fits inline (the typical case after WMCP-005), the response shape is unchanged. When it doesn't fit, the harness's existing persistence behavior is unchanged on the harness side; the new behavior is an additional inline body sent before the persistence kicks in.
6. Schema extension shape: additive on response — adds `task_header.delivery_status: 'inline' | 'persisted_with_summary'`, `task_header.persisted_output_path?: string`, `governing_summary: { active_rules, protected_surfaces, prohibited_moves, required_output_schema, dropped_node_ids_by_class }` (a new top-level summary block populated only when delivery_status='persisted_with_summary'). Existing consumers that branch on `task_header.delivery_status` (or its absence — old tools without the field default to 'inline') keep working.
7. Adjacent contradictions: WMCP-005 landed a `task_header.harness_ceiling_chars` field; this ticket proposes `task_header.delivery_status` and a `governing_summary` block. The two field sets are independent additive `task_header` extensions.
8. Mismatch + correction: the current contract claims `truncation_summary` is "always present on a successful packet response" — but in the overflow case the full response (including `truncation_summary`) is the persisted-file content, not inline. The new fast-summary inline payload should ALSO include `truncation_summary` for parity with the inline-success case, so consumers can read it unconditionally regardless of `delivery_status`. The contract update should clarify that `truncation_summary` is part of every inline-deliverable response shape, including the new fast-summary shape.

## Architecture Check

1. **A proactive fast-summary inline payload is cleaner than a passive harness-side persistence behavior.** Currently the assembler builds the full response and hands it to the harness; the harness either delivers inline or persists. The assembler has no knowledge of which path will be taken. With this ticket, the assembler computes the response size, branches when overflow is imminent, and proactively emits the small fast-summary inline + arranges for the full response to be persisted. The decision point lives in the assembler where it has full context, not in the harness which sees only bytes.
2. **A dedicated MCP tool for persisted-file slice extraction is cleaner than re-parsing JSON via subagent each time.** `mcp__worldloom__get_persisted_packet_slice(persisted_path, slice_path)` returns a specific slice (`governing_world_context.nodes`, `local_authority.nodes[id=X]`, etc.) by path. This avoids the subagent extraction tax for any slice that's needed beyond the fast-summary, while keeping the persisted file as the canonical source of truth for the full response.
3. No backwards-compatibility aliasing/shims introduced. The `task_header.delivery_status` field is additive; the `governing_summary` block is additive (and only present in the new shape); the new tool is additive.

## Verification Layers

1. Fast-summary inline payload is emitted when overflow is imminent -> `tools/world-mcp/tests/context-packet/fast-summary-inline.test.ts` (new) constructs a packet that would exceed the harness ceiling, calls `get_context_packet`, and proves the inline response carries `task_header.delivery_status='persisted_with_summary'`, `task_header.persisted_output_path` (some non-empty path), `governing_summary` with all four fields populated (active_rules, protected_surfaces, prohibited_moves, required_output_schema), and the per-class dropped node-ids sets.
2. The persisted file's content matches the would-be-inline response -> the same test reads the persisted file at the returned path and proves its JSON structure equals the response that WOULD have been emitted inline if the ceiling were higher.
3. Consumer can resolve a slice via the new tool -> `tools/world-mcp/tests/tools/get-persisted-packet-slice.test.ts` (new) calls `get_persisted_packet_slice(persisted_path, 'governing_world_context.nodes')` and proves the returned slice matches the persisted file's `.governing_world_context.nodes` content.
4. Existing inline-deliverable case is unchanged -> existing tests pass without modification; new test adds a "this packet fits inline" case proving `task_header.delivery_status='inline'` and `governing_summary` is absent.
5. FOUNDATIONS alignment -> manual review of `docs/FOUNDATIONS.md` §Tooling Recommendation; the new fast-summary delivery shape is an additional valid expression of the packet-plus-targeted-retrieval contract.
6. Cross-skill consumer SKILL update -> manual review that `character-generation/references/world-state-prerequisites.md` §Context-packet-too-large fallback (and parallel reference in `diegetic-artifact-generation`) are updated to use the fast-summary inline payload as the primary recovery surface, with subagent-extraction reframed as the rare case where the consumer needs a slice the fast-summary doesn't already cover.

## What to Change

### 1. Pre-emit overflow detection in the assembler

After `enforceBudget` (per WMCP-005's dual-ceiling enforcement) returns, check whether the assembled packet would still exceed the harness ceiling. If yes (rare after WMCP-005; the layered-drop loop already handles most cases), emit a fast-summary inline payload and arrange for the full packet to be persisted via the harness's existing oversize-response path. The detection point is `tools/world-mcp/src/context-packet/assemble.ts`; the persistence path may need explicit cooperation (e.g., the harness needs the FULL response to persist; the assembler returns the FULL response; the harness's existing logic determines persistence-vs-inline; if persisted, the harness wraps the response with the fast-summary the assembler computed).

The cleanest implementation: the assembler computes and returns BOTH the full response AND a fast-summary as siblings inside the response object. The harness chooses which to deliver inline based on its ceiling check (full when it fits; fast-summary when it doesn't, plus persisting the full response per existing behavior). The harness wraps the fast-summary with `task_header.persisted_output_path` set to the persistence-output file path.

If the harness API doesn't permit this two-payload shape, the alternative is: assembler computes the fast-summary; if pre-emit size estimate says full will overflow, assembler RETURNS the fast-summary as the response and writes the full response to the persistence path itself, then the harness delivers the fast-summary inline (because it now fits). This requires the assembler to know the persistence path conventions, which is a coupling cost.

Pick the cleaner approach at implementation time per the actual harness API. Both achieve the same external behavior.

### 2. Define the fast-summary inline payload shape

Update `docs/CONTEXT-PACKET-CONTRACT.md` with a new sub-section "§Fast-Summary Inline Delivery (overflow case)" documenting:

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

# Layer arrays present but minimal (id+kind only); bodies live in persisted file
local_authority:
  nodes: [{ id: 'entity:donostia', node_type: 'named_entity' }, ...]
  why_included: [...]
governing_world_context:
  nodes: [{ id: 'ONT-1', node_type: 'invariant' }, ...]
  why_included: [...]
exact_record_links: { nodes: [], why_included: [] }
scoped_local_context: { nodes: [...], why_included: [...] }
impact_surfaces: { nodes: [...], rationale: [...] }
```

The fast-summary inline payload's total size is bounded (thousands of characters max), well within harness ceiling.

### 3. Implement `mcp__worldloom__get_persisted_packet_slice`

Create `tools/world-mcp/src/tools/get-persisted-packet-slice.ts`:

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

Same pattern as archived `archive/tickets/WMCP-006.md`: register `mcp__worldloom__get_persisted_packet_slice` in `tools/world-mcp/src/server.ts`; extend `tools/world-mcp/tests/server/dispatch.test.ts` coverage.

### 5. Update consumer SKILL fallback prose

`character-generation/references/world-state-prerequisites.md` §Context-packet-too-large fallback (added per the May 2026 skill audit) currently describes a "Step 2 — direct-Read root files + per-record retrieval for dropped layers, OR subagent-extraction for persisted-output redirect" recovery path. With this ticket landed, the persisted-output-redirect case becomes:

> **Step 2a (after WMCP-007) — fast-summary inline payload**: when `task_header.delivery_status === 'persisted_with_summary'`, the inline response already carries the governing_summary (active_rules, protected_surfaces, prohibited_moves, required_output_schema), the open_risk_ids list (Phase 7b firewall scope), the invariant_ids list (Phase 7a scope), and the seed_relevant_cf_ids list (Phase 7c scope). Use these to scope the canon-safety checks; for any specific id whose body is needed, call `mcp__worldloom__get_record(id)` (or `get_records([...])` per archived `archive/tickets/WMCP-006.md`) directly. The persisted file is available at `task_header.persisted_output_path` for slice extraction via `mcp__worldloom__get_persisted_packet_slice` if the fast-summary plus per-id retrieval doesn't cover the need.

> **Step 2b (legacy) — subagent extraction of persisted file**: only required when the fast-summary doesn't expose what's needed AND the slice path isn't easily expressible via `get_persisted_packet_slice`.

`diegetic-artifact-generation/references/world-state-prerequisites.md` §Context-packet-too-large fallback gets the parallel update.

## Files to Touch

- `tools/world-mcp/src/context-packet/assemble.ts` (modify) — emit fast-summary inline payload when overflow detected
- `tools/world-mcp/src/context-packet/governing-world-context.ts` (modify) — extract small `governing_summary` shape from the assembled packet
- `tools/world-mcp/src/context-packet/types.ts` (modify, if separate file exists) — extend `TaskHeader` with `delivery_status` and `persisted_output_path`; add `governing_summary` block to response type
- `tools/world-mcp/src/tools/get-persisted-packet-slice.ts` (new)
- `tools/world-mcp/src/server.ts` (modify) — register the new tool
- `tools/world-mcp/tests/context-packet/fast-summary-inline.test.ts` (new) — proves overflow case emits the fast-summary
- `tools/world-mcp/tests/tools/get-persisted-packet-slice.test.ts` (new) — proves slice-extraction tool
- `tools/world-mcp/tests/server/dispatch.test.ts` (modify) — extend dispatcher coverage
- `docs/CONTEXT-PACKET-CONTRACT.md` (modify) — add §Fast-Summary Inline Delivery sub-section
- `docs/FOUNDATIONS.md` (modify) — add `get_persisted_packet_slice` to §Tooling Recommendation list of targeted-retrieval surfaces
- `docs/MACHINE-FACING-LAYER.md` (modify if present) — document the overflow recovery flow
- `.claude/skills/character-generation/references/world-state-prerequisites.md` (modify) — update §Context-packet-too-large fallback to use fast-summary as primary recovery
- `.claude/skills/diegetic-artifact-generation/references/world-state-prerequisites.md` (modify) — parallel update

## Out of Scope

- Eliminating the persisted file entirely (keeping it preserves the full-response audit trail for debugging and gives consumers an escape hatch when they really need the full body).
- Streaming response shape (the persisted-file path is enough; streaming adds complexity without obvious benefit for the use cases).
- Changing the harness's persistence behavior (outside our control).
- Auto-resolving every persisted-packet slice request via the new tool (consumer-driven; the tool is opt-in by call shape).

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/world-mcp && npm run build && node --test dist/tests/context-packet/fast-summary-inline.test.js` — proves overflow case emits the fast-summary structure with all expected fields.
2. `cd tools/world-mcp && npm run build && node --test dist/tests/tools/get-persisted-packet-slice.test.js` — proves the slice-extraction tool returns expected slices and handles missing paths gracefully.
3. `cd tools/world-mcp && npm run build && node --test dist/tests/server/dispatch.test.js` — proves the new tool is registered.
4. `cd tools/world-mcp && npm test` — full pipeline.

### Invariants

1. Every `get_context_packet` response carries a `task_header.delivery_status` field with value `'inline'` or `'persisted_with_summary'`.
2. When `delivery_status === 'persisted_with_summary'`, the response carries a populated `governing_summary` block AND a `task_header.persisted_output_path` pointing to a readable file.
3. The persisted file's JSON content equals the would-be-inline-full response (i.e., the fast-summary is a strict subset of the persisted file's content; no information is unique to the inline response).
4. `mcp__worldloom__get_persisted_packet_slice(persisted_path, slice_path)` returns the same content as parsing the persisted file's JSON and traversing the slice_path manually.
5. `truncation_summary` is present on every successful response (inline or fast-summary), so consumers can read it unconditionally.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/context-packet/fast-summary-inline.test.ts` — fixture test proving (a) overflow case emits `delivery_status='persisted_with_summary'`; (b) `governing_summary` block is fully populated; (c) layer arrays carry id+kind only (not full bodies); (d) persisted file is readable and equals would-be-inline; (e) inline-deliverable case still emits `delivery_status='inline'` and no `governing_summary`.
2. `tools/world-mcp/tests/tools/get-persisted-packet-slice.test.ts` — fixture test proving (a) basic slice extraction (governing_world_context.nodes); (b) indexed slice (local_authority.nodes[id=X]); (c) missing-path graceful error; (d) path traversal sanity check (only paths under tool-results directory accepted).
3. `tools/world-mcp/tests/server/dispatch.test.ts` — extend with one case proving `get_persisted_packet_slice` is registered.
4. `tools/world-mcp/tests/context-packet/full-body-delivery.test.ts` (existing) — re-run to verify backward compatibility.

### Commands

1. `cd tools/world-mcp && npm run build && node --test dist/tests/context-packet/fast-summary-inline.test.js dist/tests/tools/get-persisted-packet-slice.test.js dist/tests/server/dispatch.test.js` — targeted verification.
2. `cd tools/world-mcp && npm test` — full pipeline.
3. Manual: synthesize an overflow scenario against `worlds/erotica-world` (e.g., by setting `WORLDLOOM_MCP_HARNESS_CEILING_CHARS=10000` to force overflow on a small packet) and confirm the fast-summary inline payload arrives with all expected fields, plus `get_persisted_packet_slice` works against the resulting persisted file.
