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

## Targeted record retrieval (during classification, scoring, and 6 sub-checks)

When a phase needs a record beyond what the packet returned:

- `mcp__worldloom__get_record(record_id)` — single record by id (CF / CH / INV / M / OQ / ENT / SEC). Used by Phase 2 grounding, Phase 6a invariant conformance, Phase 6b MR firewall expansion.
- `mcp__worldloom__search_nodes(node_type=..., filters=...)` — domain-filtered scans:
  - `node_type='canon_fact', filters={domain: ...}` — Phase 2 grounding for a specific claim's apparent domain; Phase 6c distribution-discipline lookups.
  - `node_type='mystery_record'` — Phase 6b firewall expansion when a card implicates an M not in the packet.
  - `node_type='invariant_record', filters={category: ...}` — Phase 6a expansion if a card touches a category whose INVs were not packet-surfaced.
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
- After Phase 5 settles (surviving cards known): `mcp__worldloom__allocate_next_id(world_slug, 'PR')` per surviving card, called in card order. `PR-NNNN` IDs are bound before Phase 6 begins so the Canon Safety Check trace and Phase 6f repair log can reference them.

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
