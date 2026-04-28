---
name: propose-new-worlds-from-preferences
description: "Use when generating candidate story-world proposals from a user preference document while avoiding repetition of existing worlds — option-card batches covering preference-aligned niches in unoccupied possibility space. Each card is directly consumable as create-base-world's premise_path; downstream selection of one card produces a full world bundle. Produces: NWP-NNNN-<slug>.md cards at world-proposals/ + NWB-NNNN.md batch manifest at world-proposals/batches/ + auto-updated world-proposals/INDEX.md + appended row to world-proposals/LINEAGE.md (cross-batch lineage record) + (first-run-only) world-proposals/.gitkeep with corresponding .gitignore entry. Mutates: only root-level world-proposals/ and one append to .gitignore (first run only — never WORLD_KERNEL.md, ONTOLOGY.md, any _source/ atomic record, or any existing world's surface)."
user-invocable: true
arguments:
  - name: preference_path
    description: "Path to a markdown file containing the user's worldbuilding preference document — e.g., briefs/preferred-worldbuilding.md. Should describe favorite worlds with reasons (not just titles), anti-inspirations / failure modes, tonal range, intended use case, ethical red lines, content boundaries. Pre-flight aborts if missing."
    required: true
  - name: parameters_path
    description: "Optional markdown file declaring proposal_count (default 8), inspiration_distance (close / moderate / distant / structural-only), novelty_preference (low / medium / high), existing_world_policy (strict_avoid / no_repeat_niche), content_boundaries, scale_preference, intended_use_case, genre_diversification. If omitted, Phase 0 interviews. If present but thin, Phase 0 runs targeted gap-fillers."
    required: false
---

# Propose New Worlds From Preferences

Generates a diversified batch of candidate story-world proposals from a user preference document while reading every existing world's atomic-source state to avoid niche repetition. Each emitted card is directly consumable as `create-base-world`'s `premise_path`; downstream selection of one card produces a full world bundle.

<HARD-GATE>
Do NOT write any file — proposal card, batch manifest, INDEX.md update, LINEAGE.md append, .gitkeep bootstrap, .gitignore append — until: (a) pre-flight resolves the preference document, allocates the next NWB-NNNN through `mcp__worldloom__allocate_next_id(world_slug='__pipeline__', id_class='NWB')` with manual scan fallback only if the MCP call errors (see Pre-flight Step 4), loads FOUNDATIONS, consults `world-proposals/LINEAGE.md` for prior-batch context (Pre-flight Step 9), and either builds the cross-world essence map (Standard Path) or marks distinctness-skipped (Empty Worlds Path per Phase 3); (b) Phase 11 Canon Safety Check passes for every surviving card with zero unrepaired violations across 11a per-card cross-world Mystery Reserve firewall, 11b per-card forbidden-mystery presence, 11c batch-level mutual distinctness, and 11d batch-level world-grammar fidelity; (c) Phase 12 Validation Tests pass with zero failures — all 19 tests run with one-line rationale per PASS (bare PASS = FAIL); (d) the user has explicitly approved the Phase 14 deliverable summary (preference essence report, existing world essence map OR distinctness-skipped flag, vacancy map, every card's frontmatter + body, every card's Canon Safety Check trace, batch-level distinctness audit, any Phase 11e repairs that fired, any cards the user is dropping). The user's approval may include a drop-list of NWP-IDs to exclude from the write; dropped cards are never written and are recorded in the batch manifest's `dropped_card_ids`. When existing worlds are absent, the Phase 14 deliverable summary MUST surface a top-line "DISTINCTNESS UNENFORCED — no existing worlds to compare against" banner so the user accepts proposals deliberately rather than by default. This gate is absolute under Auto Mode — invoking the skill is not deliverable approval.
</HARD-GATE>

## Process Flow

```
Pre-flight (verify preference_path readable;
            allocate next NWB-NNNN via mcp__worldloom__allocate_next_id(__pipeline__, NWB);
            load FOUNDATIONS;
            scan worlds/ for existing-world list;
            scan world-proposals/ for slug collisions;
            detect bootstrap state — defer .gitkeep + .gitignore writes to Phase 14;
            consult world-proposals/LINEAGE.md for prior-batch cluster coverage)
      |
      v
Phase 0:    Normalize Generation Parameters (parse parameters_path OR interview)
      |
      v
Phases 1-2: Parse Preference Document → Compress to Design Grammar
            (preference essence report; pattern weights; design formula)
      |
      v
Phase 3:    Essence-Map Existing Worlds
            ├── Standard Path: get_context_packet(world_slug, task_type='propose_new_worlds_from_preferences')
            │                  per world; derive 14-layer essence profile per world
            └── Empty Worlds Path: skip mapping; set distinctness_enforced=false
      |
      v
Phase 4:    Build Niche Occupancy Map
            (hard-occupied / soft-occupied / ambient / open / high-yield)
            (under Empty Worlds Path: all niches "open"; map degenerate)
      |
      v
Phase 5:    Generate 4X-6X seeds across 10 seed families
      |
      v
Phase 6:    Seed Sanity Pass (11 rejection triggers)
      |
      v
Phase 7:    Build Propagation Skeletons (3 orders of consequence required)
      |
      v
Phase 8:    Existing-World Distinctness Check
            (skipped under Empty Worlds Path with batch flag)
            |
            +--fail--> transform chronotope / survival / contradiction / ...
      |
      v
Phase 9:    Preference Fit Scoring + Max-Min Selection
            (13 positive axes + 8 negative axes; allocate NWP-NNNN per finalist)
      |
      v
Phase 10:   Deepen Finalists Into Proposal Cards
            (full schema: institutions / factions / ordinary-life / mystery seeds)
      |
      v
Phase 11:   Canon Safety Check (cross-world)
            11a Per-card Cross-World Mystery Reserve Firewall
                 (skipped under Empty Worlds Path)
            11b Per-card Forbidden-Mystery Presence (always runs)
            11c Batch-level Mutual Distinctness (always runs)
            11d Batch-level World-Grammar Fidelity (always runs)
            --any fail--> 11e Repair Sub-Pass
      |
      v
Phase 12:   Validation Tests (19 tests; PASS+rationale or FAIL)
      |
      v
Phase 13:   Compose NWP cards + NWB manifest + INDEX.md (in-memory)
      |
      v
Phase 14:   HARD-GATE deliverable summary
            ─ post-drop cluster-coverage check (offer backfill / accept-gap / revise-drop)
            ─ on approval → bootstrap (if needed) → cards → manifest → INDEX → LINEAGE append
              (root-level world-proposals/ is the skill's own write surface;
               not Hook 3-blocked because not under _source/)
```

## Inputs

### Required
- `preference_path` — markdown file — user's worldbuilding preference document. Should describe favorite worlds with reasons, anti-inspirations / failure modes, tonal range, intended use case, ethical red lines, and content boundaries. Phase 1 parses it into the preference essence; if mostly titles-without-explanation, Phase 0 runs the source proposal's Follow-Up Trigger.

### Optional
- `parameters_path` — markdown file — declares: `proposal_count` (default 8); `inspiration_distance` (close / moderate / distant / structural-only); `novelty_preference` (low / medium / high); `existing_world_policy` (strict_avoid / no_repeat_niche); `content_boundaries` (sex, violence, body horror, child endangerment, religion, politics, oppression — each `forbidden` / `allowed_if_structural` / `ask_or_tag`); `scale_preference`; `intended_use_case` (novel / RPG / open-world game / anthology / transmedia / lore sandbox); `genre_diversification` (diversify / single_family). If omitted, Phase 0 interviews. If present but thin, Phase 0 runs targeted gap-fillers.

## Output

- **Proposal cards** at `world-proposals/NWP-NNNN-<slug>.md` — one hybrid YAML-frontmatter + markdown-body file per surviving card per `templates/proposal-card.md`. Body sections cover the source proposal's full Phase 10 Proposal Card schema (Core Sentence / World Niche Summary / Why This Niche Is Open / Genre Contract / Tone Contract / Primary Difference / Core Contradiction / Survival Constraint / Chronotope / Geography as Law / Resource-Infrastructure Spine / Deep History and Misrecognition / Institutions ≥7 / Professions / Factions ≥4 / Ordinary-Life Proof ≥10 / Body and Personhood / Local Documents / Native Story Procedures / Natural Story Engines / Mystery Reserve Seeds / Equilibrium / Preference Fit / Distinctness From Existing Worlds / Risks and Repairs / Canon Safety Check Trace). The card body IS directly consumable as `create-base-world --premise_path world-proposals/NWP-NNNN-<slug>.md` — `create-base-world`'s freeform parser reads the body sections at Phase 0 (Normalize Premise).

- **Batch manifest** at `world-proposals/batches/NWB-NNNN.md` — hybrid file per `templates/batch-manifest.md`. Frontmatter: `batch_id`, `source_preference_document`, `parameters` (with inferred-default annotations), `proposal_count_requested`, `existing_worlds_scanned[]`, `distinctness_enforced`, `card_ids`, `dropped_card_ids`, `bootstrap_writes_required`, `user_approved`, `generated_date`. Body: Preference Essence Report, Existing World Essence Map (or "no worlds scanned" stub), Niche Vacancy Map, Phase 5 Seed Generation Log, Phase 6 Sanity-Pass Rejection Log, Phase 8 Distinctness-Check Log (or skipped notice), Phase 9 Score Matrix + Max-Min Selection Trace, Phase 11 Canon Safety Check Audit, Phase 11e Repair Log, Phase 12 Validation Test Results.

- **INDEX.md update** at `world-proposals/INDEX.md` — one line per non-dropped card in the form `- [<title>](NWP-NNNN-<slug>.md) — <chronotope_summary> / <core_sentence_truncated>, batch NWB-NNNN`, sorted by NWP-NNNN ascending. Created with header `# World Proposal Cards` followed by a blank line if absent.

- **LINEAGE.md append** at `world-proposals/LINEAGE.md` — one row per batch in the form `- NWB-NNNN | YYYY-MM-DD | seeds:N | finalists:M | dropped:K | written:W | clusters:<comma-list>`, sorted by NWB-NNNN ascending. Created with header `# World Proposals Lineage` followed by a blank line if absent. Consumed by future invocations' Pre-flight Step 9 + Phase 4 cross-batch context so prior-batch cluster coverage and dropped-card lineage inform the next vacancy map.

- **Bootstrap artifacts (first run only)**: `world-proposals/.gitkeep` (empty file) + a two-line append to repo-root `.gitignore` (`world-proposals/*` and `!world-proposals/.gitkeep`). Mirrors the existing `briefs/*` + `!briefs/.gitkeep` pattern. Subsequent runs detect these and skip the bootstrap.

**No canon-file mutations.** This skill never writes to `WORLD_KERNEL.md`, `ONTOLOGY.md`, any `_source/<subdir>/*.yaml` record, or any existing world's `characters/` / `diegetic-artifacts/` / `proposals/` / `audits/` / `adjudications/`. No CF, CH, INV, M, OQ, ENT, or SEC record is emitted. Each card is a **pre-world candidate**; world realization happens only when `create-base-world` accepts the card's path as `premise_path` in a separate run.

## World-State Prerequisites

Before this skill acts, it MUST receive (per FOUNDATIONS §Tooling Recommendation):

- `docs/FOUNDATIONS.md` — direct `Read` — for §Canon Layers (cards declare which layer their primary-difference targets), §Validation Rules (Rules 2/3/5/7 enforced), §Mystery Reserve resolution-safety semantics, §Canon Fact Record Schema (proposal-card body's structural alignment with future-world CF-0001).
- `preference_path` — direct `Read` — required argument; abort on missing or unreadable.
- `parameters_path` — direct `Read` if provided — optional argument; absence triggers Phase 0 interview.

### Mandatory Cross-World Essence Map — built at Pre-flight, consulted Phase 3 onward

This skill's distinctness discipline depends on a registry assembled across **every existing world**. Build it at Pre-flight by scanning `worlds/` and, for each `worlds/<slug>/` directory present:

- Direct `Read` of `worlds/<slug>/WORLD_KERNEL.md` and `worlds/<slug>/ONTOLOGY.md` (primary-authored at world root; not in `_source/`).
- `mcp__worldloom__get_context_packet(world_slug=<slug>, task_type='propose_new_worlds_from_preferences', seed_nodes=[<world-kernel anchor entities + INV ids surfaced by ONTOLOGY>], token_budget=12000)` per world — MCPENH-002 registered this cross-world profile so each per-world packet prioritizes kernel/ontology-adjacent section context, invariants, forbidden Mystery Reserve firewalls, and entity anchors.
- For records the packet does not surface, retrieve on demand: `mcp__worldloom__get_record(record_id)` for specific INV / M / CF / SEC; `mcp__worldloom__search_nodes(node_type='invariant', filters={world_slug: <slug>})` for full INV scan when Phase 11a needs every invariant; `mcp__worldloom__get_firewall_content(world_slug)` for full M-record firewall projection when Phase 11a expands. Use `get_record('M-NNNN')` per id only when full M-record context (`notes`, `extensions`, `modification_history`) is needed beyond the firewall projection.
- Direct `Read` of `worlds/<slug>/_source/` subdirectories is redirected to MCP retrieval by Hook 2 — do not bulk-read.

The cross-world essence map is a **multi-directory aggregate** (per `propose-new-characters`'s Person Registry pattern adapted to a meta-scope). Each world's entry carries the 14-layer essence profile from the source proposal's §"World Essence Model" (primary difference, survival constraint, propagation signature, core contradiction, chronotope, resource/infrastructure spine, institutional ecology, deep history/misrecognition, body/personhood consequences, factions, everyday-life signature, mystery reserve shape, native story procedures, tone/aesthetic contract).

### Empty Worlds Path

If `worlds/` contains no world directories (or is itself absent), the cross-world essence map degrades to `[]` and the batch flag `distinctness_enforced=false` is set at Pre-flight. Subsequent Phase 3 / 4 / 8 / 11a checks honor this flag. The HARD-GATE Phase 14 deliverable summary surfaces the "DISTINCTNESS UNENFORCED" banner at the top so the user accepts the absent-distinctness gap deliberately.

## Pre-flight Check

Run before Phase 0; if any precondition fails, abort.

1. **Argument validation**: verify `preference_path` exists and is readable. Abort on missing.
2. **FOUNDATIONS load**: direct `Read` `docs/FOUNDATIONS.md` into working context.
3. **Vocabulary resolution**: `mcp__worldloom__get_canonical_vocabulary({class: "domain"})` and `({class: "mystery_resolution_safety"})` so emitted card fields use canonical enum values from Phase 10 onward.
4. **NWB allocation**: call `mcp__worldloom__allocate_next_id(world_slug='__pipeline__', id_class='NWB')` and use the returned `NWB-NNNN`. Manual scan of `world-proposals/batches/NWB-*.md` is fallback only if the MCP call errors; if fallback is used, record the MCP error and scanned highest ID in working notes before continuing.
5. **Existing-world enumeration**: list `worlds/*/` directories. Empty list → mark `distinctness_enforced=false` and set the Empty Worlds Path flag for downstream phases.
6. **Cross-world essence map build (Standard Path only)**: per §World-State Prerequisites — direct `Read` WORLD_KERNEL + ONTOLOGY for every existing world; assemble context packets; capture the 14-layer essence profile per world.
7. **Slug-collision pre-scan**: list `world-proposals/NWP-*.md` to seed the slug-collision check that fires at Phase 9 finalist allocation.
8. **Bootstrap state detection**: detect `world-proposals/.gitkeep` and `.gitignore` containing `world-proposals/*`. Record `bootstrap_writes_required: true|false` in the batch manifest. The bootstrap writes themselves are deferred to Phase 14 (HARD-GATE) — do NOT pre-write infrastructure before user approval.
9. **LINEAGE consultation**: read `world-proposals/LINEAGE.md` if present (skip silently if absent — the file is created on the first batch's Phase 14 append). Surface the prior-batch cluster coverage and dropped-card lineage into working state so Phase 4 vacancy mapping can mark proposed-but-not-realized niches as **soft-occupied (proposed in NWB-NNNN, dropped at gate)** rather than **open**. Empty LINEAGE (file present but no batch rows yet) and absent LINEAGE both yield the empty cross-batch context — Phase 4 then runs against existing-worlds-only state.

## Phase 0: Normalize Generation Parameters

Parse `parameters_path` if provided; else interview the user with the source proposal's Phase 0 questions (proposal_count, intended_use_case, scale_preference, inspiration_distance, novelty_preference, existing_world_policy, content_boundaries, genre_diversification). Auto Mode applies defaults (proposal_count=8, novelty_preference=high, content_boundaries=ask_or_tag for sex/child-endangerment, allowed_if_structural for body horror/violence, existing_world_policy=avoid_repeating_core_niches if any worlds exist else N/A); document each inferred default in the batch manifest's `parameters` block with an `inferred: true` annotation. **Reject parameters that dictate a specific proposal** — this skill generates options, not a pre-decided world (those are `create-base-world` premise briefs).

If the preference document trips the source proposal's **Follow-Up Trigger** (mostly titles with no explanation, aesthetic adjectives without mechanism, plot rather than world preferences, only one or two inspirations, no anti-inspirations, no use case, no tonal/ethical boundaries), abort Phase 0 and request a richer document; otherwise proceed and tag uncertainties in the manifest.

## Phase 1: Parse Preference Document

For every world referenced in the preference document, separate **surface feature** / **underlying mechanism** / **user-valued effect** / **reusable abstract pattern** / **anti-pattern implied by the preference**. Score 0-5 across the source proposal's 80+ pattern axes (impossible fact / consequence propagation / survival constraints / premise-specific institutions / geography as law / etc.) → produce the **preference essence**: dominant patterns, strong dislikes, design formula. Tag uncertainty per world if the preference document gives only a title.

**Critic pass (inline)**: *Preference Extractor* — flags titles-without-mechanism, ungrounded aesthetic preferences, plot-vs-world confusion. Recorded in manifest `critic_pass_trace.phase_1_preference_extractor`.

## Phase 2: Compress to Design Grammar

Compress the Phase 1 essence into a generative rule system: `favored_wounds`, `favored_chronotopes`, `favored_survival_variables`, `favored_institution_types`, `favored_faction_structures`, `favored_mystery_shapes`, `favored_everyday_life_consequences`, `favored_story_procedures`, `favored_tone_contradictions`, `rejected_shapes`. The grammar is the constraint set Phase 5 generation conforms to.

**Critic pass (inline)**: *Narrative Theory Analyst* — checks the grammar against minimal-departure / chronotope / novum / possible-world logic. Recorded in `critic_pass_trace.phase_2_narrative_theory`.

## Phase 3: Essence-Map Existing Worlds

### Standard Path
For each world in the cross-world essence map, confirm or refresh the 14-layer essence profile. Per-world output schema matches the source proposal's `world_slug / primary_difference / survival_constraint / ... / hard_avoid_repetition / ambient_reusable_motifs` block. **Do NOT** transcribe forbidden mystery answers into the essence map — record only the M-record's `status` and `domains_touched`, never its `unknowns` if `status: forbidden`. This is the Rule-7 cross-world firewall's first checkpoint.

**Critic pass (inline)**: *Existing World Essence Cartographer*. Recorded in manifest body §"Existing World Essence Map".

### Empty Worlds Path
Skip mapping entirely. Manifest body §"Existing World Essence Map" is a single line: "No existing worlds — distinctness checks unenforced; see DISTINCTNESS UNENFORCED banner at Phase 14 deliverable."

## Phase 4: Build Niche Occupancy Map

Compare the cross-world essence map against the Phase 2 design grammar. Classify per-niche as **hard-occupied** / **soft-occupied** / **ambient-only-motif** / **open** / **especially-promising vacancy**. Run the source proposal's 9 vacancy-diagnosis questions. Output schema matches the source proposal's `world_niche_vacancy_map` block. Under Empty Worlds Path: map degenerates to "all niches open"; vacancy diagnosis runs against the design grammar alone.

**Cross-batch context (when LINEAGE.md surfaced prior batches at Pre-flight Step 9)**: mark each prior-batch covered cluster as **soft-occupied (proposed in NWB-NNNN)** with the originating batch noted, and each prior-batch dropped-cluster as **soft-occupied (proposed in NWB-NNNN, dropped at gate)** so the current vacancy map represents BOTH realized-world coverage AND prior-batch proposed coverage. The user's `existing_world_policy` parameter governs avoidance of REALIZED worlds (hard-occupied); the cross-batch context makes proposed-but-unrealized niches visible at soft-occupied tier so the current batch can intentionally either backfill an earlier dropped niche or prefer an open one. Empty Worlds Path with empty LINEAGE remains the all-niches-open degenerate case.

**Critic pass (inline)**: *Niche Diversity Critic*. Recorded in `critic_pass_trace.phase_4_niche_diversity`.

## Phase 5: Generate Seeds (4X to 6X)

Generate 4X-6X seeds across the source proposal's 10 seed families (impossible fact / survival variable / chronotope / resource spine / misrecognized history / institution fossil / body-personhood / social rule / ecology-as-process / artifact-layer). Each seed: one clean world wound + a rough propagation promise. **Do not deepen yet.** Each seed must answer in one paragraph: *if this were true, why would ordinary life, institutions, geography, and history look different?*

**Rule (Rule 2 enforcement begins here)**: a seed without ordinary-life implications is rejected at Phase 6.

## Phase 6: Seed Sanity Pass

Apply the source proposal's 11 rejection triggers (genre premise only / no survival constraint / copies a named inspiration's surface package / copies an existing world's essence / produces only elite-or-adventure consequences / no ordinary-life implications / no institutional consequences / no plausible bottleneck / too many disconnected impossible facts / explains itself too completely / lacks mystery potential). Rejected seeds logged with the trigger that fired.

**Rule cross-refs**: Rule 2 ("no ordinary-life implications" trigger); Rule 3 ("too many disconnected impossible facts", "explains itself too completely"); Rule 5 ("no institutional consequences"); Rule 7 ("lacks mystery potential").

**Critic pass (inline)**: *Ontology Architect* (operational clarity). Recorded in `critic_pass_trace.phase_6_ontology_architect`.

## Phase 7: Build Propagation Skeletons

For each surviving seed, build the source proposal's skeleton schema: `impossible_fact`, `survival_constraint`, `first_order` / `second_order` / `third_order` consequences, `institutions` (≥4 functional categories), `professions`, `taboos`, `crimes`, `technologies_or_rituals`, `factions`, `region_types`, `ordinary_life`, `deep_history_misrecognition`, `mystery_seeds`, `native_story_procedures`, `limiting_conditions`.

**Rule (Rule 5 — No Consequence Evasion)**: at least three orders of consequence are mandatory. A skeleton with first-order only is repaired or returned to seed pool.

**Rule (Rule 11 — No Spectator Castes)**: each skeleton must name ≥3 forms of leverage available to ordinary / mid-tier actors via professions / crimes / folk-institution categories.

**Critic passes (inline)**: *Propagation Systems Critic* (forces 2nd/3rd order); *Geography/Ecology Analyst* (space and ecology load-bearing); *Institutions/Economy Critic*. Recorded in `critic_pass_trace.phase_7_*`.

## Phase 8: Existing-World Distinctness Check

### Standard Path
Compare each surviving skeleton against every existing world's essence profile using the source proposal's distinctness axes (weighted: primary impossible fact 20% / survival constraint 15% / chronotope 15% / core contradiction 12% / resource spine 10% / deep history 10% / institutional ecology 8% / body-personhood 5% / factions 3% / tone 2%). Apply the source proposal's thresholds: **0.80+ duplicate, 0.65-0.79 crowded, 0.45-0.64 adjacent, <0.45 distinct**. Apply the **anti-pastiche rule** — a proposal inspired by a liked work may copy ≤1 surface layer and must transform the load-bearing mechanism. Detected duplicates either get rejected or routed to a transform decision (chronotope / survival variable / contradiction / institution-ecology / body-personhood / history / native procedure).

Never use the score without a human-readable explanation; explanations land in the card body's "Distinctness From Existing Worlds" section.

### Empty Worlds Path
Skip entirely; mark each skeleton's `distinctness_check.skipped: true` with reason `no_existing_worlds`.

**Critic pass (inline)**: *Anti-Pastiche Critic*. Recorded in `critic_pass_trace.phase_8_anti_pastiche`.

## Phase 9: Preference Fit Scoring + Max-Min Selection

Score each surviving skeleton 1-5 across the source proposal's **13 positive axes** (preference alignment / novelty / consequence propagation / ordinary-life reach / institution generation / faction generation / geography-as-law strength / deep-history pressure / mystery reserve quality / diegetic artifact potential / character-generation potential / native story procedure strength / tonal-aesthetic specificity) and **8 negative axes** (redundancy / pastiche / overcomplexity / implementation burden / thematic mismatch / ethical boundary risk / mystery-flattening / spectacle-without-society — each LOWER is better).

Apply **max-min selection**: choose the highest-quality viable seed first; for each next finalist, maximize combined (quality × min-distance from already-selected × min-distance from existing worlds × coverage of preference-pattern clusters). Continue until proposal_count finalists are selected.

A slightly lower-scoring proposal IS preferred if it opens a truly unoccupied niche.

After selection settles, allocate one `NWP-NNNN` per finalist via `mcp__worldloom__allocate_next_id(world_slug='__pipeline__', id_class='NWP')`, in selection order. Manual scan of `world-proposals/NWP-*.md` is fallback only if the MCP call errors; if fallback is used, record the MCP error and scanned highest ID in working notes before continuing. **Slug collision check**: if `world-proposals/NWP-NNNN-<slug>.md` would collide with an existing card on disk, abort and ask the user to resolve before continuing.

**Critic passes (inline)**: *Theme/Tone Critic*; *Mystery Curator* (flags mystery-flattening risk). Recorded in `critic_pass_trace.phase_9_*`.

## Phase 10: Deepen Finalists Into Proposal Cards

Materialize each finalist into the full proposal-card schema (frontmatter + body) per `templates/proposal-card.md`. Required body sections: Core Sentence / World Niche Summary / Why This Niche Is Open / Genre Contract / Tone Contract / Primary Difference / Core Contradiction / Survival Constraint / Chronotope / Geography as Law / Resource-Infrastructure Spine / Deep History and Misrecognition / Institutions Born From the Premise (≥7 across the 7 functional categories: official / religious-ideological / criminal-black-market / technical-scientific-medical / military-policing / commercial / folk-local) / Professions Born From the Premise / Factions as Civic Hypotheses (≥4 with all 7 sub-fields per faction) / Ordinary-Life Proof (≥10 consequences across food / housing / clothing / childhood / courtship / medicine / law / work / mourning / language) / Body and Personhood Consequences / Local Documents and Artifact Potential / Native Story Procedures / Natural Story Engines / Mystery Reserve Seeds (active + passive + forbidden — at least one each) / Equilibrium Explanation (with bottleneck) / Preference Fit / Distinctness From Existing Worlds (skipped under Empty Worlds Path) / Risks and Repairs.

**Rule (Rule 7 — Preserve Mystery Deliberately)**: every card MUST declare at least one `forbidden` mystery with `future_resolution_safety: none` per FOUNDATIONS resolution-safety semantics. The card's `mystery_reserve_seeds.forbidden` field carries this explicitly.

**Critic passes (inline)**: *Everyday-Life Critic* (rejects cards serving only rulers/heroes); *Body/Personhood Critic*; *Diegetic Artifact Critic*; *Create-Base-World Readiness Critic* (ensures the body is parseable as `create-base-world --premise_path`). Recorded in `critic_pass_trace.phase_10_*`.

## Phase 11: Canon Safety Check (cross-world)

Run as four sub-checks; any fail triggers Phase 11e Repair Sub-Pass.

### 11a. Per-card Cross-World Mystery Reserve Firewall
Per existing world, retrieve all M records via `mcp__worldloom__get_firewall_content(world_slug)`; one MCP call returns every M record's `title`, `status`, `unknowns`, `common_interpretations`, and `disallowed_cheap_answers`. Filter the result client-side for `status: 'forbidden'` entries. For each forbidden M, verify the proposal card does NOT transcribe, paraphrase, or "answer" the M's `unknowns` field. Fall back to `mcp__worldloom__get_record('M-NNNN')` per id only when full M-record context (`notes`, `extensions`, `modification_history`) is needed beyond the firewall projection. The risk is structural laundering — a new world's primary-difference accidentally resolving another world's deliberately-bounded unknown. Record every checked M-id in the card's `canon_safety_check.cross_world_mr_firewall.checked[]`, regardless of overlap. **Skipped under Empty Worlds Path; flag `cross_world_mr_firewall.skipped: true` with reason `no_existing_worlds`.**

### 11b. Per-card Forbidden-Mystery Presence
Verify every card carries at least one `mystery_reserve_seeds.forbidden` entry with `future_resolution_safety: none`. Always runs — independent of Empty Worlds Path.

### 11c. Batch-level Mutual Distinctness
Run pairwise distinctness comparison across finalists using the same weighted axes as Phase 8. Any pairwise score ≥ 0.65 within the batch fails 11c. Always runs.

### 11d. Batch-level World-Grammar Fidelity
Verify the finalist set collectively respects the Phase 2 preference grammar — every `favored_*` cluster has at least one finalist representing it; no `rejected_shapes` pattern appears in any finalist. Always runs.

### 11e. Repair Sub-Pass
On any fail: identify which finalist + which check; if 11a/11b at card level → loop to Phase 10 for that card; if 11c → demote one finalist and pull the next-best max-min candidate from the seed pool (loop to Phase 9); if 11d → re-run Phase 9 selection with the missing-cluster constraint added. Repairs land in the card's `notes` and the batch manifest's Phase 11e Repair Log.

**Critic pass (inline)**: *Mystery Curator* (firewall enforcement at 11a/11b). Recorded in `critic_pass_trace.phase_11_mystery_curator`.

## Phase 12: Validation Tests

Run all 19 tests. Each test reports PASS+rationale or FAIL. **Bare PASS without one-line rationale = FAIL** per CLAUDE.md and FOUNDATIONS skill discipline. Any FAIL halts the phase and loops to the responsible upstream phase.

The source proposal's 15 tests:
1. **One-Sentence Fertility** — Phase 10 core sentence fertile in one concrete impossible sentence.
2. **Minimal Departure** — one or two load-bearing departures, then consequences (Rule 3).
3. **Consequence Propagation** — premise affects ≥8 major domains (Rule 5).
4. **Ordinary-Life** — child / laborer / healer / criminal / priest / trader / ruler / outsider each experience the premise differently.
5. **Institution** — institutions arise from the premise, not generic genre furniture (Rule 2).
6. **Geography-as-Law** — space imposes consequences.
7. **History-as-Pressure** — the past still acts on the present.
8. **Misrecognition** — people are wrong about the world in useful, socially-maintained ways.
9. **Mystery Reserve** — bounded and useful unknowns (Rule 7).
10. **Faction** — factions represent survival arguments, not color teams.
11. **Body / Personhood** — premise touches embodiment.
12. **Native Procedure** — repeatable story procedures impossible elsewhere.
13. **Anti-Pastiche** — proposal survives removing all surface resemblance to inspirations.
14. **Existing-World Non-Redundancy** — avoids hard-occupied niches (skipped under Empty Worlds Path with rationale `no_existing_worlds`).
15. **Tone Contract** — one obvious genre import would break the world; recorded as future invariant candidate.

Plus 4 added by this skill:

16. **Canonical Vocabulary Conformance** — every `domains_affected` in card frontmatter uses a canonical domain enum (per Pre-flight `get_canonical_vocabulary`); every `future_resolution_safety` value matches the canonical vocab and the `forbidden ⇒ none` coupling.
17. **Create-Base-World Readiness** — card body parses as a freeform premise brief: contains Genre Contract / Tone Contract / Primary Difference / Core Pressures readable as `create-base-world` Phase 0 inputs. No required body section is empty / TODO / `<placeholder>`.
18. **Spectator-Caste Leverage** (Rule 11) — each card's combined Professions + Folk/Local Institutions + Crimes lists ≥3 named forms of leverage available to ordinary or mid-tier actors (per FOUNDATIONS §Rule 11 permissible leverage: locality, secrecy, legitimacy, bureaucracy, numbers, ritual authority, domain expertise, access, timing, social trust, deniability, infrastructural control). PASS requires explicit enumeration of the leverage forms in the rationale.
19. **Multi-Register Truth** (Rule 12) — each card's primary-difference fact has ≥2 distinct register traces named across the Local Documents and Artifact Potential, Ordinary-Life Proof, and Native Story Procedures sections (per FOUNDATIONS §Rule 12 registers: law, ritual, architecture, slang, ledgers, funerary practice, landscape, bodily scars, supply chains, songs, maps, educational customs, bureaucratic forms, and other named in-world traces). PASS requires naming the traces in the rationale.

## Phase 13: Compose NWP cards + NWB manifest + INDEX.md

Materialize each non-failed finalist into the proposal-card hybrid file (frontmatter + body) per `templates/proposal-card.md`. Compose the batch manifest per `templates/batch-manifest.md` with the Empty Worlds Path conditional content correctly populated. Compose the INDEX.md update lines.

**No writes happen at this phase.** Composition produces in-memory file contents only; the gated write happens at Phase 14.

## Phase 14: HARD-GATE Deliverable + Commit

Present the deliverable summary to the user with these top-level sections, in order:

1. **DISTINCTNESS UNENFORCED banner** (only if Empty Worlds Path) — single bold line at the top.
2. **Bootstrap-Writes-Required notice** (only if `bootstrap_writes_required: true`) — names the `.gitkeep` write and the `.gitignore` append about to land.
3. **Preference Essence Report** (Phase 1-2 output, condensed).
4. **Existing World Essence Map** (Standard Path) OR "no worlds scanned" stub.
5. **Niche Vacancy Map** (Phase 4 output, condensed).
6. **Phase 5/6 Seed Generation + Sanity-Pass Summary**.
7. **Phase 8 Distinctness-Check Log** (Standard Path) or "skipped" notice.
8. **Phase 9 Score Matrix + Max-Min Selection Trace**.
9. **Per-card section** for every finalist: NWP-id, slug, title, core sentence, niche summary, the card's full body, Canon Safety Check Trace (11a/11b), Phase 11e repairs (if any).
10. **Phase 11c-d Batch-level Audit**.
11. **Phase 12 Validation Test Results** (all 19, with rationale per PASS).
12. **Phase 11e Repair Log** (if any repairs fired).

**HARD-GATE fires here.** User may (a) approve as-is, (b) approve with drop-list of NWP-IDs, (c) request revisions (loop to named phase), (d) reject and abort.

**Post-drop cluster-coverage check** (only when option (b) was taken with a non-empty drop-list): after collecting the drop-list and BEFORE starting any writes, recompute Phase 11d World-Grammar Fidelity over the post-drop finalist set. If any `favored_*` cluster from the Phase 2 design grammar becomes uncovered as a result of the drops, surface the gap to the user with three explicit options before proceeding: (a) accept and proceed — the batch manifest's Phase 11 §11d block records the gap as informational, naming the affected cluster(s) and the dropped finalist(s) that previously covered them; (b) re-run Phase 9 selection with the missing-cluster constraint added — loops back to Phase 9, picks a substitute finalist from the seed pool, returns to Phase 14 after Phase 11 + Phase 12 re-validation; (c) revise the drop-list — replays the HARD-GATE response. Default action under Auto Mode without explicit user response: option (a) with the gap recorded. Any post-drop 11c (mutual distinctness) regressions must also be re-checked here, even though dropping cards cannot decrease mutual distinctness in practice.

On approval, write in this order — sequencing matters because the tool environment cannot guarantee transactional atomicity:

1. **Bootstrap first (only if required)**:
   - `world-proposals/.gitkeep` via direct `Write` (empty content).
   - Append two lines to repo-root `.gitignore`: `world-proposals/*` and `!world-proposals/.gitkeep`. Use direct `Edit` to append after the `briefs/*` block; if `.gitignore` does not exist, create it with the two lines via `Write`. Do not duplicate lines already present.
2. **Each non-dropped card next**: `world-proposals/NWP-NNNN-<slug>.md` via direct `Write`. Set `source_basis.user_approved: true` immediately before each write. `user_approved: true` here means "kept in batch after review", NOT "world has been created from this proposal".
3. **Batch manifest**: `world-proposals/batches/NWB-NNNN.md` via direct `Write` with `dropped_card_ids` populated and `user_approved: true`. Create `world-proposals/batches/` if absent (mkdir -p before write).
4. **INDEX.md update**: `Read` existing file (create with header `# World Proposal Cards` followed by a blank line if absent), append one line per non-dropped card sorted by NWP-NNNN ascending, write back via direct `Edit`.
5. **LINEAGE.md append last**: `Read` existing file (create with header `# World Proposals Lineage` followed by a blank line if absent), append one row per batch in the form `- NWB-NNNN | YYYY-MM-DD | seeds:N | finalists:M | dropped:K | written:W | clusters:<comma-list-of-Phase-2-favored_*-cluster-names-this-batch-covered>` so future Pre-flight Step 9 can re-derive cross-batch cluster coverage from lineage state. Sort rows by NWB-NNNN ascending; use direct `Edit` to insert at the correct ascending position. The clusters list reflects the SHIPPED finalists (post-drop) — dropped cards do NOT contribute to the clusters column.

All paths sit under root-level `world-proposals/` (or repo-root `.gitignore`); none are under `_source/`, so Hook 3 does not block these writes. Bootstrap-first sequencing means a partial-failure state has either bootstrap-without-cards or cards-without-index-or-lineage. **Recovery is manual.**

Report all written paths. Do NOT commit to git.

## Validation Rules This Skill Upholds

- **Rule 2 (No Pure Cosmetics)** — enforced at Phase 6 Sanity Pass, Phase 7 Propagation Skeletons, Phase 12 Test 5.
- **Rule 3 (No Specialness Inflation)** — enforced at Phase 6 (rejects "too many disconnected impossible facts" and "explains itself too completely") and Phase 12 Test 2 (Minimal Departure).
- **Rule 5 (No Consequence Evasion)** — enforced at Phase 7 (3-order consequence requirement) and Phase 12 Test 3 (≥8 domains affected).
- **Rule 7 (Preserve Mystery Deliberately)** — four-point enforcement: Phase 3 Standard Path (no transcription of forbidden M `unknowns` into essence map); Phase 10 (every card mandates one forbidden mystery with `future_resolution_safety: none`); Phase 11a (cross-world MR firewall, Empty-Worlds-conditional); Phase 11b (per-card forbidden-mystery presence verification, always runs).
- **Rule 11 (No Spectator Castes by Accident)** — enforced at Phase 7 Propagation Skeletons (≥3 leverage forms required in skeleton) and Phase 12 Test 18 (Spectator-Caste Leverage). Phase 10 deepening must materialize the leverage forms in Professions + Folk/Local Institutions + Crimes sections; Test 18 backstops the skeleton-to-card materialization.
- **Rule 12 (No Single-Trace Truths)** — enforced at Phase 10 Deepen Finalists (Local Documents + Ordinary-Life Proof + Native Story Procedures provide ≥2 register traces per primary-difference fact) and Phase 12 Test 19 (Multi-Register Truth).

Rule 1 (No Floating Facts) is structurally enforced at the schema level — every required card frontmatter and body section corresponds to a CF-Record-equivalent field. Recorded in the FOUNDATIONS Alignment table.

Rules 4 and 6 are N/A — see FOUNDATIONS Alignment table.

## Record Schemas

- **NWP Proposal Card** → `templates/proposal-card.md` (hybrid YAML frontmatter + markdown body). Frontmatter shape mirrors the source proposal's Phase 13 `final_proposals[]` schema. Body shape matches the source proposal's §"Proposal Card Template". The card body is directly consumable as `create-base-world --premise_path <path>`; the freeform-markdown-brief contract is preserved.
- **NWB Batch Manifest** → `templates/batch-manifest.md` (hybrid). Frontmatter and body schema documented in the Output section.
- **No CF Record / Change Log Entry templates ship with this skill.** The skill is canon-reading and emits no CF / CH records.

## FOUNDATIONS Alignment

| Principle | Phase | Mechanism |
|-----------|-------|-----------|
| Rule 1: No Floating Facts | Phase 10 + templates | Required card schema fields (`domains_affected`, `scope`, prerequisites, limits, consequences) mirror CF Record Schema; absence of any required field fails Phase 12 Test 17. |
| Rule 2: No Pure Cosmetics | Phase 6, 7, 12 | Sanity-pass triggers + propagation-skeleton requirements + Test 5. |
| Rule 3: No Specialness Inflation | Phase 6, 12 | Sanity-pass triggers + Test 2 (Minimal Departure). |
| Rule 4: No Globalization by Accident | N/A | Not applicable — pre-world proposals describe entire-world primary-difference + scope by definition. Rule-4 enforcement is downstream at `canon-addition` once the world exists. |
| Rule 5: No Consequence Evasion | Phase 7, 12 | 3-order consequence requirement + Test 3 (≥8 domains). |
| Rule 6: No Silent Retcons | N/A | Not applicable — canon-reading skill emits no Change Log Entry. Handoff to `create-base-world` (CH-0001 genesis) and `canon-addition` (subsequent CHs). |
| Rule 7: Preserve Mystery Deliberately | Phase 3, 10, 11a, 11b | Four-point enforcement. |
| Rule 11: No Spectator Castes by Accident | Phase 7, 10, 12 | ≥3 leverage forms in propagation skeleton; Ordinary-Life Proof (≥10 consequences across 10 domains); Phase 12 Test 18 (Spectator-Caste Leverage) verifies skeleton-to-card materialization. |
| Rule 12: No Single-Trace Truths | Phase 10, 12 | Local Documents + Ordinary-Life Proof + Native Story Procedures provide ≥2 register traces; Phase 12 Test 19 (Multi-Register Truth) verifies the trace count. |
| Tooling Recommendation | Pre-flight | FOUNDATIONS loaded; cross-world essence map via `get_context_packet` per world; Hook 2 redirects bulk `_source/` reads. |
| Mandatory World Files (atomic-source) | Pre-flight reading discipline | Reads existing worlds' atomic records via MCP; never writes `_source/` (Hook 3 blocks); card body's "future world" sections are forward-looking guidance for `create-base-world`. |
| Canon Fact Record Schema | Templates | Proposal-card body sections align structurally with future-world CF Record Schema fields so `create-base-world`'s Phase 8 (compose CF-0001) can lift content directly. |
| Change Control Policy | N/A | Not applicable — canon-reading skill emits no Change Log Entry. Handoff to `create-base-world` (CH-0001) and `canon-addition` (subsequent CHs). |
| Canon Layering | Phase 10 | Each card declares its primary-difference's intended Canon Layer. |
| Canonical Storage Layer | N/A | Not applicable — writes to root-level `world-proposals/`, NOT `_source/`. Hook 3 enforces. |

## Guardrails

- **Single batch per invocation.** Generates one batch of NWP cards; never creates a world (`create-base-world` does that), never modifies `docs/FOUNDATIONS.md`, never touches existing worlds' canon, never writes to `archive/` or `briefs/`.
- **World scope: meta-with-multi-world-read.** This skill is neither single-world (no `world_slug` argument; reads many worlds) nor all-worlds (does not operate ON any world's canon — only reads existing worlds for distinctness) nor pure meta (does read world state). It produces pre-world artifacts at root-level `world-proposals/` while reading ALL existing worlds. This is a deliberate scope, declared here so a future skill-creator audit doesn't try to coerce it into one of the three rigid labels.
- **Multi-world reading; no world writing.** The cross-world essence map is READ-ONLY across `worlds/*/`. Direct `Edit` / `Write` on any `worlds/<slug>/_source/<subdir>/*.yaml` is blocked by Hook 3. Existing worlds' `WORLD_KERNEL.md` / `ONTOLOGY.md` / `characters/` / `diegetic-artifacts/` / `proposals/` / `audits/` / `adjudications/` are also out-of-scope. Only writes are to root-level `world-proposals/` (+ one repo-root `.gitignore` append, first-run only).
- **Proposals are not canon; proposals are not worlds.** Every emitted card is a candidate for `create-base-world` to ingest as `premise_path`. A card's existence on disk is NOT equivalent to an accepted world. `source_basis.user_approved: true` on a card means "kept in batch after review", NOT world acceptance.
- **ID-collision abort.** If `allocate_next_id` errors or the resulting `NWP-NNNN-<slug>.md` would collide with an existing card, abort and ask the user to resolve before retrying. Never overwrite an existing card, batch manifest, or INDEX row.
- **First-run gitignore append is idempotent and gated.** The two-line append (`world-proposals/*` + `!world-proposals/.gitkeep`) only fires when both lines are absent from `.gitignore`. The append is gated by HARD-GATE Phase 14 — never pre-written at Pre-flight. Subsequent runs detect the entries and skip the bootstrap.
- **Empty Worlds Path is a degraded mode, not silent.** The DISTINCTNESS UNENFORCED banner at Phase 14 is mandatory when the path fired; suppressing it under Auto Mode is forbidden.
- **Interop seam with `create-base-world` is one-way and freeform.** A card's body parses as freeform markdown — `create-base-world`'s Phase 0 reads it as a premise brief, not as a structured schema. If `create-base-world`'s Phase 0 acquires a structured-input mode in the future, this skill's Phase 10 card body shape needs a parallel update; the coupling is informal, not byte-for-byte.
- **Cross-world Rule-7 firewall is the load-bearing safety check.** Phase 11a is the only firewall protecting against forbidden-mystery laundering across worlds. Future maintainers extending the cross-world reading surface (e.g., adding Phase 3 access to existing worlds' diegetic artifacts or adjudications) MUST extend Phase 11a in lockstep, or explicitly classify the new surface as out-of-scope for Rule 7 in the manifest notes.
- **HARD-GATE absoluteness.** Auto Mode does not relax the gate — invocation is not deliverable approval.
- **Worktree discipline.** All paths resolve from the worktree root if invoked inside a worktree.
- **Do NOT commit to git.** Writes land in the working tree only; the user reviews and commits.

## Final Rule

A world proposal batch is not written until every card declares a concrete impossible fact with three orders of consequence, at least seven institutions and four factions and ten ordinary-life consequences derived from the premise, at least one bounded forbidden mystery with `future_resolution_safety: none`, an equilibrium explanation, and either an explicit distinctness trace against every existing world OR a user-accepted DISTINCTNESS UNENFORCED flag; the batch has audited mutual finalist distinctness and world-grammar fidelity; and the user has approved the complete deliverable — and once written, each card is a candidate for `create-base-world` (to become a world), NEVER an established world or canonized fact itself.
