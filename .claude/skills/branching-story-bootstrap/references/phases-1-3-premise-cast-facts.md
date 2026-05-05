# Phases 1-3: Premise Normalization, Cast Binding, World-Fact Import

Combined reference for the three story-state-setup phases that turn the user's premise + the cast list + world canon into the initial in-memory STENT/STINT/SF ledger that Phases 4+ audit, structure, and produce against.

---

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

---

## Phase 2: Cast Binding

For each CHAR in `cast_bind_list`, mirror the world dossier into a story-local `STENT-NNNN`. Required STENT fields: `id`, `story_id`, `world_ent_id` (the world-level ENT-NNNN this mirrors — `null` for character mirrors since CHARs are hybrid character records under `worlds/<slug>/characters/`, not atomic ENTs under `worlds/<slug>/_source/entities/`; `world_ent_id` is populated only when the STENT mirrors a place / polity / geography / peoples-cluster ENT from the genesis registry), `character_id` (the world's CHAR id), `name`, `role_in_story` (`protagonist | major | supporting | antagonist | foil`), `present_at_start`, `intention_snapshot_id`, `created_at_page: PG-0001`, `notes`. Full schema in `templates/story-records.yaml`.

**Story-only entities**: if the user names entities not in world canon (e.g., a new village invented for this story, or a peer companion named in a CHAR dossier brief but not promoted to a CHAR-NNNN of its own), create them as `STENT-NNNN` with `world_ent_id: null` and `story_only: true`. These are counterfactual / soft-canon-local-to-story unless promoted via `story-fact-promotion-to-canon`. Story-only STENTs MAY be listed in STORY_KERNEL.md `cast_bind_list` with `char_id: null` when they are load-bearing for the story bundle (named cast members, even if offstage at PG-0001 — they live in STINT.relationships and the runtime needs to resolve them by id). Story-only entities that exist purely as state-snapshot scenery (a town, a generic crowd) live in `_source/entities/` only and are not surfaced in `cast_bind_list`.

**Initial intention snapshot per major character**: emit `STINT-NNNN.yaml` (bare-numeric id per the patch engine's `^STINT-\d{4}$` contract; per-character semantics carried via the record's `character_id` field, not by id suffix) with `goals`, `fears`, `secrets[SF-NNNN]`, `beliefs[SF-NNNN]`, `relationships{STENT-id: state}`, `emotional_state`, `current_pressure: 0..10`, `traits`, `values{axis: weight}`, `created_at_page: PG-0001`.

**Rule (halt condition)**: a character whose `role_in_story` is `protagonist` or `major` and whose STINT carries no goals AND no fears AND no beliefs cannot be driven by the runtime — halt the phase and request the user supply intention seeds.

---

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
