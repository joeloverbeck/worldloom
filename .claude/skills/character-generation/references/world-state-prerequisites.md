# World-State Prerequisites

Post-SPEC-13, world canon lives as atomic YAML records under `worlds/<slug>/_source/`. Skills do NOT bulk-read those subdirectories — Hook 2 redirects oversized `_source/` directory reads to MCP retrieval. The retrieval contract for this skill:

## Primary loads

### Context packet for seed-relevant state

Pre-flight calls:

```
mcp__worldloom__get_context_packet(
  task_type='character_generation',
  seed_nodes=[<brief-derived seed nodes>],
  token_budget=18000
)
```

Per `docs/CONTEXT-PACKET-CONTRACT.md`, the packet returns Kernel + seed-relevant CFs with full parsed `record` bodies + seed-touched priority SEC records (`EVERYDAY_LIFE`, `PEOPLES_AND_SPECIES`, `INSTITUTIONS`, `ECONOMY_AND_RESOURCES`, `GEOGRAPHY`) with full parsed `record` bodies + named-entity neighbors + section context, with completeness guarantees against silent truncation.

### Whole-class Phase 7 firewall loads

Per `docs/FOUNDATIONS.md` §Tooling Recommendation, whole-class enumeration is a legitimate primary loading pattern when a skill's Canon Safety Check tests every record of a class. This skill uses the same shape as `emergent-pressure-events` Phase 6: load Phase 7a with `mcp__worldloom__list_records(world_slug, record_type='invariant_record', include_full_body=true)` and load Phase 7b with `mcp__worldloom__list_records(world_slug, record_type='mystery_record', include_full_body=true)`. `mcp__worldloom__get_firewall_content(world_slug)` remains the equivalent M-only projection shortcut when the audit needs every M record regardless of seed locality but does not need full M bodies; use per-id `get_record('M-<integer>')` when `notes` or `modification_history` are load-bearing.

**`seed_nodes` accept canonical node ids only.** The valid forms are `entity:<slug>` for named entities (e.g., `entity:donostia`, `entity:basque-country`, `entity:gazteluFit`), bare record ids for atomic records (`CF-<integer>`, `M-<integer>`, `OQ-<integer>`, `SEC-XXX-<integer>`, `ENT-<integer>`), and bare invariant ids (`ONT-N` / `CAU-N` / `DIS-N` / `SOC-N` / `AES-N`). Display names are NOT accepted — a `seed_nodes=['<display-name>']` form returns `node_not_found: Node '<display-name>' does not exist.` because no graph node carries the bare display name as its id. **Resolve brief-derived display names BEFORE the first packet call** via `mcp__worldloom__find_named_entities(names)`, which returns canonical `entity:<slug>` ids in its `canonical_matches[]` plus region/era-descriptor `hints[]` for compound tokens that are not registered as standalone entities; pass the resolved canonical ids into `seed_nodes`. For region or era descriptors that surface only as hints (e.g., `Gros`, `Centro`, `Charter-Era integration`), prefer the hint's `matching_record_ids[]` as packet seeds and fetch full bodies with `get_record` when needed. Use `mcp__worldloom__search_nodes(world_slug, query='<descriptor>')` only when `matching_record_ids[]` is empty, absent, or capped below `record_count`.

## Context-packet-too-large fallback

The packet enforces `token_budget` and the serialized-response ceiling (`task_header.harness_ceiling_chars`, default 60000) with an envelope-overhead reserve (`task_header.envelope_overhead_reserve_chars`, default 4000) per `docs/CONTEXT-PACKET-CONTRACT.md` §Budget Enforcement. For `task_type='character_generation'`, `task_header.governing_full_body_priority` reserves governing-context invariant and Mystery Reserve full bodies before opportunistic layers; if those bodies cannot fit after lower-priority layers are dropped, the packet returns `packet_incomplete_required_classes` with `missing_classes: ['governing_world_context.full_body']` instead of silently downgrading Phase 7a/7b inputs. Under ordinary token-budget pressure the assembler drops layers in priority order (`impact_surfaces` → `scoped_local_context` → `exact_record_links` → `governing_world_context`) and reports dropped node ids in `response.truncation_summary`. Under serialized-response pressure it returns `task_header.delivery_status === 'persisted_with_summary'`, a small inline `governing_summary`, and `task_header.persisted_output_path` for structured slice recovery via `mcp__worldloom__get_persisted_packet_slice`.

This fallback covers the three cases the call shape surfaces:

- the packet returns `packet_incomplete_required_classes` because even `local_authority` cannot fit, or because the governing-context full bodies reserved for Phase 7a/7b cannot fit under the token or effective harness ceiling;
- the packet returns successfully but `truncation_summary.dropped_layers` is non-empty (expected for broad seeds in mature worlds, and recoverable through targeted retrieval);
- the packet returns `task_header.delivery_status === 'persisted_with_summary'` because the full packet exceeded the MCP transport inline limit and was package-persisted (common at the default budget for moderately-broad seed sets in mature worlds — does not necessarily signal an unusually broad seed set, an unusually rich authority record, or an overridden/lower harness ceiling; the fallback path of `governing_summary` + targeted `get_records` is the documented happy-path response when this fires, not an exceptional branch).

In any case, do NOT silently proceed without world-state load. Apply this two-step fallback in order:

**Step 1 — Reduce seed nodes and retry, or honor the suggested retry budget when present.** Narrow `seed_nodes` to the 3–5 most-cited records in the brief (the named CFs the brief explicitly references, the named place's SEC-GEO record, the named institution's SEC-INS record, the named species's SEC-PAS record). Retry the packet call. If `packet_incomplete_required_classes` was returned and `response.details.retry_with.token_budget` is present, retry at that budget. If `retry_with` is absent, the harness ceiling is binding; skip budget retry and follow `response.details.fallback_advice` through targeted retrieval in Step 2. If the retry fits with empty `truncation_summary` and inline return, proceed normally.

**Step 2 — Use inline summary + targeted retrieval, then slice the persisted packet only when needed.** If `truncation_summary.dropped_layers` is still non-empty after Step 1 (or `packet_incomplete_required_classes` still fires, or `delivery_status === 'persisted_with_summary'`):

- `Read docs/FOUNDATIONS.md` (Canon Layers + Rules + CF schema).
- `Read worlds/<world-slug>/WORLD_KERNEL.md`.
- `Read worlds/<world-slug>/ONTOLOGY.md`.
- If `delivery_status === 'persisted_with_summary'`, first use `governing_summary.active_rules`, `protected_surfaces`, `prohibited_moves`, `required_output_schema`, `open_risk_ids`, `invariant_ids`, and `seed_relevant_cf_ids` as the fast canon-safety scope. Retrieve specific bodies with `mcp__worldloom__get_records(record_ids=[...], world_slug=<slug>)`, field batches with `mcp__worldloom__get_records_field(record_ids=[...], field_path=[...], world_slug=<slug>)`, or structured packet slices with `mcp__worldloom__get_persisted_packet_slice(persisted_path=task_header.persisted_output_path, slice_path='<path>')`.
- For every known set of node ids under `truncation_summary.dropped_node_ids_by_layer`, call `mcp__worldloom__get_records(record_ids=[...], world_slug=<slug>)` for full bodies, `mcp__worldloom__get_records_field(record_ids=[...], field_path=[...], world_slug=<slug>)` when the same field is needed across many atomic records, or `mcp__worldloom__get_record_field(record_id, field_path)` when only one field on one record is needed — the packet listed exactly what to fetch. Hook 2 redirects bulk `_source/<subdir>/` reads but targeted record retrieval is the supported path.
- For each additional known set of CF / M / INV records cited at Phase 5 / 7a / 7b that did not appear in `truncation_summary` (i.e. was never in the packet at any layer), call `mcp__worldloom__get_records(record_ids=[...], world_slug=<slug>)`; use singular `get_record` only when the next id depends on reading the prior result.
- For Phase 7a invariant conformance, retrieve every INV record across all five categories via `mcp__worldloom__list_records(world_slug, record_type='invariant_record', include_full_body=true)`. Use `search_nodes(node_type='invariant_record')` only for targeted INV-id discovery.
- For Phase 7b Mystery Reserve firewall, retrieve every M-<integer> record via `mcp__worldloom__list_records(world_slug, record_type='mystery_record', include_full_body=true)` or the equivalent M-only projection shortcut `mcp__worldloom__get_firewall_content(world_slug)`; use `mcp__worldloom__get_record('M-<integer>')` only when full M-record context is needed beyond the firewall projection.
- **Legacy fallback only:** use subagent extraction of the persisted file only when `governing_summary` plus `get_records` and `get_persisted_packet_slice` cannot express the needed recovery slice. Do not inline the raw packet body into the main conversation.

**Audit-trail discipline.** When the fallback fires, record in the dossier's frontmatter `notes` under a *"Context-packet fallback"* line which step(s) executed (e.g., *"Context-packet fallback: Step 2 fired — packet returned persisted_with_summary; governing_summary plus batched `get_records` recovered Phase 5 / 7b / 7c coverage"*). If legacy subagent extraction was needed, mention it explicitly. The fallback preserves Phase 7 firewall completeness because the eventual list of MR-ids checked still derives from the world's full M-record set (via targeted retrieval, `get_firewall_content`, `get_persisted_packet_slice`, or `search_nodes`), not from the packet alone.

Seed nodes are derived from the brief: Phase 0 inputs that name a region, settlement, institution, profession, species, or capability domain. For thinly-specified briefs (interview-driven), seed with the world overview node and the highest-domain Kernel concept.

## Targeted record retrieval (during reasoning)

When a phase needs a specific record beyond what the packet returned:

- `mcp__worldloom__get_record(record_id)` — single record by id (CF / CH / INV / M / OQ / ENT / SEC).
- `mcp__worldloom__get_records(record_ids, world_slug?)` — known-id batch retrieval; prefer when a phase already has multiple CF / M / INV / SEC / hybrid ids to fetch.
- `mcp__worldloom__get_records_field(record_ids, field_path, world_slug?)` — known-id batch field projection for parsed atomic records; prefer when a phase needs the same small field across many CF / M / INV / SEC ids, such as Phase 7c distribution checks with `field_path=['distribution', 'who_can_do_it']`.
- `mcp__worldloom__get_persisted_packet_slice(persisted_path, slice_path)` — structured recovery from a `persisted_with_summary` packet when a specific persisted packet slice is needed.
- `mcp__worldloom__list_records(world_slug, record_type='invariant_record', include_full_body=true)` — whole-class Phase 7a primary load; returns every INV full body in one call.
- `mcp__worldloom__list_records(world_slug, record_type='mystery_record', include_full_body=true)` — whole-class Phase 7b primary load; returns every M full body in one call.
- `mcp__worldloom__get_firewall_content(world_slug)` — M-only Phase 7b projection shortcut when full M bodies are not needed.
- `mcp__worldloom__search_nodes(node_type=..., filters=...)` — domain-filtered scans, e.g., capability CFs whose distribution touches the character's social position.
- `mcp__worldloom__get_neighbors(node_id)` — pull the relation graph around a resolved entity (regions / institutions / species).
- `mcp__worldloom__find_named_entities(names)` — resolve current_location / place_of_origin / institution names from the brief to `ENT-<integer>` ids.
- `mcp__worldloom__find_sections_touched_by(cf_id)` — when Phase 5 needs to ground a capability against the section context where its CF lives.

## Primary-authored files (direct Read permitted)

These remain primary-authored at the world root and are read directly:

- `docs/FOUNDATIONS.md` — Rule 2 at Phases 1/2/5; Rule 3 at Phase 5; Rule 4 at Phase 7c; Rule 7 at Phase 7b; Canon Layers at Phase 7; Ontology Categories at Phase 5.
- `worlds/<world-slug>/WORLD_KERNEL.md` — genre / tonal / chronotope contract (Phase 0 input validation against world identity; Phase 6 voice register calibration).
- `worlds/<world-slug>/ONTOLOGY.md` — Categories + Relation Types + Notes; Phase 5 capability classification.

## Hybrid files

For continuity-preservation reads at Pre-flight:

- `worlds/<world-slug>/characters/<existing-slug>.md` — retrieve any existing dossier whose contents constrain the new character via `mcp__worldloom__get_record('CHAR-<integer>')` (returns parsed frontmatter + body sections); use `get_record('CHAR-<integer>', section_path='frontmatter.notes')` or `section_path='body.Canon Safety Check Trace'` for narrow projection. **The CHAR-<integer> id must be obtained first** via the slug-to-CHAR-id resolution recipe in `SKILL.md` §Pre-flight (Continuity-preservation read) — `find_named_entities` returns `entity:<slug>` ids only, not CHAR-<integer> ids, so a separate `list_records(world_slug, record_type='character_record', include_full_body=true)` enumeration or per-dossier `Read worlds/<slug>/characters/<existing-slug>.md` with `limit=10` for the `character_id:` frontmatter line is needed to bridge the slug→CHAR-id gap; do NOT guess from alphabetical INDEX.md ordering (IDs are by allocation order, not slug order). Fallback: direct `Read` of the dossier file for pre-CORRIDOR-004 worlds where hybrid-record retrieval is unavailable; established protagonist-tier dossiers commonly cross the Read tool's token limit (the Read tool caps file content at ~25,000 tokens; protagonist-tier dossiers like Marla Kern in `erotica-world` run 80KB+ and refuse to load via direct `Read`), which `get_record` projection avoids.
- `worlds/<world-slug>/characters/INDEX.md` — direct Read; quick scan for slug references when resolving "are any existing characters mentioned in this brief?"

## Phase-to-record mapping

| Phase | Records consulted | Retrieval surface |
|-------|-------------------|-------------------|
| Pre-flight | CHAR-<integer> allocation | `allocate_next_id(world_slug, 'CHAR')` |
| Phase 0 | ENT (current_location, place_of_origin); SEC-GEO; SEC-PAS (species cluster); SEC-INS (profession institution) | `find_named_entities` + `get_neighbors` |
| Phase 1 | SEC-GEO (terrain / climate / hazards); SEC-PAS (embodiment); SEC-ELF (class diet / housing / injuries / vocabulary); SEC-ECR (possessions / scarcity); SEC-INS (legal / material access) | packet full `record` bodies for seed-touched priority SECs + `get_record` for deeper non-seed sections |
| Phase 2 | SEC-INS (every institutional axis: family / law / religion / employer / military / debt / taboo / literacy / inheritance) | packet full `record` bodies for seed-touched priority SECs + `search_nodes(node_type='section', filters={file_class: 'INSTITUTIONS'})` |
| Phase 3 | M-<integer> (Mystery Reserve `what is unknown` overlap); OQ-<integer> (deliberately undecided questions); SEC-INS (ideological environment); SEC-ELF (common beliefs, vocabulary) | packet + `search_nodes` |
| Phase 4 | WORLD_KERNEL §Core Pressures; SEC-* identifying `major_local_pressures` | direct Read + packet |
| Phase 5 | capability CFs (each capability's `who_can_do_it` distribution); SEC-PAS (embodiment); SEC-GEO (regional effects); SEC-MTS (loaded selectively if magic/tech capabilities present) | packet full `record` bodies for seed-relevant CFs + `search_nodes(node_type='canon_fact_record', filters={domain: ...})` and `get_records` for deeper known-set non-seed CFs |
| Phase 6 | SEC-ELF (language patterns by class/region/religion); SEC-PAS (senses); SEC-INS (taboo system) | packet full `record` bodies for seed-touched priority SECs + `get_record` for deeper non-seed sections |
| Phase 7a | every INV record (ONT-N / CAU-N / DIS-N / SOC-N / AES-N) | `list_records(record_type='invariant_record', include_full_body=true)` |
| Phase 7b | every M-<integer> record (firewall) | `list_records(record_type='mystery_record', include_full_body=true)` or `get_firewall_content(world_slug)` for the M-only projection shortcut; per-id `get_record('M-<integer>')` when `notes` / `modification_history` are load-bearing |
| Phase 7c | matching capability CFs from Phase 5 | (already retrieved at Phase 5) |

## Selectively loaded

`worlds/<world-slug>/_source/magic-or-tech-systems/SEC-MTS-<integer>.yaml` records load via `search_nodes(node_type='section', filters={file_class: 'MAGIC_OR_TECH_SYSTEMS'})` only if Phase 0 detects the brief's inputs or generated capabilities touch a magical or technological system named in `ONTOLOGY.md` magic-practice / technology categories or a capability CF. Skipped otherwise to avoid context bloat on ordinary-laborer characters.

## Pre-flight reads

- `worlds/<world-slug>/characters/` directory listing — for slug-collision check against the derived `<char-slug>`. The CHAR-<integer> allocation runs through `allocate_next_id`, NOT a directory grep.
- `character_brief_path` contents (if provided) — direct Read once at Phase 0.

## Abort conditions

Enforced by Pre-flight (canonical abort messages live in the thin SKILL.md):

- `worlds/<world-slug>/` missing
- `worlds/<world-slug>/characters/<char-slug>.md` already exists (slug collision; this skill never overwrites a dossier — the engine's `file_already_exists` check is the second backstop)
- `mcp__worldloom__allocate_next_id` returns an error (e.g., world-index missing or stale; refresh via `world-index sync` before proceeding, or `world-index build` for a full rebuild if the index is corrupt rather than merely stale)
