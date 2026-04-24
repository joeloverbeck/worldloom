# SPEC12SKIRELRET-008: Context packet v2 (wholesale replacement)

**Status**: ✅ COMPLETED
**Priority**: HIGH
**Effort**: Large
**Engine Changes**: Yes — rewrites `tools/world-mcp/src/context-packet/` to the v2 completeness classes (new locality-first builders, deleted v1 builders), updates `tools/world-mcp/src/errors.ts` (removes `budget_exhausted_nucleus`, adds `packet_incomplete_required_classes`), updates the authoritative packet contract doc in `docs/CONTEXT-PACKET-CONTRACT.md`, and rewrites the affected `tools/world-mcp` packet tests. v1 packet shape removed outright; no backwards-compatibility shim.
**Deps**: SPEC12SKIRELRET-002, SPEC12SKIRELRET-003

## Problem

Per SPEC-12 D6, `get_context_packet` must bump `packet_version` from 1 to 2 and adopt locality-first assembly. The v1 shape (`task_header / nucleus / envelope / constraints / suggested_impact_surfaces`) is class-blind — it does not distinguish seed-local authority from broad background. The observed production failure (packets formally large but locally insufficient — exhausting budget on required-file sweeps while dropping the seed-local anchors a skill would need) is this gap made concrete. The v2 shape uses five explicit completeness classes (`local_authority / exact_record_links / scoped_local_context / governing_world_context / impact_surfaces`) with mandatory locality-first delivery and a single structured insufficiency error. Per user-confirmed Q1=(a) during reassessment, v1 is removed wholesale — no backwards-compatibility shim, no parallel shape — because no production consumer depends on the packet shape today (SPEC-06 Part A skills have not landed; all v1 tests ship inside `tools/world-mcp/` and are regenerated in this ticket).

## Assumption Reassessment (2026-04-24)

<!-- Items 1-3 always required. Items 4+ are a menu; include only those matching this ticket's scope and renumber surviving items sequentially starting from 4. Lists like 1, 2, 3, 14 are malformed output. -->

1. `tools/world-mcp/src/context-packet/shared.ts:31-62` defines v1 `ContextPacket` with five top-level keys (`task_header, nucleus, envelope, constraints, suggested_impact_surfaces`) and `packet_version: 1`. `DEFAULT_PACKET_VERSION = 1 as const` at line 64. `DEFAULT_BUDGET_SPLIT` at lines 66-72 keyed by v1 layer names. `estimatePacketTokens` at lines 111-146 itemizes v1 layers.
2. `tools/world-mcp/src/context-packet/assemble.ts:143-152` emits `budget_exhausted_nucleus` when the nucleus alone exceeds the requested budget. Per SPEC-12 D6 Error Subsumption, this is subsumed by `packet_incomplete_required_classes` with `missing_classes: ["local_authority"]` — one completeness-insufficiency error code in v2.
3. Cross-package contract under audit: the packet shape is an output schema consumed by (a) the authoritative packet contract doc `docs/CONTEXT-PACKET-CONTRACT.md`, (b) in-repo tests in `tools/world-mcp/tests/` (currently including `context-packet/shape-conformance.test.ts`, `context-packet/budget-handling.test.ts`, `context-packet/rule-7-firewall-preservation.test.ts`, `tools/get-context-packet.test.ts`, `errors.test.ts`, `integration/context-packet-canon-addition.test.ts`, and `integration/spec02-verification.test.ts`, plus the new `context-packet/locality-first.test.ts`), and (c) future SPEC-06 Part A skills (not yet landed). No production consumer exists today — verified by grep across `.claude/skills/` returning zero matches for `packet_version`, `get_context_packet`, or the v1 layer names. The wholesale rewrite is safe because the live consumer surface is confined to this contract doc and in-repo tests.
4. FOUNDATIONS Rule 6 (No Silent Retcons): v1 is being REMOVED wholesale. Retcon justification: user explicitly confirmed Q1=(a) wholesale replacement during the /reassess-spec run in this session; no consumer depends on v1 today (see item 3); the spec's D6 Migration Posture section documents the removal; SPEC-12's Out of Scope explicitly excludes retaining a v1 shape alongside v2. This ticket's existence, cited with the spec's user-approved Migration Posture paragraph, is the attribution trail.
5. FOUNDATIONS Rule 7 / §Tooling Recommendation enforcement surface under audit: the packet-assembly pipeline is the primary mechanism by which `docs/FOUNDATIONS.md` §Tooling Recommendation's "minimum complete input bundle" contract is realized. This ticket's v2 shape tightens — not weakens — that contract by making completeness classes explicit and making insufficiency a structured error rather than a silent shortfall. Mystery Reserve firewall preservation: `governing_world_context` class retains the existing `open_risks` surface and the `constraints` builder's MR-related rule emission unchanged; this ticket renames layers and tightens locality discipline without altering MR-firewall logic.
6. Extends existing output schema — NOT additive: the packet shape is renamed wholesale. This is acceptable because (a) Q1=(a) user resolution captured the wholesale-rewrite approval, (b) the affected consumers are tests inside this same ticket, and (c) the spec's D6 Migration Posture paragraph documents every constant/literal that flips.
7. Draft ticket mismatch corrected before implementation: the ticket's previous `Out of Scope` excluded `docs/CONTEXT-PACKET-CONTRACT.md`, but `tools/world-mcp/tests/context-packet/shape-conformance.test.ts` and `tools/world-mcp/tests/integration/spec02-verification.test.ts` both read that doc as the canonical schema authority. The doc update is required same-seam fallout for a truthful packet-v2 landing, so this ticket now owns it. Likewise, `tools/world-mcp/tests/integration/context-packet-canon-addition.test.ts` still asserts v1 packet structure and is part of the live rewrite blast radius.

## Architecture Check

1. A single completeness-insufficiency error code (`packet_incomplete_required_classes`) is simpler for callers than two overlapping ones (`budget_exhausted_nucleus` + a new one). Consolidation at the error level matches the consolidation at the completeness-class level.
2. Locality-first assembly with explicit class-level budget bookkeeping replaces v1's implicit "nucleus before envelope" ordering with auditable class-by-class accounting. Each class has a named token share in `DEFAULT_BUDGET_SPLIT` and its own builder.
3. Removing v1 wholesale (rather than dual-shape coexistence) avoids long-term maintenance cost — dual shapes quickly diverge as completeness semantics evolve.
4. No backwards-compatibility aliasing; user confirmed Q1=(a).

## Verification Layers

1. `DEFAULT_PACKET_VERSION === 2` -> codebase grep-proof: `grep -n 'DEFAULT_PACKET_VERSION' tools/world-mcp/src/context-packet/shared.ts` returns `= 2 as const`.
2. `packet_version: 2` literal on `ContextPacket` type -> codebase grep-proof at `tools/world-mcp/src/context-packet/shared.ts`.
3. v2 top-level keys match the spec list (`task_header, local_authority, exact_record_links, scoped_local_context, governing_world_context, impact_surfaces`) -> schema validation on returned object.
4. `budget_exhausted_nucleus` removed from `tools/world-mcp/src/errors.ts` -> codebase grep-proof: zero matches.
5. `packet_incomplete_required_classes` emitted when any required class cannot fit -> unit test covering multiple missing-class combinations.
6. Locality-first ordering: `local_authority` class populated before broad `governing_world_context` class under budget pressure -> unit test.
7. §Rule 7 MR firewall preservation: `governing_world_context` still includes the MR-related rules and prohibited_moves from the existing constraints builder -> unit test.

## What to Change

### 1. Rewrite `tools/world-mcp/src/context-packet/shared.ts`

Replace `ContextPacket`, `DEFAULT_PACKET_VERSION`, `DEFAULT_BUDGET_SPLIT`, `estimatePacketTokens` with the v2 shape:

```ts
export interface ContextPacket {
  task_header: {
    task_type: TaskType;
    world_slug: string;
    generated_at: string;
    token_budget: { requested: number; allocated: number };
    seed_nodes: string[];
    packet_version: 2;
  };
  local_authority: { nodes: ContextPacketNode[]; why_included: string[] };
  exact_record_links: { nodes: ContextPacketNode[]; why_included: string[] };
  scoped_local_context: { nodes: ContextPacketNode[]; why_included: string[] };
  governing_world_context: {
    active_rules: string[];
    protected_surfaces: string[];
    required_output_schema: string[];
    prohibited_moves: string[];
    open_risks: ContextPacketRisk[];
    nodes: ContextPacketNode[];
    why_included: string[];
  };
  impact_surfaces: { nodes: ContextPacketNode[]; rationale: string[] };
}

export const DEFAULT_PACKET_VERSION = 2 as const;

export const DEFAULT_BUDGET_SPLIT = {
  local_authority: 0.25,
  exact_record_links: 0.15,
  scoped_local_context: 0.2,
  governing_world_context: 0.2,
  impact_surfaces: 0.1,
  overhead: 0.1,
} as const;
```

Rewrite `estimatePacketTokens` to iterate the new layer keys. Update any `trim*ToBudget` helpers' callers to point at the new names.

### 2. Rewrite `tools/world-mcp/src/context-packet/assemble.ts`

Replace the v1 builders orchestration with v2 locality-first assembly:

1. Build `local_authority` class: seed node + its immediate authority (parent record if seed is a sub-node; frontmatter-declared `scoped_references` with `authority_level='explicit_scoped_reference'` on the seed).
2. Build `exact_record_links` class: nodes reached via `references_record` edges from the seed (1-hop outgoing).
3. Build `scoped_local_context` class: nodes reached via `references_scoped_name` edges from the seed + the existing one-hop graph neighbors (now including the new edge types in the expansion set).
4. Build `governing_world_context` class: task-type profile's required kernel/invariants/CFs/MR constraints + open_risks. Preserve the existing `active_rules / protected_surfaces / required_output_schema / prohibited_moves` fields inside this class (moved from the v1 `constraints` layer).
5. Build `impact_surfaces` class: existing suggested_impact_surfaces builder output.
6. If any required class cannot fit the allocated budget, return `packet_incomplete_required_classes` with populated `missing_classes`, `requested_budget`, `minimum_required_budget`, `retained_classes`.

### 3. Remove `budget_exhausted_nucleus`; add `packet_incomplete_required_classes`

In `tools/world-mcp/src/errors.ts:13`, remove `"budget_exhausted_nucleus"` and add `"packet_incomplete_required_classes"` in its place. Replace the `createMcpError("budget_exhausted_nucleus", ...)` call in `assemble.ts:143-152` with `createMcpError("packet_incomplete_required_classes", { missing_classes, requested_budget, minimum_required_budget, retained_classes })`. The former nucleus-exhaustion case is reported as `missing_classes: ["local_authority"]` (or equivalent) in v2.

### 4. Rewrite / rename sub-builders

Map the existing files to their v2 roles:

- `nucleus.ts` → `local-authority.ts` (seed + immediate authority; scoped_references with `authority_level='explicit_scoped_reference'`).
- `envelope.ts` → `scoped-local-context.ts` (one-hop graph context, expanded to include `references_scoped_name` edges; `ENVELOPE_EDGE_TYPES` constant grows to include the new scoped edge type).
- `constraints.ts` → `governing-world-context.ts` (semantics preserved; now returns `{active_rules, protected_surfaces, required_output_schema, prohibited_moves, open_risks, nodes, why_included}`).
- `suggested-impact.ts` → `impact-surfaces.ts` (semantics preserved; returns `{nodes, rationale}`).
- New `exact-record-links.ts` consuming `references_record` edges from the seed.

Update all import sites.

### 5. Rewrite affected tests

- `tools/world-mcp/tests/context-packet/shape-conformance.test.ts` — rewrite shape assertions to match v2 top-level keys.
- `tools/world-mcp/tests/context-packet/budget-handling.test.ts` — rewrite to expect `packet_incomplete_required_classes` with varying `missing_classes` depending on which class is starved.
- `tools/world-mcp/tests/context-packet/rule-7-firewall-preservation.test.ts` — update assertions from `nucleus` / `constraints` to the v2 `local_authority` / `governing_world_context` surfaces while preserving the Rule 7 firewall guarantee.
- `tools/world-mcp/tests/tools/get-context-packet.test.ts` — update `packet_version` assertion from `1` to `2`.
- `tools/world-mcp/tests/errors.test.ts` — remove `budget_exhausted_nucleus` from the expected-codes list; add `packet_incomplete_required_classes`.
- `tools/world-mcp/tests/integration/context-packet-canon-addition.test.ts` — rewrite the bounded-packet assertions to the v2 class names.
- `tools/world-mcp/tests/integration/spec02-verification.test.ts:322` — update `packet_version` assertion from `1` to `2`; SPEC-02 is already archived (`archive/specs/SPEC-02-retrieval-mcp-server.md`) so the assertion can stay as a regression guard with the new version.
- `tools/world-mcp/tests/context-packet/locality-first.test.ts` (new) — assert `local_authority` populated before `governing_world_context` under tight budgets.

### 6. Rewrite the authoritative packet contract doc

Regenerate `docs/CONTEXT-PACKET-CONTRACT.md` for the v2 shape. The live repo treats this file as the canonical packet-schema reference and the shape-conformance tests parse it directly, so the YAML example, layer semantics, and assembly-discipline prose must move from v1 (`nucleus`, `envelope`, `constraints`, `suggested_impact_surfaces`) to the v2 completeness classes (`local_authority`, `exact_record_links`, `scoped_local_context`, `governing_world_context`, `impact_surfaces`).

## Files to Touch

- `tools/world-mcp/src/context-packet/shared.ts` (rewrite)
- `tools/world-mcp/src/context-packet/assemble.ts` (rewrite)
- `tools/world-mcp/src/context-packet/nucleus.ts` → rename to `local-authority.ts` (rewrite)
- `tools/world-mcp/src/context-packet/envelope.ts` → rename to `scoped-local-context.ts` (rewrite — include new edge types)
- `tools/world-mcp/src/context-packet/exact-record-links.ts` (new)
- `tools/world-mcp/src/context-packet/constraints.ts` → rename to `governing-world-context.ts` (rewrite)
- `tools/world-mcp/src/context-packet/suggested-impact.ts` → rename to `impact-surfaces.ts` (rewrite)
- `tools/world-mcp/src/errors.ts` (modify — swap one error code)
- `docs/CONTEXT-PACKET-CONTRACT.md` (rewrite)
- `tools/world-mcp/tests/context-packet/shape-conformance.test.ts` (rewrite)
- `tools/world-mcp/tests/context-packet/budget-handling.test.ts` (rewrite)
- `tools/world-mcp/tests/context-packet/rule-7-firewall-preservation.test.ts` (modify)
- `tools/world-mcp/tests/context-packet/locality-first.test.ts` (new)
- `tools/world-mcp/tests/tools/get-context-packet.test.ts` (modify)
- `tools/world-mcp/tests/errors.test.ts` (modify)
- `tools/world-mcp/tests/integration/context-packet-canon-addition.test.ts` (modify)
- `tools/world-mcp/tests/integration/spec02-verification.test.ts` (modify)

## Out of Scope

- v1 backwards-compatibility shim (explicitly excluded per Q1=(a))
- Follow-on docs rewrite beyond the packet contract itself (`docs/MACHINE-FACING-LAYER.md`, `docs/FOUNDATIONS.md`, `CLAUDE.md`) (covered by ticket 009)
- Live-corpus testing against animalia (covered by ticket 010)

## Acceptance Criteria

### Tests That Must Pass

1. `getContextPacket({task_type: 'character_generation', world_slug: 'animalia', seed_nodes: ['CHAR-0002'], token_budget: 8000})` returns an object with `task_header.packet_version === 2`.
2. Response has exactly these top-level keys: `task_header, local_authority, exact_record_links, scoped_local_context, governing_world_context, impact_surfaces`.
3. `local_authority.nodes` includes the seed and its immediate authority; no broad-background nodes appear in this class.
4. `exact_record_links.nodes` includes nodes reached via `references_record` edges from the seed.
5. `scoped_local_context.nodes` includes nodes reached via `references_scoped_name` edges from the seed + one-hop graph neighbors.
6. When `token_budget` is too small for required classes, the call returns `packet_incomplete_required_classes` with `missing_classes`, `requested_budget`, `minimum_required_budget`, `retained_classes` populated.
7. `budget_exhausted_nucleus` is NEVER emitted (removed from error codes union).
8. `governing_world_context` still contains the FOUNDATIONS-required surfaces (active_rules, protected_surfaces, required_output_schema, prohibited_moves, open_risks) with semantics preserved.
9. `docs/CONTEXT-PACKET-CONTRACT.md` documents the same v2 top-level keys and layer semantics that the implementation emits.
10. All rewritten tests pass.

### Invariants

1. `packet_version` is always `2` in v2 packet responses.
2. `packet_incomplete_required_classes` is the SOLE completeness-insufficiency error code after this ticket.
3. Locality-first ordering: for authority-bearing seeds, `local_authority + exact_record_links + scoped_local_context` classes are populated before `governing_world_context` budget is claimed.
4. `governing_world_context` preserves FOUNDATIONS-required surfaces; Mystery Reserve firewall logic unchanged.
5. `find_impacted_fragments` traversal is NOT affected by this ticket (invariant held by ticket 003; re-verified here since packet assembly touches adjacent code paths).

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/context-packet/shape-conformance.test.ts` — rewritten for v2 shape.
2. `tools/world-mcp/tests/context-packet/budget-handling.test.ts` — rewritten for `packet_incomplete_required_classes` with multiple `missing_classes` cases.
3. `tools/world-mcp/tests/context-packet/locality-first.test.ts` (new) — asserts `local_authority` populated before `governing_world_context` when budget is tight.
4. `tools/world-mcp/tests/context-packet/rule-7-firewall-preservation.test.ts` — updated for the v2 class names while preserving the Rule 7 assertion.
5. `tools/world-mcp/tests/tools/get-context-packet.test.ts` — updated `packet_version` assertion and packet-content expectations.
6. `tools/world-mcp/tests/errors.test.ts` — updated error-codes list.
7. `tools/world-mcp/tests/integration/context-packet-canon-addition.test.ts` — updated bounded-packet assertions to the v2 shape.
8. `tools/world-mcp/tests/integration/spec02-verification.test.ts` — updated `packet_version` assertion and canonical-shape check.

### Commands

1. `cd tools/world-mcp && npm run build`
2. `cd tools/world-mcp && node --test dist/tests/context-packet/*.test.js dist/tests/tools/get-context-packet.test.js dist/tests/errors.test.js dist/tests/integration/context-packet-canon-addition.test.js dist/tests/integration/spec02-verification.test.js`
3. `cd tools/world-mcp && npm test`

## Outcome

- Completed: 2026-04-24
- Replaced the v1 packet shape with v2 completeness classes: `local_authority`, `exact_record_links`, `scoped_local_context`, `governing_world_context`, and `impact_surfaces`.
- Removed the dead v1 builder files and replaced them with locality-first builders plus the unified insufficiency error `packet_incomplete_required_classes`.
- Rewrote `docs/CONTEXT-PACKET-CONTRACT.md` and the packet-focused `tools/world-mcp` tests to the emitted v2 schema.

## Verification Result

- `cd tools/world-mcp && npm run build`
- `cd tools/world-mcp && node --test dist/tests/context-packet/*.test.js dist/tests/tools/get-context-packet.test.js dist/tests/errors.test.js dist/tests/integration/context-packet-canon-addition.test.js dist/tests/integration/spec02-verification.test.js`
- `cd tools/world-mcp && npm test`

## Deviations

- `tools/world-mcp/src/tools/get-context-packet.ts` did not need an import or API edit because the `assemble.ts` export surface stayed stable while the internal packet implementation changed wholesale.
