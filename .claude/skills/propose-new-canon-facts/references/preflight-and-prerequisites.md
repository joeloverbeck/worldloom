# Pre-flight and World-State Prerequisites

Post-SPEC-13, world canon lives as atomic YAML records under `worlds/<slug>/_source/`. Skills do NOT bulk-read those subdirectories — Hook 2 redirects oversized `_source/` directory reads to MCP retrieval. The retrieval contract for this skill:

## Primary load: context packet

Pre-flight calls:

```
mcp__worldloom__get_context_packet(
  task_type='other',
  seed_nodes=[<diagnosis-anchor seeds>],
  token_budget=15000
)
```

`'other'` is the registered fallback in the TASK_TYPES enum (`canon_addition` | `character_generation` | `diegetic_artifact_generation` | `continuity_audit` | `other`); a `propose_new_canon_facts` task type is NOT registered, and adding it is out of scope for this skill rewrite. The `'other'` profile applies the default ranking weights — sufficient because this skill's reasoning is intentionally broad-domain (thinness scans target every world concern, not a single locality).

Per `docs/CONTEXT-PACKET-CONTRACT.md`, the packet returns Kernel concepts + invariants + relevant CFs + named-entity neighbors + section context for the seed-local domains. It is the entry point, not the whole load — Phases 1-7 expand on demand via record-addressed retrieval.

### Choosing seed_nodes

- If `parameters_path` declares an `upstream_audit_path`, derive seeds from records the audit cites (`AU-NNNN`'s findings list specific CF-NNNN / SEC-* / M-NNNN ids).
- If `parameters_path` declares `enrichment_types` or `taboo_areas` that name specific named entities (places, institutions, species), resolve them via `mcp__worldloom__find_named_entities(names)` and pass the resulting `ENT-NNNN` ids.
- If neither is specified (interview-driven), seed with a small set (3-5) of representative anchor nodes drawn from WORLD_KERNEL §Core Pressures — typically the institution / region / pressure-domain `ENT-NNNN` or `SEC-*` records named there.

## Targeted record retrieval (during diagnosis and reasoning)

When a phase needs a record beyond what the packet returned:

- `mcp__worldloom__get_record(record_id)` — single record by id (CF / CH / INV / M / OQ / ENT / SEC).
- `mcp__worldloom__search_nodes(node_type=..., filters=...)` — domain-filtered scans:
  - `node_type='section', filters={file_class: 'institutions'}` — Phase 1 thinness scan over institutional sections; analogously for `everyday-life`, `magic-or-tech-systems`, `geography`, `economy-and-resources`, `peoples-and-species`, `timeline`.
  - `node_type='canon_fact', filters={domain: ...}` — Phase 5 redundancy filter; Phase 7c distribution discipline lookups.
  - `node_type='mystery_record'` — Phase 7b firewall expansion when a seed implicates an M entry not in the packet.
- `mcp__worldloom__get_neighbors(node_id)` — relation graph around a resolved entity (regions / institutions / species).
- `mcp__worldloom__find_named_entities(names)` — resolve names from `parameters_path` or `upstream_audit_path` to `ENT-NNNN` ids.
- `mcp__worldloom__find_sections_touched_by(cf_id)` — when Phase 1 needs to ground a CF against the section context where it was applied.

## Primary-authored files (direct Read permitted)

These remain primary-authored at the world root and are read directly:

- `docs/FOUNDATIONS.md` — Rules 2 / 3 / 4 / 5 / 7 cited throughout Phases 5 / 7 / 8; Canon Layers at Phase 6; Canon Fact Record Schema as the structural target the proposal card shadows.
- `worlds/<world-slug>/WORLD_KERNEL.md` — Phase 1 diagnosis (tonal/genre contract for coherence filter); Phase 6 diversification (Core Pressures guide slot priorities); seed_nodes anchoring at Pre-flight.
- `worlds/<world-slug>/ONTOLOGY.md` — Categories + Relation Types + Notes; Phase 2 enrichment targeting (each enrichment category maps to ontology categories); Phase 7c capability classification.

## Hybrid files (direct Read permitted)

For Pre-flight allocation discipline:

- `worlds/<world-slug>/proposals/INDEX.md` — quick scan for prior batch coverage when interpreting `enrichment_types`. Optional read; not load-bearing for allocation (the engine's `allocate_next_id` is authoritative).

## ID allocation

- Pre-flight: `mcp__worldloom__allocate_next_id(world_slug, 'BATCH')` → `BATCH-NNNN`. Single call.
- Phase 6 (after diversification settles): `mcp__worldloom__allocate_next_id(world_slug, 'PR')` per slot-filling card, called in card order. `PR-NNNN` IDs are bound to surviving cards before Phase 7 begins so the audit trail (Phase 7 sub-phases, Phase 7e repairs, Phase 8 tests) can reference them.

The allocator scans the indexed world state for the highest existing id of the requested class and returns the next. Drops at Phase 7e or Phase 9 leave permanent gaps — the next batch's allocator picks up at `highest_existing + 1`, never reusing a dropped id.

## Pre-flight inputs

- `parameters_path` contents (if provided) — direct `Read` once at Phase 0.
- `upstream_audit_path` contents (if provided via `parameters_path`) — direct `Read` once at Phase 1; cited records retrieved via `get_record` for diagnosis grounding.

## Abort conditions

Enforced by Pre-flight (canonical abort messages live in the thin SKILL.md):

- `worlds/<world-slug>/` missing → "World directory not found. Run `create-base-world` first, or supply a valid `world_slug`."
- `parameters_path` or `upstream_audit_path` provided but unreadable → abort naming the file.
- `mcp__worldloom__allocate_next_id` returns an error (e.g., world-index missing or stale; rebuild via `world-index build` before proceeding).
- Card-slug collision detected at Phase 9 (would-be `proposals/PR-NNNN-<slug>.md` already exists) → abort; never overwrite.
