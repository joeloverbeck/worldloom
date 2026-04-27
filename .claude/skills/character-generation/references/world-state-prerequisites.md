# World-State Prerequisites

Post-SPEC-13, world canon lives as atomic YAML records under `worlds/<slug>/_source/`. Skills do NOT bulk-read those subdirectories — Hook 2 redirects oversized `_source/` directory reads to MCP retrieval. The retrieval contract for this skill:

## Primary load: context packet

Pre-flight calls:

```
mcp__worldloom__get_context_packet(
  task_type='character_generation',
  seed_nodes=[<brief-derived seed nodes>],
  token_budget=16000
)
```

Per `docs/CONTEXT-PACKET-CONTRACT.md`, the packet returns Kernel + invariants (every INV record across all five categories, with full parsed `record` bodies) + relevant CFs + all Mystery Reserve records' Phase 7b firewall fields + named-entity neighbors + section context, with completeness guarantees against silent truncation.

If the packet returns `packet_incomplete_required_classes`, retry with `token_budget` set to the response's `minimum_required_budget` field. The default above is calibrated for a typical call shape against a mature world; unusually large seed sets may exceed it.

Seed nodes are derived from the brief: Phase 0 inputs that name a region, settlement, institution, profession, species, or capability domain. For thinly-specified briefs (interview-driven), seed with the world overview node and the highest-domain Kernel concept.

## Targeted record retrieval (during reasoning)

When a phase needs a specific record beyond what the packet returned:

- `mcp__worldloom__get_record(record_id)` — single record by id (CF / CH / INV / M / OQ / ENT / SEC).
- `mcp__worldloom__search_nodes(node_type=..., filters=...)` — domain-filtered scans, e.g., capability CFs whose distribution touches the character's social position.
- `mcp__worldloom__get_neighbors(node_id)` — pull the relation graph around a resolved entity (regions / institutions / species).
- `mcp__worldloom__find_named_entities(names)` — resolve current_location / place_of_origin / institution names from the brief to `ENT-NNNN` ids.
- `mcp__worldloom__find_sections_touched_by(cf_id)` — when Phase 5 needs to ground a capability against the section context where its CF lives.

## Primary-authored files (direct Read permitted)

These remain primary-authored at the world root and are read directly:

- `docs/FOUNDATIONS.md` — Rule 2 at Phases 1/2/5; Rule 3 at Phase 5; Rule 4 at Phase 7c; Rule 7 at Phase 7b; Canon Layers at Phase 7; Ontology Categories at Phase 5.
- `worlds/<world-slug>/WORLD_KERNEL.md` — genre / tonal / chronotope contract (Phase 0 input validation against world identity; Phase 6 voice register calibration).
- `worlds/<world-slug>/ONTOLOGY.md` — Categories + Relation Types + Notes; Phase 5 capability classification.

## Hybrid files (direct Read permitted)

For continuity-preservation reads at Pre-flight:

- `worlds/<world-slug>/characters/<existing-slug>.md` — read frontmatter + `notes` block of any existing dossier whose contents constrain the new character (per the Pre-flight continuity-preservation step).
- `worlds/<world-slug>/characters/INDEX.md` — quick scan for slug references when resolving "are any existing characters mentioned in this brief?"

## Phase-to-record mapping

| Phase | Records consulted | Retrieval surface |
|-------|-------------------|-------------------|
| Pre-flight | CHAR-NNNN allocation | `allocate_next_id(world_slug, 'CHAR')` |
| Phase 0 | ENT (current_location, place_of_origin); SEC-GEO; SEC-PAS (species cluster); SEC-INS (profession institution) | `find_named_entities` + `get_neighbors` |
| Phase 1 | SEC-GEO (terrain / climate / hazards); SEC-PAS (embodiment); SEC-ELF (class diet / housing / injuries / vocabulary); SEC-ECR (possessions / scarcity); SEC-INS (legal / material access) | packet + `get_record` |
| Phase 2 | SEC-INS (every institutional axis: family / law / religion / employer / military / debt / taboo / literacy / inheritance) | packet + `search_nodes(node_type='section', filters={file_class: 'institutions'})` |
| Phase 3 | M-NNNN (Mystery Reserve `what is unknown` overlap); OQ-NNNN (deliberately undecided questions); SEC-INS (ideological environment); SEC-ELF (common beliefs, vocabulary) | packet + `search_nodes` |
| Phase 4 | WORLD_KERNEL §Core Pressures; SEC-* identifying `major_local_pressures` | direct Read + packet |
| Phase 5 | capability CFs (each capability's `who_can_do_it` distribution); SEC-PAS (embodiment); SEC-GEO (regional effects); SEC-MTS (loaded selectively if magic/tech capabilities present) | `search_nodes(node_type='canon_fact', filters={domain: ...})` + `get_record` |
| Phase 6 | SEC-ELF (language patterns by class/region/religion); SEC-PAS (senses); SEC-INS (taboo system) | packet + `get_record` |
| Phase 7a | every INV record (ONT-N / CAU-N / DIS-N / SOC-N / AES-N) | packet (invariants are always loaded by the `character_generation` profile) |
| Phase 7b | every M-NNNN record (firewall) | packet (all M-record firewall fields are always loaded by the `character_generation` profile) |
| Phase 7c | matching capability CFs from Phase 5 | (already retrieved at Phase 5) |

## Selectively loaded

`worlds/<world-slug>/_source/magic-or-tech-systems/SEC-MTS-NNN.yaml` records load via `search_nodes(node_type='section', filters={file_class: 'magic-or-tech-systems'})` only if Phase 0 detects the brief's inputs or generated capabilities touch a magical or technological system named in `ONTOLOGY.md` magic-practice / technology categories or a capability CF. Skipped otherwise to avoid context bloat on ordinary-laborer characters.

## Pre-flight reads

- `worlds/<world-slug>/characters/` directory listing — for slug-collision check against the derived `<char-slug>`. The CHAR-NNNN allocation runs through `allocate_next_id`, NOT a directory grep.
- `character_brief_path` contents (if provided) — direct Read once at Phase 0.

## Abort conditions

Enforced by Pre-flight (canonical abort messages live in the thin SKILL.md):

- `worlds/<world-slug>/` missing
- `worlds/<world-slug>/characters/<char-slug>.md` already exists (slug collision; this skill never overwrites a dossier — the engine's `file_already_exists` check is the second backstop)
- `mcp__worldloom__allocate_next_id` returns an error (e.g., world-index missing or stale; rebuild via `world-index build` before proceeding)
