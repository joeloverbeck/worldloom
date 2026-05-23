# SPEC-76 — Turn-Driver Primitive and Pressure-Driven Turn Cycle

**Status:** COMPLETED (archived 2026-05-23)
**Spec ID:** SPEC-76
**Predecessors:** SPEC-47 (STPLAN + STEMO), SPEC-63 (offstage causal packet tier)
**Source report:** `reports/slt-chc-overhaul-first-iteration.md` (triaged at `docs/triage/2026-05-23-slt-chc-overhaul-first-iteration-triage.md`)
**Related:** SPEC-77 (Minimal SLT Grounding Provenance — depends on the turn_driver enum landed here)

## 1. Problem

A playtest of a branching story surfaced that the entire story was reactive on the player's choice. The story engine has **state authority** but lacks **driver authority**: it knows which active STPLAN / STEMO / CLK / THR records exist, but it has no first-class way to advance a turn from one of those active pressures. The current turn-cycle is structurally player-initiated:

- `SE.event_kind` enum at `tools/validators/src/schemas/story-event.schema.json:26-37` enumerates `story_start | selected_choice | write_in_attempt | system_repair | audit_repair | prose_attach | promotion_closeout`. There is no `npc_action`, `offstage_action`, `clock_fire`, or `world_pressure` kind.
- `SE.commitment.selection_source` enum at the same schema enumerates `emitted_choice | author_pool | runtime_jit | system_repair | audit_repair | none`. No non-player initiative sources.
- `.claude/skills/branching-story-turn-cycle/SKILL.md:60` declares Phase 1 as "Resolve the action" — every turn begins from a chosen CHC or write-in. Phase 2 (commitment-block selection) is downstream of player input. There is no Phase 0 for evaluating non-player drivers.
- Active high-urgency STPLAN / STEMO / CLK / THR records can persist across pages without ever being **selected as a turn driver, deferred with expiry, or rejected with a reason**. This is the structural inertness that makes the system feel reactive.

This is the user's core concern, and it is correct. A mature branching-story system needs pages where the player reacts to being hunted, shot at, seduced, trapped, pressured, helped, betrayed, rescued, accused, or interrupted — and the system must represent that as a first-class causal event, not smuggle it through a synthetic CHC.

## 2. Decision

Introduce the **turn-driver primitive** on `SE` and require the turn-cycle skill to evaluate due drivers as Phase 0 before resolving any player action. The driver may be the player (selected CHC or write-in) or a non-player source (NPC action, offstage action, clock fire, world pressure, secret reveal, multi-actor collision). All non-player drivers must trace to an active driver record on the parent page snapshot, and all must respect the existing observer firewall.

Additionally, page plans must declare an **active-pressure handling section** that lists every high-urgency active record and classifies it as selected (became the driver), deferred (with expiry), or rejected (with reason). This is the deepest fix for the reactivity concern: inert high-urgency pressure becomes structurally impossible.

The change is fail-fast and breaking. No backwards-compatibility shims. SPEC-75 ships before this spec; no in-flight worlds carry SE records under the new contract, so the breaking schema change is acceptable.

## 3. Scope

### 3.1 Schema changes — `tools/validators/src/schemas/story-event.schema.json`

**Collapse `event_kind` enum** to:
```
story_start | turn_resolution | system_repair | audit_repair | prose_attach | promotion_closeout
```
The previously-split `selected_choice` and `write_in_attempt` collapse into `turn_resolution` + `turn_driver.kind`.

**Add required `turn_driver` object** (required when `event_kind = turn_resolution`):
```yaml
turn_driver:
  kind: player_action | player_write_in | npc_action | offstage_action | world_pressure | clock_fire | secret_reveal | multi_actor_collision
  initiator: <STENT-<integer> | player | world | system | unknown>
  driver_records: []   # array of STPLAN | STEMO | CLK | THR | STSEC | STQ | OBL | CNSQ | SREL | STCHAR ids
  player_response_mode: initiates | responds | witnesses | chooses_continuation | none
  pov_visibility: perceived_directly | inferred_from_trace | reported | discovered_after | withheld
```

Constraints encoded in schema:
- `event_kind = turn_resolution` requires `turn_driver`. Other event kinds forbid it.
- `kind = player_action` requires `initiator = player`, `player_response_mode = initiates`, `driver_records: []` (empty), `pov_visibility = perceived_directly`.
- `kind = player_write_in` requires `initiator = player`, `player_response_mode = initiates`, `driver_records: []`, `pov_visibility = perceived_directly`.
- `kind = npc_action` requires `initiator` matches `^STENT-\d+$`, `driver_records` non-empty including at least one STPLAN / STEMO / CLK / THR / STCHAR.
- `kind = offstage_action` requires `initiator` matches `^STENT-\d+$`, `driver_records` non-empty, `pov_visibility ∈ {inferred_from_trace, reported, discovered_after, withheld}` (never `perceived_directly`).
- `kind = clock_fire` requires `initiator = world` (or `system` for synthetic ticks), `driver_records` non-empty including at least one CLK.
- `kind = world_pressure` requires `initiator = world`, `driver_records` non-empty.
- `kind = secret_reveal` requires `driver_records` non-empty including at least one STSEC.
- `kind = multi_actor_collision` requires `initiator = unknown`, `driver_records` non-empty with records from at least two distinct STENTs.

**Extend `selection_source` enum** to:
```
emitted_choice | author_pool | runtime_jit | npc_initiative | offstage_initiative | clock_fire | world_pressure | secret_reveal | system_repair | audit_repair | none
```

**Drop `selected_choice` / `write_in_attempt` from `event_kind`.** Their distinction moves to `turn_driver.kind`. The `actor` field at schema line 38 is retained.

**Free-text `why_now`** proposed in the source report is **NOT added** as a separate field — its content folds into the existing `world_logic_rationale: string` (already required). This honors FOUNDATIONS §Story Bundles §5b: no field exists unless it is consumed by a validator, replay primitive, predicate, fork operation, or audit trail beyond what `world_logic_rationale` already covers.

### 3.2 Shared story state contract — `.claude/skills/_shared-templates/story-state-contract.md`

Amend §4 (record schemas) to document the new `turn_driver` shape and the collapsed `event_kind` enum. Amend §7 (shared hard gates) to include a new gate: **Gate 9: Turn-Driver Lawfulness** — every `turn_resolution` event must carry a well-formed `turn_driver` whose driver records are active on the parent page snapshot, and whose `pov_visibility` is consistent with the actor's information access per §6b (Observer Firewall).

Amend §8 (page-plan structure) to introduce **§7a Turn Driver / Initiative Trace**, with required content:

```
## 7a. Turn driver / initiative trace

Required content (all lines must appear; values are page-author-supplied):

- Driver kind: <one of player_action | player_write_in | npc_action | offstage_action | world_pressure | clock_fire | secret_reveal | multi_actor_collision>
- Initiator: <STENT-<integer> | player | world | system | unknown>
- Driver records: <comma-separated record ids; matches SE.turn_driver.driver_records>
- Player response mode: <initiates | responds | witnesses | chooses_continuation | none>
- POV visibility: <perceived_directly | inferred_from_trace | reported | discovered_after | withheld>
- Observer-firewall note: <one sentence on the access route for non-player drivers; "n/a" for player_action / player_write_in>

The SE.turn_resolution event's `world_logic_rationale` (an existing required field on SE) is the carrier for the driver-justification (the source-report `why_now` content folds into it per §3.1); §7a's `Driver kind:` and `Driver records:` lines together with `world_logic_rationale` form the complete driver provenance.

Active-pressure disposition (every high-urgency active record on parent PG.state_snapshot must appear in exactly one row):

| Record | Disposition | Reason / expiry |
|---|---|---|
| <ID> | selected | became this turn's driver |
| <ID> | deferred | <expires after PG-<integer> or condition> |
| <ID> | rejected | <one-sentence reason> |
```

§16a STCHAR packet labels are tightened to a closed vocabulary: unknown `Required because:` labels fail. The current behavior at `_shared-templates/story-state-contract.md:519` (the `page_plan_stchar_packet_integrity` validator) warns on unknown labels; this spec raises it to fail under the new contract.

### 3.3 Turn-cycle skill — `.claude/skills/branching-story-turn-cycle/SKILL.md`

**Add Phase 0 (Driver Evaluation)** before Phase 1:

```
Phase 0: Evaluate due drivers
  - Enumerate active high-urgency records on parent PG.state_snapshot:
    STPLAN with current_step due, STEMO with high intensity + behavioral pressure,
    CLK at threshold, THR active, STSEC reveal-ready, STQ payoff-due, OBL/CNSQ urgent.
  - Combine with player action source (chosen CHC or write-in, if supplied).
  - Select exactly one driver for this turn:
    * If chosen_choice_id or manual_action_text supplied: driver = player_action / player_write_in.
    * Else: select the highest-urgency due non-player driver.
  - If multiple non-player records at equal urgency fire simultaneously,
    classify as multi_actor_collision and list all in driver_records.
  - Record selected / deferred / rejected dispositions for every active high-urgency record;
    these populate page-plan §7a active-pressure table.
  - Player action does not exempt non-player records from disposition: when the driver is
    player_action / player_write_in, any high-urgency non-player records active on parent
    PG.state_snapshot must still appear in §7a's active-pressure table as `selected: no — player won`
    (the implicit case when the player drives the turn), `deferred` (with expiry), or `rejected`
    (with reason).
  - Populate `world_logic_rationale` on the new SE.turn_resolution event to articulate why this
    driver was selected this turn (the source-report `why_now` content folds into this existing
    required field per §3.1).
```

**Mode parameter** added to the skill: `execution_mode` already exists (`authoring | interactive_runtime | batch`); add a new orthogonal `action_source_mode`:

```
action_source_mode:
  - resolve_selected_choice   # XOR with manual_action_text; current default when chosen_choice_id supplied
  - resolve_write_in          # current default when manual_action_text supplied
  - advance_initiative        # no player action; driver = non-player; both chosen_choice_id and manual_action_text absent
  - repair_turn               # for system_repair / audit_repair flows
```

Phase 1 ("Resolve the action") becomes downstream of Phase 0's driver selection: when `driver.kind = player_action | player_write_in`, Phase 1 resolves the action as today. When the driver is non-player, Phase 1 is **skipped** and Phase 2 receives the driver directly as the commitment-block selection input.

Phase 8 (choice generation) is amended: when `driver.kind` is non-player, emitted CHCs must have `player_response_mode: responds | witnesses | chooses_continuation`. At least one emitted CHC must materially respond to the driver (e.g., an `oppose / protect / evade / communicate / investigate` action family that targets the driver's `initiator` or `driver_records`).

### 3.4 Bootstrap skill — `.claude/skills/branching-story-bootstrap/SKILL.md`

The opening page (PG-1) `SE-1` event always has `event_kind: story_start` (unchanged), but now carries `turn_driver` only when `story_start` is followed immediately by an `advance_initiative` continuation. For the standard "PG-1 emits choices and waits for player" pattern, `story_start` remains in the carve-out that forbids `turn_driver` per §3.1.

The bootstrap's root page plan §7a is omitted when SE-1 is `story_start` (driver-less).

Seeded SLTs become eligible for non-player drivers per SPEC-77 (compatible_turn_drivers field).

### 3.5 Health-audit skill — `.claude/skills/branching-story-health-audit/SKILL.md`

Add a new audit sub-phase: **Reactivity Inertness** — scan PG chain for sequences of pages where every `turn_driver.kind = player_action | player_write_in` despite the presence of high-urgency active non-player records (STPLAN with due step, STEMO at high intensity, CLK at threshold, THR active, STSEC reveal-ready). Emit a remediation-storylet-proposal card if 3+ consecutive pages match the pattern. This is the audit-side safety net; the structural fix is the active-pressure handling discipline (§3.2 page-plan §7a active-pressure table).

This pass is distinct from the existing Phase 2l ("Active-state underuse warnings"): Phase 2l is per-page underuse detection, while Reactivity Inertness is a chain-level scan for consecutive non-player-driver absence. The two are orthogonal and run alongside each other; Reactivity Inertness is named explicitly as a new sub-phase (the bundle-implementation slice may number it Phase 2n or sequence it after Phase 2m STCHAR-authority health).

### 3.6 New validators

Register all four in `tools/validators/src/public/registry.ts`. Each runs in `full-world` and `pre-apply` modes per existing convention.

#### 3.6.1 `turn_driver_schema_compliance`

**Severity:** fail
**Inputs:** SE records, parent PG.state_snapshot.active_records
**Codes:**
- `turn_driver_missing` — `event_kind = turn_resolution` with no `turn_driver` object.
- `turn_driver_kind_invalid` — `turn_driver.kind` outside the closed enum.
- `turn_driver_initiator_pattern_violation` — `initiator` does not match the per-kind constraints in §3.1.
- `turn_driver_driver_record_inactive` — a record in `turn_driver.driver_records` is not in the parent PG's `active_records`.
- `turn_driver_driver_records_empty_for_non_player` — non-player `kind` with empty `driver_records`.
- `turn_driver_offstage_perceived_directly` — `kind = offstage_action` with `pov_visibility = perceived_directly`.
- `turn_driver_player_kind_with_driver_records` — `kind ∈ {player_action, player_write_in}` with non-empty `driver_records`.

**Notes:** This validator is structural — it checks schema-level constraints that JSON Schema cannot express across the SE / PG boundary. It does not check observer-firewall semantics (see §3.6.2).

#### 3.6.2 `turn_driver_pov_observer_firewall`

**Severity:** fail
**Inputs:** SE.turn_driver, BEL records active on parent PG, page-plan §7a
**Codes:**
- `turn_driver_hidden_state_leak` — `pov_visibility = perceived_directly` for a driver whose driver_records include a hidden STSEC or unobservable offstage STPLAN.
- `turn_driver_missing_access_route` — `pov_visibility ∈ {inferred_from_trace, reported}` but no active BEL or affordance grants the POV actor an access route to the driver_records' visible traces.
- `turn_driver_offstage_direct_mind_access` — page plan §16a or page-plan body narrates NPC interiority for an `offstage_action` driver.

**Notes:** Composes with the existing `observer_firewall` validator (`tools/validators/src/structural/observer-firewall.ts`) by adding non-player driver kinds to its inspection set. The existing validator only inspects `selected_choice` and `write_in_attempt` events; this one extends to all `turn_resolution` events whose driver is non-player.

#### 3.6.3 `page_plan_turn_driver_consistency`

**Severity:** fail
**Inputs:** PG, SE (via PG.input.resolved_event_id), page-plan §7a (textual)
**Codes:**
- `page_plan_driver_section_missing` — `turn_resolution` event with no §7a turn-driver section in the page plan.
- `page_plan_driver_kind_mismatch` — §7a `Driver kind:` ≠ `SE.turn_driver.kind`.
- `page_plan_driver_record_omitted` — record present in `SE.turn_driver.driver_records` but absent from §7a `Driver records:`.
- `page_plan_active_pressure_table_missing` — no `Active-pressure disposition` table when parent PG has ≥1 high-urgency active record.

**Notes:** Parses page-plan §7a as structured text per the contract amendment in §3.2. The parser is shared with §16a label parsing (already structured per SPEC-73).

#### 3.6.4 `active_pressure_handling_discipline`

**Severity:** fail for high-urgency unhandled; warn for medium-urgency unhandled
**Inputs:** PG.state_snapshot.active_records (per record class), page-plan §7a active-pressure table
**Codes:**
- `high_urgency_active_record_unhandled` — high-urgency active STPLAN / STEMO / CLK / THR / STSEC / STQ / OBL / CNSQ record absent from §7a active-pressure table.
- `active_pressure_rejection_reason_missing` — table row marked `rejected` with no reason string.
- `active_pressure_deferred_without_expiry` — table row marked `deferred` with no expiry (PG-id or condition).
- `active_pressure_disposition_unknown` — table row disposition outside the closed set `{selected, deferred, rejected}`.

**Urgency classification:** high = `saliency.urgency: high` for SLT-style records; for state records, high = STPLAN with `current_step` due-this-page, STEMO at `intensity: high` with non-empty `behavioral_pressure`, CLK at threshold, THR with active and ≥1 page-old escalation, STSEC reveal-ready, STQ with payoff-due, OBL/CNSQ with `urgency: high`. Medium is the analogous middle tier per existing schema enum values — the concrete per-class medium-tier table is deferred to ticket-time (see §9 Risk Reassessment).

**SREL / STCHAR scope:** SREL and STCHAR are permitted in `turn_driver.driver_records[]` (per §3.1) only as supporting records, never as the leading high-urgency driver. The leading record must be one of the named 8 classes above (STPLAN / STEMO / CLK / THR / STSEC / STQ / OBL / CNSQ). This keeps SREL / STCHAR out of the urgency-tier ranking while preserving their role in the audit-trace (e.g., an `npc_action` driver whose leading record is STPLAN-9 may cite STCHAR-3 alongside as the actor-authority record).

### 3.7 Existing-validator updates

- `observer_firewall` (`tools/validators/src/structural/observer-firewall.ts`): extend the event-kind filter to cover all `turn_resolution` events. The pre-existing inspection sites for `selected_choice` and `write_in_attempt` ports cleanly to the player-driver kinds.
- `chc_slt_selected_commitment_trace` (`tools/validators/src/structural/chc-slt-selected-commitment-trace.ts`): no logic change needed; the validator already keys on `SE.commitment.selected_slt_id` and parent-page active-record predicates, not on the retired `event_kind` enum values. **Rename obligation:** the emitted verdict code `selected_choice_unresolvable` (line 216) references the retired `selected_choice` enum value as a string; rename to a turn-driver-neutral name (e.g., `turn_resolution_unresolvable`) when the new enum lands. Logic and call sites unchanged.
- `turn_cycle_output_grounding_integrity`: extend to require `CHC.grounded_in.records[]` to include at least one record from `SE.turn_driver.driver_records` when emitted CHC carries `player_response_mode: responds`, and fail CHCs emitted under a non-player driver when `player_response_mode` is outside `responds | witnesses | chooses_continuation`. Today the validator already requires grounding records; this adds topical-grounding and response-mode constraints when the page is driver-responsive.

## 4. Out of Scope

The following items from the source report are **rejected or deferred** per the triage at `docs/triage/2026-05-23-slt-chc-overhaul-first-iteration-triage.md`. They are listed here to prevent silent re-proposal:

- **Full `CHC.binding` object replacing scalar `associated_commitment_block`.** Rejected — `intent_signature` duplicates existing CHC root fields; `chc_slt_selected_commitment_trace` already validates the selected SLT's preconditions against parent-page active records (not a strict ID match). Re-evaluate only if a future playtest surfaces stale-binding pain.
- **`SE.commitment.binding_resolution` / `instantiated_commitment` trace.** Rejected — `alias_bindings` plus the new `turn_driver.driver_records` covers the audit need.
- **Candidate-commitment record (`SCOM` / `STCAND`).** Deferred per the report's own §17.1.
- **`choice_set_quality_axes` validator.** Rejected — the report's own §11.3 forbids hard-validating literary quality.
- **STCHAR Operational Axis Index closed-vocabulary taxonomy.** Deferred — separate STCHAR-shape concern; reactivity fix doesn't depend on it.
- **`branching-story-prose-attach` driver-fidelity receipt fields.** Deferred — add only after the turn-driver field is real and a playtest confirms prose-rendering surfaces need the receipt.
- **FOUNDATIONS amendment.** Carried separately by [SPEC-78](SPEC-78-foundations-amendment-driver-primitive-principle-extensions.md), which landed before SPEC-76 (FOUNDATIONS is upstream). SPEC-78 extends §Story Bundles §5c with "Driver salience is local." (covering driver-selection as a prior local-salience-ranking pass) and §6b with event-level driver-declaration coverage (extending the Observer Firewall to `SE.turn_driver.driver_records[]` and `pov_visibility`). SPEC-76's `Validation Rules Upheld` table cites these *extended* principles.

## 5. Validation Rules Upheld

| Rule | Source | How upheld |
|---|---|---|
| FOUNDATIONS §Story Bundles §5b (Schema-Minimalism) | `docs/FOUNDATIONS.md:654-658` | Every new field is load-bearing: `turn_driver.kind` drives a validator and is consumed by replay; `initiator` constrains driver-record patterns; `driver_records` is the audit-trace and validator input; `player_response_mode` constrains downstream CHC emission; `pov_visibility` drives observer-firewall checks. Free-text `why_now` is intentionally not added; it folds into existing `world_logic_rationale`. |
| FOUNDATIONS §Story Bundles §5c (Present Causal State, Not Narrative Shape) | `docs/FOUNDATIONS.md:660-666` | Turn driver records what is actually happening this turn (a player action, an NPC's plan stepping, a clock firing) — present causal state. It does not encode dramatic position, act structure, midpoint, or a target narrative shape. No global drama manager: driver selection is deterministic local salience (highest-urgency due record), gated by the eight (now nine, with §3.2 Gate 9) shared hard gates. |
| FOUNDATIONS §Story Bundles §6b (Observer Firewall) | `docs/FOUNDATIONS.md:686-690` | `pov_visibility` field + `turn_driver_pov_observer_firewall` validator structurally enforce that non-player drivers respect the POV actor's information access. The existing `observer_firewall` validator is extended to cover all `turn_resolution` events. |
| FOUNDATIONS §Story Bundles §5a (Commitment Blocks Are Causal Moves) | `docs/FOUNDATIONS.md:648-652` | SLT records gain no narrative-shape fields in this spec (SPEC-77 adds only `compatible_turn_drivers` + `reason_to_exist`, both load-bearing). `narrative-shape-field-rejection.ts` (`tools/validators/src/structural/narrative-shape-field-rejection.ts:19-28`) remains the structural backstop. |
| FOUNDATIONS §Story Bundles §4a (Plan-Authority Boundary) | `docs/FOUNDATIONS.md:618-622` | Turn driver lives on `SE` (causal event); page plan §7a is a render-side projection of `SE.turn_driver`, validated for consistency. The plan does not become a second state engine. |
| FOUNDATIONS §Validation Rule 5 (No Consequence Evasion) | `docs/FOUNDATIONS.md:467` / §Story Bundles §5 | Active-pressure handling discipline ensures no high-urgency active record can be silently ignored; every record is selected, deferred-with-expiry, or rejected-with-reason. Inertness is structurally impossible. |

## 6. Tests

### 6.1 Schema-level (JSON Schema unit tests under `tools/validators/tests/schemas/`)

- `event_kind = turn_resolution` requires `turn_driver` — invalid fixture with `turn_resolution` and no `turn_driver` fails.
- `event_kind = story_start` forbids `turn_driver` — invalid fixture with `story_start` + `turn_driver` fails.
- `kind = player_action` with non-empty `driver_records` fails.
- `kind = offstage_action` with `pov_visibility = perceived_directly` fails.
- `kind = npc_action` with `initiator = player` fails.

### 6.2 Structural validator tests (`tools/validators/tests/structural/`)

Per the established inline-fixture-builder convention (used in `tools/validators/tests/structural/chc-slt-selected-commitment-trace.test.ts`, `branch-isolation.test.ts`, and sibling validator tests):

- `turn_driver_schema_compliance.test.ts` — six positive cases (one per non-player driver kind) + eight negative cases (one per failure code in §3.6.1).
- `turn_driver_pov_observer_firewall.test.ts` — positive: NPC-fired-shot perceived via window with active BEL access route. Negative: offstage STPLAN cited as `perceived_directly` with no BEL access; page-plan §16a narrates NPC interiority for offstage_action.
- `page_plan_turn_driver_consistency.test.ts` — positive: page plan §7a matches SE.turn_driver. Negative: §7a missing; §7a `Driver kind:` ≠ SE.turn_driver.kind; driver record present in SE but omitted from §7a.
- `active_pressure_handling_discipline.test.ts` — positive: every high-urgency active record appears in §7a active-pressure table with valid disposition. Negative: high-urgency STPLAN unhandled; `deferred` row with no expiry; `rejected` row with no reason.

### 6.3 Golden fixture — "Red Kiln Ambush" (from source report §15)

A single end-to-end fixture under `tools/validators/tests/fixtures/red-kiln-ambush/` proving:
- NPC-initiated event (Varro's plan step + clock fire) produces a `turn_resolution` SE with `turn_driver.kind = npc_action`, populated `driver_records`, `pov_visibility = perceived_directly` (Jon sees the shot line), and `player_response_mode = responds`.
- Page plan §7a renders the driver and lists Varro's STPLAN-9, STEMO-12, CLK-3, THR-4 in either `selected` or supporting roles in the active-pressure table.
- Emitted CHCs (Protect Mara / Dive for ledger / Call Varro out / Retreat through ash chute / write-in) all have `player_response_mode = responds`; at least one targets a record in `driver_records`.
- Observer firewall passes: no hidden mind access ("Varro smiled because he knew Jon would choose Mara" would fail; "the west window burst inward" passes).

### 6.4 Snapshot-replay equality

`snapshot-replay-equality.ts` must continue to produce identical state under the new shape. The Phase 6 PG `state_snapshot` is unchanged in structure; only `SE.commitment` and the new `SE.turn_driver` are added to the event record. Replay equality is preserved because PG snapshots remain self-contained.

## 7. Migration

No existing world contains an `SE` record under the new contract. Per the source report's §16 (Non-goals), backwards-compat shims are explicitly rejected. The `event_kind: selected_choice | write_in_attempt` values are retired without renaming or aliasing. Repos in flight without merged SE records under the new schema must rebuild from `branching-story-bootstrap`.

Test bundles (e.g., `red-bunny`) carrying SE records under the old enum need rebuild before this spec's validators turn on. Document this in the implementation ticket's Assumption Reassessment.

## 8. Implementation Slices

The spec lands as a single coordinated change because the schema, contract, skill, and validators are mutually dependent at runtime. Internal slicing for ticket decomposition:

1. **Slice A — Schema + shared contract.** `story-event.schema.json` + `.claude/skills/_shared-templates/story-state-contract.md` §4 / §7 / §8. No skill changes. Failing fixture suite written first (TDD).
2. **Slice B — Turn-cycle skill Phase 0 + bootstrap +  health-audit.** Skill SKILL.md updates + reference file updates. Slice A must land first so the schema enum exists.
3. **Slice C — Four new validators + registry.** `turn_driver_schema_compliance`, `turn_driver_pov_observer_firewall`, `page_plan_turn_driver_consistency`, `active_pressure_handling_discipline`. Registered in `tools/validators/src/public/registry.ts`. Tests follow the established inline-fixture-builder convention (see `tools/validators/tests/structural/chc-slt-selected-commitment-trace.test.ts` and sibling tests).
4. **Slice D — Existing-validator updates.** `observer_firewall` event-kind filter extension; `turn_cycle_output_grounding_integrity` topical-grounding extension. Slice C must land first so the new validator IDs exist for cross-reference.
5. **Slice E — Golden fixture suite.** Red Kiln Ambush + 5 failing variants (no driver, hidden mind leak, missing pressure table, mismatched §7a, wrong response mode).

`spec-to-tickets` will materialize these as separate tickets when the spec is decomposed.

## 9. Risk Reassessment

- **Authoring overhead.** Each turn now requires authors to evaluate due drivers and populate §7a. Mitigation: Phase 0 enumeration is deterministic (active high-urgency records from parent PG snapshot); the table is computed, not invented. The actual choice (which driver becomes the turn) is the only authorial decision.
- **False reactivity in audit.** A run of legitimately player-driven pages (the player is actively pursuing a goal with no offstage pressure due) would trip the new `Reactivity Inertness` audit pass. Mitigation: the audit emits a remediation-proposal, not a hard fail; the operator can dismiss with reason. The structural fix (active-pressure handling discipline) does not depend on the audit.
- **Schema breaking change.** Acceptable per Source report §16 Non-goals; the test-bundle `red-bunny` is the only known consumer and must rebuild. Documented in §7 Migration.
- **Medium-tier urgency concrete table deferred.** §3.6.4 defines high-tier urgency per record class but leaves medium as "the analogous middle tier per existing schema enum values." STPLAN, STEMO, CLK, THR, STSEC, STQ, OBL, CNSQ each carry their own urgency conventions; the concrete per-class medium-tier criteria require ticket-time enumeration alongside the `active_pressure_handling_discipline` validator implementation. Mitigation: ticket decomposition produces the medium-tier table as part of the validator's implementation; until then, the warn severity is unreachable (validator falls back to fail-on-unhandled-high-only).

## 10. References

- Source report: `reports/slt-chc-overhaul-first-iteration.md` (executive verdict §1; pain points §5.1 / §5.5 / §5.7; recommended architecture Alternative E §6; schema changes §8.1 / §8.4; skill changes §9.1 / §9.2 / §9.5; validators §10.1 / §10.2 / §10.3 / §10.12).
- Triage decision record: `docs/triage/2026-05-23-slt-chc-overhaul-first-iteration-triage.md`.
- FOUNDATIONS §Story Bundles §4a / §5a / §5b / §5c / §6a / §6b: `docs/FOUNDATIONS.md:618-690`.
- Shared story state contract: `.claude/skills/_shared-templates/story-state-contract.md` (authoritative for story-record schemas per FOUNDATIONS §5b).
- Existing schemas: `tools/validators/src/schemas/story-event.schema.json`, `story-choice.schema.json`, `story-storylet.schema.json`.
- Existing validators: `tools/validators/src/structural/chc-slt-selected-commitment-trace.ts`, `observer-firewall.ts`, `narrative-shape-field-rejection.ts`, `page-plan-stchar-packet-integrity.ts`.
- Predecessor SPECs: SPEC-47 (STPLAN + STEMO), SPEC-63 (offstage causal packet tier), SPEC-73 (page-plan §16a label parsing — establishes the §7a parser pattern).
- Established inline-fixture-builder convention used in the test plan: `tools/validators/tests/structural/chc-slt-selected-commitment-trace.test.ts`, `branch-isolation.test.ts`, and sibling validator tests (not a SPEC-introduced contract).

## Outcome

Completed 2026-05-23.

SPEC-76 landed through tickets `archive/tickets/SPEC76TURDRIPRI-001.md` through `archive/tickets/SPEC76TURDRIPRI-011.md`.

What changed:

- `story-event.schema.json` now carries the collapsed `event_kind` contract and required `turn_driver` shape for `turn_resolution` events.
- `.claude/skills/_shared-templates/story-state-contract.md` documents Gate 9, page-plan §7a, active-pressure disposition, and the turn-driver record shape.
- `.claude/skills/branching-story-turn-cycle/SKILL.md`, `.claude/skills/branching-story-bootstrap/SKILL.md`, and `.claude/skills/branching-story-health-audit/SKILL.md` carry the Phase 0 / bootstrap carve-out / Reactivity Inertness updates.
- The validators package includes the four new turn-driver / active-pressure validators, the existing-validator updates, and the Red Kiln Ambush capstone fixture.

Verification:

- `cd tools/validators && npm test` before the final capstone ticket passed 999 tests.
- `cd tools/validators && npm run build` passed after the capstone implementation.
- `cd tools/validators && node --test dist/tests/integration/spec76-red-kiln-ambush.test.js` passed 2 tests, proving the canonical Red Kiln Ambush fixture and five failing variants.
- `cd tools/validators && npm test` passed 1001 tests after all SPEC-76 work.

Deviation from draft:

- The Red Kiln Ambush fixture is checked as indexed-record JSON plus page-plan file content rather than a full copied `worlds/red-kiln-ambush/` tree. This matches the current structural validator harness and avoids any live canon mutation.
- The capstone exposed a missing same-seam response-mode check in `turn_cycle_output_grounding_integrity`; SPEC-76's existing-validator section and final implementation include that fail-closed repair.
