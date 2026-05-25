# Triage — `reports/slt-chc-overhaul-fourth-iteration.md`

**Date:** 2026-05-25
**Source report:** [`reports/slt-chc-overhaul-fourth-iteration.md`](../../reports/slt-chc-overhaul-fourth-iteration.md) (1372 lines; ChatGPT-Pro's fourth-iteration final-hardening proposal after iter-1 / iter-2 / iter-3 landed SPEC-76 through SPEC-85). The user signaled this is intended to be the **final iteration** ("the architecture seems quite mature now").
**Prior iterations:**
- [`docs/triage/2026-05-23-slt-chc-overhaul-first-iteration-triage.md`](2026-05-23-slt-chc-overhaul-first-iteration-triage.md); iter-1 deliverables [`archive/specs/SPEC-76-turn-driver-primitive-and-pressure-driven-turn-cycle.md`](../../archive/specs/SPEC-76-turn-driver-primitive-and-pressure-driven-turn-cycle.md), [`archive/specs/SPEC-77-slt-grounding-provenance-minimal.md`](../../archive/specs/SPEC-77-slt-grounding-provenance-minimal.md), [`archive/specs/SPEC-78-foundations-amendment-driver-primitive-principle-extensions.md`](../../archive/specs/SPEC-78-foundations-amendment-driver-primitive-principle-extensions.md).
- [`docs/triage/2026-05-24-slt-chc-overhaul-second-iteration-triage.md`](2026-05-24-slt-chc-overhaul-second-iteration-triage.md); iter-2 deliverables [`archive/specs/SPEC-79-chc-associated-commitment-block-removal.md`](../../archive/specs/SPEC-79-chc-associated-commitment-block-removal.md), [`archive/specs/SPEC-80-storylet-pool-driver-kind-pressure-source-coverage.md`](../../archive/specs/SPEC-80-storylet-pool-driver-kind-pressure-source-coverage.md), [`archive/specs/SPEC-81-indexed-storylet-candidate-retrieval.md`](../../archive/specs/SPEC-81-indexed-storylet-candidate-retrieval.md), [`archive/specs/SPEC-82-remaining-schema-drift-repairs.md`](../../archive/specs/SPEC-82-remaining-schema-drift-repairs.md).
- [`docs/triage/2026-05-25-slt-chc-overhaul-third-iteration-triage.md`](2026-05-25-slt-chc-overhaul-third-iteration-triage.md); iter-3 deliverables [`archive/specs/SPEC-83-slt-cooldown-window-correctness.md`](../../archive/specs/SPEC-83-slt-cooldown-window-correctness.md), [`archive/specs/SPEC-84-replay-and-branch-scope-fixtures.md`](../../archive/specs/SPEC-84-replay-and-branch-scope-fixtures.md), [`archive/specs/SPEC-85-non-player-driver-golden-fixtures.md`](../../archive/specs/SPEC-85-non-player-driver-golden-fixtures.md).
**Trigger:** User-supplied request: *"Please analyze reports/slt-chc-overhaul-fourth-iteration.md . It's the fourth iteration of this process, that ChatGPT-Pro has produced. I intended for this to be the last one, given that the architecture seems quite mature now. Please be critical of ChatGPT-Pro's proposals: reassess them for correctness and benefit. If changes aligned with docs/FOUNDATIONS.md are warranted, create specs in specs/* . IF more than one spec is warranted, create specs/IMPLEMENTATION-ORDER.md"*
**Deliverables produced:**
- [`archive/specs/SPEC-86-character-fit-selection-contract.md`](../../archive/specs/SPEC-86-character-fit-selection-contract.md)

## Triage summary

ChatGPT-Pro's iter-4 report is **substantially correct in its executive verdict** (§1, §3, §8): the landed architecture is mature, the durable / current-state split is right, late-bound CHC is right, projection-based filtering is right, no persistent SSEL / direct CHC→SLT binding / drama manager / rich free-form persona predicates. The §20 Non-goals list (13 items) re-affirms iter-2 §Out-of-Scope rejections, which is good signal.

The report's **6 proposed SPECs (A through F) + 5 skill-prose changes + 5 warning validators + 7 fixture types + 6 MCP projection columns + signature input + trace response** are, however, **substantially over-scoped for what is empirically warranted at iter-4**. Critical reassessment finds:

- **SPEC-A (Character-Fit Selection Contract)** is the only proposal that passes the warranted test. The contract section is verifiably absent from `.claude/skills/_shared-templates/story-state-contract.md` today; codifying it is a pure documentation move that captures the architectural understanding the team has converged on across 4 iterations. Lands as **SPEC-86**.
- **SPEC-B (6 derived projection columns + `specificity_signature` input + `specificity_trace` response)** mostly duplicates existing edges. Verification confirmed 5 of 6 projection columns are accessible via single edge join today; the 6th is reachable via existing predicate-ref edges. The `intent_signature` input field already exists with overlapping shape. The `specificity_trace` response is consumer-circular without SPEC-C validators. Fails FOUNDATIONS §5b load-bearing test. **Defers.**
- **SPEC-C (5 warning validators)** silently re-proposes iter-3 SPEC-88 under different framing; iter-3 lift-condition (real playtest pattern existing validators miss) remains unmet; two of five partially overlap existing validators. **Defers.**
- **SPEC-D (6 fixture types)** has 3 of 7 already covered (SPEC-81 / 84 / 85), 1 already enforced (`stchar-temporal-reference-boundary`), and 2 consumer-dependent on SPEC-C. **Defers.**
- **SPEC-E (Health-audit character-specificity mode)** is fully consumer-dependent on SPEC-B / C; existing structural Phase 2m already covers actionable STCHAR authority health. **Defers.**
- **SPEC-F (structured `SE.commitment.selection_rationale` field)** is correctly deferred by iter-4 itself; aligned with FOUNDATIONS §5b. **Confirms-existing-position.**

The user pre-authorized spec creation contingent on the verdict. Pre-authorization activated when the triage recommendation was presented in chat; the single SPEC-86 + this triage file were written in the same turn per the `brainstorm` skill's §Non-plan-mode fast-track for template-structured deliverables (triage-brainstorm extension). No material-deliverable-shape fork (per Guardrails §User pre-authorization patterns triggers (a)–(d)) fired: the deliverable shape (1 spec + companion triage file, no `IMPLEMENTATION-ORDER.md`) matched the user's explicit contingent instruction ("IF more than one spec is warranted, create specs/IMPLEMENTATION-ORDER.md" — single spec, no order file needed).

## Verification ground truth

Iter-4 makes ~40 codebase claims. The verification pass below condenses the load-bearing subset; file:line citations are reproducible against repo HEAD (commit lineage parallel to the iter-3 SPA at SHA `1108c9a`, with iter-3 deliverables landed since).

### Schema-existence claim — Character-Fit Selection Contract section absent (load-bearing for SPEC-86)

- **Report claim** (§9 implied throughout, §10 STCHAR / commitment-block / turn-cycle / bootstrap / health-audit prose additions): The shared story-state contract should carry a Character-Fit Selection Contract section that codifies the four-layer mediation model.
- **Verification**: VERIFIED ABSENT. `.claude/skills/_shared-templates/story-state-contract.md` section list at HEAD: §1 Authority Model, §2 Schema-Minimalism Doctrine, §3 Record Class Inventory, §4 Record Schemas, §5 Closed Predicate DSL (with §5a Mid-Story Introduction), §6 Action Routing, §7 Nine Shared Hard Gates, §8 Page Plan Minimum Contract (with §7a, §9b, §9c, §16a sub-numbered sections), §9 Branching and Rewind, §10 Shared Write Order, §11 Mystery and Canon Authority, §12 How Skills Use This Contract. **No Character-Fit Selection Contract section.** → SPEC-86 inserts §11a between §11 and §12.

### Schema-existence claim — STCHAR body enforces 13 operational sections (referenced for SPEC-86 §1)

- **Report claim** (§3 "STCHAR authority model"): The `stchar-body-integrity` validator requires thirteen operational sections.
- **Verification**: VERIFIED. `tools/validators/src/structural/stchar-body-integrity.ts:15-38` hardcodes 13 sections: Story-Facing Identity, Source Distillation, Stable Persona Core, Emotional Appraisal Map, Pressure Behavior, Voice Bible / Dialogue Authority, Page-Plan Voice Block, Perception and Embodiment, Agency and Planning Tendencies, Relationship-Specific Behavior, Story-State Derivation Guide, Prose Rendering Constraints, Validation / Audit Anchors. Iter-4's STCHAR architecture map is accurate.

### Predicate-DSL claim — current state existential predicates exist (load-bearing for SPEC-86 §4.1 §11a global-pool discipline)

- **Report claim** (§3 SLT model, §8 "How STCHAR should influence SLT and CHC"): The predicate DSL already supports `any_plan_active`, `any_emotion_active`, `any_relationship_axis`, `any_belief`, `affordance_available_to`, `record_active`.
- **Verification**: VERIFIED. `tools/validators/src/schemas/story-storylet.schema.json:340-387` confirms all six predicates present (`any_plan_active` line 360, `any_emotion_active` line 362, `any_relationship_axis` line 325, `any_belief` line 371, `affordance_available_to` line 380, `record_active` line 375). SPEC-86 §4.1's global-vs-branch-scoped predicate discipline rests on this verified surface.

### Schema claim — CHC.grounded_in.records[] accepts 18 record types (load-bearing for SPEC-86 §4.1)

- **Report claim** (§3 CHC model): `grounded_in.records` can cite STCHAR, STPLAN, STEMO, BEL, SREL, STSTAT, CLK, STSEC, STQ, SF, DA, and other active story-state records.
- **Verification**: VERIFIED. `tools/validators/src/schemas/story-choice.schema.json:62` pattern lists 18 record types: STENT, STCHAR, STSTAT, STLOC, STOBJ, BEL, OBL, CNSQ, THR, SREL, DA, STPLAN, STEMO, CLK, STSEC, STQ, STINT, SF. SPEC-86 §4.1 CHC-grounding-discipline-paragraph names the operational subset.

### MCP-input-shape claim — `intent_signature` already accepts overlapping fields (load-bearing for SPEC-B DEFER)

- **Report claim** (§9.6 MCP input): Add `specificity_signature` with `actor_stent_ids` / `active_stchar_ids` / `driver_record_ids` / `grounding_record_ids` / `pressure_record_classes` / `preferred_action_families` / `response_mode`.
- **Verification**: PARTIALLY REDUNDANT. `tools/world-mcp/src/tools/select-storylet-candidates.ts:32-36` shows existing `intent_signature` input field with `action_families[]` / `grounding_record_classes[]` / `grounding_record_ids[]`. Three of the proposed `specificity_signature` fields (`grounding_record_ids`, `preferred_action_families`, `pressure_record_classes`) overlap directly with the existing field's shape; `actor_stent_ids` and `active_stchar_ids` are derivable from the parent PG's `active_records` (which the MCP already loads at lines 237-280); `driver_record_ids` is `SE.turn_driver.driver_records[]` (already in the request as `turn_driver.driver_records`); `response_mode` is `SE.turn_driver.player_response_mode`. **No genuinely new input data; only repackaging.** → SPEC-B DEFER §3.

### MCP-response-shape claim — `filter_trace` already exists with per-stage counts (load-bearing for SPEC-B DEFER)

- **Report claim** (§9.6): Add `specificity_trace` response field with per-candidate explainability.
- **Verification**: PARTIALLY DUPLICATIVE OF EXISTING SURFACE. `tools/world-mcp/src/tools/select-storylet-candidates.ts:41-52` shows existing `filter_trace` with per-stage counts (`pool_total`, `after_scope`, `after_driver_kind`, `after_action_family`, `after_predicate_shape`, `after_predicate_class`, `after_source_record_id`, `after_mystery_policy`, `after_cooldown`) plus `cooldown_active_samples` per-candidate rejection samples (SPEC-83 addition). The pattern of per-candidate rejection samples is **already established and extensible** — adding `specificity_trace` is consistent with the pattern but requires a consumer to be load-bearing. **No consumer beyond the deferred SPEC-C validators today.** → SPEC-B DEFER §3.

### Index-shape claim — 5 of 6 iter-4 proposed projection columns are edge-derivable today (load-bearing for SPEC-B DEFER)

- **Report claim** (§9.6, §11): Add 6 denormalized projection arrays: `slt_projection_predicate_classes_json`, `slt_projection_predicate_refs_json`, `slt_projection_action_families_json`, `slt_projection_compatible_turn_drivers_json`, `slt_projection_current_state_classes_json`, `slt_projection_stchar_refs_json`.
- **Verification**: 5 OF 6 ACCESSIBLE VIA SINGLE EDGE JOIN. `tools/world-index/src/parse/atomic.ts:819-867` emits edges for `storylet_compatible_driver`, `storylet_predicate_pred`, `storylet_predicate_class`, `storylet_action_family`, `storylet_predicate_ref` — each accessible via `edges WHERE source_node_id=SLT AND edge_type='<type>'` (single join). The 6th (`stchar_refs_json`) is accessible via `storylet_predicate_ref` edges since `storyRefsInString` extracts STCHAR refs from predicate body strings (`atomic.ts:1625-1635`, STORY_REF_REGEX at line 78-79 includes STCHAR). **The "denormalization for faster filtering" rationale fails the FOUNDATIONS §5b load-bearing test** — no performance failure of single edge joins has surfaced (SPEC-81 proves 1000-SLT scaling on current shape). → SPEC-B DEFER §3.

### Validator-coverage claim — `character-grounding-consistency` partially covers iter-4 SPEC-C `chc_character_specificity_warning`

- **Report claim** (§12 `chc_character_specificity_warning`): A warning validator firing when CHC says "Confront her" and grounds only in STCHAR-2 while active OBL-3 and SREL-4 are the material pressure.
- **Verification**: PARTIAL OVERLAP. `tools/validators/src/structural/character-grounding-consistency.ts:46-64, 98` detects character-specific CHCs (via keyword scan + STENT-id check in `grounded_in.records`) and fires `choice_missing_stchar` if such a CHC fails to cite an STCHAR ID. The existing validator covers the **STCHAR-citation requirement** side but does not analyze whether **additional active records that would deepen the grounding** are missing. The iter-4 proposed warning would extend coverage; the iter-3 lift-condition for adding such warnings — "real playtest pattern existing validators miss with a concrete rejection example" — is unmet. → SPEC-C DEFER §3.

### Validator-coverage claim — `turn-cycle-output-grounding-integrity.chc_response_topical_grounding_missing` partially covers iter-4 SPEC-C `non_player_response_richness_warning`

- **Report claim** (§12 `non_player_response_richness_warning`): A warning validator firing when non-player driver pages emit only generic continuation / investigation CHCs and no response CHC opposes / protects / questions / evades / reinterprets.
- **Verification**: PARTIAL OVERLAP. `tools/validators/src/structural/turn-cycle-output-grounding-integrity.ts:140-158` enforces (HARD, not WARN) that `responds`-mode CHCs cite at least one `turn_driver.driver_records[]` entry — `chc_response_topical_grounding_missing` failure code. The existing validator covers the **driver-record topical grounding** side at HARD severity. The iter-4 proposed warning would extend coverage to **stance variation richness** (oppose / protect / question / withhold / etc.), which is genuinely beyond the existing validator's scope. But stance-variation is judgment territory (per FOUNDATIONS §5c framing) and the iter-3 lift-condition (real playtest pattern) is unmet. → SPEC-C DEFER §3.

### Fixture-coverage claim — 3 of iter-4 SPEC-D's 7 fixture types already exist

- **Report claim** (§19): 7 fixture types — rich STCHAR-specific selection, generic SLT failure, generic CHC failure, non-player-driver character-specific, replay/newer-global-SLT, large synthetic pool, STCHAR boundary.
- **Verification**:
  - **Large synthetic pool**: ALREADY COVERED. `tools/world-mcp/tests/integration/spec81-storylet-candidate-retrieval.test.ts` carries the 1000-SLT synthetic proof per archived SPEC-81.
  - **Replay / newer-global-SLT**: ALREADY COVERED. `tools/world-mcp/tests/integration/spec84-replay-and-branch-scope.test.ts` carries the replay+branch-scope fixtures per archived SPEC-84.
  - **Non-player-driver character-specific**: ALREADY COVERED. Per archived SPEC-85, all four remaining driver kinds (`offstage_action`, `clock_fire`, `secret_reveal`, `multi_actor_collision`) carry end-to-end golden fixtures alongside Red Kiln Ambush's `npc_action` fixture.
  - **STCHAR boundary**: ALREADY ENFORCED. `tools/validators/src/structural/stchar-temporal-reference-boundary.ts` enforces the inverse direction (no temporal records in STCHAR body); iter-4's "selection rationale citing STCHAR for current fear" framing is the in-direction case, which is consumer-dependent on SPEC-C's `stchar_current_state_mediation_warning` (deferred).
  - **Rich STCHAR-specific selection / generic SLT failure / generic CHC failure**: consumer-dependent on SPEC-B's `specificity_trace` and SPEC-C's warning validators (both deferred). → SPEC-D DEFER §3.

### Health-audit-mode claim — STCHAR authority health already bundled into structural mode (load-bearing for SPEC-E DEFER)

- **Report claim** (§10 health-audit): Add a character-specificity audit mode covering generic SLT warnings, generic CHC warnings, STCHAR-current-state boundary warnings, non-player driver response richness warnings, large-pool projection explainability checks.
- **Verification**: PARTIAL DUPLICATION. `.claude/skills/branching-story-health-audit/SKILL.md:4` lists 5 modes (structural, compatibility, prose, remediation, cross_story). The structural mode's Phase 2m already covers "STCHAR authority health" alongside replay + snapshots + isolation + debt + belief/visibility + DA health + mystery/canon + continuation + CLK/STSEC/STQ mechanism health + STPLAN/STEMO health + active-state underuse + reactivity inertness + storylet pool coverage. **4 of 5 proposed sub-checks are consumer-dependent on SPEC-C warning validators** (which are deferred); the 5th (large-pool projection explainability) needs SPEC-B's `specificity_trace` (deferred). → SPEC-E DEFER §3 — no remaining sub-check is load-bearing today.

### FOUNDATIONS-text claim — §5b explicitly forbids non-load-bearing fields (load-bearing for SPEC-B / C / D / E DEFERs)

- **Report claim** (§1 executive verdict, §9 throughout): No JSON schema changes warranted; additive MCP / index surfaces only if they have direct consumers.
- **Verification**: VERIFIED. `docs/FOUNDATIONS.md` §Story Bundles §5b (lines 654-658): *"Every field in every story-bundle record schema must be load-bearing — directly consumed by a validation gate, a replay primitive, a predicate, a fork operation, or recorded audit-trail discipline. Nice-to-have fields are dropped, because each field costs LLM tokens to author at every record and to read at every retrieval. ... skills must not add fields to those schemas without amending the contract first."* The discipline is explicit: **no deferral mechanism; fields without consumers are not added.** SPEC-B's projection columns / signature input / trace response have no consumer that is itself landing this iteration; SPEC-C's validators have heuristic-only coverage beyond what existing validators enforce; SPEC-D's fixtures are consumer-dependent on SPEC-B/C; SPEC-E's audit mode is consumer-dependent on SPEC-B/C. → All four defer under §5b discipline.

## Verdicts

### ACCEPT — verified gap with no FOUNDATIONS tension

#### SPEC-A (Character-Fit Selection Contract) — verified gap, documentation-only

**Verdict:** accept.
**Lands in:** [`archive/specs/SPEC-86-character-fit-selection-contract.md`](../../archive/specs/SPEC-86-character-fit-selection-contract.md).
**Ground:** Verified absence of the Character-Fit Selection Contract section from `.claude/skills/_shared-templates/story-state-contract.md`. The four-layer mediation model (stable constraint → current-state derivation → eligibility/ranking → rendering/surface) and the global-vs-branch-scoped STCHAR predicate discipline are **operationally implicit** across existing validators (`stchar-temporal-reference-boundary`, `character-grounding-consistency`, `turn-cycle-output-grounding-integrity`, `slt-grounding-minimal-integrity`) and skill prose, but uncodified as a contract anchor. Codifying it as §11a + minimal skill-prose anchors in 4 skills closes the drift risk without touching schemas, MCP, validators, or fixtures. Aligns with FOUNDATIONS §Story Bundles §5a (causal-move framing reinforced), §5b (zero schema additions — explicitly load-bearing as a discipline contract), §5c (current-state centrality), §6.1 (story-local character authority), and Rule 4 at story scope (branch isolation via global-vs-branch-scoped predicate discipline).

### DEFER — consumer-thin / lift-condition unmet

#### SPEC-B — Derived specificity projection columns + signature input + trace response

**Verdict:** defer.
**Re-evaluate when:**
- (a) a real performance failure of current edge joins surfaces on a production bundle (SPEC-81's 1000-SLT synthetic proof is the current ceiling for "no problem yet"); OR
- (b) at least one non-circular consumer for `specificity_trace` lands (i.e., a validator or health-audit pass that reads the trace and is itself load-bearing, not gated on SPEC-B landing first).

**Ground:**
- **6 projection columns**: 5 of 6 accessible via single edge join today (`storylet_predicate_class`, `storylet_predicate_ref`, `storylet_action_family`, `storylet_compatible_driver` per `atomic.ts:819-864`); 6th (`stchar_refs_json`) accessible via existing `storylet_predicate_ref` edges (`atomic.ts:1625-1635`, STORY_REF_REGEX line 78-79). Denormalization rationale fails FOUNDATIONS §5b load-bearing test.
- **`specificity_signature` input**: 3 of 7 proposed sub-fields directly overlap the existing `intent_signature` input (`tools/world-mcp/src/tools/select-storylet-candidates.ts:32-36`); the other 4 are derivable from data the MCP already loads (parent PG `active_records` at lines 237-280; request's `turn_driver.driver_records` + `player_response_mode`). No new input data, only repackaging.
- **`specificity_trace` response**: per-candidate explainability is a novel surface, but consumer-circular without SPEC-C validators (which are deferred). The existing `filter_trace.cooldown_active_samples` (SPEC-83 addition) establishes the per-candidate sample pattern — `specificity_trace` would follow the same shape when consumers materialize.

#### SPEC-C — 5 warning validators

**Verdict:** defer.
**Re-evaluate when:** A real playtest surfaces a specificity-shaped pattern that the existing validators (`character-grounding-consistency`, `turn-cycle-output-grounding-integrity.chc_response_topical_grounding_missing`, `slt-grounding-minimal-integrity`, `rule_choice_set_noncollapse`, `chc-slt-selected-commitment-trace`) miss, with a concrete rejection example.

**Ground:**
- Silently re-proposes iter-3 SPEC-88's framing (heuristic warning validators) with a different label ("character-specificity" instead of "language patterns"). The underlying lift-condition (real playtest evidence) applies symmetrically; iter-3's lift remains unmet — no new playtest pressure between iter-3 (2026-05-25 morning) and iter-4 (2026-05-25 afternoon, same date).
- **`chc_character_specificity_warning`** partially overlaps existing `character-grounding-consistency` (which enforces character-specific CHCs cite STCHAR via keyword detection + STENT-id check at `character-grounding-consistency.ts:46-64, 98`). The extension would cover the case where active OBL/SREL/BEL would deepen grounding beyond the STCHAR citation — heuristic and false-positive-prone (a bare-STCHAR grounding may be the *right* answer for a stable-authority-only expressive choice; warning would mis-fire).
- **`non_player_response_richness_warning`** partially overlaps existing `turn-cycle-output-grounding-integrity.chc_response_topical_grounding_missing` (HARD; `turn-cycle-output-grounding-integrity.ts:140-158`). The extension would cover stance-variation richness — judgment territory per FOUNDATIONS §5c framing.
- **`slt_character_specificity_warning`** would scan SLT.grounding.reason_to_exist for genericness beyond `slt-grounding-minimal-integrity`'s banned-phrase list. The existing validator at `slt-grounding-minimal-integrity.ts:80-104` checks length ≥16 + banned-phrase substring; adding deeper genericness analysis is heuristic — iter-4 itself notes "validators are not literary judges."
- **`selected_slt_specificity_trace_warning`** and **`stchar_current_state_mediation_warning`** depend on SPEC-B's `specificity_trace` and on selection-rationale text that iter-4 SPEC-F itself defers — consumer-chain-dependent.

#### SPEC-D — 6 golden fixture types

**Verdict:** defer (as a package).
**Re-evaluate when:** SPEC-B and/or SPEC-C land, at which point the consumer-dependent fixtures become meaningful test surfaces.

**Ground:**
- **3 of 7 already covered**: large synthetic pool (SPEC-81), replay/newer-global-SLT (SPEC-84), non-player-driver character-specific (SPEC-85).
- **1 of 7 already enforced**: STCHAR boundary by `stchar-temporal-reference-boundary` validator (the in-direction case — selection rationale citing STCHAR for current state — depends on SPEC-C's `stchar_current_state_mediation_warning`).
- **3 of 7 consumer-dependent**: rich STCHAR-specific selection (needs SPEC-B `specificity_trace`), generic SLT failure (needs SPEC-C `slt_character_specificity_warning`), generic CHC failure (needs SPEC-C `chc_character_specificity_warning`).

#### SPEC-E — Health-audit character-specificity mode

**Verdict:** defer.
**Re-evaluate when:** SPEC-B and/or SPEC-C land, at which point the audit mode has consumer surfaces to report against.

**Ground:**
- 4 of 5 proposed sub-checks (generic SLT warnings, generic CHC warnings, STCHAR-current-state boundary warnings, non-player driver response richness warnings) are consumer-dependent on SPEC-C warning validators.
- 5th sub-check (large-pool projection explainability checks) is consumer-dependent on SPEC-B `specificity_trace`.
- Existing structural mode's Phase 2m ("STCHAR authority health") covers the actionable subset today; adding an empty audit mode without backing validators creates an authoring/maintenance burden without diagnostic output.

### REJECT — re-tread of iter-3-deferred surface (lift-condition unmet)

#### Iter-4 §10 `branching-story-prose-attach` non-player-driver hidden-mind-leak deferral re-statement

**Verdict:** reject (as new spec); confirmed-as-deferred (as iter-3 carry-forward).
**Alternative path:** Iter-4 itself acknowledges this is deferred ("Do not add new structure unless actual rendered prose failures appear"). Iter-3 triage §REJECT recorded the same position with the same lift-condition: "real renderer emits non-player-driver prose."
**Ground:** No renderer change between iter-3 and iter-4 (same date, 2026-05-25). The page-commit-time `turn-driver-pov-observer-firewall` validator (verified registered) absorbs the structural risk. No new spec needed; iter-4's re-statement is consistent with iter-3's deferral.

### CONFIRMS-EXISTING-POSITION

#### SPEC-F — Structured `SE.commitment.selection_rationale` field

**Verdict:** confirms-existing-position.
**Ground:** Iter-4 itself defers SPEC-F pending production playtest evidence. The deferral is correct under FOUNDATIONS §5b — without a consumer for the structured field, the existing `SE.turn_resolution.world_logic_rationale` (prose, `story-event.schema.json:257`) is sufficient. Recorded for iter-5 visibility.

#### Iter-4 §1-8 executive verdict + §7 Alternative C selection

**Verdict:** confirms-existing-position. No spec needed beyond SPEC-86's contract codification.
**Ground:** The verdict — preserve current implementation, defer Alternatives B/D/E, harden via current-state-mediated specificity (Alternative C) — mirrors iter-2/iter-3 architectural commitments. Iter-4's chosen alternative is the codification of the iter-2/iter-3 implicit consensus. SPEC-86 makes the consensus explicit as contract text without expanding the operational footprint beyond what existing validators already enforce.

#### Iter-4 §20 Non-goals (13 items)

**Verdict:** confirms-existing-position. All 13 non-goals re-affirm prior-iteration rejections.

The 13 non-goals (outcome-promising CHCs; direct CHC-to-SLT binding; generic storylets with names pasted in; global drama manager / target narrative-shape planner; turning STCHAR into current state; making NPCs omniscient; validating literary quality as hard schema law; loading thousands of full storylets into LLM context; generic storylet generation without driver/pressure/cast grounding; embeddings as legality filters; persistent SSEL record class; backwards-compatibility shims unless real migration; schema fields without deterministic validator / retrieval / index / skill / replay / selection consumer) align with iter-2 §Out-of-Scope (SSEL, CHC.binding, rich SLT.grounding, drama manager), iter-3 deferrals (SPEC-88 language validators, SPEC-89 large-pool fixture), and FOUNDATIONS §Story Bundles §5a-c.

The persistence of these non-goals across 4 iterations is a positive signal that the iter-2 §Out-of-Scope discipline has held.

## Refuted by codebase verification

### V1 — Iter-4's "denormalization for faster filtering" rationale for SPEC-B projection columns

**Report claim** (§9.6, §11 "What new projections are needed"): "Add derived, denormalized projection arrays ... to avoid repeated edge joins and give the MCP response a compact explainability surface."

**Verification:** **Performance claim unsupported.** SPEC-81's 1000-SLT synthetic proof (archived) demonstrates that the current edge-join shape scales adequately for retrieval. No production bundle has reached even 25 storylets (per the iter-2 user empirical input that informed SPEC-81 acceptance: "by page 4 we had 25 storylets"). FOUNDATIONS §5b's load-bearing test requires the field to be "directly consumed by a validation gate, a replay primitive, a predicate, a fork operation, or recorded audit-trail discipline" — speculative performance optimization is none of these.

**Consequence:** SPEC-B's projection-column subset defers under §5b. Re-evaluation triggers explicit in the SPEC-B DEFER bucket.

### V2 — Iter-4's "specificity_signature is genuinely new input" framing

**Report claim** (§9.6): The proposed `specificity_signature` input shape adds actor_stent_ids / active_stchar_ids / driver_record_ids / grounding_record_ids / pressure_record_classes / preferred_action_families / response_mode fields.

**Verification:** **Mostly repackaging of existing data.** `intent_signature` already accepts `grounding_record_ids`, `grounding_record_classes` (= `pressure_record_classes`), `action_families` (= `preferred_action_families`); `actor_stent_ids` / `active_stchar_ids` are derivable from the parent PG `active_records` the MCP already loads (lines 237-280); `driver_record_ids` is the request's `turn_driver.driver_records[]` (lines 27-31); `response_mode` is `turn_driver.player_response_mode` (when surfaced — `SE.turn_driver.player_response_mode` per `story-event.schema.json:114-116`).

**Consequence:** SPEC-B's input-shape subset defers as redundant. If a future consumer needs the data, it can be extracted from existing args without a new input field.

### V3 — Iter-4's framing of `non_player_response_richness_warning` as a "missing" validator

**Report claim** (§12): "Add a warning validator firing when non-player driver pages emit only generic continuation/investigation CHCs."

**Verification:** **`responds`-mode driver-record grounding is already HARD-enforced** by `turn-cycle-output-grounding-integrity.chc_response_topical_grounding_missing` (`turn-cycle-output-grounding-integrity.ts:140-158`). What iter-4 proposes is the *stance-variation* extension (oppose / protect / question / withhold), which is judgment territory.

**Consequence:** SPEC-C `non_player_response_richness_warning` defers as partial overlap + judgment territory. Re-evaluation requires concrete playtest evidence that an existing validator missed.

## Confirms-existing-position (additional)

### C1 — Iter-4 §16 "STCHAR ⇄ current-state mediation model"

The model — STCHAR explains *why* and *how to surface*; current-state records (`STPLAN`, `STEMO`, `BEL`, `SREL`, `STINT`, `STSTAT`, `OBL`, `CNSQ`, `THR`, `CLK`, `STSEC`, `STQ`, `DA`, `STOBJ`, `STLOC`) carry *what is so right now* — is the architectural consensus across 4 iterations. SPEC-86 §4.1 §11a is the codification.

### C2 — Iter-4 §17 "Replay / fork semantics"

The replay policy bullets (newer global SLTs visible on replay if predicates pass; branch-scoped stays branch-scoped; branch-prefix requires prefix match; frozen choices remain frozen; late-bound future resolution can use newer global SLTs) mirror SPEC-84's archived behavior. No new policy added; iter-4 re-affirms.

### C3 — Iter-4 §21 Open question 4 "branch-prefix STCHAR-specific storylets should be rare but useful"

This bias matches SPEC-86 §4.1's global-vs-branch-scoped predicate discipline: direct `record_active(STCHAR-<integer>)` is reserved for branch-scoped / branch-prefix-scoped visibility, where the character's stable authority is intrinsic to the block. The "rare but useful" framing aligns with the contract.

## Implementation note

Per the user pre-authorization clause in the originating request ("If changes aligned with docs/FOUNDATIONS.md are warranted, create specs in specs/* with the specifications. If more than one spec is created, create specs/IMPLEMENTATION-ORDER.md"), the triage recommendation was presented in chat and SPEC-86 + this triage file were written in the same turn. The user did not redirect during the presentation, activating the pre-authorization.

**No `specs/IMPLEMENTATION-ORDER.md`** is created: single spec, the user's "IF more than one spec is warranted" condition is not met.

Per the `brainstorm` skill's `references/deliverable-classification.md` §Triage-file composition, the companion triage file is **mandatory under both** the §Input-complexity carve-out (≥8 evaluated items: 6 SPECs + 5 skill changes + 5 validators + 7 fixtures + §20 non-goals far exceeds threshold) **and** the multi-iteration audit lineage override (iteration 4 of 4). This file is that companion.

The triage's deferral-with-named-lift-condition discipline is the durable rejection record against iter-5 (or any future iteration) re-proposing these surfaces without satisfying the recorded lift-conditions.

Historical-triage next step from the `brainstorm` skill Step 6 menu: the user chooses among reassess-spec, spec-to-tickets, implement-directly, or done.

## Open questions (for iter-5 visibility if a future iteration materializes)

1. **Cooldown for further iteration**: Iter-4 was intended as the **final iteration** ("the architecture seems quite mature now"). If a future iter-5 materializes, the trigger should be **empirical pressure** (playtest failure, production-scale failure, real-renderer prose pattern surfacing) — not analytic anticipation. The named lift-conditions in each DEFER bucket above are the entry criteria.

2. **§11a maintenance**: SPEC-86's §11a is the codified contract. Any future surface that pressures the contract content (new validator, new MCP field, new skill phase) should land its discipline text in §11a first, then validator/MCP/skill changes consume it. The §12 enumeration update is the navigational marker.

3. **SPEC-B / C / D / E re-evaluation pairing**: SPEC-B (MCP `specificity_trace`) and SPEC-C (warning validators) are tightly coupled — neither is load-bearing alone. If iter-5 lifts SPEC-C's playtest lift-condition, SPEC-B's `specificity_trace` should land alongside as the validator's input surface; SPEC-D fixtures and SPEC-E audit mode follow. A landing order would be SPEC-C (with one or two validators initially, not all five) → SPEC-B (response-only `specificity_trace`; defer projection columns until performance evidence) → SPEC-D (fixtures specific to landing validators) → SPEC-E (audit mode reading deployed validators). The deferral discipline holds **as a package**: piecemeal landing without playtest evidence reopens the consumer-circularity problem.

4. **Player Agency Modes contract amendment (carried forward from iter-3)**: iter-3 deferred until the prose-attach hidden-mind-leak check lifts (real renderer emits non-player-driver prose). Iter-4 did not re-propose it; lift remains unmet. Re-evaluate if iter-5 materializes with renderer evidence.

5. **`specs/IMPLEMENTATION-ORDER.md` cooldown**: archived per iter-3 triage as `archive/specs/IMPLEMENTATION-ORDER-2026-05-25-2.md`. Iter-4 produces a single spec; no fresh IMPLEMENTATION-ORDER created. Future iterations producing multiple specs should re-create as a fresh file.
