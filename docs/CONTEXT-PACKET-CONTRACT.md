# Context Packet Contract

`mcp__worldloom__get_context_packet(task_type, seed_nodes, token_budget)` is the retrieval-side contract for delivering the minimum complete machine-facing bundle required by `docs/FOUNDATIONS.md`.

The packet is locality-first. It must secure seed-local authority and the governing FOUNDATIONS surfaces before it spends budget on broader downstream context.

## Packet Shape

```yaml
task_header:
  task_type: canon_addition | character_generation | diegetic_artifact_generation | continuity_audit | other
  world_slug: animalia
  generated_at: "2026-04-24T00:00:00Z"
  token_budget:
    requested: 12000
    allocated: 9800
  seed_nodes:
    - CHAR-0002
  packet_version: 2
local_authority:
  nodes: []
  why_included: []
exact_record_links:
  nodes: []
  why_included: []
scoped_local_context:
  nodes: []
  why_included: []
governing_world_context:
  active_rules: []
  protected_surfaces: []
  required_output_schema: []
  prohibited_moves: []
  open_risks: []
  nodes: []
  why_included: []
impact_surfaces:
  nodes: []
  rationale: []
```

## Layer Semantics

### 1. Task header

Describes the invocation context:

- task type
- world slug
- packet version
- requested versus allocated budget
- seed nodes
- generation timestamp

### 2. Local authority

The source-local authority core.

Typical contents:

- the seed node itself
- the immediate authority-bearing parent record when the seed is a sub-node
- explicit scoped references declared by that authority-bearing source

If a node appears here, the packet is asserting that the downstream consumer should treat it as the first retrieval surface, not as optional background.

### 3. Exact record links

Exact structured record-to-record links reachable from the local authority surface via `references_record`.

These are higher-trust than lexical adjacency. They expose deliberate foreign-key-style relationships already present in the indexed source.

### 4. Scoped local context

Bounded one-hop local context around the seed-local authority surface.

Typical contents:

- nodes reached through `references_scoped_name`
- one-hop graph neighbors required to interpret the local authority safely
- adjacent same-file nodes that keep the seed-local bundle truthful

This layer is still local. It is not a license to sweep the whole world model into the packet.

### 5. Governing world context

The FOUNDATIONS-driven world-level guardrail surface required by the task type.

This layer carries:

- active rules
- protected surfaces
- required output schema
- prohibited moves
- open risks
- governing nodes such as required kernel or invariant files
- Mystery Reserve firewall nodes when locality intersects protected unknowns

### 6. Impact surfaces

Advisory downstream consequence surfaces.

This layer remains optional and trim-first under budget pressure. It exists to help a consumer avoid consequence evasion after locality and governing completeness are already secured.

## Assembly Discipline

- Prefer exact ids, structured edges, and explicit scoped references before lexical expansion.
- Preserve the distinction between `local_authority`, `exact_record_links`, and `scoped_local_context`; they are separate completeness classes, not synonyms.
- Establish locality before governing background, and establish governing background before advisory impact surfaces.
- If required classes cannot fit inside budget, return structured insufficiency code `packet_incomplete_required_classes` instead of silently dropping required locality.
- `packet_incomplete_required_classes` must report `missing_classes`, `requested_budget`, `minimum_required_budget`, and `retained_classes`.
- `budget_exhausted_nucleus` is removed; completeness insufficiency is represented only through `packet_incomplete_required_classes`.
- Retrieval should remain deterministic for the same world state, task type, seed set, and budget.

## Example Roles

### Canon addition

- `local_authority`: the cited CF record or other exact seed-local authority
- `exact_record_links`: exact linked records declared by structured ids
- `scoped_local_context`: adjacent local update surfaces and one-hop interpretive neighbors
- `governing_world_context`: kernel, invariants, protected surfaces, append-only canon rules
- `impact_surfaces`: likely downstream domain files or records needing synchronized follow-up

### Character generation

- `local_authority`: character-local record anchors and declared scoped references
- `exact_record_links`: exact linked batches, artifacts, or source records
- `scoped_local_context`: local place, institution, and relation nodes needed to avoid decontextualized generation
- `governing_world_context`: no-world-write rules, distribution discipline, Mystery Reserve firewall
- `impact_surfaces`: adjacent dossier or audit surfaces likely to matter before closeout

### Continuity audit

- `local_authority`: contradiction cluster seeds and their immediate authority records
- `exact_record_links`: exact linked records that help classify the drift precisely
- `scoped_local_context`: the bounded local neighborhood needed to interpret the conflict truthfully
- `governing_world_context`: audit-only guardrails, protected surfaces, unresolved-risk context
- `impact_surfaces`: likely proposal, adjudication, or follow-up audit surfaces

## Non-Goals

- treating scoped references as world-level canonical ontology
- promoting arbitrary prose names into authority surfaces heuristically
- silently trading away seed-local completeness for broad background coverage
- using impact-surface expansion as a substitute for exact or explicit locality
