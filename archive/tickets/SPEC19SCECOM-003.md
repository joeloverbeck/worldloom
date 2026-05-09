# SPEC19SCECOM-003: Stop-predicate DSL extension (third tier)

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — extends `storylet-pool-authoring` skill template (`templates/predicate-dsl.md`): adds a third predicate tier (stop predicates: normal-exit + interrupt-before + safety-valve sub-tiers) on top of the existing core forms and documented extensions tiers. Adds minimal parent/reference disclosure in `storylet-pool-authoring` so the live skill no longer describes the Predicate DSL as precondition-only. No runtime or validator implementation changes — the third tier is additive and lives at a distinct usage site (`arc.stop_policy.normal_exits[].predicate` and `arc.stop_policy.interrupt_before[].predicate` on v2 SLT records).
**Deps**: None — schema-text-only ticket; runtime / validator consumers land in SPEC-20 / SPEC-22.

## Problem

At intake, `templates/predicate-dsl.md` documented two predicate tiers used for storylet eligibility:
- **Core forms** (11 types: fact_true, fact_matches, entity_state, relationship, consequence_pending, obligation_open, location, epistemic, not, all, any) — used in `hard_preconds` / `soft_preconds`
- **Documented extensions** (10 forms: relationship_state, time_of_day, time_of_week, time_in_story, time_since_event, world_property, obligation_state, location_kind, location_id, location_class)

The DSL was finite by design ("extending it requires a documented edit to this file, not LLM-side invention" per the file's framing) and the existing `storylet_predicate_dsl_parsability` validator HARD-REJECTs storylets whose predicates do not parse against the documented grammar (Phase 4 gate 7).

The SPEC-19 §D scene-commitment-arc pivot required a **third predicate tier** for stop-policy semantics — predicates evaluated against story state, the selected commitment, the arc-local trace, mystery safety, the effect model, and participant/location changes. These are used in `arc.stop_policy.normal_exits[].predicate` and `arc.stop_policy.interrupt_before[].predicate` on v2 SLT records (per completed `archive/tickets/SPEC19SCECOM-001.md`), and at SPEC-20 §Phase 7.6's stop-condition evaluator at runtime.

This ticket extended `predicate-dsl.md` with the third tier (11 normal-exit predicates, 8 interrupt-before predicates, 4 inline safety-valve thresholds) so that the closed grammar is documented before SPEC-22 Track 2 ships the `stop_policy_parsability` validator and SPEC-21 ships the storylet-pool-authoring Phase 4 HARD-REJECT for free-form stop predicates. It also updated minimal same-skill disclosure prose so the parent skill and references no longer describe the Predicate DSL as precondition-only.

## Assumption Reassessment (2026-05-07)

1. **Current predicate-dsl.md tiers (verified at SPEC-19 reassessment 2026-05-07)**: `.claude/skills/storylet-pool-authoring/templates/predicate-dsl.md` (202 lines at intake) documented two tiers — the 11 core forms + 10 documented extensions — framed as "the DSL is finite — extending it requires a documented edit to this file, not LLM-side invention." The existing `storylet_predicate_dsl_parsability` validator (referenced at Phase 4 gate 7) loads grammar via shared imports from `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts`. SPEC-19 §D's claim that the new `stop_policy_parsability` validator "shares the existing `storylet_predicate_dsl_parsability` validator's grammar-loading logic" is structurally sound (verified at reassessment).
2. **SPEC-19 §D as authority for the third tier**: the 11 normal-exit predicates (`commitment_satisfied`, `commitment_blocked`, `commitment_overturned`, `npc_makes_demand`, `npc_makes_disclosure`, `participant_exits`, `scene_goal_resolves`, `scene_goal_changes`, `new_obligation_created`, `open_thread_reprioritized`, `time_or_location_changes`), the 8 interrupt-before predicates (`irreversible_cost_imminent`, `consent_boundary_imminent`, `violence_or_harm_imminent`, `forbidden_mystery_resolution_risk`, `protagonist_goal_change_required`, `selected_commitment_would_be_violated`, `user_write_in_conflicts_with_envelope`, `only_next_action_would_create_major_state_change`), and the 4 inline safety-valve thresholds (`max_internal_beats_reached`, `max_words_reached`, `no_valid_continuation_after_effect`, `validation_confidence_low`) are fully specified in `archive/specs/SPEC-19-scene-commitment-arc-schema.md` §D with per-predicate args schemas. No drift between the spec text and this ticket's What to Change.
3. **Cross-skill shared boundary under audit**: `templates/predicate-dsl.md` is consumed by (a) `storylet_predicate_dsl_parsability` validator (existing, owned by `tools/validators/`); (b) SPEC-22 Track 2's new `stop_policy_parsability` validator (post-dates this ticket; reuses the same grammar-loading logic per SPEC-19 §D); (c) SPEC-20 §Phase 7.6 stop-condition evaluator (runtime); (d) SPEC-21's storylet-pool-authoring Phase 4 HARD-REJECT for free-form stop predicates (post-dates this ticket). All consumers are explicitly out-of-scope for SPEC-19 Tier-1; this ticket ships the grammar text alone.
4. **FOUNDATIONS principle under audit — Story Bundles §5 Rule 1 (No Floating Facts) at story scope**: the DSL's finite-grammar discipline structurally enforces "every storylet's predicates parse against the documented grammar" — Phase 4 gate 7 HARD-REJECTs records whose predicates do not parse, preventing free-form invention from contaminating the deterministic Phase 4 selection logic. The third tier extends this discipline to stop-policy semantics: free-form stop predicates would let an LLM proposer invent arbitrary close conditions, breaking the closed-grammar replay-equality contract that SPEC-22's `stop_policy_parsability` validator exists to enforce.
5. **Mystery Reserve firewall — strengthened**: the new `forbidden_mystery_resolution_risk` interrupt-before predicate (args: `{mystery: M-NNNN}`) is a structural firewall mechanism — it triggers an interrupt-before stop when an arc's render risks resolving an MR-forbidden mystery, routing the page-cycle to Phase 7.6's `revise_prose` or `reject_arc` verdict. This is additive protective discipline; it does not weaken any existing firewall mechanism. FOUNDATIONS §Story Bundles §5 Rule 7 (Preserve Mystery Deliberately) is strengthened by structural surface for runtime mystery-firewall enforcement at the arc-render boundary.
6. **DSL extension shape — additive, not breaking**: the third tier sits alongside the existing two tiers (core forms + documented extensions) at a distinct usage site. The existing predicates (used in `hard_preconds`, `soft_preconds`, `cast_requirements`, `location_requirements`) are unmodified. The new predicates are usage-restricted to `arc.stop_policy.normal_exits[].predicate` and `arc.stop_policy.interrupt_before[].predicate` (v2 SLT) and the runtime Phase 7.6 stop-condition evaluator. No predicate name collides between the new tier and the existing tiers (e.g., `time_or_location_changes` in normal-exit is a distinct predicate from `time_of_day` / `time_of_week` / `time_in_story` / `time_since_event` in the existing extensions tier). The DSL parser distinguishes by context (which field the predicate appears in), not by name lookup alone — the grammar consumer (validator) already supports this discrimination per SPEC-19 §D.
7. **Same-seam reference disclosure absorbed**: live reassessment found `storylet-pool-authoring/SKILL.md`, `references/phase-3-structured-drafting.md`, `references/phase-4-5-canon-safety-checks.md`, and `references/governance-and-foundations.md` still described the Predicate DSL as precondition-only or as only core + documented-extension forms. Those references are in the same skill contract as `templates/predicate-dsl.md`, so this ticket absorbs minimal wording updates that disclose the third stop-policy tier while leaving the full SPEC-21 operational authoring rewrite out of scope.

## Architecture Check

1. **Additive grammar extension preserves the file's existing finite-grammar discipline**: the third tier is added with the same "documented edit to extend; LLM-side invention HARD-REJECTed" framing as the existing two tiers. The DSL remains finite; it just has three usage sites now (preconds + soft_preconds + stop_policy) instead of two.
2. **No backwards-compatibility shim**: existing predicate consumers (Phase 4 gate 7 + the `storylet_predicate_dsl_parsability` validator) are not modified by this ticket — the new tier lives at a distinct usage site. SPEC-22 Track 2's new `stop_policy_parsability` validator reuses the existing grammar-loading logic per SPEC-19 §D, but that's a separate code-side ticket in the SPEC-22 batch. No dual-version logic in this file.

## Verification Layers

1. **Third tier added with all 11 normal-exit predicates** → codebase grep-proof: each of `commitment_satisfied`, `commitment_blocked`, `commitment_overturned`, `npc_makes_demand`, `npc_makes_disclosure`, `participant_exits`, `scene_goal_resolves`, `scene_goal_changes`, `new_obligation_created`, `open_thread_reprioritized`, `time_or_location_changes` documented with args schemas matching SPEC-19 §D.
2. **All 8 interrupt-before predicates documented** → codebase grep-proof: each of `irreversible_cost_imminent`, `consent_boundary_imminent`, `violence_or_harm_imminent`, `forbidden_mystery_resolution_risk`, `protagonist_goal_change_required`, `selected_commitment_would_be_violated`, `user_write_in_conflicts_with_envelope`, `only_next_action_would_create_major_state_change` documented with args schemas matching SPEC-19 §D.
3. **All 4 safety-valve inline thresholds documented** → codebase grep-proof: each of `max_internal_beats_reached`, `max_words_reached`, `no_valid_continuation_after_effect`, `validation_confidence_low` documented with their trigger semantics.
4. **Closed-vs-open args distinction documented per predicate** → codebase grep-proof: prose explicitly notes which predicate args are enum-bound (e.g., `commitment_satisfied.args.commitment_class` is enum-bound to the canonical-vocabularies `commitment_class` enum) versus open-vocab (e.g., `commitment_blocked.args.reason_class` is open-vocab kebab-case).
5. **Mystery Reserve firewall structural enforcement documented** → FOUNDATIONS alignment check: §Story Bundles §5 Rule 7 — the `forbidden_mystery_resolution_risk` predicate is documented as a structural firewall mechanism with args `{mystery: M-NNNN}` enabling per-arc forbidden-mystery enforcement at the runtime Phase 7.6 stop-condition evaluator.
6. **Validator-side enforcement deferred** → cross-spec: SPEC-22 Track 2 (`stop_policy_parsability` validator) is the runtime gate; this ticket only ships the grammar text. The validator inherits the existing `storylet_predicate_dsl_parsability` grammar-loading logic per SPEC-19 §D's structural-soundness claim (verified at reassessment).

## Landed Changes

### 1. Add a new top-level section for the stop-predicate tier

Added a new top-level section titled `## Stop Predicates (third tier — v2 SLT arc.stop_policy)` after the existing documented extensions. It introduces the tier with:

- **Usage sites**: `arc.stop_policy.normal_exits[].predicate` and `arc.stop_policy.interrupt_before[].predicate` on v2 SLT records (see SPEC-19 §A); the runtime page-cycle's SPEC-20 §Phase 7.6 stop-condition evaluator.
- **Discipline framing**: same as the existing tiers — the grammar is finite; LLM-side invention is HARD-REJECTed by SPEC-22's `stop_policy_parsability` validator (which inherits the grammar-loading logic from the existing `storylet_predicate_dsl_parsability` validator per SPEC-19 §D).
- **Distinction from preconds / soft_preconds**: stop predicates evaluate against story state, the selected commitment, the arc-local trace, mystery safety, the effect model, and participant/location changes — surfaces that the eligibility-tier predicates do not consult.

### 2. Document the 11 normal-exit predicates

Added a sub-section `### Normal-exit predicates (`stop_policy.normal_exits[].predicate`)` that documents each of the 11 predicates with its `pred:` name and `args:` schema per SPEC-19 §D:

```yaml
- pred: commitment_satisfied
  args: {commitment_class: <commitment_class enum>}
- pred: commitment_blocked
  args: {commitment_class: <commitment_class enum>, reason_class: <kebab-case open-vocab>}
- pred: commitment_overturned
  args: {by_actor: STENT-NNNN | role:<role>, new_commitment_class: <commitment_class enum>}
- pred: npc_makes_demand
  args: {npc: STENT-NNNN | role:<role>, demand_class: <kebab-case open-vocab>}
- pred: npc_makes_disclosure
  args: {npc: STENT-NNNN | role:<role>, disclosure_class: <kebab-case open-vocab>}
- pred: participant_exits
  args: {participant: STENT-NNNN | role:<role>}
- pred: scene_goal_resolves
  args: {goal: <kebab-case open-vocab>}
- pred: scene_goal_changes
  args: {from: <kebab-case open-vocab>, to: <kebab-case open-vocab>}
- pred: new_obligation_created
  args: {salience_min: <int 0..10>}
- pred: open_thread_reprioritized
  args: {thread: THR-NNNN, direction: increase | decrease}
- pred: time_or_location_changes
  args: {axis: time | location}
```

Each predicate has a one-line semantic gloss. The closed-vs-open args distinction is marked in the tier framing and inline where relevant per SPEC-19 §D §Risks (e.g., `commitment_satisfied.args.commitment_class` is enum-bound to the canonical-vocabularies `commitment_class` enum; `commitment_blocked.args.reason_class` is open-vocab kebab-case).

### 3. Document the 8 interrupt-before predicates

Added a sub-section `### Interrupt-before predicates (`stop_policy.interrupt_before[].predicate`)` that documents each of the 8 predicates per SPEC-19 §D:

```yaml
- pred: irreversible_cost_imminent
  args: {cost_class: <kebab-case open-vocab>}
- pred: consent_boundary_imminent
  args: {boundary_class: <kebab-case open-vocab>}
- pred: violence_or_harm_imminent
  args: {target: STENT-NNNN | role:<role>}
- pred: forbidden_mystery_resolution_risk
  args: {mystery: M-NNNN}
- pred: protagonist_goal_change_required
  args: {from: <kebab-case open-vocab>, to: <kebab-case open-vocab>}
- pred: selected_commitment_would_be_violated
  args: {violation_kind: <kebab-case open-vocab>}
- pred: user_write_in_conflicts_with_envelope
  args: {envelope_item: <kebab-case open-vocab>}
- pred: only_next_action_would_create_major_state_change
  args: {axis: <strong_axis enum>}
```

Each predicate has a one-line semantic gloss. The Mystery-Reserve-firewall significance of `forbidden_mystery_resolution_risk` is explicit: this predicate is a structural firewall mechanism per FOUNDATIONS §Story Bundles §5 Rule 7.

### 4. Document the 4 safety-valve inline thresholds

Added a sub-section `### Safety-valve thresholds (`stop_policy.safety_valves`)` that documents each of the 4 inline thresholds per SPEC-19 §D:

- **`max_internal_beats_reached`** — fires when the prose render's beat count exceeds `arc.beat_plan.max_beats`. (Default upper bound: 6 per SPEC-19 §A.)
- **`max_words_reached`** — fires when the prose render exceeds `arc.stop_policy.safety_valves.max_words`. (Default: 2200 per SPEC-19 §A; multi-beat target ~1500-2000 words.)
- **`no_valid_continuation_after_effect`** — fires when applying the selected effect_variant leaves no eligible continuation arc and no valid JIT spec (Phase 3 continuation feasibility owned by SPEC-20).
- **`validation_confidence_low`** — fires when the SPEC-20 §Phase 7.6 Layer 3 semantic critic returns confidence below a per-execution-mode threshold.

Safety-valves are marked as **inline thresholds, not DSL predicates** — they are evaluated by the runtime stop-condition evaluator (SPEC-20) without parsing through the predicate-DSL grammar. They are documented in this file for completeness with that distinction explicit.

### 5. Update the file's framing intro

Updated the file's introductory framing to reference the third tier and make the three tiers explicit: (i) Core forms, (ii) Documented extensions, (iii) Stop predicates for `arc.stop_policy` + Phase 7.6 evaluator.

### 6. Update minimal parent/reference disclosure

Updated `storylet-pool-authoring` parent/reference prose that otherwise made the live skill misleading after the template change:

- `SKILL.md` Phase 3 template-load summary names the third stop-policy tier while preserving the SPEC-21 transition boundary.
- `references/phase-3-structured-drafting.md` notes that v2 structured drafting uses the same DSL grammar for stop-policy predicates in addition to eligibility preconditions.
- `references/phase-4-5-canon-safety-checks.md` names stop-policy predicates as the SPEC-19/SPEC-21 extension of gate 7, with enforcement still deferred to downstream validator/runtime tickets.
- `references/governance-and-foundations.md` updates the Predicate DSL grammar summary and the v2 SLT schema disclosure so it no longer claims the template is v1/choice-template-only.

## Files to Touch

- `.claude/skills/storylet-pool-authoring/templates/predicate-dsl.md` (modify)
- `.claude/skills/storylet-pool-authoring/SKILL.md` (modify — minimal predicate-DSL transition disclosure)
- `.claude/skills/storylet-pool-authoring/references/phase-3-structured-drafting.md` (modify — minimal predicate-DSL transition disclosure)
- `.claude/skills/storylet-pool-authoring/references/phase-4-5-canon-safety-checks.md` (modify — minimal predicate-DSL transition disclosure)
- `.claude/skills/storylet-pool-authoring/references/governance-and-foundations.md` (modify — minimal predicate-DSL/schema disclosure)

## Out of Scope

- TypeScript `stop_predicate` enum implementation in `tools/world-index/src/public/canonical-vocabularies.ts` (owned by SPEC-22 Track 3)
- Validator `stop_policy_parsability` (owned by SPEC-22 Track 2 — inherits the existing `storylet_predicate_dsl_parsability` grammar-loading logic per SPEC-19 §D)
- Authoring-skill Phase 4 HARD-REJECT logic for free-form stop predicates (owned by SPEC-21 — the storylet-pool-authoring Phase 4 gate 7 extension)
- Runtime Phase 7.6 stop-condition evaluator (owned by SPEC-20)
- Predicate args schema enforcement at parse time (owned by SPEC-22 Track 2 — per-predicate args validation)
- Migration of existing v1 SLT records (owned by SPEC-22 Track 5)
- Integration with `arc.stop_policy` block on v2 SLT records (the v2 SLT schema itself was completed by `archive/tickets/SPEC19SCECOM-001.md`; this ticket documents only the predicate grammar consumed by `arc.stop_policy.*.predicate` fields)
- ARC_TRACE `stop_condition_hit` field (completed by `archive/tickets/SPEC19SCECOM-002.md` — the field references stop-policy entries by id, but the predicate grammar lives here)

## Acceptance Criteria

### Tests That Passed

1. `grep -E "^- pred: (commitment_satisfied|commitment_blocked|commitment_overturned|npc_makes_demand|npc_makes_disclosure|participant_exits|scene_goal_resolves|scene_goal_changes|new_obligation_created|open_thread_reprioritized|time_or_location_changes)" .claude/skills/storylet-pool-authoring/templates/predicate-dsl.md | wc -l` -> `11` (all 11 normal-exit predicates documented).
2. `grep -E "^- pred: (irreversible_cost_imminent|consent_boundary_imminent|violence_or_harm_imminent|forbidden_mystery_resolution_risk|protagonist_goal_change_required|selected_commitment_would_be_violated|user_write_in_conflicts_with_envelope|only_next_action_would_create_major_state_change)" .claude/skills/storylet-pool-authoring/templates/predicate-dsl.md | wc -l` -> `8` (all 8 interrupt-before predicates documented).
3. `grep -E "max_internal_beats_reached|max_words_reached|no_valid_continuation_after_effect|validation_confidence_low" .claude/skills/storylet-pool-authoring/templates/predicate-dsl.md | wc -l` -> `4` (all 4 safety-valve thresholds documented).
4. `grep -E "stop_policy.normal_exits|stop_policy.interrupt_before|stop_policy.safety_valves" .claude/skills/storylet-pool-authoring/templates/predicate-dsl.md` -> matched all three sub-tier usage sites.
5. `grep -E "stop_policy_parsability|storylet_predicate_dsl_parsability" .claude/skills/storylet-pool-authoring/templates/predicate-dsl.md` -> matched both validator references.
6. `grep -E "forbidden_mystery_resolution_risk|Rule 7|Mystery Reserve" .claude/skills/storylet-pool-authoring/templates/predicate-dsl.md` -> matched the predicate and firewall significance prose.
7. `grep -E "stop_policy|stop predicates|third tier" .claude/skills/storylet-pool-authoring/SKILL.md .claude/skills/storylet-pool-authoring/references/phase-3-structured-drafting.md .claude/skills/storylet-pool-authoring/references/phase-4-5-canon-safety-checks.md .claude/skills/storylet-pool-authoring/references/governance-and-foundations.md | wc -l` -> `12` (same-skill disclosure updated).

### Invariants

1. The DSL extension is additive at the file level — the existing two tiers (core forms + documented extensions) are unmodified; the new third tier sits alongside them with explicit usage-site distinction (`arc.stop_policy.*.predicate` instead of `hard_preconds` / `soft_preconds`).
2. No predicate name collides between tiers — the third tier introduces 19 new predicate names (11 normal-exit + 8 interrupt-before) plus 4 inline safety-valve thresholds, all distinct from the existing 21 predicates documented in tiers 1 and 2.
3. Mystery Reserve firewall is structurally strengthened — the `forbidden_mystery_resolution_risk` predicate provides per-arc render-time enforcement at the Phase 7.6 stop-condition evaluator, complementing the existing per-storylet `mystery_safety` block on SLT records.
4. The closed-grammar discipline is preserved — the grammar remains finite; LLM-side invention of stop predicates is HARD-REJECTed by SPEC-22's `stop_policy_parsability` validator (which inherits the existing `storylet_predicate_dsl_parsability` grammar-loading logic).
5. Parent/reference disclosure is minimal and transitional — it names the third tier without rewriting the still-deferred SPEC-21 operational authoring phases.

## Test Plan

### New/Modified Tests

1. `None — schema-authoring ticket; verification is grep-based against the modified template file. Validator-side test coverage is owned by SPEC-22 Track 2 (`stop_policy_parsability` HARD-REJECT semantics for unknown predicate names + per-predicate args-schema validation); authoring-skill emission coverage is owned by SPEC-21's storylet-pool-authoring Phase 4 gate 7 extension; runtime stop-condition evaluation coverage is owned by SPEC-20's Phase 7.6 tests.`

### Commands

1. `grep -cE "^- pred: " .claude/skills/storylet-pool-authoring/templates/predicate-dsl.md` -> `40` (existing 21 predicate entries plus 19 new tier-3 predicate entries; safety-valves are inline thresholds, not `pred:`-keyed entries).
2. `grep -E "(stop_policy|normal_exits|interrupt_before|safety_valves)" .claude/skills/storylet-pool-authoring/templates/predicate-dsl.md | wc -l` -> `11` (section anchors and usage-site references documented).
3. `grep -E "stop_policy|stop predicates|third tier" .claude/skills/storylet-pool-authoring/SKILL.md .claude/skills/storylet-pool-authoring/references/phase-3-structured-drafting.md .claude/skills/storylet-pool-authoring/references/phase-4-5-canon-safety-checks.md .claude/skills/storylet-pool-authoring/references/governance-and-foundations.md | wc -l` -> `12` (same-skill transition/disclosure references updated).
4. Manual review of the modified template and same-skill references confirmed: (a) the third tier sits at a distinct top-level section from the existing tiers; (b) each of the 19 new predicates has both a name and an args schema documented; (c) the closed-vs-open args distinction is marked inline per SPEC-19 §D §Risks; (d) the cross-spec deferral to SPEC-22 Track 2's `stop_policy_parsability` validator is explicitly stated; (e) same-skill parent/reference prose discloses the third tier without claiming SPEC-21's operational rewrite has landed.

## Outcome

Completed 2026-05-07. `.claude/skills/storylet-pool-authoring/templates/predicate-dsl.md` now documents the SPEC-19 stop-predicate third tier for v2 `arc.stop_policy.normal_exits[].predicate` and `arc.stop_policy.interrupt_before[].predicate`, including 11 normal-exit predicates, 8 interrupt-before predicates, 4 inline safety-valve thresholds, closed-vs-open args discipline, SPEC-22 `stop_policy_parsability` deferral, and the `forbidden_mystery_resolution_risk` Mystery Reserve firewall semantics.

The same-skill `storylet-pool-authoring` parent/reference prose now contains minimal transition disclosure that the Predicate DSL includes stop-policy predicates, while leaving the full SPEC-21 operational authoring rewrite out of scope.

## Verification Result

Ran 2026-05-07:

1. `grep -E "^- pred: (commitment_satisfied|commitment_blocked|commitment_overturned|npc_makes_demand|npc_makes_disclosure|participant_exits|scene_goal_resolves|scene_goal_changes|new_obligation_created|open_thread_reprioritized|time_or_location_changes)" .claude/skills/storylet-pool-authoring/templates/predicate-dsl.md | wc -l` -> `11`.
2. `grep -E "^- pred: (irreversible_cost_imminent|consent_boundary_imminent|violence_or_harm_imminent|forbidden_mystery_resolution_risk|protagonist_goal_change_required|selected_commitment_would_be_violated|user_write_in_conflicts_with_envelope|only_next_action_would_create_major_state_change)" .claude/skills/storylet-pool-authoring/templates/predicate-dsl.md | wc -l` -> `8`.
3. `grep -E "max_internal_beats_reached|max_words_reached|no_valid_continuation_after_effect|validation_confidence_low" .claude/skills/storylet-pool-authoring/templates/predicate-dsl.md | wc -l` -> `4`.
4. `grep -E "stop_policy.normal_exits|stop_policy.interrupt_before|stop_policy.safety_valves" .claude/skills/storylet-pool-authoring/templates/predicate-dsl.md` -> matched all three usage-site anchors.
5. `grep -E "stop_policy_parsability|storylet_predicate_dsl_parsability" .claude/skills/storylet-pool-authoring/templates/predicate-dsl.md` -> matched both validator references.
6. `grep -E "forbidden_mystery_resolution_risk|Rule 7|Mystery Reserve" .claude/skills/storylet-pool-authoring/templates/predicate-dsl.md` -> matched the predicate and Rule 7 firewall prose.
7. `grep -cE "^- pred: " .claude/skills/storylet-pool-authoring/templates/predicate-dsl.md` -> `40`.
8. `grep -E "(stop_policy|normal_exits|interrupt_before|safety_valves)" .claude/skills/storylet-pool-authoring/templates/predicate-dsl.md | wc -l` -> `11`.
9. `grep -E "stop_policy|stop predicates|third tier" .claude/skills/storylet-pool-authoring/SKILL.md .claude/skills/storylet-pool-authoring/references/phase-3-structured-drafting.md .claude/skills/storylet-pool-authoring/references/phase-4-5-canon-safety-checks.md .claude/skills/storylet-pool-authoring/references/governance-and-foundations.md | wc -l` -> `12`.
10. Manual review confirmed the third-tier section, all 19 args schemas, safety-valve non-predicate distinction, closed-vs-open args distinction, SPEC-22 validator deferral, and same-skill transition disclosure.

## Deviations

1. Reassessment absorbed minimal same-seam disclosure updates in `storylet-pool-authoring/SKILL.md` and three `storylet-pool-authoring/references/*` files. The drafted ticket listed only `templates/predicate-dsl.md`, but leaving those references precondition-only would have made the live skill misleading after the grammar extension.
2. The ticket remains schema-text / skill-reference-only. No TypeScript `stop_predicate` enum, validator implementation, runtime stop-condition evaluator, or SPEC-21 operational authoring rewrite landed here.
