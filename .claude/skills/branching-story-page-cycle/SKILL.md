---
name: branching-story-page-cycle
description: "Use when advancing one tick of an existing branching story bundle inside an existing worldloom world — given a parent page (ANY page in the tree, including non-leaf, which is the fork mechanism) and either a chosen CHC-NNNN from that page's emitted choices OR a free-form write-in, executes the runtime causal-promise engine to render the next page. Produces: the next-page bundle under worlds/<world-slug>/stories/<story-slug>/_source/<class>/ — PG-NNNN + SE-NNNN + per-turn SF/OBL/CNSQ/THR/SREL/STINT/CHC records (and JIT SLT-NNNN / story-local STLOC/STOBJ/DA-NNNN if introduced this turn) + BR-NNNN (new on fork; existing-branch leaf updated via supersession on continuation) + pages-prose/PG-NNNN.md + per-bundle INDEX.md update. Mutates: only worlds/<world-slug>/stories/<story-slug>/ (never WORLD_KERNEL.md, ONTOLOGY.md, or any worlds/<world-slug>/_source/<world-subdir>/*.yaml record); world-canon mutation routes through story-fact-promotion-to-canon (HARD-GATE preserved in every execution mode)."
user-invocable: true
arguments:
  - name: world_slug
    description: "Directory slug of an existing world under worlds/<world-slug>/. Pre-flight aborts if missing."
    required: true
  - name: story_slug
    description: "Directory slug of an existing story bundle under worlds/<world-slug>/stories/<story-slug>/. Pre-flight aborts if missing — this skill never bootstraps a story; use branching-story-bootstrap for that."
    required: true
  - name: parent_page_id
    description: "PG-NNNN. Can be ANY page in the tree, including non-leaf. A non-leaf parent_page_id IS the fork mechanism — a new BR-NNNN is allocated on detection. Pre-flight aborts if the page does not belong to this story."
    required: true
  - name: chosen_choice_id
    description: "CHC-NNNN from parent_page.emitted_choices. Required if manual_action_text is absent. Mutually exclusive with manual_action_text — Pre-flight enforces 'exactly one of'."
    required: false
  - name: manual_action_text
    description: "Free-form user write-in (the write-in path). Required if chosen_choice_id is absent. Mutually exclusive with chosen_choice_id. Phase 1 Path B routes via the four-way decision: ACCEPT / ACCEPT_BUT_TRANSFORM / TREAT_AS_ATTEMPT / REFUSE_ONLY_THROUGH_WORLD_LOGIC. Never silently rejected."
    required: false
  - name: tone_override
    description: "Overrides storylet tone weighting for this turn."
    required: false
  - name: content_intensity_override
    description: "One of: tame | mature | explicit. Overrides storylet intensity filter ±1 band for this turn."
    required: false
  - name: pov_override
    description: "Temporarily switch POV character for this turn (must be in cast_present)."
    required: false
  - name: pace_hint
    description: "One of: action | sequel | reflection | aftermath. Biases narrative governor weighting (Phase 6) for this turn."
    required: false
  - name: length_target
    description: "Words for the rendered prose (default inherited from STORY_KERNEL.target_page_length)."
    required: false
  - name: execution_mode
    description: "One of: authoring | interactive_runtime | batch_generation. Overrides the story bundle's execution_mode_default. Per-mode behavior governs Phase 10 HARD-GATE visibility, mandatory-critic policy, and auto-write — but NEVER lifts the Phase 4.5 canon-promotion HARD-GATE handoff to story-fact-promotion-to-canon."
    required: false
---

# Branching Story Page Cycle

Runs one tick of the runtime causal-promise engine: parses the user's choice (structured CHC or free-form write-in), runs impact analysis, checks continuation feasibility, mutates story-bundle ledgers via append-only supersession, recomputes narrative health, selects the next storylet (with JIT expansion if the pool is thin), renders the next page's prose, generates 4-6 structured choices + a write-in slot, validates against firewalls and the recursive branch-isolation invariant, and atomically writes the new records — fork and replay are structurally identical to continuation (point `parent_page_id` at any page, leaf or non-leaf).

<HARD-GATE>
Do NOT write any file under `worlds/<world-slug>/stories/<story-slug>/_source/` or `worlds/<world-slug>/stories/<story-slug>/pages-prose/` and do NOT `Edit` `worlds/<world-slug>/stories/<story-slug>/INDEX.md` until: (a) Pre-flight resolves `worlds/<world-slug>/stories/<story-slug>/`, validates `parent_page_id` exists and belongs to this story, validates exactly one of `{chosen_choice_id, manual_action_text}` is present, allocates the next `PG-NNNN` (and `BR-NNNN` if forking) via `mcp__worldloom__allocate_next_id(world_slug, id_class, story_slug=...)`, resolves `execution_mode`, and confirms the content_policy block is loaded for downstream prompt assembly; (b) Phase 9 Validation Gates record PASS with a one-line rationale for every gate (mystery firewall, invariant compatibility, recursive reference closure, snapshot-replay equality, ID uniqueness, content policy presence, prose ledger consistency, choice contract integrity, choice consequence-capacity, state_snapshot integrity, epistemic class declared, consequence persistence); (c) the user has explicitly approved the Phase 10 deliverable summary IF `execution_mode == authoring` (the default). Under `execution_mode == interactive_runtime` the Phase 10 HARD-GATE on bundle writes is hidden and auto-commits after deterministic validation passes; under `execution_mode == batch_generation` it is hidden until validation failure or a configured checkpoint. **The Phase 4.5 canon-promotion handoff to `story-fact-promotion-to-canon` is a separate, never-elided HARD-GATE that fires regardless of `execution_mode`** — world-canon mutation is always an explicit user act per FOUNDATIONS §Default Reality + Rule 6. Auto Mode does not override the Phase 4.5 handoff.
</HARD-GATE>

## Process Flow

```
Pre-flight (resolve worlds/<world-slug>/stories/<story-slug>/;
            validate parent_page_id belongs to this story;
            allocate next PG-NNNN via allocate_next_id; detect fork →
            allocate BR-NNNN if non-leaf parent; validate exactly
            one of {chosen_choice_id, manual_action_text}; resolve
            execution_mode; load content_policy block; assemble
            retrieval — context_packet scoped to parent.state_snapshot
            + cast_present + period; whole-class M + INV record loads
            for Phase 4/Phase 9 firewalls; record canon_revision
            audit-trail field for the new page)
      |
      v
Phase 1: Choice Resolution                  (Path A: standard CHC →
                                             ProposedEvent populated
                                             from CHC structured-op
                                             fields; Path B: write-in →
                                             LLM parser → ProposedEvent →
                                             engine validation → four-way
                                             routing {ACCEPT, ACCEPT_BUT
                                             _TRANSFORM, TREAT_AS_ATTEMPT,
                                             REFUSE_ONLY_THROUGH_WORLD_LOGIC};
                                             write-in NEVER silently
                                             rejected)
      |
      v
Phase 2: Impact Analysis                    (facts_created/invalidated;
                                             obligations opened/paid_off/
                                             complicated/transferred/
                                             abandoned_with_acknowledgment;
                                             intentions_pressure_deltas;
                                             threads_pressure_deltas;
                                             impossible_storylets;
                                             newly_eligible_storylets;
                                             transferable_functions on
                                             load-bearing-character removal;
                                             required_aftermath items
                                             persisted as CNSQ in Phase 5)
      |
      v
Phase 3: Continuation Feasibility Check     (≥1 storylet satisfied by
                                             new state? required_aftermath
                                             addressable? forbidden-status
                                             M preserved? INV violation?
                                             Terminal-feasibility branch:
                                             coherent terminal honored;
                                             on infeasibility: surface
                                             ACCEPT-ANYWAY / TRANSFORM /
                                             ATTEMPT / DIFFERENT-CHOICE)
      |
      v
Phase 4: Storylet Selection                 (hard filters → salience
                                             scoring → weighted-pick from
                                             top-K; NEVER always-take-top;
                                             governor_nudge from prior
                                             turn biases weighting; JIT
                                             expansion fires only when
                                             no candidate scores above
                                             threshold AND consequence-
                                             capacity required JIT)
      |
      v
Phase 4.5: Mystery Resolution Authority     (per-claim routing per
                                             selected storylet's
                                             mystery_safety.M_resolution
                                             _claims: apparent → continue
                                             with SF epistemic_class=
                                             apparent or belief;
                                             branch_local_counterfactual
                                             → continue with SF
                                             canon_relation=canon_divergent
                                             [story-mode gated];
                                             canon_candidate → PAUSE
                                             for HARD-GATE handoff to
                                             story-fact-promotion-to-canon
                                             [HARD-GATE preserved in
                                             every execution_mode];
                                             forbidden-status M never
                                             resolved at any authority
                                             level)
      |
      v
Phase 5: State Mutation                     (apply structured ops from
                                             ProposedEvent + selected
                                             storylet's effects; append-
                                             only via supersession (new
                                             record with logical_id +
                                             supersedes); compute
                                             next_snapshot from parent
                                             snapshot + ops per closed
                                             op_type enum; persist
                                             required_aftermath as CNSQ
                                             unless absorbed by newly-
                                             opened OBL; verify branch-
                                             isolation invariant: every
                                             emergent record carries
                                             created_at_page == this_PG)
      |
      v
Phase 6: Narrative Governor Recompute       (recompute narrative_health:
         + Nudge                              open_obligation_count,
                                             high_salience_unpaid_count,
                                             average_obligation_age,
                                             contradiction_risk,
                                             causal_connectivity,
                                             character_motivation_coverage,
                                             unresolved_threat_pressure,
                                             recent_consequence_density,
                                             recent_reflection_density,
                                             novelty, tension, agency_score;
                                             generate governor_nudge from
                                             health conditions; HOMEOSTAT
                                             not act-spine)
      |
      v
Phase 6.5: Closure Readiness Detection      (state-derived signal: no
                                             required-closure OBL open
                                             without acknowledgment route;
                                             no high-urgency CNSQ pending;
                                             ≥1 major THR resolved/failed/
                                             transformed/deliberately-left;
                                             no STINT showing >3-step
                                             pressure delta unrefreshed;
                                             contradiction_risk < 0.4;
                                             when ready: Phase 8 widens
                                             choice set with branch-ending/
                                             pausing options; never forces
                                             termination)
      |
      v
Phase 7: Page Render                        (LLM prompt assembly with
                                             content_policy verbatim
                                             FIRST; then story kernel +
                                             selected storylet + scene
                                             context + recent prose
                                             continuity along branch_path
                                             only + governor_nudge; LLM
                                             produces prose; post-render
                                             extraction classifies load-
                                             bearing claims: already-
                                             ledgered / incidental-color /
                                             needs-ledger-record /
                                             contradiction / mystery-risk;
                                             up to 3 re-prompts on
                                             fail-fast checks; mention-vs-
                                             depiction distinction is
                                             load-bearing)
      |
      v
Phase 8: Choice Generation                  (Amendment B pipeline: step 1
         (Amendment B Pipeline)              affordance space collection
                                             from state_snapshot; step 2
                                             salient-affordance shortlist
                                             top-K + LLM proposer of 6-10
                                             structured CHCs; step 3
                                             engine validation pass;
                                             step 4 diversification +
                                             scoring (≥3 distinct
                                             choice_modes + ≥3 distinct
                                             poetic_effects + ≥60% of
                                             open high-salience OBLs);
                                             step 5 surface-label
                                             rendering by LLM; step 6
                                             write-in slot is N+1; every
                                             emitted CHC carries
                                             choice_contract block)
      |
      v
Phase 9: Validation Gates                   (12 gates — see HARD-GATE;
         (Canon Safety Check phase)          each PASS with one-line
                                             rationale; FAIL routes to
                                             responsible phase; auto-
                                             correctable: re-render prose,
                                             re-generate choices; user-
                                             required: firewall breach,
                                             INV violation, recursive
                                             reference closure breach)
      |
      v
Phase 10: HARD-GATE Approval                (deliverable summary: page
                                             header + parent + storylet +
                                             choice/write-in routing +
                                             prose preview ~300 words +
                                             state delta from parent +
                                             narrative health + choices
                                             offered + firewall verdicts +
                                             target write paths;
                                             --user options-->
                                             ACCEPT / REVISE-prose /
                                             REVISE-different-storylet /
                                             REVISE-different-choices /
                                             REJECT;
                                             gate visibility per
                                             execution_mode per HARD-GATE
                                             block — Phase 4.5 handoff
                                             is separate and never
                                             elided)
      |
   accept (or auto-pass per execution_mode)
      |
      v
Phase 11: Atomic Write + INDEX Update       (single transaction:
                                             PG-NNNN.yaml first, then
                                             SE-NNNN, then per-class
                                             SF/OBL/CNSQ/THR/SREL/STINT/
                                             CHC, then JIT SLT-NNNN if
                                             any, then story-local STLOC/
                                             STOBJ/DA if any, then
                                             BR-NNNN superseder [or new
                                             BR on fork], then pages-prose/
                                             PG-NNNN.md, then INDEX.md
                                             LAST so partial-failure leaves
                                             index unmutated; NO git
                                             commit)
```

## Inputs

### Required

- `world_slug` — directory slug of an existing world under `worlds/<world-slug>/`.
- `story_slug` — directory slug of an existing story bundle under `worlds/<world-slug>/stories/<story-slug>/`. Pre-flight aborts if missing.
- `parent_page_id` — `PG-NNNN` belonging to this story. Can be ANY page in the tree, leaf or non-leaf. A non-leaf parent IS the fork mechanism.

### Exactly one of

- `chosen_choice_id` — `CHC-NNNN` in `parent_page.emitted_choices` (standard continuation path).
- `manual_action_text` — free-form user write-in (write-in path; Phase 1 Path B).

Pre-flight aborts if neither or both are provided.

### Optional

- `tone_override` — overrides storylet tone weighting for this turn.
- `content_intensity_override` — `tame | mature | explicit`; overrides storylet intensity ±1 band filter.
- `pov_override` — temporarily switch POV character (must be in `cast_present`).
- `pace_hint` — `action | sequel | reflection | aftermath`; biases Phase 6 governor weighting.
- `length_target` — words for the rendered prose (default inherited from `STORY_KERNEL.target_page_length`).
- `execution_mode` — `authoring | interactive_runtime | batch_generation`; overrides bundle's `execution_mode_default`. Per-mode behavior governs Phase 10 HARD-GATE visibility, mandatory-critic policy, and auto-write — but NEVER lifts the Phase 4.5 canon-promotion HARD-GATE handoff.

### Reads (via MCP retrieval and direct file Read per FOUNDATIONS §Canonical Storage Layer)

- `worlds/<world-slug>/stories/<story-slug>/STORY_KERNEL.md` — direct Read; provides designing principle, content_intensity_baseline, mysteries_in_play[], invariants_acknowledged[], execution_mode_default.
- `worlds/<world-slug>/stories/<story-slug>/_source/pages/<parent_page_id>.yaml` — direct Read (story-bundle records are not under Hook 3's `worlds/<slug>/_source/` match pattern).
- Records cited by `parent_page.state_snapshot` — direct Read of `worlds/<world-slug>/stories/<story-slug>/_source/<class>/<ID>.yaml` for every cited SF, OBL, CNSQ, THR, SREL, STINT, SLT, STLOC, STOBJ, BR.
- Pages along `parent_page.branch_path` — last ~2 pages of `pages-prose/PG-NNNN.md` along this branch ONLY. The engine NEVER reads sibling-branch pages (Phase 9 recursive reference closure validation enforces).
- Current storylet pool — `worlds/<world-slug>/stories/<story-slug>/_source/storylets/SLT-*.yaml` filtered by `visibility` block: `global_author_pool` / `branch_prefix_scoped` / `branch_scoped`.
- World canon (CF + M + INV + ENT) scoped to cast_present + location + period via `mcp__worldloom__get_context_packet(world_slug, task_type='story_page_cycle', ...)`.
- Whole-class Mystery Reserve firewall load via `mcp__worldloom__list_records(world_slug, record_type='mystery_record', include_full_body=true)`.
- Whole-class Invariant audit load via `mcp__worldloom__list_records(world_slug, record_type='invariant_record', include_full_body=true)`.

## Output

### Files written (single transaction at Phase 11)

All emergent records live under `worlds/<world-slug>/stories/<story-slug>/_source/`:

| Class | File path | Created when |
|---|---|---|
| Page | `pages/PG-NNNN.yaml` | Always |
| Story event | `events/SE-NNNN.yaml` | Always (the structured-op event applied this turn) |
| Story facts | `facts/SF-NNNN.yaml` | One per fact created OR invalidated this turn (invalidation = new record with `supersedes`) |
| Story obligations | `obligations/OBL-NNNN.yaml` | One per OBL opened / paid_off / complicated / transferred / abandoned_with_acknowledgment |
| Story consequences | `consequences/CNSQ-NNNN.yaml` | One per `required_aftermath` item from Phase 2 (unless absorbed by a newly-opened OBL); one per `consequence_address` op |
| Story threads | `threads/THR-NNNN.yaml` | One per thread state change (status / pressure delta) |
| Story relationships | `relationships/SREL-NNNN.yaml` | One per relationship state change (axes deltas / public_status / private_status_by_actor) |
| Story intentions | `intentions/STINT-NNNN-<char>.yaml` | One per major character whose pressure / emotional_state / beliefs shifted |
| Storylet (JIT only) | `storylets/SLT-NNNN.yaml` | IF Phase 4 JIT expansion fired via `storylet-pool-authoring` `mode=jit`; carries `provenance.origin: runtime_jit`, `created_at_page: this_PG`, and `visibility.scope: branch_scoped` |
| Story location | `locations/STLOC-NNNN.yaml` | IF a new story-local location is introduced this turn |
| Story object | `objects/STOBJ-NNNN.yaml` | IF a new story-local object is introduced or an existing object's state changed via supersession |
| Story-local diegetic artifact | `artifacts/DA-NNNN.yaml` | IF a diegetic artifact is created in-story this turn (a letter authored, recording produced, etc.) |
| Branch | `branches/BR-NNNN.yaml` | New on fork (non-leaf parent); existing-branch leaf updated via supersession on continuation |
| Choice | `choices/CHC-NNNN.yaml` | One per emitted choice (4-6 per turn) |
| Rendered prose | `pages-prose/PG-NNNN.md` | Always |

### Per-bundle index update

`worlds/<world-slug>/stories/<story-slug>/INDEX.md` — append/edit:
- New leaf entry per branch (or new branch entry if fork).
- Thread status changes.
- Latest health snapshot.
- If fork: new branch row in branches table.

### No canon-file mutations

This skill never writes `WORLD_KERNEL.md`, `ONTOLOGY.md`, or any `worlds/<world-slug>/_source/<world-subdir>/*.yaml` record. Hook 3 enforces the latter. The Phase 4.5 `canon_candidate` route hands off to `story-fact-promotion-to-canon` (which runs separately under its own HARD-GATE).

### ID Conventions — branch-isolation invariant

All emergent story-local records (SF / SE / OBL / CNSQ / THR / SREL / STINT / SLT-JIT / STLOC / STOBJ / DA / CHC / PG / BR-on-fork) carry `created_at_page: PG-NNNN` — the new page produced this turn. Author-pool storylets are the one exception: they retain `created_at_page: null` and are globally visible (set by storylet-pool-authoring at authoring time in seed/focus modes).

The branch-isolation invariant is structurally enforced by this field combined with Phase 9's recursive reference closure validation gate.

## World-State Prerequisites

Before this skill acts, it MUST receive (per FOUNDATIONS §Tooling Recommendation and §Canonical Storage Layer):

- `docs/FOUNDATIONS.md` — read at Pre-flight; the rules that govern Phase 1 four-way routing (Rule 5 No Consequence Evasion at story scope), Phase 4 storylet selection (Rule 7 Mystery Reserve Preservation), Phase 5 append-only supersession discipline (Rule 6 No Silent Retcons applied at story scope by analogy), Phase 7 prose render constraints, Phase 9 validation gates, and the Phase 4.5 canon-promotion handoff to `story-fact-promotion-to-canon` all live there.
- `worlds/<world-slug>/WORLD_KERNEL.md` — primary-authored; read directly per FOUNDATIONS §Canonical Storage Layer §Authored-primary surfaces. Provides genre/tonal contract that grounds Phase 7 prose render.
- `worlds/<world-slug>/ONTOLOGY.md` — primary-authored; read directly. Provides Categories + Relation Types for Phase 2 impact analysis vocabulary alignment.
- `worlds/<world-slug>/stories/<story-slug>/STORY_KERNEL.md` — direct Read (story-bundle root file, not engine-routed). Provides designing principle, content_intensity_baseline, mysteries_in_play[], invariants_acknowledged[], execution_mode_default.
- `worlds/<world-slug>/stories/<story-slug>/_source/pages/<parent_page_id>.yaml` — direct Read (story-bundle records are not under Hook 3's `worlds/<slug>/_source/` match pattern). Bedrock state for this turn — `parent_page.state_snapshot` is the authoritative branch state at the fork point.
- The records cited by `parent_page.state_snapshot` — direct Read of `worlds/<world-slug>/stories/<story-slug>/_source/<class>/<ID>.yaml` for every cited SF, OBL, CNSQ, THR, SREL, STINT, SLT, STLOC, STOBJ, BR.
- Pages along `parent_page.branch_path` for prose continuity — last ~2 pages of `worlds/<world-slug>/stories/<story-slug>/pages-prose/PG-NNNN.md` ALONG THIS BRANCH ONLY. The engine NEVER reads sibling-branch pages; Phase 9's recursive reference closure validation enforces structurally.
- Current storylet pool — `worlds/<world-slug>/stories/<story-slug>/_source/storylets/SLT-*.yaml` filtered by `visibility` block:
  - `visibility.scope == global_author_pool` → visible to all branches.
  - `visibility.scope == branch_prefix_scoped` → visible iff `visibility.visible_branch_path_prefix` is a prefix of `this_page.branch_path`.
  - `visibility.scope == branch_scoped` → visible iff `created_at_page ∈ this_page.branch_path`.
- **Premise-and-state-bounded world-canon retrieval** via `mcp__worldloom__get_context_packet(world_slug, task_type='story_page_cycle', seed_nodes=[<resolved entity:slug ids from cast_present STENT.world_ent_id + parent_page.current_location + active period>], token_budget=18000)`. The `seed_nodes` are resolved via `mcp__worldloom__find_named_entities(names)` BEFORE the context-packet call.
  - **Packet-too-large fallback**: if the packet returns `delivery_status='persisted_with_summary'` OR `packet_incomplete_required_classes` OR non-empty `truncation_summary.dropped_layers`, reduce `seed_nodes` and retry; use `governing_summary` inline; `get_records(record_ids=[...])` for known-id sets; `get_persisted_packet_slice` for structured persisted-packet recovery. Same fallback shape as `branching-story-bootstrap`.
- **Whole-class Mystery Reserve firewall load** via `mcp__worldloom__list_records(world_slug, record_type='mystery_record', include_full_body=true)` — every M record body is needed at Phase 4 (storylet `mystery_safety` cross-check), Phase 4.5 (per-claim resolution authority routing), and Phase 9 gate 1 (no `forbidden`-status M resolved by any applied op or rendered prose). Whole-class enumeration is authorized for skills "whose firewall is class-bounded" per FOUNDATIONS §Tooling Recommendation.
- **Whole-class Invariant audit load** via `mcp__worldloom__list_records(world_slug, record_type='invariant_record', include_full_body=true)` — every INV record body is needed at Phase 3 (continuation-feasibility INV check) and Phase 9 gate 2 (all `applied_event_ops` respect every world INV).

If `worlds/<world-slug>/` is missing, abort and instruct the user to run `create-base-world` first. If `worlds/<world-slug>/stories/<story-slug>/` is missing, abort and instruct the user to run `branching-story-bootstrap` first. If `parent_page_id` does not exist or does not belong to this story, abort with a specific-id error.

Direct `Read` of `worlds/<world-slug>/_source/<world-subdir>/` is redirected to MCP retrieval by Hook 2 — do not bulk-read world canon. Direct `Read` of `worlds/<world-slug>/stories/<story-slug>/_source/<story-subdir>/` is the correct surface (Hook 2's match pattern is `worlds/<slug>/_source/...` which does NOT match the nested story bundle).

## Pre-flight Check

Run before Phase 1; abort if any precondition fails.

- Load `docs/FOUNDATIONS.md` into working context.
- Normalize `world_slug` (strip `worlds/` prefix; verify `[a-z0-9-]+`); resolve `worlds/<world-slug>/`. Abort if missing — instruct the user to run `create-base-world` first.
- Validate `story_slug` is kebab-case (`[a-z0-9-]+`); resolve `worlds/<world-slug>/stories/<story-slug>/`. Abort if missing — instruct the user to run `branching-story-bootstrap` first.
- Validate `parent_page_id` exists at `worlds/<world-slug>/stories/<story-slug>/_source/pages/<parent_page_id>.yaml` and that the loaded record's `story_id` matches the `STORY-NNN` resolved from `STORY_KERNEL.md`. Abort with a specific-id error otherwise.
- Validate exactly one of `{chosen_choice_id, manual_action_text}` is present. Abort if neither or both.
- If `chosen_choice_id` is provided: load `_source/choices/<chosen_choice_id>.yaml` and verify it appears in `parent_page.emitted_choices`. Abort with a specific-id error if missing or out-of-set.
- Resolve `execution_mode`: input override → `STORY_KERNEL.execution_mode_default` → `authoring`.
- Allocate the next `PG-NNNN` for this story via `mcp__worldloom__allocate_next_id(world_slug, id_class='PG', story_slug=<story_slug>)`.
- Detect fork: scan `_source/pages/PG-*.yaml` for any descendant whose `branch_path[..-1] == parent_page.branch_path` AND `branch_id == parent_page.branch_id`. If any descendant exists on the parent's branch, this run produces a NEW branch — allocate the next `BR-NNNN` via `mcp__worldloom__allocate_next_id(world_slug, id_class='BR', story_slug=<story_slug>)`. Otherwise this run extends `parent_page.branch_id` (BR is updated via supersession at Phase 11, not new-allocated).
- Read `worlds/<world-slug>/WORLD_KERNEL.md`, `worlds/<world-slug>/ONTOLOGY.md`, and `worlds/<world-slug>/stories/<story-slug>/STORY_KERNEL.md` directly.
- Direct Read of `_source/pages/<parent_page_id>.yaml` and every record cited in `parent_page.state_snapshot` (objective_facts, apparent_facts, disputed_facts, reader_known_facts, belief_state_by_actor.*, rumor_state, obligations_*, consequences_*, threads_active, relationships_current, intentions_current, cast_present, current_location, accessible_locations, objects_in_scope, inventory_by_entity.*).
- Direct Read of last ~2 pages along `parent_page.branch_path` from `pages-prose/PG-NNNN.md` (prose continuity context — branch only, never sibling branches).
- Load current storylet pool — `_source/storylets/SLT-*.yaml` filtered by `visibility` per Phase 4 hard filters.
- Resolve premise-relevant entities: for each STENT in `cast_present`, follow `world_ent_id` to the world ENT id; collect `parent_page.current_location` and the active period. Resolve to `entity:<slug>` ids via `mcp__worldloom__find_named_entities(names)`.
- Load premise-bounded world-canon retrieval via `mcp__worldloom__get_context_packet(world_slug, task_type='story_page_cycle', seed_nodes=[<resolved ids>], token_budget=18000)`. Apply the packet-too-large fallback per §World-State Prerequisites if the response signals overflow.
- Load whole-class Mystery Reserve firewall: `mcp__worldloom__list_records(world_slug, record_type='mystery_record', include_full_body=true)`.
- Load whole-class Invariant audit: `mcp__worldloom__list_records(world_slug, record_type='invariant_record', include_full_body=true)`.
- Read current world canon revision (latest `CH-NNNN.yaml` from `worlds/<world-slug>/_source/change-log/`) and record it as `state_snapshot.canon_revision` on the new page (audit trail per the proposal's §World-Canon Propagation Note — supports forensic reconstruction when canon promotions later land between branch ticks).
- Confirm content_policy block (NC-21 verbatim text from `templates/content-policy.txt`) is loaded for downstream prompt assembly. Without it, Phase 7 cannot legitimately render prose. This is the FIRST condition of the HARD-GATE.

## Phase 1: Choice Resolution

Two paths converge into a single validated `ProposedEvent`.

### Path A — Standard Choice

- `chosen_choice_id ∈ parent_page.emitted_choices` (verified at Pre-flight).
- Load `_source/choices/<chosen_choice_id>.yaml`.
- `ProposedEvent` populated directly from CHC's structured fields: `operation`, `actor`, `target`, `instrument` (if present), `uses_fact`, `likely_effects`, `choice_mode`, `poetic_effect`, `choice_contract` (carries `allowed_outcome_band` and `forbidden_outcomes` — Phase 7 / Phase 8 / Phase 9 honor this contract).

### Path B — Write-In (LLM acts as parser)

#### B.1 Parse

LLM parser receives:
- `parent_page.state_snapshot` (cast_present, facts visible to POV, open OBLs, intentions).
- `manual_action_text` (the user's typed action).
- content_policy preamble (verbatim, FIRST in prompt).

LLM produces a tentative `ProposedEvent`:

```yaml
action: <verb>
actor: <STENT-id>          # who performs (defaults to POV)
target: <STENT-id | object | location>
instrument: <STENT-id | object | null>
possible_outcomes:
  - {outcome_id, description, probability_hint}
narrative_intent: >
  <one-line description of what the user is trying to achieve narratively>
```

#### B.2 Engine Validation

Validate `ProposedEvent` against `state_snapshot`:
- actor exists in `cast_present`?
- target exists / is in scope (in cast_present, or known object in inventory, or accessible location)?
- instrument is in protagonist's possession or accessible?
- actor has the knowledge required for the action (e.g., confessing a secret requires knowing it)?
- the verb's hard preconditions are satisfied (e.g., "shoot" requires a firearm available, line of sight to target, target alive)?

#### B.3 Routing on Validation Failure

| Routing | When | Response shape |
|---|---|---|
| **REFUSE_ONLY_THROUGH_WORLD_LOGIC** | Action is impossible at this state — actor / target / instrument absent or out of scope | Render an in-world reason. NEVER silently block. ("You reach for the pistol — but it's still on the dresser in your room three streets away.") |
| **TREAT_AS_ATTEMPT** | Action is possible, but full success is not sufficiently supported by current state: opposition, distance, knowledge gaps, tools, character ability, environmental constraints, or established consequences make success uncertain | Action is attempted; fails or partially succeeds diegetically; leaves consequences. ("You draw, but he sees the motion and knocks your arm aside.") |
| **ACCEPT_BUT_TRANSFORM** | Action is viable but needs reframing for coherence | Adjust outcome; ask user to confirm. ("You fire, but the shot wounds him; he survives long enough to say one fragment of the secret.") |
| **ACCEPT** | State can absorb the action as proposed | Proceed |

The `TREAT_AS_ATTEMPT` framing is **causal, not authorial**: the question is whether the current state (cast, instruments, knowledge, opposition, environment, prior consequences) supports full success — never "would instant success break pacing?". Authorial pace-protection is the narrative governor's job (Phase 6), NOT Phase 1's.

Multiple plausible outcomes (e.g., shoot → miss / wound / kill): the engine either asks the user to pick or selects per a state-coherence weighting (the LLM proposes per-outcome rationales; the engine weights). Configurable per story.

#### B.4 Rule

A write-in input is NEVER silently rejected. The four-way routing is the contract. The user always gets a coherent in-world response, even if their intended action is impossible.

## Phase 2: Impact Analysis

For the validated `ProposedEvent`, compute:

```yaml
facts_created: [SF-template, ...]
facts_invalidated: [SF-NNNN, ...]
obligations_affected:
  opened: [OBL-template, ...]
  paid_off: [OBL-NNNN, ...]
  complicated: [OBL-NNNN, ...]
  transferred: [{from_owner, to_owner, OBL-NNNN}, ...]
  abandoned_with_acknowledgment: [OBL-NNNN, ...]
intentions_pressure_deltas:
  - {STENT-NNNN, pressure_delta, emotional_state_delta, beliefs_changed}
threads_pressure_deltas:
  - {THR-NNNN, pressure_delta, status_change}
impossible_storylets: [SLT-NNNN, ...]    # storylets in pool whose hard_preconds will be invalidated
newly_eligible_storylets: [SLT-NNNN, ...] # storylets newly satisfied
transferable_functions:                   # if a character is killed/incapacitated
  - {from: STENT-NNNN, to: STENT-NNNN | object,
     function: <secret_holder | clue_carrier | rival | mentor | ...>}
required_aftermath:                       # consequences that MUST be addressable downstream
  - {kind: body_discovery | faction_reaction | rumor_wave | guilt_or_justification | ...,
     scope, urgency}
```

The destructive-choice case is the canonical example: when the protagonist shoots the mentor, the engine identifies `mentor_dead`, invalidates `mentor_available`, transfers the secret-holder function to `mentor_journal`, transfers the moral-judgment function to `rival`, and emits `body_discovery`, `protagonist_guilt_or_justification`, and `faction_reaction` as required_aftermath items.

**Rule**: `required_aftermath` is NOT a temporary analysis artifact — it is persisted as `CNSQ-NNNN` records in Phase 5. Storylet selection on subsequent turns reads `state_snapshot.consequences_pending` and prefers storylets whose effects address those consequences (Phase 4 salience scoring). Without persistence, the engine identifies "body discovery" once and then forgets — turning the promise/consequence engine into a goldfish. Phase 9 gate 12 (consequence persistence) is the structural backstop.

## Phase 3: Continuation Feasibility Check

After applying the ProposedEvent, the engine checks:

- Are there ≥1 storylets satisfied by the new state? (in pool OR JIT-generatable per a brief LLM probe)
- Are all `required_aftermath` items addressable by some storylet (existing or JIT)?
- Are open `forbidden`-status M-NNNN entries still preserved (firewall intact)?
- Does the new state violate any world INV (cross-checked against the whole-class INV load from Pre-flight)?

### Terminal Feasibility

A choice does NOT fail continuation feasibility if it produces a coherent terminal branch — sometimes a wild user choice produces an honest ending and the engine should honor it rather than contort itself to keep the branch alive.

A terminal branch must:
- resolve or acknowledge all required-closure obligations visible to the reader (acknowledgment may be `abandoned_with_acknowledgment`, `tragic_loss`, or `failed_expectation` — never silent abandonment)
- address all pending high-salience consequences (CNSQ with `salience >= 7`)
- produce a terminal page whose `state_snapshot.branch_terminal: true`
- update the branch's `BR-NNNN` status to `terminal` via supersession at Phase 11

When the engine detects terminal feasibility, Phase 8's emitted choices may include explicit terminal options (clearly labeled as potentially final without spoiling the exact outcome).

### On Infeasibility

Surface to user:

```
The choice you've selected would dead-end the story:
- Reason: <e.g., "no storylet can absorb the body-discovery aftermath given current pool">
- Required aftermath items unaddressable: <list>

Options:
1. Accept anyway — the story may struggle to continue coherently
2. Transform — engine reshapes the choice (e.g., wound instead of kill)
3. Treat as attempt — action attempted but fails diegetically
4. Pick a different choice
```

User picks. If "Accept anyway", the runtime proceeds with reduced consequence-capacity guarantees and flags the resulting page via `narrative_health.flagged_for_audit: true` for later review by `branching-story-health-audit` (see its `audit_focus=flagged_pages_priority` value).

## Phase 4: Storylet Selection

### Hard Filters (engine, deterministic)

A storylet is **eligible** if all of:
- `hard_preconds` are satisfied against the new state (after applying ProposedEvent).
- `cast_requirements` can be satisfied by `cast_present` ∪ {newly entering cast}.
- `location_requirements` are satisfied.
- `mystery_safety.forbidden_M_resolved == false`.
- If `mystery_safety.M_resolution_claims` is non-empty: routes per Phase 4.5.
- `content_intensity` is within ±1 band of story baseline (or matches `content_intensity_override`).
- Is not in the recent-history avoid list (last ~5 storylets — prevents immediate repetition).
- Is visible from this page's branch_path per the storylet's `visibility` block (per §World-State Prerequisites).

### Salience Scoring (engine, deterministic)

```
score(storylet) =
+ 4.0 * obligation_relevance(storylet, open_obligations)
+ 3.0 * causal_relevance(storylet, pending_consequences)
+ 2.5 * character_goal_relevance(storylet, active_intentions)
+ 2.0 * reader_knowledge_relevance(storylet, reader_known_facts)
+ 1.5 * thematic_continuity(storylet, active_themes)
+ 1.5 * tension_fit(storylet, current_tension_target)
+ 1.0 * novelty(storylet, recent_history)
- 3.0 * contradiction_risk(storylet)
- 2.0 * unresolved_debt_increase(storylet)
- 1.0 * repetition_penalty(storylet)
```

The `governor_nudge` from the previous turn's Phase 6 (or, on first turn, from the bootstrap's storylet-pool seed bias) adjusts the weights — e.g., "story has 3 high-salience unresolved obligations and rising threat pressure; favor choices that pay off or escalate one of those" boosts `obligation_relevance` and `tension_fit` by 1.5x.

### Weighted-Pick from Top-K

Pick K = 5. Weight each by score (softmax-style). Sample one. **NEVER always-take-top** — predictability becomes brittleness; weighted-pick lets the story breathe while still favoring relevance.

### JIT Expansion Trigger

If no candidate scores above threshold (typically: top-K all score below `(median(score) + 1.0)`), AND the consequence-capacity check (Phase 3) passed only by JIT-generatable continuation, invoke `storylet-pool-authoring` as the **single-storylet JIT generator**:

- Call shape: `mode='jit'`, `parent_skill_invocation=true`, `target_pool_size=1`, `created_at_page=<this_PG_id>`, `caller_state_snapshot=<this_state_snapshot>`, plus the current branch-local pool/OBL/CNSQ/THR/cast/recent-prose context already assembled by this phase.
- The delegated call returns exactly ONE approved SLT record plus its internal validation packet. The returned SLT carries `provenance.origin: runtime_jit`, `provenance.created_at_page: <this_PG_id>`, and `visibility.scope: branch_scoped`; a global-author-pool JIT result is structurally invalid.
- `storylet-pool-authoring` runs its Phase 4 9-gate set over the candidate, including mystery firewall, resolution-authority declaration, predicate parsability, and branch-contamination. Its Phase 5 diversity audit is bypassed because a single runtime storylet has no batch diversity surface.
- Selection then picks this JIT storylet. Phase 5 applies its effects, Phase 9 rechecks the full page-cycle validation gates, and Phase 11 writes the returned SLT-NNNN.yaml inside the same page-tick transaction as the new PG/SE/SF/OBL/CNSQ/THR/SREL/STINT/CHC records.

JIT generation is not free — it expands the engine prompt budget and may produce lower-quality storylets than the author pool. `branching-story-health-audit` consumes the `flagged_for_audit` and high-JIT-rate signals.

### Phase 4.5: Mystery Resolution Authority

A mystery resolution is not always a canon-promotion event. Branches may produce **apparent** resolutions (the cast believes the mystery is solved but it's not authoritative) or **branch-local counterfactual** resolutions (the branch is exploring "what if it turned out X?" without committing it to world canon). Forcing every interesting branch to route through `canon-addition` collapses the counterfactual nature of branches.

The selected storylet's `mystery_safety.M_resolution_claims` enumerates per-M resolution authority. Routing per claim:

| `resolution_authority` | Routing | Resulting SF epistemic_class | World M status updated |
|---|---|---|---|
| `apparent` | Page-cycle continues. Cast (or some subset) believes the mystery resolved. | `apparent` or `belief` | no |
| `branch_local_counterfactual` | Page-cycle continues only if `STORY_KERNEL.counterfactual_mystery_mode == true`. The branch becomes a "what-if" exploration. | `objective` with `canon_relation: canon_divergent` or `canon_unknown` | no |
| `canon_candidate` | Page-cycle PAUSES. Hands off to `story-fact-promotion-to-canon` regardless of `execution_mode` (HARD-GATE preserved in EVERY mode — this is the moment the player becomes the author again). | On accept: SF mirrors the new CF with `derived_from_cf: <new-CF-id>` | yes (on user-approved promotion) |

A `forbidden`-status M is **never** resolved at any authority level — hard-rejected by storylet-pool-authoring's Phase 4 gates AND re-rejected here as defense-in-depth.

On promotion non-accept (user rejects via `story-fact-promotion-to-canon`'s HARD-GATE), the storylet is rejected and re-selection runs (Phase 4 re-runs with this storylet excluded).

**Sibling-handoff seam**: `story-fact-promotion-to-canon` is shipping at `.claude/skills/story-fact-promotion-to-canon/`. On a `canon_candidate` resolution, the page-cycle PAUSES at Phase 4.5 and presents a clear handoff message naming the skill and the arguments to invoke (`world_slug`, `story_slug`, `source_kind=mystery_resolution`, `source_m_id`, `resolving_page_id`, `promotion_branch_path`). The user separately invokes `story-fact-promotion-to-canon` (worldloom skills are non-chaining); on its accept-flavored outcome, the user returns and Phase 4.5 resumes with the new CF id, mirroring the SF with `derived_from_cf: <new-CF-id>`. Aborting on `canon_candidate` rather than silently degrading to `apparent` preserves the canon-mutation HARD-GATE invariant. A future delegation refactor (extract Phase 4.5 to a sub-routine call into `story-fact-promotion-to-canon`) is tracked at `tickets/SFPC-001-revert-fallbacks-after-mcpenh-lands.md` precondition + a separate page-cycle delegation ticket; until that lands, this skill's pause-and-tell-the-user shape is the correct posture.

## Phase 5: State Mutation

Apply the structured ops from Phase 1's `ProposedEvent` and Phase 4's selected storylet's `fact_effects` / `relationship_effects` / `opens_obligations` / `pays_off_obligations` / `complicates_obligations` / `transfers_obligations`.

### Append-Only Discipline

Records are append-only. Mutations to facts (certainty change), obligations (status change), threads (status / pressure), or intentions (pressure / emotional_state) create NEW records:

```yaml
# Example: an OBL goes from open → paid_off
id: OBL-0091
story_id: STORY-001
logical_id: OBL-0007                  # the original logical obligation
supersedes: OBL-0007
created_at_page: PG-0042
status: paid_off
payoff_mode: literal_fulfillment
payoff_event: SE-0091
# ... other fields inherited or updated
```

The new page's `state_snapshot.obligations_open` no longer cites `OBL-0007`; it cites `OBL-0091` only if the new status is still `open` (here `paid_off`, so `obligations_open` drops `OBL-0007` entirely; `obligations_paid_off` gains `OBL-0091`).

### State_Snapshot Computation

Given `parent_page.state_snapshot` and the structured ops applied this turn:

```
next_snapshot = parent_snapshot.clone()
for op in applied_event_ops (each op is structured per the SE schema's op_type enum):
    fact_create:                  add SF-NNNN to objective/apparent/disputed/reader/belief facets per epistemic_class
    fact_invalidate:              replace SF-NNNN entry with superseder
    obligation_open:              add OBL-NNNN to obligations_open
    obligation_pay_off:           move OBL-NNNN from obligations_open to obligations_paid_off; replace ID with superseder
    obligation_complicate:        replace OBL-NNNN in obligations_open with superseder
    obligation_transfer:          update owner field via supersession
    obligation_supersede:         replace OBL-NNNN with superseder for any other field change
    consequence_open:             add CNSQ-NNNN to consequences_pending (instantiated from required_aftermath)
    consequence_address:          move CNSQ-NNNN from pending to addressed; replace status via supersession
    thread_supersede:             replace THR-NNNN with superseder (status / pressure delta)
    relationship_supersede:       replace SREL-NNNN with superseder (axes / public_status / private_status_by_actor)
    intention_refresh:            add new STINT-NNNN-<char> to intentions_current; replace prior STINT for that character
    cast_change:                  update cast_present
    location_change:              update current_location and accessible_locations
    inventory_change:             update inventory_by_entity via STOBJ supersession
    canon_sync:                   update canon_revision (audit trail; CFs visible to this branch are recomputed from world canon retrieval)
this_page.state_snapshot = next_snapshot
this_page.state_hash = hash(canonicalize(next_snapshot))
```

### Consequence Persistence

Each `required_aftermath` item from Phase 2 is instantiated as a `CNSQ-NNNN` record UNLESS it is already represented by a newly-opened OBL (when an aftermath is sufficiently structural that an obligation is the right primitive — e.g., "discover the body" is opened as an OBL while "guilt or justification" is a CNSQ).

CNSQ records are branch-scoped. They carry `created_at_page: this_PG` and visibility along `branch_path` only — sibling branches do not see them. A subsequent turn whose selected storylet has effects matching a pending CNSQ's `kind` produces a `consequence_address` op, which supersedes the CNSQ to `status: addressed` (or `transformed` when the storylet partially absorbs it; or `expired` when narrative time renders it irrelevant).

### Branch-Isolation Invariant Enforced Here

Every new story-local record (SF / SE / OBL / CNSQ / THR / SREL / STINT / SLT-JIT / STLOC / STOBJ / DA / CHC / PG) carries `created_at_page: this_PG`. The engine verifies before write — and Phase 9 gate 3 verifies recursively — that no story-local ID cited at any depth inside any record reachable from `state_snapshot` references a page outside `this_page.branch_path`. World canon (CF / M / INV / ENT) propagates freely; story-local engine state is branch-isolated.

## Phase 6: Narrative Governor Recompute + Nudge

Recompute health metrics for `this_page`:

```yaml
narrative_health:
  open_obligation_count: <count of OBLs in obligations_open>
  high_salience_unpaid_count: <count of OBLs with salience >= 7>
  average_obligation_age: <avg pages since OBL.introduced_at_page>
  contradiction_risk: <0..1; rises with retcons, fact invalidations, abandoned high-salience obligations>
  causal_connectivity: <0..1; how many recent events causally chain to prior events>
  character_motivation_coverage: <0..1; how many active actions are explicable by current STINT>
  unresolved_threat_pressure: <sum of THR.current_pressure for type==threat>
  recent_consequence_density: <consequence-bearing pages / last N pages>
  recent_reflection_density: <reflection-shape pages / last N pages>
  novelty: <1 - similarity to recent prose>
  tension: <0..1>
  agency_score: <0..1; ratio of pages where user choice changed state materially vs forced>
  flagged_for_audit: <bool — true if Phase 3 §On Infeasibility took the Accept-anyway route>
```

### Generate `governor_nudge`

The nudge biases Phase 8 choice generation (and Phase 4 of the NEXT turn). The governor is a homeostat on narrative debt — **NOT an act-spine**.

| Health condition | Nudge |
|---|---|
| `high_salience_unpaid_count >= 4` | Bias toward payoff / closure storylets and choices |
| `recent_consequence_density < 0.3` AND `unresolved_threat_pressure > 5` | Bias toward escalation |
| `recent_consequence_density > 0.7` AND `recent_reflection_density < 0.2` | Bias toward reflection / consolidation |
| `recent_reflection_density > 0.5` AND `tension < 0.3` | Bias toward action / breach |
| Reader knows a high-emotional-weight secret for ≥6 pages | Bias toward reveal / exploit / reframe |
| Actor performed extreme action ≤2 pages ago | Bias toward justification / fallout |
| `agency_score < 0.5` | Bias toward choices that materially change state |
| `pace_hint` set in input | Override above; honor user pace request |

**The governor never enforces milestones.** It nudges weighting; it never says "we need the Act II turning point now."

### Phase 6.5: Closure Readiness Detection

Closure readiness is **derived from state**, not from milestones.

A branch becomes closure-ready when ALL of:
- no `required_closure: true` OBL remains open, OR all remaining required-closure OBLs have explicit abandonment / tragic-loss / failed-expectation acknowledgment routes available in the storylet pool
- no high-urgency CNSQ remains pending (`urgency >= 7`)
- at least one major THR is resolved, failed, transformed, or deliberately left open
- character-intention changes caused by recent events have been acknowledged (no STINT shows a >3-step pressure delta from its parent without a refresh in the recent ~5 pages)
- contradiction risk is below threshold (`narrative_health.contradiction_risk < 0.4`)

When closure-ready, Phase 8 should include at least one branch-ending or branch-pausing choice in the emitted set, alongside continuation choices if the story remains open-ended. This honors user agency: the player can choose to end the branch coherently, continue, or fork.

The branch is **not** forced to terminate when closure-ready. The signal only widens the choice set.

## Phase 7: Page Render

### LLM Prompt Assembly

Order matters; content_policy is FIRST so it binds the model before any other instruction.

```
[content_policy block — verbatim, NC-21]

[story kernel — premise + designing principle + tone + content_intensity_baseline + invariants_acknowledged + mysteries_in_play]

[selected storylet — title + tone_tags + theme_tags + content_intensity + opens_obligations + pays_off_obligations]

[scene context]
- location: <derived from storylet location_requirements + state>
- cast present: <list of STENT names + role_in_story>
- POV: <STENT name>
- facts visible to POV: <list>
- open OBLs visible to POV: <list>
- current STINT for POV: <goals + fears + current_pressure summary>

[recent prose continuity]
- Last ~2 pages of prose along this branch_path (NOT sibling branches)

[governor_nudge — what kind of beat the story needs now]

INSTRUCTION:
Render the next page in <length_target> words. Show through action, dialogue, and
sensory detail. Respect content_intensity. Do not invent facts beyond those in
state context. Do not resolve any mystery declared in mysteries_in_play[] unless
the selected storylet explicitly authorizes resolution.

End the page at a moment where 4-6 distinct choices for what happens next would
be natural. The applied event from the user's prior choice is:
<event summary>. Make this consequence visible.
```

LLM produces prose. Engine writes to a working buffer (NOT to disk yet — disk write happens at Phase 11 inside the atomic transaction).

### Cross-Check (engine + post-render claim classification)

The prose MAY include:
- sensory detail, metaphor, environmental color
- memories of past events (this branch's events or world-canon events the POV would know)
- rumors (must be marked as such in narration; circulating SFs of `epistemic_class: rumor` are OK to surface)
- offstage references to absent characters
- named absent characters (a letter from someone not present is fine)
- incidental objects not in `objects_in_scope` if their use is not load-bearing for the page's transaction

The prose MAY NOT:
- depict an entity as physically present unless included in `cast_present`
- make a load-bearing factual claim absent from `state_snapshot` (objective_facts, apparent_facts, belief_state_by_actor, world canon visible to POV)
- create a usable object, clue, location, relationship, or secret unless that fact is written as an `SF` / `STOBJ` / `STLOC` / `SREL` / `DA` record this turn
- resolve a mystery unless the selected storylet's `mystery_safety.M_resolution_claims` authorizes the corresponding `resolution_authority`

After rendering, run a post-render extraction step. The engine asks an LLM critic to extract candidate load-bearing claims from the prose and classify each:

| Classification | Action |
|---|---|
| `already-ledgered` | no action |
| `incidental-color` | no action; record as `prose_only` (no ledger update needed) |
| `needs-ledger-record` | engine emits the corresponding SF / STOBJ / STLOC / SREL / DA record this turn (or re-prompts the LLM to remove the claim if it's not actually load-bearing) |
| `contradiction` | re-prompt to remove or revise; the prose contradicts existing state |
| `mystery-risk` | hard-reject; the prose risks unauthorized mystery resolution |

This makes prose richer (rumor / memory / scenery / offstage references all permitted) and keeps the validator honest about what actually requires a ledger entry.

| Quick fail-fast checks (before extraction) | On fail |
|---|---|
| Does the prose violate the content_intensity band? | Re-prompt with band correction |
| Does the prose contradict the storylet's intended fact_effects (overrides instead of honoring)? | Re-prompt |
| Does the prose violate the choice contract's `forbidden_outcomes` (Phase 8)? | HARD-REJECT → re-prompt |

Up to 3 re-prompts before escalating to the user.

## Phase 8: Choice Generation (Amendment B Pipeline)

### Step 1: Affordance Space Collection (engine, deterministic)

Enumerate `(verb, target, instrument)` tuples from `state_snapshot`:
- verbs: from a canonical verb vocabulary (talk / attack / flee / investigate / conceal / confess / bargain / use_object / test_theory / follow_clue / change_relationship / intimacy_advance / refuse / reveal / etc.).
- targets: cast_present + objects in scope + locations in scope + secrets known + open OBLs visible to POV.
- instruments: objects in inventory + secrets known by POV + facts known by POV.

Hard filter: drop any tuple that violates a hard precondition (dead char can't speak; lost object can't be used; unknown secret can't be confessed).

Output: candidate affordance set (typically dozens to low hundreds).

### Step 2: Salient-Affordance Shortlist + LLM Proposer

Engine pre-scores affordances by:
- `obligation_relevance` (does this affordance pay off / complicate an open OBL?)
- `character_goal_relevance` (does this advance a STINT-current goal?)
- `reader_knowledge_relevance` (does this exploit dramatic irony?)
- `thread_pressure` (which THR needs attention?)
- `governor_nudge_alignment` (does this match Phase 6's recommendation?)

Take top-K (K = 15) affordances. Pass to LLM proposer with prompt:

```
[content_policy block]
[scene context — same as Phase 7]
[storylet realized this turn — its choice_templates as anchors]
[governor_nudge]
[top-K affordances with score rationales]

INSTRUCTION:
Propose 6-10 candidate choices as STRUCTURED CHC records (operation, actor, target,
uses_fact, likely_effects, choice_mode, poetic_effect). Cover a mix of choice_modes
and poetic_effects (relaxed / obvious / dilemma / risky_truth / sacrifice / seduction /
desperation / revelation). Engage at least one open OBL per choice when possible.
Do not write the user-facing label yet — that happens in step 5.
```

LLM produces 6-10 candidate structured CHCs.

### Step 3: Engine Validation Pass

For each LLM-proposed CHC:

| Check | Action on fail |
|---|---|
| Hard preconditions satisfied at current state | Drop |
| Impact analysis runs cleanly (Phase 2 logic on this proposed choice) | Drop |
| Consequence-capacity: at least one storylet (existing or JIT-probable) continues from the post-state | Drop or transform |
| `poetic_effect` is realistic for the operation + state | Re-tag |
| Mystery safety preserved | Drop |

Drop choices that fail hard checks. Flag near-misses for transformation.

### Step 4: Diversification + Scoring

Apply diversification to surviving choices:
- Avoid 6 versions of "ask about X" — at most 1 of any single (verb, target) pair.
- Mix moral / strategic / emotional / investigative / risky / self-protective axes.
- Cover at least 3 distinct `choice_mode` values.
- Cover at least 3 distinct `poetic_effect` values.
- Engage at least 60% of currently-open high-salience OBLs across the choice set.

Final ranked list of 4-6 surviving structured choices.

### Step 5: Surface Label Rendering (LLM)

For each surviving structured choice, the LLM writes the user-facing label:

```
[content_policy block]
[scene context summary]
[structured choice — operation, actor, target, uses_fact, likely_effects,
 choice_mode, poetic_effect]

INSTRUCTION:
Write the user-facing label for this choice. Faithful to the underlying operation —
do not embellish in ways that lie about what the choice does. Match the prose tone.
Length: 5-15 words. Prefer active voice. Do not preview the outcome explicitly;
the player should make the choice without knowing exactly what will happen.
```

Each emitted CHC-NNNN record stores:

```yaml
id: CHC-NNNN
story_id: STORY-001
emitted_at_page: PG-NNNN
created_at_page: PG-NNNN

operation: <verb>
actor: STENT-NNNN
target: STENT-NNNN | STOBJ-NNNN | STLOC-NNNN | abstract
uses_fact: SF-NNNN | null

choice_contract:
  user_intent: >
    What the player is signaling they want to accomplish.
  guaranteed_action: >
    What WILL definitely be attempted or performed if this choice is selected.
  success_policy: guaranteed | attempted | uncertain | opposed
  allowed_outcome_band:
    - succeeds
    - partially_succeeds
    - fails_with_consequence
    - backfires
  forbidden_outcomes:
    - <outcome that would betray the label>
  minimum_state_change:
    - fact | obligation | consequence | relationship | intention | thread | location | cast | terminality

likely_effects: [...]
choice_mode: <enum>
poetic_effect: <enum>
content_intensity_implied: tame | mature | explicit
label: <user-facing text>
```

A selected CHC may NOT be transformed outside its `choice_contract.allowed_outcome_band` without explicit user confirmation. If the next turn's Phase 4 storylet selection or Phase 7 prose render would produce an outcome outside the band, the engine routes via Phase 1 B.3's `ACCEPT_BUT_TRANSFORM` (asking the user to confirm) rather than silently delivering an outcome that betrays the label. This protects user agency: "Confess the secret" cannot become "almost confess but get interrupted" without the user explicitly accepting the reframing.

### Step 6: Write-In Slot

The user-facing display always includes a write-in slot as choice N+1: "I want to do something else..."

When the user submits free-form text, page-cycle is invoked again with `parent_page_id = current_page` and `manual_action_text = <user input>`. Phase 1 Path B handles it.

## Phase 9: Validation Gates (Canon Safety Check phase)

Defense-in-depth checks before Phase 11 write. Each gate must record PASS with a one-line rationale on the new page's `validation_trace` field. A bare "PASS" without rationale is treated as FAIL per the FOUNDATIONS skill discipline. Any FAIL halts Phase 11 and routes to the responsible phase.

| # | Gate | Check | Routes to on FAIL |
|---|---|---|---|
| 1 | Mystery firewall (Rule 7) | No `forbidden`-status M-NNNN resolved by any applied op or rendered prose; `M_resolution_claims` properly routed per Phase 4.5 (apparent / branch_local_counterfactual / canon_candidate handoff) | Phase 4 |
| 2 | Invariant compatibility | All `applied_event_ops` respect every world INV's `break_conditions` (cross-checked against the whole-class INV load from Pre-flight) | Phase 1/2 |
| 3 | Recursive reference closure (branch-isolation invariant) | For every story-local record reachable from `this_page.state_snapshot` (one or more levels deep), recursively inspect every story-local ID reference inside that record (e.g., OBL.dependent_facts cites SFs; OBL.coverage_cache.compatible_storylets cites SLTs; SE.input_records / output_records; CNSQ.subjects; SREL.party_a / party_b; STINT.beliefs / secrets; etc.). Every referenced SF / SE / OBL / CNSQ / THR / SREL / STINT / STLOC / STOBJ / DA / SLT / CHC / BR must either have `created_at_page == null` (globally legal — author-pool storylets only) OR `created_at_page ∈ this_page.branch_path`. ANY sibling-branch reference at ANY depth halts the transaction. | Phase 5 |
| 4 | Snapshot-replay equality | `parent.state_snapshot + applied_event_ops == this_page.state_snapshot`; `state_hash_after` of last op == `this_page.state_hash` (catches drift bugs) | Phase 5 |
| 5 | ID uniqueness | Allocated IDs do not collide with any existing record in this story; Pre-flight uses `mcp__worldloom__allocate_next_id(world_slug, id_class, story_slug=...)` for story-scoped IDs and Phase 5 rechecks no target paths already exist before write. | Pre-flight + Phase 5 |
| 6 | Content policy presence | content_policy preamble was present verbatim in every LLM prompt assembled this run (parser, proposer, renderer, prose render, JIT generator) | Pre-flight |
| 7 | Prose ledger consistency | Phase 7 cross-checks all passed; post-render extraction emitted any `needs-ledger-record` entries; no `mystery-risk` classification survived | Phase 7 |
| 8 | Choice contract integrity | Every emitted CHC has a populated `choice_contract` block (user_intent, guaranteed_action, success_policy, allowed_outcome_band, forbidden_outcomes, minimum_state_change) | Phase 8 |
| 9 | Choice consequence-capacity | Every emitted CHC has at least one continuation path (storylet-or-JIT) | Phase 8 |
| 10 | State_snapshot integrity | All cited records exist on disk; no dangling references; epistemic-faceted lists populated; entity_status, current_location, relationships_current, intentions_current populated | Phase 5 |
| 11 | Epistemic class declared (Rule 1) | Every newly-created SF declares `epistemic_class` | Phase 5 |
| 12 | Consequence persistence | Every Phase 2 `required_aftermath` item produced either a CNSQ record or a newly-opened OBL record this turn (none silently dropped) | Phase 2 |

Some failures are auto-correctable (re-render prose, re-generate choices); some require user intervention (firewall breach, INV violation, recursive reference closure breach). The FAIL routing column names the responsible phase; auto-correction loops back to that phase with the failure context inlined.

**Whole-class loads from Pre-flight power gates 1, 2, and 3**: M-record full bodies for gate 1's `forbidden`-status check + `M_resolution_claims` interrogation; INV-record full bodies for gate 2's `break_conditions` audit; the cross-record reachability set anchored at `state_snapshot` for gate 3's recursive closure scan.

## Phase 10: HARD-GATE Approval

Per `execution_mode`:

| Mode | Phase 10 visibility |
|---|---|
| `authoring` (default) | HARD-GATE shown — all-listed-critics run; user must explicitly approve before Phase 11 |
| `interactive_runtime` | HARD-GATE hidden; auto-commits to Phase 11 after Phase 9 gates pass; critics run on validation failure, high-risk mystery touch, or high contradiction risk |
| `batch_generation` | HARD-GATE hidden until validation failure or a configured checkpoint; full critics on configured checkpoints only |

**The Phase 4.5 canon-promotion HARD-GATE handoff to `story-fact-promotion-to-canon` is a separate, never-elided gate that fires regardless of `execution_mode`** (per the top-of-file HARD-GATE block). Auto Mode does not override the Phase 4.5 handoff.

### Authoring-mode deliverable summary

When the gate is shown, present:

```
PAGE PROPOSED: PG-NNNN (branch: <branch_path>)
Parent: <parent_page_id> (<"leaf" | "fork from non-leaf">)
Storylet realized: SLT-NNNN <title>
Choice taken: CHC-NNNN <label>  OR  write-in: "<text>" → routed as <ACCEPT | TRANSFORM | ATTEMPT | REFUSE>

PROSE PREVIEW:
<first ~300 words of pages-prose/PG-NNNN.md>

STATE DELTA FROM PARENT:
- Facts: +<count> new, <count> invalidated
- Obligations: +<count> opened, <count> paid_off, <count> complicated, <count> transferred
- Consequences: +<count> opened, <count> addressed
- Threads: <pressure deltas>
- Intentions: <count> characters refreshed
- Cast: <changes>
- Location: <change if any>

NARRATIVE HEALTH:
- Open obligations: <count> (high-salience: <count>)
- Avg obligation age: <pages>
- Contradiction risk: <0..1>
- Tension: <0..1>
- Agency score: <0..1>
- Closure-ready: <bool — Phase 6.5 signal>
- flagged_for_audit: <bool — Phase 3 Accept-anyway signal>

CHOICES OFFERED:
1. <CHC label>
2. <CHC label>
...
N+1. (write your own)

FIREWALL VERDICTS (Phase 9 gates 1-12):
- Mystery firewall: PASS — <one-line rationale>
- Invariant compatibility: PASS — <rationale>
- Recursive reference closure: PASS — <rationale>
- Snapshot-replay equality: PASS — <rationale>
- ID uniqueness: PASS — <rationale>
- Content policy presence: PASS — <rationale>
- Prose ledger consistency: PASS — <rationale>
- Choice contract integrity: PASS — <rationale>
- Choice consequence-capacity: PASS — <rationale>
- State_snapshot integrity: PASS — <rationale>
- Epistemic class declared: PASS — <rationale>
- Consequence persistence: PASS — <rationale>

TARGET WRITE PATHS:
- worlds/<world-slug>/stories/<story-slug>/_source/pages/PG-NNNN.yaml
- worlds/<world-slug>/stories/<story-slug>/_source/events/SE-NNNN.yaml
- worlds/<world-slug>/stories/<story-slug>/_source/<class>/<ID>.yaml (<count> per-class records across affected subdirectories)
- worlds/<world-slug>/stories/<story-slug>/_source/branches/BR-NNNN.yaml (<new | superseded>)
- worlds/<world-slug>/stories/<story-slug>/pages-prose/PG-NNNN.md
- worlds/<world-slug>/stories/<story-slug>/INDEX.md (append/edit)
```

User options:

- **ACCEPT** → proceed to Phase 11.
- **REVISE — re-render prose** → re-run Phase 7 with constraint feedback inline (re-prompt counter resets).
- **REVISE — different storylet** → re-run Phase 4 with the current selection excluded from re-pick.
- **REVISE — different choices** → re-run Phase 8 with diversification constraints inlined.
- **REJECT** → no writes; halt the page-cycle. The user may also rewind to a different `parent_page_id` and retry.

### Interactive-runtime / batch-generation auto-commit

When the gate is hidden per `execution_mode`, the engine auto-commits to Phase 11 after Phase 9 records all 12 PASSes. On Phase 9 FAIL the engine surfaces the failure and routes per the responsible-phase column — **the auto-commit posture does NOT mask validation failures**. The Phase 9 gates run in every mode (per the proposal's "rules that hold in every mode"); only the Phase 10 user-approval pause is conditionally lifted.

## Phase 11: Atomic Write + INDEX Update

Single transaction. File order matters because partial-failure recovery depends on dependency ordering — `INDEX.md` is the LAST write so a partial state never appears in the per-bundle index:

1. `Write _source/pages/PG-NNNN.yaml` (the new page record with state_snapshot + state_hash + emitted_choices + narrative_health + governor_nudge_applied + canon_revision audit-trail field).
2. `Write _source/events/SE-NNNN.yaml` (the structured-op event applied this turn — the SE record owns `applied_event_ops` per the closed `op_type` enum, and `op_id` values are unique within the event).
3. `Write` per-class records emitted this turn — deterministic order: `_source/facts/SF-NNNN.yaml` → `_source/obligations/OBL-NNNN.yaml` → `_source/consequences/CNSQ-NNNN.yaml` → `_source/threads/THR-NNNN.yaml` → `_source/relationships/SREL-NNNN.yaml` → `_source/intentions/STINT-NNNN-<char>.yaml` → `_source/choices/CHC-NNNN.yaml`.
4. `Write _source/storylets/SLT-NNNN.yaml` IF Phase 4 JIT expansion fired (returned by `storylet-pool-authoring` `mode=jit`; carries `provenance.origin: runtime_jit`, `created_at_page: this_PG`, and `visibility.scope: branch_scoped`).
5. `Write _source/locations/STLOC-NNNN.yaml`, `_source/objects/STOBJ-NNNN.yaml`, `_source/artifacts/DA-NNNN.yaml` IF this turn introduces a story-local location, object, or in-story diegetic artifact.
6. `Write _source/branches/BR-NNNN.yaml` — new BR if this run is a fork; OR superseder of the existing BR's `current_leaf_page_id` (and `status: terminal` if Phase 3 §Terminal Feasibility flagged this page as terminal) on continuation.
7. `Write pages-prose/PG-NNNN.md` (the rendered prose from Phase 7's working buffer).
8. `Edit worlds/<world-slug>/stories/<story-slug>/INDEX.md` LAST:
   - Update the branch's leaf entry (or add a new branch row if fork).
   - Update active-thread status changes.
   - Update the latest health snapshot.
   - If terminal: mark the branch's row terminal with the `terminal_reason`.
   - `INDEX.md` is NOT under `_source/`, so Hook 3 does not block direct `Edit`.

**Direct `Write` is the correct mutation surface** (per the Shape A integration posture inherited from `branching-story-bootstrap` — story records are not world canon; no engine ops exist for story-record classes; Hook 3's match pattern `worlds/<slug>/_source/...` does NOT match `worlds/<slug>/stories/<slug>/_source/...`).

**Partial-failure recovery**: if any write in steps 1-7 fails, the user receives the failure with the specific path and instruction to either manually clean up the partial records or re-invoke the skill (which will detect the partial state at Pre-flight by ID-uniqueness scan). The `INDEX.md` write at step 8 is intentionally LAST so a partial state never appears in the bundle index.

Report all written paths. **Do NOT commit to git.** The user reviews the diff and commits.

## Mandatory LLM Roles

Run the page-cycle turn through these critics where applicable:

- **Choice Parser** — Phase 1 Path B (write-in path only).
- **Choice Proposer** — Phase 8 step 2.
- **Choice Renderer** — Phase 8 step 5 (surface labels).
- **Prose Renderer** — Phase 7.
- **JIT Storylet Generator** — Phase 4 fallback only; delegated to `storylet-pool-authoring` `mode=jit`.
- **Continuity Critic** — Phase 7 post-render claim classification + Phase 9 gate 7 cross-check.
- **Mystery Curator** — Phase 9 gate 1 firewall check.
- **Pacing Critic** — verifies the page lands at a real choice point (Phase 7 fail-fast checks).

The proposer / renderer / parser are the LLM's first-class roles per the proposal's "LLM as surface realization, not source of truth" rule. The continuity / mystery / pacing critics are validation roles. Per `execution_mode`: `authoring` runs all listed critics; `interactive_runtime` runs parser / proposer / renderer mandatorily and critics on validation failure or high-risk touches; `batch_generation` runs full critics on configured checkpoints only (per the HARD-GATE block table).

## Validation Rules This Skill Upholds

| Rule | Phase enforced | Mechanism |
|---|---|---|
| Rule 1: No Floating Facts | Phase 5 + Phase 9 gate 11 | Every newly-created SF declares `epistemic_class`, `truth_value`, `certainty`, `known_by`, `subject/predicate/object`, `derived_from_cf` (or `canon_relation: not_applicable` for premise-specific story-local facts). Phase 9 gate 11 is the structural backstop. |
| Rule 4: No Globalization by Accident | Phase 3 + Phase 9 gate 2 | Phase 3 INV check runs the proposed event against every world INV's `break_conditions` (whole-class load from Pre-flight). Phase 9 gate 2 is the structural backstop. |
| Rule 5: No Consequence Evasion | Phase 2 + Phase 5 + Phase 9 gate 12 | Phase 2 emits `required_aftermath` per impact analysis (transferable_functions, body_discovery, faction_reaction, etc.). Phase 5 instantiates each `required_aftermath` item as a `CNSQ-NNNN` record (or routes it to a newly-opened OBL). Phase 9 gate 12 enforces no item silently dropped. |
| Rule 6: No Silent Retcons (story-scope analogue + world-scope handoff) | Phase 5 + Phase 4.5 | Story-bundle records are append-only via supersession (new record cites `supersedes`, original retained for branch-replay). The Rule-6 enforcement surface for world-canon retcon is `canon-addition` via the Phase 4.5 `canon_candidate` handoff to `story-fact-promotion-to-canon` — never elided. |
| Rule 7: Preserve Mystery Deliberately | Phase 4 storylet selection + delegated `storylet-pool-authoring` JIT gate set + Phase 4.5 per-claim authority routing + Phase 7 prose `mystery-risk` rejection + Phase 9 gate 1 | Phase 4 hard-filters existing storylets whose `mystery_safety.forbidden_M_resolved == true`; delegated JIT candidates also pass storylet-pool-authoring gates 1 and 2 before selection. Phase 4.5 routes `M_resolution_claims` per per-claim authority, with `forbidden`-status M never resolved at any authority level. Phase 7 cross-check rejects prose with `mystery-risk` classification. Phase 9 gate 1 is the structural backstop. Whole-class M-record load via `mcp__worldloom__list_records(record_type='mystery_record', include_full_body=true)` powers all enforcement points. |

## Record Schemas

This skill's outputs are story-bundle records. None are Canon Fact Records or Change Log Entries (canon-reading skill — N/A on those two; the world-canon promotion route hands off to `story-fact-promotion-to-canon`).

### Page Record (PG-NNNN)

```yaml
id: PG-0042
story_id: STORY-001
branch_id: BR-0007                                    # the branch this page belongs to
parent_page_id: PG-0017
branch_path: [PG-0001, PG-0005, PG-0017, PG-0042]
chosen_choice_id: CHC-0098                            # null at root only
write_in_used: false                                  # true if Path B was the route
write_in_routing: null | accept | accept_but_transform | treat_as_attempt | refuse_only_through_world_logic
storylet_realized: SLT-0019
applied_event_ops: [SE-0042]                          # event records own the structured ops
state_hash: <hash>
parent_state_hash: <hash>
branch_terminal: false                                # true if this page is terminal (Phase 3 §Terminal Feasibility)
terminal_reason: null | resolved | tragic_end | dead_end_acknowledged | player_choice | invariant_block
state_snapshot:
  canon_revision: CH-NNNN | null                      # which world canon CH was visible at this tick (audit trail)
  objective_facts: [SF-NNNN, ...]
  apparent_facts: [SF-NNNN, ...]
  disputed_facts: [SF-NNNN, ...]
  reader_known_facts: [SF-NNNN, ...]                  # SFs with visible_to_reader: true
  belief_state_by_actor:
    STENT-NNNN: [SF-NNNN, ...]
  rumor_state: [SF-NNNN, ...]
  obligations_open: [OBL-NNNN, ...]
  obligations_paid_off: [OBL-NNNN, ...]
  obligations_complicated: [OBL-NNNN, ...]
  obligations_abandoned: [OBL-NNNN, ...]
  consequences_pending: [CNSQ-NNNN, ...]
  consequences_addressed: [CNSQ-NNNN, ...]
  threads_active: [THR-NNNN, ...]
  relationships_current: [SREL-NNNN, ...]
  intentions_current: [STINT-NNNN-<char>, ...]
  cast_present: [STENT-NNNN, ...]
  current_location: STLOC-NNNN
  accessible_locations: [STLOC-NNNN, ...]
  objects_in_scope: [STOBJ-NNNN, ...]
  inventory_by_entity:
    STENT-NNNN: [STOBJ-NNNN, ...]
  entity_status:
    STENT-NNNN:
      alive: true
      conscious: true
      present: true
      mobile: true
      restrained: false
prose_path: pages-prose/PG-0042.md
emitted_choices: [CHC-NNNN, ...]
narrative_health: {...}                              # see Phase 6
governor_nudge_applied: <description>
content_intensity: tame | mature | explicit
validation_trace:                                    # Phase 9 gates 1-12 with one-line PASS rationales
  mystery_firewall: PASS — <rationale>
  invariant_compatibility: PASS — <rationale>
  recursive_reference_closure: PASS — <rationale>
  snapshot_replay_equality: PASS — <rationale>
  id_uniqueness: PASS — <rationale>
  content_policy_presence: PASS — <rationale>
  prose_ledger_consistency: PASS — <rationale>
  choice_contract_integrity: PASS — <rationale>
  choice_consequence_capacity: PASS — <rationale>
  state_snapshot_integrity: PASS — <rationale>
  epistemic_class_declared: PASS — <rationale>
  consequence_persistence: PASS — <rationale>
created_at: <iso8601>
```

### Story Event Record (SE-NNNN)

The skill's replay-equality contract is `parent.snapshot + applied_event_ops == this_page.snapshot`. For replay to be computable and auditable, applied_event_ops must be **structured**, not opaque payloads. The page record cites the event by ID; the event owns the structured ops.

```yaml
id: SE-0042
story_id: STORY-001
branch_id: BR-0007
created_at_page: PG-0042

source:
  parent_page_id: PG-0017
  chosen_choice_id: CHC-0098 | null
  write_in_text_hash: <hash> | null
  storylet_realized: SLT-0019

actor: STENT-NNNN | system | environment
action: <canonical verb>
target: STENT-NNNN | STOBJ-NNNN | STLOC-NNNN | abstract | null
instrument: STENT-NNNN | STOBJ-NNNN | SF-NNNN | null

preconditions_checked:
  - predicate: <engine-checkable predicate per templates/predicate-dsl.md in `.claude/skills/storylet-pool-authoring/`>
    result: pass | fail
    evidence: <record-id>

ops:
  - op_id: OP-0001
    op_type: fact_create | fact_invalidate |
             obligation_open | obligation_pay_off | obligation_complicate | obligation_supersede | obligation_transfer |
             consequence_open | consequence_address |
             thread_supersede |
             relationship_supersede |
             intention_refresh |
             cast_change |
             location_change |
             inventory_change |
             canon_sync
    input_records: [SF-NNNN, OBL-NNNN, ...]
    output_records: [SF-NNNN, OBL-NNNN, ...]
    deterministic_payload: {...}                       # structured fields per op_type; no free-form prose

state_hash_before: <hash>
state_hash_after: <hash>

notes: >
  ...
```

The `op_type` enum is closed; LLM proposers may not invent new op types. The `deterministic_payload` is structured per op type (e.g., `fact_create.deterministic_payload` carries the new SF's epistemic_class, subject, predicate, object, certainty, known_by; `consequence_open.deterministic_payload` carries CNSQ kind, subjects, scope, urgency, salience). This is what makes replay equality computable and audit-checkable.

### Choice Record (CHC-NNNN)

Schema reproduced in Phase 8 step 5; carries the `choice_contract` block (user_intent, guaranteed_action, success_policy, allowed_outcome_band, forbidden_outcomes, minimum_state_change). The contract is enforced at the next turn's Phase 1 (REFUSE/TRANSFORM/ATTEMPT/ACCEPT routing) and Phase 7 (post-render fail-fast checks).

### Other story-bundle records

The remaining classes (SF, OBL, CNSQ, THR, SREL, STINT, SLT, STLOC, STOBJ, DA-story-local, BR) are emitted by this skill but their schemas are owned by `branching-story-bootstrap/templates/story-records.yaml` — the bootstrap skill is the schema authority for shared classes; this skill is the runtime authority for PG/SE/CHC. Per-turn emission rules:

- **SF-NNNN** — append-only; supersession on certainty change; declares `epistemic_class`, `truth_value`, `certainty`, `known_by`, `subject/predicate/object`, `derived_from_cf | canon_relation`, `created_at_page`.
- **OBL-NNNN** — append-only; supersession on status change (open → paid_off / complicated / transferred / abandoned_with_acknowledgment); declares `salience`, `urgency`, ≥2 `possible_payoff_modes`.
- **CNSQ-NNNN** — append-only; supersession on `consequence_address` op; carries `kind`, `subjects`, `scope`, `urgency`, `salience`, `created_at_page`, branch-scoped visibility.
- **THR-NNNN** — append-only; supersession on `status` or `current_pressure` change.
- **SREL-NNNN** — append-only; supersession on `axes` / `public_status` / `private_status_by_actor` change.
- **STINT-NNNN-<char>** — append-only; replaces prior STINT for that character on intention refresh.
- **SLT-NNNN (JIT only)** — branch-scoped (`visibility.scope: branch_scoped`); carries `provenance.origin: runtime_jit` and `created_at_page: this_PG`; produced by `storylet-pool-authoring` `mode=jit` and written by this skill in Phase 11.
- **STLOC-NNNN / STOBJ-NNNN** — append-only; introduced when a new story-local location/object enters scope.
- **DA-NNNN (story-local)** — created when a diegetic artifact is authored in-story this turn; carries `story_id` (distinct from world-level DA).
- **BR-NNNN** — new on fork; superseder of `current_leaf_page_id` (and `status` if terminal) on continuation.

No Canon Fact Record template; no Change Log Entry template — both N/A in the FOUNDATIONS Alignment table.

## FOUNDATIONS Alignment

| Principle | Phase / Mechanism | Notes |
|---|---|---|
| Tooling Recommendation (§"non-negotiable") | Pre-flight loads `docs/FOUNDATIONS.md` + `WORLD_KERNEL.md` + `ONTOLOGY.md` + `STORY_KERNEL.md`; whole-class M + INV record loads via `list_records(... include_full_body=true)`; premise-and-state-bounded retrieval via `get_context_packet(task_type='story_page_cycle')`. Whole-class enumeration authorized for class-bounded firewalls per FOUNDATIONS §Tooling Recommendation. | Direct `Read` of `_source/<world-subdir>/` redirected to MCP retrieval by Hook 2; story-bundle `_source/<story-subdir>/` is direct-Read because Hook 2's match pattern does NOT match the nested bundle. |
| Multi-world directory discipline | Single-world scope; required `world_slug` argument; ALL world-state reads rooted at `worlds/<world-slug>/`; ALL writes rooted at `worlds/<world-slug>/stories/<story-slug>/`. | Story-bundle scope nested inside single-world scope. |
| Default Reality (FOUNDATIONS §Core Principle) | Phase 4.5 `canon_candidate` HARD-GATE handoff to `story-fact-promotion-to-canon` is never elided in any execution_mode. World-canon mutation is always an explicit user act per FOUNDATIONS §Default Reality. | The Phase 10 per-mode HARD-GATE lifting applies ONLY to story-bundle writes (which are not world canon); the canon-mutation gate is structurally separate. |
| Rule 1: No Floating Facts | Phase 5 SF schema requires `epistemic_class` + scoping fields + `derived_from_cf` (or `canon_relation: not_applicable`); Phase 9 gate 11 backstop. | Story-local facts that aren't world canon declare `not_applicable` rather than null. |
| Rule 2: No Pure Cosmetics | N/A | Not applicable — canon-reading skill writes story-bundle records, not new world-level species/rituals/technologies/artifacts/institutions. The Rule 2 enforcement surface is `canon-addition` Phase 5 (Diffusion Analysis) and `propose-new-canon-facts` Phase 4 (Domain Coverage); story-local STENT/STOBJ/STLOC/story-local-DA are not Rule-2-eligible because they are story-scoped, not world-canon. |
| Rule 3: No Specialness Inflation | N/A | Not applicable — canon-reading skill produces no new world-level capability, artifact, or species. The enforcement surface is `canon-addition` (CF stabilizers + Rule-3 audit). Story-local capability assertions inherit from the source CF's `costs_and_limits` (per Phase 5 fact_create discipline); they do not inflate world-level specialness. |
| Rule 4: No Globalization by Accident | Phase 3 continuation feasibility check + Phase 9 gate 2 backstop. INV `break_conditions` enforced against every applied_event_op via the whole-class INV load. | Distribution check is the concern of source CFs imported as SFs; this skill does not introduce world-level distribution claims. |
| Rule 5: No Consequence Evasion | Phase 2 emits `required_aftermath`; Phase 5 persists each item as CNSQ (or routes to newly-opened OBL); Phase 9 gate 12 enforces no item silently dropped. | The proposal's central design rule — runtime engine forgetting consequences turns the promise/consequence engine into a goldfish. |
| Rule 6: No Silent Retcons | Story-bundle records are append-only via supersession (new record cites `supersedes`; original retained); world-canon retcon route is `canon-addition` via Phase 4.5 `canon_candidate` handoff (never elided). | Story-scope supersession is Rule 6 applied by analogy at story scope; world-scope Rule 6 is `canon-addition`'s territory. |
| Rule 7: Preserve Mystery Deliberately | Phase 4 storylet selection + delegated `storylet-pool-authoring` JIT gate set + Phase 4.5 per-claim authority routing + Phase 7 prose `mystery-risk` rejection + Phase 9 gate 1 backstop. | `forbidden`-status M resolutions hard-rejected at every enforcement point; whole-class M load powers storylet-pool-authoring's JIT gates and page-cycle's defense-in-depth checks. |
| Rule 11: No Spectator Castes by Accident | N/A | Not applicable — canon-reading skill introduces no exceptional capability that could create spectator castes. The enforcement surface is `canon-addition` Phase 5 + `propose-new-canon-facts` (CF leverage-enumeration). Story-local cast capabilities inherit from the source CF's distribution + costs. |
| Rule 12: No Single-Trace Truths | N/A | Not applicable — same reasoning as Rule 2 / 3 / 11; the trace-multiplicity discipline applies to new world-level hard-canon truths, not to story-local imports/mutations. The enforcement surface is `canon-addition` + `propose-new-canon-facts`. |
| Canon Layering | Phase 5 SF mutations preserve `derived_from_cf` and `canon_relation`; Phase 4.5 firewall preserves Mystery Reserve layer; story-only entities (created via Phase 5 `cast_change` ops with `world_ent_id: null`) marked `story_only: true` (a soft-canon-local-to-story register, not promoted to any world canon layer without explicit `story-fact-promotion-to-canon`). | Story bundle is its own per-story layer below world canon. |
| Change Control Policy | N/A | Not applicable — canon-reading skill emits no Change Log Entries. Per FOUNDATIONS §Change Control Policy, "every approved change must get a record" applies to world-level canon mutations; story bundles are not world-level canon. The handoff is `canon-addition` for any later promotion via `story-fact-promotion-to-canon`. |

## Guardrails

- **HARD-GATE is bicameral** (see top of file). The Phase 10 gate over story-bundle writes is per-mode liftable (`authoring` shows; `interactive_runtime` and `batch_generation` auto-commit after Phase 9 PASS). The Phase 4.5 canon-promotion handoff to `story-fact-promotion-to-canon` is **absolute in every mode** — Auto Mode does not override it. A future maintainer "simplifying" the gate to a single absolute form would break the runtime use case the skill exists to support; one lifting Phase 4.5 in `interactive_runtime` for "consistency" would silently weaken the canon-mutation firewall. Both moves are wrong.
- **Never write world-level canon.** This skill never `Write`s or `Edit`s `worlds/<world-slug>/WORLD_KERNEL.md`, `ONTOLOGY.md`, or any `worlds/<world-slug>/_source/<world-subdir>/*.yaml` record. Hook 3 enforces the latter. No CF, CH, INV, M, OQ, ENT, or world-level SEC record is emitted by this skill — the Phase 4.5 `canon_candidate` route hands off to `story-fact-promotion-to-canon` for that.
- **Never read sibling-branch pages.** State assembly at Pre-flight reads only pages along `parent_page.branch_path`. Phase 9 gate 3 (recursive reference closure) is the structural enforcement; the read scope discipline at Pre-flight is the procedural enforcement. Both are load-bearing.
- **Records are append-only via supersession.** A new page that "updates" an existing OBL writes a NEW record citing `supersedes: OBL-NNNN`; the original record is never edited. The branch-replay contract depends on this.
- **Direct `Write` is the correct mutation surface for story-bundle records under the Shape A integration posture.** Hook 3's match pattern is `worlds/<slug>/_source/...` which does NOT match `worlds/<slug>/stories/<slug>/_source/...`. Story records are not world canon and no engine ops exist for them. A future maintainer who "upgrades" the skill to engine routing must FIRST land patch-engine ops + Hook 3 namespace extension + record-schema validators for the story-record classes (deferred-integration tickets named below).
- **Canon-mutation handoff sibling (existing, shipping)**:
  - **`story-fact-promotion-to-canon`** — the canon-mutation HARD-GATE handoff for Phase 4.5 `canon_candidate` resolutions. The page-cycle PAUSES at Phase 4.5 and presents a handoff message; the user separately invokes `story-fact-promotion-to-canon` (worldloom skills are non-chaining). The skill does NOT silently degrade to `apparent` on a `canon_candidate` resolution because that would erode the canon-mutation HARD-GATE invariant. A future page-cycle delegation refactor (extracting the pause-and-prompt to a sub-routine call) is anticipated but out-of-scope for this skill; the current pause-and-tell-the-user shape is the correct posture under the worldloom non-chaining contract.
- **Existing siblings (audit feedback consumers)**:
  - **`branching-story-health-audit`** — consumes `narrative_health.flagged_for_audit` and high-JIT-rate signals to surface branches needing curation. Its `audit_focus=flagged_pages_priority` value prioritizes flagged branches, and its deliverable summary surfaces flagged-page and high-JIT-rate branch signals.
- **Sibling interop (existing)**:
  - **Consumes**: `branching-story-bootstrap` outputs (the story bundle this skill operates over).
  - **Consumes**: `storylet-pool-authoring` `mode=jit` as the Phase 4 fallback storylet generator. Page-cycle calls it with `parent_skill_invocation: true`, receives one branch-scoped `runtime_jit` SLT plus validation packet, applies the SLT in Phase 5, rechecks in Phase 9, and writes it in Phase 11 if the page tick commits.
  - **Consumes (own outputs across turns)**: this skill's PG-NNNN / SE-NNNN / CHC-NNNN / SF-NNNN / etc. records produced on prior turns are read on subsequent turns.
- **Content policy is a contract, not a setting.** The NC-21 block from this skill's `templates/content-policy.txt` is prepended verbatim to EVERY LLM prompt assembled by this skill — the parser, the proposer, the renderer, the prose render, the JIT storylet generator. `content_intensity_baseline` (`tame` / `mature` / `explicit`) is a routing tag for tone consistency within branches — never a censor. Phase 9 gate 6 is the structural backstop.
- **The LLM is never the continuity database.** All state lives in `worlds/<slug>/stories/<slug>/_source/*.yaml`; the LLM proposes structured outputs (parser → ProposedEvent; proposer → CHCs; renderer → prose) that the engine validates and commits. A maintainer who would rewrite a phase to "let the LLM track state" violates the proposal's load-bearing rule.
- **Worktree discipline**: if invoked inside a worktree, all paths resolve from the worktree root.
- **Do NOT commit to git.** Writes land in the working tree only; the user reviews the diff and commits.

## Final Rule

A page is not a passage of prose.

It is a transaction against narrative state — it must change at least one of: a fact, an obligation's status, a thread's pressure, a character's intention, a relationship, the cast (entry / exit / death), or the location. If a page changes none of these, it is filler — and the engine MUST reject it at Phase 7 cross-check or Phase 9 gate 10. Pages that change state are the only currency the branching-story system trades in. Choices that don't lead to such pages are fake agency, and the runtime exists precisely to make agency structural rather than aspirational.
