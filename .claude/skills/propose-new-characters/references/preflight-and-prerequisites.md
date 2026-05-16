# Pre-flight and World-State Prerequisites

Post-SPEC-13, world canon lives as atomic YAML records under `worlds/<slug>/_source/`. Skills do NOT bulk-read those subdirectories — Hook 2 redirects oversized `_source/` directory reads to MCP retrieval. The retrieval contract for this skill:

## Primary load: context packet

Pre-flight calls:

```
mcp__worldloom__get_context_packet(
  task_type='propose_new_characters',
  seed_nodes=[<registry-and-domain anchor seeds>],
  token_budget=15000
)
```

`propose_new_characters` is registered in the TASK_TYPES enum. Its ranking profile prioritizes character/person-registry-adjacent records, named-entity neighbors, invariants, Mystery Reserve entries, and local section context while preserving broad reasoning across institutions, peoples-and-species, everyday-life, geography, and timeline domains.

Per `docs/CONTEXT-PACKET-CONTRACT.md`, the packet returns Kernel concepts + invariants + relevant CFs + named-entity neighbors + section context for the seed-local domains. It is the entry point, not the whole load — Phases 1–11 expand on demand via record-addressed retrieval.

### Choosing seed_nodes

- If `parameters_path` declares an `upstream_audit_path`, derive seeds from records the audit cites (`AU-<integer>`'s findings list specific CF / SEC / M / ENT ids).
- If `parameters_path` declares `under_modeled_priority` or `target_domains` that name specific named entities (institutions, regions, species), resolve them via `mcp__worldloom__find_named_entities(names)` and pass the resulting `ENT-<integer>` ids.
- If neither is specified (interview-driven), seed with a small set (3–6) of representative anchor nodes drawn from WORLD_KERNEL §Core Pressures plus the institutions / regions / species named there as `ENT-<integer>` or `SEC-*` records.

## Persisted-with-summary delivery handling

Per `docs/CONTEXT-PACKET-CONTRACT.md` §Fast-Summary Inline Delivery, `get_context_packet` may return `task_header.delivery_status: persisted_with_summary` when the full packet exceeds the MCP inline transport ceiling. In that state, the inline response carries `governing_summary` id lists and `truncation_summary.fallback_advice`; the full packet body is persisted at `task_header.persisted_output_path`, and the `nodes` arrays in `local_authority`, `exact_record_links`, `scoped_local_context`, `governing_world_context`, and `impact_surfaces` are empty.

Use one of two recovery paths:

1. **Direct id-batch retrieval**: read `governing_summary.invariant_ids`, `governing_summary.seed_relevant_cf_ids`, and `governing_summary.dropped_node_ids_by_class`, then call `mcp__worldloom__get_records(record_ids=[...], world_slug=<slug>)` for the CF / INV / M / SEC bodies this skill's registry, negative-space, and Phase 10 checks need.
2. **Persisted slice extraction**: call `mcp__worldloom__get_persisted_packet_slice(persisted_path=task_header.persisted_output_path, slice_path='<dot-path>')` when the packet's ranked neighborhood structure matters more than direct id retrieval, for example `governing_world_context.nodes` or an id-selected node slice.

Either path is valid. Prefer `get_records` when the needed ids are already known; prefer `get_persisted_packet_slice` when the packet's ranking-profile context is the thing being inspected. Treat the persisted file as session-local.

## Targeted record retrieval (during reasoning)

When a phase needs records beyond what the packet returned:

- `mcp__worldloom__get_record(record_id)` — single record by id (CF / CH / INV / M / OQ / ENT / SEC).
- `mcp__worldloom__get_records(record_ids, world_slug?)` — known-id batch retrieval; prefer over N individual `get_record` calls when registry reasoning, negative-space merge, or Phase 10 checks need multiple CF / INV / M / SEC bodies.
- `mcp__worldloom__search_nodes(node_type=..., filters=...)` — domain-filtered scans:
  - `node_type='section', filters={file_class: 'institutions'}` — Phase 5 institutions-without-insiders/dissenters/enforcers; analogously for `everyday-life`, `geography`, `economy-and-resources`, `peoples-and-species`, `timeline`.
  - `node_type='canon_fact', filters={domain: ...}` — Phase 10c distribution discipline lookups (capability CFs whose `who_can_do_it` / `who_cannot_easily_do_it` blocks bear on the seeds under consideration).
  - `node_type='invariant'` — Phase 10a expansion when the packet did not surface an invariant the seed implicates.
- `mcp__worldloom__get_firewall_content(world_slug)` — Phase 10b bulk firewall projection when a seed implicates an M entry not in the packet; use `get_record('M-<integer>')` only when full M-record context is needed beyond the projection.
- `mcp__worldloom__get_persisted_packet_slice(persisted_path, slice_path)` — structured slice extraction from a `persisted_with_summary` packet body. Use when Pre-flight returned only inline `governing_summary` id lists and the persisted packet's ranked layer context is needed.
- `mcp__worldloom__get_neighbors(node_id)` — relation graph around a resolved entity (regions / institutions / species / characters).
- `mcp__worldloom__find_named_entities(names)` — resolve names from `parameters_path` or `upstream_audit_path` to `ENT-<integer>` ids; also used at Phase 1 to surface registry-occupying figures the artifact frontmatter names.
- `mcp__worldloom__find_sections_touched_by(cf_id)` — when Phase 2 needs to ground a CF against the section context where it was applied.

## Person Registry retrieval (Phase 1)

Existing characters and diegetic-artifact figures occupy niches even without a dedicated dossier — Phase 1's registry is constructed from:

- `mcp__worldloom__list_records(world_slug, record_type='character_record', include_full_body=true)` — enumerates dossier frontmatter and body sections for Phase 1 registry and Phase 2 essence extraction.
- `mcp__worldloom__list_records(world_slug, record_type='diegetic_artifact_record', include_full_body=true)` — enumerates artifact frontmatter (author / speaker / annotator / correspondent / scribe / censor / patron / copyist metadata). Bodies are read from the returned `body_sections` only when an authored persona is being profiled at Phase 2.
- `mcp__worldloom__list_records(world_slug, record_type='adjudication_record', include_full_body=true)` — enumerates accept-flavored PA frontmatter for any historically-salient figure canonized via `canon-addition`.

Missing `characters/` or `diegetic-artifacts/` directories are NOT abort conditions — they are valid empty-registry states. Phase 0's density rule applies character-sparse mode in that case.

## Primary-authored files (direct Read permitted)

These remain primary-authored at the world root and are read directly:

- `docs/FOUNDATIONS.md` — Rules 2 / 3 / 4 / 7 cited throughout Phases 2 / 5 / 7 / 10 / 15; Canon Layers at Phase 10; Ontology Categories at Phase 2 essence-profiling; Canon Fact Record Schema as the structural target Phase 10c consults.
- `worlds/<world-slug>/WORLD_KERNEL.md` — Phase 0 parameter validation; Phase 9 voice register calibration; Phase 11 thematic-freshness scoring; Phase 13 mosaic-zone diversification.
- `worlds/<world-slug>/ONTOLOGY.md` — Categories + Relation Types + Notes; Phase 2 essence profiles attach registry entries to ontology categories; Phase 7 capability classification per seed.

## Hybrid files (direct Read permitted at Pre-flight)

- `worlds/<world-slug>/character-proposals/INDEX.md` — quick scan of prior batch coverage; not load-bearing for allocation (the engine's `allocate_next_id` is authoritative).
- `worlds/<world-slug>/proposals/INDEX.md` — informational only: if pending canon-fact proposals exist, an NCP card's `canon_assumption_flags.implied_new_facts` may point to a pending `PR-<integer>` rather than recommend a duplicate.

## ID allocation

- Pre-flight: `mcp__worldloom__allocate_next_id(world_slug, 'NCB')` → `NCB-<integer>`. Single call.
- Phase 13 (after diversification settles): `mcp__worldloom__allocate_next_id(world_slug, 'NCP')` per slot-filling card, called in card order. `NCP-<integer>` IDs are bound to surviving cards before Phase 14 begins so the audit trail (Phase 10 sub-phases, Phase 10e repairs, Phase 15 tests) can reference them. Note: the allocator is idempotent in absence of disk writes — calling `allocate_next_id(world_slug, 'NCP')` N times before any card lands on disk returns the same next-id N times. Reserve NCP-<integer>s in card order (first call returns `NCP-N`; assign `NCP-N` to card 1, `NCP-(N+1)` to card 2, ..., `NCP-(N+M-1)` to card M); the disk writes at Phase 16 commit (cards written in card order) bump the counter for the next batch.

The allocator scans the indexed world state for the highest existing id of the requested class and returns the next. Drops at Phase 10e or Phase 16 leave permanent gaps — the next batch's allocator picks up at `highest_existing + 1`, never reusing a dropped id.

## Pre-flight inputs

- `parameters_path` contents (if provided) — direct `Read` once at Phase 0.
- `upstream_audit_path` contents (if provided via `parameters_path`) — direct `Read` once at Phase 0; cited records retrieved via `get_record` for Phase 5 negative-space-merge.

## Conditional load

`MAGIC_OR_TECH_SYSTEMS.md` is no longer a primary-authored file post-SPEC-13 — its content lives as `SEC-MTS-*` atomic records. If Phase 0 parameters or Phase 6 seed generation touch magical or technological capability, retrieve via `search_nodes(node_type='section', filters={file_class: 'magic-or-tech-systems'})` then `get_record` selectively.

## Abort conditions

Enforced by Pre-flight (canonical abort messages live in the thin SKILL.md):

- `worlds/<world-slug>/` missing → "World directory not found. Run `create-base-world` first, or supply a valid `world_slug`."
- `parameters_path` or `upstream_audit_path` provided but unreadable → abort naming the file.
- `mcp__worldloom__allocate_next_id` returns an error (e.g., world-index missing or stale; rebuild via `world-index build` before proceeding).
- Card-slug collision detected at Phase 16 (would-be `character-proposals/NCP-<integer>-<slug>.md` already exists) → abort; never overwrite.
- Missing `characters/` or `diegetic-artifacts/` directory → NOT an abort; treat as empty registry.
