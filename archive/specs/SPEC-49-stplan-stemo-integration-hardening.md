---
status: completed
prior_specs: [SPEC-47-stplan-stemo, SPEC-44-story-state-append-only-lifecycle-and-schema-correctness]
---

# SPEC-49: STPLAN / STEMO Integration Hardening

## Problem Statement

SPEC-47 landed `STPLAN` (actor-owned tactical plans) and `STEMO` (actor-owned causal affective pressure) as first-class story-bundle record classes, integrated across schemas, validators, world-index, MCP context packets, patch-engine create ops, and the seven story-pipeline skills. A second-iteration deep-research audit (reports/new-story-structures-proposal-second-iteration.md) confirms the ontology is structurally complete — no further active-record class is warranted at this time — but identifies a coherent cluster of integration-drift issues across the SPEC-47 implementation surface. Codebase verification against the audit's claims confirmed ten concrete gaps initially; the SPEC-49 reassessment (2026-05-19) surfaced two additional audit-identified gaps in the validator-drift cluster that the initial verification missed, for a total of twelve concrete gaps with five refuted claims.

The twelve verified gaps fall into three categories. **Schema drift**: `ACTIVE_RECORDS_CLASSES` (runtime) includes STPLAN/STEMO, but the JSON page schema and the shared `story-record-schemas.md` contract list of `state_snapshot.active_records` keys do not; `CHC.grounded_in.records[]` regex omits seven record classes (STPLAN, STEMO, CLK, STSEC, STQ, STINT, and arguably SF) that bootstrap and turn-cycle prose say choices should cite; the `state-snapshot-integrity` validator hard-codes only CLK/STSEC/STQ in its inactive-record lifecycle regex. **Validator drift**: the `STEMO.agency_effect` compatibility helper reads `parsed.holder` from STSTAT records, but STSTAT owns its target via `entity` (no `holder` field exists), so the check silently fails for every emotion; `STPLAN.current_step` is required unconditionally in the JSON schema but the shared contract says "required when active"; `STPLAN.belief_basis` allows empty arrays unconditionally but the contract says non-empty when active; predicate objects in `STPLAN.fallback_steps[].trigger_condition.predicates[]` and `current_step.success_condition.predicates[]` are accepted as opaque `{ pred: string, additionalProperties: true }` with no DSL parseability or record-reference validation; `tools/validators/src/structural/stplan-event-plan-relation-consistency.ts` enforces `SE.state_relations[]` consistency only for the `advances` relation, leaving `tests`, `blocks`, `revises`, `fulfills`, `abandons`, and `ignores` deterministically unenforced (surfaced at reassessment); `tools/validators/src/structural/stemo-orientation-records-exist.ts` checks `orientation.toward_records[]` target existence but not active status or holder accessibility (surfaced at reassessment). **Support-surface gaps**: world-index does not extract edges for `STPLAN.fallback_steps[].target_records[]`, `STPLAN.derived_from`, `STPLAN.expires_when`, predicate-reference edges within `success_condition` / `fallback_steps[].trigger_condition`, or `STEMO.expires_when`; the `branching-story-health-audit` Phase 2k STPLAN/STEMO checks cover bootstrap-drift, stale active plans, stale active emotions, and SE-plan-relation consistency but lack four deterministic deeper checks (contradictory same-holder plan cluster, long-blocked plan without fallback or action, contradictory same-holder emotion stack, suppressed-emotion-rendered-as-openly-expressed).

The audit's other recommendations — six derived MCP render packets (present-causal-situation, dramatic-irony, social-pressure, resource-access-leverage, reader-setup-payoff, branch-possibility-space), expanded `active_actor_plan_details` / `active_emotional_state_details` MCP fields, four new page-plan optional sections (§9d/§9e/§10c/§13b), and detailed §9b/§9c content in the Phase 7 reference — are explicitly out of scope for SPEC-49 and adjudicated below in §Out of Scope.

### Key design decisions

1. **Repair the existing surface, do not grow it.** This spec adjusts schemas, validators, world-index extraction, and one health-audit phase so that the SPEC-47 implementation matches the SPEC-47 contract. It introduces zero new record classes, zero new MCP packet surfaces, and zero new page-plan sections.
2. **Schema-conditioned requirements use JSON-Schema `if/then`.** STPLAN's `current_step` and `belief_basis` requirements depend on `plan_status`. Status-conditioned requirements expressed via `if/then` keep validation deterministic and avoid moving logic into custom validators when JSON Schema already supports the construct.
3. **Predicate validation extends existing infrastructure.** Worldloom already validates predicates inside `SLT.preconditions` and `SLT.exit_conditions`; the same DSL parser and record-resolution paths apply to `STPLAN.fallback_steps[].trigger_condition.predicates[]` and `STPLAN.current_step.success_condition.predicates[]`. No new DSL extension is required.
4. **World-index edge extraction follows the schema field shape.** New extraction rules are mechanical: read the field, emit one edge per resolved record reference. No new edge taxonomies; the new edges (`plan_fallback_step_target`, `plan_success_predicate_ref`, `plan_fallback_predicate_ref`, `plan_derived_from`, `plan_expires_when_ref`, `emotion_expires_when_ref`) extend the existing STPLAN/STEMO edge family per `tools/world-index/src/parse/atomic.ts:856-939`.
5. **Health-audit Phase 2k stays deterministic.** Four new checks fit Phase 2k's deterministic posture: each can be evaluated from `_source/plans/`, `_source/emotions/`, and the page chain alone, without judgment calls. Repetitive-emotional-rendering and prose-subtlety checks are explicitly judgment-based and remain out of scope per the audit report's own classification (lines 829-839).
6. **Migration posture follows SPEC-44.** Existing committed bundles produced before this spec lands continue to validate under compatibility mode (warnings, not failures) for omitted `STPLAN`/`STEMO` keys in `PG.state_snapshot.active_records`; current-contract pages (post-revision marker) fail closed. The append-only-lifecycle discipline established by SPEC-44 is the precedent.
7. **CONTEXT-PACKET-CONTRACT.md §Index + Follow-Up Retrieval Pattern is preserved.** The audit's recommendation to enrich `active_actor_plans` / `active_emotional_states` packet fields is rejected because it would invert the documented contract: packets index existence and citation handles; detail is fetched via `get_record(STPLAN-<integer>)` / `get_record(STEMO-<integer>)`. This decision is the rationale for the Out-of-Scope item R3 below.

## Approach

### A. Schema drift fixes

**A.1 PG schema active_records — add STPLAN and STEMO**

Update `tools/validators/src/schemas/story-page.schema.json` so the `state_snapshot.active_records` object property list at lines 62-66 includes `STPLAN` and `STEMO` alongside the existing 15 classes. Pattern: `^STPLAN-[0-9]+$` and `^STEMO-[0-9]+$`. Match `ACTIVE_RECORDS_CLASSES` at `tools/validators/src/_helpers/state-snapshot-replay.ts:8-26`.

Update the shared contract markdown at `.claude/skills/_shared-templates/story-record-schemas.md` lines 62-77 to list STPLAN and STEMO with the same per-class one-line description format used for STENT/STINT/SF/BEL/OBL/CNSQ/THR/SREL/STLOC/STOBJ/DA/STSTAT/CLK/STSEC/STQ.

Migration posture: bundles created before SPEC-49 lands may omit STPLAN/STEMO active-record entries even when STPLAN/STEMO records exist; this is a compatibility-mode WARN, not a FAIL. Current-contract pages (created after the revision marker) FAIL closed when an active STPLAN/STEMO record on the branch is not listed in `PG.state_snapshot.active_records.STPLAN[]` / `STEMO[]`. The revision marker is the SPEC-49 landing commit.

**A.2 CHC.grounded_in.records[] — expand allowed classes**

Update `tools/validators/src/schemas/story-choice.schema.json:66` from `^(STENT|STLOC|STOBJ|BEL|OBL|CNSQ|THR|SREL|DA)-[0-9]+$` to a pattern that additionally allows STPLAN, STEMO, CLK, STSEC, STQ, STINT, and SF.

Rationale per class:
- `STPLAN` — choices grounded in the actor's current tactical plan or fallback option must cite the plan record.
- `STEMO` — choices that exist because of affective pressure (e.g., a `flee` option available only because `STEMO` of fear status is active) must cite the emotion.
- `CLK`, `STSEC`, `STQ` — choices grounded in active staged pressure, hidden truths, or open setups should cite those records (SPEC-42 introduced these classes; choice grounding was overlooked).
- `STINT` — choices grounded in the actor's active desire/goal should cite the intention.
- `SF` — choices grounded in a branch-local fact rather than a belief should cite the fact (use sparingly; prefer `BEL` when the choice is grounded in the actor's belief, even if the belief is true).

Update the corresponding shared contract at `.claude/skills/_shared-templates/story-record-schemas.md` (CHC schema section) with the same allowed-class list, citing each rationale in one line.

Migration posture: no migration needed — existing choices grounded in the original 9 classes remain valid; new classes become available for new choices.

**A.3 state-snapshot-integrity inactive-record lifecycle — extend to STPLAN and STEMO**

Update `tools/validators/src/structural/state-snapshot-integrity.ts:276` regex from `^state_snapshot\.active_records\.(CLK|STSEC|STQ)\[\d+\]$` to include `STPLAN` and `STEMO`. Extend `allowedActiveStatuses()` at lines 305-316 with:
- STPLAN active statuses: `active`, `blocked`, `suspended`, `revised` (terminal statuses that should not appear in `active_records`: `fulfilled`, `failed`, `abandoned`).
- STEMO active statuses: `active`, `suppressed`, `dissociated` (terminal statuses that should not appear in `active_records`: `settled`, `transformed`).

The check enforces that any STPLAN or STEMO record listed in `state_snapshot.active_records.STPLAN[]` / `STEMO[]` has a non-terminal `plan_status` / emotion `status` at the page's effective time, matching the existing CLK/STSEC/STQ lifecycle gate.

Migration posture: compatibility-mode WARN for legacy pages; current-contract pages FAIL closed.

### B. Validator bug fixes

**B.1 STEMO.agency_effect — fix field-name bug in STSTAT lookup**

`tools/validators/src/structural/stemo-utils.ts:303` currently reads `stringValue(parsed.holder)` from STSTAT records. STSTAT schema (`tools/validators/src/schemas/story-status.schema.json:11`) defines no `holder` field; the entity reference is `entity`. The bug causes `holderHasCompatibleAgency()` to return false for every STEMO because `parsed.holder` is always undefined, masking incompatibility violations.

Fix: change the field read to `stringValue(parsed.entity)`. The surrounding helper structure is correct; only the field name is wrong.

Test fixture: a STEMO with `agency_effect: constrains` for holder `STENT-1` where STENT-1 has an STSTAT with `agency: constrained` must PASS; the same STEMO where STENT-1's STSTAT has `agency: free` must FAIL with a `stemo_agency_effect_incompatible` finding.

**B.2 STPLAN current_step — make requirement status-conditioned**

`tools/validators/src/schemas/story-plan.schema.json:5-16` lists `current_step` in unconditional `required`. The shared contract (`story-record-schemas.md:786`) says `current_step` is required only when `plan_status` is in the active-lifecycle set (`active`, `blocked`, `suspended`, `revised`).

Fix using JSON Schema `if/then`:
```json
"allOf": [
  {
    "if": { "properties": { "plan_status": { "enum": ["active", "blocked", "suspended", "revised"] } } },
    "then": { "required": ["current_step"] }
  }
]
```
And remove `current_step` from the unconditional `required` array at lines 5-16.

Terminal-status plans (`fulfilled`, `failed`, `abandoned`) may omit `current_step` because the field has no live meaning after closure.

Migration posture: no breaking change for active plans (they were already required to have `current_step`); legacy terminal-status records that were previously rejected for omitting `current_step` now pass.

**B.3 STPLAN belief_basis — enforce non-empty when active**

`story-plan.schema.json:31-35` declares `belief_basis` as an array of BEL references with `default: []`. The shared contract says non-empty when active.

Fix using `if/then`:
```json
{
  "if": { "properties": { "plan_status": { "enum": ["active", "blocked", "suspended", "revised"] } } },
  "then": { "properties": { "belief_basis": { "minItems": 1 } } }
}
```
The existing `stplan-belief-basis-grounded.ts` validator (which checks accessibility) continues to run unchanged.

Migration posture: bundles containing active STPLAN records with empty `belief_basis` will fail. Health-audit `bootstrap-drift` Phase 2k check can flag legacy records for repair; existing committed records may be left in compatibility mode for one full revision cycle.

**B.4 STPLAN predicate parseability and record-reference validation**

Currently the `predicateObject` schema at `story-plan.schema.json:133-140` accepts `{ pred: string, additionalProperties: true }` with no DSL parseability check or record-reference validation. Predicate strings live in:
- `STPLAN.current_step.success_condition.predicates[]`
- `STPLAN.fallback_steps[].trigger_condition.predicates[]`

Fix: add a new validator `stplan-predicate-references.ts` that for each predicate in those two locations:
1. Parses the predicate string against the closed DSL grammar (reuse the existing SLT predicate-parsability surface — grammar constants `PRED_TYPES` / `AFFECT_KINDS` / `RELATIONSHIP_AXES` / `BEHAVIORAL_PRESSURES` / `BELIEF_MODES` / `CONFIDENCE_LEVELS` / `EMOTION_INTENSITIES` / `ACTION_FAMILIES` live at `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts`; the parse-and-validate pattern is demonstrated by `tools/validators/src/rules/rule_storylet_predicate_dsl_parsability.ts`).
2. For predicates that name records (e.g., `plan_active(STPLAN-3)`, `belief_held(BEL-5, ...)`), resolves each named record ID and verifies it exists in the bundle.
3. Reports `stplan_predicate_unparseable` or `stplan_predicate_record_unresolved` findings.

The dormant helper `successConditionRecordIds()` at `tools/validators/src/structural/stplan-utils.ts:159` extracts record IDs from `current_step.success_condition`; wire it into this new validator and extend it to cover `fallback_steps[].trigger_condition` as `fallbackTriggerRecordIds()`.

Migration posture: WARN-mode rollout for one revision cycle, then FAIL.

**B.5 SE.state_relations[] — extend deterministic coverage to all declared relations**

At intake, `tools/validators/src/structural/stplan-event-plan-relation-consistency.ts` validated only the `advances` relation. The other six relation values declared in the SE state-relation vocabulary — `tests`, `blocks`, `revises`, `fulfills`, `abandons`, `ignores` — were accepted by schema but unenforced by the deterministic validator. The audit report's deterministic-validator strengthening list (line 810 item 9) identifies this as a surgical-hole gap parallel to the `advances` coverage.

Fix: extend `stplan-event-plan-relation-consistency.ts` to enforce each relation's deterministic shape:

- `advances` (existing): SE must create or supersede a current-step target or success-condition record.
- `tests`: SE must produce a state-delta touching at least one record named in `current_step.success_condition.predicates[]` record arguments — the event tests the plan's success condition without (yet) advancing or fulfilling it.
- `blocks`: SE must produce a state-delta that creates, supersedes, or closes a record named in `STPLAN.blockers[]` OR adds a new blocker via `append`-style operation — the event materializes the obstruction the plan tracks.
- `revises`: SE must supersede the `STPLAN` record itself OR supersede one of its `current_step` / `fallback_steps[]` sub-records — the event records a tactical pivot.
- `fulfills`: SE must close the `STPLAN` (supersede with `plan_status: fulfilled`) — the event records plan completion.
- `abandons`: SE must close the `STPLAN` (supersede with `plan_status: abandoned`) — the event records plan abandonment.
- `ignores`: SE must explicitly name the ignored `STPLAN` in `SE.state_relations[]` without producing any state-delta touching the plan's basis — the relation signals the actor knew of the plan and declined to engage it.

Each new relation gets its own fail-message constant paralleling the existing `stplan_event_plan_relation_consistency.no_matching_delta` (e.g., `.tests_no_predicate_touch`, `.blocks_no_obstruction_delta`, `.fulfills_status_mismatch`, etc.).

Implementation note (2026-05-19): ticket `SPEC49STPSTEINT-007` landed the B.5 relation checks fail-closed for the validator path rather than adding a WARN-mode legacy heuristic. The live repo still lacks a deterministic SPEC-49 `story_system_contract_revision` marker for classifying legacy SE relation entries, and related health-audit prose already defers hard current-contract detection until that marker exists. Latent legacy violations therefore remain ordinary validator failures; bundle migration triage stays with the health-audit compatibility surface.

**B.6 STEMO orientation — strengthen target active-status and accessibility check**

`tools/validators/src/structural/stemo-orientation-records-exist.ts` (the filename itself reveals existence-only scope) verifies that each ID in `STEMO.orientation.toward_records[]` resolves to a record but does not check whether that record is active at the emotion's `created_at_page` or accessible to the holder. The audit report (line 813 item 11) recommends *"STEMO.orientation.toward_records[] should require active/access-valid targets where appropriate; allow inaccessible only when orientation is toward a known false/imagined object through BEL."*

Fix: extend the orientation validator with two new checks paralleling `stplan-belief-basis-grounded.ts`'s `isActiveAtPlanPage` + `isRecordAccessibleToHolder` discipline:

1. **Active-at-page check**: each target ID must resolve to a record active at the STEMO's `created_at_page`. Emit `stemo_orientation_records_active.inactive_target` for inactive references.
2. **Accessibility-to-holder check**: each target must be accessible to the holder via the same accessibility predicate `stplan-belief-basis-grounded.ts` uses. Emit `stemo_orientation_records_active.inaccessible_target` for inaccessible references.

**Imagined-object carve-out**: when a target ID resolves to a BEL record with `truth_relation: false` (the believed-but-false case — orientation toward an object the holder believes exists but does not exist on the branch), the active-at-page check is waived because the imagined object need not exist as an active STENT/STOBJ/STLOC/etc.; the accessibility check still applies because the holder must have access to the BEL itself. This carve-out matches the audit's *"allow inaccessible only when orientation is toward a known false/imagined object through BEL"* clause.

Helper extension: add `isOrientationTargetAccessibleToHolder()` to `stemo-utils.ts` paralleling `stplan-utils.ts`'s `isRecordAccessibleToHolder` plus the BEL imagined-object exemption.

Migration posture: WARN-mode rollout for one revision cycle, then FAIL. Same precedent as B.5.

### C. World-index edges and health-audit deepening

**C.1 World-index STPLAN edge extraction**

`tools/world-index/src/parse/atomic.ts:856-900` extracts 8 STPLAN edges. Add:

- `plan_fallback_step_target` — one edge per resolved record reference in `STPLAN.fallback_steps[].target_records[]`. Mirrors the existing `plan_current_step_target` extraction at line 887.
- `plan_fallback_predicate_ref` — one edge per resolved record reference inside `STPLAN.fallback_steps[].trigger_condition.predicates[]` predicate arguments.
- `plan_success_predicate_ref` — one edge per resolved record reference inside `STPLAN.current_step.success_condition.predicates[]` predicate arguments.
- `plan_derived_from` — one edge per resolved record reference in `STPLAN.derived_from[]`. Mirror `emotion_derived_from` extraction at line 935.
- `plan_expires_when_ref` — one edge per resolved record reference parsed out of the `STPLAN.expires_when` string when the expression names a record ID. Pattern matches the existing string-with-record-id parse used in other extraction sites.

**C.2 World-index STEMO edge extraction**

Add `emotion_expires_when_ref` — one edge per resolved record reference parsed out of the `STEMO.expires_when` string. Mirror C.1's `plan_expires_when_ref` mechanics.

**C.3 Health-audit Phase 2k — four new deterministic checks**

`.claude/skills/branching-story-health-audit/SKILL.md:296-303` (Phase 2k) currently has four checks. Add the following four, each deterministic from the bundle alone:

1. **`stplan-contradictory-cluster`** — for each holder, scan active STPLANs and flag pairs whose `objective` strings overlap semantically with mutually exclusive predicates in `current_step.success_condition.predicates[]` (e.g., one plan requires `location(STENT-X, STLOC-A)` and another requires `location(STENT-X, STLOC-B)` where `STLOC-A != STLOC-B`). The check uses deterministic predicate intersection over normalized predicate forms; judgment-laden semantic overlap of objective prose remains out of scope and stays in the prose-craft category.
2. **`stplan-long-blocked-no-fallback`** — for each STPLAN with `plan_status: blocked` continuously across N consecutive pages (default N=3), where `fallback_steps[]` is empty OR no fallback's `trigger_condition.predicates[]` evaluates true on the current page state, flag the plan. N is configurable per bundle in `STORY_KERNEL.md` frontmatter (default 3).
3. **`stemo-contradictory-stack`** — for each holder, flag any two active STEMO records whose `affect_kind` pair appears in a closed contradictory-affect lookup table (e.g., `affection`/`hatred` toward the same target, `trust`/`betrayal-anger` toward the same actor, `hope`/`despair` regarding the same outcome). The lookup table is enumerated in the SKILL.md and remains small; unusual affect combinations not in the table are not flagged.
4. **`stemo-suppression-render-conflict`** — for each STEMO with `status: suppressed`, scan the most recent prose receipt (if attached) for `affective_transition_undisclosed` subcheck status — if the prose rendered the affect as openly expressed, flag for review. This check requires the `pages-prose-receipts/PG-<integer>.yaml` to exist; when absent, the check skips with a `prose-not-attached` note (no false-positive findings).

These four checks fit the Phase 2k deterministic posture. Repetitive-emotional-rendering and prose-subtlety remain judgment-based and out of scope per the audit report's own classification (lines 829-839).

## FOUNDATIONS Alignment

| Principle | Stance | Rationale |
|---|---|---|
| **§Story Bundles §5b — Schema Minimalism At Story Scope** | aligns | This spec adds zero fields to STPLAN/STEMO/PG/CHC schemas. Every change is either a regex extension to enumerate existing classes (A.1, A.2, A.3, C.1, C.2) or a status-conditioned `if/then` constraint over fields already in the schema (B.2, B.3). No new record classes. |
| **§Story Bundles §5c — Present Causal State, Not Narrative Shape** | aligns | No drama-manager, act-structure, or narrative-shape framing introduced. Plans and emotions remain present-causal state; the health-audit deepening (C.3) checks present-state coherence (contradictory plan clusters, contradictory emotion stacks) not future dramatic obligation. |
| **§Story Bundles §4a — Plan-Authority Boundary** | aligns | Story state remains authoritative at page-plan commit; rendered prose remains a renderable receipt. The new `stemo-suppression-render-conflict` health check (C.3.4) consumes the existing `pages-prose-receipts/PG-<integer>.yaml` surface without mutating page state, preserving the boundary. |
| **§Story Bundles §5 — Validation Rules At Story Scope (Rule 1 No Floating Facts)** | aligns | The B.1 STEMO field-name bug is a Rule 1 enforcement gap — the validator was meant to detect floating affect-status incompatibility but silently passed every case. B.4 predicate-reference validation closes the same kind of gap for STPLAN fallback/success predicates. |
| **§Canonical Storage Layer — Atomic-source append-only** | aligns | No mutation of existing committed records. Schema and validator changes operate prospectively; migration posture for legacy records is WARN-then-FAIL across a revision cycle, matching SPEC-44's append-only-lifecycle pattern. |
| **§Tooling Recommendation** | N/A defensive | New validators (B.4.1, B.5.1, B.6.1) consume the existing framework's story-bundle Context + Maps inputs supplied via `defineStplanValidator` / `defineStemoValidator`; no new world-state read surface is introduced. The world-state read contract is inherited from the validator framework's existing per-class context discipline. |
| **§Story Bundles §4 — Write Discipline (engine-only `_source/` writes)** | N/A defensive | This spec touches schemas, validators, world-index, and skill prose — no patch-engine op surfaces are modified, no new `create_*` ops are introduced. Existing `create_stplan_record` / `create_stemo_record` continue to be the only lawful mutation path. |

## Out of Scope

The following items from the second-iteration audit report (reports/new-story-structures-proposal-second-iteration.md) are explicitly out of scope for SPEC-49.

**R1. Phase 7 page-plan reference detailed §9b/§9c instructions.** The audit claims `.claude/skills/branching-story-turn-cycle/references/phase-7-page-plan.md` lacks detailed §9b/§9c. Codebase verification refutes this: the main SKILL.md at lines 150 and 168 details §9b/§9c rendering requirements, and the shared contract `.claude/skills/_shared-templates/story-state-contract.md` §413-448 provides the full template. The phase-7 reference detailing §10b only is intentional — §9b/§9c live in the contract, not the per-phase reference. No drift exists.

**R2. Detailed `active_actor_plans` / `active_emotional_states` MCP packet fields.** The audit claims these context-packet builders are "too shallow" because they omit belief basis, resource basis, blockers, fallback steps, trigger event, appraisal basis, orientation, and expiry. Codebase verification confirms the omission, but `docs/CONTEXT-PACKET-CONTRACT.md` at lines 140-141 and §Index + Follow-Up Retrieval Pattern (line 232) documents this as **intentional design**: context packets index existence and citation handles; detail is fetched per-need via `get_record(STPLAN-<integer>)` / `get_record(STEMO-<integer>)`. Enriching the packet would invert the contract and create token-bloat across every retrieval. If specific story-pipeline skill workflows demonstrate evidence of repeated follow-up calls degrading performance, that evidence should drive a future targeted packet-slice spec, not a wholesale projection enrichment.

**R3. Six derived render packets.** `present_causal_situation_packet`, `dramatic_irony_packet`, `social_pressure_packet`, `resource_access_leverage_packet`, `reader_setup_payoff_packet`, `branch_possibility_space_packet`. These are capability-expansion proposals with no verified current consumer in the codebase or audit report. The audit itself flags "projections becoming parallel state" as the central risk. Page-plan §9b/§9c are already authoritative for rendering plan/emotion content; the existing record set, fetched via `get_record`, supplies all the same input. FOUNDATIONS §5b schema-minimalism applies to MCP packet surface by analogy: each new packet is a per-page token cost charged across every retrieval, and "we might need it for richer prose" is not a verified consumer. **Defer until a sample-story evaluation produces a concrete failure trace** showing a specific packet is load-bearing for a specific consumer — at which point the spec for that one packet writes itself with verified consumer citations, per the audit report's own Priority 3 framing.

**R4. New page-plan optional sections §9d Information Asymmetry, §9e Social Pressure, §10c Resource Access Leverage, §13b Branch Possibility-Space.** These depend on R3's deferred derived packets — without a source projection to consume, the sections have no canonical input. Defer with R3.

**R5. Expanded `active_actor_plan_details` / `active_emotional_state_details` MCP packets.** Identical reasoning to R2 — would invert the documented Index + Follow-Up Retrieval contract.

**C1. New first-class active record classes** (STSCENE, STCONFLICT, STIRONY, STREP, STRES, STCLUE, STNEG, STPROC, STMETA, STPAYOFF, group affect, multi-actor coordinated plan, conversation record, procedure record, theme/motif record, reputation record, resource record, clue record, scene record, offscreen action record). The audit's executive verdict aligns with FOUNDATIONS §5b/§5c and is correctly rejected at the engine scope. No spec text required beyond this affirming note; no SPEC-49 action.

**C2. Named `supersede_stplan_record` / `supersede_stemo_record` patch-engine ops.** The audit itself accepts that the current create-with-`supersedes` path is consistent with most story-state classes. CLK/STSEC/STQ named-supersede ops remain exceptional discoverability wrappers; no parity addition is needed. Documentation updates to clarify the supersession path (per the audit's recommendation) are sufficient and folded into the per-class skill prose at the next sibling-skill amendment cycle, not into SPEC-49.

**D1. Judgment-based audit categories** (repetitive emotional rendering, dramatic-irony quality, payoff feel, social-consequence dramatic strength, plan cleverness, choice-menu aesthetic variety beyond structural non-collapse). The audit itself classifies these as judgment-based (lines 829-839); they remain prose-craft / health-audit-finding territory, not deterministic gates. No spec action.

## Deliverables

### Phase A: Schema drift fixes

- A.1.1 `tools/validators/src/schemas/story-page.schema.json` — add STPLAN, STEMO to `state_snapshot.active_records` property list.
- A.1.2 `.claude/skills/_shared-templates/story-record-schemas.md` — mirror A.1.1 in the active-records key list (lines 62-77).
- A.1.3 `tools/validators/src/structural/state-snapshot-integrity.ts` — extend the inactive-record regex (line 276) and `allowedActiveStatuses()` (lines 305-316) to cover STPLAN and STEMO with the lifecycle status sets specified in §A.3.
- A.2.1 `tools/validators/src/schemas/story-choice.schema.json` — expand the `grounded_in.records[]` pattern at line 66 to include STPLAN, STEMO, CLK, STSEC, STQ, STINT, SF.
- A.2.2 `.claude/skills/_shared-templates/story-record-schemas.md` — mirror A.2.1 in the CHC schema section with per-class rationale lines.
- A.2.3 Skill-prose touches in `.claude/skills/branching-story-turn-cycle/SKILL.md` choice-emission discipline and `.claude/skills/branching-story-bootstrap/SKILL.md` opening-choice discipline: clarify that choices grounded materially in active plan, emotion, clock, secret, question, intention, or branch-local fact must cite the relevant record.

### Phase B: Validator bug fixes

- B.1.1 `tools/validators/src/structural/stemo-utils.ts:303` — change `parsed.holder` to `parsed.entity`. One-line fix.
- B.1.2 Test fixture under `tools/validators/test/` covering the STEMO/STSTAT compatibility check (PASS and FAIL cases).
- B.2.1 `tools/validators/src/schemas/story-plan.schema.json` — remove `current_step` from unconditional `required` and add the `if/then` clause for active-lifecycle statuses.
- B.3.1 `tools/validators/src/schemas/story-plan.schema.json` — add the `if/then` clause requiring `belief_basis` `minItems: 1` for active-lifecycle statuses.
- B.4.1 New validator `tools/validators/src/structural/stplan-predicate-references.ts` covering parseability and record-resolution for `current_step.success_condition.predicates[]` and `fallback_steps[].trigger_condition.predicates[]`.
- B.4.2 Extend `tools/validators/src/structural/stplan-utils.ts` with `fallbackTriggerRecordIds()` helper paralleling the existing `successConditionRecordIds()` at line 159.
- B.4.3 Validator registry wiring — register B.4.1 in `tools/validators/src/public/registry.ts` alongside the existing structural validators (e.g., `stplanBeliefBasisGrounded` at line 41) so the dispatch on `create_stplan_record` and bundle-replay validation passes engage the new check.
- B.4.4 Test fixtures covering parseable/unparseable predicates and resolvable/unresolvable record references.
- B.5.1 `tools/validators/src/structural/stplan-event-plan-relation-consistency.ts` — extend the existing relation-consistency check to enforce the deterministic shape of each of the six formerly uncovered SE.state_relations values (`tests`, `blocks`, `revises`, `fulfills`, `abandons`, `ignores`) per the rubrics in §B.5. Existing `advances` enforcement is preserved unchanged.
- B.5.2 Per-relation fail-message constants paralleling the existing `stplan_event_plan_relation_consistency.no_matching_delta` (one per newly enforced relation: `.tests_no_predicate_touch`, `.blocks_no_obstruction_delta`, `.revises_no_supersession`, `.fulfills_status_mismatch`, `.abandons_status_mismatch`, `.ignores_unexpected_delta`).
- B.5.3 Test fixtures under `tools/validators/test/` covering each of the 6 enforced relations (PASS + FAIL cases per relation), with the existing `advances` test extended to cover the new validator surface.
- B.6.1 `tools/validators/src/structural/stemo-orientation-records-exist.ts` — extend the existing existence check to verify `orientation.toward_records[]` targets are active at the emotion's `created_at_page` and accessible to the holder, with the BEL-imagined-object carve-out per §B.6.
- B.6.2 Helper `isOrientationTargetAccessibleToHolder()` added to `tools/validators/src/structural/stemo-utils.ts` paralleling `stplan-utils.ts`'s `isRecordAccessibleToHolder`, plus the BEL imagined-object exemption (`truth_relation: false` waives the active-at-page check).
- B.6.3 Test fixtures covering (a) active+accessible target passes; (b) inactive target fails with `.inactive_target`; (c) accessible-but-inactive carve-out for BEL imagined targets passes; (d) inaccessible target fails with `.inaccessible_target`.

### Phase C: World-index edges and health-audit deepening

- C.1.1 `tools/world-index/src/parse/atomic.ts` — add STPLAN edge extraction for `plan_fallback_step_target`, `plan_fallback_predicate_ref`, `plan_success_predicate_ref`, `plan_derived_from`, `plan_expires_when_ref` (insert near the existing STPLAN extraction block at lines 856-900).
- C.2.1 `tools/world-index/src/parse/atomic.ts` — add STEMO edge extraction for `emotion_expires_when_ref` (insert near the existing STEMO extraction block at lines 902-939).
- C.3.1 `.claude/skills/branching-story-health-audit/SKILL.md` Phase 2k — add the four new deterministic checks (`stplan-contradictory-cluster`, `stplan-long-blocked-no-fallback`, `stemo-contradictory-stack`, `stemo-suppression-render-conflict`) with check descriptions, finding codes, and pass/fail rubrics.
- C.3.2 The closed contradictory-affect lookup table for `stemo-contradictory-stack` enumerated inline in the SKILL.md.
- C.3.3 The default-N=3 threshold for `stplan-long-blocked-no-fallback` declared as a per-bundle override in STORY_KERNEL.md frontmatter.

### Cross-phase

- C-X.1 Spec landing commit serves as the SPEC-49 revision marker. Bundles created or recommitted after that commit are current-contract; legacy bundles run under compatibility-mode WARN posture for A.1, A.3, B.3, and B.4 for one full revision cycle.
- C-X.2 Migration documentation: a short section in `.claude/skills/branching-story-health-audit/SKILL.md` describing how `bootstrap-drift` Phase 2k can be used to identify legacy bundles needing repair for the new constraints.

## Risks & Open Questions

**Risk R-49-1 — `if/then` JSON Schema constructs in legacy validator runtime. RESOLVED at reassessment (2026-05-19).** `tools/validators/package.json` declares `"ajv": "8.20.0"`. AJV 8.x supports JSON Schema draft-07 `if/then/else` natively with no special configuration required. The risk's open question — whether the framework's AJV version supports the construct — is closed; Phase B implementation may use `if/then` directly without a fallback validator.

**Risk R-49-2 — Predicate parser availability. RESOLVED at reassessment (2026-05-19).** B.4's path citation in earlier drafts named `tools/validators/src/_helpers/predicate-parser.ts`, which does not exist (`_helpers/` ships only `index-access.ts` and `state-snapshot-replay.ts`). The actual reusable surface is `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts` (grammar constants imported by SLT validators) plus `tools/validators/src/rules/rule_storylet_predicate_dsl_parsability.ts` (the SLT parsability validator demonstrating the parse-and-validate pattern). B.4.1 reuses these surfaces directly; no separate parser-extraction work is required and Phase B is not blocked behind a smaller spec.

**Risk R-49-3 — Compatibility-mode WARN noise.** Legacy bundles with non-current-contract STPLAN/STEMO state (no active-records entries, empty `belief_basis` on active plans) will produce a WARN cluster on first validation. Mitigation: the existing health-audit `bootstrap-drift` check (already present in Phase 2k) is the established surface for surfacing these to the user during a maintenance pass; no separate migration tool is needed.

**Risk R-49-4 — Predicate validation may surface authoring errors latent in pilot bundles.** B.4 will likely flag predicates in existing committed STPLANs that were authored before predicate validation existed. Mitigation: WARN-mode rollout for one revision cycle before flipping to FAIL gives users time to repair. This is the SPEC-44 append-only-lifecycle precedent.

**Risk R-49-5 — `stemo-contradictory-stack` lookup-table maintenance.** The closed contradictory-affect table (C.3.3) needs to be small enough to maintain and large enough to be useful. Open question: pilot with an initial 5-7 entry table and expand only when sample-story evidence demonstrates a missed contradictory cluster. The lookup table format must support entries scoped by `affect_kind` pair plus an optional `same_target_required: bool` flag.

**Risk R-49-6 — `stemo-suppression-render-conflict` requires prose receipts.** C.3.4 only fires when a prose receipt exists. For bundles where prose is not yet attached, the check is silent. This is intentional — the check is a quality gate for attached prose, not a state-only check. No mitigation needed; the silent-when-no-receipt behavior is documented.

## Test Plan

**Per-phase fixture tests** (under `tools/validators/test/` or the equivalent test root):

- **A.1**: A bundle with an active STPLAN-1 and STEMO-1 on a current-contract page must list both in `PG.state_snapshot.active_records.STPLAN[]` / `STEMO[]` to pass. A bundle omitting them on a current-contract page must FAIL. A legacy-marker bundle omitting them WARNs.
- **A.2**: A CHC with `grounded_in.records: [STPLAN-1]` must pass schema validation. A CHC with `grounded_in.records: [INVALID-1]` must fail. CHCs grounded in any of the seven new classes (STPLAN, STEMO, CLK, STSEC, STQ, STINT, SF) pass; classes outside the 16-class union fail.
- **A.3**: A current-contract page listing STPLAN-1 in active_records where STPLAN-1 has `plan_status: fulfilled` must FAIL with the established inactive-record finding code (paralleling the existing CLK/STSEC/STQ behavior). A page listing STPLAN-1 where STPLAN-1 has `plan_status: active` must PASS.
- **B.1**: STEMO compatibility round-trip per §B.1 test fixture above.
- **B.2**: A STPLAN with `plan_status: fulfilled` and no `current_step` passes; a STPLAN with `plan_status: active` and no `current_step` fails.
- **B.3**: A STPLAN with `plan_status: active` and `belief_basis: []` fails; a STPLAN with `plan_status: fulfilled` and `belief_basis: []` passes.
- **B.4**: Parseable predicate with resolvable record refs passes; unparseable predicate FAILs with `stplan_predicate_unparseable`; parseable predicate referencing nonexistent record ID FAILs with `stplan_predicate_record_unresolved`.
- **B.5**: For each of the seven declared relations (`advances`, `tests`, `blocks`, `revises`, `fulfills`, `abandons`, `ignores`), an SE with `state_relations[]` referencing the relation against a STPLAN must PASS when the SE's state-delta matches the rubric in §B.5 (existing record-ID touch, status change, or supersession as required by the relation's rule) and FAIL with the relation-specific fail-message constant otherwise. The pre-existing `advances` test stays green; the six formerly uncovered relations each gain one PASS + one FAIL case.
- **B.6**: A STEMO with `orientation.toward_records: [STENT-1]` where STENT-1 is inactive at the emotion's `created_at_page` must FAIL with `stemo_orientation_records_active.inactive_target`; the same STEMO where STENT-1 is active and accessible to the holder must PASS; a STEMO with `orientation.toward_records: [BEL-5]` (BEL with `truth_relation: false`) representing imagined-object orientation must PASS without active-status check on the BEL but with accessibility check on the BEL itself; an inaccessible target must FAIL with `stemo_orientation_records_active.inaccessible_target`.
- **C.1, C.2**: World-index round-trip — create a STPLAN with `fallback_steps`, `derived_from`, `expires_when` populated, rebuild the index, verify each new edge appears in the indexed graph.
- **C.3**: Health-audit fixtures covering each of the four new checks with a known-FAIL and known-PASS bundle each.

**End-to-end test inherited from SPEC-47**: create → snapshot → replay → page plan → prose receipt round-trip for STPLAN and STEMO, extended to verify each new check fires correctly along the pipeline.

## Outcome

Completed: 2026-05-19.

Implemented through archived ticket family:

- `archive/tickets/SPEC49STPSTEINT-001.md`
- `archive/tickets/SPEC49STPSTEINT-002.md`
- `archive/tickets/SPEC49STPSTEINT-003.md`
- `archive/tickets/SPEC49STPSTEINT-004.md`
- `archive/tickets/SPEC49STPSTEINT-005.md`
- `archive/tickets/SPEC49STPSTEINT-006.md`
- `archive/tickets/SPEC49STPSTEINT-007.md`
- `archive/tickets/SPEC49STPSTEINT-008.md`
- `archive/tickets/SPEC49STPSTEINT-009.md`
- `archive/tickets/SPEC49STPSTEINT-010.md`
- `archive/tickets/SPEC49STPSTEINT-011.md`

Final verification:

- `npm test` from `tools/validators` passed on 2026-05-19: 663 tests, 0 failures. This final suite includes the SPEC-49 capstone, the updated SPEC-47 edge-registry count, schema/validator fixtures, and the relevant world-index temp-build assertions exercised through validators integration tests.

When SPEC-49 lands, the SPEC-47 STPLAN/STEMO implementation matches the SPEC-47 contract: schemas, validators, world-index, and health-audit Phase 2k all enforce the documented invariants without runtime/schema drift. The six classes of bug (silent-pass field-name mismatch, unconditional-vs-conditional schema requirement, empty-array under-enforcement, opaque-predicate gap, `advances`-only state-relations under-enforcement, existence-only orientation check) are closed. World-index edge coverage is symmetric across STPLAN and STEMO schema fields. The four Phase 2k deeper checks catch contradiction and starvation patterns that the original Phase 2k missed.

This is intended to be the final hardening pass on STPLAN/STEMO as designed. Future expansion (derived MCP render packets, page-plan optional sections, new active-record classes) is deferred until sample-story evaluation produces concrete failure traces that name specific consumers. The audit report's executive verdict — that the ontology is structurally complete and the engineering effort should shift from class expansion to integration hardening — is honored by this spec.
