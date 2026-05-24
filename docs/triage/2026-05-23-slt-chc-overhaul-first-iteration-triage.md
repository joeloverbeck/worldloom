# Triage — `reports/slt-chc-overhaul-first-iteration.md`

**Date:** 2026-05-23
**Source report:** [`reports/slt-chc-overhaul-first-iteration.md`](../../reports/slt-chc-overhaul-first-iteration.md) (2140 lines; research-driven STCHAR ↔ SLT ↔ CHC consolidation architecture proposal from ChatGPT-Pro)
**Trigger:** Playtest concern — "the entire story was reactive upon what I as the player chose."
**Deliverables produced:** [`archive/specs/SPEC-76-turn-driver-primitive-and-pressure-driven-turn-cycle.md`](../../archive/specs/SPEC-76-turn-driver-primitive-and-pressure-driven-turn-cycle.md), [`archive/specs/SPEC-77-slt-grounding-provenance-minimal.md`](../../archive/specs/SPEC-77-slt-grounding-provenance-minimal.md), [`specs/IMPLEMENTATION-ORDER.md`](../../specs/IMPLEMENTATION-ORDER.md)

## Triage summary

The source report's **central diagnosis is correct and warrants action**: the current architecture has state authority but lacks driver authority. `SE.event_kind` is structurally player-initiated (`selected_choice | write_in_attempt`); the turn-cycle skill's Phase 1 is "Resolve the action"; active high-urgency STPLAN / STEMO / CLK / THR records can persist across pages without ever driving a turn. The report's Alternative E ("driver-first candidate commitment pipeline") names the right direction.

However, the report's **proposed solution is over-scoped**. Many additions duplicate existing surface or fail FOUNDATIONS §Story Bundles §5b's load-bearing test. The triage cuts the 10-ticket source plan to **2 focused specs** (SPEC-76 + SPEC-77). The reduction is principled, not conservative: each rejected item has a named ground in §5b (Schema-Minimalism), §5a (Commitment Blocks Are Causal Moves), §5c (Present Causal State, Not Narrative Shape), an existing-surface duplication, or the report's own internal contradictions (e.g., §11.3 forbids the hard-validation that §10.11 proposes).

The user pre-authorized spec creation contingent on the verdict. Pre-authorization activated when the triage recommendation was presented in chat; the spec deliverables were written in the same turn per the §Non-plan-mode fast-track for template-structured deliverables.

## Accepted

### A1 — `SE.turn_driver` primitive (source report §8.1)
**Verdict:** accept (with modification — drop `why_now` free-text field; fold into existing `world_logic_rationale`).
**Lands in:** SPEC-76 §3.1.
**Rationale:** Load-bearing per §5b — every sub-field (kind / initiator / driver_records / player_response_mode / pov_visibility) is consumed by a validator or downstream selection logic. Compatible with §5c (driver = present causal state, not future narrative shape). The dropped `why_now` would be free-text duplication of `world_logic_rationale: string` (already required).

### A2 — Collapse `SE.event_kind` to `turn_resolution` (source report §8.1)
**Verdict:** accept.
**Lands in:** SPEC-76 §3.1.
**Rationale:** The current enum is structurally player-initiated; the cleanest fix is collapsing `selected_choice` and `write_in_attempt` into `turn_resolution` and delegating driver semantics to `turn_driver.kind`.

### A3 — Extend `SE.commitment.selection_source` enum (source report §8.1)
**Verdict:** accept.
**Lands in:** SPEC-76 §3.1.
**Rationale:** Required so the existing `chc_slt_selected_commitment_trace` validator can recognize non-player selections without re-engineering its core logic.

### A4 — Page-plan §7a turn-driver section (source report §8.4)
**Verdict:** accept.
**Lands in:** SPEC-76 §3.2.
**Rationale:** Required for `page_plan_turn_driver_consistency` validator; matches existing §16a discipline; uses the SPEC-73 label-parsing pattern.

### A5 — Turn-cycle Phase 0 (driver evaluation) (source report §9.2)
**Verdict:** accept (with modification — modes named `action_source_mode`, not `execution_mode`, to avoid collision with the existing `execution_mode` parameter).
**Lands in:** SPEC-76 §3.3.
**Rationale:** Routes action-first Phase 1 through a driver-evaluation step. Without Phase 0 the schema change is dead — drivers can never become non-player at the engine level.

### A6 — Active-pressure handling discipline (source report §10.12)
**Verdict:** accept.
**Lands in:** SPEC-76 §3.2 (page-plan §7a active-pressure table) and §3.6.4 (`active_pressure_handling_discipline` validator).
**Rationale:** **The deepest fix for the user's reactivity concern.** Makes inert high-urgency pressure structurally impossible. Aligned with §5c (deterministic local salience, not narrative-shape steering) and FOUNDATIONS Validation Rule 5 (No Consequence Evasion).

### A7 — Four new validators (down from 12) (source report §10)
**Verdict:** accept (slim 12 → 4).
**Lands in:** SPEC-76 §3.6 (`turn_driver_schema_compliance`, `turn_driver_pov_observer_firewall`, `page_plan_turn_driver_consistency`, `active_pressure_handling_discipline`).
**Rationale:** Each of the 4 is load-bearing. The other 8 the report proposed are addressed below in Rejected / Deferred.

### A8 — Minimal SLT grounding (`compatible_turn_drivers[]` + `reason_to_exist`) (source report §8.3, slimmed)
**Verdict:** accept (slim 7 fields → 2).
**Lands in:** SPEC-77 §3.1.
**Rationale:** Both fields are load-bearing per §5b. `compatible_turn_drivers` drives Phase 2 selection filtering. `reason_to_exist` operationalizes §5a's "a good block says: when these conditions hold..." requirement and is functionally enforced by the banned-phrase list. The 5 dropped fields are duplicative — see Rejected / Deferred.

### A9 — Health-audit "Reactivity Inertness" pass (source report §9.5)
**Verdict:** accept (with modification — emit remediation-proposal cards, not hard fail).
**Lands in:** SPEC-76 §3.5.
**Rationale:** Audit-side safety net; the structural fix is A6 (active-pressure handling discipline). A run of legitimately player-driven pages should not hard-fail; the audit emits a proposal the operator can dismiss with reason.

## Accepted with modification

### M1 — `SE.turn_driver` field set
**Source report shape:** `{kind, initiator, driver_records, player_response_mode, pov_visibility, why_now}` (6 fields).
**Spec shape:** `{kind, initiator, driver_records, player_response_mode, pov_visibility}` (5 fields).
**Modification ground:** `why_now` is free-text; it duplicates `world_logic_rationale: string` (already required on every SE). Per §5b, no field exists unless it is consumed beyond what an existing field already covers. The information content folds without loss.

### M2 — Phase 0 mode parameter naming
**Source report shape:** rename `execution_mode` to a 4-value enum `{resolve_selected_choice, resolve_write_in, advance_initiative, repair_turn}`.
**Spec shape:** add a NEW orthogonal `action_source_mode` parameter with the 4 values; preserve the existing `execution_mode` (`authoring | interactive_runtime | batch`).
**Modification ground:** The existing `execution_mode` describes WHO is invoking the skill (authoring vs runtime vs batch); the new dimension describes WHAT action shape is being processed. These are orthogonal axes that should not share one parameter.

### M3 — SLT grounding fields
**Source report shape:** 7 fields (`reason_to_exist`, `causal_pressures`, `source_records`, `actor_binding_policy`, `compatible_turn_drivers`, `stchar_axes`, `role_lanes`) + `reuse_mode` enum.
**Spec shape:** 2 fields (`compatible_turn_drivers`, `reason_to_exist`); no `reuse_mode`.
**Modification ground:** See Rejected / Deferred per dropped field.

### M4 — Reactivity Inertness audit severity
**Source report shape:** hard-fail validator.
**Spec shape:** remediation-proposal-card emitter (warning-tier).
**Modification ground:** A run of legitimately player-driven pages (the player is pursuing a goal with no offstage pressure due) would trip a hard validator. The structural fix lives upstream (A6); the audit is the safety net.

## Rejected

### R1 — Full `CHC.binding` object replacing scalar `associated_commitment_block` (source report §8.2)
**Verdict:** reject.
**Alternative path:** Keep scalar `associated_commitment_block`; if a future playtest surfaces stale-binding pain, re-evaluate a minimal `CHC.late_bound: bool` flag at that point.
**Ground:**
1. The report's claim that `chc_slt_selected_commitment_trace` "resolves emitted choices by matching the selected SLT against `associated_commitment_block`" is **refuted by verification**. The validator at `tools/validators/src/structural/chc-slt-selected-commitment-trace.ts:86-112` keys on `SE.commitment.selected_slt_id` and validates the selected SLT's static predicates against parent-page active records — not a strict CHC.associated_commitment_block ID match. This softens the urgency of the binding-object overhaul.
2. The proposed `intent_signature` (`player_role`, `response_to_driver`, `target_or_action_families`, `target_records`, `required_grounding_records`, `required_stchar_axes`, `unacceptable_bindings`, `promise_to_player`) duplicates existing CHC root fields: `target_or_action_families` already exists on CHC; `grounded_in.records` already exists; `surface_label` and `player_visible_intent` cover the promise.
3. `CHC.supersedes` already exists in the current schema and provides the lifecycle path for stale CHCs (supersede before selection if a CHC's bound SLT becomes ineligible).
4. The change would break every existing CHC record, a fail-fast cost that is unjustified given (1) (2) (3).

### R2 — `SE.commitment.binding_resolution` + `instantiated_commitment` trace (source report §8.1)
**Verdict:** reject.
**Alternative path:** `alias_bindings` (existing) + the new `SE.turn_driver.driver_records[]` (A1) covers the audit need.
**Ground:** Both proposed sub-objects (`binding_resolution` with 5 sub-fields; `instantiated_commitment` with 4 sub-fields) require the full `CHC.binding` object (R1) to make sense. Without R1 they are orphan surface. Without them, the existing `alias_bindings` already records actor-role assignments, and the new `turn_driver.driver_records[]` records what active records justified the turn.

### R3 — `choice_set_quality_axes` validator (source report §10.11)
**Verdict:** reject.
**Alternative path:** Existing `choice_set_noncollapse` (`tools/validators/src/rules/rule_choice_set_noncollapse.ts`) handles structural collapse.
**Ground:** The source report's own §11.3 explicitly forbids hard-validating literary elegance, moral profundity, exact emotional effect, "interesting enough", or aesthetic quality — yet §10.11's proposed validator inspects exactly those axes ("distinct commitment promises," "distinct risk profiles"). The proposal is internally inconsistent with the report's own constraint. The deterministic part of §11.1 (distinct action families, distinct grounding records, no unmarked rhetorical duplicates) is already covered by `choice_set_noncollapse`.

### R4 — `SLT.reuse_mode` enum (source report §8.3)
**Verdict:** reject.
**Alternative path:** Derive from `scope.visibility` × `provenance.origin`.
**Ground:** The 4 proposed modes (`global_pattern | branch_pattern | branch_instantiated | runtime_jit`) map directly to existing surface: `scope.visibility: global_author_pool` ≡ `global_pattern`; `scope.visibility: branch_prefix_scoped` ≡ `branch_pattern`; `scope.visibility: branch_scoped` ≡ `branch_instantiated`; `provenance.origin: runtime_jit` ≡ `runtime_jit`. Adding `reuse_mode` is duplicative per §5b.

### R5 — `SLT.grounding.causal_pressures[]` (source report §8.3)
**Verdict:** reject.
**Alternative path:** Derivable from `preconditions.hard[]` predicate kinds.
**Ground:** The proposed taxonomy (plan_pressure / emotion_pressure / clock_pressure / threat_pressure / etc.) maps 1-to-1 to existing predicates: `plan_active` → plan_pressure, `clock_at_least` → clock_pressure, `any_thread_active` → thread_pressure, etc. A validator can compute the pressure class from the predicate at query time; storing it on the SLT is duplicative per §5b.

### R6 — `SLT.grounding.source_records[]` (source report §8.3)
**Verdict:** reject.
**Alternative path:** `preconditions.hard[]` already cites record IDs (e.g., `plan_active: STPLAN-9`).
**Ground:** Same as R5 — duplicates existing predicate-DSL surface.

### R7 — `SLT.grounding.actor_binding_policy` (source report §8.3)
**Verdict:** reject.
**Alternative path:** `scope.visibility` already encodes binding capability.
**Ground:** `scope.visibility: global_author_pool` is role-parametric by construction (cannot reference branch-local record IDs per the `scopeRestrictedPrefilterPredicate` constraint in the existing schema); `scope.visibility: branch_scoped` allows exact-actor binding via `alias_bindings`. The proposed enum (`exact_actor | role_parametric | late_bound_actor`) is fully derivable.

## Deferred

### D1 — `SLT.grounding.stchar_axes[]` + `role_lanes[]` (source report §8.3)
**Verdict:** defer.
**Re-evaluate when:** a concrete validator surfaces a need that `STENT.bound_stchar_id` + page-plan §16a packets don't cover.
**Ground:** STCHAR-axis taxonomy is a separate concern from the reactivity fix. Adding it now would require the closed-vocabulary axis index (D2) and the two axis-grounding validators (D3), neither of which is on the reactivity-fix critical path.

### D2 — STCHAR Operational Axis Index closed-vocabulary taxonomy (source report §9.4)
**Verdict:** defer.
**Re-evaluate when:** D1 is reconsidered.
**Ground:** The proposed 8-axis taxonomy (`pressure_behavior`, `appraisal_rule`, `agency_planning_tendency`, `relationship_conduct`, `voice_communication_constraint`, `capability_limit`, `perception_embodiment`, `anti_generic_warning`) is interesting but speculative — none of the proposed validators that consume it (`slt_stchar_axis_resolution`, `choice_stchar_axis_grounding`) is on the reactivity-fix critical path.

### D3 — `slt_stchar_axis_resolution` + `choice_stchar_axis_grounding` validators (source report §10.8, §10.9)
**Verdict:** defer.
**Re-evaluate when:** D2 is reconsidered.

### D4 — `branching-story-prose-attach` driver-fidelity receipt fields (source report §9.6)
**Verdict:** defer.
**Re-evaluate when:** after SPEC-76's landing, a playtest with rendered prose confirms the prose-receipt surface needs to record driver fidelity (e.g., did the prose render the driver, did it honor POV visibility, did it avoid offstage mind leak).
**Ground:** Adding receipt fields without the upstream `turn_driver` shape would land orphan surface. The prose-attach skill's existing STCHAR-fidelity discipline is the precedent — once the upstream shape is real, the receipt extension is mechanical.

### D5 — Candidate-commitment record (`SCOM` / `STCAND`) (source report §6 Alternative D, §17.1)
**Verdict:** defer.
**Re-evaluate when:** after turn-cycle SPEC-76's landing, a playtest surfaces concrete need for cross-page candidate persistence.
**Ground:** The report itself defers this in §17.1. The reactivity fix does not require it; candidate-driver evaluation lives ephemerally in Phase 0 + page-plan §7a's active-pressure table.

## Refuted by codebase verification

### V1 — Report's framing of `chc_slt_selected_commitment_trace` (source report §1 / §5.2)
**Report claim:** "the existing selected-trace validator currently resolves emitted choices by matching the selected SLT against `associated_commitment_block`."
**Verification:** `tools/validators/src/structural/chc-slt-selected-commitment-trace.ts:86-112` reads `SE.commitment.selected_slt_id`, looks up the selected SLT, and validates its **static predicates against parent-page active records** + its **alias bindings against `SE.commitment.alias_bindings`**. It does not match against `CHC.associated_commitment_block` as a hard ID constraint.
**Consequence:** The "stale binding" pain the report frames is mitigated by the existing validator behavior; this softens the case for the full `CHC.binding` overhaul (R1).

### V2 — Report's example CHC-18 `grounded_in.records: [SE-12, ...]` (source report §8.2)
**Report claim:** CHC.grounded_in.records[] should accept SE-* IDs as part of late-bound intent grounding.
**Verification:** `tools/validators/src/schemas/story-choice.schema.json:67` enumerates the closed record-class pattern: `^(STENT|STCHAR|STSTAT|STLOC|STOBJ|BEL|OBL|CNSQ|THR|SREL|DA|STPLAN|STEMO|CLK|STSEC|STQ|STINT|SF)-[0-9]+$` — **SE is not in the list**.
**Consequence:** A minor authoring inaccuracy in the report's CHC example; not architectural. Doesn't affect the triage outcome.

## Confirms-existing-position

### C1 — Source report §5a / §5c alignment
The source report's framing of SLT as "commitment block / causal move" and its rejection of narrative-shape framings on SLTs match FOUNDATIONS §Story Bundles §5a / §5c. No amendment needed; the existing `narrative-shape-field-rejection.ts` validator already enforces this at the structural level for CLK / STSEC / THR / SREL / STENT (the field set may need extension to SLT in a future pass if SLT-level narrative-shape drift surfaces empirically).

### C2 — Source report §13.4 (Prevent generic storylet spam)
The report's structural test for SLT genericness — "fail if reason_to_exist is generic; no source_records for branch/runtime SLT; no role lanes for global pattern; move_family is the only specificity" — is operationalized in slimmed form by SPEC-77's `slt_grounding_minimal_integrity` validator (`slt_grounding_reason_too_short`, `slt_grounding_reason_generic`, `slt_grounding_runtime_jit_driver_kind_singleton`). The dropped tests (source_records, role lanes) are duplicative of existing surface per R6 and D1.

## Implementation note

Per the User pre-authorization clause in the original request ("If changes are warranted, aligned with docs/FOUNDATIONS.md, create specs in specs/*. If more than one spec is warranted, create specs/IMPLEMENTATION-ORDER.md"), the triage recommendation was presented in chat and the spec deliverables (SPEC-76, SPEC-77, IMPLEMENTATION-ORDER.md) were written in the same turn. The user did not redirect during the presentation, activating the pre-authorization.

Historical triage next step: `spec-to-tickets` was the next-phase decomposer; SPEC-78, SPEC-76, and SPEC-77 have since been implemented and archived.

## Update — 2026-05-23 — FOUNDATIONS amendment reversal

The initial triage placed **"Updating `docs/FOUNDATIONS.md` itself"** in **Out of Scope** with the rationale "FOUNDATIONS principles are unchanged by this spec; only schema and contract surfaces change." A user follow-up question ("Do you believe the driver primitive is foundational enough to warrant changes to FOUNDATIONS.md?") surfaced two specific gaps the initial triage missed:

1. **§Story Bundles §5c (Present Causal State, Not Narrative Shape)** describes salience ranking as SLT-pool ranking — it does not name the *prior* salience pass that now happens at driver selection (which active record becomes this turn's causal initiator). A future refactor could rationalize a global driver planner under §5c's existing language because the principle text doesn't explicitly cover the driver-selection layer.
2. **§Story Bundles §6b (Information / Observer Firewall)** governs storylet selection, choice emission, and character actions — it does not explicitly cover event-level driver declaration, the new surface where `SE.turn_driver.driver_records[]` can cite hidden state and `pov_visibility` declares the access posture.

**Verdict change:** "Updating `docs/FOUNDATIONS.md`" moves from **Out of Scope** to **accept-with-modification** (narrowed scope: two paragraph extensions; no new sub-section).

**Carrier:** [`archive/specs/SPEC-78-foundations-amendment-driver-primitive-principle-extensions.md`](../../archive/specs/SPEC-78-foundations-amendment-driver-primitive-principle-extensions.md), completed and archived after landing as row 1 in `specs/IMPLEMENTATION-ORDER.md` (FOUNDATIONS is upstream of contract and schema; the principles SPEC-76 cites are the extended ones).

**What is *not* changed by the reversal:** SPEC-76 and SPEC-77 do not need re-drafting; their FOUNDATIONS-citation references remain valid against the extended principles. The only consequent edit is to SPEC-76 §4 Out of Scope (the FOUNDATIONS-rejection bullet is replaced with a forward reference to SPEC-78) and to `IMPLEMENTATION-ORDER.md` (SPEC-78 inserted as row 1; the FOUNDATIONS-rejection bullet is removed from the Out-of-Scope section). Both edits are in SPEC-78's Slice A scope.

**Rejected sub-options under the reversal:** A new §5d "Driver Authority" sub-section was considered and rejected as inflating FOUNDATIONS for what is fundamentally a clarification of two existing principles. The narrower in-place extensions are sufficient.

**Audit-trail value:** the initial Out-of-Scope rationale ("FOUNDATIONS principles are unchanged") was operator-conservatism that under-weighted the §5c / §6b coverage gaps. Recording the reversal here, with the explicit triggering question, prevents a future operator from re-running the same reasoning and arriving at the same incomplete conclusion.
