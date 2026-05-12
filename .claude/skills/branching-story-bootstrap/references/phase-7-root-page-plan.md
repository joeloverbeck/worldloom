# Phase 7: Root Page Plan Authoring

Reference for `branching-story-bootstrap` Phase 7 — the LLM plan-authoring phase that populates the canonical comprehensive plan template (`.claude/skills/_shared-templates/page-plan.md`) for PG-0001 as a scene-setter, runs the deterministic post-LLM plan-completeness check, and emits the page-cycle-compatible PG-0001 + BR-0001 + SE-0001 records into the working buffer for Phase 11's staged commit. The rendered prose is produced externally (manual author or external LLM renderer) after bundle commit and merged back via `branching-story-page-prose-finalize`.

---

## Scene-setter mode for PG-0001

PG-0001 is planned without an SLT selection. There is no "PG-0001 storylet" to score and select, because no scene-commitment arc closes at the root page. The user picks the first commitment from PG-0001's menu, and the first true arc render happens at PG-0002 through `branching-story-page-cycle`.

Phase 7 instead builds an entry pressure framing from:

- STORY_KERNEL `central_dramatic_question` when present.
- Phase 5 initial obligations and threads.
- Phase 4 `mysteries_in_play[]` and invariant constraints.
- Phase 6 seed-pool eligibility, summarized by available `arc_contract.commitment_class` values, not by selecting one seed.

The plan's frontmatter carries `selected_arc_id: null` and `chosen_variant_id: null`; in the plan body, §15 (Selected scene-commitment arc) is omitted entirely and **§15-alt Entry pressure framing replaces both §15 and §16**. §16 (Chosen variant) is likewise omitted at the root case.

The scene-setter plan must establish the opening pressure and expose 4-6 plausible commitment-class next moves for Phase 8. It must not plan an arc resolution, an arc effect variant application, or an ARC_TRACE emission.

---

## Plan authoring — populate the canonical template

Phase 7's deliverable is a populated copy of the canonical plan template at `.claude/skills/_shared-templates/page-plan.md`, written into the working buffer (NOT to disk yet — disk write happens at Phase 11 step 4 to `pages-prose-plans/PG-0001.md`). The plan IS the prompt: the external prose renderer reads §1-§19 of the body verbatim. Verbosity is a feature, not a defect — when in doubt, inline more rather than less.

### LLM prompt assembly for plan authoring

Order matters; content_policy is FIRST so it binds the model before any other instruction. The instruction is to **populate the plan template body**, not to generate prose:

```
[content_policy block — verbatim from templates/content-policy.txt]
[world context — WORLD_KERNEL summary + relevant CFs (full record bodies) +
                 ONTOLOGY entries for the canon snapshot needed for §5/§6]
[story kernel — premise + designing_principle + tone + content_intensity
               + POV + central dramatic question]
[PROSE CRAFT CONTRACT — verbatim from
                        .claude/skills/branching-story-page-cycle/references/prose-craft-contract.md]
[cast bound — for each STENT, CHAR dossier projections (frontmatter +
              Material Reality + Goals and Pressures + Capabilities +
              Voice and Perception, when world_character_id set) + STENT
              record + current STINT + relevant SREL records]
[state context — initial SFs (with epistemic_class), open OBLs, active THRs,
                 STLOC + STOBJ in scope, cast_present, accessible_locations]
[entry pressure framing — central dramatic question; Phase 5 initial obligations
                          and threads; Phase 4 mysteries_in_play; Phase 6
                          seed-pool commitment_class affordances summarized
                          (no SLT selected)]
INSTRUCTION:
Populate the canonical plan template at .claude/skills/_shared-templates/page-plan.md
for PG-0001. Do NOT render prose. Do NOT produce narrative fiction. The
deliverable is the populated comprehensive plan document — a hybrid YAML
frontmatter + markdown body file that the external prose renderer will later
read in its entirety to produce pages-prose/PG-0001.md.

Frontmatter shape (root case):
The frontmatter required keys and their shapes are documented at
.claude/skills/_shared-templates/page-plan.md (frontmatter block). At the
bootstrap PG-0001 root case, populate the frontmatter exactly as the
canonical template specifies, with these root-case-specific values:
- selected_arc_id: null
- chosen_variant_id: null
- required_effects: []
- parent_page_id: null
- branch_id: BR-0001
- branch_path: [PG-0001]
- state_hash_at_plan_time: bootstrap-pg0001-state-<story-slug>-v1
- forbidden_resolutions[]: <every M-NNNN in mysteries_in_play[] whose
  future_resolution_safety == forbidden>
- deferred_validation_trace: all three keys (prose_ledger_consistency,
  arc_trace_evidence_alignment, prose_critic_8_axis) set to
  "DEFERRED — awaiting prose render"

Body shape (root case):
The body sections §1 through §19 are documented at
.claude/skills/_shared-templates/page-plan.md (markdown body). At the
bootstrap PG-0001 root case, populate every section per the canonical
template, with the following root-case deviations:
- §12 Pending consequences: at PG-0001 root the consequences ledger is
  freshly initialized; populate with "(no pending consequences; bootstrap
  genesis state)" unless premise establishes a pre-PG-0001 CNSQ.
- §14 Recent prose continuity: at PG-0001 root there is no parent prose;
  populate with "(no prior prose; this is the root page)".
- §15 Selected scene-commitment arc: OMITTED at PG-0001 root.
- §15-alt Entry pressure framing: PRESENT at PG-0001 root, replacing both
  §15 and §16. Inline STORY_KERNEL.central_dramatic_question + Phase 5
  initial obligations + Phase 5 initial threads + Phase 4 mysteries_in_play
  + summary of seed-pool's available commitment_class[] affordances
  (without selecting one SLT).
- §7 Mysteries in play: use the canonical template's engaged-mystery filter.
  Inline only mysteries semantically engaged by this root page's cast, opening
  pressure, obligations, threads, or accidental-resolution risk. Mysteries
  declared in Phase 4 `mysteries_in_play[]` for kernel completeness but not
  engaged by this page remain in frontmatter when forbidden, not in the §7 body.
- §18 Scene direction / DO NOT REVEAL: carry the posture cues from §7's
  engaged-only mystery set; do not re-list the complete
  frontmatter.forbidden_resolutions[] array in the body.
- §16 Chosen variant: OMITTED at PG-0001 root.
- §17 Governor nudge: at PG-0001 root, populate with "bootstrap root; no
  prior-page governor".

Every record id referenced in any plan section MUST be inlined verbatim in
that section, per the canonical template's "Authoring rule" comment. Bare
CF-NNNN / CHAR-NNNN / OBL-NNNN / etc. references are plan-completeness
failures (Phase 9 gate 19) and plan_self_containment failures (Phase 9.5
check 11).
```

LLM produces the populated plan body. Engine writes the populated plan to a working buffer (NOT to disk yet — disk write happens at Phase 11's staged commit: the engine YAML transaction writes `_source/<class>/*.yaml` records, and sequenced markdown writes handle `STORY_KERNEL.md`, `pages-prose-plans/PG-0001.md`, and per-bundle `INDEX.md`). **The 8-axis prose critic does not run at this phase** — there is no rendered prose to critique at plan-commit. The critic moves to `branching-story-page-prose-finalize` Phase 3, where it runs against the user-supplied rendered prose at `pages-prose/PG-0001.md`.

---

## Plan-completeness post-LLM check (deterministic)

Phase 7's post-LLM check is structural, not stylistic:

- Every required plan section (§1-§14, §15-alt, §17-§19 at the root case; §15 and §16 explicitly omitted) is populated with non-placeholder text.
- Every inlined record id (CF-NNNN, CHAR-NNNN, SF-NNNN, OBL-NNNN, THR-NNNN, SREL-NNNN, STINT-NNNN, STLOC-NNNN, STOBJ-NNNN, M-NNNN, INV-id) resolves against the current world index or story-bundle working buffer.
- Frontmatter required keys are present and well-formed (`plan_id`, `story_id`, `world_slug`, `story_slug`, `parent_page_id`, `branch_id`, `branch_path`, `state_hash_at_plan_time`, `canon_revision_at_plan_time`, `prose_status`, `plan_authored_at`, `plan_authored_by`, `selected_arc_id`, `chosen_variant_id`, `required_effects`, `declared_visible_affordances`, `declared_intended_beats`, `declared_stop_condition`, `forbidden_resolutions`, `forbidden_engine_vocabulary`, `deferred_validation_trace`).
- `selected_arc_id: null`, `chosen_variant_id: null`, `required_effects: []` (root-case shape).
- `forbidden_resolutions[]` carries every M-NNNN in `mysteries_in_play[]` whose `future_resolution_safety == forbidden`.
- §7 body follows the engaged-mystery filter from the canonical template:
  missing an engaged mystery is a re-prompt; including a non-engaged forbidden
  mystery is a re-prompt to remove the body entry while preserving the
  frontmatter `forbidden_resolutions[]` list.
- `deferred_validation_trace` has all three required keys (`prose_ledger_consistency`, `arc_trace_evidence_alignment`, `prose_critic_8_axis`) set to DEFERRED strings.
- `cast_material_reality_consistency` scans each `frontmatter.declared_visible_affordances[]` entry mapped to a `STENT-NNNN` cast member and each §8 cast-block "Current intentions" paragraph for that same STENT. It uses the closed vocabulary at `.claude/skills/_shared-templates/clothing-consistency-vocabulary.md`; detected garment-kind tokens must be grounded in the cast member's projected `body.Material Reality` clothing / possessions summary, and detected posture tokens must not contradict the projected physical condition. FAIL re-prompts Phase 7 with the offending affordance or intention prose, the matched token, and the exact Material Reality summary inlined as correction context.

Any missing/malformed section or cast Material Reality contradiction fails the post-LLM check and re-prompts Phase 7. Up to 3 re-prompts share the existing Phase 7 budget; if exhausted, escalate to the user with the unmapped failures inlined.

---

## Emit PG-0001 record

Page-cycle-compatible schema; `branching-story-page-cycle` §Record Schemas §Page Record is the runtime authority.

- **Identity / branch wiring**: `id: PG-0001`, `story_id`, `branch_id: BR-0001`, `parent_page_id: null`, `branch_path: [PG-0001]`, `chosen_choice_id: null`, `write_in_used: false`, `write_in_routing: null`.
- **Genesis event linkage**: `storylet_realized: null`, `applied_event_ops: [SE-0001]`.
- **State hash**: `state_hash: bootstrap-pg0001-state-<story-slug>-v1` (deterministic placeholder convention; the page-cycle's normal state_hash discipline begins at PG-0002), `parent_state_hash: null`.
- **Terminality**: `branch_terminal: false`, `terminal_reason: null`.
- **Prose plan path (always)**: `prose_plan_path: pages-prose-plans/PG-0001.md`.
- **Prose path (deferred to finalize)**: `prose_path: null`.
- **Prose status (transitional state)**: `prose_status: pending` (default at bundle commit; flips to `rendered` after `branching-story-page-prose-finalize` runs).
- **state_snapshot**: `canon_revision`, `objective_facts`, `apparent_facts`, `disputed_facts`, `reader_known_facts`, `belief_state_by_actor`, `rumor_state`, `obligations_open`, `obligations_paid_off: []`, `obligations_complicated: []`, `obligations_abandoned: []`, `consequences_pending`, `consequences_addressed: []`, `threads_active`, `relationships_current`, `intentions_current`, `cast_present`, `current_location`, `accessible_locations`, `objects_in_scope`, `inventory_by_entity`, `entity_status`, `applied_effect_variant: null`, `narrative_point_classification: NATURAL_COMMITMENT_HINGE`, `arc_trace_id: null`, `arc_trace_emitted: false`.
- **narrative_health**: `open_obligation_count`, `high_salience_unpaid_count`, `average_obligation_age: 0`, `contradiction_risk: 0.0`, `causal_connectivity: 1.0`, `character_motivation_coverage`, `unresolved_threat_pressure`, `recent_consequence_density: 0.0`, `recent_reflection_density: 0.0`, `novelty: 1.0`, `tension`, `agency_score: 1.0`.
- **Governor / content / trace / timestamps**: `governor_nudge_applied: "bootstrap root; no prior-page governor"`, `content_intensity`, `validation_trace` (19 PG-record keys total — 12 non-scene-commitment plus 5 scene-commitment validator keys plus `plan_completeness_check` and `cast_material_reality_consistency`; see §Phase 9 dual-validation-trace mapping below), `deferred_validation_trace` (three keys, all DEFERRED at bundle commit; PASS/FAIL after finalize runs), `created_at`.

---

## Phase 9 dual-validation-trace mapping

Phase 9's 20 gates record on `STORY_KERNEL.md.frontmatter.validation_trace` (bootstrap-time record). PG-0001's `validation_trace` uses the page-cycle's PG-record keys so PG-0001 conforms to runtime-page schema for `branching-story-page-cycle` consumption. PG-0001's `deferred_validation_trace` carries the three deferred-gate strings, both at bundle commit (DEFERRED) and after finalize (PASS/FAIL).

**Direct overlap (8 mappings, covering 9 PG-record keys; gate 12 jointly maps to recursive_reference_closure + state_snapshot_integrity)**:
- `mystery_firewall` ↔ gate 1
- `invariant_compatibility` ↔ gate 2
- `content_policy_presence` ↔ gate 3
- `id_uniqueness` ↔ gate 4
- `epistemic_class_declared` ↔ gate 8
- `prose_ledger_consistency` ↔ gate 10 — **DEFERRED at bundle commit; PASS/FAIL after finalize**
- `choice_consequence_capacity` ↔ gate 11
- `recursive_reference_closure` + `state_snapshot_integrity` together ↔ gate 12. `state_snapshot_integrity` records the field-population subset (`current_location`, `entity_status`, `relationships_current`, epistemic-faceted fact lists); `recursive_reference_closure` records the broader PG-0001 graph closure rooted at the page record itself (`state_snapshot`, `storylet_realized`, `applied_event_ops`, `emitted_choices`, and each emitted CHC's effect graph).

**Page-cycle-only keys (3)** record PASS by-construction at bootstrap:
- `snapshot_replay_equality` (e.g., `"PASS — bootstrap genesis state has no replay precedent; PG-0002 will be the first replay-checked transition"`)
- `choice_contract_integrity`
- `consequence_persistence`

**Bootstrap-only Phase 9 gates (4)** live only in STORY_KERNEL.md frontmatter (no runtime-page-cycle analogue):
- `branch_path_consistency`
- `cast_intention_coverage`
- `obligation_salience`
- `storylet_diversity`

**PG-0001 scene-commitment validator gates (5)** record PASS with PG-0001 root-case rationales:
- `arc_envelope_conformance`: PASS — PG-0001 root special case, no arc selected.
- `effect_model_replay_safety`: PASS — PG-0001 root special case, `applied_effect_variant: null`.
- `arc_trace_evidence_alignment`: PASS — PG-0001 root special case, no ARC_TRACE planned or emitted; **DEFERRED at runtime non-root pages where an arc is selected**.
- `narrative_point_classification`: PASS — PG-0001 defaults to `NATURAL_COMMITMENT_HINGE`.
- `choice_worthiness_completeness`: PASS — every emitted PG-0001 CHC passes Phase 8 choice-worthiness validation.

**New plan-time gates (2)**:
- `plan_completeness_check`: PASS — every required plan section populated; every inlined record id resolves; frontmatter fields well-formed.
- `cast_material_reality_consistency`: PASS — no garment-kind tokens detected in declared affordances / §8 intentions, or every detected token is grounded in the mapped cast member's projected Material Reality; posture tokens do not contradict projected condition.

---

## Emit BR-0001 record

`id: BR-0001`, `root_page_id: PG-0001`, `current_leaf_page_id: PG-0001`, `forked_from_*: null`, `branch_path: [PG-0001]`, `status: active`, `canon_revision`, `created_at_page: PG-0001`, `notes: "Root branch."`.

---

## Emit SE-0001 bootstrap event

Page-cycle-compatible schema in `templates/story-records.yaml`; `branching-story-page-cycle` §Record Schemas §Story Event Record is the runtime authority.

`id: SE-0001`, `story_id`, `branch_id: BR-0001`, `created_at_page: PG-0001`, `source.parent_page_id: null`, `source.chosen_choice_id: null`, `source.write_in_text_hash: null`, `source.storylet_realized: null`, `actor: system`, `action: bootstrap`, `target: null`, `instrument: null`, `preconditions_checked: []`, `ops: []`, `state_hash_before: null`, `state_hash_after: <PG-0001.state_hash>` (the same `bootstrap-pg0001-state-<story-slug>-v1` placeholder per the PG-0001 emit step above), `notes: "Genesis event for STORY-NNNN — bootstrap scene-setter emission, no preceding state and no realized arc; rendered prose deferred to branching-story-page-prose-finalize."`.

---

## Cross-references

- Canonical plan template (`.claude/skills/_shared-templates/page-plan.md`) — single source of truth for §1-§19 body and frontmatter shape; this reference describes the bootstrap PG-0001 root-case delta only.
- Declared-affordance validator (Phase 7.5): `references/phase-7-5-visible-affordance-extraction.md`
- Phase 9 gate table (including DEFERRED rows, `plan_completeness_check`, and `cast_material_reality_consistency`): `references/phase-9-validation-gates.md`
- Phase 9.5 discipline checks (including new `plan_self_containment`): `references/phase-9-5-bootstrap-discipline-validator.md`
- Convergence point — rendered prose validators + ARC_TRACE extraction + PG.prose_status flip: `.claude/skills/branching-story-page-prose-finalize/SKILL.md`
- Render-time instruction block (inlined verbatim into plan §19): `reports/prose-quality-instructions.md` §"Render-Time Instruction Template"
