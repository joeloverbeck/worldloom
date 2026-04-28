# CORRIDOR-002: Context packet — `summary_only` delivery mode for index-without-previews

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `tools/world-mcp/` packet-builder (new optional `delivery_mode` parameter); `docs/CONTEXT-PACKET-CONTRACT.md` schema extension
**Deps**: CORRIDOR-001 (strict budget enforcement is the foundation; `summary_only` mode is a stricter trim that complements truncation)

## Problem

The current `get_context_packet` response shape includes body-preview snippets for every node in `local_authority`, `scoped_local_context`, `governing_world_context`, and `impact_surfaces`. For Phase 7 firewall scoping, a skill often needs only the question "which records do I need to firewall?" — i.e., the IDs and one-line summaries — not the body-preview content. The current shape forces consumers to either accept the full preview budget (overflowing inline delivery on mature worlds, per CORRIDOR-001) or to skip the packet entirely and call `get_record` per id.

A focused `summary_only` delivery mode that returns IDs + ~100-char summaries per node (no body-previews) gives the consumer a compact "what's relevant" index. Phase 1-3 of `diegetic-artifact-generation` and the firewall-scoping pass of `canon-addition` are the immediate beneficiaries; both currently consume the full packet just to enumerate which records they need to inspect.

## Assumption Reassessment (2026-04-27)

1. `tools/world-mcp/src/tools/get-context-packet.ts` (path verified at implementation time) is the parameter-surface owner; adding `delivery_mode: 'full' | 'summary_only'` as an optional parameter (default `'full'`) is additive.
2. `docs/CONTEXT-PACKET-CONTRACT.md` line 118 already documents that the packet delivers index + body-previews; `summary_only` mode is a documented variant of that same index-plus-content discipline, with the content trimmed from preview-snippets to one-line summaries.
3. Cross-artifact boundary: `delivery_mode` is a new optional parameter; existing callers without `delivery_mode` get the current behavior. No breaking change.
6. Schema extension: response shape under `summary_only` omits `body_preview` fields and adds `summary` fields per node. Both shapes share the same five-layer structure; consumers that only read `node.id` and `node.kind` are mode-agnostic.

## Architecture Check

1. A delivery-mode parameter is cleaner than introducing a separate tool (`get_context_index`) because the packet's five-layer assembly logic (locality, governing, impact-surfaces) is the same in both modes — only the per-node payload differs. Adding a tool would duplicate the assembly code.
2. No backwards-compatibility aliasing/shims introduced. The default `delivery_mode='full'` preserves current behavior; `summary_only` is opt-in.

## Verification Layers

1. `summary_only` response is materially smaller than `full` for the same seed_nodes → schema validation: integration test asserts `summary_only` response is ≤30% the size of `full` response on a mature-world fixture.
2. Both modes return the same node-id sets → schema validation: parametrized test running both modes asserts `set(node.id for node in full.layer.nodes) == set(node.id for node in summary_only.layer.nodes)` for each layer.
3. CONTEXT-PACKET-CONTRACT.md documents both modes with consistent layer structure → FOUNDATIONS alignment check.

## What to Change

### 1. Add optional `delivery_mode` parameter to `get_context_packet`

Schema: `delivery_mode: 'full' | 'summary_only'` (default `'full'`).

`'full'` mode: current behavior unchanged — body-previews per node.

`'summary_only'` mode: each node's `body_preview` field is replaced with a `summary` field (≤100 chars, derived from the record's first sentence or its `notes` field's first line). The five-layer structure, `why_included` arrays, and `task_header` metadata are unchanged across modes.

### 2. Update `docs/CONTEXT-PACKET-CONTRACT.md`

Add §Delivery Modes subsection documenting:
- `full` (default): index + body-previews per node.
- `summary_only`: index + one-line summaries per node; consumers retrieve full bodies via `mcp__worldloom__get_record(record_id)` as needed.
- Use cases per mode.

### 3. Skill prose updates (optional, follow-up)

Skills whose Phase 1-3 (claim planning) or Phase 7 (firewall scoping) only need IDs may opt into `summary_only` to expand effective budget for governing-context coverage. Out of scope for this ticket; documented as a follow-up improvement opportunity.

## Files to Touch

- `tools/world-mcp/src/tools/get-context-packet.ts` (modify — add `delivery_mode` parameter)
- `tools/world-mcp/src/packet-builder/` (modify — `summary_only` content shaping)
- `docs/CONTEXT-PACKET-CONTRACT.md` (modify — add §Delivery Modes section)
- `tools/world-mcp/tests/` (new tests)

## Out of Scope

- Auto-selecting `summary_only` based on budget pressure — explicit caller choice only.
- Skill prose updates that opt skills into `summary_only` — separate per-skill tickets if/when adopted.
- New filter parameters (e.g., `node_classes_to_include`) — CORRIDOR-003.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/world-mcp && npm test -- --grep "packet-delivery-mode"` — `full` and `summary_only` requests against mature-world fixture; assert size delta + node-id parity per layer.
2. Schema-validation test asserts `summary_only` responses contain `summary` field per node and omit `body_preview`.
3. Backward-compatibility test: a request with no `delivery_mode` parameter returns the same shape as `delivery_mode='full'` (default behavior preserved).

### Invariants

1. Both modes return the same `node.id` set per layer for the same seed_nodes.
2. `summary_only` summary fields are ≤100 characters (excluding the `summary` JSON-key wrapper).
3. `delivery_mode` defaulting to `'full'` preserves all existing caller behavior.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/packet-delivery-mode.test.ts` — exercise both modes; assert size delta and parity invariants.
2. `tools/world-mcp/tests/packet-default-mode.test.ts` — assert no-`delivery_mode` requests return `full` shape.

### Commands

1. `cd tools/world-mcp && npm test -- --grep "packet-delivery-mode"` — targeted test.
2. `cd tools/world-mcp && npm test` — full world-mcp suite (no regression).
