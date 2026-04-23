# SPEC02RETMCPSER-007: Context packet assembler + get_context_packet tool

**Status**: PENDING
**Priority**: HIGH
**Effort**: Large
**Engine Changes**: Yes — introduces `tools/world-mcp/src/context-packet/{assemble,nucleus,envelope,constraints,suggested-impact}.ts` and `src/tools/get-context-packet.ts`.
**Deps**: SPEC02RETMCPSER-005, SPEC02RETMCPSER-006

## Problem

`mcp__worldloom__get_context_packet` is the realization of FOUNDATIONS §Tooling Recommendation — the "skills should never operate on prose alone" commitment. It replaces ad-hoc multi-file eager loading with a structured 5-layer packet (task_header / nucleus / envelope / constraints / suggested_impact_surfaces) whose authoritative shape lives in `docs/CONTEXT-PACKET-CONTRACT.md`. Without this tool, skills keep loading world files by hand, and Rule-7 Mystery Reserve firewall preservation stays probabilistic rather than structural. The assembler is the largest single deliverable in SPEC-02 because it stitches together nearly every other tool (search_nodes, get_node, get_neighbors, find_impacted_fragments, find_named_entities).

## Assumption Reassessment (2026-04-23)

1. `tools/world-mcp/src/context-packet/` target directory exists as `.gitkeep` placeholder from -001. The assembler consumes `tools/world-mcp/src/tools/search-nodes.ts`, `get-node.ts`, `get-neighbors.ts` (from -005) and `find-impacted-fragments.ts`, `find-named-entities.ts`, `find-edit-anchors.ts` (from -006). `docs/CONTEXT-PACKET-CONTRACT.md` is the authoritative packet-shape source (cited by `docs/FOUNDATIONS.md` §Machine-Facing Layer line 436).
2. `specs/SPEC-02-retrieval-mcp-server.md` §Context packet assembler (lines 207–226) is the authoritative source for assembler responsibilities, budget allocation, over-budget handling, and versioning; §Tool surface Tool 4 (lines 124–132) specifies the tool input/output contract. `docs/CONTEXT-PACKET-CONTRACT.md` defines the packet shape (`envelope.nodes[] + why_included[]`, `task_header.packet_version`, etc.); this spec owns only the assembler, not the shape.
3. Cross-artifact boundary under audit: the `docs/CONTEXT-PACKET-CONTRACT.md` shape. Any deviation from the canonical shape is a bug, not a feature — the reassessed spec's I1 finding resolved shape drift by delegating authority to the canonical doc. Assembler output MUST validate against the canonical shape; the spec §Verification `Context-packet shape fidelity` bullet (line 324) requires a shape-conformance test.
4. FOUNDATIONS principles under audit:
   - **§Tooling Recommendation** (line 422): the packet's nucleus must carry the full "non-negotiable load list" (World Kernel / Invariants / relevant CF records / affected domain files / unresolved contradictions / MR entries touching the same domain). The nucleus selection logic per task-type profile must guarantee coverage.
   - **Rule 7 Preserve Mystery Deliberately**: MR entries with `firewall_for` edges pointing at nucleus CFs must land in the nucleus itself or in the constraints layer's `open_risks`. Silent omission of an MR firewall from the packet weakens Rule 7.
5. HARD-GATE semantics: the packet is a read surface; enforcement (e.g., rejecting a proposal that resolves an MR entry) lives in SPEC-04 validators at pre-apply gate. This assembler's contribution to HARD-GATE is **making the firewall visible** to the caller skill via the constraints layer's `active_rules` + `open_risks` fields.

## Architecture Check

1. Splitting the assembler into five modules (nucleus/envelope/constraints/suggested-impact/assemble orchestrator) is cleaner than one monolithic function because each module owns a distinct concern (what counts as nucleus vs. envelope is a policy decision per layer) and the layers map 1:1 to the canonical doc's sections, making cross-reference trivial.
2. Task-type profiles (already landed in -004) drive nucleus-selection heuristics: `canon_addition` pulls CF records cited by the proposal + MR entries whose `firewall_for` targets any of them; `character_generation` pulls world kernel + invariants touching embodiment/society + MR boundaries; etc. Per-profile selectors live in the profile modules, not hardcoded in the assembler.
3. No backwards-compatibility aliasing/shims — new code.

## Verification Layers

1. Canonical shape fidelity → shape-conformance test reads `docs/CONTEXT-PACKET-CONTRACT.md`'s example YAML, parses it, and asserts the assembler output has the same top-level keys (`task_header`, `nucleus`, `envelope`, `constraints`, `suggested_impact_surfaces`), same sub-keys per layer, and `packet_version: 1`.
2. Rule 7 preservation → unit test: input `task_type: 'canon_addition'`, `seed_nodes: [CF that is firewalled by M-1]`; assert the returned packet's nucleus OR constraints layer includes the MR entry M-1 so the caller skill cannot miss it.
3. Tooling Recommendation coverage → unit test for each task_type profile: given a seed node, assert the nucleus contains World Kernel + Invariants + seed's upstream CFs + affected domain sections + MR entries firewalling the seed. Missing any of these is a Rule-1 (No Floating Facts) signal surfaced to the caller.
4. Budget allocation → unit test asserts default budget split (nucleus 40% / envelope 25% / constraints 15% / suggested_impact 10% / overhead 10%) with room to override per profile.
5. Over-budget handling → unit test shrinks budget progressively and confirms envelope drops first, then suggested_impact, then constraints.open_risks; nucleus stays intact; if nucleus alone exceeds budget, assembler returns `{code: 'budget_exhausted_nucleus'}`.
6. Packet versioning → change `packet_version` constant in assemble.ts; shape-conformance test must fail until the canonical doc is updated in lockstep.

## What to Change

### 1. `tools/world-mcp/src/context-packet/assemble.ts`

Top-level orchestrator. Exports `assembleContextPacket(args: {task_type, world_slug, seed_nodes, token_budget}): Promise<ContextPacket | McpError>`. Orchestrates nucleus.ts → envelope.ts → constraints.ts → suggested-impact.ts and populates `task_header` with `task_type`, `world_slug`, `generated_at` (ISO timestamp), `packet_version: 1`, `seed_nodes`, and `token_budget: {requested, allocated}`.

### 2. `tools/world-mcp/src/context-packet/nucleus.ts`

Exports `buildNucleus(db, taskType, seedNodes, weightsProfile)`. Uses `get_node`, `get_neighbors` (from -005) and `find_impacted_fragments` (from -006) to gather the profile's required-load list. Each nucleus node carries a `why_included` entry naming the reason (e.g., `"cited by proposal CF-NNNN"`, `"MR firewall for seed CF-NNNN"`, `"INVARIANTS.md — rule ONT-N governs target domain"`).

### 3. `tools/world-mcp/src/context-packet/envelope.ts`

Exports `buildEnvelope(db, nucleusNodes, remainingBudget)`. Gathers parent sections, sibling sections (prev/next), backlinks-summary (from inbound edges), recent modification history (from `modified_by` / `patched_by` edges), local style rules (from file-header comments). Each envelope node carries `why_included`.

### 4. `tools/world-mcp/src/context-packet/constraints.ts`

Exports `buildConstraints(db, taskType, nucleusNodes)`. Populates `active_rules` (from FOUNDATIONS.md rule set filtered by task type), `protected_surfaces` (engine-only paths: mandatory world files, adjudications/, characters/, diegetic-artifacts/), `required_output_schema` (task-type-specific: canon-addition → CF record + CH entry + PA record; character-generation → character dossier schema; etc.), `prohibited_moves` (per-task-type list), `open_risks` (from latest `validation_results` rows for the world).

### 5. `tools/world-mcp/src/context-packet/suggested-impact.ts`

Exports `buildSuggestedImpact(db, nucleusNodes)`. Uses `find_impacted_fragments` (from -006) to propose `nodes[]` with `rationale[]` entries for likely downstream files.

### 6. `tools/world-mcp/src/tools/get-context-packet.ts`

Thin MCP-tool wrapper around `assembleContextPacket`. Handles input validation (task_type enum check, token_budget positive, seed_nodes non-empty).

### 7. Tests

- `tests/tools/get-context-packet.test.ts` — end-to-end with a fixture seeded-world.
- `tests/context-packet/shape-conformance.test.ts` — reads the canonical doc's example YAML, runs assembler on a fixture input, validates structural match.
- `tests/context-packet/rule-7-firewall-preservation.test.ts` — Rule-7 preservation for `canon_addition` profile.
- `tests/context-packet/budget-handling.test.ts` — over-budget drops in the correct order; nucleus-exceeds returns `budget_exhausted_nucleus`.

## Files to Touch

- `tools/world-mcp/src/context-packet/assemble.ts` (new)
- `tools/world-mcp/src/context-packet/nucleus.ts` (new)
- `tools/world-mcp/src/context-packet/envelope.ts` (new)
- `tools/world-mcp/src/context-packet/constraints.ts` (new)
- `tools/world-mcp/src/context-packet/suggested-impact.ts` (new)
- `tools/world-mcp/src/tools/get-context-packet.ts` (new)
- `tools/world-mcp/tests/tools/get-context-packet.test.ts` (new)
- `tools/world-mcp/tests/context-packet/shape-conformance.test.ts` (new)
- `tools/world-mcp/tests/context-packet/rule-7-firewall-preservation.test.ts` (new)
- `tools/world-mcp/tests/context-packet/budget-handling.test.ts` (new)
- `tools/world-mcp/tests/integration/context-packet-canon-addition.test.ts` (new; named in spec §Verification)

## Out of Scope

- Defining the canonical packet shape itself — owned by `docs/CONTEXT-PACKET-CONTRACT.md`; edits to the shape go through SPEC-07 Part A lineage, not this ticket.
- Validator-side MR firewall enforcement — that is SPEC-04's job; this ticket only makes the firewall **visible**.
- Summaries field population in nucleus nodes — `summary` may be null in Phase 1 (SPEC-01 Out of Scope); assembler falls back to truncated body.
- Wiring the tool into `src/server.ts` — lands in -011.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/world-mcp && npm test` — all context-packet tests pass.
2. Shape-conformance test passes — assembler output matches the canonical doc's top-level keys + sub-keys + `packet_version: 1`.
3. Rule-7 test passes — MR entries firewalling seed CFs appear in nucleus or constraints; never silently dropped.
4. Budget test passes — under pressure, envelope drops first, then suggested_impact, then constraints.open_risks; nucleus is never trimmed.
5. `get_context_packet({task_type: 'canon_addition', world_slug: 'seeded', seed_nodes: ['CF-0001'], token_budget: 8000})` returns a fully-populated packet < 8k tokens.

### Invariants

1. Every shipped packet has `packet_version: 1` and matches the shape in `docs/CONTEXT-PACKET-CONTRACT.md` exactly; any structural deviation bumps the version.
2. For every node in `nucleus.nodes[]` there is a corresponding entry in `nucleus.why_included[]` at the same index (never desync).
3. Rule 7 invariant: for every CF in `nucleus.nodes[]`, every MR entry with a `firewall_for` edge pointing at that CF appears somewhere in the packet (nucleus or constraints). Silent omission is a bug.
4. Nucleus is never trimmed under budget pressure; if nucleus alone exceeds `token_budget`, assembler returns `budget_exhausted_nucleus`.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/tools/get-context-packet.test.ts` — tool-level happy path.
2. `tools/world-mcp/tests/context-packet/shape-conformance.test.ts` — structural match against canonical doc.
3. `tools/world-mcp/tests/context-packet/rule-7-firewall-preservation.test.ts` — Rule-7 invariant.
4. `tools/world-mcp/tests/context-packet/budget-handling.test.ts` — over-budget semantics.
5. `tools/world-mcp/tests/integration/context-packet-canon-addition.test.ts` — end-to-end canon-addition pre-flight replacement (token reduction target from spec §Verification line 314).

### Commands

1. `cd tools/world-mcp && npm run build && node --test dist/tests/context-packet/*.test.js dist/tests/tools/get-context-packet.test.js`
2. `cd tools/world-mcp && node --test dist/tests/integration/context-packet-canon-addition.test.js`
3. Shape-fidelity grep-proof: `grep -nE "packet_version" tools/world-mcp/src/context-packet/assemble.ts` returns a `packet_version: 1` literal.
4. Rule-7 grep-proof: `grep -nE "firewall_for" tools/world-mcp/src/context-packet/nucleus.ts` or `constraints.ts` returns ≥ 1 match (the firewall is surfaced, not silent).
