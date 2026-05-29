---
name: branching-story-turn-cycle
description: "Use when advancing a branching-story bundle by one causal tick from any parent page — continuation or fork. Produces: one SE event + new/superseding story-bundle records (STSTAT/STENT/STINT/SF/BEL/OBL/CNSQ/THR/CLK/STSEC/STQ/STPLAN/STEMO/SREL/STLOC/STOBJ/DA as needed) + optional new BR (fork) + new PG with full state snapshot + optional JIT SLT + 0-5 new CHC + bundle INDEX.md update. Mutates: only worlds/<world_slug>/stories/<story_slug>/."
user-invocable: true
arguments:
  - name: world_slug
    description: "Existing world directory slug under worlds/"
    required: true
  - name: story_slug
    description: "Existing story bundle slug under worlds/<world_slug>/stories/"
    required: true
  - name: parent_page_id
    description: "PG-<integer>; any committed page in the bundle. Continuation is implicit when parent is the active branch leaf; fork is implicit when parent is any non-leaf page or a sibling-branch leaf."
    required: true
  - name: chosen_choice_id
    description: "CHC-<integer> emitted by parent_page_id. Required only for action_source_mode: resolve_selected_choice; forbidden for resolve_write_in and advance_initiative."
    required: false
  - name: manual_action_text
    description: "Natural-language player write-in. Required only for action_source_mode: resolve_write_in; forbidden for resolve_selected_choice and advance_initiative."
    required: false
  - name: execution_mode
    description: "authoring | interactive_runtime | batch; default: authoring"
    required: false
  - name: action_source_mode
    description: "resolve_selected_choice | resolve_write_in | advance_initiative | repair_turn. Orthogonal to execution_mode: governs what source drives this turn. resolve_selected_choice requires chosen_choice_id and no manual_action_text; resolve_write_in requires manual_action_text and no chosen_choice_id; advance_initiative requires neither player action field; repair_turn is reserved for system_repair / audit_repair flows."
    required: false
  - name: force_branch_id
    description: "When intentionally forking into a named branch; otherwise the skill derives BR-<integer> from continuation-vs-fork detection"
    required: false
  - name: accept_parent_unrendered
    description: "true | false; default: true. Setting false aborts Pre-flight when pages-prose/<parent_page_id>.md is absent. Default true honors FOUNDATIONS §Story Bundles §4a (Plan-Authority Boundary)."
    required: false
---

# Branching Story Turn Cycle

Advance a branching-story bundle by one causal tick from any committed parent page — continuation or fork. Evaluates a chosen `CHC`, write-in, or non-player initiative source, applies world logic to route the selected driver from authoritative story records, commits the resulting state delta, materializes the next page snapshot, and emits the next choices. Parent rendered prose is optional. Gate 9 (Turn-Driver Lawfulness) validates the selected `SE.turn_driver`, `driver_records[]`, and POV visibility directly on the emitted `SE` / `PG` records.

This skill's `repair_turn` mode is for repairs that are themselves a causal tick and therefore need a new `SE`, `PG`, and choice/state continuity work. For bounded append-only story-state maintenance where no fictional turn occurred, use `mcp__worldloom__plan_story_state_maintenance` with the committed `parent_page_id`; it returns a review-only patch plan containing the maintenance records plus an audit/system repair `SE` and forkable maintenance `PG`. Validate, approve, sign, and submit that plan through the normal patch-engine flow. Pre-existing orphan records from older maintenance runs still need an operator-driven backfill maintenance PG or a bundle-specific annotation; do not fold them into a fictional `repair_turn` unless the repair is a real causal tick.

<HARD-GATE>
Do NOT update `worlds/<world_slug>/stories/<story_slug>/INDEX.md`, AND do NOT submit any patch plan to `mcp__worldloom__submit_patch_plan`, until:

(a) Pre-flight Check has completed: bundle resolved at `worlds/<world_slug>/stories/<story_slug>/`; `STORY_KERNEL.md` loaded, including `## Player Agency Contract`; parent page loaded from `_source/pages/<parent_page_id>.yaml`; `action_source_mode` resolved and validated against player action inputs (`resolve_selected_choice` requires exactly `chosen_choice_id`; `resolve_write_in` requires exactly `manual_action_text`; `advance_initiative` requires both absent; `repair_turn` names a repair source explicitly); chosen CHC belongs to parent and is not retired when present; continuation-vs-fork detected; ids allocated via `mcp__worldloom__allocate_next_id`; context packet loaded via `mcp__worldloom__get_context_packet(world_slug, task_type='story_turn_cycle', ...)` OR equivalent per-record / per-class retrieval per `references/pre-flight-and-prerequisites.md` step 9 (direct `Read` of individual `_source/<class>/*.yaml` files is the slower-but-permissible alternative when the active-record set is known and bounded); parent prose policy verified; active STCHAR summaries loaded from `story_bundle_context.active_story_characters`, cross-checked against `parent.state_snapshot.active_records.STCHAR`, and full/projected STCHAR sections retrieved via `mcp__worldloom__get_record(record_id='STCHAR-<integer>', section_path='body.<section-name>')` before any persona, voice, appraisal, pressure-behavior, relationship conduct, perception, embodiment, agency, choice, plan, or emotion derivation. **Direct `Read` on STCHAR `.md` hybrid files is NOT a sanctioned fallback** (unlike `_source/<class>/*.yaml` records where direct Read remains slower-but-permissible per Pre-flight step 9) — `section_path` projection is the only mechanism that delivers the targeted operational sections without loading the audit-only Source Distillation and frontmatter content.

(b) Phases 0-8 have completed in working memory: exactly one driver selected for the turn; action resolved to exactly one of six outcome routes (`accept | accommodate | attempt | world_block | promotion_hold | terminal`) when the driver is player-sourced, or Phase 1 skipped when the driver is non-player; commitment block selected from the author pool OR a branch-scoped JIT block created; parent `PG.state_snapshot.active_records` and every material parent-active story record needed for delta reasoning retrieved through `mcp__worldloom__get_record`, `mcp__worldloom__get_records`, or `mcp__worldloom__get_context_packet(..., story_slug=...)`; state delta drafted from those records (creates / supersessions via new record files carrying `supersedes:`); mandatory BEL updates drafted per FOUNDATIONS §Story Bundles §6a; STPLAN/STEMO lifecycle updates drafted when the event changes belief basis, resource basis, blockers, plan status, or causal affective state; any newly introduced non-background individual has either an active bound STCHAR or the run stops with `blocked_requires_stchar` before committing meaningful STENT/SE/PG/CHC state; parent-page canon-baseline drift classified per FOUNDATIONS §Story Bundles §4b; mystery and canon authority classified per shared contract §11; `SE-<integer>` and planless `PG-<integer>` drafted with full `state_snapshot`, including `active_records.STCHAR` when relevant, and `validation_trace`; next `CHC` records drafted (3-5 for commitment-hinge stop; 1 for continue-or-pause; 0 for terminal).

(c) Phase 8 has validated all 9 shared hard gates per `.claude/skills/_shared-templates/story-state-contract.md` §7 with a one-line PASS rationale per gate on `PG-<integer>.validation_trace`, plus the 15 turn-cycle-additional checks (action source legality, entity death/incapacity reconciliation, belief/visibility coverage, expected witness tag presence, write-in world-logic rationale, Selection Rationale, Motivation Grounding, causal dependency threat scan, choice-set noncollapse, Choice Consequence Integrity, Canon Baseline Drift, mid-story introduction grounding, fresh entity status pairing, relationship participant grounding and observer access, and narrative-shape field rejection), and the Phase 9 dry-run has returned zero `fail` verdicts from record-based validators including `record_schema_compliance`, `snapshot_replay_equality`, state-delta grounding, active-pressure handling, and turn-driver lawfulness.

(d) The user has explicitly approved the deliverable summary (branch label, resolved outcome route, state delta inventory by class, commitment block used, emitted choices list, any `SE.promotion_claims[]` requiring a follow-up `story-fact-promotion-to-canon` invocation).

This gate is authoritative under Auto Mode or any other autonomous-execution context — invoking this skill does not constitute approval of the deliverable summary.
</HARD-GATE>

## Process Flow

```
Pre-flight Check (load FOUNDATIONS + contract;
  resolve bundle; load parent PG; validate action_source_mode; detect
  continuation vs fork; verify parent prose policy; allocate ids;
  load context — parent state_snapshot + optional recent prose +
  Mystery Reserve + Invariants + active STCHAR)
        |
        v
Phase 0: Evaluate due drivers → selected turn_driver
        |
        v
Phase 1: Resolve player action → outcome_route
  (Phase 1 is skipped for non-player drivers)
        |
        v
Phase 2: Select or JIT-create commitment block → SLT
        |
        v
Phase 3: Apply state delta → creates/supersessions/closes, or block-and-route if
  a complex new character lacks active STCHAR (in memory)
        |
        v
Phase 4: Update new-class state + belief and visibility state →
  CLK ticks, STSEC reveals, STQ advancement, STPLAN / STEMO lifecycle,
  BEL records (in memory)
        |
        v
Phase 5: Classify mystery and canon authority
        |
        v
Phase 6: Materialize next page snapshot → SE-<integer> + PG-<integer> (in memory)
        |
        v
Phase 7: Generate next choices → CHC records (in memory; 0 for terminal)
        |
        v
Phase 8: Validate against shared 9 hard gates + 15 turn-cycle-additional;
  compute final PG state_hash per shared contract §4.2a
        |
        v
Phase 9: HARD-GATE fires → atomic patch + INDEX update
```

## Inputs

### Required

- `world_slug` — string — existing world directory slug under `worlds/`
- `story_slug` — string — existing story bundle slug under `worlds/<world_slug>/stories/`
- `parent_page_id` — `PG-<integer>` — any committed page in the bundle

### XOR-required (exactly one)

- `chosen_choice_id` — `CHC-<integer>` emitted by `parent_page_id` and not retired
- `manual_action_text` — natural-language player write-in

### Optional

- `execution_mode` — enum — `authoring | interactive_runtime | batch`; default: `authoring`
- `action_source_mode` — enum — `resolve_selected_choice | resolve_write_in | advance_initiative | repair_turn`; orthogonal to `execution_mode`. `resolve_selected_choice` requires `chosen_choice_id` and forbids `manual_action_text`; `resolve_write_in` requires `manual_action_text` and forbids `chosen_choice_id`; `advance_initiative` requires both player-action fields absent and lets non-player pressure drive; `repair_turn` is for system_repair / audit_repair flows and must name the repair source.
- `force_branch_id` — `BR-<integer>` — when intentionally forking into a named branch
- `accept_parent_unrendered` — `true | false` — default: `true` (honors FOUNDATIONS §Story Bundles §4a)

## Output

| Class | File path | Created when |
|---|---|---|
| `SE-<integer>` | `_source/events/SE-<integer>.yaml` | Always (the causal tick) |
| `PG-<integer>` | `_source/pages/PG-<integer>.yaml` | Always |
| `BR-<integer>` | `_source/branches/BR-<integer>.yaml` | IF fork (parent is non-leaf OR `force_branch_id` set) |
| `STSTAT-<integer>` (new or supersession) | `_source/status/STSTAT-<integer>.yaml` | IF life / agency / location changes; exactly one active status record per active `STENT` |
| `STENT-<integer>` (new or supersession) | `_source/entities/STENT-<integer>.yaml` | IF a person/group/entity first earns story-local representation through agency, witness role, information-source role, pressure-driving role, choice grounding, or relationship/obligation participation; OR IF identity mirror / role metadata changes. Fresh non-background STENT requires an active `bound_stchar_id` plus same-event STSTAT; only role list exactly `[background]` may use `bound_stchar_id: null` |
| `STINT-<integer>` (new or supersession) | `_source/intentions/STINT-<integer>.yaml` | IF intentions change this turn |
| `SF-<integer>` | `_source/facts/SF-<integer>.yaml` | IF new branch-local facts emerge; every SF carries `authority` per shared contract §4.5.3 |
| `BEL-<integer>` (new or supersession) | `_source/beliefs/BEL-<integer>.yaml` | IF belief/visibility changes — **mandatory** for actions involving secrecy / betrayal / deception / violence / sex / law / status / public ritual (Phase 4) |
| `OBL-<integer>` (new or supersession) | `_source/obligations/OBL-<integer>.yaml` | IF obligations open / close / escalate |
| `CNSQ-<integer>` | `_source/consequences/CNSQ-<integer>.yaml` | IF consequences fire |
| `THR-<integer>` (new or supersession) | `_source/threads/THR-<integer>.yaml` | IF a new ongoing causal concern opens, OR an existing thread advances, escalates, resolves, or is abandoned |
| `CLK-<integer>` (new or supersession) | `_source/clocks/CLK-<integer>.yaml` | IF the event creates a new staged pressure through `create_clk_record`, OR advances/resolves an active pressure clock by creating a new `CLK` with `supersedes: <prior_clk_id>` through `supersede_clk_record` |
| `STSEC-<integer>` (new or supersession) | `_source/secrets/STSEC-<integer>.yaml` | IF hidden truth becomes branch-relevant through `create_stsec_record`, OR an accepted event adds/discovers clue carriers or reveals an existing secret by creating a new `STSEC` with `supersedes: <prior_stsec_id>` through `supersede_stsec_record` |
| `STQ-<integer>` (new or supersession) | `_source/story-questions/STQ-<integer>.yaml` | IF the event opens a concrete setup/question/promise through `create_stq_record`, OR answers/pays off/abandons an existing open setup by creating a new `STQ` with `supersedes: <prior_stq_id>` through `supersede_stq_record` |
| `STPLAN-<integer>` (new or supersession) | `_source/plans/STPLAN-<integer>.yaml` | IF the event creates a load-bearing tactical plan, or changes an active plan's belief basis, resource basis, blockers, current step, fallback, or plan_status |
| `STEMO-<integer>` (new or supersession) | `_source/emotions/STEMO-<integer>.yaml` | IF the event creates, transforms, suppresses, settles, or dissociates a load-bearing affective state |
| `SREL-<integer>` (new or supersession) | `_source/relationships/SREL-<integer>.yaml` | IF an objective branch-local relationship first constrains choices/state, OR an existing relationship changes |
| `STLOC-<integer>` | `_source/locations/STLOC-<integer>.yaml` | IF new story-local location introduced |
| `STOBJ-<integer>` (new or supersession) | `_source/objects/STOBJ-<integer>.yaml` | IF objects are created / moved / changed |
| `DA-<integer>` | `_source/artifacts/DA-<integer>.yaml` | IF in-story diegetic artifact introduced |
| `SLT-<integer>` | `_source/storylets/SLT-<integer>.yaml` | IF Phase 2 created a JIT block (`provenance.origin: runtime_jit`) |
| `CHC-<integer>` | `_source/choices/CHC-<integer>.yaml` | 3-5 records if Phase 7 emits choice set; 1 for continue-or-pause; 0 if terminal |
| Bundle INDEX | `INDEX.md` | Always (updated) |

Atomic-record writes route through `mcp__worldloom__submit_patch_plan`. Supersession is file-level append-only per shared contract §3 — a "supersession" is a new record file carrying `supersedes: <prior-id>`, using the existing `create_*_record` ops. Markdown writes are direct after patch submission per shared contract §10.

## Procedure

1. **Pre-flight Check (including World-State Prerequisites).** Load FOUNDATIONS / contract; resolve bundle + parent page; validate `action_source_mode` against `chosen_choice_id` / `manual_action_text`; detect continuation vs fork; verify parent prose policy; allocate ids; load context packet, parent `state_snapshot.active_records`, and active STCHAR summaries (with full sections retrieved via `mcp__worldloom__get_record(record_id='STCHAR-<integer>', section_path='body.<section-name>')` — direct `Read` on STCHAR `.md` hybrid files is NOT a sanctioned fallback per HARD-GATE condition (a)) before any runtime characterization; compare parent `canon_revision` to current world-canon revision and classify drift. Load `references/pre-flight-and-prerequisites.md`.
   - **Targeted retrieval discipline:** `story_bundle_context` is an index and summary surface, not full authoring authority. Before drafting the state delta or emitted choices, retrieve the parent `PG` record and every material parent-active `STPLAN` / `STEMO` / `STSEC` / `STQ` / `CLK` / `BEL` / `OBL` / `CNSQ` / `THR` / `SREL` / `STSTAT` / `STLOC` / `STOBJ` record needed for causal reasoning with `mcp__worldloom__get_record`, `mcp__worldloom__get_records`, `mcp__worldloom__get_context_packet(..., story_slug=...)`, or a filtered `mcp__worldloom__list_records(..., include_full_body=true)`. Do not compute the delta from prior prose or render artifacts.
2. **Phase 0 — Evaluate due drivers.** Enumerate actively-pressuring records on parent `PG.state_snapshot` per the shared contract §7a class-specific criteria table. Combine them with the player action source, if supplied. Select exactly one driver for this turn: if `chosen_choice_id` or `manual_action_text` is supplied, driver is `player_action` / `player_write_in`; otherwise select the highest-priority due non-player driver. If multiple non-player records at equal priority fire simultaneously, classify the event as `multi_actor_collision` and list all in `driver_records`. Record selected / deferred / rejected dispositions for every actively-pressuring parent-active record in `SE.turn_driver` / validation rationale, not in a markdown render table. Player action does not exempt non-player records from disposition: when the driver is `player_action` / `player_write_in`, actively-pressuring non-player records active on parent `PG.state_snapshot` still receive a selected, deferred, or rejected disposition. Populate `world_logic_rationale` on the new `SE.turn_resolution` event to articulate why this driver was selected this turn; the source-report `why_now` content folds into this existing required field.
3. **Phase 1 — Resolve the action.** When `driver.kind = player_action | player_write_in`, parse chosen `CHC` or `manual_action_text` against the agency contract; route to exactly one of six outcomes; draft `SE.resolution`. When the driver is non-player, Phase 1 is **skipped** and Phase 2 receives the selected driver directly as the commitment-block selection input. Load `references/phase-1-action-resolution.md`.
4. **Phases 2-3 — Commitment block selection and state delta.** Call `mcp__worldloom__select_storylet_candidates(world_slug, story_slug, parent_page_id, turn_driver, intent_signature)` to retrieve the projection-filtered `SLT` shortlist and `filter_trace`; fetch full bodies only for `requires_full_body_ids`; then run the in-process predicate evaluator, alias binding, Observer Firewall, mystery firewall, cooldown check, ranking, and selection on that shortlist (direct `Read` on `_source/storylets/SLT-<integer>.yaml` is permissible only as the documented slower-but-permissible alternative per Pre-flight step 9; for routine selection the MCP path is required because `select_storylet_candidates` runs the projection filter the in-process predicate evaluator depends on, and bypassing it discards the `filter_trace` that audits selection decisions) or create a branch-scoped JIT block (use exact-ID predicates only; `any_*` existentials and `has_affordance` are reserved for `global_author_pool` / `branch_prefix_scoped` blocks per `_shared-templates/story-state-contract.md` §5 and `references/phase-2-3-commitment-and-state-delta.md`). Apply exactly one causal delta from the parent snapshot (creates / supersessions / closes including death/incapacity reconciliation). If the delta would introduce or make meaningful a persistent, speaking, viewpoint, action-driving, emotionally salient, relationship-bearing, information-bearing, pressure-driving, or direct-choice-target individual without an active bound STCHAR, stop before drafting record writes and emit a `blocked_requires_stchar` routing result:
   - `required_skill: story-character-profile`
   - `mode: create_from_world_char | create_story_local | regenerate`
   - `proposed_display_name`
   - `emergence_context_records[]`
   - `source_records[]` (story-local evidence and optional world `CHAR` provenance when known)
   - `intended_roles[]`
   - `rerun_instruction: rerun branching-story-turn-cycle after the STCHAR is created and bound`

   Trivial background-only entities may commit directly with `role_in_story: [background]` and `bound_stchar_id: null`; they must not receive character-specific choices, voice authority, or pressure-behavior grounding until upgraded through STCHAR. Load `references/phase-2-3-commitment-and-state-delta.md`.
5. **Phases 4-5 — New-class state, belief / visibility, and mystery / canon authority.** Apply any CLK tick / resolution, STSEC clue-discovery or reveal, STQ advancement, STPLAN lifecycle update, and STEMO lifecycle update required by the instantiated `SE.state_delta`; lifecycle transitions create new records with `supersedes:` rather than editing prior records; compute `expected_witnesses`; draft `BEL` records or record closed-set non-propagation rationales in `SE.non_propagation_facts[]`; apply shared contract §5a.3 when the delta creates a public-visibility `BEL`, creates a public/factional `DA`, creates or supersedes `STENT`, or supersedes a non-actor `STSTAT` because private `BEL` records do not discharge `expected_witness_coverage`; classify every resolution-like claim per shared contract §11 (apparent / branch_local / branch_local_counterfactual / canon_candidate); route `canon_candidate` to `promotion_hold`. When this tick's state change *causes* a new or superseding `THR` / `SREL` / `CNSQ` / `SF` / story-`DA`, ground its `derived_from` in the active record that caused it — the canonical record-id set on these classes admits `CLK` / `STSEC` / `STQ` / `STSTAT` / `STPLAN` / `STEMO`, so a thread that escalates because a clock ticked derives from that `CLK`, a fact that exists because a secret was revealed derives from that `STSEC`, and a relationship shift driven by an affective state derives from that `STEMO`. Reach for the direct cause rather than a legacy proxy. Load `references/phase-4-5-belief-and-mystery.md` and `references/append-only-state-lifecycle.md`.
6. **Phase 6 — Materialize next page snapshot.** Draft `SE-<integer>` with `commitment` + `alias_bindings` + `world_logic_rationale` (including Selection Rationale and Motivation Grounding where applicable); draft `PG-<integer>` with full `state_snapshot`. Load `references/phase-6-page-snapshot.md`.
7. **Phase 7 — Generate next choices.** Emit 3-5 `CHC` for a real commitment hinge, 1 continue-or-pause, or 0 if terminal; ground each in active records; apply the Information / Observer Firewall; run `choice_set_noncollapse`. When `driver.kind` is non-player, emitted CHCs must use `player_response_mode: responds | witnesses | chooses_continuation`, and at least one emitted CHC with `player_response_mode: responds` must materially respond to the driver by targeting the driver's `initiator` or one of `driver_records[]` through an action family such as `oppose`, `protect`, `evade`, `communicate`, or `investigate`. Choices grounded materially in active plan (`STPLAN`), emotion (`STEMO`), staged pressure (`CLK`), hidden truth (`STSEC`), open setup (`STQ`), intention (`STINT`), branch-local fact (`SF`), or stable character authority (`STCHAR`) MUST cite the relevant record in `grounded_in.records[]`; the record-class union allowed by `story-choice.schema.json` is the authoritative list. Load `references/phase-8-choice-generation.md`.
8. **Phase 8 — Validate.** Run the 9 shared hard gates with one-line PASS rationale on `PG-<integer>.validation_trace`, plus the 15 turn-cycle-additional checks; assemble the envelope JSON, extract the `PG-<integer>` record JSON from `patches[N].payload.record`, and compute final PG `state_hash` with the state-only path documented in `references/phase-9-validation-gates.md`. Gate 7 validates `PG.state_snapshot`, `SE.state_delta`, emitted `CHC`, active-record, selected `SLT`, and loaded-canon grounding directly; Gate 9 validates the record-based driver fields directly. Load `references/phase-9-validation-gates.md`.
9. **Phase 9 — Commit / Write — HARD-GATE fires.** See the inline phase below; HARD-GATE approval and write order live in this SKILL.md by design.
10. **Governance reference (always available).** For Validation Rules upheld, Record Schemas, FOUNDATIONS Alignment table, and the full Guardrails section, load `references/governance-and-foundations.md`. The Guardrails summary inline below covers the load-bearing rules; the full list lives in the governance reference.

## SPEC-47 STPLAN / STEMO lifecycle duties

Canonical SPEC-47 / SPEC-48 surfaces: `.claude/skills/_shared-templates/story-record-schemas.md` §4.5.17 / §4.5.18 define record shape; `.claude/skills/_shared-templates/story-state-contract.md` §5 / §5a define predicates and structured SE fields; `docs/CONTEXT-PACKET-CONTRACT.md` documents context-packet summaries; `docs/MACHINE-FACING-LAYER.md` documents edge and envelope surfaces.

When the accepted event changes tactical agency or affective pressure, update the corresponding active records during Phases 4-7:

- Create or supersede `STPLAN` when an actor moves from `STINT` to a concrete multi-step tactic, when `belief_basis[]`, `resource_basis.*[]`, `blockers[]`, `current_step`, or `fallback_steps[]` changes, or when the event tests, advances, blocks, revises, fulfills, abandons, or ignores an active plan.
- Create or supersede `STEMO` when a causal affective shift changes `status`, `affect_kind`, `intensity`, `orientation.toward_records[]`, `appraisal_basis[]`, `behavioral_pressure[]`, or `agency_effect`. STEMO is present-causal pressure, not mood-board prose tone.
- When creating or superseding a `STEMO` with `agency_effect: constraining`, satisfy FOUNDATIONS Rule 1 and Rule 5 with a downstream artifact that matches the claim: an emitted `CHC.grounded_in.records[]` entry naming that `STEMO`, a holder-matched active `STPLAN.derived_from[]` entry, or an active `SREL.derived_from[]` entry whose `participants[]` includes the holder. Do not use `SE.non_propagation_facts[]` or `SE.state_relations[]` as the receipt for affective agency constraint; those fields keep their witness-coverage and plan-relation meanings.
- Mid-story first introductions of `STCHAR`, `STPLAN`, or `STEMO` require entries in `SE.record_introductions[]`: `{record_id: STCHAR-<n>, class: STCHAR, trigger: <closed STCHAR trigger>, evidence: [...], distinct_from: [...]}`, `{record_id: STPLAN-<n>, class: STPLAN, trigger: <closed STPLAN trigger>, evidence: [...], distinct_from: [...]}`, and `{record_id: STEMO-<n>, class: STEMO, trigger: <closed STEMO trigger>, evidence: [...], distinct_from: [...]}`.
- Any event that meaningfully engages an active plan should include `SE.state_relations[]` with `{relation: advances | tests | blocks | revises | fulfills | abandons | ignores, target_record: STPLAN-<n>}`. The rationale prose must also name why an apparently ignored active plan is ignored.
- Phase 7 choices and Phase 8 validation must preserve active plan/emotion consequences in records. Active `STPLAN` / `STEMO` movement belongs in `SE.state_relations[]`, emitted `CHC.grounded_in.records[]`, and the next `PG.state_snapshot`, not in a renderer-facing projection.

## Phase 9: Commit / Write — HARD-GATE fires

### Phase 9 substeps

1. Build the patch plan covering every record drafted in Phases 1-7 as a single envelope. Operations include `create_se_record`, `create_pg_record` (always), `create_br_record` (if fork), `create_*_record` for every newly-created record class, and `supersede_*_record` for every lifecycle transition that replaces prior active story state with a new file carrying `supersedes:` in its YAML body. For CLK / STSEC / STQ lifecycle transitions, use `supersede_clk_record`, `supersede_stsec_record`, or `supersede_stq_record`; these operation names describe supersession intent, but the mechanism is still `stageCreateStoryRecord` / a fresh `_source/<class>/<ID>.yaml` file. Other common operations include `create_ststat_record` for entity life / agency / location status; `create_clk_record`, `create_stsec_record`, `create_stq_record`, `create_thr_record`, `create_srel_record`, and `create_stent_record` for SPEC-43 mid-story introduction; `create_chc_record` per emission; `create_slt_record` if Phase 2 created a JIT block; and `create_bel_record` for BEL writes. Each create or supersede op requires a `target_file` field naming the new on-disk write path (e.g., `worlds/<world_slug>/stories/<story_slug>/_source/<class>/<ID>.yaml`). See `docs/MACHINE-FACING-LAYER.md` §`describe_envelope_schema` or invoke `mcp__worldloom__describe_envelope_schema(op_kind?)` at pre-flight for the machine-readable per-op shape.
2. Dry-run via `mcp__worldloom__validate_patch_plan(patch_plan=<envelope>)` with no render-draft side channel. This run exercises `record_schema_compliance`, `snapshot_replay_equality`, `id_allocation_race`, state-delta grounding, active-pressure handling, turn-driver lawfulness, and other record-based pre-apply validators against the submitted `SE` / `PG` / `CHC` records. **Validate-path selection by envelope shape**: turn-cycle envelopes are built from disk YAML files by construction (Phase 9 step 1's persist-envelope-as-JSON + the on-disk records the engine ops reference), and inline JSON pasted into the MCP tool call is a separate buffer from `envelope.json` on disk — any divergence between the two produces a dry-run that passes the inline version while the disk version is what actually submits. For any envelope whose JSON exceeds a few KB the inline-paste-drift risk is real; prefer the equivalent CLI path that reads `envelope.json` directly: `node tools/world-mcp/dist/src/cli/validate-patch-plan.js [--world-root <path>] <plan-path>`. The CLI path is functionally equivalent — same engine code, same `{ status, verdicts, validators_run }` response shape, same `record_schema_compliance` / `snapshot_replay_equality` / `id_allocation_race` coverage — and is the dry-run analogue of the submit-path CLI named in step 5. The CLI path also serves as the fresh-process escape valve when the running MCP server holds a pre-rebuild `@worldloom/validators` bundle in memory; reserve the inline MCP validate for tight continuation envelopes that are materially small AND intended to submit inline too. The CLI resolves the project root by explicit flag, `WORLDLOOM_ROOT`, then marker auto-discovery from cwd. See `docs/HARD-GATE-DISCIPLINE.md` §Validating and submitting the plan and `docs/MACHINE-FACING-LAYER.md` §troubleshooting matrix for the equivalent submit-path treatment.
3. Present the complete deliverable summary to the user:
   - Branch label (continuation of `BR-<integer>` or fork into new `BR-<integer>`).
   - Resolved outcome route (`accept` / `accommodate` / `attempt` / `world_block` / `promotion_hold` / `terminal`).
   - State delta inventory (creates + supersessions + closes per class).
   - Commitment block used (author-pool `SLT-<integer>` or new JIT `SLT-<integer>`).
   - Emitted choices list (or terminal rationale).
   - Any `SE.promotion_claims[]` requiring a follow-up `story-fact-promotion-to-canon` invocation.
4. **HARD-GATE fires** — wait for explicit user approval. Auto Mode does not override.
5. On approval: persist the patch plan envelope as JSON (e.g., `/tmp/<plan-id>.json`), invoke the canonical signer to issue the `approval_token` (`node tools/world-mcp/dist/src/cli/sign-approval-token.js [--world-root <path>] <plan-path>` — see `docs/HARD-GATE-DISCIPLINE.md` §Issuing a token), then call `mcp__worldloom__submit_patch_plan(plan, approval_token)` with the same envelope object and the issued token. Approval tokens are single-use, plan-bound, default-20-minute-expiry. **Submit-path selection by envelope size**: turn-cycle envelopes vary widely (a tight continuation may be 10-20KB; a large supersession-heavy turn may exceed 50KB); for envelopes >50KB submit via the CLI path instead: `node tools/world-mcp/dist/src/cli/submit-patch-plan.js [--world-root <path>] <plan-path> <token-path>` (persist the signed token to a text file first). The CLI path is functionally equivalent — same engine code, same `PatchReceipt`, same failure-mode codes — but bypasses MCP transport size constraints; see `docs/HARD-GATE-DISCIPLINE.md` §Validating and submitting the plan. The CLI path also serves as the fresh-process escape valve when the running MCP server holds a pre-rebuild `@worldloom/validators` bundle in memory and a full Claude Code session restart is not immediately available; in that case, switch to the CLI submit path regardless of envelope size (see `docs/MACHINE-FACING-LAYER.md` §troubleshooting matrix). **Reading CLI output**: the CLI submit emits a `PatchReceipt` object to **stdout** on success (exit code 0) and an `[world-root] ...` trace plus `EngineError` / `McpError` object to **stderr** on failure (exit code 1) — confirmed by `tools/world-mcp/src/cli/submit-patch-plan.ts` stream separation. The success-case JSON is a `PatchReceipt` with NO `ok` field; it starts with `plan_id`, `applied_at`, `files_written`, etc. The failure-case JSON has `ok: false` and `code: ...` after the trace. The success/fail discriminator is exit code OR stream separation OR top-line key presence (`plan_id` on success vs `code` / `ok: false` on failure) — NOT the absent-on-success `ok` field. Inspect success via `echo $?` after the command, `jq -r .plan_id` (returns the plan id on success, `null` on failure), or capture stdout and stderr to separate buffers. Do not use `jq -r .ok` for success detection — the key is missing on success and returns `null`, which an operator may misread as a failure signal. Validator-PASS rows appear in both success and pre-apply-failure responses, so do not tail-truncate the output and infer status from the validator dump alone; the top-line keys (or the exit code) are the discriminator. If the success header may have been missed, do not re-run submit just to recover a receipt. Reusing the same consumed token returns `approval_replayed`; a genuinely fresh token over an already-applied plan is not the replay gate and may attempt duplicate writes or hit later engine protections, so inspect the target story `_source/` records and receipt/log output before any further submit attempt.
6. After patch success, update bundle `INDEX.md` (per shared contract §10 write order). Specifically: append a Pages-table row for the new PG; append rows to Story-Local Facts / Story-Local Beliefs / other relevant tables for any new SF / BEL / etc. records; add a new `## Emitted Choices at PG-<integer>` section listing the new CHC menu. The convention is defined by `branching-story-bootstrap` at first-run; turn-cycle inherits and extends it.
7. Report page record path + record inventory to the user. If `promotion_claims[]` were emitted, surface the recommended next step (invoke `story-fact-promotion-to-canon` with the new `SE-<integer>` as evidence). Do NOT `git commit`.

**Failure behavior**: patch fail → write nothing; surface failed gate. Patch success + `INDEX.md` update fail → story-bundle `_source/` authoritative; surface partial-failure; no silent retry. Terminal page without `terminal_rationale` → authoring error, abort before patch.

## Runtime Shortcut

For `execution_mode: interactive_runtime`, the engine uses this fast path:

```
parent snapshot + retrieved active records → action route → commitment block → state delta → next snapshot → choices
```

State work is compact structured YAML produced from the parent snapshot, retrieved parent-active records, and selected / JIT block. The HARD-GATE still fires at Phase 9 — runtime mode does not bypass user approval.

## Guardrails (summary)

Full list lives in `references/governance-and-foundations.md`. Load-bearing rules:

- **Never write world-level canon.** Hook 3 blocks raw `Edit` / `Write` on `worlds/<slug>/_source/<world-subdir>/*.yaml`. Story-bundle records at `worlds/<world_slug>/stories/<story_slug>/_source/<class>/*.yaml` are the exclusive write surface, routed through the patch engine.
- **Never write rendered prose or render plans at turn-cycle.** Rendered prose is supplied externally through the scene layer. Turn-cycle writes only story records and updates the bundle INDEX.
- **Silent rejection is forbidden.** Every action — including impossible ones — produces an `SE` and `PG` state snapshot. `world_block` and `terminal` are first-class outcomes routed through the same machinery as `accept`.
- **Deaths and removals are first-class outcomes.** No main-character protection via out-of-world logic. Phase 3 reconciliation propagates death / incapacity effects in the same delta.
- **Schema minimalism per shared contract §2 + FOUNDATIONS §Story Bundles §5b.** Every drafted record conforms to the shared contract §4 schemas. No nice-to-have fields. Supersession is file-level append-only (a new record file carrying `supersedes:`).
- **Scene render contract lives outside turn-cycle.** Content policy, prose craft, render-time instructions, and STCHAR render packets are carried by scene planning after state commit.
- **Runtime character authority is STCHAR.** Turn-cycle consumes active STCHAR via `STENT.bound_stchar_id`, `PG.state_snapshot.active_records.STCHAR`, targeted story-scoped retrieval, and CHC/STPLAN/STEMO grounding; fresh mid-story `SREL` introductions use present-causal `derived_from[]` and carry STCHAR rationale in event / scene-plan prose instead. It never reads world `CHAR-*` for runtime characterization.
- **Complex new characters block-and-route.** A new persistent/speaking/viewpoint/action-driving/emotionally salient/relationship-bearing/information-bearing/pressure-driving/direct-choice-target individual must have active STCHAR before meaningful STENT/SE/PG/CHC state commits. Otherwise emit `blocked_requires_stchar` and wait for `story-character-profile`; only `[background]` entities may commit with `bound_stchar_id: null`.
- **Skills do not chain.** Turn-cycle never invokes scene prose/rendering skills, `commitment-block-authoring`, `branching-story-health-audit`, `story-fact-promotion-to-canon`, or `story-promotion-closeout`. Surface recommendations only.

## Final Rule

Turn-cycle advances story state by exactly one causal tick from any committed page snapshot — continuation or fork — without requiring rendered parent prose, without silent rejection of any action, and without ever mutating world canon.
