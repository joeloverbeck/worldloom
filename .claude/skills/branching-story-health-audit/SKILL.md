---
name: branching-story-health-audit
description: "Use when diagnosing the health of a branching-story bundle. Five modes: structural (default; replay + snapshots + isolation + debt + belief/visibility + DA health + mystery/canon + continuation + CLK/STSEC/STQ mechanism health + STPLAN/STEMO health + active-state underuse + STCHAR authority health + reactivity inertness + storylet pool coverage), compatibility (schema-drift compatibility reporting), prose (compare rendered prose + receipts against state), remediation (draft RSP-<integer> cards consumed by commitment-block-authoring), cross_story (sibling-bundle contradiction scan). Produces: audits/SAU-<integer>-<date>.md + optional audits/SAU-<integer>/remediation-storylet-proposals/RSP-<integer>-<slug>.md + audits/INDEX.md update. Mutates: only worlds/<world_slug>/stories/<story_slug>/audits/."
user-invocable: true
arguments:
  - name: world_slug
    description: "Existing world directory slug under worlds/"
    required: true
  - name: story_slug
    description: "Existing story bundle slug under worlds/<world_slug>/stories/"
    required: true
  - name: mode
    description: "Comma-separated list of modes; default 'structural'. Valid: structural, compatibility, prose, remediation, cross_story. Modes can be combined, including structural,compatibility."
    required: false
  - name: branch_path_filter
    description: "BR-<integer> or list; restricts structural checks to named branches + descendants. Default: all branches."
    required: false
  - name: severity_threshold
    description: "error | warning | info; default 'info' (report everything). When 'error', only error-severity findings appear; 'warning' reports errors + warnings."
    required: false
  - name: emit_remediation_requests
    description: "true | false; default false. When true, the audit drafts RSP-<integer> cards for fixable findings even if 'remediation' is not in mode. When 'remediation' is in mode, RSP drafting is unconditional."
    required: false
---

# Branching Story Health Audit

Diagnose the health of a branching-story bundle via deterministic structural-replay checks, optional compatibility-drift reporting, optional prose-mode receipt scan, optional advisory STCHAR source-drift reporting, optional remediation-mode RSP card drafting, and optional cross-story contradiction scan — the audit never mutates story state or world canon.

<HARD-GATE>
Do NOT write `audits/SAU-<integer>-<YYYY-MM-DD>.md`, any `audits/SAU-<integer>/remediation-storylet-proposals/RSP-<integer>-<slug>.md` cards, or update `audits/INDEX.md` until:

(a) Pre-flight Check has completed: bundle resolved at `worlds/<world_slug>/stories/<story_slug>/`; `SAU` id allocated via `mcp__worldloom__allocate_next_id`; world canon context packet loaded via `mcp__worldloom__get_context_packet(world_slug, task_type='branching_story_health_audit', ...)`; for `cross_story` mode, sibling bundles in `worlds/<world_slug>/stories/` enumerated.

(b) Phases 1-6 have completed in working memory: branch tree built from `_source/branches/` + `_source/pages/` (Phase 1); 15 structural sub-phases (2a replay, 2b branch isolation, 2c debt health, 2d belief / visibility health, 2x DA health, 2e mystery / canon safety, 2f continuation / terminal proof, 2g causal dependency health, 2h canon baseline drift, 2i CLK / STSEC / STQ mechanism health, 2k STPLAN / STEMO health, 2l active-state underuse warnings, 2m STCHAR authority health, 2n reactivity inertness, 2o storylet pool coverage) executed when `structural` in mode (default); compatibility-drift reporting executed when `compatibility` in mode; prose checks executed when `prose` in mode; cross-story contradiction scan executed when `cross_story` in mode; `RSP-<integer>` cards drafted when `remediation` in mode OR `emit_remediation_requests: true`; SAU report drafted with severity-filtered findings table.

(c) The user has explicitly approved the deliverable summary (audit path, modes run, severity breakdown, top-5 highest-severity findings one-line each, RSP card count + per-card `repair_kind` summary, recommended next-step sibling per `repair_kind` cluster).

This gate is authoritative under Auto Mode or any other autonomous-execution context — invoking this skill does not constitute approval of the deliverable summary.
</HARD-GATE>

## Process Flow

```
Pre-flight Check (load FOUNDATIONS + shared contract; resolve bundle;
  allocate SAU id; load world canon context packet; enumerate sibling
  bundles if cross_story in mode)
        |
        v
Phase 1: Scope branches (build tree from BR + PG; apply
                         branch_path_filter)
        |
        v
Phase 2 [structural; default]: 15 sub-phases executed sequentially
  ├─ 2a: Replay events (snapshot hash comparison)
  ├─ 2b: Branch isolation
  ├─ 2c: Debt health
  ├─ 2d: Belief / visibility health
  ├─ 2x: DA health
  ├─ 2e: Mystery / canon safety
  ├─ 2f: Continuation / terminal proof
  ├─ 2g: Causal dependency health
  ├─ 2h: Canon baseline drift
  ├─ 2i: CLK / STSEC / STQ mechanism health
  ├─ 2k: STPLAN / STEMO health
  ├─ 2l: Active-state underuse warnings
  ├─ 2m: STCHAR authority health
  ├─ 2n: Reactivity Inertness
  └─ 2o: Storylet Pool Coverage
        |
        v
Phase 2j [conditional on `compatibility` in mode]: Compatibility drift
        (runs alongside structural in `structural,compatibility` mode;
         emits a separate SAU section)
        |
        v
Phase 3 [conditional on `prose` in mode]: Prose checks (5 finding
                                                        types over
                                                        prose + receipts)
        |
        v
Phase 4 [conditional on `cross_story` in mode]: Cross-story
                                                contradiction scan
        |
        v
Phase 5 [conditional on `remediation` in mode OR
         emit_remediation_requests=true]: Draft RSP cards
        |
        v
Phase 6: Author SAU report (apply severity_threshold filter)
        |
        v
Phase 7: HARD-GATE fires → write SAU report + RSP cards (if any)
                          + INDEX update
```

## Inputs

### Required

- `world_slug` — string — existing world directory slug under `worlds/`
- `story_slug` — string — existing story bundle slug under `worlds/<world_slug>/stories/`

### Optional

- `mode` — comma-separated list — default `structural`. Valid values: `structural`, `compatibility`, `prose`, `remediation`, `cross_story`. Modes can be combined, including `structural,compatibility` for structural checks plus compatibility-drift reporting in one SAU.
- `branch_path_filter` — `BR-<integer>` or list — restricts structural checks to named branches + descendants. Default: all branches.
- `severity_threshold` — enum — `error | warning | info`. Default: `info` (report everything).
- `emit_remediation_requests` — `true | false` — default `false`. Forces RSP drafting even without explicit `remediation` mode.

## Output

- `audits/SAU-<integer>-<YYYY-MM-DD>.md` — Always (audit report with severity-filtered findings table)
- `audits/SAU-<integer>/remediation-storylet-proposals/RSP-<integer>-<slug>.md` — One per fixable finding when `remediation` in mode OR `emit_remediation_requests: true`. Sub-directory created on first use.
- `audits/INDEX.md` — Always (updated last)

All direct-write markdown. No patch-engine submissions — the audit is read-only with respect to bundle records.

## World-State Prerequisites

Before this skill acts, it MUST receive (per FOUNDATIONS §Tooling Recommendation):

- `docs/FOUNDATIONS.md` — §Story Bundles §4b / §5 / §5a / §5b / §6a govern the audit checks
- `.claude/skills/_shared-templates/story-state-contract.md` — §5 closed predicate DSL, §7 nine hard gates, §9 branching procedure, §11 mystery and canon authority
- `.claude/skills/_shared-templates/story-record-schemas.md` — §4 record schemas (audit reads against)
- `.claude/skills/_shared-templates/story-record-schemas.md` §4.5.17 / §4.5.18, `.claude/skills/_shared-templates/story-state-contract.md` §5 / §5a, `docs/CONTEXT-PACKET-CONTRACT.md`, and `docs/MACHINE-FACING-LAYER.md` — canonical STPLAN/STEMO schema, predicate/tag, context summary, and edge surfaces for Phase 2k
- `worlds/<world_slug>/stories/<story_slug>/_source/branches/BR-*.yaml` — branch tree
- `worlds/<world_slug>/stories/<story_slug>/_source/pages/PG-*.yaml` — page snapshots
- `worlds/<world_slug>/stories/<story_slug>/_source/events/SE-*.yaml` — event deltas
- `worlds/<world_slug>/stories/<story_slug>/_source/<class>/*.yaml` — every other record class read per Phase 2 sub-phase needs (SF, BEL, OBL, CNSQ, THR, SREL, STENT, STSTAT, STINT, STLOC, STOBJ, DA, CLK, STSEC, STQ, STPLAN, STEMO, STCHAR, SLT, CHC)
- `worlds/<world_slug>/stories/<story_slug>/pages-prose/<page_id>.md` + `pages-prose-receipts/<page_id>.yaml` — Phase 3 prose checks (conditional on `prose` in mode)
- `worlds/<world_slug>/stories/<sibling_story_slug>/_source/` — Phase 4 cross-story checks (conditional on `cross_story` in mode); may be empty if this is the only bundle in the world
- World canon context packet via `mcp__worldloom__get_context_packet(world_slug, task_type='branching_story_health_audit', story_slug=<story_slug>, seed_nodes=<every M-<integer> + every INV + parent CFs for the bundle's mirrored SF records>, token_budget=<default>)`; story-local records such as active cast `STENT` and mirrored `SF` records are loaded through `story_slug` + `story_bundle_context` or targeted `mcp__worldloom__get_records` / `mcp__worldloom__list_records`, not world-scope `seed_nodes`; the latest `change_log_entry` in governing context is the current world-canon revision for §4b canon-baseline drift checks

Bundle MUST exist. For `cross_story`, sibling bundles are enumerated at Pre-flight (zero siblings is legitimate and produces a no-op for Phase 4).

Targeted retrieval discipline: `story_bundle_context` is an index and summary surface, not full audit authority. When it identifies a material `STPLAN` / `STEMO` / `STSEC` / `STQ` / `CLK` record, retrieve the full body with `mcp__worldloom__get_record`, `mcp__worldloom__get_records`, or a filtered `mcp__worldloom__list_records(..., include_full_body=true)` before issuing CHC-grounding, SLT predicate/effect, PG/SE, prose-receipt, or health findings that depend on basis, blockers, appraisal, orientation, clue, payoff, or clock payload detail.

## Pre-flight Check

Before Phase 1:

1. Load `docs/FOUNDATIONS.md` and `.claude/skills/_shared-templates/story-state-contract.md`. Abort with clear missing-file error on any unreadable path.
2. Resolve `worlds/<world_slug>/stories/<story_slug>/`. Abort with bundle-not-found error if missing.
3. Parse `mode` argument — comma-separated list of `structural | compatibility | prose | remediation | cross_story`; default to `structural` if absent. Validate every named mode is in the valid set. `compatibility` may run alone for schema-drift reporting or as `structural,compatibility` to keep structural findings and compatibility findings in separate SAU sections.
4. Allocate `SAU` id via `mcp__worldloom__allocate_next_id(world_slug, 'SAU', story_slug=<story_slug>)`. **`RSP` ids are allocated at Phase 5 per-finding** via `mcp__worldloom__allocate_next_id(world_slug, 'RSP', story_slug=<story_slug>, audit_id='SAU-<integer>')` — deferred-allocation pattern, since the count of fixable findings is unknown until phases complete.
5. Load story-local audit inputs through `story_slug` scoped retrieval: use `story_bundle_context` and targeted `mcp__worldloom__get_records` / `mcp__worldloom__list_records` for active cast `STENT` ids (Phase 2d belief / visibility checks), mirrored `SF` records, and other bundle-local ids. Load the world canon context packet with `story_slug=<story_slug>` and seed it only with world-scope ids: every `M-<integer>` (whole-class for forbidden-resolution and cumulative-accretion checks in Phase 2e), every `INV` record (whole-class for invariant verification in Phase 2e), and parent `CF` records derived from mirrored `SF` records (for Phase 2e canon-authority classification). Extract the current world-canon revision from the latest `change_log_entry` in the context packet (`CH-<integer>`, or `null` only if no change log exists).
6. If `cross_story` in `mode`: enumerate `worlds/<world_slug>/stories/*/` directories; for each sibling bundle, load its `_source/` record-index sufficient for Phase 4 contradiction checks (mirrored `SF` records keyed by CF ids in `derived_from`, `SE.promotion_claims[]` queue, terminal-closure inherited-debt notes).

Packet recovery: see
`.claude/skills/_shared-templates/persisted-packet-recovery.md`. Two failure
modes are covered there — if `get_context_packet` (or `get_records` /
`describe_envelope_schema`) returns `delivery_status: persisted_with_summary`,
retrieve required slices via `mcp__worldloom__get_persisted_packet_slice`
before continuing; if `get_context_packet` errors with
`code: packet_incomplete_required_classes` (required full bodies exceed the
harness ceiling), follow the shared template's §When Required Classes Cannot
Fit fallback (per-class `list_records(..., include_full_body=true)` plus
targeted `get_records` for named seeds).

If any precondition fails, the skill aborts before Phase 1.

## Phase 1: Scope branches

Build the branch tree from `_source/branches/BR-*.yaml` records. For each branch:

- Identify the root page (the page with no `parent_page_id` whose `branch_id` matches).
- Identify the active leaf (the page with the highest `turn_index` in the branch and no descendant page citing it as `parent_page_id`).
- Identify any terminal pages (`PG.state_snapshot.continuation.terminal_status ∈ {terminal_closed, branch_pause}`).
- Determine descendants and ancestors via `parent_branch_id` traversal.

Apply `branch_path_filter` if supplied — restrict Phases 2c (debt health), 2f (continuation), 3 (prose), and Phase 2a (replay walks) to the named branches + their descendants. Phases 2b (branch isolation) and 2e (mystery / canon safety) still scan all branches because cross-branch findings are their core concern.

Output: a scoped branch list + per-branch metadata used by Phases 2-4.

## Phase 2: Structural checks (mandatory when `structural` in `mode`; default)

Fifteen sub-phases run in sequence. Findings accumulate into a shared in-memory pool with severity (`error | warning | info`), branch scope (`branch_id` or `cross_branch`), record references, and pre-assigned `repair_kind` (for Phase 5 RSP drafting).

### Phase 2a: Replay events

For each scoped branch:

1. Load the root page's `state_snapshot`.
2. Walk the page chain in branch order.
3. For each page, apply the corresponding `SE.state_delta` to the running snapshot (create / supersede / close primitives). Treat §4.3a audit-only `prose_attach` and `promotion_closeout` events as ledger-only no-ops: they are walkable evidence but do not alter cumulative state and must not appear as a page's `PG.input.resolved_event_id`.
4. Read `SE.commitment.selected_slt_id`, `SE.commitment.selection_source`, and `SE.commitment.alias_bindings` to explain which causal move fired and which predicate-DSL aliases were bound before the delta applied. For `event_kind: story_start | prose_attach | promotion_closeout`, require `selection_source: none` and `selected_slt_id: null`; §4.3a additionally requires empty alias bindings for audit-only events. All other replayed events must name the selected or generated `SLT`.
5. Compute the running snapshot's hash (sha256 over canonicalized YAML) and compare to `PG.state_hash`. The replay includes `entity_status` through the active `STSTAT` projection enforced by `snapshot_replay_equality`; no separate hand-authored `entity_status` block is trusted.
6. Divergence → `snapshot_replay_mismatch` finding, `severity: error`, `repair_kind: branch_flag` (replay corruption is not auto-repairable).
7. Apply Choice Consequence Integrity to each replayed accepted `CHC` selection or accepted write-in: if its `SE.state_delta.create`, `SE.state_delta.supersede`, and `SE.state_delta.close` are all empty, no story-bundle record is created / superseded / closed, no visibility or affordance state changes, and neither the committed `SE`/`PG` rationale nor the emitted `CHC` marks the choice as rhetorical or expressive, emit `cosmetic_accepted_choice`, `severity: error`, `repair_kind: turn_repair`.
8. Replay each committed non-terminal `PG`'s emitted `CHC` set with the same material axes as the page-commit validator: `target_or_action_families`, `grounded_in.records`, and `likely_state_pressure`. If every emitted choice shares the same material signature and neither the committed `SE`/`PG` rationale nor emitted `CHC` metadata marks at least two named CHCs as rhetorical or expressive variants, emit `choice_set_collapse_observed`, `severity: error`, `repair_kind: turn_repair`. If an identical unmarked pair appears beside a materially distinct choice, include a warning row using the validator's `choice_set_rhetorical_unmarked` code so historical menus can be triaged without confusing it with the commit-time `choice_set_collapse` gate.

When replaying repair events, distinguish `system_repair` (engine-initiated repair such as schema-gate recovery) from `audit_repair` (audit-finding-driven repair). The old undifferentiated value is not a valid current-contract event kind.

### Phase 2b: Branch isolation

Flag:

- `branch_isolation_leak` — records in a branch's `state_snapshot.active_records` whose `created_at_page` belongs to a sibling branch. ERROR; `repair_kind: branch_flag`.
- `global_author_pool_branch_dependency` — global-author-pool `SLT` records (`scope.visibility: global_author_pool`) with preconditions referencing a `branch_local_record` per the shared story-state contract §4.2 branch-scope vocabulary. ERROR; `repair_kind: commitment_block` (the SLT needs rework into a branch-scoped block).
- `state_reference_dangling` — `PG` / `SE` / emitted `CHC` references to records that don't exist in the page's active snapshot. ERROR; `repair_kind: turn_repair` (the state turn must repair the dangling reference or add the missing state).
- `choice_state_reference_dangling` — emitted `CHC` records whose `grounded_in.records[]` cite records not in the emitting page's active snapshot, or whose `grounded_in.affordance_ordinals[]` cite visible-affordance ordinals not present on that page. ERROR; `repair_kind: turn_repair`.

### Phase 2c: Debt health

For each open `OBL` / `CNSQ` / `THR` in the scoped branches' leaf snapshots, read debt salience from the record's required `urgency` field:

- `unactionable_debt` — no eligible author-pool SLT block's preconditions are satisfiable against the debt + leaf state. Treat the existential predicates as actionable when the leaf state has a matching active record: `any_obligation_open` can match an open `OBL`, `any_consequence_pending` can match a pending `CNSQ`, and `any_thread_active` can match an active `THR`, with `urgency`, kind/tag, and role/derived-from filters applied. If the matching block references the matched record through `bound:<alias>` in `effects` / `likely_effects`, count it as actionable only when that alias is bound by a same-`SLT` precondition. Severity scales with record `urgency`: HIGH → WARNING; MEDIUM → WARNING; LOW → INFO. `repair_kind: commitment_block` (the bundle needs a new block addressing this debt).
- `invalidated_debt` — the debt's preconditions have been broken upstream (entity death / location move / belief shift that should have closed the debt). WARNING; `repair_kind: turn_repair` (a repair turn closes or transfers the debt).
- `ignored_debt_beyond_urgency` — HIGH-urgency debt has been ignored for >5 pages; MEDIUM-urgency for >10 pages. WARNING; `repair_kind: commitment_block` (urgent debt needs payoff path).
- `saliency_starvation` — replay each scoped branch's page chain and flag a high-urgency `OBL` / `CNSQ` / `THR` / `STINT` that remains open across `N=3` consecutive pages while lower-urgency `SLT` blocks are repeatedly selected and the relevant `SE.world_logic_rationale` entries do not cite why the high-urgency record was outranked. The finding cites the starved record id, the three-page window or longer window, selected `SLT` ids, and any missing rationale pages. WARNING; `repair_kind: commitment_block` when a payoff block is missing, otherwise `turn_repair` when the selection rationale must be repaired.

### Phase 2d: Belief / visibility health (per FOUNDATIONS §Story Bundles §6a)

Flag:

- `expected_witness_completeness` — events involving secrecy, betrayal, deception, violence, sex, law, status, or public ritual whose computed expected witness groups are not covered by a `BEL` create/supersession or a structured non-propagation fact in `SE.non_propagation_facts[]`. Compute `direct` witnesses from active `STENT` records at the event location per active `STSTAT.location`, excluding unconscious/dead/incapacitated/unavailable entities; compute `indirect` witnesses from public or factional holders reached through law, ritual, bureaucracy, artifact circulation, public violence, visible environmental change, or accessible `DA` / `STOBJ` evidence; treat concealed, offstage, unconscious, socially barred, or access-lacking entities as `excluded`. When a propagation route is named in prose or rationale but no `DA` / `STOBJ` / `STLOC` / `BEL.basis` record encodes the evidence path, classify the audit verdict as `judgment_assisted_indirect_propagation_unverified` and surface it in the audit report alongside deterministic findings. Valid non-propagation facts use `{reason: <closed reason>, group: <computed direct-group label>, records: [<record_ids>]}`, where `<reason>` is one of `no_witness`, `witness_incapacitated`, `evidence_concealed`, `institution_suppresses_report`, or `event_leaves_no_accessible_trace`; `<computed direct-group label>` is one of `direct`, `direct_witnesses`, `direct:<STLOC-id>`, or `location:<STLOC-id>` per shared contract §5a.2. For direct-witness coverage under `expected_witness_coverage`, accept either a public-coverage `BEL` (`visibility: public | shared | factional | rumored`) or a non-propagation fact with a legal computed direct-group `group`; private, concealed, and suppressed BEL records can be semantically correct under FOUNDATIONS §Story Bundles §6a but do not discharge that validator per shared contract §5a.3. Malformed facts are `expected_witness_fact_malformed`, and missing facts for uncovered groups are `expected_witness_fact_missing`. The structural validator `expected_witness_coverage` performs semantic STLOC + STSTAT co-location witness-group computation and activates for the trigger families in shared contract §5a.3, including non-actor `STSTAT` supersession; see `tools/validators/src/structural/expected-witness-coverage.ts` and SPEC-36 D2. Per SPEC-37 D2 and SPEC-40 D2, the validator mechanizes only the DA-anchored indirect cue: an SE creates a `DA` with `circulation` in `{public, factional}`, and one same-SE `BEL` references that DA via `basis.access_records[]` with `basis.access_route` in `{document, object_trace, location_trace, rumor, surveillance, institutional_channel, magic_tech}`, or `SE.non_propagation_facts[]` carries `{reason: event_leaves_no_accessible_trace, group: <computed direct-group label>, records: [<DA-id>]}` covering it. Other propagation routes — multi-location supersession, STENT-death with SREL ties, environmental change inferred from STLOC modification without DA evidence, and STOBJ-as-independent-route propagation — remain authorial discipline and must be classified `judgment_assisted_indirect_propagation_unverified` in the audit report rather than silently treated as covered. `non_propagation_facts_completeness` remains the structured-field completeness check. WARNING; `repair_kind: turn_repair`.
- `public_consequence_without_witness` — high-urgency public-impact `CNSQ` records with no `BEL.visibility: public | shared` records anchoring them. WARNING; `repair_kind: turn_repair`.
- `secret_publicly_known_without_event` — `BEL.holder: public` records derived from secret actions (events with `outcome_route: accommodate` involving deception) without a corresponding revealing event. WARNING; `repair_kind: turn_repair`.
- `relationship_change_without_derived_from_trace` — `SREL` supersessions whose `derived_from` doesn't trace to an `SE` or `BEL`. WARNING; `repair_kind: turn_repair`.
- `observer_firewall_violation` — emitted `CHC` records or selected `SLT` actor-bindings whose intent, target, precondition match, or planned move relies on information unavailable to the acting entity. For selected `SLT` audit, read `SE.commitment.selected_slt_id` to identify the causal move, `SE.actor` for the acting entity, and `SE.commitment.alias_bindings` for resolved `bound:<alias>` records before checking access. Read active `BEL.basis.access_route` and `BEL.basis.access_records` for the recorded route and enabling records instead of re-deriving the route from prose, plans, or notes. Valid access routes include active `BEL`, direct observation from active location/status, accessible `DA` / `STOBJ` evidence, testimony, document access, inference, surveillance, institutional channel, magic/tech, rumor, authorial initialization at bundle genesis, or another canonically valid mechanism recorded in the plan. WARNING; `repair_kind: turn_repair`.
- `motivation_ungrounded` — non-system `SE` character actions whose `world_logic_rationale` does not cite at least one active grounding source from the accepted set: an actor-held `STINT`, actor-held relevant `BEL`, actor-involving `OBL` / `CNSQ` / `THR`, actor-matching `SREL.direction.from` / `SREL.direction.to` or `participants[]`, or an immediate physical affordance available at the page location. Treat `story_start`, `system_repair`, `audit_repair`, `prose_attach`, `promotion_closeout`, and events with `actor: system | unknown` as not applicable. WARNING; `repair_kind: turn_repair`. This is an audit signal, not a commit gate, because natural-language rationale can cite valid grounding in prose that exact textual matching may miss.
- `lie_promoted_silently` — `BEL` records with `truth_relation: false, belief_mode: deceives` that become accepted-as-true (`SF` records derived from them without a `branch_local_counterfactual` authority marker). ERROR; `repair_kind: turn_repair`.

When a choice or selected `SLT` is grounded through a binding-predicate storylet, audit the resolved binding rather than the literal `bound:<alias>` token. For example, a block with `any_relationship_axis(trust_edge, trust, <=, low, primary_actor)` and `effects.supersede: [bound:trust_edge]` is plan-grounded only if the leaf snapshot has a matching active `SREL`; a block with `any_belief(public_belief, public, knows, true, public)` and `likely_effects: [bound:public_belief]` is grounded only if the matching active `BEL` exists and satisfies the filters.

### Phase 2x: DA health

Flag:

- `chc_grounded_in_da_not_active` — every `DA-<integer>` in an emitted or active `CHC.grounded_in.records[]` MUST be present in the emitting PG's `state_snapshot.active_records.DA[]`. The rule validator `chc_grounded_in_artifact_accessible` surfaces this as FAIL verdict `chc_grounded_in_da_not_active`; list the CHC id, DA id, emitting PG id, and whether the DA is missing, superseded, or branch-inaccessible. ERROR; `repair_kind: turn_repair`.
- `story_da_duplicate_heuristic` — likely duplicate active DAs share exact `(title, author)` without a `supersedes` or `derived_from` chain linking the cluster. The structural validator `story_da_duplicate_heuristic` surfaces candidates as WARN verdicts; list each cluster for operator review rather than treating the heuristic as automatic corruption. WARNING; `repair_kind: turn_repair` when a repair turn should supersede or derive the duplicate, otherwise `branch_flag` when the branch needs manual adjudication.
- `da_body_nonspecific` — active DA bodies that use non-specific placeholder phrasing such as "contains a clue", "reveals a secret", "describes the truth", "explains everything", or equivalent wording without the clue-bearing content future quotation, comparison, or audit would need. This is an authorial audit warning, not a validator verdict; point the operator to `.claude/skills/_shared-templates/da-authoring-reference.md` §Field semantics / `body` for the "write the clue" rule. WARNING; `repair_kind: turn_repair` when a repair turn should supersede the DA body.
- Existing DA-related validators remain the source of truth for their current surfaces: `expected_witness_coverage` covers public/factional DA propagation through same-event indirect-route BEL or `SE.non_propagation_facts[]`, and `record_schema_compliance` covers story-local DA schema field shape and enum violations. Phase 2x consumes and reports those findings when present, but does not re-implement their checks.

### Phase 2e: Mystery / canon safety (per FOUNDATIONS Rule 7 + shared contract §11)

Flag:

- `forbidden_mystery_resolved` — any mystery with `status: forbidden` resolved by an `SE.state_delta`. ERROR; `repair_kind: branch_flag` (forbidden mysteries cannot be resolved by any path — the branch may need to be archived).
- **Mystery Accretion**: walk each scoped branch's `PG` page chain in order. For every `PG.state_snapshot.unresolved_mystery_claims[]` entry, group by `mystery_id`, preserve page order, and accumulate the entry's `evidence_records[]` alongside its `authority` and `status` progression.
- `mystery_accretion_overflow` — cumulative narrowing / mystery accretion exceeds what the Mystery Reserve entry allows. Enforcement is conditional:
  - If the M record exposes a validator-backed accretion-policy field (`accretion_policy.max_clues` or equivalent), enforce that policy deterministically.
  - Otherwise, enforce only the schema-backed progression: non-`preserved` statuses must carry non-empty `evidence_records`; forbidden-status mysteries must not be resolved; and escalation to `apparent_resolution` or `held_for_promotion` requires a corresponding promotion/adjudication pause.
  Whether the accumulated evidence chain collectively answers the mystery, collapses the allowed answer space, contradicts forbidden answers, or leaves no live "what remains unknown" discipline is a judgment-assisted finding unless a validator-backed M policy makes it deterministic. The finding MUST include the M-id, branch path, page ids, cumulative evidence ids, status progression, and whether enforcement was schema-backed, policy-backed, or judgment-assisted. Severity is ERROR when the accretion resolves a forbidden mystery or violates a forbidden-answer constraint; otherwise WARNING with `repair_kind: promotion` when the branch has effectively produced a canon-candidate answer that must pause for adjudication instead of continuing as unresolved.
- `counterfactual_promoted_to_canon` — a `branch_local_counterfactual`-authority `SF` record treated as `world_level: true` in any downstream effect. ERROR; `repair_kind: branch_flag`.
- `canon_candidate_not_promoted` — a `canon_candidate`-authority `SE.promotion_claims[]` entry that didn't pause the bundle (no subsequent `story-fact-promotion-to-canon` invocation found in the audit window). WARNING; `repair_kind: promotion` (the candidate may still be a deliberate hold).
- `promotion_lacks_evidence` — promotion claims with rendered evidence required but missing rendered prose. WARNING; `repair_kind: prose_revision` (render the page first, then re-run promotion).

ERROR-severity findings here indicate actively-broken canon discipline.

### Phase 2f: Continuation / terminal proof

For each non-terminal leaf page:

- `unactionable_leaf` — no eligible author-pool or JIT-eligible `SLT` against the page's `state_snapshot`. Author-pool eligibility uses the same bind-then-instantiate discipline as `branching-story-turn-cycle`: existential predicates from shared contract §5 (`any_obligation_open`, `any_consequence_pending`, `any_thread_active`, `any_relationship_axis`, `any_belief`, `any_intention`, `any_clock_active`, `any_secret_unrevealed`, `any_story_question_open`, `any_plan_active`, `any_emotion_active`) must bind their aliases against active records before any `bound:<alias>` effect reference is considered satisfiable. ERROR; `repair_kind: commitment_block`.
- `leaf_without_choices` — the page emits zero `CHC` records but `continuation.terminal_status: open`. ERROR; `repair_kind: turn_repair`.

For each terminal leaf (`continuation.terminal_status: terminal_closed`):

- `terminal_without_rationale` — `terminal_rationale` is empty or doesn't name how high-salience debts were closed, abandoned, inherited, or intentionally left unresolved. WARNING; `repair_kind: branch_flag`.
- `orphan_debt_at_terminal` — debts open in the leaf snapshot but not referenced by `terminal_rationale`. WARNING; `repair_kind: branch_flag`.

### Phase 2g: Causal dependency health

Apply the same replay sub-checks across replayed branch state that `branching-story-turn-cycle` Phase 9 applies before a page commits. Full deterministic `causal_dependency_threat_scan` validator is registered; see `tools/validators/src/structural/causal-dependency-threat-scan.ts` and SPEC-36 D1. Replay sub-checks listed here remain in place to surface the same verdicts during health-audit replay even when patch-plan validation was bypassed during initial commit.

- `choice_dependency_clobbered` (ERROR): a record in any emitted `CHC.grounded_in.records[]` is closed, superseded, moved, or invalidated by this turn while the `CHC` remains emitted or player-visible.
- `affordance_dependency_clobbered` (ERROR): a `PG.state_snapshot.visible_affordances` entry remains after its grounding `STLOC`, `STOBJ`, or `STENT` is no longer active, accessible, or located where the affordance asserts.
- `obligation_counterparty_unavailable_without_transfer` (ERROR): an entity owing or owed an open `OBL` becomes unavailable per its active `STSTAT` (dead, captive, offstage, incapacitated, or otherwise unable to participate) while the `OBL` is neither closed nor transferred.
- `slt_precondition_clobbered` (WARNING): a high-salience open debt had an eligible author-pool `SLT` before this turn, but the new delta destroys that `SLT`'s preconditions without closing, transferring, or replacing the debt.

Repair routing: `choice_dependency_clobbered`, `affordance_dependency_clobbered`, and `obligation_counterparty_unavailable_without_transfer` use `repair_kind: turn_repair`. `slt_precondition_clobbered` uses `repair_kind: commitment_block` when a replacement block is needed, otherwise `turn_repair`.

### Phase 2h: Canon baseline drift (per FOUNDATIONS §Story Bundles §4b)

For every branch head and every page selected by `branch_path_filter`, compare
`PG.state_snapshot.canon_revision` against the current world-canon revision
loaded in Pre-flight. If the baseline is stale, load every intervening CH record
and follow each CH `affected_fact_ids[]` entry through
`mcp__worldloom__find_sections_touched_by(cf_id)` or equivalent targeted
retrieval to enumerate touched SEC / M / INV records before classifying drift.
The latest CH is only the drift trigger; the CH window plus CF reverse-lookup
evidence is the classification basis. Classify each page's drift as exactly one
of `compatible`, `grandfathered`, `requires_health_audit`,
`requires_repair_turn`, or `promotion_or_retcon_conflict`, and cite at least one
specific CH id in the finding rationale when a stale baseline is classified as
`compatible` or `grandfathered`.

- `canon_baseline_missing` (ERROR): a post-D6 page snapshot lacks `canon_revision` even though the current world has a change-log revision. `repair_kind: turn_repair`.
- `canon_baseline_requires_health_audit` (ERROR): canon changed after the page baseline and affected records cannot be proven irrelevant from loaded context. `repair_kind: health_audit`.
- `canon_baseline_requires_repair_turn` (ERROR): changed canon contradicts a story-local active record, affordance, or open debt that a new turn would otherwise treat as current. `repair_kind: turn_repair`.
- `canon_baseline_promotion_or_retcon_conflict` (ERROR): changed canon collides with a held `canon_candidate`, `canon_linked` story fact, or promotion queue entry. `repair_kind: promotion`.
- `canon_baseline_grandfathered` (WARNING): the page remains valid as a committed historical branch state, but new turns must cite the grandfathered baseline classification before proceeding.

### Phase 2i: CLK / STSEC / STQ mechanism health

These checks are retrospective audit warnings, not page-commit HARD-REJECTs. They complement the per-commit validators for CLK, STSEC, and STQ by finding mechanism rot that can accumulate across an otherwise schema-valid bundle. They only run when the corresponding record class exists in the scoped bundle; absence of CLK / STSEC / STQ records is never itself a finding.

**Phase 2i scope vs SPEC-43 mid-story-introduction validators**: the SPEC-43 mid-story-introduction validators (`midstory_record_introduction_grounding`, `clock_introduction_grounding_integrity`, `secret_introduction_anchor_integrity`, `story_question_introduction_grounding_integrity`, `thread_introduction_grounding_integrity`, `entity_introduction_status_pairing`, `relationship_introduction_grounding_integrity`, `introduction_observer_firewall`, `narrative_shape_field_rejection`) are per-commit gates in branching-story-turn-cycle Phase 9, not Phase 2i retrospective audits. Phase 2i keeps its absence-is-not-a-finding rule and retrospective mechanism-rot posture. The `compatibility_drift` report is the SPEC-43 Phase 2i extension via `compatibility` mode; the introduction validators are not.

- `stalled_clock_check` — For each active high-salience `CLK` (`status: active`) in the scoped branch leaf snapshots, inspect `tick_history[]` and the page chain. If no tick has been recorded within the last `N=5` pages by default, emit a WARNING with `repair_kind: branch_flag`. Do not flag low / medium salience clocks, paused clocks, resolved / fired / abandoned / superseded clocks, or clocks absent from the scoped active snapshot. Cite the CLK id, current `value` / `max`, most recent tick event if any, current page id, and the page window considered.
- `under_supported_critical_revelation_check` — For each high-salience `STSEC` with `status: revealed`, count `clue_carriers[].status: discovered` entries whose discovery precedes or coincides with `reveal_event` on the branch path. If the count is below the default minimum of 2, emit a WARNING with `repair_kind: branch_flag`. Cite the STSEC id, `reveal_event`, discovered-carrier count, missing support threshold, and any `protected_mystery_refs[]`. This is a health-audit warning; the commit-time `critical_secret_clue_coverage_when_revealed` validator remains the gate for malformed reveal commits.
- `dropped_high_salience_setup_check` — For each terminal page snapshot, inspect active high-salience `STQ` records with `status: open | complicated`. If `PG.state_snapshot.continuation.terminal_rationale` does not name the STQ id or otherwise explicitly classify it as answered, paid off, inherited, superseded, or intentionally abandoned, emit a WARNING with `repair_kind: branch_flag`. Cite the terminal PG id, STQ id, current status, salience, and terminal rationale excerpt or absence.
- `clock_proliferation_warning` — Count active or paused `CLK` records in the scoped bundle. If the count exceeds the default threshold of 5, emit a WARNING with `repair_kind: bundle_advice`. Cite the count, threshold, and the active CLK ids so the operator can decide whether clocks should be merged, resolved, abandoned, or left as intentional complexity.

### Phase 2k: STPLAN / STEMO health

These checks are retrospective audit warnings and errors for SPEC-47 tactical and affective state. They only run when `STPLAN` or `STEMO` records exist in the scoped bundle; absence of either class is never itself a finding.

- `bootstrap-drift` (`bootstrap_drift_stplan_stemo`) — For each `STPLAN` / `STEMO` seeded at `story_start`, walk the scoped branch tree and check whether the record was queried by predicate, cited by `CHC.grounded_in.records[]`, cited in `SE.world_logic_rationale`, superseded, consumed by `SE.state_relations[]`, or otherwise used in a later state delta. If a root-seeded record is never queried, superseded, consumed, or rendered across the branch tree, emit an INFO or WARNING with `repair_kind: bundle_advice` depending on salience. This is the post-hoc bloat check for bootstrap over-seeding.
- `stale-active-plan` (`stale_active_plan`) — For each active `STPLAN`, verify that its `belief_basis[]`, `resource_basis.*[]`, `blockers[]`, `current_step.target_records[]`, and `root_intention` still resolve to active or explicitly blocker-classified records on the scoped branch leaf. If basis records are inactive, superseded, branch-inaccessible, or contradicted without a plan supersession, emit a WARNING with `repair_kind: turn_repair`. If the plan's holder is dead, unavailable, or no longer has matching active intention state and no abandonment/revision event exists, emit ERROR.
- `stale-active-emotion` (`stale_active_emotion`) — For each active `STEMO`, inspect page age, holder status, `trigger_event`, `appraisal_basis[]`, and `behavioral_pressure[]`. If a high-intensity or extreme emotion remains active for many pages with no reflection, suppression, settlement, transformation, or relevant action, emit a WARNING with `repair_kind: turn_repair`. If `appraisal_basis[]` records are inactive or contradicted without emotion supersession, emit WARNING or ERROR according to whether downstream choices used the stale emotion.
- `SE-plan-relation consistency` (`se_plan_relation_consistency`) — Walk `SE.state_relations[]` for items whose `target_record` is `STPLAN-<integer>`. For `advances`, the event must create or supersede at least one record cited by the plan's `current_step.target_records[]` or `current_step.success_condition.predicates[]`. For `blocks`, `revises`, `fulfills`, or `abandons`, the event must create/supersede/close state that makes the relation true. For `ignores`, the rationale must name why the plan was lawfully ignored. Missing or contradictory relation evidence emits WARNING with `repair_kind: turn_repair`; impossible references emit ERROR.
- `stplan-contradictory-cluster` (`stplan_contradictory_cluster`) — For each holder, compare active `STPLAN` records on the scoped branch leaf. Normalize record-targeting predicates in `current_step.success_condition.predicates[]`; if two active plans require mutually exclusive outcomes for the same subject, such as `location(STENT-X, STLOC-A)` and `location(STENT-X, STLOC-B)` where `STLOC-A != STLOC-B`, emit a WARNING with `repair_kind: turn_repair`. This check is predicate-structural only; objective-prose semantic overlap remains out of scope.
- `stplan-long-blocked-no-fallback` (`stplan_long_blocked_no_fallback`) — For each `STPLAN` whose `plan_status: blocked` persists across `N` consecutive scoped pages, emit a WARNING with `repair_kind: turn_repair` when `fallback_steps[]` is empty or no fallback's `trigger_predicates[]` evaluates true on the current page state. Use `N=3` by default. A bundle may override the threshold with `stplan_long_blocked_threshold: <integer>` in `STORY_KERNEL.md` frontmatter; cite the effective threshold, page window, blocker ids, and fallback evaluation result in the finding.
- `stemo-contradictory-stack` (`stemo_contradictory_stack`) — For each holder, compare active `STEMO` records. If an affect-kind pair appears in the closed contradictory-affect lookup table below, and the pair's `same_target_required` condition is satisfied, emit a WARNING with `repair_kind: turn_repair`. The lookup table is intentionally small; expand it only with sample-story evidence of a missed deterministic contradiction.
- `stemo-suppression-render-conflict` (`stemo_suppression_render_conflict`) — For each `STEMO` with `status: suppressed`, inspect the most recent attached `pages-prose-receipts/PG-<integer>.yaml` on the scoped branch. If the receipt's `affective_transition_undisclosed` subcheck says the suppressed affect was rendered as openly expressed, emit a WARNING with `repair_kind: prose_revision`. If no prose receipt is attached, skip this check for that emotion and record a `prose-not-attached` note, not a finding.

Closed contradictory-affect lookup table for `stemo-contradictory-stack`:

```yaml
contradictory_affect_pairs:
  - { a: "tenderness", b: "contempt", same_target_required: true }
  - { a: "hope", b: "dread", same_target_required: true }
  - { a: "relief", b: "anxiety", same_target_required: true }
  - { a: "grief", b: "joy", same_target_required: false }
  - { a: "desire", b: "disgust", same_target_required: true }
```

SPEC-49 migration notes: legacy bundles needing repair for the new STPLAN / STEMO constraints are identified through Phase 2k before hard enforcement. Use `bootstrap-drift` as the first migration triage surface for root-seeded or active STPLAN / STEMO records that are not represented in page snapshots, never used downstream, or likely need repair after SPEC-49 schema and validator tightening. In compatibility windows, classify legacy bundles with missing `PG.state_snapshot.active_records.STPLAN[]` / `STEMO[]` keys, active STPLANs with empty `belief_basis[]`, or STPLAN predicates that would fail parseability as WARN-mode migration findings with `repair_kind: bundle_advice`. After the one-revision compatibility cycle ends, the corresponding validators may fail closed; health-audit findings should then cite the validator failure and route the bundle to turn repair or migration patching rather than treating it as advisory only.

### Phase 2l: Active-state underuse warnings

These are retrospective WARN / INFO findings for present causal state that remains active but has not recently shaped available choices, selected storylets, or PG/SE state. They are judgment-adjacent exploitation warnings, not deterministic story-quality gates. They MUST NOT emit ERROR, MUST NOT block page commits, and MUST NOT require future dramatic shape or payoff timing beyond the current active-state evidence. Thresholds are placeholders until sample-story evidence tunes them.

For each scoped branch, walk the page chain and inspect the last `N=3` committed pages by default. A record counts as recently touched when any of the following cite it or a predicate alias bound to it: `CHC.grounded_in.records[]`, `CHC.likely_state_pressure`, selected `SLT.preconditions.*`, selected `SLT.effects.*`, `SLT.exit_options[].likely_effects`, `SE.commitment.alias_bindings`, `SE.state_delta`, `SE.state_relations[]`, or `SE.world_logic_rationale`. Do not count a generic class mention as a touch; cite the exact page ids and record ids considered.

- `active_plan_underused` — active high-salience `STPLAN` records, especially `plan_status: blocked`, with no recent CHC / SLT / SE event touch. Emit WARNING for blocked high-salience plans and INFO for other high-salience active plans. `repair_kind: commitment_block` when no author-pool move engages it, otherwise `turn_repair` when the committed rationale should acknowledge lawful non-use.
- `active_emotion_underused` — agency-constraining active `STEMO` records (`intensity: high | extreme` or strong `behavioral_pressure[]`) with no recent CHC / SLT / SE event touch. Emit WARNING when the emotion would plausibly bias agency and is absent from recent choice or state grounding; otherwise INFO. `repair_kind: commitment_block` or `turn_repair` according to whether a new move or a rationale/prose repair is needed.
- `urgent_clock_underused` — active high-salience or near-threshold `CLK` records with no recent tick, affordance, storylet predicate/effect, or consequence rationale. Emit WARNING; `repair_kind: branch_flag` when the clock may be intentionally parked, otherwise `commitment_block`.
- `hidden_secret_underused` — active unrevealed high-salience `STSEC` records with no recent clue-carrier, predicate/effect, CHC grounding, or reveal-pressure rationale. Emit WARNING only when the secret is already high-salience and current branch state contains available clue or pressure surfaces; otherwise INFO. `repair_kind: commitment_block` or `branch_flag`.
- `open_question_underused` — open or complicated high-salience `STQ` records with no recent CHC / SLT / SE event touch. Emit WARNING when the question remains active and branch-local state has recently presented related affordances without citing it; otherwise INFO. `repair_kind: commitment_block` or `branch_flag`.
- `active_debt_underused` — open `OBL`, pending `CNSQ`, or active `THR` records with high urgency and no recent CHC / SLT / SE event touch beyond mere snapshot carry-forward. Emit WARNING. If Phase 2c already emitted `unactionable_debt`, `ignored_debt_beyond_urgency`, or `saliency_starvation` for the same record/window, link to that finding instead of duplicating the same concern.

Every active-state-underuse finding cites the record id, class, branch id, page window, touch surfaces checked, severity rationale, and why the finding is present-state underuse rather than a narrative-shape demand. A no-underuse branch emits no Phase 2l finding.

### Phase 2m: STCHAR authority health

These checks preserve Story-Local Character Authority. They read story-bundle records, scene plans/prose receipts, and indexed story-character summaries; default structural mode does not read world `CHAR-*` dossiers. Use targeted `get_record` / `get_records` for full STCHAR, STENT, PG, CHC, STPLAN, STEMO, SREL, and receipt bodies when a finding depends on lifecycle status, grounding, or scene-plan character evidence.

Flag:

- `stent_missing_required_stchar` — active non-background `STENT` records whose `role_in_story` is not exactly `[background]` but whose `bound_stchar_id` is null or absent. ERROR; `repair_kind: turn_repair`.
- `stchar_unresolved` — `STENT.bound_stchar_id`, `PG.state_snapshot.active_records.STCHAR[]`, scene-plan character evidence, or STCHAR-grounded CHC / STPLAN / STEMO / SREL references cite an STCHAR id with no resolvable story-character record. ERROR; `repair_kind: turn_repair`.
- `stchar_not_active_for_bound_stent` — a bound STCHAR exists but is not active in the page or branch snapshot where the bound STENT is active. ERROR; `repair_kind: turn_repair`.
- `stchar_superseded_still_active` — an STCHAR whose lifecycle status is `superseded` or `retired`, or which is named by another active STCHAR's `supersedes`, remains in `PG.state_snapshot.active_records.STCHAR[]` or remains bound to an active non-background STENT. ERROR; `repair_kind: turn_repair`.
- `scene_plan_missing_stchar_evidence` — a scene plan lacks the mandatory character evidence for a viewpoint character, speaker, major actor, direct target, emotionally salient character, or otherwise behavior/voice-shaping character active in the scene range. ERROR; `repair_kind: prose_revision` when the scene plan must be revised, otherwise `turn_repair` when the page state must be repaired first.
- `choice_emotion_character_grounding_missing` — CHC, STPLAN, STEMO, STINT, or SREL prose/fields are materially character-specific but do not cite the active STCHAR in `grounded_in.records`, `derived_from` where lawful, or the committed state/scene-plan rationale. Fresh mid-story `SREL` introductions use present-causal `derived_from[]`, so their STCHAR rationale belongs in the event / scene-plan rationale rather than the introduction grounding field. WARNING; `repair_kind: turn_repair` or `commitment_block` according to the owning surface.
- `split_character_authority` — runtime characterization cites world `CHAR-*` as operational authority in scene plans, CHC/STPLAN/STEMO grounding, SREL rationale/provenance where lawful, prose receipts, or health-audit rationale instead of STCHAR. ERROR; `repair_kind: turn_repair` or `prose_revision`; cite the existing `no_char_authority_in_story_runtime` validator verdict when present.
- `repeated_profile_fidelity_failure` — repeated prose receipts for the same active STCHAR show `profile_fidelity` values of `major_drift` or repeated `minor_drift` on voice, appraisal, pressure behavior, or relationship conduct without a subsequent scene-plan repair, prose revision, turn repair, or STCHAR regeneration. WARNING; `repair_kind` follows the receipt's local `repair_recommendation` (`prose_revision`, `turn_repair`, or branch-flagged user attention for `regenerate_stchar`).
- `stchar_temporal_authority_contamination` — an operational STCHAR section or scene-plan character evidence block cites active temporal story-state records as durable authority, or otherwise uses `PG`, `SE`, `STEMO`, `BEL`, `STPLAN`, `STINT`, `STSTAT`, `STOBJ`, `STLOC`, `SREL`, `THR`, `OBL`, `CNSQ`, `CLK`, `STSEC`, or `STQ` as if current state belongs in the durable profile. Allowed contexts: frontmatter provenance fields, `Source Distillation`, `story_local_inputs_used`, `Validation / Audit Anchors` when the record is clearly cited as evidence/provenance. FAIL on all profiles (fail-everywhere policy chosen at triage; see SPEC-74 §5). `repair_kind: turn_repair` when missing state records must be created; `repair_kind: prose_revision` when only scene-plan/prose text is wrong; `repair_kind: branch_flag` when durable regeneration is needed.
- `stchar_semantic_loss_risk` — a `source_kind: world_char` STCHAR lacks a `Stable Source Material Inventory`, maps retained stable source material only to `Source Distillation`, or uses `story_irrelevant` at bootstrap with rationale equivalent to opening-page irrelevance. FAIL on all profiles under fail-everywhere policy. `repair_kind: branch_flag` unless a specific later page already needs the omitted durable material, in which case recommend `story-character-profile regenerate`.
- `stchar_regeneration_reason_invalid` — a regenerated/superseding STCHAR lacks a durable `regeneration_reason_class`, or the reason is an ordinary current-state change rather than one of the 5 valid reasons (`source_world_char_material_change`, `durable_branch_transformation`, `profile_fidelity_failure`, `story_local_character_promotion`, `stable_source_material_omission_repair`). FAIL on all regenerated profiles.

Every Phase 2m finding cites the STCHAR id, affected STENT / PG / CHC / STPLAN / STEMO / SREL / receipt ids, branch/page scope, lifecycle evidence when relevant, and whether the issue is missing authority, stale authority, split authority, or fidelity drift. A branch with complete STCHAR authority emits no Phase 2m finding.

### Phase 2n: Reactivity Inertness

This chain-level pass scans each scoped PG chain for sequences of pages where every `turn_driver.kind = player_action | player_write_in` despite high-urgency active non-player records being available as lawful drivers. The scan treats the following as non-player pressure candidates: `STPLAN` with `current_step` due, `STEMO` at high intensity with behavioral pressure, `CLK` at threshold, active `THR`, and reveal-ready `STSEC`. A page counts for the inertness window when its §7a active-pressure disposition table shows one or more such records deferred, rejected, or displaced by player initiative while the committed `SE.turn_driver.kind` remains player-driven.

Emit `reactivity_inertness_sequence` when 3+ consecutive pages match the pattern. Severity is WARNING, with `repair_kind: commitment_block` when a missing author-pool move would let the pressure act, or `repair_kind: turn_repair` when the page chain likely needs a repair turn or rationale repair. The finding cites the branch id, page window, player-driven SE ids, active non-player record ids, their §7a dispositions, and the reason the window is a pressure-inertness pattern rather than a normal player-led sequence.

This pass is distinct from Phase 2l ("Active-state underuse warnings"): Phase 2l is per-page underuse detection, while Reactivity Inertness is a chain-level scan for consecutive non-player-driver absence. The two are orthogonal and run alongside each other. Phase 2l fires when an individual page has active records that are not being exercised; Reactivity Inertness fires when a multi-page chain shows the player driving every turn despite non-player pressure being available.

When `remediation` is in mode or `emit_remediation_requests: true`, Reactivity Inertness findings draft `audits/SAU-<integer>/remediation-storylet-proposals/RSP-<integer>-<slug>.md` cards. The RSP card names the page range that triggered the pattern, the active non-player records not selected as drivers, and a suggested storylet or repair-turn shape such as an `audit_repair` candidate that lets the pressure become the turn driver or records a lawful deferral/expiry.

### Phase 2o: Storylet Pool Coverage

Run the SPEC-80 §3 coverage check against the current bundle state. Emit WARNINGS, not hard fails, for uncovered driver-kind, pressure-source-class, and composition gaps. This phase aligns with Phase 2n: Phase 2n detects the downstream symptom of active pressure sitting inert across a player-driven chain, while Phase 2o detects the upstream cause where the pool cannot express the demanded driver-kind or source-class at all.

**Read paths.** Reuse the per-page active-record enumeration already performed by Phase 2l and Phase 2n for the trigger-map DEMAND side: active non-player records such as `STPLAN` with `current_step` due, high-intensity `STEMO`, `CLK` at threshold, active `THR`, reveal-ready `STSEC`, open `STQ`, open `OBL`, pending `CNSQ`, active `BEL`, active `STINT`, and active `SREL` records. Load the SLT-pool SUPPLY side independently via `mcp__worldloom__list_records(record_type='story_storylet', story_slug=<story_slug>, include_full_body=true)`. Do not use `mcp__worldloom__select_storylet_candidates` for whole-pool coverage diagnostics; it requires `parent_page_id` and `turn_driver` filters that are appropriate for per-turn eligibility, not for every author-pool SLT.

Apply SPEC-80 §3.1 to derive triggered driver kinds, SPEC-80 §3.2 to derive triggered pressure-source classes, and SPEC-80 §3.3 to derive demanded composition pairs. A pool entry covers a driver only when its `grounding.compatible_turn_drivers[]` includes that driver. It covers a source class only when `preconditions.hard[]` or `preconditions.soft[]` contains the matching existential predicate (`any_plan_active`, `any_emotion_active`, `any_clock_active`, `any_secret_unrevealed`, `any_story_question_open`, `any_thread_active`, `any_obligation_open`, `any_consequence_pending`, `any_belief`, `any_intention`, `any_relationship_axis`) or a literal record-id reference for that class. It covers a composition pair only when one SLT satisfies both axes simultaneously.

Emit `storylet_pool_coverage_gap` findings with `severity: warning` and `repair_kind: commitment_block`. Each finding cites the uncovered driver kind, source class, or composition pair; the triggering active record ids; the SLT-pool evidence checked; and the actionable hint: "extend the pool via `commitment-block-authoring` direct_batch addressing these gaps." If composition gaps exceed a readable presentation limit, emit at most the top 20 by triggering-record count and report the omitted count.

## Phase 2j: Compatibility drift (conditional on `compatibility` in `mode`)

Run the `compatibility_drift` validator against the bundle structure and `PG.state_snapshot.active_records` maps. In Wave 2 this mode reports schema-drift compatibility findings; it does not hard-fail the audit and does not create or modify story records.

Flag:

- `compat_optional_directory_absent` — Missing newer optional `_source/clocks/`, `_source/secrets/`, `_source/story-questions/`, or `_source/artifacts/` directories. INFO; classification usually includes `compatible_optional_absence`.
- `compat_missing_active_record_key` — Older `PG.state_snapshot.active_records` maps omit optional `CLK`, `STSEC`, `STQ`, or `DA` keys. INFO when the page is a legacy/grandfathered snapshot; classification may include `grandfathered_snapshot_shape`.
- `compat_requires_migration_patch` — A new/current-contract page omits required active-record keys without a grandfathered-parent explanation. WARNING in Wave 2; hard-fail severity is deferred until a future `story_system_contract_revision` marker makes current-contract detection deterministic.

Record one bundle-level classification in the SAU report: `current_contract`, `compatible_optional_absence`, `grandfathered_snapshot_shape`, `compatible_with_advisory`, `requires_compatibility_audit`, `requires_migration_patch`, `manual_review`, or `blocked_contract_break`.

When invoked as `structural,compatibility`, run the structural phases and compatibility mode in the same audit but keep their findings in separate SAU sections. This mode never auto-creates optional `CLK`, `STSEC`, or `STQ` records to improve playability; pure compatibility scans write SAU/SCMP report artifacts only.

## Phase 3: Prose checks (conditional on `prose` in `mode`)

For each `PG-<integer>` in the scoped branches:

- `missing_prose_file` — expected `pages-prose/PG-<integer>.md` is absent for a committed page. INFO when absent without a forcing signal; WARNING when paired with an outstanding promotion requiring prose evidence. `repair_kind: prose_revision`.
- `missing_prose_receipt` — rendered prose exists but no scene prose receipt exists. INFO; `repair_kind: prose_revision` (run `branching-story-scene-prose-attach`).
- `prose_receipt_failed` — receipt's `verdict: FAIL`. Severity from receipt's `repair_recommendation`: FAIL with `run_story_fact_promotion_to_canon` → ERROR + `repair_kind: promotion`; FAIL with `run_turn_cycle_repair` → ERROR + `repair_kind: turn_repair`; FAIL with `revise_prose` → WARNING + `repair_kind: prose_revision`.
- `unrepaired_prose_invention` — receipt's `checks.invented_structural_fact: FAIL` flag persists with no subsequent repair turn. WARNING; `repair_kind: turn_repair`.
- `state_change_unrendered` — receipt's `checks.required_event_rendered: WARN | FAIL`. WARNING; `repair_kind: prose_revision`.

## Phase 4: Cross-story checks (conditional on `cross_story` in `mode`)

For each sibling bundle in `worlds/<world_slug>/stories/`:

- `cross_story_mirrored_fact_contradiction` — sibling's mirrored `SF` records contradict this bundle's mirrored `SF` records on the same parent CF id in `derived_from`. WARNING; `repair_kind: branch_flag` (bundles can legitimately interpret canon differently; the audit flags but doesn't propose repair).
- `cross_story_promotion_contradiction` — sibling's `SE.promotion_claims[]` and this bundle's `SE.promotion_claims[]` both claim canon-candidate authority on contradictory `SF` content. ERROR; `repair_kind: promotion` (one or both candidates must be retracted or revised before any can promote).
- `cross_story_inherited_debt_mismatch` — sibling's terminal closures inherit debts that exist in this bundle as still-open. INFO; `repair_kind: branch_flag`.

## Phase 5: Remediation drafting (conditional on `remediation` in `mode` OR `emit_remediation_requests: true`)

For each finding tagged with a fixable `repair_kind` (everything except findings tagged with no `repair_kind`), allocate an `RSP` id via `mcp__worldloom__allocate_next_id(world_slug, 'RSP', story_slug=<story_slug>, audit_id='SAU-<integer>')` and draft a card:

```markdown
---
id: RSP-<integer>
audit_id: SAU-<integer>
created: <iso8601 date>
finding_ids: [<finding ids from this audit>]
repair_kind: commitment_block | turn_repair | prose_revision | promotion | branch_flag
target_records: [<record ids the repair should engage with>]
target_branch: BR-<integer> | null
suggested_block_move_family: orient | world_pressure | pursuit | investigation | disclosure | negotiation | bond_shift | status_shift | conflict | evasion | protection | resource_exchange | transformation | ritual_protocol | decision | recovery | null
visibility: global_author_pool | branch_scoped | null
---

# RSP-<integer>: <short title>

## Findings addressed

(One bullet per finding_id, with severity + one-line summary.)

## Rationale

(Narrative explanation of why this repair is needed and which lawful repair path applies.)

## Recommended next step

(Sibling-handoff guidance per `repair_kind`:
 - `commitment_block` → invoke `commitment-block-authoring` `audit_repair` mode with this RSP id
 - `turn_repair` → invoke `branching-story-turn-cycle` with a `manual_action_text` framing the repair
 - `prose_revision` → revise the rendered scene prose and re-invoke `branching-story-scene-prose-attach`
 - `promotion` → invoke `story-fact-promotion-to-canon` with the canon-candidate evidence
 - `branch_flag` → manual user attention; no automated repair recommended)
```

**`repair_kind` taxonomy** (5 values):

- `commitment_block` — author pool needs a new block. Consumed by `commitment-block-authoring` `audit_repair` mode.
- `turn_repair` — bundle needs a repair turn adding branch-local state to support unrepaired prose invention or unactionable debt. Consumed by `branching-story-turn-cycle`.
- `prose_revision` — rendered prose needs revision. User revises the rendered scene prose and re-invokes `branching-story-scene-prose-attach`.
- `promotion` — a `canon_candidate` authority claim should be promoted via `story-fact-promotion-to-canon`.
- `branch_flag` — branch is structurally broken (replay mismatch, forbidden mystery resolution, etc.); flag for user attention without automated repair.

**Do NOT draft full commitment blocks here.** RSP cards are repair requests; `commitment-block-authoring` `audit_repair` mode consumes them and produces actual SLT records.

## Phase 6: Author SAU report

Draft `worlds/<world_slug>/stories/<story_slug>/audits/SAU-<integer>-<YYYY-MM-DD>.md`:

```markdown
---
audit_id: SAU-<integer>
story_id: STORY-<integer>
story_slug: <story_slug>
world_slug: <world_slug>
created: <iso8601 date>
modes_run: [structural, compatibility, prose, remediation, cross_story]   # whichever ran
branch_path_filter: null | BR-<integer> | [BR-<integer>, ...]
severity_threshold: error | warning | info
findings_total: N
findings_by_severity:
  error: <count>
  warning: <count>
  info: <count>
rsp_cards_emitted: N | 0
---

# SAU-<integer> — Bundle health audit (<YYYY-MM-DD>)

## Summary

(3-5 sentence overview of bundle health by mode.)

## Branch coverage

(Per-branch one-line: branch id, root page, leaf page, terminal status, finding count.)

## Replay / hash errors

(Phase 2a findings.)

## Branch isolation

(Phase 2b findings.)

## Open debt health

(Phase 2c findings.)

## Belief / visibility health

(Phase 2d findings.)

## Mystery / canon safety

(Phase 2e findings.)

## Continuation / terminal status

(Phase 2f findings.)

## Causal dependency health

(Phase 2g findings.)

## Canon baseline drift

(Phase 2h findings.)

## STCHAR authority health

(Phase 2m findings.)

## Reactivity inertness

(Phase 2n findings.)

## Storylet pool coverage

(Phase 2o findings.)

## Compatibility drift (if `compatibility` in modes)

- **Classification**: one of `current_contract`, `compatible_optional_absence`, `grandfathered_snapshot_shape`, `compatible_with_advisory`, `requires_compatibility_audit`, `requires_migration_patch`, `manual_review`, or `blocked_contract_break`.
- **Findings**: per-finding INFO/WARNING entries from `compatibility_drift` with location and recommendation.
- **Recommendation**: classification routing, such as `compatible_optional_absence` -> no action required, `requires_compatibility_audit` -> manual review, and `requires_migration_patch` -> defer to the dedicated compatibility-repair workflow.

## Prose health (if `prose` in modes)

(Phase 3 findings.)

## Cross-story consistency (if `cross_story` in modes)

(Phase 4 findings.)

## Findings table

| Finding id | Severity | Branch | Type | One-line summary |
|---|---|---|---|---|

## Remediation requests (if any)

(One bullet per emitted RSP-<integer> with its `repair_kind` + suggested consumer skill + finding link.)
```

Apply `severity_threshold` to filter the findings table and per-phase sections. When `severity_threshold: error`, only ERROR findings appear; `warning` reports ERROR + WARNING; `info` (default) reports everything.

## Phase 7: Commit / Write — HARD-GATE fires

1. Present the deliverable summary to the user: audit path, modes run, severity breakdown, top-5 highest-severity findings (one-liner each), RSP card count + per-card `repair_kind` summary, per-`repair_kind` recommended-sibling guidance, severity-threshold filter applied (if any).
2. **HARD-GATE fires** — wait for explicit user approval. Auto Mode does not override.
3. On approval:
   - Write `audits/SAU-<integer>-<YYYY-MM-DD>.md` (direct write).
   - For each RSP card (if any): create `audits/SAU-<integer>/remediation-storylet-proposals/` sub-directory on first use (idempotent `mkdir -p`); write `RSP-<integer>-<slug>.md` (direct write).
   - Update `audits/INDEX.md` last.
4. Report SAU path + RSP card inventory to the user. Surface the recommended next-step sibling skill per `repair_kind` cluster (`commitment-block-authoring audit_repair` for `commitment_block` cards; `branching-story-turn-cycle` for `turn_repair`; `branching-story-scene-prose-attach` re-run for `prose_revision`; `story-fact-promotion-to-canon` for `promotion`; manual attention for `branch_flag`). Do NOT `git commit`.

**Failure behavior**: SAU-report-write fail → hard fail; the audit was the deliverable, no partial state. Partial RSP-write success (SAU written but some RSP cards failed) → SAU is authoritative; remaining RSP cards can be repaired directly. INDEX update fail (after SAU + RSP cards written) → SAU + RSP cards authoritative; index repairable.

## Validation Rules This Skill Upholds

- **Rule 1 (No Floating Facts)** — Phase 2a (replay events). Mechanism: replay verifies every record referenced in `state_snapshot.active_records` corresponds to a real record file; missing references surface as `snapshot_replay_mismatch` findings.
- **Rule 4 (No Globalization by Accident)** — Phase 2b (branch isolation) + Phase 2m (STCHAR authority health). Mechanism: flags sibling-branch records leaking into a branch's snapshot; flags author-pool blocks with branch-local dependencies; flags runtime world `CHAR-*` operational authority leaks in story-local characterization surfaces.
- **Rule 5 (No Consequence Evasion)** — Phase 2a (Choice Consequence Integrity replay) + Phase 2c (debt and saliency health) + Phase 2f (continuation / terminal proof) + Phase 2g (causal dependency health) + Phase 2n (reactivity inertness) + Phase 2o (storylet pool coverage). Mechanism: cosmetic accepted-choice findings + unactionable / invalidated / ignored / saliency-starved debt findings + terminal-without-rationale + orphan-debt-at-terminal findings + clobbered CHC / affordance / OBL / SLT dependency findings + 3+ consecutive player-driven pages despite available high-urgency non-player pressure + coverage warnings when the author pool cannot express active driver/source pressure.
- **Rule 7 (Preserve Mystery Deliberately)** — Phase 2e (mystery / canon safety). Mechanism: forbidden-mystery-resolution + cumulative mystery-accretion + counterfactual-promotion-to-canon + canon-candidate-without-promotion-hold checks against whole-class Mystery Reserve loaded at Pre-flight.
- **Canon Baseline Drift** — Phase 2h. Mechanism: page `state_snapshot.canon_revision` values are compared against the latest governing `change_log_entry`; stale baselines are classified and routed without rewriting committed pages.
- **Information / Observer Firewall** — Phase 2d. Mechanism: emitted choices and selected `SLT` actor-bindings are checked against actor-available knowledge and recorded access routes; non-system character actions are checked for motivation-grounding citations in `SE.world_logic_rationale`.
- **Story-Local Character Authority** — Phase 2m. Mechanism: default structural audit checks runtime STCHAR authority without world `CHAR` reads.

## Record Schemas

All record schemas referenced by this skill live in `.claude/skills/_shared-templates/story-record-schemas.md`:

- `PG` (§4.2), `SE` (§4.3), `SLT` (§4.4), `BEL` (§4.1), scene prose receipts — the audit reads these record types/artifacts.

The SAU report and RSP cards are markdown direct-write artifacts (not atomic `_source/` records). Their shapes are defined inline in this skill's Phase 5 (RSP) and Phase 6 (SAU) templates.

## FOUNDATIONS Alignment

| Principle | Phase | Mechanism |
|---|---|---|
| Rule 1 (No Floating Facts) | Phase 2a | Replay verifies every active-record reference resolves. |
| Rule 2 (No Pure Cosmetics) | N/A | Story-bundle scope. World-canon principle. |
| Rule 3 (No Specialness Inflation) | N/A | Same as Rule 2. |
| Rule 4 (No Globalization by Accident) | Phase 2b, 2m | Branch-isolation enforcement (4 finding types) plus split-character-authority findings when runtime story surfaces cite world `CHAR-*` instead of STCHAR. |
| Rule 5 (No Consequence Evasion) | Phase 2a, 2c, 2f, 2g, 2n, 2o | Choice Consequence Integrity replay findings + debt and saliency health + continuation-or-terminal-proof findings + causal dependency findings for clobbered CHC / affordance / OBL / SLT dependencies + chain-level reactivity inertness findings + storylet-pool coverage warnings for active pressure that no SLT can express. |
| Rule 6 (No Silent Retcons) | N/A | Audit reads only; emits no canon changes. |
| Rule 7 (Preserve Mystery Deliberately) | Phase 2e | Mystery / canon safety checks (5 finding types). |
| Rule 11 (No Spectator Castes) | N/A | World-canon-only principle. |
| Rule 12 (No Single-Trace Truths) | N/A | World-canon-only principle. |
| Canon Layers | Pre-flight, Phase 2e | World canon loaded via context packet; per-event canon-authority classification. |
| Mystery Reserve | Pre-flight, Phase 2e | Whole-class Mystery Reserve loaded; forbidden-status firewall plus cumulative-accretion review. |
| §Story Bundles §4a (Plan-Authority Boundary) | All phases | Audit reads `PG` records as authoritative; never mutates them. Drift between prose and state is reported in findings, not in PG records. |
| §Story Bundles §4b (Canon Baseline Drift) | Phase 2h | Audit compares page `state_snapshot.canon_revision` against current world canon and reports compatible / grandfathered / audit / repair / promotion-conflict classifications without mutating committed pages. |
| §Story Bundles §5a (Commitment Blocks Are Causal Moves) | Phase 2b, 2c | Author-pool `SLT` records validated for branch-local-dependency leaks; debt-block eligibility matching enforces commitment-blocks-as-moves. |
| §Story Bundles §5b (Schema-Minimalism) | N/A | Audit reads records; does not draft schema-bearing records. |
| §Story Bundles §6a (Belief vs. Fact) | Phase 2d | Belief / visibility health checks (7 finding types, including expected-witness completeness). |
| §Story Bundles §6b (Information / Observer Firewall) | Phase 2d | Audit reports emitted choices and selected `SLT` actor-bindings that rely on unavailable actor knowledge without a valid recorded access route; it reads `BEL.basis.access_route` and `BEL.basis.access_records` for post-hoc route evidence. It also reports `motivation_ungrounded` when non-system character actions lack `world_logic_rationale` citations to actor-held intentions/beliefs, actor-involving obligations/consequences/threads/relationships, or immediate physical affordances. |
| §Story Bundles §6.1 (Story-Local Character Authority) | Phase 2m | Default structural audit consumes active STCHAR through story-bundle records, `STENT.bound_stchar_id`, `PG.state_snapshot.active_records.STCHAR`, scene-plan character evidence, and prose receipts; it flags split authority when runtime surfaces cite world `CHAR-*`. |
| §Story Bundles §9 (Prose Length Discipline) | N/A | Audit reports no word-count metrics. |
| Change Control Policy | N/A | Audit emits no Change Log Entries. |
| Tooling Recommendation | Pre-flight | World canon retrieval via `mcp__worldloom__get_context_packet`. |

## Guardrails

- **Never mutate story state or world canon.** The audit reads `_source/` records, scene plans/prose, scene prose receipts, legacy prose artifacts when compatibility mode requires them, and bundle `INDEX.md`. It writes ONLY to `audits/SAU-<integer>-*.md` + `audits/SAU-<integer>/remediation-storylet-proposals/RSP-<integer>-*.md` + `audits/INDEX.md`. No patch-engine submissions.
- **Never write rendered prose.** The audit reads prose for Phase 3 checks; it does not author prose.
- **RSP cards are repair requests, not blocks.** Phase 5 drafts requests with `repair_kind`, `target_records`, `target_branch`, `rationale`, `suggested_block_move_family`, `visibility` — never full SLT records. `commitment-block-authoring` `audit_repair` mode owns SLT drafting.
- **Audit is read-only with respect to bundle records.** Drift between rendered prose and committed state, replay mismatches, branch-isolation violations are all REPORTED in findings; the audit does NOT alter `PG` records, `SE` deltas, `SLT` blocks, or any other bundle-record file to "fix" what it finds.
- **Schema minimalism per shared contract §2.** SAU report + RSP card shapes defined inline. No nice-to-have fields.
- **Skills do not chain.** The audit never invokes `commitment-block-authoring`, `branching-story-turn-cycle`, `branching-story-scene-prose-attach`, `story-fact-promotion-to-canon`, or `story-promotion-closeout`. RSP cards record sibling-handoff recommendations; the user separately invokes the named sibling with the RSP card path as input.
- **Worktree discipline**: paths resolve from worktree root if invoked inside one.

## What is intentionally NOT in this skill

- **No LLM semantic pass by default.** Default `structural` mode is fully deterministic — replay, schema checks, predicate parse-back, hash comparison. The optional `prose` mode reads existing prose receipts (already deterministic-checked by `branching-story-scene-prose-attach`) but does NOT run a fresh LLM critic over prose. A future ticket could add an opt-in `prose_critic` mode if it surfaces as a real need.
- **No bundle mutation.** The audit reports; it does not edit `PG` / `SE` / `SLT` / `BEL` records.
- **No RSP-to-SLT inflation.** RSP cards are requests; `commitment-block-authoring` `audit_repair` mode owns SLT drafting.
- **No cross-world audit.** `cross_story` mode is bounded to sibling bundles within the same world. World-level audits across `worlds/*/` are out of scope.
- **No word-count metrics** (per FOUNDATIONS §Story Bundles §9). Prose-mode findings cite receipt verdicts, not word counts.

## Final Rule

The audit produces severity-tagged findings and optional repair-request cards — it diagnoses bundle health by reading records, never mutates story state or world canon, and routes every fixable finding to a lawful repair path through `repair_kind` + sibling-handoff recommendation rather than performing the repair itself.
