# Pre-flight and World-State Prerequisites

Post-SPEC-13, world canon lives as atomic YAML records under `worlds/<slug>/_source/`. Skills do NOT bulk-read those subdirectories — Hook 2 redirects oversized `_source/` directory reads to MCP retrieval. The retrieval contract for this skill:

## Primary load: context packet

Pre-flight calls:

```
mcp__worldloom__get_context_packet(
  task_type='canon_facts_from_diegetic_artifacts',
  seed_nodes=[<artifact-anchor seeds>],
  token_budget=12000
)
```

`canon_facts_from_diegetic_artifacts` is registered in the TASK_TYPES enum by MCPENH-002. Its ranking profile prioritizes the source artifact, referenced records, named-entity neighbors, canon facts, invariants, Mystery Reserve entries, and artifact-local section context while preserving the broad Phase 2 grounding scan.

Per `docs/CONTEXT-PACKET-CONTRACT.md`, the packet returns Kernel concepts + invariants + relevant CFs + named-entity neighbors + section context for the seed-local domains. It is the entry point, not the whole load — Phase 2 and Phase 6 expand on demand via record-addressed retrieval.

### Choosing seed_nodes

- Resolve every named entity the artifact references via `mcp__worldloom__find_named_entities(names)` and pass the resulting `ENT-NNNN` ids as primary seeds. The artifact's prose names the world surfaces it implicates — those are the right anchor points.
- If the artifact's frontmatter declares explicit `references_record` ids (CFs / sections / mysteries the author cited as grounding), include them in the seed set.
- If the artifact declares `author_character_id`, include the author's `CHAR-NNNN` (resolved through the character record's referenced entities) so Phase 6d.2 epistemic-horizon and 6d.3 MR positional checks have local authority.

## Persisted-with-summary delivery handling

Per `docs/CONTEXT-PACKET-CONTRACT.md` §Fast-Summary Inline Delivery, `get_context_packet` may return `task_header.delivery_status: persisted_with_summary` when the full packet exceeds the MCP inline transport ceiling. In that state, the inline response carries `governing_summary` id lists and `truncation_summary.fallback_advice`; the full packet body is persisted at `task_header.persisted_output_path`, and the `nodes` arrays in `local_authority`, `exact_record_links`, `scoped_local_context`, `governing_world_context`, and `impact_surfaces` are empty.

Use one of two recovery paths:

1. **Direct id-batch retrieval**: read `governing_summary.invariant_ids`, `governing_summary.seed_relevant_cf_ids`, and `governing_summary.dropped_node_ids_by_class`, then call `mcp__worldloom__get_records(record_ids=[...], world_slug=<slug>)` for the CF / INV / M / SEC bodies this skill's downstream phases need. Phase 6a needs every invariant id; Phase 6b can use `get_firewall_content(world_slug)` for the M projection; Phase 6c reads CF bodies for distribution-discipline checks.
2. **Persisted slice extraction**: call `mcp__worldloom__get_persisted_packet_slice(persisted_path=task_header.persisted_output_path, slice_path='<dot-path>')` when the packet's ranked neighborhood structure matters more than direct id retrieval, for example `governing_world_context.nodes` or an id-selected node slice.

Either path is valid. Prefer `get_records` when the needed ids are already known; prefer `get_persisted_packet_slice` when the packet's ranking-profile context is the thing being inspected. Treat the persisted file as session-local.

## Targeted record retrieval (during classification, scoring, and 6 sub-checks)

When a phase needs a record beyond what the packet returned:

- `mcp__worldloom__get_record(record_id)` — single record by id (CF / CH / INV / M / OQ / ENT / SEC). Used by Phase 2 grounding, Phase 6a invariant conformance, Phase 6b MR firewall expansion.
- `mcp__worldloom__get_records(record_ids, world_slug?)` — known-id batch retrieval; prefer over N individual `get_record` calls when Phase 6a, Phase 6b, or Phase 6c needs multiple INV / M / CF / SEC bodies.
- `mcp__worldloom__search_nodes(node_type=..., filters=...)` — domain-filtered scans:
  - `node_type='canon_fact', filters={domain: ...}` — Phase 2 grounding for a specific claim's apparent domain; Phase 6c distribution-discipline lookups.
  - `node_type='invariant_record', filters={category: ...}` — Phase 6a expansion if a card touches a category whose INVs were not packet-surfaced.
- `mcp__worldloom__get_firewall_content(world_slug)` — Phase 6b bulk firewall projection when a card implicates an M not in the packet; use `get_record('M-NNNN')` only when full M-record context is needed beyond the projection.
- `mcp__worldloom__get_persisted_packet_slice(persisted_path, slice_path)` — structured slice extraction from a `persisted_with_summary` packet body. Use when Pre-flight returned only inline `governing_summary` id lists and the persisted packet's ranked layer context is needed.
- `mcp__worldloom__get_neighbors(node_id)` — relation graph around a resolved entity (regions / institutions / species). Used in Phase 6d.2 epistemic-horizon reasoning.
- `mcp__worldloom__find_named_entities(names)` — resolve names parsed from the artifact prose to `ENT-NNNN` ids during seed selection AND during Phase 2 when a claim names a previously-unseeded entity.
- `mcp__worldloom__find_sections_touched_by(cf_id)` — when grounding a candidate against the section context where a related CF was applied (Phase 2 partially_grounded detection).

## Primary-authored / hybrid files (direct Read permitted)

These load directly:

- `docs/FOUNDATIONS.md` — Rules 2 / 3 / 4 / 5 / 7 cited throughout Phases 5 / 6 / 7; Canon Layers at Phase 6; CF Schema as the structural target the proposal card shadows.
- `worlds/<world-slug>/WORLD_KERNEL.md` — Phase 4 coherence-with-world scoring; Phase 6 firewall reasoning ("does this fit the genre/tonal contract").
- `worlds/<world-slug>/ONTOLOGY.md` — Categories + Relation Types + Notes; Phase 2 type-field validation; Phase 6c distribution-discipline categorization.
- `<artifact_path>` — the source artifact's prose body. Phase 1 prose-primary extraction requires the full artifact in working context; the file is hybrid (frontmatter + body) but small enough to load whole.
- `worlds/<world-slug>/proposals/INDEX.md` — optional read for prior-batch coverage scanning; the engine's `allocate_next_id` is authoritative for ID allocation.

## ID allocation

- Pre-flight: `mcp__worldloom__allocate_next_id(world_slug, 'BATCH')` → `BATCH-NNNN`. Single call.
- After Phase 5 settles (surviving cards known): `mcp__worldloom__allocate_next_id(world_slug, 'PR')` per surviving card, called in card order. `PR-NNNN` IDs are bound before Phase 6 begins so the Canon Safety Check trace and Phase 6f repair log can reference them. Note: the allocator is idempotent in absence of disk writes — calling `allocate_next_id(world_slug, 'PR')` N times before any card lands on disk returns the same next-id N times. Reserve PR-NNNNs in card order (first call returns `PR-N`; assign `PR-N` to card 1, `PR-(N+1)` to card 2, ..., `PR-(N+M-1)` to card M); the disk writes at Phase 8 commit (cards written in card order) bump the counter for the next batch.

The allocator scans the indexed world state for the highest existing id of the requested class and returns the next. Drops at Phase 6f or Phase 8 leave permanent gaps — the next batch's allocator picks up at `highest_existing + 1`, never reusing a dropped id.

## Pre-flight steps (canonical order)

1. **Directory existence**: `worlds/<world-slug>/` exists.
2. **Artifact path resolution**: `artifact_path` resolves inside `worlds/<world-slug>/diegetic-artifacts/` and is reachable + readable. Cross-world, out-of-tree, or repo-root paths are rejected.
3. **Source-artifact ID parse**: parse the artifact's frontmatter (or filename, if frontmatter absent) to extract the `DA-NNNN` id; bind to `source_artifact_id` for all downstream card frontmatter and the batch manifest.
4. **Direct-read load**: FOUNDATIONS.md + WORLD_KERNEL.md + ONTOLOGY.md + the source artifact body.
5. **ID allocation**: `mcp__worldloom__allocate_next_id(world_slug, 'BATCH')` → `BATCH-NNNN`. Single call at pre-flight.
6. **Context packet**: `mcp__worldloom__get_context_packet` per §Primary load above. Seed selection per §Choosing seed_nodes.
7. **Existing INDEX read**: read `worlds/<world-slug>/proposals/INDEX.md` if present (for append at Phase 8).
8. **Prior-batch positional-flag scan**: if the artifact's frontmatter declares `author_character_id` OR a named `author`, scan existing batch manifests in `worlds/<world-slug>/proposals/batches/` for `mr_positional_flags` entries referencing the same author. Surface any prior flags into the Phase 8 deliverable summary as an elevated-positional-vigilance signal — informational; the user weighs whether 6d.3 scrutiny needs strengthening. A clean prior-batch scan is recorded in the manifest notes; if prior flags are found, each matching flag's batch-id + MR-id overlap is listed in the Phase 8 summary so the user can cross-reference before approving cards.

## Abort conditions

Pre-flight aborts when any hold:

- `worlds/<world-slug>/` missing → "World directory not found. Run `create-base-world` first, or supply a valid `world_slug`."
- `artifact_path` resolves outside `worlds/<world-slug>/diegetic-artifacts/` → abort with the offending path.
- Source artifact unreachable or unreadable → abort naming the file.
- Source artifact's `DA-NNNN` id cannot be parsed from frontmatter or filename → abort.
- `mcp__worldloom__allocate_next_id` returns an error (e.g., world-index missing or stale; rebuild via `world-index build` before proceeding).
- `parameters_path` provided but unreadable → abort naming the file.
- Card-slug collision detected at Phase 8 (would-be `proposals/PR-NNNN-<slug>.md` already exists) → abort; never overwrite.
