---
name: branching-story-bootstrap
description: "Use when starting a new branching story bundle inside an existing worldloom world — a premise + a selected cast (drawn from the world's characters/INDEX.md) + tone and content constraints. Produces: a story bundle at worlds/<world-slug>/stories/<story-slug>/ — STORY_KERNEL.md + atomic-YAML causal-engine ledgers under _source/ (entities, facts, events, obligations, threads, intentions, storylets, branches, pages, choices, plus story-local relationships, locations, objects, consequences, artifacts) + the rendered root page (PG-0001) and its first 4-6 generated choices + a seed storylet pool. Mutates: only worlds/<world-slug>/stories/<story-slug>/ (never WORLD_KERNEL.md, ONTOLOGY.md, or any _source/<world-subdir>/*.yaml record); writes worlds/<world-slug>/stories/INDEX.md on first invocation per world (idempotent append on subsequent runs)."
user-invocable: true
arguments:
  - name: world_slug
    description: "Directory slug of an existing world under worlds/<world-slug>/. Pre-flight aborts if the directory is missing."
    required: true
  - name: story_slug
    description: "Kebab-case slug for the new story bundle. Pre-flight aborts if worlds/<world-slug>/stories/<story-slug>/ already exists — this skill never overwrites an existing bundle."
    required: true
  - name: premise_path
    description: "Path to a markdown file containing the user's premise (genre, tonal register, intended scale, opening situation, implied threads/obligations/cast tensions). Required unless `premise` is provided inline."
    required: false
  - name: premise
    description: "Inline premise text. Required unless `premise_path` is provided. If both are provided, `premise_path` wins."
    required: false
  - name: cast_bind_list
    description: "Comma-separated list of CHAR-NNNN ids drawn from worlds/<world-slug>/characters/INDEX.md. Pre-flight verifies every id exists. At least one CHAR is required; the protagonist must be among them."
    required: true
  - name: intended_scale
    description: "One of: one_shot | chapter | arc | open_ended. Recorded in STORY_KERNEL.md and used by Phase 6 storylet-pool sizing and Phase 7 prose-length defaults."
    required: true
  - name: tone_constraints
    description: "Free-form prose hints. Optional."
    required: false
  - name: themes
    description: "Comma-separated theme tags. Optional."
    required: false
  - name: content_intensity_baseline
    description: "One of: tame | mature | explicit. Default: mature. Routing tag for storylet/page selection — never a censor (the content_policy block is NC-21 by skill contract)."
    required: false
  - name: pov_mode
    description: "One of: single | rotating | omniscient. Default: single."
    required: false
  - name: language_register
    description: "Register hints (formal / colloquial / mixed). Optional."
    required: false
  - name: target_page_length
    description: "Words per rendered page. Default: 600-1200. Optional override."
    required: false
  - name: seed_threads
    description: "User-named active narrative threads to install at bootstrap. Optional — Phase 5 derives threads from premise if absent."
    required: false
  - name: seed_obligations
    description: "User-named promises to install at bootstrap. Optional — Phase 5 derives from premise if absent."
    required: false
  - name: storylet_pool_seed_size
    description: "Number of seed storylets in Phase 6. Default: ~20."
    required: false
  - name: epe_card_filter
    description: "Comma-separated EPE-NNNN ids from worlds/<world-slug>/pressure-events/ to consume as initial thread / obligation seeds. Optional."
    required: false
  - name: execution_mode
    description: "One of: authoring (default) | interactive_runtime | batch_generation. Recorded on STORY_KERNEL.md as execution_mode_default for downstream runtime page-cycle. Bootstrap is always an authorial act regardless of mode — HARD-GATE always fires."
    required: false
---

# Branching Story Bootstrap

Bootstraps a new branching story bundle inside an existing worldloom world from a user premise + a selected cast + tone and content constraints, producing a fully initialized story directory with causal-engine ledgers, a rendered root page (PG-0001), 4-6 initial choices, and a ~20-storylet seed pool.

<HARD-GATE>
Do NOT write any file under `worlds/<world-slug>/stories/<story-slug>/` and do NOT `Edit` `worlds/<world-slug>/stories/INDEX.md` until: (a) Pre-flight resolves `worlds/<world-slug>/`, allocates the next `STORY-NNN` via `mcp__worldloom__allocate_next_id`, verifies `worlds/<world-slug>/stories/<story-slug>/` does not already exist, validates every `CHAR-NNNN` in `cast_bind_list` against `worlds/<world-slug>/characters/INDEX.md`, and confirms the content_policy block is loaded for downstream prompt assembly; (b) Phase 4 Mystery Firewall + Invariant Audit passes with zero `forbidden`-status M resolutions and zero unresolvable INV tensions; (c) Phase 9 Validation Gates record PASS with a one-line rationale for every gate (mystery firewall, invariant compatibility, content policy presence, ID uniqueness, branch path consistency, cast intention coverage, obligation salience, epistemic class declared, storylet diversity, prose ledger consistency, choice consequence-capacity, state_snapshot completeness, recursive reference closure); (d) the user has explicitly approved the Phase 10 deliverable summary (designing principle, cast/threads/mysteries-in-play summary, opening prose preview, CHC labels, firewall verdicts, target write paths). The gate is absolute under Auto Mode — invoking the skill is not approval of the deliverable.
</HARD-GATE>

## Process Flow

```
Pre-flight (resolve worlds/<world-slug>/; allocate STORY-NNN via
            allocate_next_id; slug-collision
            check on stories/<story-slug>/; validate cast_bind_list
            against characters/INDEX.md; load content_policy block;
            assemble retrieval load — context_packet for premise-relevant
            world state + whole-class M-record load + whole-class
            INV-record load)
      |
      v
Phase 1: Premise Normalization        (genre/tonal register, designing
                                       principle, central dramatic question,
                                       POV mode, content_intensity baseline,
                                       implied threads/obligations/cast
                                       tensions/locations/period)
      |
      v
Phase 2: Cast Binding                 (mirror each CHAR into STENT-NNNN;
                                       create initial STINT-0001-<char-slug>
                                       per major; story-only entities)
      |
      v
Phase 3: World-Fact Import            (import CFs touching cast/location/
                                       period as SF-NNNN with derived_from_cf,
                                       certainty, known_by, epistemic_class;
                                       create premise-specific SFs with
                                       canon_relation: not_applicable)
      |
      v
Phase 4: Mystery Firewall +           (declare mysteries_in_play[] in
         Invariant Audit               STORY_KERNEL; hard reject
                                       forbidden-status M resolutions;
                                       run premise + threads + obligations
                                       against every INV record;
                                       hard reject unresolvable tensions)
      |
      v
Phase 5: Initial Threads +            (2-5 THR-NNNN — main + relationship +
         Obligations                   optional threat/mystery-edge/subthread;
                                       initial OBL-NNNN per thread with
                                       salience + urgency + ≥2 payoff_modes;
                                       initialize consequences ledger)
      |
      v
Phase 6: Storylet Pool Seed           (delegated to storylet-pool-authoring
                                       seed mode with focus_area:
                                       bootstrap_mix and
                                       parent_skill_invocation: true;
                                       returns approved SLTs in memory)
      |
      v
Phase 7: Root Page Render             (select PG-0001 storylet;
                                       assemble LLM prompt with content_policy
                                       verbatim + world context + story
                                       kernel + selected storylet + cast +
                                       state context; render prose;
                                       cross-check; up to 3 re-prompts)
      |
      v
Phase 8: Initial Choice Generation    (4-6 CHC-NNNN — main thread engagement,
                                       relationship engagement, OBL
                                       engagement, less-obvious path,
                                       diversification; consequence-capacity
                                       check)
      |
      v
Phase 9: Validation Gates             (12 gates — see HARD-GATE; each PASS
         (Canon Safety Check phase)    with one-line rationale; FAIL routes
                                       to responsible phase)
      |
      v
Phase 10: HARD-GATE Approval          (deliverable summary: designing
                                       principle + cast/threads/
                                       mysteries-in-play + opening prose
                                       preview + CHC labels + firewall
                                       verdicts + target paths;
                                       --user options-->
                                       ACCEPT / REVISE-narrow /
                                       REVISE-re-render / REVISE-different
                                       opening / REJECT)
      |
   accept
      |
      v
Phase 11: Commit / Atomic Write       (single transaction: create
                                       stories/<story-slug>/ tree;
                                       write STORY_KERNEL.md, all
                                       _source/<class>/<ID>.yaml records,
                                       pages-prose/PG-0001.md,
                                       stories/<story-slug>/INDEX.md;
                                       append/create
                                       stories/INDEX.md per-world index;
                                       NO git commit)
```

## Output

### Story bundle structure (single transaction)

```
worlds/<world-slug>/stories/<story-slug>/
├── STORY_KERNEL.md
├── _source/
│   ├── entities/             ← STENT-NNNN.yaml
│   ├── facts/                ← SF-NNNN.yaml (epistemic_class declared)
│   ├── events/               ← SE-NNNN.yaml
│   ├── obligations/          ← OBL-NNNN.yaml
│   ├── consequences/         ← CNSQ-NNNN.yaml (initialized empty at PG-0001)
│   ├── threads/              ← THR-NNNN.yaml
│   ├── relationships/        ← SREL-NNNN.yaml
│   ├── intentions/           ← STINT-NNNN-<char-slug>.yaml
│   ├── storylets/            ← SLT-NNNN.yaml (provenance.origin=bootstrap_seed)
│   ├── locations/            ← STLOC-NNNN.yaml
│   ├── objects/              ← STOBJ-NNNN.yaml
│   ├── artifacts/            ← DA-NNNN.yaml (story-local; distinct from world DA)
│   ├── branches/             ← BR-0001.yaml
│   ├── pages/                ← PG-0001.yaml
│   └── choices/              ← CHC-NNNN.yaml
├── pages-prose/              ← PG-0001.md
└── INDEX.md
```

### Per-world index (idempotent)

`worlds/<world-slug>/stories/INDEX.md` — created on first invocation per world; appended/replaced thereafter. One line per story bundle in the form:

```
- [STORY-NNN] <story-slug> — <designing-principle one-liner> | cast: CHAR-NNNN, CHAR-NNNN | mysteries_in_play: M-N, M-N | execution_mode: <mode> | created: <iso8601>
```

### No canon-file mutations

This skill never writes to `WORLD_KERNEL.md`, `ONTOLOGY.md`, or any `worlds/<world-slug>/_source/<world-subdir>/*.yaml` record. Hook 3 enforces the latter. No CF, CH, INV, M, OQ, ENT, or world-level SEC record is emitted. If the user later wants to promote a story-local SF / STENT / DA to world canon, that is a separate `story-fact-promotion-to-canon` run (future skill — not this skill's responsibility).

### Record schemas

Inlined in this skill's templates (per the Shape A integration posture — no engine ops exist for story records yet):

- STORY_KERNEL.md → `templates/story-kernel.md`
- STENT-NNNN, SF-NNNN, SE-NNNN, OBL-NNNN, CNSQ-NNNN, THR-NNNN, SREL-NNNN, STINT-NNNN, STLOC-NNNN, STOBJ-NNNN, BR-NNNN, PG-NNNN, CHC-NNNN → `templates/story-records.yaml` (one document per record class with required+optional field enumeration and example values)
- SLT-NNNN → `.claude/skills/storylet-pool-authoring/templates/storylet-record.yaml` (bootstrap delegates Phase 6 to storylet-pool-authoring and writes the returned records in Phase 11)
- DA-NNNN (story-local) → derived from world-level DA frontmatter shape with `story_id` field added; documented in `templates/story-records.yaml`.
- Per-bundle INDEX.md → `templates/story-bundle-index.md`
- Content policy block (NC-21 verbatim) → `templates/content-policy.txt`

## World-State Prerequisites

Before this skill acts, it MUST receive (per FOUNDATIONS §Tooling Recommendation and §Canonical Storage Layer):

- `docs/FOUNDATIONS.md` — read at Pre-flight; the rules that govern Phase 3 fact import, Phase 4 firewall + INV audit, Phase 5 obligation discipline, and Phase 7 prose-render canon-respecting constraints all live there.
- `worlds/<world-slug>/WORLD_KERNEL.md` — primary-authored; read directly (not via MCP) per FOUNDATIONS §Canonical Storage Layer §Authored-primary surfaces.
- `worlds/<world-slug>/ONTOLOGY.md` — primary-authored; read directly. Categories + Relation Types ground Phase 2 cast binding and Phase 3 fact import.
- `worlds/<world-slug>/characters/INDEX.md` — read directly; cast binding validates every `CHAR-NNNN` in `cast_bind_list` against this index.
- `worlds/<world-slug>/characters/<char-slug>.md` per cast member — retrieved via `mcp__worldloom__get_record('CHAR-NNNN', section_path=...)` with `frontmatter` + `body.Goals and Pressures` + `body.Capabilities` + `body.Voice and Perception` projections (per `docs/CONTEXT-PACKET-CONTRACT.md`); fallback to direct `Read` for pre-CORRIDOR-004 worlds.
- `worlds/<world-slug>/pressure-events/EPE-NNNN.md` per id in `epe_card_filter` (if provided) — read directly; their `proposal` sidecars are NOT consumed (those are `canon-addition`'s input, not this skill's).
- **Premise-bounded canon retrieval** via `mcp__worldloom__get_context_packet(world_slug, task_type='story_bootstrap', seed_nodes=[...], token_budget=18000)` — the `seed_nodes` are `entity:<slug>` ids resolved from premise-named entities + cast-CHAR `current_location`s + `place_of_origin` via `mcp__worldloom__find_named_entities(names)` BEFORE the first packet call. MCPENH-009 registered this task-specific profile so the packet prioritizes premise-relevant CFs, seed-touched SEC records, named-entity neighbors, governing invariant records, Mystery Reserve firewall records, and Kernel / Ontology governing context for branching-story bootstrap.
  - **Packet-too-large fallback**: if the packet returns `delivery_status='persisted_with_summary'` OR `packet_incomplete_required_classes` OR non-empty `truncation_summary.dropped_layers`, reduce `seed_nodes` and retry; use `governing_summary` inline; `get_records(record_ids=[...])` for known-id sets; `get_persisted_packet_slice` for structured persisted-packet recovery.
- **Whole-class Mystery Reserve firewall load** via `mcp__worldloom__list_records(world_slug, record_type='mystery_record', include_full_body=true)` — every M record body is needed at Phase 4 to declare `mysteries_in_play[]` with each M's `status` and `future_resolution_safety` and to hard-reject any premise element resolving a `forbidden`-status M. Whole-class enumeration is authorized for skills "whose firewall is class-bounded" per FOUNDATIONS §Tooling Recommendation. `mcp__worldloom__get_firewall_content(world_slug)` is the M-only projection shortcut if full bodies are not needed; this skill needs full bodies (for `forbidden_answers` + `future_resolution_safety` fields).
- **Whole-class Invariant audit load** via `mcp__worldloom__list_records(world_slug, record_type='invariant_record', include_full_body=true)` — every INV record body is needed at Phase 4 to audit the premise + cast + initial threads + initial obligations against every INV's `break_conditions` and `revision_difficulty`.

If `worlds/<world-slug>/` is missing, abort and instruct the user to run `create-base-world` first. If `cast_bind_list` references a `CHAR-NNNN` that does not exist in `characters/INDEX.md`, abort and list the missing ids. If `epe_card_filter` references a missing EPE, abort.

Direct `Read` of `worlds/<world-slug>/_source/<subdir>/` is redirected to MCP retrieval by Hook 2 — do not bulk-read.

## Pre-flight Check

Run before Phase 1; abort if any precondition fails.

- Load `docs/FOUNDATIONS.md` into working context.
- Normalize `world_slug` (strip `worlds/` prefix; verify `[a-z0-9-]+`); resolve `worlds/<world-slug>/`. Abort if missing — instruct user to run `create-base-world` first.
- Allocate next `STORY-NNN`:
  - **Primary path**: `mcp__worldloom__allocate_next_id(world_slug, 'STORY')`.
  - Defensive recovery: if the allocator returns `Unsupported id_class 'STORY'` from an older MCP server, fall back to scanning `worlds/<world-slug>/stories/*/STORY_KERNEL.md` for the highest existing `story_id` and incrementing.
- Validate `story_slug` is kebab-case (`[a-z0-9-]+`); verify `worlds/<world-slug>/stories/<story-slug>/` does not exist. Abort with "Story-bundle slug collision — supply a different story_slug. This skill never overwrites an existing bundle." if present.
- Validate every `CHAR-NNNN` in `cast_bind_list` exists in `worlds/<world-slug>/characters/INDEX.md`. Abort and list missing ids if any are absent. Confirm the protagonist (first id in the list, by convention) is among them.
- Validate every `EPE-NNNN` in `epe_card_filter` (if provided) exists at `worlds/<world-slug>/pressure-events/EPE-NNNN-*.md`. Abort and list missing ids if any are absent.
- Read `worlds/<world-slug>/WORLD_KERNEL.md` and `worlds/<world-slug>/ONTOLOGY.md` directly.
- Read `worlds/<world-slug>/characters/INDEX.md`.
- For each CHAR in `cast_bind_list`, retrieve frontmatter + `body.Goals and Pressures` + `body.Capabilities` + `body.Voice and Perception` via `mcp__worldloom__get_record('CHAR-NNNN', section_path=...)`; fallback to direct `Read` for pre-CORRIDOR-004 worlds.
- For each EPE in `epe_card_filter`, `Read worlds/<world-slug>/pressure-events/<file>.md`.
- Resolve premise-named entities to canonical `entity:<slug>` ids via `mcp__worldloom__find_named_entities(names)` BEFORE the context-packet call.
- Load premise-bounded canon retrieval via `mcp__worldloom__get_context_packet(world_slug, task_type='story_bootstrap', seed_nodes=[<resolved entity:slug ids + cast current_locations + premise locations + premise period>], token_budget=18000)`. Apply the packet-too-large fallback per §World-State Prerequisites if the response signals overflow.
- Load whole-class Mystery Reserve firewall: `mcp__worldloom__list_records(world_slug, record_type='mystery_record', include_full_body=true)`.
- Load whole-class Invariant audit: `mcp__worldloom__list_records(world_slug, record_type='invariant_record', include_full_body=true)`.
- Confirm content_policy block (NC-21 verbatim text from `templates/content-policy.txt`) is loaded for downstream prompt assembly. This is the FIRST condition of the HARD-GATE — without it Phase 7 cannot legitimately render prose.

## Phase 1: Premise Normalization

Convert the user's premise into a precise design brief. Required extraction:

- genre / sub-genre identity
- tonal register
- **designing principle** — the story's unique unfolding process (NOT plot, NOT genre, NOT chronology). Examples: "each chapter reinterprets the same event through a different artifact"; "each major turn comes from correcting one false text"; "intimacy advances only through forbidden practical cooperation."
- central dramatic question (optional)
- POV mode + main POV character(s)
- content_intensity baseline
- implied initial threads
- implied initial obligations
- implied cast tensions
- implied location(s) where the story opens
- implied time period (anchored to world timeline)

**Failure mode**: if the premise reads as "events in order" or "chronology with vibes," the designing principle is missing. Auto-propose 3 candidate designing principles, each grounded in a different aspect of the premise (a recurring artifact, a structural correction, an institutional contradiction). Ask the user to choose, edit, or reject all three and supply their own. Halting outright is bad UX; concrete starting points let the user redirect efficiently.

## Phase 2: Cast Binding

For each CHAR in `cast_bind_list`, mirror the world dossier into a story-local `STENT-NNNN`. Required STENT fields: `id`, `story_id`, `world_ent_id` (the world-level ENT this mirrors), `character_id` (the world's CHAR id), `name`, `role_in_story` (`protagonist | major | supporting | antagonist | foil`), `present_at_start`, `intention_snapshot_id`, `created_at_page: PG-0001`, `notes`. Full schema in `templates/story-records.yaml`.

**Story-only entities**: if the user names entities not in world canon (e.g., a new village invented for this story), create them as `STENT-NNNN` with `world_ent_id: null` and `story_only: true`. These are counterfactual / soft-canon-local-to-story unless promoted via `story-fact-promotion-to-canon` (future skill).

**Initial intention snapshot per major character**: emit `STINT-0001-<char-slug>.yaml` with `goals`, `fears`, `secrets[SF-NNNN]`, `beliefs[SF-NNNN]`, `relationships{STENT-id: state}`, `emotional_state`, `current_pressure: 0..10`, `traits`, `values{axis: weight}`, `created_at_page: PG-0001`.

**Rule (halt condition)**: a character whose `role_in_story` is `protagonist` or `major` and whose STINT carries no goals AND no fears AND no beliefs cannot be driven by the runtime — halt the phase and request the user supply intention seeds.

## Phase 3: World-Fact Import

Query world canon for CFs touching cast / location / period (premise-bounded retrieval from Pre-flight's context packet covers this). Mirror relevant facts into the story-local truth ledger as `SF-NNNN`.

**Import rules**:
- Each imported SF carries `derived_from_cf: CF-NNNN`, `canon_relation: canon_consistent`, `epistemic_class` (typically `objective`), `certainty: 1.0`, and `known_by` populated only from cast members whose dossiers indicate they would know.
- A CF that is canonical-but-secret (e.g., a buried truth) does NOT auto-populate `known_by` — the storyteller must explicitly assign knowledge.

**What NOT to import**:
- CFs not relevant to cast / location / period.
- CFs touching `forbidden`-status M-NNNN entries that the story is explicitly NOT setting in motion.
- CFs whose `distribution.who_can_do_it` is incompatible with cast presence.

**Premise-specific facts (not in world canon)**: create `SF-NNNN` with `derived_from_cf: null` and `canon_relation: not_applicable`. Story-local only. Promotion to world canon is `story-fact-promotion-to-canon`'s job, not this skill's.

**SF-NNNN schema** (every initial SF declares `epistemic_class`, `truth_value`, `certainty`, `known_by`, `subject/predicate/object`, `derived_from_cf | canon_relation`; full schema in `templates/story-records.yaml`).

**Epistemic class semantics** (load-bearing — false beliefs and apparent truths are first-class, not collapsed into a single truth-table):

- `objective` — true at branch level regardless of who knows.
- `belief` — held as true by named actors; may or may not match objective truth.
- `rumor` — circulating among a population; not directly attached to objective truth.
- `reader_inference` — reader knows something cast does not (dramatic irony).
- `apparent` — branch produces this as a *seeming* resolution without committing it as objective; the production register for branch-local mystery resolutions per `branching-story-page-cycle` Phase 4.5.
- `disputed` — multiple incompatible claims with comparable evidence-weight.

A false belief held by a character is recorded as a `belief`-class SF that contradicts an `objective`-class SF — not as two truth-table entries warring with each other.

## Phase 4: Mystery Firewall + Invariant Audit

**Mystery firewall** (Rule 7 enforcement). For each `M-NNNN` in the whole-class load whose domain overlaps the premise OR whose narrative orbit includes any cast member:

- Declare it in `STORY_KERNEL.md`'s `mysteries_in_play[]` with the M's `status` and `future_resolution_safety`.
- **Hard reject** (abort the bootstrap) if any premise element, imported SF, planned thread, or planned obligation resolves a `forbidden`-status M.
- For `low | medium | high`-resolution-safety M entries: note that in-story resolution requires routing through `story-fact-promotion-to-canon` (future skill).

**Invariant audit** (Rule 4 enforcement). Run premise + cast + initial-threads + initial-obligations against every INV record from the whole-class load:

- Flag tensions: does the premise assume a capability that violates an INV's `break_conditions`? Does an obligation imply a distribution change that breaks Rule 4?
- **Hard reject** (or revise premise with user) if any tension is unresolvable.

**Output to STORY_KERNEL.md**: `mysteries_in_play[]` populated; `invariants_acknowledged[]` populated (cite the INV ids the story will respect — anchors later validation).

## Phase 5: Initial Threads + Obligations

Generate 2-5 `THR-NNNN` (replace acts entirely):

- one **main thread** (the story's central pressure)
- one **primary relationship thread** (often the protagonist + a key second)
- optionally one **threat clock** (escalating external pressure)
- optionally one **mystery-edge thread** (touches but does not resolve M-NNNN)
- optionally one **subthread** for tonal contrast

THR fields (full schema in `templates/story-records.yaml`): `id`, `story_id`, `type` (`mystery | relationship | threat | quest | theme | survival`), `status` (`dormant | active | pressured | critical | resolved | failed`), `title`, `owner_cast[STENT]`, `obligations[OBL]`, `current_pressure`, `desired_cadence`, `created_at_page: PG-0001`.

For each thread, generate initial `OBL-NNNN`. OBL fields include `type`, `introduced_at_event`, `introduced_at_page`, `owner`, `subjects[STENT]`, `visible_to_reader`, `known_by[STENT]`, **`salience: 0..10`**, **`urgency: 0..10`**, `emotional_weight`, `decay_rate`, `required_closure`, **`possible_payoff_modes` (≥2)** drawn from {`literal_fulfillment`, `ironic_reversal`, `failed_expectation`, `symbolic_echo`, `transfer`, `red_herring`, `tragic_loss`, `abandon_with_acknowledgment`}, `constraints[predicate]`, `dependent_facts[SF]`, `coverage_cache` (advisory), `status: open`, `notes`.

**Rule 5 enforcement (halt condition)**: every initial OBL must declare `salience`, `urgency`, AND ≥2 `possible_payoff_modes`. An obligation with one payoff mode is rigid — the runtime cannot honor wild user choices. Halt and expand payoff modes; do NOT proceed to Phase 6.

**Initialize consequences ledger**: emit `_source/consequences/` as an empty directory at this phase; `consequences_pending: []` and `consequences_addressed: []` populated on PG-0001's `state_snapshot` at Phase 7.

## Phase 6: Storylet Pool Seed

Use `storylet-pool-authoring` as an in-memory sub-routine to generate `storylet_pool_seed_size` (default ~20) approved `SLT-NNNN` records for `_source/storylets/`.

Delegation contract:

- `mode: seed`
- `focus_area: bootstrap_mix`
- `target_pool_size: <storylet_pool_seed_size>`
- `source_audit_path: null`
- `parent_skill_invocation: true`
- caller context: normalized premise, cast-bound STENT/STINT records, imported SFs, initial THRs/OBLs, whole-class M/INV loads, and content_policy already loaded by bootstrap Phases 1-5

`storylet-pool-authoring` Phase 2 §Bootstrap-mix shape weighting is the coverage contract: entry_pressure 3-5, cast_introduction 1 per non-protagonist major, threat_escalation 2-4, relational_dynamics 3-5, routine_disruption 2-3, aftermath_sequel 2-3, reflection_dilemma 2-3.

The delegated sub-routine applies storylet-pool-authoring Phase 4's 9 per-storylet gates and Phase 5's diversity audit, then returns the approved SLT records and validation summaries in memory. It does not allocate or write an SLB manifest, does not edit the story bundle INDEX, and does not require `worlds/<world-slug>/stories/<story-slug>/` to exist yet. Bootstrap assigns the new bundle's `SLT-NNNN` ids and writes the returned records in Phase 11's single transaction.

Returned seed storylets must carry `provenance.origin: bootstrap_seed`, `provenance.created_at_page: null`, and `visibility.scope: global_author_pool`. They use the schema authority at `.claude/skills/storylet-pool-authoring/templates/storylet-record.yaml`; this skill's `templates/story-records.yaml` only cross-references that authority for SLT records.

## Phase 7: Root Page Render

**Storylet selection for PG-0001**. Score each seed SLT on:

- `salience(entry_pressure_signal)` — favor `shape: entry_pressure`.
- `premise_alignment` — match between SLT's `tone_tags`/themes and STORY_KERNEL declarations.
- `cast_present` — must include the protagonist; ideally one or two more bound cast.

**Hard filters**:

- SLT's `mystery_safety.forbidden_M_resolved` must be `false`.
- SLT must NOT carry `M_resolution_claims` with `resolution_authority: canon_candidate` (bootstrap doesn't promote).

**LLM prompt assembly** (the order matters; content_policy is FIRST so it binds the model before any other instruction):

```
[content_policy block — verbatim from templates/content-policy.txt]
[world context — WORLD_KERNEL summary + relevant CFs + ONTOLOGY entries]
[story kernel — premise + designing_principle + tone + content_intensity
               + POV + central dramatic question]
[selected storylet — hard_preconds, fact_effects, opens_obligations,
                     choice_templates, tone_tags]
[cast bound — for each STENT, name + role + STINT summary]
[state context — facts visible to POV at story start, open obligations]
INSTRUCTION:
Render the opening page. Show through action, dialogue, and sensory detail.
Respect content_intensity_baseline. Do not invent facts beyond state context.
Do not resolve any mystery declared in mysteries_in_play[].
Length target: <target_page_length>.
End at a moment where 4-6 distinct choices for what happens next would be
natural.
```

LLM produces the prose. Engine writes to a working buffer (NOT to disk yet — disk write happens at Phase 11 inside the atomic transaction).

**Cross-check (deterministic, post-LLM)**:

- Does the prose mention any character not in `cast_present`? → re-prompt with explicit constraint.
- Does the prose imply any fact not in state context? → flag for review.
- Does the prose resolve any M-NNNN in `mysteries_in_play[]`? → hard reject, re-prompt.

Up to 3 re-prompts before escalating to user with the constraint failures inlined in the message.

**Emit PG-0001 record** (page-cycle-compatible schema in `templates/story-records.yaml`; `branching-story-page-cycle` §Record Schemas §Page Record is the runtime authority) — `id: PG-0001`, `story_id`, `branch_id: BR-0001`, `parent_page_id: null`, `branch_path: [PG-0001]`, `chosen_choice_id: null`, `write_in_used: false`, `write_in_routing: null`, `storylet_realized`, `applied_event_ops: [SE-0001]`, `state_hash`, `parent_state_hash: null`, `branch_terminal: false`, `terminal_reason: null`, `prose_path: pages-prose/PG-0001.md`, `state_snapshot` (canon_revision, objective_facts, apparent_facts, disputed_facts, reader_known_facts, belief_state_by_actor, rumor_state, obligations_open, obligations_paid_off=[], obligations_complicated=[], obligations_abandoned=[], consequences_pending, consequences_addressed=[], threads_active, relationships_current, intentions_current, cast_present, current_location, accessible_locations, objects_in_scope, inventory_by_entity, entity_status), `narrative_health` (open_obligation_count, high_salience_unpaid_count, average_obligation_age=0, contradiction_risk=0.0, causal_connectivity=1.0, character_motivation_coverage, unresolved_threat_pressure, recent_consequence_density=0.0, recent_reflection_density=0.0, novelty=1.0, tension, agency_score=1.0), `governor_nudge_applied: "bootstrap root; no prior-page governor"`, `content_intensity`, `validation_trace` (Phase 9 gates 1-12 with one-line PASS rationales), `created_at`.

**Emit BR-0001 record** — `id: BR-0001`, `root_page_id: PG-0001`, `current_leaf_page_id: PG-0001`, `forked_from_*: null`, `branch_path: [PG-0001]`, `status: active`, `canon_revision`, `created_at_page: PG-0001`, `notes: "Root branch."`.

**Emit SE-0001 bootstrap event** (page-cycle-compatible schema in `templates/story-records.yaml`; `branching-story-page-cycle` §Record Schemas §Story Event Record is the runtime authority) — `id: SE-0001`, `story_id`, `branch_id: BR-0001`, `created_at_page: PG-0001`, `source.parent_page_id: null`, `source.chosen_choice_id: null`, `source.write_in_text_hash: null`, `source.storylet_realized: <selected SLT id>`, `actor: system`, `action: bootstrap`, `target: null`, `instrument: null`, `preconditions_checked: []`, `ops: []`, `state_hash_before: null`, `state_hash_after: <PG-0001.state_hash>`, `notes: "Genesis event for STORY-NNN — bootstrap emission, no preceding state."`.

## Phase 8: Initial Choice Generation

Delegate to `branching-story-page-cycle` Phase 8 (Amendment B Pipeline), applying the same production CHC contract to the genesis state produced by Phases 2, 3, 5, 6, and 7. Bootstrap supplies `PG-0001.state_snapshot` as the current state, the selected root storylet's `choice_templates` as anchors, and uses `governor_nudge: "bootstrap root; favor premise-aligned entry pressure and initial agency spread"`.

Run the six page-cycle Phase 8 steps in order:

1. Affordance Space Collection over `PG-0001.state_snapshot`.
2. Salient-Affordance Shortlist + LLM Proposer, with the selected root storylet's `choice_templates` as anchors.
3. Engine Validation Pass.
4. Diversification + Scoring.
5. Surface Label Rendering.
6. Runtime write-in slot N+1 (not stored as CHC at bootstrap).

Emit 4-6 `CHC-NNNN` records into `_source/choices/`. Required diversification:

- one choice that engages the **main thread** directly
- one choice that engages a **relationship**
- one choice that addresses a specific **OBL** (typically a high-urgency one)
- one choice that explores a **less-obvious path** (low-obvious-payoff but high agency)
- one or two **diversification** slots
- at least 3 distinct `choice_mode` values
- at least 3 distinct `poetic_effect` values
- across the set, engage at least 60% of currently open high-salience OBLs when enough high-salience OBLs exist

The write-in slot is N+1 (handled by the runtime, not stored as CHC at bootstrap).

CHC fields (page-cycle-compatible schema in `templates/story-records.yaml`; `branching-story-page-cycle` Phase 8 step 5 is the runtime authority): `id`, `story_id`, `emitted_at_page: PG-0001`, `created_at_page: PG-0001`, `operation`, `actor`, `target`, `uses_fact`, `choice_contract` (`user_intent`, `guaranteed_action`, `success_policy`, `allowed_outcome_band`, `forbidden_outcomes`, `minimum_state_change`), `likely_effects[]`, `choice_mode`, `poetic_effect`, `content_intensity_implied`, and `label` (the user-facing prose).

**Consequence-capacity check**: every emitted CHC must have at least one continuation storylet (in the seed pool or marked as `jit_generatable: true` with a one-line shape spec). A CHC with no continuation is dead-end at runtime — halt and re-derive.

Populate `PG-0001.emitted_choices` with the 4-6 CHC ids.

## Phase 9: Validation Gates (Canon Safety Check phase)

Run all 12 gates. Each must record PASS with a one-line rationale into `STORY_KERNEL.md`'s `validation_trace` field. Any FAIL halts and routes to the responsible phase. A bare "PASS" without rationale is treated as FAIL per the FOUNDATIONS skill discipline.

| # | Gate | Check | Routes to on FAIL |
|---|---|---|---|
| 1 | Mystery firewall (Rule 7) | No `forbidden`-status M-NNNN resolved by any storylet, fact, obligation, or page | Phase 4 |
| 2 | Invariant compatibility (Rule 4) | All `applied_event_ops` respect every world INV's `break_conditions` | Phase 4 |
| 3 | Content policy presence | content_policy block embedded verbatim in STORY_KERNEL.md AND in every assembled LLM prompt this run | Pre-flight |
| 4 | ID uniqueness | Allocated IDs do not collide with any existing record in this story | Pre-flight |
| 5 | Branch path consistency | `PG-0001.branch_path == [PG-0001]` AND `parent_page_id == null` AND `branch_id == BR-0001` | Phase 7 |
| 6 | Cast intention coverage | Every protagonist + major has a non-empty `STINT-0001-<slug>` | Phase 2 |
| 7 | Obligation salience (Rule 5) | Every initial OBL declares salience, urgency, ≥2 payoff_modes | Phase 5 |
| 8 | Epistemic class declared (Rule 1) | Every initial SF declares `epistemic_class` | Phase 3 |
| 9 | Storylet diversity | Seed pool covers ≥5 distinct shapes from the Phase 6 coverage table | Phase 6 |
| 10 | Prose ledger consistency | PG-0001 prose introduces no entity as physically present unless in `cast_present`; load-bearing factual claims are state-snapshot-grounded; resolves no mystery | Phase 7 |
| 11 | Choice consequence-capacity | Every emitted CHC has at least one continuation storylet (in seed pool or `jit_generatable`) | Phase 8 |
| 12 | State_snapshot completeness + recursive reference closure | `current_location`, `entity_status`, `relationships_current`, and the epistemic-faceted fact lists populated; every story-local ID cited inside any record reachable from `state_snapshot` either has `created_at_page == null` (globally legal — author-pool storylets only) or `created_at_page == PG-0001` | Phase 7 |

**Whole-class loads from Pre-flight power gates 1, 2, and 9**: M-record full bodies for gate 1's `forbidden`-status check + `M_resolution_claims` interrogation; INV-record full bodies for gate 2's `break_conditions` audit. Without those whole-class loads, Phase 4 and Phase 9 cannot honor their canon-safety contract.

## Phase 10: HARD-GATE Approval

Present the deliverable summary to the user:

```
PROPOSED STORY BUNDLE: <story_slug> in <world_slug>

STORY-NNN: STORY-<allocated id>
Designing principle: <one sentence>
Cast: <list of STENT with role_in_story>
Mysteries in play: <list of M-NNNN with status + future_resolution_safety>
Threads: <list of THR with type + status + current_pressure>
Initial obligations: <count by salience tier>
Storylet pool: <count> seed storylets covering <shapes>

OPENING PROSE PREVIEW:
<first ~300 words of PG-0001.md from the working buffer>

CHOICES OFFERED:
1. <CHC-NNNN label>
2. <CHC-NNNN label>
...
N+1. (write your own)

FIREWALL VERDICTS:
- Mystery firewall (gate 1): PASS — <rationale>
- Invariant compatibility (gate 2): PASS — <rationale>
- Content policy (gate 3): embedded
- Branch isolation (gate 12): structural

TARGET WRITE PATHS:
- worlds/<world-slug>/stories/<story-slug>/STORY_KERNEL.md
- worlds/<world-slug>/stories/<story-slug>/_source/<class>/<ID>.yaml
  (<count> records across 14 subdirectories)
- worlds/<world-slug>/stories/<story-slug>/pages-prose/PG-0001.md
- worlds/<world-slug>/stories/<story-slug>/INDEX.md
- worlds/<world-slug>/stories/INDEX.md (per-world; create or append)
```

User options:

- **ACCEPT** → proceed to Phase 11.
- **REVISE — narrow** → user adjusts cast / threads / obligations / tone; restart from the affected phase.
- **REVISE — re-render prose** → re-run Phase 7 with constraint feedback inline (re-prompt counter resets).
- **REVISE — different opening storylet** → re-run Phase 7 with a different storylet selection (next-best by score).
- **REJECT** → no writes; halt the bootstrap.

**HARD-GATE fires here**: no file is written until the user explicitly ACCEPTs. Auto Mode does not override.

## Phase 11: Commit / Atomic Write

Single transaction (file order matters — directory tree first, then files in deterministic dependency order; the per-world INDEX.md is the LAST write so partial failure leaves the per-world index unmutated):

1. `mkdir -p worlds/<world-slug>/stories/<story-slug>/_source/{entities,facts,events,obligations,consequences,threads,relationships,intentions,storylets,locations,objects,artifacts,branches,pages,choices}` and `worlds/<world-slug>/stories/<story-slug>/pages-prose`.
2. `Write worlds/<world-slug>/stories/<story-slug>/STORY_KERNEL.md` (premise + content_policy preamble verbatim + designing principle + cast bind list + themes + content_intensity baseline + POV mode + central dramatic question + `mysteries_in_play[]` + `invariants_acknowledged[]` + `execution_mode_default` + `validation_trace` + STORY-NNN frontmatter; template at `templates/story-kernel.md`).
3. `Write` each `_source/<class>/<ID>.yaml` record (deterministic order: entities → facts → events (SE-0001) → obligations → threads → relationships → intentions → storylets → locations → objects → artifacts → branches (BR-0001) → pages (PG-0001) → choices). Schemas at `templates/story-records.yaml`.
4. `Write worlds/<world-slug>/stories/<story-slug>/pages-prose/PG-0001.md` (the rendered opening prose from Phase 7's working buffer).
5. `Write worlds/<world-slug>/stories/<story-slug>/INDEX.md` (per-bundle index — branches / leaves / threads / mysteries / storylet-shape distribution; template at `templates/story-bundle-index.md`).
6. **Per-world index** at `worlds/<world-slug>/stories/INDEX.md`:
   - If file does not exist: create with header `# Stories — <World-Slug-TitleCased>` followed by one blank line, then the story line.
   - If file exists: read; append the new story's line in the format `- [STORY-NNN] <story-slug> — <designing-principle one-liner> | cast: CHAR-NNNN, CHAR-NNNN | mysteries_in_play: M-N, M-N | execution_mode: <mode> | created: <iso8601>`; re-sort alphabetically by `STORY-NNN`; write back via direct `Edit`.
   - `worlds/<world-slug>/stories/INDEX.md` is NOT under `_source/`, so Hook 3 does not block direct `Write` / `Edit`.

**Direct `Write` is the correct mutation surface** (per the Shape A integration posture — story records are not world canon, no engine ops exist for story-record classes, and Hook 3's match pattern `worlds/<slug>/_source/...` does NOT match `worlds/<slug>/stories/<slug>/_source/...`).

**Partial-failure recovery**: if any write in steps 1-5 fails, the user receives the failure with the specific path and instruction to either manually clean up the partial bundle or re-invoke the skill (which will abort at Pre-flight's slug-collision check on the partial bundle's existence). The per-world INDEX.md write at step 6 is intentionally LAST so a partial bundle never appears in the per-world index.

Report all written paths. **Do NOT commit to git.** The user reviews the diff and commits.

## Validation Rules This Skill Upholds

| Rule | Phase enforced | Mechanism |
|---|---|---|
| Rule 1: No Floating Facts | Phase 3 | Every imported SF declares `epistemic_class`, `truth_value`, `certainty`, `known_by`, `subject/predicate/object`; world-canon imports declare `derived_from_cf` + `canon_relation: canon_consistent`; premise-specific facts declare `derived_from_cf: null` + `canon_relation: not_applicable` rather than null prerequisites. Story-local facts that aren't world canon get explicit `not_applicable`, never silent omission. Phase 9 gate 8 is the structural backstop. |
| Rule 4: No Globalization by Accident | Phase 2 + Phase 4 + Phase 7 | Phase 2 cast binding respects each CHAR's `current_location` and institutional embedding from the world dossier (cast cannot be teleported by binding). Phase 4 Invariant Audit runs the premise + cast + initial threads + initial obligations against every INV record loaded whole-class at Pre-flight; unresolvable tensions hard-reject. Phase 7 storylet selection enforces storylet-pool-authoring's returned Rule-4/Rule-7 validation verdicts plus cast-presence + tone alignment so PG-0001 cannot inadvertently universalize a local capability. Phase 9 gate 2 is the structural backstop. |
| Rule 5: No Consequence Evasion | Phase 5 | Every initial OBL must declare `salience`, `urgency`, AND ≥2 `possible_payoff_modes` (halt-on-violation, NOT a soft warning). Consequences ledger initialized at PG-0001 with `consequences_pending: []` and `consequences_addressed: []` so the runtime has a tracking surface from the first tick. Phase 9 gate 7 is the structural backstop. |
| Rule 7: Preserve Mystery Deliberately | Phase 4 + Phase 6 + Phase 7 + Phase 9 | Phase 4 Mystery Firewall declares `mysteries_in_play[]` with each M's `status` + `future_resolution_safety` and hard-rejects `forbidden`-status M resolutions. Phase 6 delegates seed-pool validation to `storylet-pool-authoring`, whose Phase 4 gates 1 and 2 cross-check each SLT against whole-class M loads and forbid `canon_candidate` authority on author-pool storylets. Phase 7 hard-filters PG-0001 storylet selection to storylets with `mystery_safety.forbidden_M_resolved: false` and no `canon_candidate` resolution authority. Phase 9 gate 1 cross-checks the rendered prose. Whole-class M-record load via `mcp__worldloom__list_records(record_type='mystery_record', include_full_body=true)` is named in §World-State Prerequisites. |

## Record Schemas

This skill's outputs are story-bundle records. None are Canon Fact Records or Change Log Entries (canon-reading skill — N/A).

- **Story records (atomic-YAML, one file per record)**: STENT, SF, SE, OBL, CNSQ, THR, SREL, STINT, STLOC, STOBJ, BR, PG, CHC, plus story-local DA. Schemas at `templates/story-records.yaml` (one document per class with required + optional field enumeration and a worked example value per class). SLT records use `.claude/skills/storylet-pool-authoring/templates/storylet-record.yaml` as the schema authority.
- **STORY_KERNEL.md** — markdown with frontmatter and body sections. Template at `templates/story-kernel.md`.
- **Per-bundle INDEX.md** — Branches table, Active threads table, Mysteries in play table, Storylet pool shape distribution. Template at `templates/story-bundle-index.md`.
- **Content policy block** (NC-21 verbatim) — at `templates/content-policy.txt`. Embedded into STORY_KERNEL.md AND prepended to every LLM prompt assembled by Phase 7. Phase 9 gate 3 is the structural backstop.

No Canon Fact Record template; no Change Log Entry template. The skill emits no world-level canon and no Change Log Entries — both are explicit N/A in the FOUNDATIONS Alignment table below.

## FOUNDATIONS Alignment

| Principle | Phase / Mechanism | Notes |
|---|---|---|
| Tooling Recommendation (§"non-negotiable") | Pre-flight loads `docs/FOUNDATIONS.md` + `WORLD_KERNEL.md` + `ONTOLOGY.md`; whole-class M + INV record loads via `list_records(... include_full_body=true)`; premise-bounded retrieval via `get_context_packet`. Whole-class enumeration authorized for class-bounded firewalls per FOUNDATIONS §Tooling Recommendation. | Direct `Read` of `_source/<world-subdir>/` redirected to MCP retrieval by Hook 2. |
| Multi-world directory discipline | Single-world scope; required `world_slug` argument; ALL world-state reads rooted at `worlds/<world-slug>/`; ALL writes rooted at `worlds/<world-slug>/stories/<story-slug>/` plus the per-world `worlds/<world-slug>/stories/INDEX.md`. | Bootstrap-style refusal: target `stories/<story-slug>/` must not exist. |
| Rule 1: No Floating Facts | Phase 3 SF schema requires `epistemic_class` + `derived_from_cf` (or `canon_relation: not_applicable`) + scoping fields; Phase 9 gate 8 backstop. | Story-local facts that aren't world canon declare `not_applicable` rather than null. |
| Rule 2: No Pure Cosmetics | N/A | Not applicable — canon-reading skill imports existing world canon as story-local SFs; it does NOT introduce new world-level species / rituals / technologies / artifacts / institutions. The Rule 2 enforcement surface is `canon-addition` Phase 5 (Diffusion Analysis) and `propose-new-canon-facts` Phase 4 (Domain Coverage); story-local STENT / STOBJ / STLOC are not Rule-2-eligible because they are story-scoped, not world-canon. |
| Rule 3: No Specialness Inflation | N/A | Not applicable — canon-reading skill produces no new world-level capability, artifact, or species. The enforcement surface is `canon-addition` (CF stabilizers + Rule-3 audit). Story-local capability assertions inherit from the source CF's `costs_and_limits` (per Phase 3 import rules); they do not inflate world-level specialness. |
| Rule 4: No Globalization by Accident | Phase 2 cast binding respects CHAR `current_location`; Phase 4 Invariant Audit (whole-class INV load); Phase 7 storylet selection respects distribution; Phase 9 gate 2 backstop. | INV `break_conditions` enforced against premise + cast + threads + obligations. |
| Rule 5: No Consequence Evasion | Phase 5 OBL halt-rule: salience + urgency + ≥2 payoff_modes mandatory; consequences ledger initialized at PG-0001; Phase 9 gate 7 backstop. | An OBL with one payoff mode halts the bootstrap. |
| Rule 6: No Silent Retcons | N/A | Not applicable — canon-reading skill emits no Change Log Entries because it does not mutate world canon. Story-local supersession (`SF.supersedes`) is a runtime-page-cycle concern, not a Rule-6 surface. The Rule 6 enforcement surface for any later promotion of story-local facts to world canon is `canon-addition` (via the future `story-fact-promotion-to-canon` skill). |
| Rule 7: Preserve Mystery Deliberately | Phase 4 mystery firewall (whole-class M load); Phase 6 delegates SLT validation to `storylet-pool-authoring` Phase 4 gates 1 and 2; Phase 7 storylet hard-filter; Phase 9 gate 1 backstop. | `forbidden`-status M resolutions hard-reject the bootstrap; author-pool seed storylets with `canon_candidate` authority are rejected by the delegated storylet-pool validation packet before bootstrap's Phase 10 HARD-GATE. |
| Rule 11: No Spectator Castes by Accident | N/A | Not applicable — canon-reading skill introduces no exceptional capability that could create spectator castes. The enforcement surface is `canon-addition` Phase 5 + `propose-new-canon-facts` (CF leverage-enumeration). Story-local cast capabilities inherit from the source CF's distribution + costs. |
| Rule 12: No Single-Trace Truths | N/A | Not applicable — same reasoning as Rule 2 / 3 / 11; the trace-multiplicity discipline applies to new world-level hard-canon truths, not to story-local imports. The enforcement surface is `canon-addition` + `propose-new-canon-facts`. |
| Canon Layering | Phase 3 imported SFs preserve `derived_from_cf` and `canon_relation`; Phase 4 firewall preserves Mystery Reserve layer; story-only entities marked `story_only: true` (a soft-canon-local-to-story register, not promoted to any world canon layer without explicit `story-fact-promotion-to-canon`). | Story bundle is its own per-story layer below world canon. |
| Change Control Policy | N/A | Not applicable — canon-reading skill emits no Change Log Entries. Per FOUNDATIONS §Change Control Policy, "every approved change must get a record" applies to world-level canon mutations; story bundles are not world-level canon. The handoff is `canon-addition` for any later promotion via `story-fact-promotion-to-canon`. |

## Guardrails

- **HARD-GATE is absolute** (see top of file). No file is written until Phase 9 records 12 PASSes with rationale AND the user explicitly approves the Phase 10 deliverable summary. Auto Mode does not override.
- **Never write world-level canon.** This skill never `Write`s or `Edit`s `worlds/<world-slug>/WORLD_KERNEL.md`, `ONTOLOGY.md`, or any `worlds/<world-slug>/_source/<world-subdir>/*.yaml` record. Hook 3 enforces the latter. No CF, CH, INV, M, OQ, ENT, or world-level SEC record is emitted by this skill.
- **Never overwrite an existing story bundle.** Pre-flight slug-collision aborts when `worlds/<world-slug>/stories/<story-slug>/` exists. To re-run with corrected inputs, the user must either supply a different `story_slug` OR manually delete the existing bundle.
- **Direct `Write` is the correct mutation surface for story-bundle records under the Shape A integration posture.** Hook 3's match pattern is `worlds/<slug>/_source/...` which does NOT match `worlds/<slug>/stories/<slug>/_source/...`. Story records are not world canon and no engine ops exist for them. A future maintainer who "upgrades" the skill to engine routing must FIRST land patch-engine ops + Hook 3 namespace extension + record-schema validators for the story-record classes (deferred-integration tickets named below).
- **Known integration debt** (deferred per Shape A; design exploits these once landed):
  - Hook 3 / engine-op / validator extensions are NOT scoped for this generation; they will be designed when the runtime page-cycle stabilizes the schemas. Story-bundle IDs use `mcp__worldloom__allocate_next_id(world_slug, id_class, story_slug=...)`; direct `Write` remains the correct mutation surface.
- **Sibling interop**:
  - **Consumes (existing)**: `character-generation` outputs (CHAR-NNNN dossiers via `cast_bind_list`); `emergent-pressure-events` outputs (EPE cards via `epe_card_filter`).
  - **Consumes (existing)**: `branching-story-page-cycle` PG/SE/CHC production schema contract for root page, genesis event, and initial choice records.
  - **Consumes (existing)**: `storylet-pool-authoring` seed-mode storylet authority. Phase 6 uses it with `focus_area: bootstrap_mix` and `parent_skill_invocation: true`, returning approved seed SLTs in memory for bootstrap's Phase 11 write transaction.
  - **Consumes (existing)**: `branching-story-health-audit` — once a bootstrapped bundle has accumulated pages via `branching-story-page-cycle`, the audit's report informs re-bootstrap considerations and surfaces structural issues (branch isolation, snapshot drift, mystery firewall) the bootstrap should be aware of for any future bundles in the same world.
  - **Consumes (future, not yet shipping)**: `story-fact-promotion-to-canon`.
  - **Produces inputs for**: `branching-story-page-cycle` and the future audit / promotion skills above.
- **Content policy is a contract, not a setting.** The NC-21 block embedded in `templates/content-policy.txt` is the skill's discipline floor. It is embedded verbatim in STORY_KERNEL.md AND prepended to every LLM prompt assembled by Phase 7. `content_intensity_baseline` (`tame` / `mature` / `explicit`) is a routing tag for tone consistency within branches — never a censor.
- **Worktree discipline**: if invoked inside a worktree, all paths resolve from the worktree root.
- **Do NOT commit to git.** Writes land in the working tree only; the user reviews the diff and commits.

## Final Rule

A story bundle is not bootstrapped because PG-0001's prose is rendered. It is bootstrapped only when the causal-engine ledgers are populated (entities, facts with declared epistemic class, events, obligations with ≥2 payoff modes, consequences ledger initialized, threads, relationships, intentions, storylets with shape diversity, locations, objects, branches, pages, choices), the cast has intentions, the storylet pool has shape diversity, the choices have continuation paths, the firewall is intact, the root branch (BR-0001) record exists, the recursive-reference-closure rule is satisfied at PG-0001, and the user has explicitly approved the Phase 10 deliverable. The runtime page-cycle inherits this state — if any of the above is missing, the runtime cannot honor wild user choices coherently, and that is the entire reason this pipeline exists.
