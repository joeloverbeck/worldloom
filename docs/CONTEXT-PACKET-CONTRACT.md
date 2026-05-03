# Context Packet Contract

`mcp__worldloom__get_context_packet(task_type, seed_nodes, token_budget)` is the retrieval-side contract for delivering the minimum complete machine-facing bundle required by `docs/FOUNDATIONS.md`.

The packet is locality-first. It must secure seed-local authority and the governing FOUNDATIONS surfaces before it spends budget on broader downstream context.

## Packet Shape

```yaml
task_header:
  task_type: canon_addition | character_generation | diegetic_artifact_generation | continuity_audit | propose_new_canon_facts | propose_new_characters | propose_new_worlds_from_preferences | canon_facts_from_diegetic_artifacts | emergent_pressure_events | story_bootstrap | story_page_cycle | storylet_pool_authoring | branching_story_health_audit | story_fact_promotion_to_canon | other
  world_slug: animalia
  generated_at: "2026-04-24T00:00:00Z"
  token_budget:
    requested: 12000
    allocated: 9800
  seed_nodes:
    - CHAR-0002
  full_body_classes_delivered: []
  harness_ceiling_chars: 60000
  envelope_overhead_reserve_chars: 4000
  governing_full_body_priority:
    invariants: reserve
    mystery_reserve: reserve
  estimator_version: chars-per-token-v1
  packet_version: 2
  delivery_status: inline
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
- `full_body_classes_delivered`, the live node classes that actually received `full_body` after budget allocation
- `harness_ceiling_chars`, the gross serialized-response character ceiling used for this request
- `envelope_overhead_reserve_chars`, the reserved margin for MCP response-envelope overhead outside the packet body
- `governing_full_body_priority`, the per-task policy for invariant and Mystery Reserve full-body reservation
- `estimator_version`, the packet-size estimator contract used for `token_budget.allocated`
- `delivery_status`, either `inline` for a normal packet or `persisted_with_summary` for the overflow-recovery summary shape
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
- optional parsed `record` projections on mandatory governing nodes when a task requires structured audit semantics rather than a body-preview index

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

The packet response must satisfy two ceilings:

- `token_budget`, the caller-facing budget reported in `task_header.token_budget` and estimated with the package's deterministic `chars-per-token-v1` estimator.
- `harness_ceiling_chars`, the gross serialized MCP response character ceiling used to stay below Claude Code MCP inline-response limits. The default is `60000` characters and can be overridden for the server process with `WORLDLOOM_MCP_HARNESS_CEILING_CHARS=<positive integer>`.
- `envelope_overhead_reserve_chars`, the fixed packet-body reserve for MCP response-envelope overhead. The default is `4000` characters.

The effective inline packet-body ceiling is `harness_ceiling_chars - envelope_overhead_reserve_chars` (`56000` characters by default). The assembler builds all five content layers. If the fully assembled packet would exceed that effective ceiling, the server writes that full packet JSON to its package-local tool-results directory and returns a bounded inline summary with `task_header.delivery_status: persisted_with_summary` and `task_header.persisted_output_path`. The same tool-results directory policy is used by `get_record` when an unprojected hybrid record is too large: the full record JSON is persisted, and the bounded inline response carries `delivery_status: oversize_with_projection_suggestions` plus suggested `section_path` retries. If the suggestion list must be shortened to keep the recovery response under the effective ceiling, `suggested_section_paths_omitted_count` reports the number of valid paths omitted from the inline hint.

For token-budget pressure where the full packet still fits the effective serialized-response ceiling, the assembler drops layers in priority order (cheapest-to-drop first) until both `estimateStablePacketSize(packet) <= token_budget` and `JSON.stringify(packet).length <= harness_ceiling_chars - envelope_overhead_reserve_chars` hold:

1. `impact_surfaces`
2. `scoped_local_context`
3. `exact_record_links`
4. `governing_world_context`

`local_authority` and `task_header` are never dropped. For task types whose `task_header.governing_full_body_priority` reserves invariants or Mystery Reserve entries, `governing_world_context` also becomes required once those governing full bodies are allocated: if the packet cannot fit that layer plus local authority under the requested token or effective harness ceiling, the assembler returns `packet_incomplete_required_classes` instead of silently downgrading those governing full bodies. If even `local_authority` exceeds the requested token budget after every droppable layer is emptied and no persisted-summary response can fit inline, the assembler returns the same structured code. The error details include the usual token retry hint plus `harness_ceiling_chars`, `envelope_overhead_reserve_chars`, `effective_harness_ceiling_chars`, and `minimum_required_harness_ceiling_chars` so operators can distinguish token-budget insufficiency from transport-ceiling insufficiency.

Drops are layer-granular: when a layer is dropped, its entire `nodes` list is cleared and the cleared node ids are recorded under `truncation_summary.dropped_node_ids_by_layer`. High-value `full_body` delivery is downgraded node-by-node before it can exceed either ceiling unless the node is a governing-context invariant or Mystery Reserve entry covered by a `reserve` priority. Downgraded nodes remain present with their normal preview/summary shape and are listed under `truncation_summary.full_body_downgrades`; reserve-priority governing nodes either retain full bodies or produce `packet_incomplete_required_classes`. Consumers route dropped or downgraded node ids through `mcp__worldloom__get_record(record_id)` / `mcp__worldloom__get_records(record_ids)` (full bodies) or `mcp__worldloom__get_record_field(record_id, field_path)` (single field) per FOUNDATIONS §Tooling Recommendation — the packet identifies WHAT was dropped or downgraded; targeted retrieval delivers the content.

Worked example: a request with `token_budget: 33000` can still serialize to more than `harness_ceiling_chars - envelope_overhead_reserve_chars` because JSON keys, structural repetition, response-envelope overhead, and actual tokenizer behavior differ from the package's approximate token estimator. In that case, the assembler persists the full packet and returns the fast-summary inline shape rather than letting the external MCP harness reject the response.

`truncation_summary` is always present on a successful packet response. When no truncation occurred, `dropped_layers` is an empty array, `dropped_node_ids_by_layer` is an empty object, and `fallback_advice` carries the standard targeted-retrieval guidance (so consumers can read it unconditionally without branching on presence). Schema:

```yaml
truncation_summary:
  dropped_layers: ["impact_surfaces", "scoped_local_context"]   # ordered by priority
  dropped_node_ids_by_layer:
    impact_surfaces: ["SEC-INS-007", "SEC-ELF-002"]
    scoped_local_context: ["CF-0033", "M-12"]
  full_body_downgrades:
    - layer: governing_world_context
      node_id: ONT-1
      node_type: invariant
      reason: high_value_full_body_budget_exceeded
  fallback_advice: "Retrieve dropped nodes via mcp__worldloom__get_record(record_id), mcp__worldloom__get_records(record_ids), or mcp__worldloom__get_record_field(record_id, field_path) as needed."
```

## Fast-Summary Inline Delivery

When `task_header.delivery_status === 'persisted_with_summary'`, the inline response is a recovery summary instead of the full packet. It includes:

- `task_header.persisted_output_path`, pointing at the package-persisted full packet JSON.
- `governing_summary`, containing full `active_rules`, `protected_surfaces`, `prohibited_moves`, `required_output_schema`, plus id lists for open risks, invariants, seed-relevant CFs, and the omitted node ids grouped by node class.
- Empty inline layer `nodes` arrays; omitted ids are listed in `governing_summary.dropped_node_ids_by_class`, and `body_preview`, `full_body`, parsed `record`, and full layer payloads live in the persisted full packet.
- `truncation_summary.fallback_advice` naming `mcp__worldloom__get_persisted_packet_slice` plus `get_record` / `get_records` for structured recovery.

Use `mcp__worldloom__get_persisted_packet_slice(persisted_path, slice_path)` for structured extraction from the full packet. Dot paths address object fields (`governing_world_context.nodes`) and may select array entries by id (`local_authority.nodes[id=entity:donostia]`).

## Index + Follow-Up Retrieval Pattern

The context packet's five content layers (`local_authority` through `impact_surfaces`; `task_header` is metadata) deliver an INDEX of locality-relevant nodes plus body-preview snippets sufficient for ranking and citation. For selected task-critical classes, nodes in `local_authority`, `governing_world_context`, and `exact_record_links` may also carry an additive `full_body` string. Skills that need the full body of one load-bearing node that was not delivered retrieve it via `mcp__worldloom__get_record(record_id)`; for large hybrid records, an oversize response returns `suggested_section_paths` so the skill can immediately retry with `section_path` rather than falling back to raw file reads. Skills that already have a known set of ids retrieve them via `mcp__worldloom__get_records(record_ids)` to preserve order and avoid N round trips. Skills that need a single field of a large record retrieve it via `mcp__worldloom__get_record_field(record_id, field_path)`. When a packet returns `delivery_status: persisted_with_summary`, skills retrieve structured slices from the persisted full packet via `mcp__worldloom__get_persisted_packet_slice(persisted_path, slice_path)`. Skills whose validation surface intentionally tests every record of a class, such as whole-class invariant or Mystery Reserve firewall passes, may use `mcp__worldloom__list_records(world_slug, record_type=<type>, include_full_body=true)` as the primary load instead of a seed-local packet plus a known-id batch. This pattern keeps packet sizes within model-context budgets while preserving FOUNDATIONS §Tooling Recommendation completeness guarantees: the packet identifies WHAT must be retrieved; task-aware `full_body`, targeted retrieval, batched targeted retrieval, persisted-packet slice retrieval, and whole-class enumeration deliver the required content.

## Task-Aware Full-Body Delivery

`full_body` is an optional per-node string sourced from the same indexed canonical body as `body_preview`. It is additive: consumers that read only `body_preview`, `summary`, or parsed `record` projections continue to work unchanged.

Full bodies are considered only for `local_authority`, `governing_world_context`, and `exact_record_links`, in that priority order. `scoped_local_context` and `impact_surfaces` remain preview/summary-first to avoid spending the packet budget on broad advisory surfaces.

| task_type | Full-body candidates |
|---|---|
| `canon_addition` | `canon_fact_record`, `invariant`, `mystery_reserve_entry`, `open_question_entry` |
| `character_generation` | `canon_fact_record`, `invariant`, `mystery_reserve_entry`, `section` records whose `file_class` is `PEOPLES_AND_SPECIES` or `EVERYDAY_LIFE` |
| `diegetic_artifact_generation` | `canon_fact_record`, `invariant`, `mystery_reserve_entry`, `section` records whose `file_class` is `TIMELINE` or `INSTITUTIONS` |
| `propose_new_canon_facts` | `canon_fact_record`, `invariant`, `mystery_reserve_entry`, `open_question_entry` |
| `propose_new_characters` | `canon_fact_record`, `invariant`, `section` records whose `file_class` is `PEOPLES_AND_SPECIES` |
| `canon_facts_from_diegetic_artifacts` | `canon_fact_record`, `invariant`, `mystery_reserve_entry`, `diegetic_artifact_record` |
| `story_page_cycle` | `canon_fact_record`, `invariant`, `mystery_reserve_entry` |
| `storylet_pool_authoring` | `canon_fact_record`, `invariant`, `mystery_reserve_entry` |
| `branching_story_health_audit` | `canon_fact_record`, `invariant`, `mystery_reserve_entry` |
| `story_fact_promotion_to_canon` | `canon_fact_record`, `invariant`, `mystery_reserve_entry`, `open_question_entry` |
| `continuity_audit`, `propose_new_worlds_from_preferences`, `emergent_pressure_events`, `other` | none; use targeted retrieval or `list_records(... include_full_body=true)` where whole-class loading is required |

The assembler first fits the normal preview/summary packet under the requested token budget and configured harness character ceiling. It then applies this per-task governing-context priority table before opportunistic full-body allocation:

| task_type | invariant full bodies in `governing_world_context` | Mystery Reserve full bodies in `governing_world_context` |
|---|---|---|
| `character_generation` | `reserve` | `reserve` |
| `diegetic_artifact_generation` | `reserve` | `reserve` |
| `story_bootstrap` | `reserve` | `reserve` |
| `story_page_cycle` | `reserve` | `reserve` |
| `storylet_pool_authoring` | `reserve` | `reserve` |
| `branching_story_health_audit` | `reserve` | `reserve` |
| `story_fact_promotion_to_canon` | `reserve` | `reserve` |
| all other task types | `opportunistic` | `opportunistic` |

`reserve` means every matching governing-context node receives its `full_body` before any opportunistic layer spends full-body budget. If the packet can no longer fit after dropping `impact_surfaces`, `scoped_local_context`, and `exact_record_links`, the assembler returns `packet_incomplete_required_classes` with `missing_classes: ['governing_world_context.full_body']` rather than silently downgrading those governing full bodies. `opportunistic` means the existing one-node-at-a-time allocation applies: if a candidate would exceed either ceiling, that node is downgraded back to preview/summary delivery and recorded in `truncation_summary.full_body_downgrades` with reason `high_value_full_body_budget_exceeded`. `task_header.governing_full_body_priority` reports the active policy, and `task_header.full_body_classes_delivered` lists the live node classes that actually retained at least one `full_body` after allocation and layer enforcement.

### Story Page Cycle Profile

`story_page_cycle` is the registered context-packet profile for `branching-story-page-cycle` Pre-flight. The skill derives `seed_nodes` from the parent page state: cast members' resolved world entity ids, current location, and active period. The profile uses an 18000 default budget and prioritizes seed-scoped canon facts, governing invariant and Mystery Reserve records, named-entity neighbors, relevant section context, and a latest `change_log_entry` node in `governing_world_context` so the page can persist `state_snapshot.canon_revision`.

The profile is still world-canon read-only. Story-bundle records remain direct-Read by the skill from `worlds/<world-slug>/stories/<story-slug>/_source/`; `get_context_packet(task_type='story_page_cycle', ...)` returns only world-canon/indexed context and the governing audit trail needed to interpret the story-local turn safely.

### Storylet Pool Authoring Profile

`storylet_pool_authoring` is the registered context-packet profile for `storylet-pool-authoring` Pre-flight. The skill derives `seed_nodes` from the story kernel cast bind list's resolved world entity ids, recent page-history named entities, and the active story period. The profile uses an 18000 default budget and prioritizes premise-relevant canon facts, governing invariant and Mystery Reserve records, named-entity neighbors, relevant section context, and ontology-grounding context.

The profile is world-canon read-only. Storylet-pool records remain direct-Read by the skill from `worlds/<world-slug>/stories/<story-slug>/_source/`; `get_context_packet(task_type='storylet_pool_authoring', ...)` returns only world-canon/indexed context used to author story-local SLT records without promoting storylet claims to world canon.

### Branching Story Health Audit Profile

`branching_story_health_audit` is the registered context-packet profile for `branching-story-health-audit` Pre-flight. The skill derives `seed_nodes` from the story kernel cast bind list's resolved world entity ids and recent page-history named entities. The profile uses a 12000 default budget and prioritizes premise-relevant canon facts, governing invariant and Mystery Reserve records, named-entity neighbors, relevant section context, ontology-grounding context, and the latest `change_log_entry` node in `governing_world_context` so Phase 4 can compare the bundle's `canon_revision` baseline against recent canon movement.

The profile is world-canon read-only. Story-bundle records remain direct-Read by the skill from `worlds/<world-slug>/stories/<story-slug>/_source/`; `get_context_packet(task_type='branching_story_health_audit', ...)` returns only world-canon/indexed context used to audit story-local health without promoting audit findings or remediation cards to world canon.

### Story Fact Promotion To Canon Profile

`story_fact_promotion_to_canon` is the registered context-packet profile for `story-fact-promotion-to-canon` Pre-flight. The skill derives `seed_nodes` from source-relevant CF, M, INV, OQ, and named-entity ids gathered while translating a story-local source into a canon-addition proposal package. The profile uses an 8000 default budget and prioritizes canon fact records, governing invariant and Mystery Reserve records, open questions, named-entity grounding, relevant section context, and recent change-log context for canon-baseline drift.

The profile does not mutate world canon. It supports the story-promotion skill's proposal-package handoff to canon-addition, with reserve governing invariant and Mystery Reserve full bodies so downstream critics can audit scope inflation and mystery-firewall risk before any separate canon-addition invocation.

## Focused Retrieval Tools

Beyond the general packet retrieval, a small set of use-case-specific tools project just the fields a recurring audit needs, keyed by record id. They sit alongside `get_record`, `get_records`, and `get_record_field`: prefer them when the audit is mechanical and field-bounded, and the alternatives would be either a budget-pressured packet call or a broader retrieval than the audit requires.

| Tool | Use case | Returns |
|---|---|---|
| `list_records(world_slug, record_type, include_full_body=true)` | Whole-class loads where the consumer must test every record of a supported atomic or hybrid class, such as EPE Phase 6 invariant / Mystery Reserve firewall checks, continuity-audit cross-checks, or CHAR/DA/PA registry enumeration. | `{ records: [{ record_id, content_hash, file_path, body }], total, truncated: false }`; hybrid `body` is `{ record_kind, frontmatter, body_sections }` |
| `get_records(record_ids, world_slug?)` | Known-id follow-up loads where the packet, claim map, audit window, or dossier trace already names multiple records and whole-class enumeration would be too broad. | `{ records: [{ record_id, found, record?, content_hash?, file_path?, error? }] }` in request order |
| `get_persisted_packet_slice(persisted_path, slice_path)` | Structured recovery from a `get_context_packet` `persisted_with_summary` response. | `{ found, slice?, error? }` for dot paths such as `governing_world_context.nodes` or `local_authority.nodes[id=entity:donostia]` |
| `get_record_field(record_id, field_path)` | Read a single field of a single atomic record without paying the full-record parse cost. | `{ value, content_hash, file_path }` |
| `get_firewall_content(world_slug, m_ids?)` | Phase 7b Mystery Reserve firewall audits — bulk projection of every (or selected) M record's firewall-relevant fields in a single call. | `{ records: { [m_id]: { title, status, unknowns, common_interpretations, disallowed_cheap_answers } }, not_found: string[] }` |

`get_firewall_content` is the canonical bulk-retrieval path for Phase 7b firewall scoping. Use `get_record('M-NNNN')` instead when the audit needs full M-record context (e.g., `notes`, `extensions`, or `modification_history`); use `get_context_packet(... node_classes: ['mystery_reserve_entry'])` for discovery (which M records exist around the seed) rather than for the firewall projection itself.

## Delivery Modes

`get_context_packet` accepts an optional `delivery_mode` parameter that selects per-node payload shape. Layer assembly, `why_included` arrays, `task_header` metadata, governing-context guardrails, and per-layer node-id sets are identical across modes — only per-node content differs.

### `full` (default)

Each node carries a `body_preview` string (truncated body snippet, capped at ~280 characters) plus the `summary` field as recorded in the index. Eligible high-value nodes may additionally carry `full_body`. Callers that omit `delivery_mode` get this behavior.

Use `full` when downstream consumers need preview-level content for ranking, citation, or in-line skim before deciding whether to fetch full bodies.

### `summary_only`

Each node carries a non-null `summary` field (≤100 characters, derived from the index `summary`, or the record's `notes` first line, or the body's first sentence if no DB summary is present) and **omits** `body_preview` entirely. Task-specific `record` projections (e.g. `character_generation` invariant fields, Mystery Reserve firewall fields, seed-relevant CF records, and seed-touched priority SEC records) and eligible `full_body` fields are unaffected by the delivery mode and remain attached when their task-specific assembly normally includes them.

Use `summary_only` when consumers only need an "index of what exists" — e.g. Phase 7 firewall scoping in `canon-addition`, or Phase 1-3 claim planning in `diegetic-artifact-generation` — and will retrieve specific bodies via `mcp__worldloom__get_record(record_id)` per identified id. The compact shape lets the same `token_budget` cover materially broader locality coverage.

### Mode invariants

- Both modes return the same `node.id` set per layer for the same `task_type`, `seed_nodes`, and world state.
- `summary_only` summary fields are ≤100 characters.
- Default behavior (no `delivery_mode` parameter) is identical to `delivery_mode: 'full'`.
- `full_body` eligibility and budget downgrade behavior are independent of `delivery_mode`.

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

`node_classes` and `delivery_mode` compose orthogonally: a request with `node_classes: ['mystery_reserve_entry']` and `delivery_mode: 'summary_only'` returns mystery-only nodes carrying `summary` (≤100 chars) with `body_preview` omitted. Task-specific `record` projections (e.g. `character_generation` invariant fields, Mystery Reserve firewall fields, seed-relevant CF records, and seed-touched priority SEC records) are unaffected by either parameter and remain attached when their task-specific assembly normally includes them.

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
    harness_ceiling_chars: 60000
    envelope_overhead_reserve_chars: 4000
    estimator_version: chars-per-token-v1
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
- `governing_world_context`: no-world-write rules, distribution discipline, all invariant records with full parsed `record` bodies, all Mystery Reserve records with parsed firewall fields (`id`, `title`, `status`, `knowns`, `unknowns`, `common_interpretations`, `disallowed_cheap_answers`, `domains_touched`, `extensions`), Mystery Reserve firewall on locality intersection nodes
- task-specific projections: for `character_generation`, seed-relevant `canon_fact_record` nodes and seed-touched priority `section` nodes (`EVERYDAY_LIFE`, `PEOPLES_AND_SPECIES`, `INSTITUTIONS`, `ECONOMY_AND_RESOURCES`, `GEOGRAPHY`) carry full parsed `record` bodies wherever they appear in packet layers; non-priority and non-seed-touched sections remain preview/summary-only unless retrieved via `get_record`
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
