---
name: commitment-block-authoring
description: "Use when creating compact reusable commitment blocks (SLT records) for the author pool of a branching-story bundle. Two modes: direct_batch (fresh batch addressing coverage gaps) or audit_repair (consumes RSP cards from branching-story-health-audit). Produces: SLT-<integer> records via patch engine + storylet-batches/SLB-<integer>.md batch manifest + bundle INDEX.md update. Mutates: only worlds/<world_slug>/stories/<story_slug>/."
user-invocable: true
arguments:
  - name: world_slug
    description: "Existing world directory slug under worlds/"
    required: true
  - name: story_slug
    description: "Existing story bundle slug under worlds/<world_slug>/stories/"
    required: true
  - name: mode
    description: "direct_batch | audit_repair. direct_batch creates a fresh batch addressing coverage gaps in the current SLT pool. audit_repair consumes RSP-<integer> cards from a named branching-story-health-audit report."
    required: true
  - name: target_count
    description: "direct_batch only — integer; default 6, max 12. Number of SLT records to create. Matches bootstrap's minimal-seed growth increment."
    required: false
  - name: focus
    description: "direct_batch only — natural-language hint guiding which move families / action families the batch should emphasize (e.g., 'post-violence recovery', 'investigation coverage'). The Phase 4 diversity gate enforces minimum spread regardless."
    required: false
  - name: audit_id
    description: "audit_repair only — SAU-<integer> of the source branching-story-health-audit report supplying the RSP cards."
    required: false
  - name: finding_ids
    description: "audit_repair only — list of RSP-<integer> ids to address. One SLT block is created per RSP card; cards with repair_kind != commitment_block are skipped with a sibling-handoff recommendation."
    required: false
---

# Commitment Block Authoring

Create compact reusable commitment blocks (`SLT` records) for the author pool of a branching-story bundle — causal moves with preconditions, beats, effects, exit options, and saliency, NOT dramatic acts or arcs.

<HARD-GATE>
Do NOT write `worlds/<world_slug>/stories/<story_slug>/storylet-batches/SLB-<integer>.md` or update `worlds/<world_slug>/stories/<story_slug>/INDEX.md`, AND do NOT submit any patch plan to `mcp__worldloom__submit_patch_plan`, until:

(a) Pre-flight Check has completed: bundle resolved at `worlds/<world_slug>/stories/<story_slug>/`; mode validated; for `direct_batch`, the latest committed parent `PG-<integer>` resolved and the current SLT pool loaded through `mcp__worldloom__select_storylet_candidates(world_slug=<world_slug>, story_slug=<story_slug>, parent_page_id=<latest committed PG>, turn_driver=<derived_or_player_default>, max_candidates=<pool_size>, include_rejection_summary=true)` as projection records + filter trace; for `audit_repair`, audit + RSP cards loaded from `audits/<audit_id>-*.md` + `audits/<audit_id>/remediation-storylet-proposals/RSP-*.md`; active STCHAR summaries loaded from `story_bundle_context.active_story_characters` and full/projected STCHAR sections retrieved via `mcp__worldloom__get_record(record_id='STCHAR-<integer>', section_path='body.<section-name>')` when a block's eligibility, beats, effects, pressure behavior, relationship conduct, persona, or voice depends on a specific character; SLT ids and one SLB id allocated via `mcp__worldloom__allocate_next_id`; world canon context packet loaded via `mcp__worldloom__get_context_packet(world_slug, task_type='commitment_block_authoring', ...)`.

(b) Phases 1-5 have completed in working memory: coverage gaps diagnosed (`direct_batch`) OR RSP cards loaded with non-commitment-block `repair_kind` cards skipped (`audit_repair`); per-block drafts authored per shared contract §4.4 schema + §5 predicate DSL, with STCHAR-conditioned eligibility following the Character-Fit Selection Contract branch-scope discipline; 6-gate per-block validation complete (schema completeness, predicate parse, branch-scope legality including STCHAR exact-id limits, mystery/invariant firewall, effect legality, exit-option grounding); 4-check batch-diversity validation complete (`direct_batch` only — move-family diversity, recovery coverage, belief-or-relationship coverage, no branch-local dependencies in global-author-pool blocks); SLB-<integer> batch manifest drafted.

(c) The user has explicitly approved the deliverable summary (mode + source, SLT inventory by move_family, per-block one-line summary, per-block validation traces, batch-diversity result for `direct_batch`, skipped RSP cards for `audit_repair`, SLB manifest preview).

This gate is authoritative under Auto Mode or any other autonomous-execution context — invoking this skill does not constitute approval of the deliverable summary.
</HARD-GATE>

## Process Flow

```
Pre-flight Check (load FOUNDATIONS + shared contract; resolve bundle;
  validate mode; load current SLT pool [direct_batch] OR RSP cards
  [audit_repair]; allocate SLT + SLB ids; load world canon context
  packet)
        |
        v
Phase 1: Diagnose coverage gaps (direct_batch) OR load RSP cards
                                (audit_repair)
        |
        v
Phase 2: Draft commitment blocks against gaps / RSP cards
        |
        v
Phase 3: Per-block validation (6 gates per shared contract §4.4 + §5)
        |
        v
Phase 4: Batch-diversity validation (direct_batch only; 4 checks)
        |
        v
Phase 5: Author SLB-<integer> batch manifest
        |
        v
Phase 6: HARD-GATE fires → atomic patch (create_slt_record per block)
                          + SLB manifest write + INDEX update
```

## Inputs

### Required

- `world_slug` — string — existing world directory slug under `worlds/`
- `story_slug` — string — existing story bundle slug under `worlds/<world_slug>/stories/`
- `mode` — enum — `direct_batch | audit_repair`

### Mode-specific

For `direct_batch`:

- `target_count` — integer; default `6`, max `12`. Number of new SLT records to create.
- `focus` — optional natural-language hint guiding move-family / action-family emphasis.

For `audit_repair`:

- `audit_id` — `SAU-<integer>` of the source health-audit report.
- `finding_ids` — list of `RSP-<integer>` ids to address.

## Output

- `SLT-<integer>` records — Always (`target_count` for `direct_batch`; `len(finding_ids)` minus skipped RSP cards for `audit_repair`); written via `create_slt_record` patch op
- `storylet-batches/SLB-<integer>.md` — Always (batch manifest; direct-write markdown after patch submission)
- Bundle `INDEX.md` — Always (updated last)

All SLT records in a batch share the same `provenance.origin` value: `author_batch` for `direct_batch`, `audit_repair` for `audit_repair`. The other valid `provenance.origin` values (`bootstrap_seed`, `manual_authoring`, `runtime_jit`) are reserved for bootstrap, one-off manual authoring, and turn-cycle's inlined JIT block creation.

## World-State Prerequisites

Before this skill acts, it MUST receive (per FOUNDATIONS §Tooling Recommendation):

- `docs/FOUNDATIONS.md` — §Story Bundles §5 (Validation Rules At Story Scope), §5a (Commitment Blocks Are Causal Moves), §5b (Schema-Minimalism), §6a (Belief vs. Fact), §9 (Prose Length Discipline) govern this skill
- `.claude/skills/_shared-templates/story-state-contract.md` — §5 closed predicate DSL, §10 shared write order, §11 mystery and canon authority
- `.claude/skills/_shared-templates/story-record-schemas.md` — §4.4 SLT schema (canonical)
- `.claude/skills/_shared-templates/story-record-schemas.md` §4.5.17 / §4.5.18, `.claude/skills/_shared-templates/story-state-contract.md` §5, `docs/CONTEXT-PACKET-CONTRACT.md`, and `docs/MACHINE-FACING-LAYER.md` — STPLAN/STEMO record and retrieval surfaces that inform plan/emotion-aware SLT predicates without adding a new SLT schema family
- `.claude/skills/_shared-templates/story-state-contract.md` §5, §6.1 story-local character authority, and the Character-Fit Selection Contract — predicate legality, story-local STCHAR authority, and character-fit branch-scope discipline; `any_story_character_active(...)` is deferred and not part of the closed DSL
- `worlds/<world_slug>/stories/<story_slug>/STORY_KERNEL.md` — bundle root context
- current SLT pool projection via `mcp__worldloom__select_storylet_candidates(world_slug=<world_slug>, story_slug=<story_slug>, parent_page_id=<latest committed PG>, turn_driver=<derived_or_player_default>, max_candidates=<pool_size>, include_rejection_summary=true)` (`direct_batch` only; may be empty post-bootstrap if `seed_commitment_blocks: none`). The response supplies `shortlisted_projection_records[]`, `filter_trace`, and `requires_full_body_ids[]`; retrieve full SLT bodies only for records selected for mutation planning.
- `worlds/<world_slug>/stories/<story_slug>/audits/<audit_id>-*.md` + `audits/<audit_id>/remediation-storylet-proposals/RSP-*.md` — source audit + RSP cards (`audit_repair` only; abort with audit-not-found or rsp-not-found error if any reference missing)
- World canon context packet via `mcp__worldloom__get_context_packet(world_slug, task_type='commitment_block_authoring', story_slug=<story_slug>, seed_nodes=<Mystery Reserve forbidden-status entries + world INV records + other world-scope canon anchors>, token_budget=<default>)`. Load active cast and open obligations / threads in the bundle through `story_slug` + `story_bundle_context` or targeted `mcp__worldloom__get_records` / `mcp__worldloom__list_records`; do not pass story-local ids in world-scope `seed_nodes`.

Targeted retrieval discipline: `story_bundle_context` is an index and summary surface, not full authoring authority. When it identifies a material `STPLAN` / `STEMO` / `STSEC` / `STQ` / `CLK` record, retrieve the full body with `mcp__worldloom__get_record`, `mcp__worldloom__get_records`, or a filtered `mcp__worldloom__list_records(..., include_full_body=true)` before authoring SLT predicates/effects, CHC grounding assumptions for remediation blocks, page-plan §9b / §9c / §10b expectations, prose-receipt expectations, or health-audit-style findings that depend on basis, blockers, appraisal, orientation, clue, payoff, or clock payload detail. When `story_bundle_context.active_story_characters` identifies an STCHAR whose persona, pressure behavior, relationship conduct, appraisal, agency, or voice is load-bearing for a planned block, retrieve the relevant full or projected STCHAR sections via `mcp__worldloom__get_record(record_id='STCHAR-<integer>', section_path='body.<section-name>')` (parallel to the STPLAN/STEMO/STSEC/STQ/CLK retrieval named earlier in this paragraph) before authoring the block. Do not read world `CHAR-*` dossiers for runtime characterization; `STCHAR.source_char_id` is provenance only.

The bundle MUST exist (non-bootstrap variant); for `audit_repair`, the audit + all named RSP cards MUST exist. For `direct_batch`, the current SLT pool MAY be empty (post-bootstrap with `seed_commitment_blocks: none`).

## Pre-flight Check

Before Phase 1:

1. Load `docs/FOUNDATIONS.md` and `.claude/skills/_shared-templates/story-state-contract.md` into working context. Abort with clear missing-file error on unreadable path.
2. Resolve `worlds/<world_slug>/stories/<story_slug>/`. Abort with bundle-not-found error if missing.
3. Validate `mode`: must be `direct_batch` or `audit_repair`; for `direct_batch`, validate `target_count` (1–12 inclusive, default 6); for `audit_repair`, validate `audit_id` matches the `SAU-<integer>` pattern and `finding_ids` is non-empty.
4. Mode-specific load:
   - `direct_batch`: resolve the latest committed parent `PG-<integer>` for the bundle and invoke `mcp__worldloom__select_storylet_candidates(world_slug=<world_slug>, story_slug=<story_slug>, parent_page_id=<latest committed PG>, turn_driver=<derived_or_player_default>, max_candidates=<pool_size>, include_rejection_summary=true)`. Key `shortlisted_projection_records[]` into a current-pool inventory by projection fields: `move_family`, `compatible_turn_drivers`, `predicate_classes`, and `action_families`, preserving `filter_trace` as the coverage-diagnostic evidence. Retrieve full SLT bodies via `mcp__worldloom__get_records(record_ids=<subset>, story_slug=<story_slug>)` only for blocks selected for `replace` / `extend` mutation planning; no per-file `Read` fallback is required. If the projection response or targeted full-body response is wrapped in `<persisted-output>` tags with a saved file path (Claude Code harness output-cap, distinct from MCP-server `delivery_status: persisted_with_summary`), retrieve the saved payload before proceeding — the harness cap is environmental and may fire on any MCP tool whose response exceeds the harness's inline limit, regardless of MCP-server delivery mode.
   - `audit_repair`: load `audits/<audit_id>-*.md` (verify exists); for each `RSP-<integer>` in `finding_ids`, load `audits/<audit_id>/remediation-storylet-proposals/RSP-*.md`. Abort with rsp-not-found error on any missing card.
5. Allocate ids: one `SLT` per planned block (`target_count` for `direct_batch`; `len(finding_ids)` for `audit_repair` — actual usage may be fewer if Phase 1 skips RSP cards) via `mcp__worldloom__allocate_next_id(world_slug, 'SLT', story_slug=<story_slug>)`. Allocate one `SLB` id for the batch manifest.
6. Load story-local context first via `story_slug` scoped retrieval: active cast `STENT` ids, active STCHAR summaries from `story_bundle_context.active_story_characters`, and the bundle's currently-open obligations / consequences / threads with `urgency` (for `direct_batch` gap diagnosis weighting) come from `story_bundle_context` or targeted `mcp__worldloom__get_records` / `mcp__worldloom__list_records`. Enumerate every active STCHAR's `role_in_story` proactively during Phase 1 gap diagnosis (including offstage STCHARs whose `entity_status.location: offstage` — see Phase 1 cast-role coverage criterion), then retrieve full or projected STCHAR sections via `mcp__worldloom__get_record(record_id='STCHAR-<integer>', section_path='body.<section-name>')` (or whole-class via `mcp__worldloom__list_records(record_type='story_character_authority_record', world_slug=<world_slug>, story_slug=<story_slug>, include_full_body=true)`) for each character whose pressure-bearing role surfaces as an unrepresented authoring lane OR when character-specific eligibility, beats, effects, persona, voice, appraisal, pressure behavior, relationship conduct, perception, embodiment, or agency matters to a planned block. Then load the world canon context packet with `story_slug=<story_slug>` and world-scope seeds only: every Mystery Reserve `M-<integer>` with `status: forbidden` (loaded whole-class for per-block firewall), every world INV record (loaded whole-class for invariant verification), and any other world-canon anchors needed by the batch. Do not pass `STCHAR` or world `CHAR-*` ids as world-scope `seed_nodes`.

Persisted-summary recovery: see
`.claude/skills/_shared-templates/persisted-packet-recovery.md`. If
`get_context_packet` (or `get_records` / `describe_envelope_schema`) returns
`delivery_status: persisted_with_summary`, retrieve required slices via
`mcp__worldloom__get_persisted_packet_slice` before continuing.

If any precondition fails, the skill aborts before Phase 1.

## Phase 1: Diagnose coverage gaps (`direct_batch`) OR load RSP cards (`audit_repair`)

When choosing `hard.preconditions[]` predicates, follow §11a "Character-Fit Selection Contract" in `.claude/skills/_shared-templates/story-state-contract.md`. Global-author-pool SLTs (`scope.visibility: global_author_pool`) express character relevance through existential current-state predicates (`any_plan_active`, `any_emotion_active`, `any_relationship_axis`, `any_belief`, `affordance_available_to`), role-keyed predicates, or driver-record overlap — never through direct `record_active(STCHAR-<integer>)`. The direct-STCHAR form is reserved for `branch_scoped` and `branch_prefix_scoped` visibility, where a specific character's stable authority is the reason the block exists.

**`direct_batch`**: Analyze the current SLT pool against 14 causal-function coverage targets:

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
15. Cast-role coverage — for each active `STENT` whose `role_in_story` includes a pressure-bearing role (`pressure_source`, `opposing_actor`, `authority`, `dependent`, or `information_source`), the bundle SLT pool should carry at least one block that engages that role's authoring lane. Surface unrepresented roles in the gap diagnosis. Offstage pressure_sources (`entity_status.location: offstage`) are not exempt — their offstage activity is a legitimate authoring lane via intrusion-shaped (`world_pressure` family), looms-without-arriving-shaped (`status_shift` family), or pursuit-shaped (`pursuit` family) blocks. The shared contract §8 already documents the parallel renderer-side `offstage_causal` discipline at §16a; this criterion is the author-side counterpart.

**Context - what Phase 1 already does.** Phase 1 currently enumerates 15 coverage targets (14 causal-function + target #15 cast-role coverage) and names projection-field-based gap diagnosis below (`compatible_turn_drivers` for driver-kind coverage; `predicate_classes` for active-record-class coverage). What is missing is the structured trigger maps (SPEC-80 §3.1, §3.2), the joint composition rule (SPEC-80 §3.3), and a structured YAML output that the Phase 2-4 block generators can read.

16. **Driver-kind composition coverage** — for each driver-kind value triggered by the bundle's active records per SPEC-80 §3.1's trigger map, the pool must contain at least one SLT whose `grounding.compatible_turn_drivers[]` includes that value.

17. **Pressure-source-class composition coverage** — for each load-bearing active-record class triggered per SPEC-80 §3.2's trigger map, the pool must contain at least one SLT whose `preconditions.hard[]` or `preconditions.soft[]` references that class via the appropriate existential predicate or literal record-id.

The joint composition rule (SPEC-80 §3.3) applies: for each (driver-kind, source-class) pair the bundle demands, at least one SLT must satisfy BOTH.

**Read paths.** Two distinct reads cover this check:

(a) **Bundle-state load** (the DEMAND side — enumeration of active records that trigger the §3.1 / §3.2 maps): use `story_bundle_context` plus targeted `mcp__worldloom__get_records` / `mcp__worldloom__list_records` per Pre-flight step 6, which already enumerates active cast STENT ids and currently-open obligations / consequences / threads.

(b) **SLT-pool load** (the SUPPLY side — projection of current pool storylets to check coverage against demand): use the SPEC-81 projection path `mcp__worldloom__select_storylet_candidates(max_candidates=pool_size)` already invoked in Pre-flight step 4 for `direct_batch`. Use `list_records(... include_full_body=true)` only as a fallback where the projection API is unavailable.

Identify which coverage targets are absent or under-represented in the current projection pool. Use projection fields for gap diagnosis: `move_family` for causal-function coverage, `compatible_turn_drivers` for driver-kind coverage, `predicate_classes` for active-record-class coverage, and `action_families` for exit-option coverage. If a `focus` hint was supplied, weight gap diagnosis toward the named focus area (the Phase 4 diversity gate still enforces minimum spread regardless). Retrieve full SLT bodies only when a selected existing block needs mutation planning detail that the projection record does not carry.
Use the existential predicates in the predicate DSL for global-pool social-state and SPEC-42 mechanism coverage. The function-call forms below are notation only; emitted `SLT.preconditions.hard | soft` entries are flat predicate objects per shared contract §5. Prefer existential social-state predicates with `urgency?` filters such as `any_obligation_open(alias, kind?, urgency?, owed_by_role?, owed_to_role?)`, `any_consequence_pending(alias, kind?, urgency?, derived_from?)`, `any_thread_active(alias, tag?, urgency?)`, `any_relationship_axis(alias, axis, comparator, value, participant_role?)`, `any_belief(alias, holder_role?, mode?, truth_relation?, visibility?)`, and `any_intention(alias, holder_role?, urgency?)` for global-pool blocks that address high-salience debts, relationships, beliefs, threads, and intentions without naming branch-local record ids. Prefer the SPEC-42 existential predicates `any_clock_active(alias, kind?, salience?)`, `any_secret_unrevealed(alias, salience?, kind?)`, and `any_story_question_open(alias, salience?, setup_kind?)` for global-pool blocks that advance active clocks, reveal or prepare story secrets, or pay off open setups. Pick stable aliases that describe the matched record's role in the block, for example `urgent_debt`, `pending_fallout`, `trust_edge`, `public_belief`, `open_intent`, `active_clock`, `hidden_secret`, or `open_setup`.
The three SPEC-42 coverage targets are conditional authoring targets: when a bundle has no active `CLK`, `STSEC`, or `STQ` records, do not warn merely because no block covers the absent class. When those records exist and are under-represented in the current SLT pool, surface the missing coverage in the Phase 1 diagnosis and draft at least one matching block unless the focus hint and Phase 4 diversity constraints justify deferring it.

Output: a list of `target_count` planned blocks, each with a `move_family` value from the 16-value enum (per shared contract §4.4 SLT schema) and a brief draft scope (preconditions sketch, beat outline, effects shape).

**Output shape** (enrichment of existing Phase 1 gap-diagnosis output — does not replace move-family / causal-function gap reporting):

```yaml
driver_kind_coverage:
  triggered_kinds: [player_action, npc_action, clock_fire]
  uncovered_kinds: [npc_action]   # bundle has active STPLAN/STEMO but no SLT with compatible_turn_drivers: [..., npc_action, ...]
pressure_source_coverage:
  triggered_classes: [STPLAN, STEMO, CLK, OBL]
  uncovered_classes: [STEMO]      # bundle has active STEMO but no SLT with any_emotion_active or literal STEMO-N reference
composition_gaps:
  - {driver: npc_action, source: STPLAN}
  - {driver: npc_action, source: STEMO}
```

Apply the SPEC-80 §3.1 trigger map to bundle state to derive demanded driver-kinds, the SPEC-80 §3.2 trigger map to derive demanded source-classes, and the SPEC-80 §3.3 composition rule to derive demanded pairs. Walk the SLT pool's projected `compatible_turn_drivers` to compute covered driver-kinds, projected `predicate_classes` or full-body `preconditions.hard[]` / `preconditions.soft[]` to compute covered source-classes, and the intersection of a single SLT's driver and predicate coverage to compute covered pairs. Emit at most the top 20 composition gaps by triggering-record count when the full gap list would be longer.

**`audit_repair`**: For each `RSP-<integer>` card in `finding_ids`, extract:

- `repair_kind` — `commitment_block | turn_repair | prose_revision | promotion | branch_flag`. This skill handles ONLY `commitment_block`; cards with other kinds produce a warning ("RSP-<integer> is repair_kind=`<X>`; not handled by commitment-block-authoring; recommend `<sibling-skill>` instead") and are skipped (audit-trail preserved in Phase 5's manifest).
- `target_records` — records the block should engage with
- `target_branch` — `BR-<integer>` or null (author-pool when null)
- `rationale` — natural-language reason from the audit
- `suggested_block_move_family` — from the 16-value `move_family` enum
- `visibility` — `global_author_pool | branch_scoped`

Each commitment-block-kind card maps 1:1 to one planned block.

If an author-pool RSP targets an open social-state record class covered by the existential predicates (`OBL`, `CNSQ`, `THR`, `SREL`, `BEL`, or `STINT`), translate the repair into an actor-unbound existential predicate rather than copying a branch-local record id into the `SLT`. Use the RSP's `target_records` and rationale to choose filters (`kind`, `urgency`, role, axis, belief mode, truth relation, or visibility) and bind the matched record to an alias. Branch-scoped RSP repairs may use exact-ID predicates when the target branch owns those records.

## Phase 2: Draft commitment blocks

For each planned block (from Phase 1), draft a full `SLT` record per shared contract §4.4:

```yaml
id: SLT-<integer>
story_id: STORY-<integer>
scope:
  visibility: global_author_pool | branch_prefix_scoped | branch_scoped   # branch_scoped only when audit_repair RSP specifies it
  branch_id: BR-<integer> | null
  visible_branch_path_prefix: [PG-<integer>]       # branch_prefix_scoped only
created_at_page: null   # nullable for direct_batch and audit_repair (origin = author_batch or audit_repair, not runtime_jit)
title: <short descriptive title>
move_family: orient | world_pressure | pursuit | investigation | disclosure | negotiation | bond_shift | status_shift | conflict | evasion | protection | resource_exchange | transformation | ritual_protocol | decision | recovery
preconditions:
  hard: [<predicate object per shared contract §5>]
  soft: [<predicate object per shared contract §5>]
beats:
  - beat_id: B1
    function: setup | action | pressure | turn | consequence | exit
    instruction: >
      <prose-facing beat instruction, no engine jargon>
  # 1-5 beats per block
effects:
  create: [<record id | bound:<alias>>]
  supersede: [<record id | bound:<alias>>]
  close: [<record id | bound:<alias>>]
exit_options:
  - action_family: move | evade | pursue | perceive | investigate | communicate | persuade | negotiate | bond | oppose | harm | protect | control | transfer | use | make_change | ritual_protocol | recover | wait | decide
    surface_hint: <player-visible label>
    likely_effects: [<record id | bound:<alias>>]
saliency:
  urgency: low | medium | high
  cooldown_pages: 0
  tags: [<string>]
mystery_policy:
  forbidden_resolutions: [M-<integer>]
  allowed_authority: apparent | branch_local_counterfactual | canon_candidate | none
provenance:
  origin: author_batch | audit_repair   # never runtime_jit for this skill
```

**Predicate DSL discipline** (per shared contract §5): every predicate in `preconditions.hard` and `preconditions.soft` is emitted as a flat object with `pred` plus predicate-specific fields. The function-call forms are notation for the closed DSL predicate catalog (`fact_true`, `belief_record`, `entity_status`, `relationship_axis`, `obligation_open`, `consequence_pending`, `thread_active`, the nine `any_*` existential predicates, `location`, `has_affordance`, `record_active`, `record_age`, `intention_active`, `object_accessible`, `artifact_accessible`, `affordance_available_to`, `plan_active`, `plan_blocked`, `any_plan_active`, `emotion_active`, `any_emotion_active`, `emotion_pressure`, plus `all[]` / `any[]` / `not[]` combinators). Prefer `affordance_available_to(<actor>, <action_family>)` for branch-scoped blocks; `has_affordance(<action_family>)` and the `any_*` predicates are only author-pool / branch-prefix prefilters when the actor or exact branch-local record is not yet bound. Use `record_age(<record_id | bound:<alias>>, >= | <= | == | !=, <integer_pages>)` when a block should mature an open pressure according to how long the matched record has existed in the current branch path; both `direct_batch` and `audit_repair` modes may use it in hard or soft preconditions. Use `belief_record(holder, BEL-<integer>, mode?, confidence_floor?)` for hard execution eligibility (actor-specific BEL grounding) and `any_belief(alias, holder_role?, mode?, truth_relation?, visibility?)` for author-pool / branch-prefix prefiltering. Use `plan_active(holder, plan?)` and `plan_blocked(holder)` for exact actor/plan eligibility, `any_plan_active(alias, holder_role?)` for author-pool plan-aware blocks, `emotion_active(holder, kind?, min_intensity?)` and `emotion_pressure(holder, pressure)` for actor-specific affective pressure, and `any_emotion_active(alias, holder_role?, kind?, min_intensity?)` for author-pool affective prefilters. Character-fit STCHAR predicate usage is governed by the citation paragraph in Phase 1; free-claim string matching is not lawful, and persona-state predicates such as `character_has_wound` or `character_arc_stage` are not allowed.

**Plan / emotion authoring patterns**: plan-aware blocks should move an active `STPLAN` through present-causal pressure, not pre-script a future plot. A block may test a blocker, advance a current step, force revision, or fulfill / abandon a plan only when its predicates establish the relevant active plan and actor access. Emotion-aware blocks should use `emotion_active` / `emotion_pressure` to select moves shaped by affective pressure, then let runtime `SE.state_delta` create or supersede `STEMO` only when the event actually changes affective state. The existing causal-function coverage targets remain authoritative; do not add a separate "plan/emotion" coverage family just because the new predicates exist.

For DA-grounded eligibility, use the `artifact_accessible(STENT-<integer>, DA-<integer>)` predicate from `.claude/skills/_shared-templates/story-state-contract.md` §5. Pair it with `any_belief(...)` when the content is known through belief rather than current artifact access. See `.claude/skills/_shared-templates/da-authoring-reference.md` §Field semantics for the access-route semantics that ground this predicate.

**Alias-binding discipline**: an existential `any_*` predicate binds its `alias` to the matched active record at block selection. `effects.create`, `effects.supersede`, `effects.close`, and `exit_options[].likely_effects` may reference that match as `bound:<alias>`. Every `bound:<alias>` token MUST be introduced by a hard or soft precondition on the same `SLT`; do not use `bound:<alias>` as a prose label. For `global_author_pool` blocks, this is the preferred way to close, supersede, or preview effects on open `OBL`, `CNSQ`, `THR`, `SREL`, `BEL`, or `STINT` records without naming branch-local ids.

**Beat discipline**: 1–5 beats per block. Each beat names a `function` (setup / action / pressure / turn / consequence / exit) and a prose-facing instruction that the renderer can dramatize without engine vocabulary.

**Schema-minimalism discipline** (per FOUNDATIONS §Story Bundles §5b): every field on the block conforms to the shared contract §4.4 schema. **NO** `arc_contract`, `dramatic_unit`, `execution_envelope`, nested `effect_model`, `stop_policy`, `record_version` discriminator above `1`, or `shape:` discriminator. The block is a causal move, not a dramatic-act surrogate.

**Effects-field convention**: `effects.create`, `effects.supersede`, and `effects.close` MAY be left empty (`[]`) when the block's effect-shape is contextual at runtime — matching bootstrap practice for `SLT-1..SLT-10` in any bootstrapped bundle. Populate `effects.{create,supersede,close}` with concrete record IDs or `bound:<alias>` references when the block's intent mandates a specific delta the author-time template is willing to commit to (e.g., a negotiation block that always supersedes the matched attention `SREL` as `bound:trust_edge`). Phase 4 check 3 (belief-or-relationship coverage) uses the three-form OR described below, so a block may satisfy the check through literal effects, `exit_options[].likely_effects`, or belief / relationship existential predicates without inventing fake author-time effects.

**`allowed_authority` default heuristic for empty-effects blocks**: when `effects.{create,supersede,close}` are all empty (contextual at runtime per the convention above), default `mystery_policy.allowed_authority` per `move_family` — `none` for pressure-dramatization families (`world_pressure`, `pursuit`, `recovery`, `transformation`, `conflict`, `evasion`, `protection`) that do not shape branch-apparent or canon-candidate truth, and `apparent` for state-shaping families (`investigation`, `disclosure`, `status_shift`, `negotiation`, `bond_shift`, `decision`, `resource_exchange`, `ritual_protocol`, `orient`) where runtime `SE.resolution` may produce branch-apparent claims. `branch_local_counterfactual` and `canon_candidate` remain reserved for blocks whose effects (or whose runtime `SE.state_delta` intent) explicitly create `SF` records with those authority levels. The Phase 3 gate 4 compatibility check still governs — this heuristic is a default starting point that author judgment may override when the block's intended runtime semantics dictate.

## Phase 3: Per-block validation

Run 6 per-block gates on each drafted SLT record:

1. **Schema and origin completeness** — all required fields per shared contract §4.4 are present (`id`, `story_id`, `scope.visibility`, `title`, `move_family`, `preconditions.hard` with ≥1 entry, `beats[]` with ≥1 entry, `exit_options[]` with ≥1 entry, `saliency.urgency`, `saliency.cooldown_pages`, `mystery_policy.allowed_authority`, `provenance.origin`, `grounding`). `provenance.origin` MUST be `author_batch` for `direct_batch` and `audit_repair` for `audit_repair`; this skill never emits `runtime_jit`, so `created_at_page` MAY be null per shared contract §4.4. The presence of ANY of the explicitly-forbidden legacy fields (`arc_contract`, `dramatic_unit`, `execution_envelope`, nested `effect_model`, `stop_policy`, `record_version > 1`, `shape:`) is `FAIL` per FOUNDATIONS §Story Bundles §5a. Missing required field, wrong origin, or presence of forbidden field → `FAIL`.

2. **Predicate parse** — every predicate in `preconditions.hard` and `preconditions.soft` is one of the closed-DSL predicates, with valid argument shapes, record-id references, and `bound:<alias>` references backed by same-`SLT` existential bindings. Free-form prose, undefined predicates, ill-formed combinator syntax, or unbound aliases → `FAIL`.

3. **Branch-scope legality** — `scope.visibility: global_author_pool` blocks reference NO `branch_local_record` per shared contract §4.2 branch-scope vocabulary, including no exact `STCHAR-*` ids. `bundle_genesis_record` references remain legal for global-author-pool blocks because genesis records are visible to every branch; this matches bootstrap practice (e.g., SLT-9 in any bootstrapped bundle references `BEL-3` minted at PG-1). `scope.visibility: branch_prefix_scoped` blocks reference only records visible at pages whose `branch_path` starts with the SLT's `visible_branch_path_prefix` (the PG-array prefix per the storylet schema); exact `STCHAR-*` ids are lawful only when active at one of those pages and paired with the actor's active `STENT`/state. `scope.visibility: branch_scoped` blocks reference only records visible on the branch named by `scope.branch_id`; exact `STCHAR-*` ids are lawful only for bound or branch-visible characters in that branch. Cross-branch references to records minted on non-root pages of sibling branches → `FAIL`.

4. **Mystery / invariant firewall** — `mystery_policy.forbidden_resolutions[]` does NOT include any mystery the block's effects could resolve. `mystery_policy.allowed_authority` is compatible with the block's effects (a block whose effects create a `canon_candidate`-authority `SF` cannot have `allowed_authority: none`). World invariants (loaded in Pre-flight step 6) are NOT violated by any predicate or effect. Inconsistent OR violating → `FAIL`.

5. **Effect legality** — `effects.create | supersede | close` references valid record classes or `bound:<alias>` tokens. Supersede / close targets must reference records the block's preconditions establish as active, either by an exact-ID predicate or by an existential `any_*` predicate (hard OR soft) binding the alias — soft-bound aliases are lawful in effects because runtime selection resolves the alias to whichever matched record bound it, regardless of whether the binding predicate was a hard gate or a soft preference (parallel to the §Alias-binding discipline paragraph in Phase 2). Close targets must be currently open per the bundle state. Dangling references or unbound aliases → `FAIL`.

6. **Exit-option grounding** — each entry in `exit_options[]` has a non-empty `action_family`, `surface_hint`, and at least an empty `likely_effects[]` list (per shared contract §4.4). Missing field → `FAIL`.

Blocks that fail any gate are removed from the batch with a logged rejection reason in Phase 5's manifest. If all blocks fail, abort before Phase 4.

## Phase 4: Batch-diversity validation (`direct_batch` only)

`audit_repair` skips this phase — its blocks are RSP-driven and may legitimately concentrate on one repair theme.

### Grounding (SPEC-77)

> An SLT's reason_to_exist must name the active or reusable pressure logic the storylet captures: what causal state makes it eligible, and what kind of move it represents. Generic phrases like "dramatic variety," "good conflict," "advance the plot," "raise stakes," "create tension," and "for pacing" are structurally rejected (see `slt_grounding_minimal_integrity` banned-phrase list below).

Per-field requirements:

- Require `grounding.compatible_turn_drivers[]` to be set per block. For a global-author-pool / branch-prefix pattern, list every driver kind the pattern can serve (commonly: `[player_action, player_write_in, npc_action, offstage_action]` for a pursuit pattern; `[clock_fire, world_pressure]` for a deadline-pressure pattern). For a branch-scoped runtime_jit block, list the single driver kind the JIT was created for.
- Require `grounding.reason_to_exist` per block. Provide a 1-2 sentence statement naming the active pressure record(s) or reusable pressure class. Examples:
  - "Covers offstage or onstage pursuit pressure from an active opposing actor." (global pattern)
  - "Varro's active plan (STPLAN-9) and ambush clock (CLK-3) became due; Jon and Mara must react in POV." (runtime_jit)
- Banned-phrase list (rejected by `slt_grounding_minimal_integrity`): "dramatic variety", "good conflict", "advance the plot", "raise stakes", "create tension", "for pacing", "dramatic moment", "story beat", "narrative momentum". This list is amendable via the shared utility at `tools/validators/src/structural/slt-grounding-utils.ts`; mirror amendments here when the utility changes.

For `direct_batch`, verify across the surviving blocks:

**Batch-size precondition and focused-scope carve-out**: Checks 1 and 2 apply when `target_count ≥ 3` AND the user-supplied `focus` (if any) does not categorically exclude recovery shape. For `target_count < 3` (focused-scope `direct_batch`), or when `focus` is incompatible with recovery shape, the operator may apply documented scope-override status — surface the override explicitly in the Phase 6 deliverable summary, citing (a) the user-requested narrow scope as warrant for the Check 1 exception when applicable, and (b) the bundle pool's existing recovery coverage (count + ids of `move_family: recovery` blocks already in pool) as warrant for the Check 2 exception. The HARD-GATE deliverable summary's user-acknowledgment step is sufficient for scope-override authorization; no separate ticket is required. Checks 3 (belief-or-relationship coverage) and 4 (no branch-local deps in global pool) apply regardless of batch size — both can be satisfied by a single block.

1. **Move-family diversity** — at least 3 distinct `move_family` values across the batch.
2. **Recovery coverage** — at least 1 block has `move_family: recovery`. The bundle needs recovery coverage so that violence, betrayal, sex, and death outcomes route to graceful follow-up.
3. **Belief-or-relationship coverage** — at least 1 block satisfies the three-form OR below. The social-state engine needs ongoing pool support per FOUNDATIONS §Story Bundles §6a.
   - Literal effects form: `effects.create`, `effects.supersede`, or `effects.close` contains a `BEL-<integer>` / `SREL-<integer>` reference or a `bound:<alias>` whose same-block existential predicate matches `BEL` / `SREL` (for example `any_belief` or `any_relationship_axis`). For `supersede` / `close` targets, the referenced record must be established active by the block's `preconditions.hard` (per Phase 3 gate 5 effect legality).
   - Exit-preview form: `exit_options[].likely_effects` contains a `BEL-<integer>` / `SREL-<integer>` reference or a `bound:<alias>` whose same-block existential predicate matches `BEL` / `SREL`.
   - Predicate-intent form: `preconditions.hard` or `preconditions.soft` includes `any_belief(...)` or `any_relationship_axis(...)`.
   Actual runtime consequences remain authoritative in `SE.state_delta` — the batch-diversity check verifies *intent surface*, not pre-authored effects.
4. **No branch-local dependencies in global-author-pool blocks** — re-verifies Phase 3 gate 3 at batch scope.

Plan/emotion predicates can satisfy a block's local grounding, but they do not replace the four batch-diversity checks above. If a batch focuses on tactical or affective pressure, still preserve move-family spread, recovery coverage, social-state coverage, and branch-scope legality.

Checks 1 (move-family diversity), 2 (recovery coverage), and 4 (no branch-local dependencies) do not inspect literal `effects` entries, so the three-form OR applies only to check 3.

If any batch-level check fails, regenerate the affected blocks (loop to Phase 2 for replacements) OR shrink the batch to the diversity-compliant subset. Surface the regeneration / shrink decision in the Phase 6 deliverable summary.

## Phase 5: Author the batch manifest

Draft the batch manifest content in working memory (the disk write happens at Phase 6 step 6 after the HARD-GATE approval; per the HARD-GATE block, no SLB write to disk occurs in Phase 5). The manifest content target shape for `worlds/<world_slug>/stories/<story_slug>/storylet-batches/SLB-<integer>.md` is:

```markdown
# SLB-<integer>: <mode> batch

**Mode**: direct_batch | audit_repair
**Source**: <focus hint, if direct_batch> | <audit_id + finding_ids, if audit_repair>
**Created**: <iso8601 date>
**Records**: <count> SLT records

## Blocks

| SLT id | move_family | scope | source RSP (if audit_repair) | validation |
|---|---|---|---|---|
| SLT-<integer> | <move_family> | global_author_pool | RSP-<integer> | PASS (6/6 gates) |
| ... | | | | |

## Skipped RSP cards (audit_repair only)

| RSP id | repair_kind | recommended sibling | skip reason |
|---|---|---|---|

## Per-block validation traces

(One section per surviving block; per-gate one-line PASS rationale.)

## Per-block rejection traces (if any)

(One section per rejected block; per-gate failure summary.)
```

The SLB file is a markdown direct-write manifest, not an atomic YAML record. No `create_slb_record` patch op exists; the file is direct-write per shared contract §10.

## Phase 6: Commit / Write — HARD-GATE fires

1. Build the patch plan covering all surviving SLT records as a single envelope: one `create_slt_record` op per block. Each op requires a `target_file` field naming the on-disk write path (`worlds/<world_slug>/stories/<story_slug>/_source/storylets/SLT-<integer>.yaml`); see `docs/MACHINE-FACING-LAYER.md` §`describe_envelope_schema` for the full envelope and per-op payload schemas, or invoke `mcp__worldloom__describe_envelope_schema(op_kind='create_slt_record')` at pre-flight for the machine-readable shape.
2. Dry-run via `mcp__worldloom__validate_patch_plan` (exercises `record_schema_compliance` for each SLT record). **Validate-path selection by envelope shape**: commitment-block-authoring envelopes are built from disk YAML files by construction, and inline JSON pasted into the MCP tool call is a separate buffer from `envelope.json` on disk — any divergence between the two produces a dry-run that passes the inline version while the disk version is what actually submits. For any envelope whose JSON exceeds a few KB the inline-paste-drift risk is real; prefer the equivalent CLI path that reads `envelope.json` directly: `node tools/world-mcp/dist/src/cli/validate-patch-plan.js [--world-root <path>] <plan-path>`. The CLI path is functionally equivalent — same engine code, same `{ status, verdicts, validators_run }` response shape, same validator coverage — and is the dry-run analogue of the submit-path CLI named in step 5. The CLI path also serves as the fresh-process escape valve when the running MCP server holds a pre-rebuild `@worldloom/validators` bundle in memory. It resolves the world root by explicit flag, `WORLDLOOM_ROOT`, then marker auto-discovery from cwd. See `docs/HARD-GATE-DISCIPLINE.md` §Validating and submitting the plan and `docs/MACHINE-FACING-LAYER.md` §troubleshooting matrix for the equivalent submit-path treatment.
3. Present the complete deliverable summary to the user:
   - Mode + source (focus hint OR audit_id + finding_ids).
   - SLT inventory by `move_family` value (Phase 1 + Phase 4 diagnosis preserved).
   - Per-block one-line summary (id, move_family, title, beat count, exit-option count).
   - Per-block validation trace (6 gates → PASS / rationale).
   - Batch-diversity validation result (`direct_batch` only).
   - Any skipped RSP cards (`audit_repair` only, with `repair_kind` + recommended sibling + skip reason).
   - The SLB manifest path + contents preview.
4. **HARD-GATE fires** — wait for explicit user approval. Auto Mode does not override.
5. On approval: persist the patch plan envelope as JSON (e.g., `/tmp/<plan-id>.json`), invoke the canonical signer to issue the `approval_token` (`node tools/world-mcp/dist/src/cli/sign-approval-token.js [--world-root <path>] <plan-path>` — see `docs/HARD-GATE-DISCIPLINE.md` §Issuing a token), then call `mcp__worldloom__submit_patch_plan(plan, approval_token)` with the same envelope object and the issued token. Approval tokens are single-use, plan-bound, default-20-minute-expiry. **Submit-path selection by envelope size**: commitment-block-authoring envelopes scale with batch size (one `create_slt_record` op per block; a `standard` 8-14-block batch is typically 15-30KB, but `audit_repair` batches consuming many RSP cards or `direct_batch` calls authoring widely-cast SLTs may exceed 50KB); for envelopes >50KB submit via the CLI path instead: `node tools/world-mcp/dist/src/cli/submit-patch-plan.js [--world-root <path>] <plan-path> <token-path>` (persist the signed token to a text file first). The CLI path is functionally equivalent — same engine code, same `PatchReceipt`, same failure-mode codes — but bypasses MCP transport size constraints; see `docs/HARD-GATE-DISCIPLINE.md` §Validating and submitting the plan. For sub-50KB envelopes where the dry-run was CLI-routed (Phase 6 sub-step 2's default for any envelope exceeding a few KB), submitting via the same CLI path is the sanctioned consistency pattern — both the dry-run and the submit consume the same `envelope.json` on disk, eliminating any buffer-paste-drift surface. MCP submit at sub-50KB is also lawful and faster for routine cases; the choice is operator preference. **Reading CLI output**: the CLI submit emits a `PatchReceipt` object to **stdout** on success (exit code 0) and an `[world-root] ...` trace plus `EngineError` / `McpError` object to **stderr** on failure (exit code 1) — confirmed by `tools/world-mcp/src/cli/submit-patch-plan.ts` stream separation. The success-case JSON is a `PatchReceipt` with NO `ok` field; it starts with `plan_id`, `applied_at`, `files_written`, etc. The failure-case JSON has `ok: false` and `code: ...` after the trace. The success/fail discriminator is exit code OR stream separation OR top-line key presence (`plan_id` on success vs `code` / `ok: false` on failure) — NOT the absent-on-success `ok` field. Inspect success via `echo $?` after the command, `jq -r .plan_id` (returns the plan id on success, `null` on failure), or capture stdout and stderr to separate buffers. Do not use `jq -r .ok` for success detection — the key is missing on success and returns `null`, which an operator may misread as a failure signal. Validator-PASS rows appear in both success and pre-apply-failure responses, so do not tail-truncate the output and infer status from the validator dump alone; the top-line keys (or the exit code) are the discriminator. If the success header may have been missed, do not re-run submit just to recover a receipt. Reusing the same consumed token returns `approval_replayed`; a genuinely fresh token over an already-applied plan is not the replay gate and may attempt duplicate writes or hit later engine protections, so inspect the target story `_source/` records and receipt/log output before any further submit attempt.
6. On patch success: write the markdown artifacts in shared contract §10 write order: `storylet-batches/SLB-<integer>.md` → update bundle `INDEX.md`. Create `storylet-batches/` if it does not already exist (idempotent `mkdir -p` — `branching-story-bootstrap` does not pre-create the directory, so the first SLB write in a bundle's lifetime needs to make it).
7. Report SLT ids + SLB id + bundle INDEX state to the user. Do NOT `git commit`.

**Failure behavior**: patch fail → write nothing; surface the failed per-block gate and corrective action. Patch success + markdown fail → story-bundle `_source/` records authoritative; the SLB manifest can be repaired directly; surface partial-failure to user. Per-block rejections in Phase 3 → blocks removed from batch with logged reason; surface the per-block rejection summary at sub-step 3 even on overall success.

## Validation Rules This Skill Upholds

- **Rule 1 (No Floating Facts)** — Phase 3 gate 1. Mechanism: schema-completeness check per shared contract §4.4; missing required fields OR presence of forbidden legacy fields fail the block.
- **Rule 4 (No Globalization by Accident)** — Phase 3 gate 3 + Phase 4 check 4. Mechanism: author-pool blocks cannot reference branch-local records; branch-scoped blocks cannot reference cross-branch records.
- **Rule 5 (No Consequence Evasion)** — Phase 3 gate 5. Mechanism: supersede targets must be currently active; close targets must be currently open.
- **Rule 7 (Preserve Mystery Deliberately)** — Phase 3 gate 4. Mechanism: per-block mystery firewall + invariant check against whole-class Mystery Reserve and INV records loaded at Pre-flight.

## Record Schemas

All record schemas referenced by this skill live in `.claude/skills/_shared-templates/story-record-schemas.md` (canonical prose form); the machine-readable JSON Schema for the SLT body is also retrievable via `mcp__worldloom__get_record_schema(node_type='storylet_record')`, parallel to how Phase 6 sub-step 1 retrieves the envelope shape via `describe_envelope_schema`:

- `SLT` (§4.4) — commitment block schema (this skill's primary output).
- Predicate DSL (§5) — closed predicate language for `preconditions.hard | soft`, including the existential predicates and `bound:<alias>` effect references.
- The SLB manifest is a markdown direct-write artifact (not an atomic `_source/` record); its shape is defined inline in this skill's Phase 5 template.

## FOUNDATIONS Alignment

| Principle | Phase | Mechanism |
|---|---|---|
| Rule 1 (No Floating Facts) | Phase 3 gate 1 | Schema completeness per shared contract §4.4. |
| Rule 2 (No Pure Cosmetics) | N/A | Story-bundle scope. World-canon principle. Handoff to `canon-addition` via `story-fact-promotion-to-canon`. |
| Rule 3 (No Specialness Inflation) | N/A | Same handoff as Rule 2. |
| Rule 4 (No Globalization by Accident) | Phase 3 gate 3, Phase 4 check 4 | Branch-scope legality at per-block and batch scope. |
| Rule 5 (No Consequence Evasion) | Phase 3 gate 5 | Effect legality (supersede / close target verification). |
| Rule 6 (No Silent Retcons) | N/A | Story-bundle scope; world-canon retcons route through `canon-addition`. |
| Rule 7 (Preserve Mystery Deliberately) | Phase 3 gate 4 | Per-block mystery / invariant firewall. |
| Rule 11 (No Spectator Castes) | N/A | World-canon-only principle. |
| Rule 12 (No Single-Trace Truths) | N/A | World-canon-only principle. |
| Canon Layers | Pre-flight, Phase 3 gate 4 | World canon loaded via context packet; per-block invariant + mystery firewall. |
| Mystery Reserve | Pre-flight, Phase 3 gate 4 | Whole-class Mystery Reserve loaded; per-block firewall. |
| §Story Bundles §4a (Plan-Authority Boundary) | All phases | Commitment-block-authoring writes author-pool storylets; does NOT mutate page records. |
| §Story Bundles §5a (Commitment Blocks Are Causal Moves) | Phase 2, 3 gate 1 | Drafted blocks reject `arc_contract` / `dramatic_unit` / `execution_envelope` / nested `effect_model` / `stop_policy` / shape discriminators per shared contract §4.4. |
| §Story Bundles §5b (Schema-Minimalism) | Phase 2, 3 gate 1 | Every field conforms to shared contract §4.4; gate 1 rejects extras and forbidden legacy fields; no new `any_story_character_active` predicate is introduced. |
| §Story Bundles §6a (Belief vs. Fact) | Phase 4 check 3 | `direct_batch` requires ≥1 block in the batch to affect `BEL` or `SREL` state. |
| §Story Bundles §6.1 (Story-Local Character Authority) | Pre-flight, Phase 1, Phase 2, Phase 3 gate 3 | Pre-flight enumerates active STCHARs' `role_in_story` proactively (including offstage); Phase 1 cast-role coverage criterion surfaces unrepresented pressure-bearing roles as authoring lanes; character-specific blocks consume active STCHAR through story-scoped retrieval and the Character-Fit Selection Contract's predicate discipline; world `CHAR-*` remains provenance only. |
| §Story Bundles §9 (Prose Length Discipline) | Phase 2 beat drafting | Beats carry prose-facing instructions but no word-count targets. |
| Change Control Policy | N/A | Canon-reading skill emits no Change Log Entries. |
| Tooling Recommendation | Pre-flight step 6 | World canon retrieval via `mcp__worldloom__get_context_packet`. |

## Guardrails

- **Never write world-level canon.** Hook 3 blocks raw `Edit` / `Write` on `worlds/<slug>/_source/<world-subdir>/*.yaml`. Story-bundle records under `worlds/<world_slug>/stories/<story_slug>/_source/storylets/SLT-*.yaml` are this skill's exclusive write surface, routed through the patch engine.
- **Never write rendered prose.** Commitment-block-authoring writes record schemas, not narrative text. Beat instructions are inputs to the external renderer when turn-cycle later authors a page plan using the selected block.
- **Do not fabricate DA existence in SLT preconditions.** An SLT may require `artifact_accessible(...)` or `any_belief(... access_route=document ...)` over an existing DA, but the storylet itself does not create DA records. DA creation belongs to runtime state deltas authored by `branching-story-bootstrap` or `branching-story-turn-cycle`. An SLT precondition naming a `DA-<integer>` that no runtime delta has created will silently never bind; the validator's `storylet_predicate_dsl_parsability` rule cannot detect this because predicate parsability does not verify record existence at authoring time.
- **Commitment blocks are causal moves, not dramatic acts.** Per FOUNDATIONS §Story Bundles §5a, the schema explicitly forbids `arc_contract`, `dramatic_unit`, `execution_envelope`, nested `effect_model`, `stop_policy`, `record_version` discriminators above `1`, and `shape:` discriminators. The skill REJECTS any attempt to write blocks with those fields (Phase 3 gate 1 schema completeness extends to schema strictness).
- **Schema minimalism per shared contract §2 + FOUNDATIONS §Story Bundles §5b.** Every field in every record drafted by this skill conforms to the shared contract §4.4 schema. No nice-to-have fields.
- **Predicate DSL is closed** (per shared contract §5). No free-form predicate prose; Phase 3 gate 2 rejects undefined predicates and unbound `bound:<alias>` references.
- **STCHAR is story-local character authority, not a new predicate family.** Follow the Character-Fit Selection Contract for exact-STCHAR predicate discipline. Do not invent `any_story_character_active`, `character_has_wound`, `character_arc_stage`, or other persona-state predicates.
- **No `in_memory_jit` mode.** The streamlined-pipeline source report named three modes; this skill ships two (`direct_batch`, `audit_repair`). Turn-cycle's Phase 2 inlines JIT block creation following the same shared contract §4.4 schema. The two skills share the schema discipline without chaining: turn-cycle never invokes commitment-block-authoring; commitment-block-authoring never produces a `runtime_jit`-origin block. If a future refactor extracts JIT to a shared sub-routine, a new ticket can capture that work.
- **No word-count enforcement** (per FOUNDATIONS §Story Bundles §9). Beat instructions carry no min/max word counts.
- **Skills do not chain.** Commitment-block-authoring never invokes `branching-story-turn-cycle`, `branching-story-prose-attach`, `branching-story-health-audit`, `story-fact-promotion-to-canon`, or `story-promotion-closeout`. When `audit_repair` skips an RSP card with non-commitment-block `repair_kind`, the SLB manifest records the sibling-handoff recommendation; the user separately invokes the named sibling.
- **Worktree discipline**: if invoked inside a git worktree, all paths resolve from the worktree root.

## Final Rule

Commitment-block-authoring creates compact reusable causal moves — preconditions, beats, effects, exit options, saliency — and rejects every legacy field (`arc_contract`, `dramatic_unit`, `execution_envelope`, nested `effect_model`, `stop_policy`, shape discriminators) at schema completeness; blocks are not acts, arcs, or mini-stories.
