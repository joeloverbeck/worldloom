---
name: propose-new-characters
description: "Use when generating candidate character proposals for an existing worldloom world — option-card batches covering open niches, negative-space diagnoses, institutional lenses, artifact-author candidates, and mosaic mirrors. Each card is directly consumable as character-generation's character_brief_path while preserving a richer essence/niche/voice audit trail in the card body. Produces: NCP-NNNN-<slug>.md cards at worlds/<world-slug>/character-proposals/ + NCB-NNNN.md batch manifest at worlds/<world-slug>/character-proposals/batches/ + auto-updated character-proposals/INDEX.md. Mutates: only worlds/<world-slug>/character-proposals/ (never WORLD_KERNEL.md, INVARIANTS.md, CANON_LEDGER.md, characters/, or any other world-level canon or established-character file)."
user-invocable: true
arguments:
  - name: world_slug
    description: "Directory slug of an existing world under worlds/<world-slug>/. The skill aborts if the directory is missing or any mandatory world file (WORLD_KERNEL.md, INVARIANTS.md, ONTOLOGY.md, PEOPLES_AND_SPECIES.md, GEOGRAPHY.md, INSTITUTIONS.md, ECONOMY_AND_RESOURCES.md, EVERYDAY_LIFE.md, TIMELINE.md, CANON_LEDGER.md, OPEN_QUESTIONS.md, MYSTERY_RESERVE.md) is unreadable."
    required: true
  - name: parameters_path
    description: "Path to an optional markdown file declaring: desired number of proposals X (default 7); desired depth mix over {emblematic, elastic, round_load_bearing}; desired spread-vs-focus balance; target domains to deepen; taboo areas not to touch; desired ordinary-life vs exceptional balance; desired artifact-author share; under-modeled regions/species/institutions/classes to prioritize; maximum permitted overlap with existing niches; preferred story scale from {intimate, local, regional, transregional}; whether proposals should cluster or belong to separate mosaic zones; optional upstream_audit_path pointing to a continuity-audit report. If omitted, Phase 0 interviews the user. If provided but thin, Phase 0 runs a targeted gap-filler."
    required: false
---

# Propose New Characters

Generates a diversified batch of candidate character proposal cards for an existing worldloom world: reads all 13 mandatory files + the full Person Registry (existing character dossiers + diegetic-artifact authors/speakers/annotators + adjudicated figures), derives essence profiles for every registry entry, builds constellation + mosaic views of the world's character web, diagnoses filled / crowded / open niches, generates and scores seeds from negative space, runs a Canon Safety Check firewall per card, and writes option cards whose paths are directly consumable as `character-generation`'s `character_brief_path` while preserving the proposal's richer essence/niche/voice content in the card body. These cards are **not characters** — they are candidates for the user to review, select, and submit to `character-generation`.

<HARD-GATE>
Do NOT write any file — proposal card, batch manifest, INDEX.md update — until: (a) pre-flight check confirms worlds/<world-slug>/ exists, all 13 mandatory files (docs/FOUNDATIONS.md + 12 world files) are readable, the full Person Registry is loadable (characters/ dossiers + diegetic-artifacts/ frontmatter + adjudications/ PA-NNNN records), and no batch manifest or card-slug collision would occur; (b) Phase 10 Canon Safety Check passes for every surviving card with zero unrepaired violations across invariant conformance, Mystery Reserve firewall, distribution discipline, and person-registry non-duplication; (c) Phase 15 Final Validation Tests pass at both per-card and batch levels with zero failures; (d) the user has explicitly approved the Phase 16 deliverable summary (full batch: registry diagnosis, constellation+mosaic audit, niche-occupancy map, every card's content (frontmatter + body; full body prose on disk is mandatory per Phase 14 — review summaries may compress body prose when batch size makes full-prose presentation unwieldy, but the committed files must carry full body prose), every card's Canon Safety Check trace, every card's canon_assumption_flags status, any Phase 10e repairs that fired, any cards the user is dropping). The user's approval response may include a drop-list of card-IDs to exclude from the write; dropped cards are never written and are recorded in the batch manifest's dropped_card_ids. This gate is authoritative under Auto Mode or any other autonomous-execution context — invoking this skill does not constitute approval of the deliverable summary.
</HARD-GATE>

## Process Flow

```
Pre-flight Check  (resolve worlds/<world-slug>/; verify 13 mandatory files;
                   load Person Registry; allocate next NCB-NNNN and NCP-NNNN
                   range; scan character-proposals/ for slug collisions)
      |
      v
===== Generation Track =====================================================
      |
Phase 0 : Normalize the Request        (batch size, depth mix, spread/focus,
                                        density rule, taboos, story scale,
                                        upstream_audit merge)
      |
Phase 1 : Canonical Person Registry    (dossiers + artifact authors/speakers/
                                        annotators/correspondents/scribes/
                                        censors/patrons/copyists +
                                        historically-salient PA records +
                                        offstage-gravity figures)
      |
Phase 2 : Essence Profiles             (7-layer model per registry entry:
                                        world-position / function / pressure /
                                        access / epistemic / thematic / voice)
      |
Phase 3 : Character Web                (constellation view + mosaic view;
                                        dense clusters / isolated domains /
                                        monopoly windows / mosaic mirrors)
      |
Phase 4 : Filled / Crowded / Open      (per-entry niche signature;
           Niches                       hard-duplicate + crowded +
                                        adjacent + false-duplicate classes)
      |
Phase 5 : Negative-Space Diagnosis     (17 probes: institutions without
                                        insiders/dissenters/enforcers;
                                        regions without local voices;
                                        absent perceptual filters)
      |
Phase 6 : Generate Seeds               (3X-5X seeds from 16 high-yield
                                        families; reveal pressure, not
                                        eccentricity)
      |
Phase 7 : Character Engine per Seed    (goal/desire/obligation/mask/fear/
                                        shame/contradiction; forced-choice
                                        rule; capability path with cost)
      |
Phase 8 : Epistemic + Perceptual       (known firsthand / by rumor / cannot
           Filter                       know / wrongly believes; first
                                        Rule-7 gate)
      |
Phase 9 : Voice Signature              (social language / idiolect / metaphor
                                        sources / pressure speech / oral-
                                        written split; 5 voice tests)
      |
===== Canon Gate ===========================================================
      |
Phase 10: Canon Safety Check
          10a: Per-seed Invariant Conformance
          10b: Per-seed Mystery Reserve Firewall
          10c: Per-seed Distribution Discipline
               (tags seed canon-safe / canon-edge / canon-requiring)
          10d: Batch-level Registry Non-Duplication + Joint-Closure
          --any fail--> Phase 10e Repair Sub-Pass
                         (narrow / reclassify / stabilize / embed / drop /
                          --unrepairable--> loop to Phase 6)
      |
===== Selection Track ======================================================
      |
Phase 11: Score and Select             (10 dimensions; max-min selection,
                                        NOT raw total)
      |
Phase 12: Filter Out Bad Proposals     (13 rejection triggers; each logged
                                        with trigger + diagnosis target)
      |
Phase 13: Diversify Final Batch        (10 composition slots; 8 contrast
                                        axes; empty slots are diagnostic
                                        signals)
      |
===== Composition + Validation + Commit ====================================
      |
Phase 14: Compose Proposal Cards       (materialize NCP-NNNN card schema:
                                        character-generation-compatible
                                        frontmatter + dossier-mirrored body
                                        + Niche Analysis + Canon Safety
                                        Check Trace)
      |
Phase 15: Final Validation Tests       (12 tests: 9 per-card + 3 batch-level)
      |
    pass
      |
      v
Phase 16: Commit (HARD-GATE approval with drop-list --> atomic write of
           surviving cards + NCB-NNNN.md manifest + INDEX.md update)
```

## Inputs

### Required
- `world_slug` — string — directory slug of an existing world under `worlds/<world-slug>/`. Pre-flight verifies the directory exists and all 13 mandatory files are readable, and loads the full Person Registry.

### Optional
- `parameters_path` — filesystem path — markdown file declaring: desired number of proposals X (default 7); depth_mix over `{emblematic, elastic, round_load_bearing}`; spread_vs_focus balance; target_domains to deepen; taboo_areas to avoid; ordinary_vs_exceptional_mix; artifact_author_share; under_modeled_priority list; max_overlap_allowed against existing niches; story_scale_mix over `{intimate, local, regional, transregional}`; mosaic_cluster_preference (cluster vs separate mosaic zones); optional `upstream_audit_path` pointing to a continuity-audit report whose person-registry findings short-circuit Phase 5 Negative-Space Diagnosis. If omitted, Phase 0 interviews the user. If provided but thin, Phase 0 runs a targeted gap-filler.

## Output

- **Proposal cards** at `worlds/<world-slug>/character-proposals/NCP-NNNN-<slug>.md` — one file per surviving card, hybrid YAML frontmatter + markdown body. Frontmatter carries `character-generation`'s required + optional input fields (so the card path is directly consumable as `character-generation`'s `character_brief_path`) plus NCP-specific keys (`proposal_id`, `batch_id`, `niche_summary`, `occupancy_strength`, `depth_class`, `scores`, `canon_assumption_flags`, `recommended_next_step`, `critic_pass_trace`, `canon_safety_check`, `source_basis`, `notes`). Body sections mirror `character-generation`'s dossier schema (Material Reality, Institutional Embedding, Epistemic Position, Goals and Pressures, Capabilities, Voice and Perception, Contradictions and Tensions, Likely Story Hooks) PLUS a **Niche Analysis** section (7-layer essence trace + occupancy-strength justification + nearest existing occupants + decisive differences) PLUS a **Canon Safety Check Trace** section (Phase 10 audit per sub-phase). Matches `templates/proposal-card.md`.
- **Batch manifest** at `worlds/<world-slug>/character-proposals/batches/NCB-NNNN.md` — hybrid YAML frontmatter (`batch_id`, `world_slug`, `generated_date`, `parameters`, `registry_summary`, `card_ids`, `dropped_card_ids`, `user_approved`) + markdown body (Registry Summary, Constellation + Mosaic audit, Niche-Occupancy Map, Phase 5 Negative-Space Diagnosis, Phase 6 Seed Generation Log, Phase 11 Score Matrix, Phase 12 Rejected-Candidate Log, Phase 13 Diversification Audit with 10-slot table, Phase 10d Batch-level Check Trace, Phase 10e Repair Log, Phase 15 Test Results). Matches `templates/batch-manifest.md`.
- **INDEX.md update** at `worlds/<world-slug>/character-proposals/INDEX.md` — one line per non-dropped card in the form `- [<title>](NCP-NNNN-<slug>.md) — <depth_class> / <intended_narrative_role> / <canon_assumption_flags.status>, batch NCB-NNNN`, sorted by NCP-NNNN ascending. Created if absent.

**No canon-file mutations.** This skill never writes to `WORLD_KERNEL.md`, `INVARIANTS.md`, `ONTOLOGY.md`, `TIMELINE.md`, `GEOGRAPHY.md`, `PEOPLES_AND_SPECIES.md`, `INSTITUTIONS.md`, `ECONOMY_AND_RESOURCES.md`, `MAGIC_OR_TECH_SYSTEMS.md`, `EVERYDAY_LIFE.md`, `CANON_LEDGER.md`, `OPEN_QUESTIONS.md`, or `MYSTERY_RESERVE.md`. **No `characters/` mutations.** This skill never writes to `worlds/<world-slug>/characters/`, `characters/INDEX.md`, or any existing character dossier. No Canon Fact Record emitted. No Change Log Entry emitted. Each card is a *candidate*; it becomes a character only when `character-generation` accepts its path as `character_brief_path` in a separate run, and even then the resulting dossier is what `character-generation` writes — this skill's card is archival input, not the character itself.

## World-State Prerequisites

Before this skill acts, it MUST load (per FOUNDATIONS §Tooling Recommendation — non-negotiable):

### Reading mature world files and mature Person Registries

As worlds mature, any world file can cross the Read tool's token limit — `CANON_LEDGER.md` is the first to do so (one entry per accepted CF), but `INSTITUTIONS.md`, `MYSTERY_RESERVE.md`, `EVERYDAY_LIFE.md`, and later `TIMELINE.md` and `GEOGRAPHY.md` follow. The Person Registry adds two more surfaces that can bloat: `characters/` (one file per existing dossier) and `diegetic-artifacts/` (one file per artifact, each carrying author/speaker/annotator metadata).

When a prescribed Read returns a token-limit error, use the same selective-reading pattern documented in `character-generation` §Reading mature world files:
1. **Grep for structural anchors** — `^##[^#]` for section layout; `^id:` for CF entries in `CANON_LEDGER.md`; `^## M-` for MR entries; `^character_id:` for dossier IDs across `characters/`; `^artifact_id:` (or equivalent) for `diegetic-artifacts/` entries.
2. **Read targeted ranges** with `offset`/`limit` — the CFs whose distribution blocks bear on the proposals under consideration; the INSTITUTIONS axes that would embed the proposed seeds; the MR entries whose unknown-blocks plausibly touch the seeds' epistemic surface; the existing dossiers whose niche signatures are nearest to any generated seed; the diegetic-artifact frontmatter entries whose author/speaker figure is already a registry-occupying persona.
3. **Do not attempt a single full Read** when the size warning triggers — selective reading is the expected mode once enough canon accumulates, and the audit trail (what sections were read, why) is as load-bearing as any other Phase 10 record.

**Character dossier anchors**: Mature dossiers (often >25k tokens after multi-season accumulation) use the same pattern. Grep `^character_id:` to locate dossier IDs across `characters/`; within a single dossier, grep `^## ` for body-section headers (Material Reality / Institutional Embedding / Epistemic Position / Goals and Pressures / Capabilities / Voice and Perception / Contradictions and Tensions / Likely Story Hooks / Canon Safety Check Trace) and read the sections Phase 2 essence-extraction requires via `offset`/`limit` — typically Institutional Embedding + Voice and Perception + Capabilities + Epistemic Position are the minimum for niche-signature derivation; other sections load only if a specific proposal-seed's nearest-occupant comparison requires deeper context.

This pattern applies uniformly across every file in §World-State Prerequisites. Per-file entries below cross-reference it but do not repeat the mechanism.

### Mandatory world files — always loaded at Pre-flight
- `docs/FOUNDATIONS.md` — cited throughout (Rule 2 at Phases 2, 7, 12; Rule 3 at Phase 7; Rule 4 at Phase 10c; Rule 7 at Phase 10b; Canon Layers at Phase 10; Ontology Categories at Phase 2 essence-profiling).
- `worlds/<world-slug>/WORLD_KERNEL.md` — genre/tonal/chronotope contract (Phase 0 parameter validation; Phase 9 voice register calibration; Phase 11 thematic-freshness scoring).
- `worlds/<world-slug>/INVARIANTS.md` — Phase 10a invariant conformance (every implied capability, belief, and knowledge claim in every seed tested).
- `worlds/<world-slug>/ONTOLOGY.md` — Phase 2 essence profiles attach registry entries to ontology categories; Phase 7 capability classification per seed.
- `worlds/<world-slug>/PEOPLES_AND_SPECIES.md` — Phase 2 essence (body/senses/lifespan/social density) + Phase 8 seed perceptual filters.
- `worlds/<world-slug>/GEOGRAPHY.md` — Phase 2 world-position layer + Phase 5 regions-without-local-voices + Phase 7 material grounding.
- `worlds/<world-slug>/INSTITUTIONS.md` — Phase 2 institutional-embedding checklist + Phase 5 institutions-without-insiders + Phase 7 per-seed embedding + Phase 13 diversification.
- `worlds/<world-slug>/ECONOMY_AND_RESOURCES.md` — Phase 2 livelihood/debt + Phase 7 capability cost + Phase 13 coverage.
- `worlds/<world-slug>/EVERYDAY_LIFE.md` — Phase 2 ordinary-life baseline + Phase 5 (labor systems without a character lens) + Phase 7 seed vocabulary + Phase 13 ordinary-life slot.
- `worlds/<world-slug>/TIMELINE.md` — Phase 2 historical context + Phase 5 residues-without-carriers + Phase 7 seed temporal grounding.
- `worlds/<world-slug>/CANON_LEDGER.md` — Phase 10c distribution discipline; use §Reading mature world files selective-reading, grepping `^id:` and reading targeted CFs by line-range.
- `worlds/<world-slug>/MYSTERY_RESERVE.md` — Phase 10b firewall (non-negotiable; empty firewall audit list on non-empty MR fails Phase 15 Test 5).
- `worlds/<world-slug>/OPEN_QUESTIONS.md` — Phase 8 seed epistemic position (a seed may not "know" anything the world has deliberately not yet decided).

### Mandatory Person Registry — always loaded at Pre-flight
- `worlds/<world-slug>/characters/INDEX.md` — enumerates existing dossier slugs.
- `worlds/<world-slug>/characters/<char-slug>.md` for every dossier — frontmatter + all prose-body sections. Mature worlds may require reading dossiers in slug-sorted batches per §Reading mature world files. Phase 1 Registry consumes frontmatter + body-section headers; Phase 2 Essence extraction consumes body sections for function / pressure / access / epistemic / thematic / voice layers.
- `worlds/<world-slug>/diegetic-artifacts/INDEX.md` — enumerates artifact entries.
- `worlds/<world-slug>/diegetic-artifacts/<da-slug>.md` frontmatter for every artifact — author identity, attributed speakers, correspondents, scribes, annotators, censors, patrons, copyists. Artifact bodies are NOT required at Pre-flight; only metadata. Artifact bodies are read selectively at Phase 2 when the author or speaker is being profiled as a registry-occupying persona.
- `worlds/<world-slug>/adjudications/` directory listing + every `PA-NNNN-accept*.md` frontmatter — figures canonized via `canon-addition`.

### Selectively loaded
- `worlds/<world-slug>/MAGIC_OR_TECH_SYSTEMS.md` — Phase 7 + 10c, loaded only if Phase 0 parameters or Phase 6 seed generation touch magical or technological capability. Skipped otherwise.
- `worlds/<world-slug>/proposals/INDEX.md` — informational only: if present, pending canon-fact proposals (PR-NNNN) are cross-referenced so an NCP card's `canon_assumption_flags.implied_new_facts` can point to a pending PR-NNNN rather than recommend a duplicate.

### Pre-flight
- `worlds/<world-slug>/character-proposals/` directory listing — for `NCP-NNNN` allocation and slug-collision check. Read `INDEX.md` if present. Directory created at Phase 16 commit time if absent.
- `worlds/<world-slug>/character-proposals/batches/` directory listing — for `NCB-NNNN` allocation.
- `parameters_path` contents (if provided) — read once at Phase 0.
- `upstream_audit_path` contents (if declared inside `parameters_path`) — read once at Phase 0.

### Abort conditions
- `worlds/<world-slug>/` missing → abort: "World directory not found. Run `create-base-world` first, or supply a valid `world_slug`."
- Any of the 13 mandatory files missing or unreadable → abort naming the specific file.
- `worlds/<world-slug>/characters/` or `worlds/<world-slug>/diegetic-artifacts/` missing → **do NOT abort**; treat as empty registries. A world with no existing dossiers or artifacts is a valid starting state (Phase 0 density rule applies character-sparse mode).
- Proposal ID or slug collision at Pre-flight allocation → abort: "Proposal ID collision — re-run after investigating `character-proposals/`. This skill never overwrites an existing card or batch manifest."

## Pre-flight Check

1. Verify `worlds/<world-slug>/` exists; abort if absent.
2. Verify all 13 mandatory files readable; abort naming the specific file if any is missing.
3. Load `docs/FOUNDATIONS.md` + 12 world files (selective-reading when size warnings trigger).
4. Load Person Registry: `characters/INDEX.md` + every dossier; `diegetic-artifacts/INDEX.md` + every artifact frontmatter; every `adjudications/PA-NNNN-accept*.md` frontmatter. Missing `characters/` or `diegetic-artifacts/` treated as empty registry.
5. Scan `worlds/<world-slug>/character-proposals/` for highest `NCP-NNNN` (grep `^proposal_id:` across card frontmatters); scan `character-proposals/batches/` for highest `NCB-NNNN`. Allocate `next_batch_id = highest_ncb + 1` and `next_ncp_range = [highest_ncp + 1 .. highest_ncp + X]`.
6. If any slug-derivable filename collides with an existing card, abort.
7. Selectively load `worlds/<world-slug>/proposals/INDEX.md` if present.

## Phase 0: Normalize the Request

Parse `parameters_path` if provided; otherwise interview. Extract:
- `batch_size` (X; default 7)
- `depth_mix` — distribution over `{emblematic, elastic, round_load_bearing}`
- `spread_vs_focus` — wide coverage vs concentrated lens on 1-2 domains
- `density_rule_mode` — auto-detect from registry size: <5 dossiers = character-sparse (prioritize anchors + under-modeled domains); 5-20 = balanced; >20 = character-dense (prioritize negative space + bridge figures). Power users override via `parameters_path.density_rule_mode`.
- `target_domains` — explicit domain list to deepen
- `taboo_areas` — free-form
- `ordinary_vs_exceptional_mix` — ratio hint
- `artifact_author_share` — desired fraction of artifact-native authors
- `under_modeled_priority` — specific regions/species/institutions/classes
- `max_overlap_allowed` — threshold against existing niches (default: crowded permitted, hard-duplicates forbidden)
- `story_scale_mix` — distribution over `{intimate, local, regional, transregional}`
- `mosaic_cluster_preference` — cluster vs separate mosaic zones
- `upstream_audit_path` — optional; load if set

**Conditional world-file load**: if target_domains or the referenced audit touches magical/technological systems, load `MAGIC_OR_TECH_SYSTEMS.md`.

**Rule**: Never advance to Phase 1 with unresolved required parameters.

**FOUNDATIONS cross-ref**: Tooling Recommendation (binding user intent to loaded world state).

**Auto Mode**: Under Auto Mode (or any other autonomous-execution context), if the parameters brief is provided-but-thin (some parameters absent), proceed with inferred defaults for absent parameters — infer `density_rule_mode` from registry size (per the rule above), infer `story_scale_mix` from world-kernel geography baseline where unambiguous (e.g., regional default for heartland-centric worlds), fall back to explicit skill defaults for other parameters (X=7, `max_overlap_allowed`=crowded-permitted-hard-duplicates-forbidden, `mosaic_cluster_preference`=spread-unless-told-otherwise). Document each inferred default and its inference basis in the batch manifest's `parameters:` block so the audit trail records which parameters the user authored and which the skill inferred. Do NOT block on interactive gap-filling under Auto Mode. If a parameter is genuinely undefinable from context (e.g., `taboo_areas` with no signal), record as explicitly "none declared" rather than fabricating.

## Phase 1: Build Canonical Person Registry

Construct a single registry of all person-like entities. For each entry track: `source_type` (dossier / artifact-author / artifact-speaker / artifact-annotator / artifact-correspondent / artifact-scribe / artifact-censor / artifact-patron / artifact-copyist / historical-salient-PA / offstage-gravity), `occupancy_strength` (hard / soft / ambient per proposal taxonomy), `scope`, `living_dead_mythologized_uncertain`, `has_stable_voice_worldview_position`.

**Rule**: A sermon writer with a clear ideology, access pattern, and speech register occupies a niche even without a formal dossier. Registry inclusion is determined by narrative-gravity, not by file-existence.

**Mandatory critic pass**: Continuity Archivist (recorded in each card's `critic_pass_trace.phase_1_archivist`).

**FOUNDATIONS cross-ref**: Canon Layers §Soft / Contested — artifact-author personas are contested-canon voices; registry tracks their position without promoting them to hard canon.

## Phase 2: Derive Existing Character Essence Profiles

For every registry entry, produce a 7-layer essence profile: world-position / function / pressure / access / epistemic / thematic / voice. Plus: `attention_weight` (lead / recurring / local / historical / artifact-only), `depth_class` (emblematic / elastic / round), `institutional_embedding_checklist` (household-kin-clan / law / religion / employer-guild-lord-state / debt / taboo / education-apprenticeship / inheritance / policing-violence), `artifact_affordance`, `likely_story_scale`, `nearest_mirrors_or_foils`.

**Capability Validation per registry entry**: for each capability, record how_learned / cost / enabling_institution / ordinary_or_unusual / bodily_or_species_constraints.

**Rule**: Compare future proposals against formalized essence profiles only — never against vague impressions.

**Mandatory critic pass**: Character Essence Extractor.

**FOUNDATIONS cross-refs**: Rule 2 (institutional embedding checklist required); Ontology Categories.

## Phase 3: Build Story-World Character Web

Two simultaneous views.

**Constellation view** — existing registry entries linked by kinship / patronage / rivalry / debt / mentorship / desire / conflict / co-presence / contrast / moral-opposition / thematic-analogy.

**Mosaic view** — registry entries linked even if they never meet, through shared institution / trade route / species pressure / border / taboo system / relic economy / war residue / archive chain / artifact circulation / rumor ecology / mirrored contradictions across regions.

Required outputs: dense clusters; isolated domains; overrepresented clusters; monopoly windows (domains visible through only one registry entry); mosaic mirrors (separated entries in parallel positions).

**Rule**: Characters need not know each other to compete for the same story-world niche.

**Mandatory critic pass**: Constellation / Mosaic Analyst.

## Phase 4: Determine Filled / Crowded / Open Niches

Per registry entry, compute a niche signature from the 7-layer essence. Classify future spaces as filled / crowded / adjacent / open.

**Hard Duplicate**: substantial match on function + world-position-and-institution + pressure + access + epistemic + voice-family.

**Crowded Niche**: several entries reveal the same world window from similar pressure/voice positions.

**Adjacent Niche**: shared domain, differs on function OR power-relation OR pressure-engine OR perception OR voice OR thematic-charge OR artifact-affordance.

**False Duplicate**: never reject a proposal solely for shared profession / species / region / age_band / gender / religious_alignment.

**Optional weighted heuristic**: function+pressure-relation 25% / world-position+institution 20% / pressure-engine 20% / access 15% / epistemic 10% / voice 10%. Thresholds 0.75+ duplicate / 0.55-0.74 crowded / 0.35-0.54 adjacent / <0.35 distinct. **Rule**: Never use the score without human-readable justification recorded in the card's Niche Analysis section.

**FOUNDATIONS cross-ref**: Rule 4 (first guard against silently universalizing a single character's niche).

## Phase 5: Negative-Space Diagnosis

Run 17 probes against the registry + world state:
1. Institutions without insiders
2. Institutions without dissenters / corrupters / victims / enforcers
3. Regions without local voices
4. Classes present only as abstractions
5. Species present but not yet thinking differently on the page
6. Missing age bands or kinship positions
7. Pressures without witnesses / profiteers / healers / deniers / translators / archivists
8. Themes monopolized by one character only
9. Artifact genres without plausible authors
10. Knowledge systems without representatives
11. Absent perceptual filters
12. Absent voice families
13. Absent border positions
14. Ordinary labor systems without a character lens
15. Historical residues without carriers
16. Mystery-adjacent vantage points without an epistemic inhabitant (careful: targets vantage, NOT mystery-resolving knowledge — Phase 10b firewall still applies)
17. Monopoly-window domains (Phase 3 output) risking single-point-of-failure

If `upstream_audit_path` was loaded at Phase 0, merge its person-thinness findings; skip overlapping probes.

**Rule**: Negative space is "who must exist if this world is real, but is still missing from the cast" — not "who is cool."

**Mandatory critic pass**: Institutional + Everyday-Life Critic.

**FOUNDATIONS cross-ref**: Rule 2 (each probe is a pure-cosmetics guard).

## Phase 6: Generate Proposal Seeds

Generate 3X-5X seeds before selection. Draw from 16 high-yield families: institution insider / institution dissenter / ordinary-life witness / boundary broker / taboo technician / gatekeeper / black-market adapter / pressure enforcer / pressure sufferer with unusual clarity / archive-memory carrier / ideological misinterpreter / regional mirror / species-body specialist / artifact-native author / historical residue carrier / scale bridge.

**Rule**: Prefer seeds that reveal existing world pressure over seeds that merely add eccentricity.

Each seed is tagged with: `diagnosis_target` (which Phase 5 probe it addresses), `proposal_family`, `depth_class_hint`, `story_scale_hint`.

**Floor semantics**: The 3X-5X count is a PRE-MERGE floor — the raw seed-generation output before Phase 6 pre-shortlist merges (redundant-candidate consolidation), Phase 7-9 engine rejections, Phase 10 canon-gate rejections, or Phase 12 trigger rejections reduce the active shortlist. If the post-rejection shortlist at Phase 11 entry falls below 3X (but at or above X — the requested batch size), continue; the max-min selection operates on the reduced shortlist without regeneration. Loop back to Phase 6 for regeneration ONLY if the post-rejection shortlist falls below X itself (cannot fill the requested batch size) OR if the remaining candidates fail to cover the Phase 13 composition slots adequately (empty slots must be diagnostic signals, not forced fills).

## Phase 7: Build Character Engine per Seed

For each seed, specify: short_term_goal / long_term_desire / unavoidable_obligation / external_pressure / public_mask / private_appetite / social_fear / private_shame / central_contradiction / capability_path / cost_of_competence / relation_to_law_taboo_debt / repeated_forced_choice.

**Forced-Choice Rule**: Every strong proposal must answer "What choice does this person get forced into again and again by the world?" Draw from duty-vs-appetite / loyalty-vs-evidence / kinship-vs-law / purity-vs-survival / ambition-vs-bodily-limit / profit-vs-contamination / belief-vs-observed-reality / local-belonging-vs-mobility / secrecy-vs-intimacy — or name a world-specific tension from `WORLD_KERNEL.md` core pressures.

**Rule**: A proposal without repeatable choice pressure is a biography fragment, not a character niche.

**FOUNDATIONS cross-refs**: Rule 2 (world-produced pressures); Rule 3 (capability_path has cost_of_competence); World Kernel §Core Pressures.

## Phase 8: Build Epistemic and Perceptual Filter

Define per seed: known_firsthand / known_by_rumor / cannot_know / wrongly_believes / vocabulary_for_major_phenomena / missing_categories / notices_first / scans_for_under_stress / consistently_overlooks / shame-trade-training-trauma-visibility / body-species-sensory-emphasis.

**Rule**: "Notices first" and "overlooks" arise from body, work, fear, and environment — never random flavor.

**Rule (Rule 7 first gate)**: No item in `known_firsthand` or `wrongly_believes` may match any MR entry's `disallowed cheap answers`. This is the cheap early catch before the formal Phase 10b firewall.

**Mandatory critic pass**: Epistemic / Focalization Critic.

**FOUNDATIONS cross-ref**: Rule 7 (first of two enforcement points; Phase 10b is the formal-audit point).

## Phase 9: Build Voice Signature

Define per seed across five levels:

1. **Social language** — class / region / age-generation / profession-jargon / religious-ideological / politeness / honorific / swearing logic.
2. **Idiolect** — favorite words / sentence shapes / compression-vs-ramble / assertive-vs-hedged / literal-vs-figurative / clipped-vs-musical / interruption / repair / pacing.
3. **Metaphor sources** — which domains (weather / animals / ritual / machinery / bureaucracy / farming / trade / sickness / warfare / family / navigation / craft labor) the character draws from AND which never appear AND which words/ideas are avoided on purpose.
4. **Pressure speech** — how they sound lying / persuading / threatening / teaching / begging / grieving / hiding-ignorance / performing-status / writing-formally / writing-privately.
5. **Oral / written split** — if literate, distinguish speech-voice / formal-writing / intimate-prayer / public-testimony.

**Voice Rules**: no accent-spelling as primary differentiator; no writer-voice across all characters; no catchphrase-only voice.

**Mandatory voice tests per seed**: swap test / motive test / mode test / quote test / artifact-author test.

**Rule**: No two final proposals share the same voice family unless deliberate contrast within the same institution or kin group is the explicit point.

**Mandatory critic passes**: Sociolinguistic Voice Critic + Artifact Authorship Critic.

**FOUNDATIONS cross-ref**: World Kernel §Tonal Contract.

## Phase 10: Canon Safety Check

Four independent sub-phases with independent failure modes. All four MUST run per seed; failure on any triggers Phase 10e Repair Sub-Pass.

### Phase 10a: Per-seed Invariant Conformance

For every capability, belief, knowledge claim, material-reality fact, and perception trait in the seed, test against every invariant in `INVARIANTS.md`. Record each invariant id into the seed's `canon_safety_check.invariants_respected`, pass or fail.

Fail triggers: direct ontological / causal / distribution / social / aesthetic-thematic invariant violation.

**Rule**: Never silently narrow or drop an invariant. Failure → Phase 10e.

### Phase 10b: Per-seed Mystery Reserve Firewall

For every MR entry, check whether its `what is unknown` overlaps the seed's `known_firsthand`, `known_by_rumor`, or `wrongly_believes`. Record every checked MR id into `canon_safety_check.mystery_reserve_firewall` regardless of overlap — the list is proof-of-check audit trail.

For each overlap: seed MAY hold folk-belief or rumor about the mystery (MR entry's `common in-world interpretations` ARE permitted in `known_by_rumor` / `wrongly_believes`); seed MUST NOT contain any `disallowed cheap answers` item in `known_firsthand` or `wrongly_believes`.

Fail triggers: `known_firsthand` answers an MR entry's unknown; `wrongly_believes` matches a disallowed cheap answer (even as "they're wrong about it" — still commits the forbidden answer to canon-adjacent text).

**Rule**: Empty firewall audit list on a non-empty MR fails Phase 15 Test 5. Silent firewall = no firewall.

### Phase 10c: Per-seed Distribution Discipline

For each capability implied by the seed, look up matching CFs in `CANON_LEDGER.md` by type. Record every consulted CF id into `canon_safety_check.distribution_discipline.canon_facts_consulted` regardless of outcome.

Tag the seed's `canon_assumption_flags.status` as one of:
- **canon-safe** — every implied capability fits a CF's `who_can_do_it` OR is ordinary-person scope with no CF opposition; every institutional embedding is derivable from loaded world state.
- **canon-edge** — the seed leans on interpretation / distribution assumptions / lightly implied lore; each leaning-point listed in `canon_assumption_flags.edge_assumptions`.
- **canon-requiring** — the seed implies a new fact / institution / capability / law / taboo / resource pattern / historical residue not present in current canon. Each implied new fact listed in `canon_assumption_flags.implied_new_facts` with a preferred route (`direct_to_canon_addition` / `first_through_propose_new_canon_facts`).

Fail triggers for 10c itself (NOT for canon-edge/canon-requiring tagging, which is routing metadata): seed has a capability in a CF's `who_cannot_easily_do_it` without a Phase-7-derived institutional embedding justifying the exception; seed's claimed capability falls outside `EVERYDAY_LIFE.md` ordinary baseline without a Phase 7 capability_path.

**Rule**: canon-edge and canon-requiring are NOT failures — they are routing metadata. The seed proceeds to Phase 11 with the tag attached. Failure at 10c means the seed's capability story is structurally broken, not that it implies new canon.

**FOUNDATIONS cross-ref**: Rule 4 (distribution discipline); Change Control Policy (implied_new_facts routing preserves the adjudication boundary — this skill never canonizes, only flags).

### Phase 10d: Batch-level Registry Non-Duplication + Joint-Closure

Run four batch-level checks across all seeds surviving 10a+10b+10c:
- **Registry non-duplication**: no seed's niche signature hard-duplicates any registry entry's niche signature.
- **Pairwise hard-duplication**: no two seeds in the batch hard-duplicate each other.
- **Joint mystery-closure**: no two seeds, taken together, close one MR entry that neither alone would.
- **Joint registry-duplication**: no two seeds, taken together, hard-duplicate one existing registry entry.

Record results into the batch manifest's Phase 10d trace table.

**Rule**: Joint-closure cases trigger Phase 10e on both seeds.

### Phase 10e: Repair Sub-Pass

On any 10a/b/c/d failure, attempt in order:
1. **Narrow the trait** — reduce capability scope, add bottlenecks, add costs.
2. **Reclassify knowledge** — move `known_firsthand` item to `known_by_rumor` or to "holds no strong view."
3. **Add a stabilizer** — state why the exception does not universalize.
4. **Add institutional embedding** — retroactively bind the trait to a specific `INSTITUTIONS.md` entity (plausible, not invented).
5. **Drop the seed from the batch** — slot becomes empty (Phase 13 handles).
6. **Loop to Phase 6 with flagged seed-slot to regenerate** — if no repair preserves intent.

Each repair records into the card's `notes` field and the batch manifest's Phase 10e Repair Log.

**FOUNDATIONS cross-ref**: Rule 3 (stabilizers must name concrete mechanisms).

## Phase 11: Score and Select

Score each canon-gate-surviving seed on 10 dimensions (1-5): world_rootedness / niche_distinctiveness / pressure_richness / voice_distinctiveness / ordinary_life_relevance / artifact_utility / thematic_freshness / expansion_potential / canon_burden (LOWER better) / overlap_risk (LOWER better).

**Aggregate**: (world_rootedness + niche_distinctiveness + pressure_richness + voice_distinctiveness + ordinary_life_relevance + artifact_utility + thematic_freshness + expansion_potential) − (canon_burden + overlap_risk). Range [-10, +40].

**Pairwise distance axes** against existing registry AND against other candidates: geography / institution / species-body / power-relation / pressure-cluster / knowledge-access / perception-filter / voice-family / artifact-affordance / likely-story-scale.

**Selection via max-min** (NOT raw total):
1. Take highest-value viable seed first.
2. For each next choice, prefer the candidate maximizing combined {quality_score + min_distance_from_selected + min_redundancy_vs_registry}.
3. Continue until X proposals are selected.

**Rule**: A slightly lower-scoring proposal may be preferable if it opens a genuinely new world window.

**Mandatory critic pass**: Theme / Tone Critic.

## Phase 12: Filter Out Bad Proposals

Apply 13 rejection triggers. Each triggered rejection logged to batch manifest's Phase 12 Rejected-Candidate Log with trigger name + seed content + diagnosis target:
1. Differs only cosmetically from an existing registry entry
2. Profession clone
3. Moral inversion of an existing character
4. Exists only to dump lore
5. Bypasses world constraints
6. No institutional embedding
7. No ordinary-life reality
8. No repeatable choice pressure
9. Speaks in generic author voice
10. Would write the same artifacts as an existing registry entry with no new angle
11. Duplicates the same pressure cluster and voice family as another selected proposal
12. Requires massive new canon for little gain
13. Turns species or body into costume only

## Phase 13: Diversify the Final Batch

Fill 10 composition slots (left-to-right fill priority when X < 10):
1. Ordinary-life lens
2. Institution insider
3. Boundary broker
4. Pressure enforcer / gatekeeper
5. Sufferer or witness with low formal power
6. Artifact-native author
7. Ideological misreader or dissenter
8. Regionally distant mosaic figure
9. Body / species-differentiated lens
10. Potentially load-bearing round character

Also vary across 8 contrast axes: elite↔common / settled↔mobile / literate↔oral / orthodox↔heterodox / lawful↔illicit / old↔young / kin-tied↔socially-detached / local↔transregional.

**Rule**: At least some proposals are mirrors or foils of existing registry entries; at least some belong to separate mosaic zones. Empty slots are diagnostic signals (recorded with rationale), not bugs. Filling an empty slot with a lower-scoring candidate just to avoid the empty state is forbidden.

Record filled + empty slots in the batch manifest's Phase 13 Diversification Audit table.

## Phase 14: Compose Proposal Cards

Materialize each surviving seed into the `NCP-NNNN-<slug>.md` card schema. No new content is generated here — this is format only.

**Frontmatter**: `character-generation`'s required inputs (`current_location`, `place_of_origin`, `date`, `species`, `age_band`, `social_position`, `profession`, `kinship_situation`, `religious_ideological_environment`, `major_local_pressures`, `intended_narrative_role`) + optional inputs (`central_contradiction`, `desired_emotional_tone`, `desired_arc_type`, `taboo_limit_themes`) — so the card path is directly usable as `character_brief_path`. PLUS NCP-specific keys: `proposal_id`, `batch_id`, `slug`, `title`, `niche_summary`, `occupancy_strength` (`current_state`, `nearest_existing_occupants`, `overlap_type`, `decisive_differences`), `depth_class`, `proposal_family`, `diagnosis_target`, `scores`, `score_aggregate`, `canon_assumption_flags`, `recommended_next_step` (`generate_immediately` / `reserved_future_seed` / `generate_after_canon_adjudication`), `critic_pass_trace` (populated per-seed with one-line notes at template slots `phase_1_continuity_archivist`, `phase_2_essence_extractor`, `phase_3_constellation_mosaic`, `phase_5_institutional_everyday`, `phase_8_epistemic_focalization`, `phase_9_voice_critic`, `phase_9_artifact_authorship`, `phase_11_theme_tone` per the proposal-card template's `critic_pass_trace` frontmatter block), `canon_safety_check`, `source_basis`, `notes`.

**Body**: `character-generation` dossier sections (Material Reality / Institutional Embedding / Epistemic Position / Goals and Pressures / Capabilities / Voice and Perception / Contradictions and Tensions / Likely Story Hooks) — each populated from Phase 7-9 outputs — PLUS a **Niche Analysis** section (7-layer essence trace + occupancy-strength justification + nearest occupants + decisive differences) PLUS a **Canon Safety Check Trace** section (Phase 10a/b/c/d audit prose).

**Defense-in-depth — frontmatter AND body both required**: The body's `## Niche Analysis` and `## Canon Safety Check Trace` sections are NARRATIVE-PROSE expansions of the frontmatter's structured `occupancy_strength` and `canon_safety_check` fields. Both the frontmatter structured metadata AND the body prose sections are REQUIRED per Phase 14 schema — the pattern parallels `character-generation`'s dossier convention (structured frontmatter metadata + narrative body prose), and populating only the frontmatter (treating the structured fields as satisfying the body requirement) leaves the card schema-incomplete. Phase 15 Test 8 (schema completeness) catches frontmatter-only or body-only populations as failures.

Slug derived per `character-generation`'s personal-name-first kebab-case convention for consistency across the two skills. Place-locator epithets that follow a personal name (e.g., "Namahan of the Third Gate" — idiomatic to CF-0044 drylands well-keeping) are preserved in the kebab-case slug (`namahan-of-the-third-gate`); the personal-name-first rule still holds.

**Critic-pass trace — two levels**: Phases 1, 2, 3, 5, 8, 9, 11 mandatory critic passes are recorded at TWO levels: (i) per-card, one-line notes in the card's `critic_pass_trace` frontmatter at the template slots (Phase 5 note captures what this specific seed addresses from the Phase 5 negative-space diagnosis; Phase 11 note captures the theme/tone score-rationale for this seed); AND (ii) per-batch, full audit prose in the batch manifest's respective sections — Phase 1 in Registry Summary, Phase 3 in Constellation + Mosaic Audit, Phase 5 in Negative-Space Diagnosis, Phase 11 in Score Matrix, etc. Both levels are required; the per-card slots provide seed-specific attribution, the per-batch sections provide the full audit trail.

## Phase 15: Final Validation Tests

Run all 12 tests. Any FAIL halts and loops to responsible phase. Record each as PASS/FAIL with one-line rationale in the batch manifest's Phase 15 Test Results section. PASS without rationale = FAIL.

**Per-card**:
1. **(Rule 2, Phase 2+7)** Card has populated `institutional_embedding_checklist` with at least one non-"none" relation; card has non-empty `central_contradiction` tied to a world pressure.
2. **(Rule 2, Phase 7)** Card has populated `repeated_forced_choice` — not a biography fragment.
3. **(Rule 3, Phase 7)** Every capability has populated `how_learned` / `cost_to_acquire` / `teachers_institutions` / `unusual_or_ordinary` / `body_class_place_shape`.
4. **(Rule 4, Phase 10c)** Card's `canon_assumption_flags.status` ∈ {canon-safe, canon-edge, canon-requiring}; if canon-requiring, `implied_new_facts` non-empty with routing tag.
5. **(Rule 7, Phase 10b)** `canon_safety_check.mystery_reserve_firewall` lists every MR entry checked; non-empty MR with empty firewall list fails.
6. **(Rule 7, Phase 8+10b)** Card's `known_firsthand` + `wrongly_believes` contain no MR `disallowed cheap answers` match.
7. **(Phase 10a)** `canon_safety_check.invariants_respected` lists every invariant tested; no silent skips.
8. **(Phase 14 schema completeness)** No card field left TODO / placeholder / empty where schema requires content.
9. **(Voice distinctiveness, Phase 9)** No two cards in the batch share the same voice family unless deliberate contrast is explicitly noted in the card's `notes`.

**Batch-level**:
10. **(Phase 13 diversification)** Diversification audit table in batch manifest is complete; empty slots have rationale; no silent empties.
11. **(Phase 10d)** Phase 10d check trace is complete for all pairs tested at generation time (including pairs involving seeds later dropped at Phase 10e).
12. **(Phase 12 audit)** Rejected-candidate log complete; each rejection cites trigger + diagnosis target.

## Phase 16: Commit

Present the deliverable summary:
1. Registry summary (Phase 1 count + Phase 2 essence-profile coverage)
2. Constellation + Mosaic audit (Phase 3 outputs)
3. Niche-occupancy map (Phase 4 filled / crowded / open)
4. Phase 5 Negative-Space Diagnosis (probes fired + remediation priorities)
5. Full batch: every surviving card's frontmatter + body (full body prose on disk mandatory per Phase 14; review-presentation may compress prose when batch size makes full-prose unwieldy — see HARD-GATE clarification)
6. Batch manifest (Phase 6 seed count + Phase 11 score matrix + Phase 12 rejected log + Phase 13 diversification audit + Phase 10d/e traces)
7. Canon Safety Check traces per card (Phase 10 audit)
8. Phase 15 test results with rationales
9. Per-card `canon_assumption_flags.status` + `recommended_next_step` (so user can decide routing before accepting)
10. Target write paths

**HARD-GATE fires here**. User may: (a) approve as-is; (b) approve with drop-list of NCP-IDs; (c) request revisions (loop to named phase); (d) reject and abort.

### Drop-list behavior

- Surviving cards retain originally-allocated `NCP-NNNN` IDs (no renumbering); dropped IDs become permanent gaps.
- Slots formerly filled by dropped cards become empty in the written Phase 13 Diversification Audit with `user-drop at Phase 16` cited; no regeneration fires.
- Phase 10d trace in the written manifest covers all pairs tested at generation time, including pairs involving dropped cards (audit evidence that the full batch passed before drop).
- Phase 12 Rejected-Candidate Log is not affected by drops (different audit trail).

On approval, write in this order — sequencing matters because the tool environment cannot guarantee transactional atomicity:

1. **Each non-dropped card first**: `worlds/<world-slug>/character-proposals/NCP-NNNN-<slug>.md`. Set `source_basis.user_approved: true` immediately before each write. `user_approved: true` means "kept in batch after review", NOT "accepted as a character".
2. **Batch manifest second**: `worlds/<world-slug>/character-proposals/batches/NCB-NNNN.md` with `dropped_card_ids` populated. Create `batches/` directory if absent.
3. **INDEX.md last**: read existing file (create with header `# Character Proposal Cards — <World-Slug-TitleCased>` + blank line if absent), append one line per non-dropped card in the form `- [<title>](NCP-NNNN-<slug>.md) — <depth_class> / <intended_narrative_role> / <canon_assumption_flags.status>, batch NCB-NNNN`, sort by NCP-NNNN ascending, write back.

Cards-first sequencing means a partial-failure state has either cards-without-index or a manifest-without-INDEX-row. Recovery is manual.

Report all written paths. Do NOT commit to git.

## Validation Rules This Skill Upholds

- **Rule 2: No Pure Cosmetics** — Phase 2 (institutional embedding checklist mandatory on every registry entry) + Phase 5 (17 negative-space probes each guard against a class/institution/profession being present only as abstraction) + Phase 7 (forced-choice rule rejects biography fragments) + Phase 12 rejection triggers 6, 7, 10, 13 + Phase 15 Tests 1, 2.
- **Rule 3: No Specialness Inflation** — Phase 7 (every capability has `capability_path` + `cost_of_competence`) + Phase 10e repair stabilizers must name concrete mechanisms + Phase 12 rejection triggers 5, 12 + Phase 15 Test 3.
- **Rule 4: No Globalization by Accident** — Phase 4 (hard-duplicate classification blocks silent niche-universalization) + Phase 10c (hard gate: every implied capability checked against CF distribution blocks; `canon-requiring` tag surfaces implied universalization for user review) + Phase 15 Test 4.
- **Rule 7: Preserve Mystery Deliberately** — Phase 8 (epistemic position includes explicit `cannot_know` + first Rule-7 gate catching disallowed-answer leaks cheaply) + Phase 10b (formal per-seed MR firewall with complete audit list) + Phase 10d (batch-level joint-closure check — two seeds jointly closing an MR entry fails even when neither alone would) + Phase 15 Tests 5, 6.

## Record Schemas

- **NCP Proposal Card** → `templates/proposal-card.md` — hybrid YAML frontmatter (character-generation-compatible required+optional inputs + NCP-specific keys) + markdown body (character-generation dossier sections + Niche Analysis + Canon Safety Check Trace). Original to this skill; structurally parallel to character-generation's dossier schema for Option-A downstream compatibility.
- **NCB Batch Manifest** → `templates/batch-manifest.md` — hybrid frontmatter (batch metadata + card_ids + dropped_card_ids + user_approved) + markdown body (Registry Summary, Constellation + Mosaic audit, Niche-Occupancy Map, Phase 5 Diagnosis, Phase 6 Seed Log, Phase 11 Score Matrix, Phase 12 Rejected-Candidate Log, Phase 13 Diversification Audit, Phase 10d/e traces, Phase 15 Test Results). Original to this skill.

No Canon Fact Record emitted. No Change Log Entry emitted. This skill does not mutate world-level canon.

## FOUNDATIONS Alignment

| Principle | Phase | Mechanism |
|-----------|-------|-----------|
| Tooling Recommendation (non-negotiable) | Pre-flight | docs/FOUNDATIONS.md + 12 mandatory world files + full Person Registry loaded before any phase; MAGIC_OR_TECH_SYSTEMS.md selectively loaded |
| Multi-world directory discipline | Pre-flight + Phase 16 | Required `world_slug` argument; all reads/writes rooted at `worlds/<world-slug>/` |
| Canon Layers §Hard / Soft / Contested | Phase 1 + Phase 10c | Registry source_type discriminates dossiers (hard-identified personas) from artifact-author voices (contested-canon gravity); canon_assumption_flags.status classifies each card's canon posture |
| Canon Layers §Mystery Reserve | Phase 8 + Phase 10b + Phase 10d | Explicit cannot-know field + per-seed firewall audit + batch-level joint-closure check |
| Invariants §full schema | Phase 10a | Every invariant tested per seed; break_conditions and revision_difficulty guide Phase 10e repair paths |
| Ontology Categories | Phase 2 + Phase 7 | Registry essence profiles attach to declared categories; per-seed capabilities classified |
| Rule 1: No Floating Facts | Phase 14 | Proposal card schema structurally enforces domain / scope / prerequisites / limits / consequences fields |
| Rule 2: No Pure Cosmetics | Phases 2, 5, 7, 12, 15 | Institutional embedding + negative-space probes + forced-choice rule + rejection triggers + Tests 1-2 |
| Rule 3: No Specialness Inflation | Phases 7, 10e, 15 | Capability path with cost + no hand-wave repair stabilizers + Test 3 |
| Rule 4: No Globalization by Accident | Phases 4, 10c, 15 | Hard-duplicate classification + CF distribution discipline + canon-requiring surfacing + Test 4 |
| Rule 5: No Consequence Evasion | N/A | Not applicable — canon-reading skill emits candidate character cards, not canon facts. Downstream: if `canon_assumption_flags.status` is canon-requiring, `implied_new_facts` routes to `canon-addition` / `propose-new-canon-facts`, where Rule 5 enforcement lives. |
| Rule 6: No Silent Retcons | N/A | Not applicable — canon-reading skill does not mutate existing canon. Downstream: if an accepted canon-addition adjudication requires amending CANON_LEDGER.md, `canon-addition` emits the Change Log Entry there. |
| Rule 7: Preserve Mystery Deliberately | Phases 8, 10b, 10d, 15 | First-gate epistemic cannot-know + per-seed formal firewall audit + batch-level joint-closure + Tests 5-6 |
| World Kernel §Core Pressures | Phase 7 | Per-seed central_contradiction instantiates world core pressures at individual scale |
| World Kernel §Tonal Contract | Phase 9 | Voice calibrated to world tonal register; voice tests include artifact-author register |
| Change Control Policy | N/A | Not applicable — canon-reading skill does not emit Change Log Entries. Handoff: canon-requiring cards route to `canon-addition`, which emits the Change Log Entry on adjudication acceptance. |
| Acceptance Tests §10 world queries | Phase 16 deliverable | Registry Summary + Constellation/Mosaic audit + Niche-Occupancy Map + Negative-Space Diagnosis collectively answer queries 6 ("What kinds of people can plausibly exist here?") and 7 ("What can ordinary people actually do all day?") |

## Guardrails

- This skill operates on **exactly one existing world** per invocation. It never creates a new world (that is `create-base-world`'s job), never modifies `docs/FOUNDATIONS.md`, never touches other worlds, never touches `archive/` or `brainstorming/`.
- This skill **never writes to world-level canon files** — not `WORLD_KERNEL.md`, `INVARIANTS.md`, `ONTOLOGY.md`, `TIMELINE.md`, `GEOGRAPHY.md`, `PEOPLES_AND_SPECIES.md`, `INSTITUTIONS.md`, `ECONOMY_AND_RESOURCES.md`, `MAGIC_OR_TECH_SYSTEMS.md`, `EVERYDAY_LIFE.md`, `CANON_LEDGER.md`, `OPEN_QUESTIONS.md`, or `MYSTERY_RESERVE.md`.
- This skill **never writes to `worlds/<world-slug>/characters/`** — not to any existing dossier, not to `characters/INDEX.md`, not to a new dossier. Proposal cards live in `worlds/<world-slug>/character-proposals/` specifically so other skills (especially `character-generation`) cannot misread them as established characters. Crossing this boundary is the primary silent-canon risk this skill is designed to prevent.
- All reads and writes are rooted at `worlds/<world-slug>/` or at user-provided `parameters_path` / `upstream_audit_path`. Repo-root writes are forbidden.
- This skill **proposes candidates; it does not canonize them or realize them as characters**. Every emitted card is a candidate for `character-generation` (to become a dossier) AND, if canon-requiring, for `canon-addition` / `propose-new-canon-facts` (to resolve implied new canon before generation). A card's existence on disk is NOT equivalent to an accepted character. Downstream users (human and other skills) must verify a card's `source_basis.user_approved: true` refers to *review approval for inclusion in the batch*, not to character acceptance.
- If a pre-flight `next_batch_id`, `next_pr_id`, or `<slug>.md` would collide with an existing file, the skill aborts. Never overwrite an existing card, batch manifest, or INDEX row.
- **Interop seam with `character-generation`** is deliberate and one-way: this skill emits NCP cards with frontmatter + body structured to be directly consumable as `character_brief_path`. If `character-generation`'s Phase 0 input schema changes, this skill's Phase 14 card frontmatter must be updated in lockstep; the coupling is structural, not incidental. **Known concern to surface to maintainers**: `character-generation` as currently specified parses frontmatter for required+optional fields and reads body prose as context for generation, but does NOT have explicit schema slots for the richer essence fields (voice_signature, epistemic_limits, perception_filter, public_mask, private_shame, artifact_authorship_potential). Option A's structural-mirroring design minimizes this risk by placing rich content in body sections `character-generation` will naturally surface in dossier prose, but a future `skill-audit` on `character-generation` to add explicit essence-field carry-through is recommended. This concern is documented here so the interop contract is auditable and future-maintainable.
- **Interop seam with `canon-addition` / `propose-new-canon-facts`** is via `canon_assumption_flags.implied_new_facts` + `recommended_next_step`. This skill never writes to `canon-addition`'s or `propose-new-canon-facts`' surfaces; routing is the user's decision on reviewing the batch.
- **Interop with future `continuity-audit`** is structural via optional `upstream_audit_path`. If that sibling's output format changes, this skill's Phase 5 merge logic adapts; the argument surface does not change.
- **Empty slots in the Phase 13 Diversification Audit are features, not bugs** — they surface diagnostic signals about the world's current character-web gaps. Filling a slot with a lower-scoring candidate just to avoid emptiness is forbidden.
- Phase 8 (first Rule-7 gate), Phase 10b (formal firewall), and Phase 10d (joint-closure) are the three Rule 7 enforcement points. A future maintainer adding a phase that exposes cards to MR content must extend all three or explicitly classify the phase as out-of-scope for Rule 7 (documented in the batch manifest notes).
- Worktree discipline: if invoked inside a worktree, all paths resolve from the worktree root.
- Do NOT commit to git. Writes land in the working tree only; the user reviews and commits.
- The HARD-GATE at the top of this file is absolute. No `Write` or `Edit` to `worlds/<world-slug>/character-proposals/` until Phase 10 Canon Safety Check passes clean, Phase 15 validation tests pass clean, AND the user approves the Phase 16 deliverable summary (including any drop-list). Auto Mode does not override this — skill invocation is not deliverable approval.

## Final Rule

A character proposal batch is not written until every card has a world-grounded niche signature, a forced-choice pressure, a capability-with-cost, a complete Mystery Reserve firewall audit, an invariant-conformance trace, and an explicit canon-safe / canon-edge / canon-requiring classification; the batch has a registry diagnosis, a 10-slot diversification audit, and a batch-level joint-closure trace; and the user has approved the complete deliverable — and once written, each card is a candidate for `character-generation` (to become a character) and, if canon-requiring, for `canon-addition` (to resolve its implied new canon), NEVER an established character or canonized fact itself.
