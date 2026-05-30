# Phase 1: Diagnose Coverage Gaps (`direct_batch`) OR Load RSP Cards (`audit_repair`)

When choosing `hard.preconditions[]` predicates, follow §11a "Character-Fit Selection Contract" in `.claude/skills/_shared-templates/story-state-contract.md`. Global-author-pool SLTs (`scope.visibility: global_author_pool`) express character relevance through existential current-state predicates (`any_plan_active`, `any_emotion_active`, `any_relationship_axis`, `any_belief`, `affordance_available_to`), role-keyed predicates, or driver-record overlap — never through direct `record_active(STCHAR-<integer>)`. The direct-STCHAR form is reserved for `branch_scoped` and `branch_prefix_scoped` visibility, where a specific character's stable authority is the reason the block exists.

**`direct_batch`**: Analyze the current SLT pool against 17 coverage targets — 14 causal-function targets (#1–#14), cast-role coverage (#15), and trigger-map composition coverage (#16–#17):

1. Recovery block (for violence / death / sex / betrayal outcomes)
2. Belief-repair block (after deception or public discovery)
3. Movement / evasion block
4. Bond-shift or status-shift block (intimacy, conflict, alliance, severance)
5. Consequence-resolution block (delivering on a pending `CNSQ`)
6. Decision or terminal-setup block
7. Fallback continuation block (proceeds when no specific block matches)
8. Information-seeking / investigation block
9. Disclosure block
10. Opposition / refusal block
11. Negotiation / resource-exchange block
12. Clock-advancing block (`clock_advancing`) — advances an active `CLK` through `tick_pressure_clock` or resolves a clock through `resolve_pressure_clock` when the page's action matures staged pressure. Prefer `any_clock_active(alias, kind?, salience?)` plus `record_age(...)` when authoring global-pool blocks that should find eligible clocks without naming branch-local ids.
13. Clue-discovering block (`clue_discovering`) — discovers, suppresses, or makes actionable a `STSEC.clue_carriers[]` entry through `mark_secret_clue_discovered` or related secret-handling effects. Prefer `secret_unrevealed(STSEC-<integer>)`, `revelation_ready(STSEC-<integer>)`, or `any_secret_unrevealed(alias, salience?, kind?)` according to whether the block is branch-scoped or author-pool.
14. Setup-paying-off block (`setup_paying_off`) — answers, pays off, complicates, or intentionally abandons an open `STQ` through `answer_story_question` or `abandon_story_question`. Prefer `story_question_open(STQ-<integer>)`, `story_question_status(STQ-<integer>, status)`, `any_story_question_open(alias, salience?, setup_kind?)`, and `promise_due(STQ-<integer>, age_pages)` according to scope.
15. Cast-role coverage — for each active `STENT` whose `role_in_story` includes a pressure-bearing role (`pressure_source`, `opposing_actor`, `authority`, `dependent`, or `information_source`), the bundle SLT pool should carry at least one block that engages that role's authoring lane. Surface unrepresented roles in the gap diagnosis.

    Per-role authoring-shape cues (each derived from the `_shared-templates/story-record-schemas.md` §4.4b STENT role operational definition; the same shapes also serve as gap-diagnosis lenses):

    - **`pressure_source`** (entity exerts pressure on the bundle's primaries through its own present or imminent activity): engaged by `world_pressure` / `pursuit` / `status_shift` blocks that hard-gate on a `THR` / `STINT` / `CNSQ` of the pressure source, or by `any_thread_active(participant_role=pressure_source)` / `any_intention(holder_role=pressure_source)` existential predicates. Offstage pressure_sources (`entity_status.location: offstage`) are not exempt — their offstage activity is a legitimate authoring lane via intrusion-shaped (`world_pressure` family), looms-without-arriving-shaped (`status_shift` family), or pursuit-shaped (`pursuit` family) blocks. The shared contract §8 already documents the parallel renderer-side `offstage_causal` discipline at §16a; this criterion is the author-side counterpart.
    - **`opposing_actor`** (entity actively resists or pressures a primary actor's goals): engaged by `conflict` / `pursuit` / `evasion` move-family blocks that hard-gate on a `THR` / `SREL(axis=hostility)` / `STINT` of the opposing actor, or by `any_relationship_axis(axis=hostility, comparator=">=", value=medium, participant_role=opposing_actor)` existential predicates.
    - **`authority`** (entity can grant, deny, enforce, or legitimate permissions and consequences): engaged by `world_pressure` / `ritual_protocol` / `status_shift` / `negotiation` blocks that hard-gate on a `THR` carrying the authority's reach, an `OBL` owed to the authority, or `any_relationship_axis(axis=power_imbalance | obligation | approval, participant_role=authority)` / `any_obligation_open(owed_to_role=authority)` predicates.
    - **`dependent`** (entity whose safety, access, or agency depends on another actor or institution): engaged by `protection` / `negotiation` / `evasion` blocks that hard-gate on `any_intention(holder_role=dependent)`, `any_obligation_open(owed_by_role=dependent)`, or `any_belief(holder_role=dependent)` predicates.
    - **`information_source`** (entity is a likely source of branch-relevant knowledge): engaged by `investigation` / `disclosure` blocks that hard-gate on `any_secret_unrevealed` (when the source carries an STSEC), `any_belief(holder_role=information_source, mode=knows|believes)`, or exact `belief_record(holder, BEL-N)` predicates.

    **Determinism rule.** A role lane is *engaged* when at least one pool SLT names the role in a precondition role-filter (`holder_role` / `owed_by_role` / `owed_to_role` / `participant_role`), or when an exact `record_active(...)` / `belief_record(holder, ...)` / `obligation_open(...)` / similar hard predicate over the role's defining record class is present. Implied engagement through a counterparty role (e.g., `owed_by_role=dependent` is **not** treated as engagement of the implicit `authority` counterparty) is NOT engagement; surface the unengaged role explicitly. The check is mechanical against the `preconditions[]` fields already loaded at pre-flight step 4(i) — no operator judgment.

    **Worked example (SLB-4 case).** STENT-3 carries `pressure_source, authority`. Pool SLT-23 hard-gates on `any_obligation_open(owed_by_role=dependent)` (engaging STENT-2's `dependent` role) but does NOT name `authority` in a role-filter; STENT-3's `authority` lane is therefore unengaged by SLT-23. Diagnosis: `dependent` engaged via SLT-23; `authority` unengaged until a block names it directly (e.g., a new SLT hard-gating on `any_relationship_axis(axis=obligation, participant_role=authority)` or `any_obligation_open(owed_to_role=authority)`).

16. **Driver-kind composition coverage** — for each driver-kind value triggered by the bundle's active records per SPEC-80 §3.1's trigger map, the pool must contain at least one SLT whose `grounding.compatible_turn_drivers[]` includes that value.

17. **Pressure-source-class composition coverage** — for each load-bearing active-record class triggered per SPEC-80 §3.2's trigger map, the pool must contain at least one SLT whose `preconditions.hard[]` or `preconditions.soft[]` references that class via the appropriate existential predicate or literal record-id.

The joint composition rule (SPEC-80 §3.3) applies: for each (driver-kind, source-class) pair the bundle demands, at least one SLT must satisfy BOTH.

**Read paths.** Two distinct reads cover this check:

(a) **Bundle-state load** (the DEMAND side — enumeration of active records that trigger the §3.1 / §3.2 maps): use `story_bundle_context` plus targeted `mcp__worldloom__get_records` / `mcp__worldloom__list_records` per `references/pre-flight-and-prerequisites.md` §Pre-flight Check step 6, which already enumerates active cast STENT ids and currently-open obligations / consequences / threads.

(b) **SLT-pool load** (the SUPPLY side — projection of current pool storylets to check coverage against demand): use the pool-wide inventory already loaded in `references/pre-flight-and-prerequisites.md` §Pre-flight Check step 4(i) for `direct_batch`. This is the correct tool for pool-wide coverage projection: it returns all bundle SLTs with the projected/parent-object fields and is not filter-narrowed to one parent page. The `select_storylet_candidates` per-page eligibility shortlist (`references/pre-flight-and-prerequisites.md` §Pre-flight Check step 4(ii) when mutation planning is in scope) is the right tool for selecting WHICH existing block to extend at a specific page, not for pool-wide coverage diagnosis — its filter pipeline narrows the projection to eligibility at the named parent page + driver and so under-counts the pool when used for coverage. Use `include_full_body=true` only when full SLT bodies are needed for mutation-targeted analysis beyond the projected and parent-object fields.

Identify which coverage targets are absent or under-represented in the current projection pool. Use the returned inventory fields for gap diagnosis: `move_family` for causal-function coverage, `grounding.compatible_turn_drivers` for driver-kind coverage, predicate classes computed from `preconditions.hard[]` / `preconditions.soft[]` for active-record-class coverage, and action families computed from `exit_options[]` for exit-option coverage. If a `focus` hint was supplied, weight gap diagnosis toward the named focus area (the Phase 4 diversity gate still enforces minimum spread regardless). Retrieve full SLT bodies only when a selected existing block needs mutation planning detail that the projection record does not carry.

**Grounding-strength and under-representation.** Coverage is not binary on a mature pool. For each target, compute `coverage_strength` from the pool projection's `preconditions` (already loaded; no extra retrieval): a target is `hard` when at least one pool SLT references the target's record class / move via `preconditions.hard[]` (a selection gate that is *guaranteed* to fire the move when the matched record is active), `soft_only` when the only pool references are in `preconditions.soft[]` (a ranking preference the selector may route around indefinitely — the move is never selection-guaranteed), and `none` when no pool SLT references it. A target with `status: covered` but `coverage_strength: soft_only` is reported as **under-represented**, not silently "covered." Two target families gate this differently:

- **Foundational-capacity targets — recovery (#1) and consequence-resolution (#5).** These capacities must exist in the pool *before* the outcomes that need them arise, because the bundle is guaranteed to generate fear / violence / betrayal / death outcomes (needing recovery) and pending consequences (needing delivery) as it advances. They are reported as a gap (`coverage_strength: none`) or under-represented (`coverage_strength: soft_only`) **regardless of whether a matching record is active right now** — parallel to the bundle-scoped recovery requirement in Phase 4 check 2, and to FOUNDATIONS §Rule 5 (No Consequence Evasion): a pool that only `soft_only`-covers delivery of a pending `CNSQ` can route around a matured consequence forever (analogous to the `storylet_permanently_inert` concern). Hard-firing capacity, not mere label presence, is the load-bearing property here.
- **Contingent-pressure targets — everything else (axis / role / specific-record lanes, source-class composition #17).** A target is **under-represented** when either (a) its only pool coverage is `soft_only` while its triggering record class is *active in the bundle*, or (b) it is covered by a single block while the bundle carries a high-salience active record in that lane (a `high`-urgency `THR` / `OBL` / `CNSQ`, or a `high`-salience `CLK` / `STSEC` / `STQ`). The three SPEC-42 conditional targets keep their carve-out: a contingent target whose triggering record class has **zero** active records in the bundle is neither a gap nor under-represented, regardless of `coverage_strength`.

Under-represented targets are eligible `direct_batch` authoring lanes even when `status: covered`.

**Saturation verdict (three-state).** Phase 1's saturation read produces a three-state `pool_saturation` enum (widened from a binary flag) combining Pass A's pool-wide 17-target diagnosis with Pass B's moment-fit-lane diagnosis (Pass B is defined below; both passes feed this verdict):

- `false` — Pass A or Pass B (or both) found gaps; the saturated-pool advisory does not fire. Depth-criteria checklist lanes (below) may still apply for any under-representation found. Author normally against the gaps and under-representations surfaced by the two passes.
- `pool_only` — Pass A clean (every applicable target at `status: covered` with `coverage_strength: hard`, no under-representation), but Pass B emitted `moment_fit_lanes[]`. Pool is target-saturated against the pool-wide check but NOT fit to the moment signature. Author against the moment-fit lanes (Phase 2 reads each lane's `lane_id` and translates to existential predicates per `references/phase-2-draft-blocks.md` §"Authoring against moment-fit lanes"); the existing depth-criteria checklist lanes apply alongside as secondary labels when a block's hard preconditions also match a depth lane.
- `moment_and_pool` — Pass A clean AND Pass B clean (no moment_fit_lanes emitted). Pool is fit to both pool-wide check and the moment signature. Triggers the §Early-termination verdict below when the operator supplied no `focus` hint and `target_count` was defaulted.

Authoring the full `target_count` onto a saturated pool risks redundant, non-load-bearing storylets — in tension with FOUNDATIONS §Story Bundles §5b (every story-bundle record must be load-bearing; each block costs LLM tokens at authoring and at every retrieval). The Phase 6 deliverable summary surfaces the verdict so the operator can choose: in the `pool_only` state, author against moment-fit lanes; in the `moment_and_pool` state, defer to the early-termination verdict (no-batch by default; operator override via `focus` or explicit `target_count` proceeds with a strong advisory).

CBAUTH-005's existing depth-criteria-lane labeling is preserved alongside the new moment-fit-lane labeling — both are valid lane vocabularies; the per-block label vocabulary documented at SKILL.md Phase 6 sub-step 3 includes both families.

**Depth-criteria checklist for saturated-pool authoring.** When authoring depth blocks against a target-saturated pool (no under-representation criterion firing on the target the new block addresses), each new block must map to one of the depth-criteria lanes below. The lanes are computable from the pool projection already loaded at pre-flight step 4(i) — `move_family` counts, action-family counts across `exit_options[]`, hard-vs-soft predicate distribution, and pressure-shape patterns — no new retrieval. The set is not exhaustive; author judgment may identify additional legitimate lanes, but those must carry the explicit "no documented lane; authorial judgment" flag in the Phase 6 deliverable summary (see `SKILL.md` Phase 6 sub-step 3):

- **`action_family_combo`**: a block whose `exit_options[].action_family` set is a combination not covered by any single existing pool block (e.g., `transfer` + `protect` for no-strings protection-by-resource-transfer; `harm` + `protect` + `evade` for hazard-contest with shield options). The combo, not any single action family, is what is new.
- **`specific_pressure_shape`**: a block whose preconditions narrow a generically-covered `move_family` to a specific high-urgency `THR` / `OBL` / `CNSQ` / `SREL` shape — e.g., `transformation` narrowed to a specific high-urgency "protect or possess" `THR` collapse, distinct from a generic `transformation` block that any active thread can fire.
- **`single_block_move_family`**: a second block in a `move_family` currently covered by exactly one pool SLT, with a distinct trigger profile (different precondition shape, different driver-kind set, different role-filter posture). Targets monopolistic move-family coverage as a saturation-resilience lane.
- **`action_family_single_block`**: a second block whose `exit_options[].action_family` set includes an action family currently appearing in exactly one pool block's exits (e.g., `harm` previously only in SLT-12), giving that action family non-monopolistic coverage.
- **`paired_pressure_shape`**: a block whose hard preconditions pair two active-state classes the existing pool covers individually but not jointly (e.g., `any_thread_active` + `any_clock_active(kind=exposure)` for a hazard-with-exposure conflict block).
- **`hard_grounding_lane`**: a block that adds *hard*-grounded selection on a triggering record class currently covered only via existing pool blocks' `soft` predicates (lifts the per-target `coverage_strength` from `soft_only` to `hard` at the pool level). Overlaps with under-representation criterion (a) but extends it: any target whose pool coverage has zero hard-grounding SLTs is a hard-grounding lane regardless of whether the triggering class is active.

The diagnosis may optionally extend the working-memory `coverage_diagnosis` YAML shape with a per-planned-block `depth_lanes_addressed: [<lane-name>]` field. The field is working-memory-only and is not written to the SLB manifest (the manifest keeps coverage as inline prose per the manifest's existing rule).

**Pass B — Moment-fit gap diagnosis.** Pass B consumes the `moment_signature` artifact emitted by pre-flight step 4(iii) (CBAUTH-007) and walks the pool projection against it to surface moment-fit gaps. Pass B is skipped when `moment_signature_skipped: true` (no committed PG yet — post-bootstrap, pre-PG-2) and skipped entirely for `audit_repair` mode (RSP cards already prescribe targets). Pass B is computable from the pool projection already loaded at pre-flight step 4(i) + the `moment_signature` artifact from step 4(iii); no new MCP retrieval is added.

The 4-step procedure:

1. For each `move_family` value (16-value enum per shared contract §4.4), count pool SLTs that hard-fire on the signature's `active_high_salience_records` (i.e., hard precondition referencing one of those records' classes, urgencies, or role-filters). Under-represented move_families with active high-salience records targeting them emit a `moment_fit_lane` named `move_family_under_represented_at_moment:<move_family>`.

2. For each `supersession_set` entry, check whether the pool carries a block whose hard preconditions match the *new* (post-supersession) record's shape (e.g., for a THR supersession with axis "protect/possess collapse": any pool SLT hard-gating on `any_thread_active(tag~="protect", urgency=high)` AND `any_relationship_axis(axis=desire, value=high)`). If zero, emit a `moment_fit_lane` named after the supersession axis (e.g., `protect_possess_collapse_under_desire`).

3. For each `dominant_action_family` in `forward_affordance_fingerprint`, check pool SLTs whose `exit_options[].action_family` includes that family AND whose hard preconditions intersect the `active_high_salience_records` set. If under-represented, emit a `moment_fit_lane` named `<dominant_family>_under_<dominant_active_pressure_axis>` (e.g., `negotiation_under_door_or_leash_belief`).

4. For each non-empty `cast_role_engagement_at_moment` entry, check whether a pool SLT names that role in a precondition role-filter (per the existing cast-role determinism rule in target #15). Augments target #15 with moment-anchored urgency: a role exercised by the signature with no engaging SLT IS a moment-fit gap; a role unengaged-by-the-moment that has a pool block hard-gating on it elsewhere is NOT (emit a `moment_fit_lane` named after the role and the active pressure shape, e.g., `authority_reach_at_offstage_pressure_source`).

The signature is shape extraction, not id binding; Pass B's `lane_id` naming MUST reference predicate-class / urgency / role / axis / action-family shapes rather than branch-local record ids (preserves Character-Fit Selection Contract §11a discipline). The lane is consumed by Phase 2 authoring (see `references/phase-2-draft-blocks.md` §"Authoring against moment-fit lanes" for the lane_id → predicate-shape translation patterns).

**Early-termination verdict.** When `pool_saturation == "moment_and_pool"` AND the operator supplied no `focus` hint AND `target_count` was either defaulted to 6 OR not supplied (operator gave no explicit count), Phase 1 emits an `early_termination` verdict that skips Phase 2 / Phase 3 / Phase 4 / Phase 5 / Phase 6 patch-envelope construction. The HARD-GATE still fires on the no-batch verdict — the deliverable summary surfaces the verdict, the examined lanes, and suggested overrides so the user can choose: approve "no batch authored" (HARD-GATE confirms termination), or reject and re-invoke with `focus` / `target_count` override. This preserves the single-approval-surface discipline — the user explicitly approves "no batch" rather than the skill silently terminating.

Working-memory shape:

```yaml
early_termination:
  fired: true
  reason: moment_already_covered            # | pool_saturated_no_focus (existing advisory escalated)
  examined:
    pool_targets_covered_hard: 17
    moment_fit_lanes_examined: [<lane>, ...]
    moment_fit_lanes_already_covered: [<lane>, ...]
  suggested_overrides:
    - {invocation: "focus='<lane-name>'", effect: "author depth blocks targeting that moment lane"}
    - {invocation: "target_count=<N>", effect: "author N depth blocks despite moment coverage"}
```

Firing conditions (ALL must hold):

- (a) `pool_saturation == "moment_and_pool"`
- (b) no `focus` hint supplied
- (c) `target_count` either defaulted to 6 OR not supplied (operator gave no explicit count)

When the operator supplied `focus` OR explicit `target_count`, early-termination does NOT fire — the skill proceeds normally with a strong advisory in the Phase 6 deliverable summary noting the moment is covered and the batch is depth-fill at operator override.

Use the existential predicates in the predicate DSL for global-pool social-state and SPEC-42 mechanism coverage. The function-call forms below are notation only; emitted `SLT.preconditions.hard | soft` entries are flat predicate objects per shared contract §5. Prefer existential social-state predicates with `urgency?` filters such as `any_obligation_open(alias, kind?, urgency?, owed_by_role?, owed_to_role?)`, `any_consequence_pending(alias, kind?, urgency?, derived_from?)`, `any_thread_active(alias, tag?, urgency?)`, `any_relationship_axis(alias, axis, comparator, value, participant_role?)`, `any_belief(alias, holder_role?, mode?, truth_relation?, visibility?)`, and `any_intention(alias, holder_role?, urgency?)` for global-pool blocks that address high-salience debts, relationships, beliefs, threads, and intentions without naming branch-local record ids. Prefer the SPEC-42 existential predicates `any_clock_active(alias, kind?, salience?)`, `any_secret_unrevealed(alias, salience?, kind?)`, and `any_story_question_open(alias, salience?, setup_kind?)` for global-pool blocks that advance active clocks, reveal or prepare story secrets, or pay off open setups. Pick stable aliases that describe the matched record's role in the block, for example `urgent_debt`, `pending_fallout`, `trust_edge`, `public_belief`, `open_intent`, `active_clock`, `hidden_secret`, or `open_setup`.
The three SPEC-42 coverage targets are conditional authoring targets: when a bundle has no active `CLK`, `STSEC`, or `STQ` records, do not warn merely because no block covers the absent class. When those records exist and are under-represented in the current SLT pool, surface the missing coverage in the Phase 1 diagnosis and draft at least one matching block unless the focus hint and Phase 4 diversity constraints justify deferring it.

Output: a list of `target_count` planned blocks, each with a `move_family` value from the 16-value enum (per shared contract §4.4 SLT schema) and a brief draft scope (preconditions sketch, beat outline, effects shape).

**Output shape** (unified Phase 1 gap-diagnosis output covering all 17 coverage targets — the per-target `coverage_diagnosis` block carries per-target status and resolution mapping for targets #1–#17; the `driver_kind_coverage` / `pressure_source_coverage` / `composition_gaps` blocks specialize targets #16 / #17 with the SPEC-80 trigger-map detail). This YAML shape is **working-memory diagnosis only** — do not copy it verbatim into the Phase-5 SLB manifest, which records coverage as inline prose (see `phase-5-batch-manifest.md`):

```yaml
coverage_diagnosis:
  # one entry per coverage target (targets #1–#17 enumerated above).
  # status: covered | gap.
  # coverage_strength: hard | soft_only | none — computed from pool projection preconditions (hard[] vs soft[]); see "Grounding-strength and under-representation" above.
  # under_represented: true when status is covered but coverage_strength is soft_only with an active triggering class, or single-block coverage of a high-salience active lane.
  # addressed_by_blocks lists the new SLT ids that resolve each gap or under-representation (empty list when covered, hard, and not under-represented).
  - {target_id: 1, target_name: "recovery", status: gap, coverage_strength: none, under_represented: false, addressed_by_blocks: [SLT-NEW-3]}
  - {target_id: 2, target_name: "belief_repair", status: covered, coverage_strength: hard, under_represented: false, addressed_by_blocks: []}
  - {target_id: 4, target_name: "bond_or_status_shift", status: gap, coverage_strength: none, under_represented: false, addressed_by_blocks: [SLT-NEW-1]}
  - {target_id: 5, target_name: "consequence_resolution", status: covered, coverage_strength: soft_only, under_represented: true, addressed_by_blocks: [SLT-NEW-7]}   # foundational-capacity target: soft-only CNSQ coverage is under-represented regardless of whether a CNSQ is active now (FOUNDATIONS Rule 5; parallel to bundle-scoped recovery in Phase 4 check 2)
  - {target_id: 10, target_name: "opposition_refusal", status: gap, coverage_strength: none, under_represented: false, addressed_by_blocks: [SLT-NEW-2]}
  - {target_id: 12, target_name: "clock_advancing", status: gap, coverage_strength: none, under_represented: false, addressed_by_blocks: [SLT-NEW-4]}
  - {target_id: 13, target_name: "clue_discovering", status: gap, coverage_strength: none, under_represented: false, addressed_by_blocks: [SLT-NEW-5]}
  - {target_id: 14, target_name: "setup_paying_off", status: gap, coverage_strength: none, under_represented: false, addressed_by_blocks: [SLT-NEW-6]}
  - {target_id: 15, target_name: "cast_role_coverage", status: covered, coverage_strength: hard, under_represented: false, addressed_by_blocks: []}
  # ... (one entry per target; covered entries also recorded with coverage_strength + under_represented for completeness)
moment_signature: {<echoed pre-flight artifact from CBAUTH-007 step 4(iii), for audit-trail traceability into the Phase 6 deliverable summary>}
moment_fit_diagnosis:
  signature: <embedded moment_signature>
  moment_fit_lanes:
    - {lane_id: "<name>", source: <supersession_set | forward_affordance+active_high_salience | cast_role_engagement | move_family_under_represented_at_moment>, addressed_by_blocks: [SLT-NEW-<N>, ...]}
  moment_signature_skipped: false
  moment_signature_skip_reason: null
pool_saturation: false   # widened from bool to three-state enum: false | pool_only | moment_and_pool. See §Saturation verdict (three-state) above for firing rules. Truthy values ("pool_only" / "moment_and_pool") both mean "saturated against pool-wide check"; "moment_and_pool" additionally means Pass B emitted no lanes; surfaces the saturated-pool advisory in the Phase 6 deliverable summary.
early_termination:
  fired: <true | false>
  reason: <moment_already_covered | pool_saturated_no_focus | null>
  examined: {pool_targets_covered_hard: <int>, moment_fit_lanes_examined: [...], moment_fit_lanes_already_covered: [...]}
  suggested_overrides: [...]
driver_kind_coverage:
  triggered_kinds: [player_action, npc_action, clock_fire]
  uncovered_kinds: [npc_action]   # bundle has active STPLAN/STEMO but no SLT with grounding.compatible_turn_drivers: [..., npc_action, ...]
pressure_source_coverage:
  triggered_classes: [STPLAN, STEMO, CLK, OBL]
  uncovered_classes: [STEMO]      # bundle has active STEMO but no SLT with any_emotion_active or literal STEMO-N reference
composition_gaps:
  - {driver: npc_action, source: STPLAN}
  - {driver: npc_action, source: STEMO}
```

Apply the SPEC-80 §3.1 trigger map to bundle state to derive demanded driver-kinds, the SPEC-80 §3.2 trigger map to derive demanded source-classes, and the SPEC-80 §3.3 composition rule to derive demanded pairs. Walk the SLT pool's projected `grounding.compatible_turn_drivers` to compute covered driver-kinds, compute covered source-classes from projected parent `preconditions.hard[]` / `preconditions.soft[]` or full-body preconditions when mutation planning already required them, and use the intersection of a single SLT's driver and predicate coverage to compute covered pairs. Emit at most the top 20 composition gaps by triggering-record count when the full gap list would be longer.

**`audit_repair`**: For each `RSP-<integer>` card in `finding_ids`, extract:

- `repair_kind` — `commitment_block | turn_repair | prose_revision | promotion | branch_flag`. This skill handles ONLY `commitment_block`; cards with other kinds produce a warning ("RSP-<integer> is repair_kind=`<X>`; not handled by commitment-block-authoring; recommend `<sibling-skill>` instead") and are skipped (audit-trail preserved in Phase 5's manifest).
- `target_records` — records the block should engage with
- `target_branch` — `BR-<integer>` or null (author-pool when null)
- `rationale` — natural-language reason from the audit
- `suggested_block_move_family` — from the 16-value `move_family` enum
- `visibility` — `global_author_pool | branch_scoped`

Each commitment-block-kind card maps 1:1 to one planned block.

If an author-pool RSP targets an open social-state record class covered by the existential predicates (`OBL`, `CNSQ`, `THR`, `SREL`, `BEL`, or `STINT`), translate the repair into an actor-unbound existential predicate rather than copying a branch-local record id into the `SLT`. Use the RSP's `target_records` and rationale to choose filters (`kind`, `urgency`, role, axis, belief mode, truth relation, or visibility) and bind the matched record to an alias. Branch-scoped RSP repairs may use exact-ID predicates when the target branch owns those records.
