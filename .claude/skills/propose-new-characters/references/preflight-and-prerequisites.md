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

`propose_new_characters` is registered in the TASK_TYPES enum by MCPENH-002. Its ranking profile prioritizes character/person-registry-adjacent records, named-entity neighbors, invariants, Mystery Reserve entries, and local section context while preserving broad reasoning across institutions, peoples-and-species, everyday-life, geography, and timeline domains.

Per `docs/CONTEXT-PACKET-CONTRACT.md`, the packet returns Kernel concepts + invariants + relevant CFs + named-entity neighbors + section context for the seed-local domains. It is the entry point, not the whole load — Phases 1–11 expand on demand via record-addressed retrieval.

### Choosing seed_nodes

- If `parameters_path` declares an `upstream_audit_path`, derive seeds from records the audit cites (`AU-NNNN`'s findings list specific CF / SEC / M / ENT ids).
- If `parameters_path` declares `under_modeled_priority` or `target_domains` that name specific named entities (institutions, regions, species), resolve them via `mcp__worldloom__find_named_entities(names)` and pass the resulting `ENT-NNNN` ids.
- If neither is specified (interview-driven), seed with a small set (3–6) of representative anchor nodes drawn from WORLD_KERNEL §Core Pressures plus the institutions / regions / species named there as `ENT-NNNN` or `SEC-*` records.

## Targeted record retrieval (during reasoning)

When a phase needs records beyond what the packet returned:

- `mcp__worldloom__get_record(record_id)` — single record by id (CF / CH / INV / M / OQ / ENT / SEC).
- `mcp__worldloom__search_nodes(node_type=..., filters=...)` — domain-filtered scans:
  - `node_type='section', filters={file_class: 'institutions'}` — Phase 5 institutions-without-insiders/dissenters/enforcers; analogously for `everyday-life`, `geography`, `economy-and-resources`, `peoples-and-species`, `timeline`.
  - `node_type='canon_fact', filters={domain: ...}` — Phase 10c distribution discipline lookups (capability CFs whose `who_can_do_it` / `who_cannot_easily_do_it` blocks bear on the seeds under consideration).
  - `node_type='mystery_record'` — Phase 10b firewall expansion when a seed implicates an M entry not in the packet.
  - `node_type='invariant'` — Phase 10a expansion when the packet did not surface an invariant the seed implicates.
- `mcp__worldloom__get_neighbors(node_id)` — relation graph around a resolved entity (regions / institutions / species / characters).
- `mcp__worldloom__find_named_entities(names)` — resolve names from `parameters_path` or `upstream_audit_path` to `ENT-NNNN` ids; also used at Phase 1 to surface registry-occupying figures the artifact frontmatter names.
- `mcp__worldloom__find_sections_touched_by(cf_id)` — when Phase 2 needs to ground a CF against the section context where it was applied.

## Person Registry retrieval (Phase 1)

Existing characters and diegetic-artifact figures occupy niches even without a dedicated dossier — Phase 1's registry is constructed from:

- `worlds/<world-slug>/characters/INDEX.md` — direct `Read` to enumerate dossier slugs. Hybrid-file path; permitted by Hook 3's hybrid-file allowlist.
- `worlds/<world-slug>/characters/<char-slug>.md` — direct `Read` per dossier (frontmatter + body sections); hybrid-file path. Phase 2 essence extraction reads body sections selectively (typically Institutional Embedding + Voice and Perception + Capabilities + Epistemic Position; other sections only on demand).
- `worlds/<world-slug>/diegetic-artifacts/INDEX.md` — direct `Read`.
- `worlds/<world-slug>/diegetic-artifacts/<da-slug>.md` — direct `Read` for frontmatter (author / speaker / annotator / correspondent / scribe / censor / patron / copyist metadata). Bodies are read only when an authored persona is being profiled at Phase 2.
- `worlds/<world-slug>/adjudications/PA-NNNN-accept*.md` — direct `Read` for any historically-salient figure canonized via `canon-addition`.

Missing `characters/` or `diegetic-artifacts/` directories are NOT abort conditions — they are valid empty-registry states. Phase 0's density rule applies character-sparse mode in that case.

## Primary-authored files (direct Read permitted)

These remain primary-authored at the world root and are read directly:

- `docs/FOUNDATIONS.md` — Rules 2 / 3 / 4 / 7 cited throughout Phases 2 / 5 / 7 / 10 / 15; Canon Layers at Phase 10; Ontology Categories at Phase 2 essence-profiling; Canon Fact Record Schema as the structural target Phase 10c consults.
- `worlds/<world-slug>/WORLD_KERNEL.md` — Phase 0 parameter validation; Phase 9 voice register calibration; Phase 11 thematic-freshness scoring; Phase 13 mosaic-zone diversification.
- `worlds/<world-slug>/ONTOLOGY.md` — Categories + Relation Types + Notes; Phase 2 essence profiles attach registry entries to ontology categories; Phase 7 capability classification per seed.

## Hybrid files (direct Read permitted at Pre-flight)

- `worlds/<world-slug>/character-proposals/INDEX.md` — quick scan of prior batch coverage; not load-bearing for allocation (the engine's `allocate_next_id` is authoritative).
- `worlds/<world-slug>/proposals/INDEX.md` — informational only: if pending canon-fact proposals exist, an NCP card's `canon_assumption_flags.implied_new_facts` may point to a pending `PR-NNNN` rather than recommend a duplicate.

## ID allocation

- Pre-flight: `mcp__worldloom__allocate_next_id(world_slug, 'NCB')` → `NCB-NNNN`. Single call.
- Phase 13 (after diversification settles): `mcp__worldloom__allocate_next_id(world_slug, 'NCP')` per slot-filling card, called in card order. `NCP-NNNN` IDs are bound to surviving cards before Phase 14 begins so the audit trail (Phase 10 sub-phases, Phase 10e repairs, Phase 15 tests) can reference them.

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
- Card-slug collision detected at Phase 16 (would-be `character-proposals/NCP-NNNN-<slug>.md` already exists) → abort; never overwrite.
- Missing `characters/` or `diegetic-artifacts/` directory → NOT an abort; treat as empty registry.
