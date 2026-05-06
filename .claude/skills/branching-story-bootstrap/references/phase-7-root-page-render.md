# Phase 7: Root Page Render

Reference for `branching-story-bootstrap` Phase 7 — the LLM prose-production phase that selects the genesis storylet, renders PG-0001's opening prose against the Prose Craft Contract, runs the deterministic post-LLM cross-check, and emits the page-cycle-compatible PG-0001 + BR-0001 + SE-0001 records into the working buffer for Phase 11's atomic write.

---

## Storylet selection for PG-0001

Score each seed SLT on:

- `salience(entry_pressure_signal)` — favor `shape: entry_pressure`.
- `premise_alignment` — match between SLT's `tone_tags`/themes and STORY_KERNEL declarations.
- `cast_present` — must include the protagonist; ideally one or two more bound cast.

**Hard filters**:

- SLT's `mystery_safety.forbidden_M_resolved` must be `false`.
- SLT must NOT carry `M_resolution_claims` with `resolution_authority: canon_candidate` (bootstrap doesn't promote).

---

## LLM prompt assembly

The order matters; content_policy is FIRST so it binds the model before any other instruction:

```
[content_policy block — verbatim from templates/content-policy.txt]
[world context — WORLD_KERNEL summary + relevant CFs + ONTOLOGY entries]
[story kernel — premise + designing_principle + tone + content_intensity
               + POV + central dramatic question]
[PROSE CRAFT CONTRACT — verbatim from
                        .claude/skills/branching-story-page-cycle/references/prose-craft-contract.md]
[selected storylet — hard_preconds, fact_effects, opens_obligations,
                     choice_templates, tone_tags]
[cast bound — for each STENT, name + role + STINT summary]
[state context — facts visible to POV at story start, open obligations]
INSTRUCTION:
Render the opening page. Length follows content: the page is as long as the
selected storylet's beat, the cast's reactions, and the natural
end-where-choices-emerge require — no padding, no truncation. There is no
target word count. Stop when the beat is complete and the next decision point
is naturally available; do not add filler to extend the page, do not truncate
to keep it short. (Prose Craft Contract Rule 11.)

Render through what happens — what characters do, say, perceive, and attend
to. Avoid narrating meaning, summarizing reactions, labeling subtext, or
naming the significance of the moment. Action, dialogue, interiority, and
sensory anchor are modalities available to the page; the storylet's beat and
the scene's natural shape decide which appear and in what mix. A page that is
mostly one modality is legitimate when the beat calls for it; do not deploy
all four modalities for completeness. (Prose Craft Contract Rule 7.)

Respect content_intensity_baseline. Do not invent facts beyond state context.
Do not resolve any mystery declared in mysteries_in_play[].

End at a moment where 4-6 distinct choices for what happens next would be
natural. If the selected storylet's beat completes before such a moment is
naturally available, this is a storylet-shape problem to surface — flag it
rather than padding the prose to reach an artificial choice point.

Honor the PROSE CRAFT CONTRACT above. The post-render prose critic will flag
filter-word saturation, recurring-metaphor recurrence (against any prior pages
once the runtime page-cycle takes over), identical-anchor reuse, self-
narrating-self patterns, ledger-jargon leakage, bracket-paraphrasing, and
padding-or-truncation.
```

LLM produces the prose. Engine writes to a working buffer (NOT to disk yet — disk write happens at Phase 11's staged commit: the engine YAML transaction writes `_source/<class>/*.yaml` records, and sequenced markdown writes handle `STORY_KERNEL.md`, `pages-prose/PG-0001.md`, and `INDEX.md`).

---

## Cross-check (deterministic, post-LLM)

- Does the prose stage any entity as physically present, acting, speaking, being perceived directly, or available for immediate interaction unless in `cast_present`? → re-prompt with explicit constraint. Mere mention, memory, rumor, inscription, or offstage reference is allowed if grounded in `reader_known_facts`, `belief_state_by_actor`, DA content, or POV-accessible state.
- Does the prose imply any fact not in state context? → flag for review.
- Does the prose resolve any M-NNNN in `mysteries_in_play[]`? → hard reject, re-prompt.

Up to 3 re-prompts before escalating to user with the constraint failures inlined in the message.

---

## Emit PG-0001 record

Page-cycle-compatible schema; `branching-story-page-cycle` §Record Schemas §Page Record is the runtime authority.

- **Identity / branch wiring**: `id: PG-0001`, `story_id`, `branch_id: BR-0001`, `parent_page_id: null`, `branch_path: [PG-0001]`, `chosen_choice_id: null`, `write_in_used: false`, `write_in_routing: null`.
- **Genesis event linkage**: `storylet_realized`, `applied_event_ops: [SE-0001]`.
- **State hash**: `state_hash: bootstrap-pg0001-state-<story-slug>-v1` (deterministic placeholder convention; the page-cycle's normal state_hash discipline begins at PG-0002), `parent_state_hash: null`.
- **Terminality**: `branch_terminal: false`, `terminal_reason: null`.
- **Prose path**: `prose_path: pages-prose/PG-0001.md`.
- **state_snapshot**: `canon_revision`, `objective_facts`, `apparent_facts`, `disputed_facts`, `reader_known_facts`, `belief_state_by_actor`, `rumor_state`, `obligations_open`, `obligations_paid_off: []`, `obligations_complicated: []`, `obligations_abandoned: []`, `consequences_pending`, `consequences_addressed: []`, `threads_active`, `relationships_current`, `intentions_current`, `cast_present`, `current_location`, `accessible_locations`, `objects_in_scope`, `inventory_by_entity`, `entity_status`.
- **narrative_health**: `open_obligation_count`, `high_salience_unpaid_count`, `average_obligation_age: 0`, `contradiction_risk: 0.0`, `causal_connectivity: 1.0`, `character_motivation_coverage`, `unresolved_threat_pressure`, `recent_consequence_density: 0.0`, `recent_reflection_density: 0.0`, `novelty: 1.0`, `tension`, `agency_score: 1.0`.
- **Governor / content / trace / timestamps**: `governor_nudge_applied: "bootstrap root; no prior-page governor"`, `content_intensity`, `validation_trace` (the page-cycle's 12 PG-record keys — see §Phase 9 dual-validation-trace mapping below), `created_at`.

---

## Phase 9 dual-validation-trace mapping

Phase 9's 12 gates record on `STORY_KERNEL.md.frontmatter.validation_trace` (bootstrap-time record). PG-0001's `validation_trace` uses the page-cycle's 12 PG-record keys so PG-0001 conforms to runtime-page schema for `branching-story-page-cycle` consumption.

**Direct overlap (8 keys)**:
- `mystery_firewall` ↔ gate 1
- `invariant_compatibility` ↔ gate 2
- `content_policy_presence` ↔ gate 3
- `id_uniqueness` ↔ gate 4
- `epistemic_class_declared` ↔ gate 8
- `prose_ledger_consistency` ↔ gate 10
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

---

## Emit BR-0001 record

`id: BR-0001`, `root_page_id: PG-0001`, `current_leaf_page_id: PG-0001`, `forked_from_*: null`, `branch_path: [PG-0001]`, `status: active`, `canon_revision`, `created_at_page: PG-0001`, `notes: "Root branch."`.

---

## Emit SE-0001 bootstrap event

Page-cycle-compatible schema in `templates/story-records.yaml`; `branching-story-page-cycle` §Record Schemas §Story Event Record is the runtime authority.

`id: SE-0001`, `story_id`, `branch_id: BR-0001`, `created_at_page: PG-0001`, `source.parent_page_id: null`, `source.chosen_choice_id: null`, `source.write_in_text_hash: null`, `source.storylet_realized: <selected SLT id>`, `actor: system`, `action: bootstrap`, `target: null`, `instrument: null`, `preconditions_checked: []`, `ops: []`, `state_hash_before: null`, `state_hash_after: <PG-0001.state_hash>` (the same `bootstrap-pg0001-state-<story-slug>-v1` placeholder per the PG-0001 emit step above), `notes: "Genesis event for STORY-NNN — bootstrap emission, no preceding state."`.
