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
  nodes: [] # node objects may include optional parsed record projections for mandatory governing records
  why_included: []
impact_surfaces:
  nodes: []
  rationale: []
truncation_summary:
  dropped_layers: []
  dropped_node_ids_by_layer: {}
  fallback_advice: ""
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
- optional parsed `record` projections on mandatory governing nodes when a task requires full-record audit semantics rather than a body-preview index

### 6. Impact surfaces

Advisory downstream consequence surfaces.

This layer remains optional and trim-first under budget pressure. It exists to help a consumer avoid consequence evasion after locality and governing completeness are already secured.

## Assembly Discipline

- Prefer exact ids, structured edges, and explicit scoped references before lexical expansion.
- Preserve the distinction between `local_authority`, `exact_record_links`, and `scoped_local_context`; they are separate completeness classes, not synonyms.
- Establish locality before governing background, and establish governing background before advisory impact surfaces.
- If `local_authority` cannot fit inside budget, return structured insufficiency code `packet_incomplete_required_classes` instead of silently dropping required locality. The other four content layers are droppable under budget pressure (see §Budget Enforcement) — completeness insufficiency now triggers only when even seed-local authority overflows the requested budget.
- `packet_incomplete_required_classes` must report `missing_classes`, `requested_budget`, `minimum_required_budget`, `retained_classes`, and `truncation_summary` (listing every droppable layer that was emptied during the failed fit attempt).
- `budget_exhausted_nucleus` is removed; completeness insufficiency is represented only through `packet_incomplete_required_classes`.
- Retrieval should remain deterministic for the same world state, task type, seed set, and budget.

## Budget Enforcement

The packet's serialized response size is strictly bounded by the requested `token_budget`. The assembler builds all five content layers, then drops layers in priority order (cheapest-to-drop first) until the response fits:

1. `impact_surfaces`
2. `scoped_local_context`
3. `exact_record_links`
4. `governing_world_context`

`local_authority` and `task_header` are never dropped. If even `local_authority` exceeds budget alone, the assembler returns `packet_incomplete_required_classes` (see §Assembly Discipline) with `truncation_summary` populated for every droppable layer that was emptied.

Drops are layer-granular: when a layer is dropped, its entire `nodes` list is cleared and the cleared node ids are recorded under `truncation_summary.dropped_node_ids_by_layer`. Consumers route those node ids through `mcp__worldloom__get_record(record_id)` (full body) or `mcp__worldloom__get_record_field(record_id, field_path)` (single field) per FOUNDATIONS §Tooling Recommendation — the packet identifies WHAT was dropped; targeted retrieval delivers the content.

`truncation_summary` is always present on a successful packet response. When no truncation occurred, `dropped_layers` is an empty array, `dropped_node_ids_by_layer` is an empty object, and `fallback_advice` carries the standard per-record retrieval guidance (so consumers can read it unconditionally without branching on presence). Schema:

```yaml
truncation_summary:
  dropped_layers: ["impact_surfaces", "scoped_local_context"]   # ordered by priority
  dropped_node_ids_by_layer:
    impact_surfaces: ["SEC-INS-007", "SEC-ELF-002"]
    scoped_local_context: ["CF-0033", "M-12"]
  fallback_advice: "Retrieve dropped nodes via mcp__worldloom__get_record(record_id) or mcp__worldloom__get_record_field(record_id, field_path) as needed."
```

## Index + Follow-Up Retrieval Pattern

The context packet's five content layers (`local_authority` through `impact_surfaces`; `task_header` is metadata) deliver an INDEX of locality-relevant nodes plus body-preview snippets sufficient for ranking and citation, not the full bodies of every node. Skills that need the full body of a load-bearing node retrieve it via `mcp__worldloom__get_record(record_id)`; skills that need a single field of a large record retrieve it via `mcp__worldloom__get_record_field(record_id, field_path)`. This pattern keeps single-response packet sizes within model-context budgets while preserving FOUNDATIONS §Tooling Recommendation completeness guarantees: the packet identifies WHAT must be retrieved; targeted retrieval delivers the content.

## Delivery Modes

`get_context_packet` accepts an optional `delivery_mode` parameter that selects per-node payload shape. Layer assembly, `why_included` arrays, `task_header` metadata, governing-context guardrails, and per-layer node-id sets are identical across modes — only per-node content differs.

### `full` (default)

Each node carries a `body_preview` string (truncated body snippet, capped at ~280 characters) plus the `summary` field as recorded in the index. This is the legacy shape; callers that omit `delivery_mode` get this behavior unchanged.

Use `full` when downstream consumers need preview-level content for ranking, citation, or in-line skim before deciding whether to fetch full bodies.

### `summary_only`

Each node carries a non-null `summary` field (≤100 characters, derived from the index `summary`, or the record's `notes` first line, or the body's first sentence if no DB summary is present) and **omits** `body_preview` entirely. Governing-context `record` projections (e.g. `character_generation` invariant and Mystery Reserve fields) are unaffected by the delivery mode and remain attached when their task-specific assembly normally includes them.

Use `summary_only` when consumers only need an "index of what exists" — e.g. Phase 7 firewall scoping in `canon-addition`, or Phase 1-3 claim planning in `diegetic-artifact-generation` — and will retrieve specific bodies via `mcp__worldloom__get_record(record_id)` per identified id. The compact shape lets the same `token_budget` cover materially broader locality coverage.

### Mode invariants

- Both modes return the same `node.id` set per layer for the same `task_type`, `seed_nodes`, and world state.
- `summary_only` summary fields are ≤100 characters.
- Default behavior (no `delivery_mode` parameter) is identical to `delivery_mode: 'full'`.

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
- `governing_world_context`: no-world-write rules, distribution discipline, all invariant records with full parsed `record` bodies, all Mystery Reserve records with parsed firewall fields (`what_is_unknown`, `disallowed_cheap_answers`, `common_in_world_interpretations`, `status`), Mystery Reserve firewall on locality intersection nodes
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
