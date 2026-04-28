# World-State Prerequisites

Post-SPEC-13, world canon lives as atomic YAML records under `worlds/<slug>/_source/`. Skills do NOT bulk-read those subdirectories — Hook 2 redirects oversized `_source/` directory reads to MCP retrieval. The retrieval contract for this skill:

## Primary load: context packet

Pre-flight calls:

```
mcp__worldloom__get_context_packet(
  task_type='diegetic_artifact_generation',
  seed_nodes=[<brief-derived seed nodes>],
  token_budget=10000
)
```

Per `docs/CONTEXT-PACKET-CONTRACT.md`, the packet returns Kernel + invariants (every INV record across all five categories) + relevant CFs + Mystery Reserve entries touching the artifact's claim domain + named-entity neighbors + section context, with completeness guarantees against silent truncation.

Seed nodes are derived from the brief: Phase 0 inputs that name a region, settlement, institution, profession, audience stratum, species cluster, era / TIMELINE layer, or capability domain referenced by the artifact's `desired_relation_to_truth` and `communicative_purpose`. For thinly-specified briefs (interview-driven), seed with the world overview node and the highest-domain Kernel concept.

## Context-packet-too-large fallback

The packet now enforces `token_budget` strictly per `docs/CONTEXT-PACKET-CONTRACT.md` §Budget Enforcement: under budget pressure the assembler drops layers in priority order (`impact_surfaces` → `scoped_local_context` → `exact_record_links` → `governing_world_context`) and reports the dropped layers in `response.truncation_summary` so the consumer can fetch the dropped node-ids via `mcp__worldloom__get_record` / `mcp__worldloom__get_record_field` rather than via overflow-to-file.

This fallback covers the two cases the new contract surfaces:

- the packet returns successfully but `truncation_summary.dropped_layers` is non-empty (the common case for mature worlds at default budget);
- the packet returns `packet_incomplete_required_classes` because even `local_authority` cannot fit (the rare case — typically a malformed seed or an unusually large authority-bearing record).

In either case, do NOT silently proceed without world-state load. Apply this three-step fallback in order:

**Step 1 — Reduce seed nodes and retry, or honor the suggested retry budget.** Narrow `seed_nodes` to the 3–5 most-cited records in the brief (the named CFs the brief explicitly references, the named place's SEC-GEO record, the named institution's SEC-INS record). Retry the packet call. If `packet_incomplete_required_classes` was returned, retry at `response.details.retry_with.token_budget`. If the retry fits with empty `truncation_summary`, proceed normally.

**Step 2 — Direct-Read root files + per-record retrieval for dropped layers.** If `truncation_summary.dropped_layers` is still non-empty after Step 1 (or `packet_incomplete_required_classes` still fires):

- `Read docs/FOUNDATIONS.md` (Canon Layers + Rules + CF schema).
- `Read worlds/<world-slug>/WORLD_KERNEL.md`.
- `Read worlds/<world-slug>/ONTOLOGY.md`.
- For every node-id under `truncation_summary.dropped_node_ids_by_layer`, call `mcp__worldloom__get_record(record_id)` (full body) or `mcp__worldloom__get_record_field(record_id, field_path)` (single field) — the packet listed exactly what to fetch. Hook 2 redirects bulk `_source/<subdir>/` reads but per-record `get_record` is the supported per-record path.
- For each additional CF / M / INV record cited at Phase 3 / 7a / 7b that did not appear in `truncation_summary` (i.e. was never in the packet at any layer), call `mcp__worldloom__get_record(record_id)` individually.
- For Phase 7a invariant conformance, retrieve every INV record across all five categories via `mcp__worldloom__search_nodes(node_type='invariant_record')` if `governing_world_context` was the dropped layer.
- For Phase 7b Mystery Reserve firewall, retrieve every M-NNNN record via `mcp__worldloom__search_nodes(node_type='mystery_record')` if `governing_world_context` was the dropped layer.

**Step 3 — Dossier-trace shortcut (when `character_path` is provided).** The dossier's own canon-safety check trace is an authoritative shortcut for Phase 7 firewall coverage. The dossier was pre-cleared against the same world-state at its generation time; its enumerated trace fields carry forward to the artifact's Phase 7 trace as canonical firewall coverage:

- `world_consistency.invariants_respected` → enumerates every INV record tested at the dossier's Phase 7a; the artifact's Phase 7a tests the same set against the artifact's claim surface.
- `world_consistency.mystery_reserve_firewall` → enumerates every M-NNNN checked at the dossier's Phase 7b; the artifact's Phase 7b checks the same set against the artifact's claim surface.
- `world_consistency.canon_facts_consulted` → enumerates every CF cited; the artifact's Phase 7c may cross-reference these CFs without re-retrieving each one (their distribution blocks are already canonical at dossier generation time).

The dossier-trace shortcut is canon-safe because dossier records are append-only and the world-state reconciliation between dossier-generation-time and artifact-generation-time is bounded to canon mutations recorded in the change log. If the artifact-date significantly precedes or postdates the dossier's generation date AND substantive canon mutations have landed in between, retrieve those mutations explicitly via `mcp__worldloom__list_records(record_type='change_log_entry')` filtered to the relevant interval.

**Audit-trail discipline.** When the fallback fires, record in frontmatter `notes` under a *"Context-packet fallback"* line which step(s) executed (e.g., *"Context-packet fallback: Step 2 fired — packet exceeded inline at minimum seed scope; loaded WORLD_KERNEL.md + ONTOLOGY.md + per-record `get_record` for the cited CF / M / INV ids; dossier-trace shortcut Step 3 covered Phase 7 firewall coverage from CHAR-NNNN.world_consistency"*). The fallback preserves Phase 7 firewall completeness because the eventual list of MR-ids checked still derives from the world's full M-record set (via dossier trace, per-record retrieval, or `search_nodes`), not from the packet alone.

## Targeted record retrieval (during reasoning)

When a phase needs a specific record beyond what the packet returned:

- `mcp__worldloom__get_record(record_id)` — single record by id (CF / CH / INV / M / OQ / ENT / SEC).
- `mcp__worldloom__search_nodes(node_type=..., filters=...)` — domain-filtered scans, e.g., capability CFs whose distribution touches the author's social position; SEC-INS axes the artifact must respect.
- `mcp__worldloom__get_neighbors(node_id)` — pull the relation graph around a resolved entity (regions / institutions / species).
- `mcp__worldloom__find_named_entities(names)` — resolve the brief's place / institution / audience / character names to `ENT-NNNN` ids.
- `mcp__worldloom__find_sections_touched_by(cf_id)` — when Phase 7c needs to ground a world-fact claim's distribution against the section context where its CF lives.

## Primary-authored files (direct Read permitted)

These remain primary-authored at the world root and are read directly:

- `docs/FOUNDATIONS.md` — Canon Layers at Phase 3 claim-status tagging; Rule 2 at Phase 4 texture; Rule 4 at Phase 7c; Rule 7 at Phases 1, 3, 7b; Canon Fact Record schema at Phase 3 canon_status binding.
- `worlds/<world-slug>/WORLD_KERNEL.md` — Phase 2 genre-convention calibration against world tonal contract; Phase 6 voice register; Phase 7e truth-discipline.
- `worlds/<world-slug>/ONTOLOGY.md` — Categories + Relation Types + Notes; Phase 3 claim classification; Phase 7a invariant-type mapping.

## Hybrid files (direct Read permitted)

For Author-lift and continuity reads:

- `worlds/<world-slug>/characters/<char-slug>.md` — when `character_path` is provided, read frontmatter + prose body to lift the 15-field author profile per Phase 0b. If the dossier exceeds the Read tool's token limit, apply selective-read by structural anchors (`^## `, `^### `, `^character_id:`, `^## Epistemic Position`, `^## Voice and Perception`, `^## Institutional Embedding`) — established protagonist-tier dossiers commonly cross the limit and selective reading is the expected mode.
- `worlds/<world-slug>/characters/INDEX.md` — quick scan for slug references when the brief mentions an existing character.
- `worlds/<world-slug>/diegetic-artifacts/INDEX.md` — read at Phase 9 to maintain alphabetic ordering on update.

## Phase-to-record mapping

| Phase | Records consulted | Retrieval surface |
|-------|-------------------|-------------------|
| Pre-flight | DA-NNNN allocation | `allocate_next_id(world_slug, 'DA')` |
| Phase 0 | ENT (place, audience, named institutions); SEC-GEO (place); SEC-INS (audience stratum, author institutional embedding); SEC-PAS (author species cluster); SEC-TML (date / era anchor); SEC-ECR (author livelihood) | `find_named_entities` + `get_neighbors` + packet |
| Phase 1 | M-NNNN (Mystery Reserve `what is unknown` for `never_know`); OQ-NNNN (deliberately undecided); SEC-INS (ideological environment, taboo system); SEC-ELF (common beliefs, vocabulary); CF (capability and world-fact CFs the author may know firsthand or by rumor) | packet + `search_nodes` |
| Phase 2 | SEC-INS (institutional producers of this artifact_type); SEC-ELF (conventional form practices); WORLD_KERNEL (tonal register) | packet + direct Read |
| Phase 3 | CF (every claim with `canon_status: canonically_true` or `partially_true` cites a CF-id); M-NNNN (every claim with `canon_status: mystery_adjacent` cites an MR-id); ONTOLOGY categories | packet + `get_record` |
| Phase 4 | SEC-GEO (local measurements, terrain, calendrical markers); SEC-ECR (currency, weight, scarcity diction); SEC-ELF (food, tools, class diction, honorifics, body metaphors); SEC-INS (ritual gestures, legal phrases); SEC-PAS (species-inflected metaphor, embodiment) | packet + `search_nodes(node_type='section')` |
| Phase 5 | SEC-INS (institution the author must flatter or fear); WORLD_KERNEL §Core Pressures (audience-shaped pressures) | packet + direct Read |
| Phase 6 | (composition phase — no new retrieval; uses Phases 1-5 outputs) | — |
| Phase 7a | every INV record (ONT-N / CAU-N / DIS-N / SOC-N / AES-N) | packet (invariants always loaded by the `diegetic_artifact_generation` profile) |
| Phase 7b | every M-NNNN record (firewall) | packet + `search_nodes(node_type='mystery_record')` if any are missing |
| Phase 7c | capability CFs cited at Phase 5 + world-fact CFs cited at Phase 3 | (already retrieved) + `get_record` for any not yet loaded |
| Phase 7d | SEC-* records the artifact body draws on (no-silent-canon-creation check); CAU-3-style restricted vocabulary CFs (no-restricted-knowledge-leakage check) | (already retrieved) + `search_nodes` if a referenced entity was not yet resolved |

## Selectively loaded

`worlds/<world-slug>/_source/magic-or-tech-systems/SEC-MTS-NNN.yaml` records load via `search_nodes(node_type='section', filters={file_class: 'magic-or-tech-systems'})` only when Phase 0 detects that the brief's `artifact_type` is magic-or-tech-adjacent (grimoire fragment, relic manual, alchemical treatise, ward-inscription commentary, technical specification), the author's profession or institution touches a magical or technological system, the audience does, or Phase 3 claim-selection produces claims in those domains. Skipped otherwise to avoid context bloat on ordinary-register artifacts.

## Pre-flight reads

- `worlds/<world-slug>/diegetic-artifacts/` directory listing — for slug-collision check against the derived `<da-slug>`. The DA-NNNN allocation runs through `allocate_next_id`, NOT a directory grep.
- `brief_path` contents — direct Read once at Phase 0.
- `character_path` contents (if provided) — direct Read once at Phase 0. Path must resolve inside `worlds/<world-slug>/characters/`; cross-world or out-of-tree paths are rejected.

## Abort conditions

Enforced by Pre-flight (canonical abort messages live in the thin SKILL.md):

- `worlds/<world-slug>/` missing → run `create-base-world` first.
- `brief_path` missing or unreadable → abort naming the path.
- `character_path` provided but outside `worlds/<world-slug>/characters/` → cross-world author references are rejected.
- `character_path` provided but target dossier does not exist → abort naming the path.
- `worlds/<world-slug>/diegetic-artifacts/<da-slug>.md` already exists → slug collision; this skill never overwrites an artifact (the engine's `file_already_exists` check is the second backstop).
- `mcp__worldloom__allocate_next_id` returns an error (e.g., world-index missing or stale; rebuild via `world-index build` before proceeding).
