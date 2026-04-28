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

## Focused Retrieval Tools

Beyond the general packet retrieval, a small set of use-case-specific tools project just the fields a recurring audit needs, keyed by record id. They sit alongside `get_record` and `get_record_field`: prefer them when the audit is mechanical and field-bounded, and the alternatives would be either a budget-pressured packet call or N per-record `get_record` calls.

| Tool | Use case | Returns |
|---|---|---|
| `get_record_field(record_id, field_path)` | Read a single field of a single atomic record without paying the full-record parse cost. | `{ value, content_hash, file_path }` |
| `get_firewall_content(world_slug, m_ids?)` | Phase 7b Mystery Reserve firewall audits — bulk projection of every (or selected) M record's firewall-relevant fields in a single call. | `{ records: { [m_id]: { title, status, unknowns, common_interpretations, disallowed_cheap_answers } }, not_found: string[] }` |

`get_firewall_content` is the canonical bulk-retrieval path for Phase 7b firewall scoping. Use `get_record('M-NNNN')` instead when the audit needs full M-record context (e.g., `notes`, `extensions`, or `modification_history`); use `get_context_packet(... node_classes: ['mystery_reserve_entry'])` for discovery (which M records exist around the seed) rather than for the firewall projection itself.

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

## Class Filtering

`get_context_packet` accepts an optional `node_classes` parameter that restricts every layer's `nodes` array to the specified node-type set. Layer assembly, `why_included` arrays, `task_header` metadata, governing-context guardrails (`active_rules`, `protected_surfaces`, `required_output_schema`, `prohibited_moves`, `open_risks`), and the five-layer structure are unchanged — only per-layer `nodes` lists are filtered post-assembly, before budget enforcement.

### Parameter shape

`node_classes` is an array of `NodeType` values (the same enum used by `node.node_type` throughout the index). Valid entries include `canon_fact_record`, `change_log_entry`, `mystery_reserve_entry`, `open_question_entry`, `invariant`, `named_entity`, `section`, `character_record`, `diegetic_artifact_record`, and the rest of the indexed node types. Unrecognized entries are rejected before assembly.

### Default behavior

When `node_classes` is absent, no filtering is applied — every layer's `nodes` array contains the full mix of classes the assembler produced. This preserves the legacy contract for callers that do not opt in.

### Empty array

`node_classes: []` is a degenerate-but-valid request: the filter retains nothing, every layer's `nodes` array is empty, and the rest of the packet (task_header, why_included arrays, governing-context guardrails, truncation_summary) is preserved. Budget enforcement still runs against the now-empty layers and may not need to drop anything.

### Use cases

- A `character_generation` Phase 7a invariant-conformance call requests `node_classes: ['invariant']` and uses the full token budget for invariant coverage rather than spending it on canon facts and section bodies.
- A `character_generation` Phase 7b Mystery Reserve firewall call requests `node_classes: ['mystery_reserve_entry']` and uses the full token budget for M-record coverage.
- A `character_generation` Phase 7c distribution-conformance call requests `node_classes: ['canon_fact_record']` and uses the full token budget for CF coverage.

### Composition with `delivery_mode`

`node_classes` and `delivery_mode` compose orthogonally: a request with `node_classes: ['mystery_reserve_entry']` and `delivery_mode: 'summary_only'` returns mystery-only nodes carrying `summary` (≤100 chars) with `body_preview` omitted. Governing-context `record` projections (e.g. `character_generation` invariant and Mystery Reserve fields) are unaffected by either parameter and remain attached when their task-specific assembly normally includes them.

### Filter invariants

- The filter applies per-layer post-assembly. Seed nodes are not filtered at the input level — `seed_nodes` may contain any `NodeType`, but a seed whose class is excluded by `node_classes` will be filtered out of `local_authority`.
- The five-layer structure is preserved even when some layers' `nodes` arrays are empty post-filter.
- Default (absent parameter) → current full-mix behavior.

### Worked example

A `diegetic-artifact-generation` Phase 7b firewall scoping call:

```yaml
request:
  task_type: diegetic_artifact_generation
  world_slug: animalia
  seed_nodes: [CF-0044]
  token_budget: 8000
  node_classes: [mystery_reserve_entry]

response (selected fields):
  task_header:
    task_type: diegetic_artifact_generation
    world_slug: animalia
    token_budget: { requested: 8000, allocated: 4200 }
    seed_nodes: [CF-0044]
    packet_version: 2
  local_authority:
    nodes: []                        # CF-0044 filtered out (canon_fact_record not in node_classes)
    why_included: ["seed node supplied by caller"]
  exact_record_links:
    nodes: []
    why_included: []
  scoped_local_context:
    nodes: []
    why_included: []
  governing_world_context:
    active_rules: ["No silent canon mutation from diegetic generation", "Rule 7: preserve Mystery Reserve deliberately"]
    protected_surfaces: [...]
    nodes:
      - { id: M-0003, node_type: mystery_reserve_entry, ... }
      - { id: M-0007, node_type: mystery_reserve_entry, ... }
    why_included: ["Mystery Reserve firewall for the locality-first packet", ...]
  impact_surfaces:
    nodes: []
    rationale: []
  truncation_summary:
    dropped_layers: []
    dropped_node_ids_by_layer: {}
    fallback_advice: "..."
```

The response's `nodes` arrays contain only `mystery_reserve_entry` records; the full `token_budget` is available for M-record coverage rather than being split across canon facts, sections, and other classes the firewall scoping does not read.

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
