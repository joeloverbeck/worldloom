# CORRIDOR-003: Context packet — `node_classes` filter parameter for class-scoped retrieval

**Status**: PENDING
**Priority**: LOW
**Effort**: Small
**Engine Changes**: Yes — `tools/world-mcp/` packet-builder (new optional `node_classes` parameter); `docs/CONTEXT-PACKET-CONTRACT.md` schema extension
**Deps**: None — additive parameter on existing packet contract

## Problem

`get_context_packet` returns nodes across all relevant classes (CF / CH / INV / M / OQ / ENT / SEC) for the given seed_nodes and task_type. Some skill phases only need a narrow subset — Phase 7a invariant conformance needs only INV records; Phase 7b Mystery Reserve firewall needs only M records; Phase 7c distribution conformance needs only CF records with distribution blocks. Currently the packet returns the full mix, which (combined with budget pressure per CORRIDOR-001) leaves less effective budget for the classes the consumer actually needs.

A `node_classes` filter parameter that restricts packet content to a caller-specified class list would let phase-specific calls request only what they need. Combined with strict budget enforcement (CORRIDOR-001), this lets a Phase 7b call request `node_classes=['mystery_record']` and use the full token_budget for M-record coverage, rather than competing with CFs and SECs the firewall doesn't read.

## Assumption Reassessment (2026-04-27)

1. `tools/world-mcp/src/tools/get-context-packet.ts` (path verified at implementation time) accepts a parameter object; adding optional `node_classes: string[]` is additive.
2. The packet's five layers (local_authority, exact_record_links, scoped_local_context, governing_world_context, impact_surfaces) each contain `nodes` arrays of mixed classes; filtering by class is a per-layer post-processing step.
3. Cross-artifact boundary: skills calling `get_context_packet` are unaffected unless they opt into the new parameter; the default behavior (no filter) is preserved.
6. Schema extension: `node_classes` is a new optional input parameter; the response shape is unchanged except that filtered classes' nodes do not appear. Consumers that don't pass the parameter see the current full-mix behavior.

## Architecture Check

1. A class-filter parameter is cleaner than introducing a per-class tool (`get_invariants`, `get_mysteries`, `get_canon_facts`) because the packet's locality+governing+impact assembly is the same regardless of class — only the per-layer node-list output is filtered. Per-class tools would duplicate the assembly logic and lose the cross-class scoping the packet provides.
2. No backwards-compatibility aliasing/shims introduced. Absent `node_classes` → current behavior.

## Verification Layers

1. `node_classes` filter is correctly applied per-layer → schema validation: integration test asserts that with `node_classes=['mystery_record']`, every `node.kind` in every layer's `nodes` array is `'mystery_record'`.
2. Empty `node_classes` filter (no allowed classes) → semantic validation: a request with `node_classes=[]` returns empty layer node arrays (degenerate-but-valid response).
3. Filtered request returns more effective budget for the allowed classes → integration test: compare `node_classes=['mystery_record']` response's M-record count vs unfiltered response's M-record count at the same `token_budget`; the filtered response should include ≥ as many M records (often more, because budget isn't spent on other classes).

## What to Change

### 1. Add optional `node_classes` parameter to `get_context_packet`

Schema: `node_classes: ('canon_fact' | 'change_log_entry' | 'invariant_record' | 'mystery_record' | 'open_question_record' | 'named_entity_record' | 'section_record')[]` (default: all classes — current behavior).

When provided, the packet builder filters every layer's `nodes` array post-assembly to retain only nodes whose `kind` is in `node_classes`. The five-layer structure remains; layers may have empty `nodes` arrays after filtering.

### 2. Update `docs/CONTEXT-PACKET-CONTRACT.md`

Add §Class Filtering subsection documenting the parameter, valid class names, default behavior, and use cases (Phase 7a invariants-only call; Phase 7b mystery-only call; etc.).

### 3. Worked-example documentation

Add a worked example to CONTRACT.md showing a `diegetic-artifact-generation` Phase 7b call with `task_type='diegetic_artifact_generation'`, `seed_nodes=['CF-0044']`, `token_budget=8000`, `node_classes=['mystery_record']` — and the resulting M-record-only response.

## Files to Touch

- `tools/world-mcp/src/tools/get-context-packet.ts` (modify — add `node_classes` parameter)
- `tools/world-mcp/src/packet-builder/` (modify — class filtering)
- `docs/CONTEXT-PACKET-CONTRACT.md` (modify — add §Class Filtering section + worked example)
- `tools/world-mcp/tests/` (new tests)

## Out of Scope

- Skill updates that adopt `node_classes` for phase-specific calls — separate per-skill tickets.
- Per-class dedicated tools (e.g., `get_mysteries`) — explicitly rejected per Architecture Check #1.
- Combinations with `delivery_mode` (CORRIDOR-002) — both should compose orthogonally; no special-case logic needed but tests should cover the combination.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/world-mcp && npm test -- --grep "packet-class-filter"` — request with `node_classes=['mystery_record']` against mature-world fixture; assert every returned node's `kind === 'mystery_record'`.
2. Default-behavior test: request without `node_classes` returns mixed-class nodes per current behavior.
3. Composition test: request with both `node_classes=['mystery_record']` AND `delivery_mode='summary_only'` returns M-record-only nodes with `summary` fields (no `body_preview`).

### Invariants

1. The filter applies per-layer, not at the input-seed level (seed_nodes can be of any class; filter applies to discovered/expanded content).
2. The five-layer structure is preserved even when some layers' `nodes` arrays are empty post-filter.
3. Default (absent parameter) → current full-mix behavior.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/packet-class-filter.test.ts` — single-class and multi-class filter tests.
2. `tools/world-mcp/tests/packet-class-filter-composition.test.ts` — composition with `delivery_mode`.
3. `tools/world-mcp/tests/packet-class-filter-default.test.ts` — default-behavior preservation.

### Commands

1. `cd tools/world-mcp && npm test -- --grep "packet-class-filter"` — targeted test suite.
2. `cd tools/world-mcp && npm test` — full world-mcp suite (no regression).
