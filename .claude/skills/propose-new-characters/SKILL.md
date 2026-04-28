---
name: propose-new-characters
description: "Use when generating candidate character proposals for an existing worldloom world — option-card batches covering open niches, negative-space diagnoses, institutional lenses, artifact-author candidates, and mosaic mirrors. Each card is directly consumable as character-generation's character_brief_path while preserving a richer essence/niche/voice audit trail in the card body. Produces: NCP-NNNN-<slug>.md cards at worlds/<world-slug>/character-proposals/ + NCB-NNNN.md batch manifest at worlds/<world-slug>/character-proposals/batches/ + auto-updated character-proposals/INDEX.md. Mutates: only worlds/<world-slug>/character-proposals/ (never WORLD_KERNEL.md, ONTOLOGY.md, any _source/ atomic record, characters/, or any other established-character file)."
user-invocable: true
arguments:
  - name: world_slug
    description: "Directory slug of an existing world under worlds/<world-slug>/. Pre-flight aborts if the directory is missing."
    required: true
  - name: parameters_path
    description: "Path to an optional markdown file declaring: desired number of proposals X (default 7); depth_mix over {emblematic, elastic, round_load_bearing}; spread_vs_focus; density_rule_mode; target_domains; taboo_areas; ordinary_vs_exceptional_mix; artifact_author_share; under_modeled_priority; max_overlap_allowed; story_scale_mix over {intimate, local, regional, transregional}; mosaic_cluster_preference; optional upstream_audit_path pointing to a continuity-audit report. If omitted, Phase 0 interviews the user. If provided but thin, Phase 0 runs a targeted gap-filler."
    required: false
---

# Propose New Characters

Generates a diversified batch of candidate character-proposal cards for an existing worldloom world. Pre-flight loads world state via `mcp__worldloom__get_context_packet(task_type='propose_new_characters', ...)` plus direct reads of FOUNDATIONS / WORLD_KERNEL / ONTOLOGY and the Person Registry (existing dossiers + diegetic-artifact frontmatter + adjudicated figures); diagnosis, niche/voice construction, and Canon Safety Check pull atomic records on demand via `search_nodes` / `get_record` / `find_named_entities`; surviving cards are written direct-Edit on hybrid files (proposals are NOT canon — Hook 3 hybrid-file allowlist permits the writes). Each emitted card's path is directly consumable as `character-generation`'s `character_brief_path`.

<HARD-GATE>
Do NOT write any file — proposal card, batch manifest, INDEX.md update — until: (a) pre-flight resolves `worlds/<world-slug>/`, allocates the next `NCB-NNNN` via `mcp__worldloom__allocate_next_id`, and loads the context packet plus FOUNDATIONS / WORLD_KERNEL / ONTOLOGY plus the Person Registry; (b) Phase 10 Canon Safety Check passes for every surviving card with zero unrepaired violations across 10a invariant conformance, 10b Mystery Reserve firewall, 10c distribution discipline, and 10d batch-level registry-non-duplication + joint-closure; (c) Phase 15 Validation Tests pass with zero failures at both per-card and batch levels; (d) the user has explicitly approved the Phase 16 deliverable summary (registry diagnosis, constellation+mosaic audit, niche-occupancy map, every card's frontmatter + body, every card's Canon Safety Check trace, every card's `canon_assumption_flags` status, any Phase 10e repairs that fired, any cards the user is dropping). The user's approval may include a drop-list of card-IDs to exclude from the write; dropped cards are never written and are recorded in the batch manifest's `dropped_card_ids`. This gate is absolute under Auto Mode — invoking the skill is not deliverable approval.
</HARD-GATE>

## Process Flow

```
Pre-flight (allocate_next_id NCB; get_context_packet for world state;
            direct Read FOUNDATIONS + WORLD_KERNEL + ONTOLOGY;
            load Person Registry from characters/ + diegetic-artifacts/ +
            adjudications/; scan character-proposals/ for slug collisions)
      |
      v
Phase 0:    Normalize Generation Parameters (parse OR interview)
      |
      v
Phases 1-2: Build Person Registry + derive 7-layer essence profiles for
            every entry (search_nodes / get_record on demand)
      |
      v
Phases 3-5: Constellation + Mosaic web; filled/crowded/open niches;
            17-probe negative-space diagnosis
      |
      v
Phases 6-9: Generate 3X-5X seeds; character engine per seed (forced-choice
            rule); epistemic + perceptual filter; voice signature
      |
      v
Phase 10:   Canon Safety Check
            10a Per-seed Invariant Conformance (every INV record)
            10b Per-seed Mystery Reserve Firewall (every M record)
            10c Per-seed Distribution Discipline
            10d Batch-level Registry Non-Duplication + Joint-Closure
            --any fail--> 10e Repair Sub-Pass
      |
      v
Phases 11-13: Score (10 dimensions; max-min selection); filter (13 triggers);
              diversify across 10 composition slots; allocate NCP-NNNN per
              slot-filling card via allocate_next_id
      |
      v
Phases 14-15: Compose NCP cards + NCB manifest; run 12 validation tests
      |
      v
Phase 16:   HARD-GATE deliverable summary --> on approval, direct-Edit
            cards + batch manifest + INDEX.md (hybrid-file allowlist)
```

## Output

- **Proposal cards** at `worlds/<world-slug>/character-proposals/NCP-NNNN-<slug>.md` — one hybrid YAML-frontmatter + markdown-body file per surviving card. Frontmatter shape per `templates/proposal-card.md`. The first frontmatter block mirrors `character-generation`'s `character_brief_path` shape; NCP-specific keys carry the audit trail (`occupancy_strength`, `canon_safety_check`, `critic_pass_trace`, `canon_assumption_flags`, `recommended_next_step`, `notes`). Body sections mirror `character-generation`'s dossier schema PLUS a **Niche Analysis** section PLUS a **Canon Safety Check Trace** section.
- **Batch manifest** at `worlds/<world-slug>/character-proposals/batches/NCB-NNNN.md` — hybrid file per `templates/batch-manifest.md`. Frontmatter carries `batch_id`, `world_slug`, `generated_date`, `parameters`, `card_ids`, `dropped_card_ids`, `user_approved`. Body carries Registry Summary, Constellation + Mosaic audit, Niche-Occupancy Map, Phase 5 Negative-Space Diagnosis, Phase 6 Seed Generation Log, Phase 11 Score Matrix, Phase 12 Rejected-Candidate Log, Phase 13 Diversification Audit, Phase 10d/10e traces, Phase 15 Test Results.
- **INDEX.md update** at `worlds/<world-slug>/character-proposals/INDEX.md` — one line per non-dropped card in the form `- [<title>](NCP-NNNN-<slug>.md) — <depth_class> / <intended_narrative_role> / <canon_assumption_flags.status>, batch NCB-NNNN`, sorted by NCP-NNNN ascending. Created if absent.

**No canon-file mutations.** This skill never writes to `WORLD_KERNEL.md`, `ONTOLOGY.md`, or any `_source/<subdir>/*.yaml` record. Hook 3 enforces. **No `characters/` mutations.** This skill never writes to `worlds/<world-slug>/characters/`, `characters/INDEX.md`, or any existing dossier. No CF, CH, INV, M, OQ, ENT, or SEC record is emitted. Each card is a *candidate*; character realization happens only when `character-generation` accepts the card's path as `character_brief_path` in a separate run.

## World-State Prerequisites

`docs/FOUNDATIONS.md`, `worlds/<slug>/WORLD_KERNEL.md`, and `worlds/<slug>/ONTOLOGY.md` load via direct `Read` (primary-authored at the world root; not in `_source/`). The Person Registry loads via direct `Read` of `characters/` + `diegetic-artifacts/` + `adjudications/PA-NNNN-accept*` files (hybrid-file allowlist permits the reads). The atomic-record world-state slice loads via `mcp__worldloom__get_context_packet(task_type='propose_new_characters', seed_nodes=[<registry-and-domain anchor seeds>], token_budget=15000)` per `docs/CONTEXT-PACKET-CONTRACT.md`. MCPENH-002 registered this task-specific profile so the packet prioritizes character/person-registry-adjacent records, named-entity neighbors, invariants, Mystery Reserve entries, and local section context.

For records the packet does not surface, retrieve on demand: `mcp__worldloom__get_record(record_id)` for a specific CF / CH / INV / M / OQ / ENT / SEC; `mcp__worldloom__search_nodes(node_type=..., filters=...)` for domain-filtered scans (Phase 5 negative-space probes per file class; Phase 10c capability-CF distribution lookups; Phase 10b firewall expansion); `mcp__worldloom__get_neighbors(node_id)` for the relation graph around a resolved entity (Phase 3 constellation view); `mcp__worldloom__find_named_entities(names)` to resolve names from `parameters_path` or `upstream_audit_path` or from artifact frontmatter. Direct `Read` of `_source/<subdir>/` is redirected to MCP retrieval by Hook 2 — do not bulk-read.

If `worlds/<world-slug>/` is missing, abort and instruct the user to run `create-base-world` first. Missing `characters/` or `diegetic-artifacts/` directories are NOT abort conditions — they are valid empty-registry states (Phase 0 density rule applies character-sparse mode). If `MAGIC_OR_TECH_SYSTEMS` content is needed (Phase 0 parameters or Phase 6 seed generation touches magic / tech), retrieve via `search_nodes(node_type='section', filters={file_class: 'magic-or-tech-systems'})`.

## Procedure

1. **Pre-flight.** Normalize `world_slug` (strip `worlds/` prefix; verify `[a-z0-9-]+`). Allocate the batch id: `mcp__worldloom__allocate_next_id(world_slug, 'NCB')` → `NCB-NNNN`. Load FOUNDATIONS + WORLD_KERNEL + ONTOLOGY via direct `Read`. Load the Person Registry via direct `Read` of `characters/INDEX.md` + per-dossier files + `diegetic-artifacts/INDEX.md` + per-artifact frontmatter + every `adjudications/PA-NNNN-accept*` frontmatter. Load the context packet per §World-State Prerequisites with seed_nodes derived from `parameters_path` / `upstream_audit_path` if present, else from a small set of WORLD_KERNEL §Core Pressures anchor entities. Read `character-proposals/INDEX.md` if present (informational). Load `references/preflight-and-prerequisites.md` for the abort matrix and selective-retrieval pattern.

2. **Phase 0: Normalize Generation Parameters.** Load `references/phase-0-normalize-parameters.md`. Parse `parameters_path` if provided, else interview. Auto Mode applies inferred defaults per the reference's Auto Mode block; document each inferred default in the batch manifest's `parameters:` block. Reject parameters that dictate specific characters (those are character briefs, and belong as `character-generation`'s `character_brief_path`).

3. **Phases 1-2: Person Registry + Essence Profiles.** Load `references/phases-1-2-registry-and-essence.md`. Build the canonical Person Registry from dossiers + artifact frontmatter + historically-salient PA records + offstage-gravity figures. For every entry, derive a 7-layer essence profile (world-position / function / pressure / access / epistemic / thematic / voice) plus `attention_weight`, `depth_class`, `institutional_embedding_checklist`, `artifact_affordance`, `likely_story_scale`, `nearest_mirrors_or_foils`, and per-capability validation. Mandatory critic passes: Continuity Archivist (Phase 1) and Character Essence Extractor (Phase 2) — recorded in each card's `critic_pass_trace`.

4. **Phases 3-5: Web, Niches, Negative-Space Diagnosis.** Load `references/phases-3-5-web-niches-negative-space.md`. Build constellation + mosaic views (Phase 3); compute niche signatures and classify future spaces filled / crowded / adjacent / open with the false-duplicate guardrail (Phase 4); run 17 negative-space probes against the registry + atomic records, citing specific record ids per finding (Phase 5). If `upstream_audit_path` was loaded, merge its person-thinness findings; skip overlapping probes. Mandatory critic passes: Constellation/Mosaic Analyst (Phase 3) and Institutional + Everyday-Life Critic (Phase 5).

5. **Phases 6-9: Seeds, Engine, Epistemic, Voice.** Load `references/phases-6-9-seeds-engine-epistemic-voice.md`. Generate 3X-5X seeds from 16 high-yield families (Phase 6) honoring the floor semantics; build the character engine per seed with the forced-choice rule (Phase 7); build epistemic + perceptual filter including the first Rule-7 gate (Phase 8); build voice signature across five levels with the five voice tests (Phase 9). Mandatory critic passes: Epistemic / Focalization Critic (Phase 8); Sociolinguistic Voice Critic + Artifact Authorship Critic (Phase 9).

6. **Phase 10: Canon Safety Check.** Load `references/phase-10-canon-safety-check.md`. Run four sub-phases against atomic-record world state — 10a Per-seed Invariant Conformance (every INV in the packet; expand via `search_nodes(node_type='invariant')` if needed; record into `canon_safety_check.invariants_respected`), 10b Per-seed Mystery Reserve Firewall (every M record consulted; expand via `search_nodes(node_type='mystery_record')` if a seed implicates an M not in the packet; record into `canon_safety_check.mystery_reserve_firewall`), 10c Per-seed Distribution Discipline (consult capability CFs via `search_nodes(node_type='canon_fact', filters={domain: ...})`; tag `canon_assumption_flags.status` as canon-safe / canon-edge / canon-requiring), 10d Batch-level Registry Non-Duplication + Joint-Closure. Any fail triggers Phase 10e Repair Sub-Pass. Repairs land in the card's `notes` and the batch manifest's Phase 10e Repair Log.

7. **Phases 11-13: Score, Filter, Diversify.** Load `references/phases-11-13-score-filter-diversify.md`. Score on 10 dimensions and select via max-min (Phase 11). Apply 13 rejection triggers (Phase 12; each rejection logged with trigger + diagnosis target). Diversify across 10 composition slots and 8 contrast axes (Phase 13). After diversification settles, allocate one `NCP-NNNN` per slot-filling card via `mcp__worldloom__allocate_next_id(world_slug, 'NCP')`, in card order. Mandatory critic pass: Theme/Tone Critic (Phase 11).

8. **Phases 14-15: Compose + Validate.** Load `references/phases-14-16-compose-validate-commit.md`. Materialize each surviving seed into the NCP card schema with both frontmatter (character-generation compatibility block + NCP-specific keys) AND body (character-generation dossier sections + Niche Analysis + Canon Safety Check Trace) — defense-in-depth requires both (Phase 14). Run all 12 validation tests with PASS/FAIL + one-line rationale; PASS without rationale = FAIL (Phase 15). Any FAIL halts and loops to the responsible phase.

9. **Phase 16: Commit.** Load `references/phases-14-16-compose-validate-commit.md` for the deliverable-summary structure. Present the 10-section summary. **HARD-GATE fires here.** User may (a) approve as-is, (b) approve with drop-list of NCP-IDs, (c) request revisions (loop to named phase), (d) reject and abort.

   On approval, write in this order — sequencing matters because the tool environment cannot guarantee transactional atomicity:

   1. **Each non-dropped card first**: `worlds/<world-slug>/character-proposals/NCP-NNNN-<slug>.md` via direct `Write`. Set `source_basis.user_approved: true` immediately before each write. `user_approved: true` here means "kept in batch after review", NOT "accepted as a character".
   2. **Batch manifest second**: `worlds/<world-slug>/character-proposals/batches/NCB-NNNN.md` via direct `Write` with `dropped_card_ids` populated and `user_approved: true`. Create `batches/` if absent.
   3. **INDEX.md last**: `Read` existing file (create with header `# Character Proposal Cards — <World-Slug-TitleCased>` followed by a blank line if absent), append one line per non-dropped card in the form `- [<title>](NCP-NNNN-<slug>.md) — <depth_class> / <intended_narrative_role> / <canon_assumption_flags.status>, batch NCB-NNNN`, sort by NCP-NNNN ascending, write back via direct `Edit`.

   All three paths sit under `worlds/<slug>/character-proposals/`, which Hook 3's hybrid-file allowlist permits for direct `Write` / `Edit`. Cards-first sequencing means a partial-failure state has either cards-without-index or a manifest-without-INDEX-row. **Recovery is manual.**

   Report all written paths. Do NOT commit to git.

## Canon Alignment

For Validation Rules this skill upholds (Rules 2, 3, 4, 7), Record Schemas (NCP proposal card + NCB batch manifest), and the full FOUNDATIONS Alignment table, load `references/canon-rules-and-foundations.md`.

## Guardrails

- **Single world per invocation.** Never creates a new world (`create-base-world` does that), never modifies `docs/FOUNDATIONS.md`, never touches other worlds, never touches `archive/` or `brainstorming/`.
- **No canon writes; no character-dossier writes.** Direct `Edit`/`Write` on `_source/<subdir>/*.yaml` is blocked by Hook 3. WORLD_KERNEL.md and ONTOLOGY.md are not in this skill's mutation surface. `worlds/<slug>/characters/` is not in this skill's mutation surface — that boundary is what keeps `character-generation` and other skills from misreading proposal cards as established characters. All writes are confined to `worlds/<slug>/character-proposals/` (cards, `batches/`, INDEX.md) — Hook 3's hybrid-file allowlist permits these.
- **Proposals are not characters; proposals are not canon.** Every emitted card is a candidate for `character-generation` (to become a dossier) AND, if canon-requiring, for `canon-addition` / `propose-new-canon-facts` (to resolve implied new canon before generation). A card's existence on disk is NOT equivalent to an accepted character. `source_basis.user_approved: true` means "kept in batch after review", NOT character acceptance.
- **ID-collision abort.** If `allocate_next_id` errors or the resulting `NCP-NNNN-<slug>.md` would collide with an existing file, abort and ask the user to resolve before retrying. Never overwrite an existing card, batch manifest, or INDEX row.
- **Interop seam with `character-generation` is one-way and structural.** This skill's NCP frontmatter first-block fields mirror `character-generation`'s `character_brief_path` shape byte-for-byte. If `character-generation`'s Phase 0 input schema changes, this skill's Phase 14 card frontmatter must be updated in lockstep — the coupling is structural, not incidental.
- **Interop seam with `canon-addition` / `propose-new-canon-facts`** is via `canon_assumption_flags.implied_new_facts` + `recommended_next_step`. This skill never writes to those skills' surfaces; routing is the user's decision on reviewing the batch.
- **Interop with `continuity-audit`** is structural via optional `upstream_audit_path`. If that sibling's output format changes, this skill's Phase 5 merge logic adapts; the argument surface does not change.
- **Phase 8 (first Rule-7 gate), Phase 10b (formal firewall), and Phase 10d (joint-closure) are the three Rule 7 enforcement points.** A future maintainer adding a phase that exposes cards to MR content must extend all three or explicitly classify the phase as out-of-scope for Rule 7 (documented in the manifest notes).
- **Empty slots in the Phase 13 Diversification Audit are features, not bugs.** They surface diagnostic signals about the world's current character-web gaps. Filling a slot with a lower-scoring candidate just to avoid emptiness is forbidden.
- **HARD-GATE absoluteness.** Auto Mode does not relax the gate — invocation is not deliverable approval.
- **Worktree discipline.** All paths resolve from the worktree root if invoked inside a worktree.
- **Do NOT commit to git.** Writes land in the working tree only; the user reviews and commits.

## Final Rule

A character proposal batch is not written until every card has a world-grounded niche signature, a forced-choice pressure, a capability-with-cost, a complete Mystery Reserve firewall audit, an invariant-conformance trace, and an explicit canon-safe / canon-edge / canon-requiring classification; the batch has a registry diagnosis, a 10-slot diversification audit, and a batch-level joint-closure trace; and the user has approved the complete deliverable — and once written, each card is a candidate for `character-generation` (to become a character) and, if canon-requiring, for `canon-addition` (to resolve its implied new canon), NEVER an established character or canonized fact itself.
