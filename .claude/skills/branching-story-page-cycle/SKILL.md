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
  - name: execution_mode
    description: "One of: authoring | interactive_runtime | batch_generation. Overrides the story bundle's execution_mode_default. Per-mode behavior governs Phase 10 HARD-GATE visibility, mandatory-critic policy, and auto-write — but NEVER lifts the Phase 4.5 canon-promotion HARD-GATE handoff to story-fact-promotion-to-canon."
    required: false
---

# Branching Story Page Cycle

Runs one tick of the runtime causal-promise engine: parses the user's choice (structured CHC or free-form write-in), runs impact analysis, checks continuation feasibility, mutates story-bundle ledgers via append-only supersession, recomputes narrative health, selects the next storylet (with JIT expansion if the pool is thin), renders the next page's prose, generates 4-6 structured choices + a write-in slot, validates against firewalls and the recursive branch-isolation invariant, and atomically writes the new records — fork and replay are structurally identical to continuation (point `parent_page_id` at any page, leaf or non-leaf).

<HARD-GATE>
Do NOT write under `worlds/<world-slug>/stories/<story-slug>/_source/` or `pages-prose/`, and do NOT `Edit` the bundle's `INDEX.md`, until:

(a) Pre-flight resolves the bundle, validates `parent_page_id` belongs to this story, validates exactly one of `{chosen_choice_id, manual_action_text}`, pre-allocates all per-class IDs the envelope will populate (`PG-NNNN` always; `BR-NNNN` on fork AND on continuation; plus one allocation per id-class — `SF` / `OBL` / `CNSQ` / `THR` / `SREL` / `STINT` / `SE` / `SLT` / `STLOC` / `STOBJ` / `DA` / `CHC` — that this turn will create records in) via `mcp__worldloom__allocate_next_id(world_slug, id_class, story_slug=...)`, resolves `execution_mode`, loads `docs/FOUNDATIONS.md` into working context (the Validation Rules that govern Phase 4.5 mystery-resolution authority, Phase 5 state-mutation discipline, Phase 9 firewall/invariant gates, and the FOUNDATIONS §Default Reality + Rule 6 commitment that anchors the never-elided Phase 4.5 canon-promotion HARD-GATE all live there; CLAUDE.md §Non-Negotiables explicitly forbids skipping this load; verifiable per `references/pre-flight-and-prerequisites.md §Pre-flight Check`'s **Verify FOUNDATIONS-in-context before proceeding** bullet, which makes the load mandate self-checkable rather than purely cultural), and confirms the content_policy block is loaded for downstream prompt assembly.
(b) Phase 9 records PASS with a one-line rationale for every gate (12 gates — see Phase 9: mystery firewall, invariant compatibility, recursive reference closure, snapshot-replay equality, ID uniqueness, content policy presence, prose ledger consistency, choice contract integrity, choice consequence-capacity, state_snapshot integrity, epistemic class declared, consequence persistence).
(c) `execution_mode == authoring` (default): the user has explicitly approved the Phase 10 deliverable summary. `interactive_runtime`: Phase 10 hidden; auto-commits after Phase 9 PASS. `batch_generation`: hidden until validation failure or a configured checkpoint.

**The Phase 4.5 canon-promotion handoff to `story-fact-promotion-to-canon` is a separate, never-elided HARD-GATE that fires regardless of `execution_mode`.** World-canon mutation is always an explicit user act per FOUNDATIONS §Default Reality + Rule 6. Auto Mode does not override it.
</HARD-GATE>

## Process Flow

```
Pre-flight     resolve story bundle; validate parent_page_id belongs to story;
               pre-allocate all per-class IDs the envelope will populate
               (PG-NNNN always; BR-NNNN on fork AND continuation; plus
               SF/OBL/THR/SREL/STINT/SE/SLT/CHC per turn-applicable classes)
               via allocate_next_id; validate exactly one of
               {chosen_choice_id, manual_action_text}; resolve execution_mode;
               load content_policy; assemble retrieval (context_packet +
               whole-class M + INV firewall loads); record canon_revision
               audit-trail field for the new page
   |
   v
Phase 1        Choice resolution — Path A (CHC → ProposedEvent from structured
               CHC fields) OR Path B (write-in → LLM parser → ProposedEvent →
               engine validation → four-way routing {ACCEPT, ACCEPT_BUT_TRANSFORM,
               TREAT_AS_ATTEMPT, REFUSE_ONLY_THROUGH_WORLD_LOGIC}; never silently
               rejected)
   |
   v
Phase 2        Impact analysis — facts_created/invalidated; obligations
               opened/paid_off/complicated/transferred/abandoned_with_acknowledgment;
               intentions/threads pressure deltas; impossible/newly_eligible
               storylets; transferable_functions on load-bearing-character
               removal; required_aftermath items (persisted as CNSQ in Phase 5)
   |
   v
Phase 3        Continuation feasibility — ≥1 storylet satisfied? required_aftermath
               addressable? forbidden M preserved? INV intact? Coherent terminal
               branch honored; on infeasibility surface ACCEPT-ANYWAY / TRANSFORM
               / ATTEMPT / DIFFERENT-CHOICE
   |
   v
Phase 4        Storylet selection — hard filters → salience scoring →
               weighted-pick from top-K (weighted, not mechanical top-1);
               governor_nudge biases weighting; JIT expansion only when no
               candidate scores above threshold AND consequence-capacity
               required JIT
   |
   v
Phase 4.5      Mystery resolution authority — per-claim routing per
               mystery_safety.M_resolution_claims: apparent → SF epistemic_class
               apparent/belief; branch_local_counterfactual → SF canon_relation
               canon_divergent (story-mode gated); canon_candidate → PAUSE for
               HARD-GATE handoff to story-fact-promotion-to-canon (preserved in
               every execution_mode); forbidden-status M never resolved
   |
   v
Phase 5        State mutation — apply structured ops; append-only supersession
               (logical_id + supersedes); compute next_snapshot per closed
               op_type enum; persist required_aftermath as CNSQ unless absorbed
               by newly-opened OBL; verify branch-isolation invariant
               (created_at_page == this_PG on every non-PG emergent
               record; PG id is the page's branch anchor)
   |
   v
Phase 6        Narrative governor recompute + nudge — narrative_health metrics
               (open_obligation_count, high_salience_unpaid_count, contradiction_risk,
               causal_connectivity, motivation_coverage, threat_pressure,
               consequence_density, reflection_density, novelty, tension,
               agency_score); generate governor_nudge (HOMEOSTAT, not act-spine)
   |
   v
Phase 6.5      Closure readiness — state-derived signal (no required-closure
               OBL un-acknowledged, no high-urgency CNSQ pending, ≥1 major THR
               resolved/failed/transformed/left, no >3-step STINT delta unrefreshed,
               contradiction_risk < 0.4); widens Phase 8 choice set with branch-
               ending/pausing options; never forces termination
   |
   v
Phase 7        Page render — LLM prompt assembly with content_policy verbatim
               FIRST + story kernel + prose craft contract verbatim + selected
               storylet + scene context + recent prose continuity along
               branch_path only (continuity for narrative/world only — NOT
               echo phrasings) + governor_nudge; LLM produces prose; post-
               render prose critic checks 7 axes against the contract (filter-
               word saturation, recurring-metaphor across pages, identical-
               anchor recurrence, self-narrating-self, bracket-paraphrasing-
               dialogue, ledger-jargon-leakage, abstract-noun-saturation);
               post-render extraction classifies load-bearing claims (already-
               ledgered / incidental-color / needs-ledger-record / contradiction
               / mystery-risk); up to 3 re-prompts on fail-fast (shared budget
               across critic + cross-check); mention-vs-depiction distinction
               is load-bearing
   |
   v
Phase 8        Choice generation (Amendment B pipeline) — affordance-space
               collection → salient-affordance shortlist + LLM proposer of 6-10
               structured CHCs → engine validation → diversification + scoring
               (≥3 distinct choice_modes, ≥3 distinct poetic_effects, ≥60% of
               open high-salience OBLs) → surface-label rendering by LLM →
               write-in slot N+1; every emitted CHC carries choice_contract block
   |
   v
Phase 9        Validation gates — 12 gates (see HARD-GATE); each PASS with
   (Canon       one-line rationale; FAIL routes to responsible phase;
    Safety      auto-correctable: re-render prose / re-generate choices;
    Check)      user-required: firewall breach, INV violation, recursive
               reference closure breach
   |
   v
Phase 10       HARD-GATE approval — deliverable summary (page header + parent
               + storylet + choice/write-in routing + ~300-word prose preview +
               state delta + narrative health + choices offered + firewall
               verdicts + target write paths); user options ACCEPT /
               REVISE-prose / REVISE-different-storylet / REVISE-different-choices
               / REJECT; visibility per execution_mode per HARD-GATE block;
               Phase 4.5 handoff is separate and never elided
   |
 accept (or auto-pass per execution_mode)
   |
   v
Phase 11       Atomic write — single transaction: PG → SE → per-class
               SF/OBL/CNSQ/THR/SREL/STINT/CHC → JIT SLT (if any) →
               STLOC/STOBJ/DA (if any) → BR (new on fork or superseder on
               continuation) → pages-prose/PG-NNNN.md → INDEX.md LAST so
               partial-failure leaves index unmutated; NO git commit
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
- `execution_mode` — `authoring | interactive_runtime | batch_generation`; overrides bundle's `execution_mode_default`. Per-mode behavior governs Phase 10 HARD-GATE visibility, mandatory-critic policy, and auto-write — but NEVER lifts the Phase 4.5 canon-promotion HARD-GATE handoff.

### Reads

The full reads list (FOUNDATIONS.md, WORLD_KERNEL.md, ONTOLOGY.md, STORY_KERNEL.md, parent page record + cited state_snapshot records, branch-path prose continuity, storylet pool filtered by `visibility`, premise-and-state-bounded world-canon retrieval, whole-class M + INV firewall loads) is in `references/pre-flight-and-prerequisites.md`.

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
| Story intentions | `intentions/STINT-NNNN.yaml` | One per major character whose pressure / emotional_state / beliefs shifted (`stent_id` points to the story entity this snapshot drives, with `world_character_id` as the optional world CHAR anchor; per-page supersession of a prior STINT for the same character via `logical_id` + `supersedes`; bare-numeric id per the patch engine's `^STINT-\d{4}$` contract) |
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
- If Phase 4 JIT created an `SLT-NNNN`: update the `## Storylet pool` total and per-shape distribution using canonical SLT `shape` values from the storylet records; do not use abbreviated bootstrap labels.
- If fork: new branch row in branches table.

### No canon-file mutations

This skill never writes `WORLD_KERNEL.md`, `ONTOLOGY.md`, or any `worlds/<world-slug>/_source/<world-subdir>/*.yaml` record. Hook 3 enforces the latter. The Phase 4.5 `canon_candidate` route hands off to `story-fact-promotion-to-canon` (which runs separately under its own HARD-GATE).

### ID Conventions — branch-isolation invariant

All non-PG emergent story-local records (SF / SE / OBL / CNSQ / THR / SREL / STINT / SLT-JIT / STLOC / STOBJ / DA / CHC / BR-on-fork) carry `created_at_page: PG-NNNN` — the new page produced this turn. PG records are the page, so the PG record's own `id` is its branch anchor and must appear in `branch_path`. Author-pool storylets are the other exception: they retain `created_at_page: null` and are globally visible (set by storylet-pool-authoring at authoring time in seed/focus modes).

The branch-isolation invariant is structurally enforced by this field combined with Phase 9's recursive reference closure validation gate.

## Procedure

1. **Pre-flight.** Validate args, pre-allocate all per-class IDs the envelope will populate (`PG-NNNN` always; `BR-NNNN` on fork-detection AND on continuation; plus one allocation per id-class — `SF` / `OBL` / `CNSQ` / `THR` / `SREL` / `STINT` / `SE` / `SLT` / `STLOC` / `STOBJ` / `DA` / `CHC` — that this turn will create records in) via `mcp__worldloom__allocate_next_id`, resolve `execution_mode`, and assemble world-state retrieval (FOUNDATIONS.md, WORLD_KERNEL.md, ONTOLOGY.md, STORY_KERNEL.md, parent page + cited state-snapshot records, branch-path prose continuity, filtered storylet pool, premise-and-state-bounded `get_context_packet`, whole-class M + INV firewall loads, content_policy block). Load `references/pre-flight-and-prerequisites.md`.

2. **Phase 1 — Choice resolution.** Path A (`chosen_choice_id` → `ProposedEvent` from CHC's structured fields) or Path B (`manual_action_text` → LLM parser → engine validation → four-way routing: REFUSE_ONLY_THROUGH_WORLD_LOGIC / TREAT_AS_ATTEMPT / ACCEPT_BUT_TRANSFORM / ACCEPT). Write-in inputs are NEVER silently rejected. Load `references/phase-1-choice-resolution.md`.

3. **Phases 2-3 — Impact analysis + continuation feasibility.** Compute facts_created/invalidated, obligations affected, intentions/threads deltas, storylet eligibility shifts, transferable_functions, and required_aftermath. Then check that ≥1 storylet remains satisfied, all required_aftermath items are addressable, all `forbidden`-status M are preserved, and INVs hold. Surface ACCEPT-ANYWAY / TRANSFORM / ATTEMPT / DIFFERENT-CHOICE on infeasibility, or honor a coherent terminal branch. Load `references/phase-2-3-impact-and-feasibility.md`.

4. **Phases 4 + 4.5 — Storylet selection + mystery resolution authority.** Hard-filter the storylet pool, salience-score, weighted-pick from top-K (avoid mechanical top-1 selection when scores are within ~1 point — introduce variation via judgment when alternatives are close). JIT-expand via `storylet-pool-authoring mode=jit` only when no candidate scores above threshold and consequence-capacity required JIT. **Inline-authoring of a JIT SLT in this skill's patch envelope is operationally riskier than delegation to `storylet-pool-authoring mode=jit` and should be reserved for cases where mid-execution sub-skill delegation is not feasible. Inline authoring places the responsibility for predicate-DSL conformance, gate-set equivalence, and provenance-field correctness on the operator rather than on the delegated skill's prompt-shape; the Phase 11 validators (`record_schema_compliance`, `storylet_predicate_dsl_parsability`, `recursive_reference_closure`) catch the result either way, but the failure mode is a re-validate cycle rather than the safety-net catch storylet-pool-authoring's prompt-shape provides upstream**: (i) `storylet-pool-authoring`'s Phase 3 inlines the closed predicate DSL grammar from `storylet-pool-authoring/templates/predicate-dsl.md` verbatim into the LLM prompt, the operator's safety net against invented predicates that the runtime `storylet_predicate_dsl_parsability` validator would otherwise reject at Phase 11 submit time; (ii) `storylet-pool-authoring`'s Phase 4 9-gate set (mystery firewall, resolution-authority declaration, predicate parsability, branch-contamination, etc.) runs over the candidate, and re-running these gates inline duplicates validator logic and risks divergence; (iii) `provenance.origin: runtime_jit`, `provenance.created_at_page: <this_PG_id>`, and `visibility.scope: branch_scoped` are set authoritatively by `storylet-pool-authoring` at JIT-emission time, not negotiated by the caller. An operator who shortcuts to inline authoring (because spawning a sub-routine feels heavier than authoring a single SLT) will hit the validator at Phase 11 with `unknown pred '<invented-name>'` errors and force a re-validate cycle; the delegation cost is the safety net's price. **Phase 4.5 `canon_candidate` route is a separate, never-elided HARD-GATE handoff to `story-fact-promotion-to-canon` regardless of `execution_mode`.** Load `references/phase-4-storylet-and-mystery-authority.md`.

5. **Phase 5 — State mutation.** Apply structured ops via append-only supersession (`logical_id` + `supersedes`); compute `next_snapshot` per the closed `op_type` enum; persist each `required_aftermath` item as a CNSQ-NNNN unless absorbed by a newly-opened OBL; verify the branch-isolation invariant (`created_at_page == this_PG` on every non-PG emergent record; PG records are authorized by their own id in `branch_path`). Load `references/phase-5-state-mutation.md`.

6. **Phases 6 + 6.5 — Narrative governor recompute + closure readiness.** Recompute narrative_health (open_obligation_count, high_salience_unpaid_count, contradiction_risk, causal_connectivity, motivation_coverage, threat_pressure, consequence_density, reflection_density, novelty, tension, agency_score, flagged_for_audit). Generate `governor_nudge` (homeostat, never act-spine). Detect state-derived closure readiness; widen — never force — Phase 8's choice set when ready. Load `references/phase-6-governor-and-closure.md`.

7. **Phase 7 — Page render.** Assemble the LLM prompt with content_policy verbatim FIRST, story kernel, **prose craft contract verbatim** (`references/prose-craft-contract.md`), selected storylet, scene context, recent prose continuity ALONG `branch_path` ONLY (continuity for narrative/world only — instruction explicitly forbids echoing prior phrasings / recurring metaphors / identical anchors verbatim), and `governor_nudge`. Render to a working buffer (NOT disk yet). Run the post-render prose critic against the 7 contract-derived axes (per-mode behavior in `references/phase-7-page-render.md` §Post-Render Prose Critic), then post-render claim classification (already-ledgered / incidental-color / needs-ledger-record / contradiction / mystery-risk) and the fail-fast checks (intensity band, storylet fact_effects, choice contract `forbidden_outcomes`); critic + cross-check + fail-fast share the same 3-re-prompt budget before escalating to the user. Load `references/phase-7-page-render.md`.

8. **Phase 8 — Choice generation (Amendment B pipeline).** Affordance-space collection → salient shortlist → LLM proposer of 6-10 structured CHCs → engine validation pass → diversification + scoring (≥3 distinct `choice_mode` values, ≥3 distinct `poetic_effect` values, ≥60% open high-salience OBLs covered) → LLM surface-label rendering → write-in slot N+1. Every emitted CHC carries a populated `choice_contract` block. Load `references/phase-8-choice-generation.md`.

9. **Phase 9 — Validation gates.** Run all 12 gates (mystery firewall, invariant compatibility, recursive reference closure, snapshot-replay equality, ID uniqueness, content policy presence, prose ledger consistency, choice contract integrity, choice consequence-capacity, state_snapshot integrity, epistemic class declared, consequence persistence). Each PASS requires a one-line rationale on the new page's `validation_trace` field; a bare PASS is treated as FAIL. FAIL routes to the responsible phase. Load `references/phase-9-validation-gates.md`.

10. **Phase 10 — HARD-GATE approval.** Per `execution_mode`:

    | Mode | Phase 10 visibility |
    |---|---|
    | `authoring` (default) | HARD-GATE shown — all-listed-critics run; user must explicitly approve before Phase 11 |
    | `interactive_runtime` | HARD-GATE hidden; auto-commits to Phase 11 after Phase 9 gates pass; critics run on validation failure, high-risk mystery touch, or high contradiction risk |
    | `batch_generation` | HARD-GATE hidden until validation failure or a configured checkpoint; full critics on configured checkpoints only |

    **Phase 4.5's canon-promotion handoff to `story-fact-promotion-to-canon` is a separate, never-elided gate** (see top-of-file HARD-GATE). Auto Mode does not override it.

    When the gate is shown, present the deliverable summary:

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

    PHASE 4.5 — CANON-PROMOTION HANDOFF:
    - Triggered: <true | false>
    - Per-claim routing: <count> apparent, <count> branch_local_counterfactual, <count> canon_candidate (handed off to story-fact-promotion-to-canon under separate HARD-GATE)
    - Forbidden-status M preserved: <bool — Phase 9 gate 1 dependency>

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

    When the gate is hidden per `execution_mode`, the engine auto-commits to Phase 11 after Phase 9 records all 12 PASSes. On Phase 9 FAIL the engine surfaces the failure and routes per the responsible-phase column — **the auto-commit posture does NOT mask validation failures**. The Phase 9 gates run in every mode; only the Phase 10 user-approval pause is conditionally lifted.

11. **Phase 11 — Engine submit + markdown writes.** Single patch-engine transaction for story-bundle `_source/*.yaml`, followed by direct markdown writes. File order matters because partial-failure recovery depends on dependency ordering — `INDEX.md` is the LAST direct write so a partial state never appears in the per-bundle index:

    1. Assemble the envelope, dry-run validate, sign the approval token, and submit. Five sub-steps:
       - **1a. Assemble** the `mcp__worldloom__submit_patch_plan` envelope with all emitted `_source` records. Per-op kinds:
         - `create_pg_record` for `_source/pages/PG-NNNN.yaml` (the new page record with state_snapshot + state_hash + emitted_choices + narrative_health + governor_nudge_applied + canon_revision audit-trail field).
         - `create_se_record` for `_source/events/SE-NNNN.yaml`.
         - `create_sf_record` for each `_source/facts/SF-NNNN.yaml` (one per SF created or invalidated this turn).
         - `create_obl_record` for each `_source/obligations/OBL-NNNN.yaml` (one per OBL opened / paid_off / complicated / transferred / abandoned_with_acknowledgment).
         - `create_cnsq_record` for each `_source/consequences/CNSQ-NNNN.yaml` (one per `required_aftermath` item or `consequence_address` op).
         - `create_thr_record` for each `_source/threads/THR-NNNN.yaml` (one per thread state change).
         - `create_srel_record` for each `_source/relationships/SREL-NNNN.yaml` (one per relationship state change).
         - `create_stint_record` for each `_source/intentions/STINT-NNNN.yaml` (one per character whose intentions shifted; bare-numeric id per the engine's `^STINT-\d{4}$` contract).
         - `create_chc_record` for each `_source/choices/CHC-NNNN.yaml` (one per emitted choice).
         - `create_slt_record` IF Phase 4 JIT expansion fired.
         - `create_stloc_record`, `create_stobj_record`, and `append_story_diegetic_artifact_record` IF this turn introduces a story-local location, object, or in-story diegetic artifact.
         - `create_br_record` for a new fork BR, or a superseding BR create op when updating an existing branch's leaf/status.

         Each op also carries `op`, `target_world`, `target_file`, and `payload` fields. For story-bundle ops, `target_file` follows the pattern `worlds/<world-slug>/stories/<story-slug>/_source/<class>/<ID>.yaml`; the full file-class → directory mapping (pages/, events/, facts/, obligations/, consequences/, threads/, relationships/, intentions/, storylets/, branches/, choices/, locations/, objects/, artifacts/) is documented in `branching-story-bootstrap/references/engine-envelope-shape.md §2`. The envelope-shape validator requires a non-empty string; the engine derives the actual write path from the record id, but the shape check enforces the field.
       - **1b. Persist** the envelope to `/tmp/<plan-id>.json` with `approval_token: "placeholder"` (the placeholder convention per `docs/HARD-GATE-DISCIPLINE.md §Issuing a token` and `branching-story-bootstrap/references/engine-envelope-shape.md §4` — the envelope-shape validator rejects an empty `approval_token` field, so a placeholder string is required at construction time). **Always create the envelope from zero.** Before writing, if `/tmp/<plan-id>.json` (or its `.token` sibling) already exists from a prior run, delete it first via `rm -f /tmp/<plan-id>.json /tmp/<plan-id>.token`. NEVER read or edit a pre-existing file at this path; the plan-id naming is conflict-prone (a different story-bundle, a re-tried run, or another world may have produced a same-page-id plan in a prior session) and incrementally editing a stale envelope is the dominant source of envelope-shape drift, byte-mismatch token-binding failures, and silently-carried-over op residues. The envelope must be the single-shot output of this run's Phase 11 step 1a, not a patched survivor of an earlier run.
       - **1c. Dry-run validate** via `mcp__worldloom__validate_patch_plan(envelope)` (envelope ≤50KB) OR `node tools/world-mcp/dist/src/cli/validate-patch-plan.js <plan-path>` (envelope >50KB — same engine code, bypasses MCP transport size constraints). Check envelope size with `wc -c <plan-path>`; ordinary single-storylet-no-JIT page-ticks may fit MCP transport, but multi-record turns (≥10 records — common for fork turns and JIT-expansion turns) typically exceed 50KB and require the CLI path. The canonical write-up is at `branching-story-bootstrap/references/engine-envelope-shape.md §5`. Coverage: `yaml_parse_integrity`, `id_uniqueness`, `cross_file_reference`, `record_schema_compliance`, `id_allocation_race` for `expected_id_allocations`, Rules 1-7 + structural validators. Approval-token verification remains submit-only, and submit keeps the `id_allocation_race` defense-in-depth backstop for the validate-to-submit race window; treat validate as a defensive pre-submit check, not a complete gate.
       - **1d. Sign** via `node tools/world-mcp/dist/src/cli/sign-approval-token.js <plan-path>` (the canonical issuer per `docs/HARD-GATE-DISCIPLINE.md §Issuing a token`; HMAC-bound to the envelope's exact bytes; never self-sign — Hook 3 blocks direct reads of `tools/world-mcp/.secret` precisely to prevent token forgery). Persist the signed token to `/tmp/<plan-id>.token` if the CLI submit path will be used. **Always write the token file from zero** — if a prior `/tmp/<plan-id>.token` exists at this path, the step 1b precondition already deleted it; do not append, do not edit, do not splice. A stale token bound to different envelope bytes will be rejected by the engine as `approval_signature_invalid` and is a non-recoverable state once the new envelope is signed.
       - **1e. Submit**: pass the signed token as the separate `approval_token` parameter to `mcp__worldloom__submit_patch_plan(plan, approval_token)` while leaving the envelope's `approval_token: "placeholder"` field unchanged — the engine verifies the token's HMAC against the envelope bytes that were signed (the placeholder-bearing bytes), so modifying the envelope after signing would invalidate the binding (per `branching-story-bootstrap/references/engine-envelope-shape.md §4`). Submit-path selection by envelope size (`wc -c <plan-path>`): ordinary single-storylet-no-JIT turns may fit MCP transport (≤50KB); multi-record turns (≥10 records — common for fork turns and JIT-expansion turns) typically exceed 50KB and use `node tools/world-mcp/dist/src/cli/submit-patch-plan.js <plan-path> <token-path>` instead — same engine code, same failure-mode codes, bypasses MCP transport size constraints (per `docs/HARD-GATE-DISCIPLINE.md §Submitting the plan` and `branching-story-bootstrap/references/engine-envelope-shape.md §5` for the canonical size-threshold table). On successful submit, the engine returns a `PatchReceipt` containing `files_written[]` and `validators_run[]` (per `tools/patch-engine/src/envelope/schema.ts` `PatchReceipt` interface); report the receipt's `files_written` rather than re-listing directories. On `approval_replayed`, the prior submit already applied — inspect the receipt the prior submit returned rather than re-submitting.
    2. `Write pages-prose/PG-NNNN.md` (the rendered prose from Phase 7's working buffer).
    3. `Edit worlds/<world-slug>/stories/<story-slug>/INDEX.md` LAST:
       - Update the branch's leaf entry (or add a new branch row if fork).
       - Update active-thread status changes.
       - Update the latest health snapshot.
       - If `create_slt_record` fired for a JIT SLT: increment the storylet-pool total and update the per-shape distribution line/table with the JIT storylet's canonical `shape` value. Preserve existing shapes not touched this turn.
       - If terminal: mark the branch's row terminal with the `terminal_reason`.
       - For supersession entries, use the pattern `<new-id> (supersedes <old-id>)` for the active-thread row and `<old-id> (superseded by <new-id>)` for the branch row when the BR record itself was superseded.
       - `INDEX.md` is NOT under `_source/`, so Hook 3 does not block direct `Edit`.
    4. **Cleanup temp files.** ONLY after step 3 has succeeded, delete the run's temp envelope and token: `rm -f /tmp/<plan-id>.json /tmp/<plan-id>.token`. This step exists because (i) those files are run-scoped and have served their purpose once `_source/` records, the prose page, and `INDEX.md` are all on disk; (ii) leaving them on disk is the conflict source step 1b spends prose preventing — a future page-cycle run with the same plan-id pattern would otherwise start by collision-detecting and deleting them, which adds a fragile dependency. Cleanup is **conditional on full success**: if Phase 11 step 1c (validate), 1e (submit), 2 (prose write), or 3 (INDEX edit) failed, DO NOT delete the temp files — they are the triage surface for the failure, and the operator inspects them while diagnosing. The temp files are also intentionally preserved on Phase 9 FAIL or Phase 10 REVISE/REJECT, since those routes do not enter Phase 11 at all and step 1b's pre-existence guard handles cleanup on the next attempt.

    Direct `Write` is forbidden for story-bundle `_source/<class>/*.yaml` records. Hook 3 now covers `worlds/<slug>/stories/<slug>/_source/...`; story YAML writes must route through story-bundle patch-engine ops. Page prose and `INDEX.md` remain direct markdown writes.

    **Partial-failure recovery**: if patch-engine submission fails, no `_source` YAML should land; report the engine error and do not write page prose or `INDEX.md`; do not run step 4's temp-file cleanup. If a later markdown write fails, report the specific path and leave the accepted YAML records as the authoritative state; do not run step 4's temp-file cleanup. The `INDEX.md` write at step 3 is intentionally LAST so a partial state never appears in the bundle index, and step 4's cleanup gates on step 3 success precisely so the temp envelope/token survive every partial-failure mode for triage.

    Report all written paths. **Do NOT commit to git.** The user reviews the diff and commits.

## Hard Rules

- **HARD-GATE is bicameral.** The Phase 10 gate over story-bundle writes is per-mode liftable (`authoring` shows; `interactive_runtime` and `batch_generation` auto-commit after Phase 9 PASS). The Phase 4.5 canon-promotion handoff to `story-fact-promotion-to-canon` is **absolute in every mode** — Auto Mode does not override it.
- **Never write world-level canon.** Never `Write` or `Edit` `WORLD_KERNEL.md`, `ONTOLOGY.md`, or any `worlds/<world-slug>/_source/<world-subdir>/*.yaml` record. Hook 3 enforces the latter. The Phase 4.5 `canon_candidate` route hands off to `story-fact-promotion-to-canon`.
- **Never read sibling-branch pages.** Pre-flight reads only pages along `parent_page.branch_path`; Phase 9 gate 3 (recursive reference closure) is the structural enforcement.
- **Records are append-only via supersession.** A new page that "updates" an existing OBL writes a NEW record citing `supersedes: OBL-NNNN`; the original record is never edited. The branch-replay contract depends on this.
- **Story-bundle YAML writes are engine-routed.** Direct `Write` to `worlds/<slug>/stories/<story-slug>/_source/<class>/*.yaml` is forbidden by Hook 3. Use `mcp__worldloom__submit_patch_plan` with story-bundle create ops. Page prose and `INDEX.md` remain direct markdown surfaces.
- **Temp envelope files are run-scoped, never run-cumulative.** Phase 11's `/tmp/<plan-id>.json` and `/tmp/<plan-id>.token` are always written from zero per Phase 11 §1b — never read or edit a pre-existing file at the same path; delete it via `rm -f` first if it exists. Editing a leftover envelope from a prior run (a different story-bundle, a re-tried run, or another world that produced a same-page-id plan) is the dominant source of envelope-shape drift and byte-mismatch token-binding failure. After successful Phase 11 completion (engine submit + page prose write + INDEX.md edit), Phase 11 §4 deletes both files. On any Phase 11 failure, preserve the temp files for triage — the operator inspects them while diagnosing.
- **Worktree discipline**: if invoked inside a worktree, all paths resolve from the worktree root. **Do NOT commit to git.**

For full Mandatory LLM Roles, Validation Rules, FOUNDATIONS Alignment, and Guardrails (including sibling interop, content-policy contract, and the LLM-is-never-the-continuity-database rule), load `references/governance-and-foundations.md`. For per-record schemas (PG, SE, CHC, plus per-turn emission rules for SF/OBL/CNSQ/THR/SREL/STINT/SLT/STLOC/STOBJ/DA/BR), load `references/record-schemas.md`.

## Final Rule

A page is not a passage of prose.

It is a transaction against narrative state — it must change at least one of: a fact, an obligation's status, a thread's pressure, a character's intention, a relationship, the cast (entry / exit / death), or the location. If a page changes none of these, it is filler — and the engine MUST reject it at Phase 7 cross-check or Phase 9 gate 10. Pages that change state are the only currency the branching-story system trades in. Choices that don't lead to such pages are fake agency, and the runtime exists precisely to make agency structural rather than aspirational.
