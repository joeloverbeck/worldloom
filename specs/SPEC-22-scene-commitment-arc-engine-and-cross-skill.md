<!-- spec-drafting-rules.md not present; using default structure + Deliverables + Risks & Open Questions. -->

# SPEC-22: Scene-Commitment Arc Engine, Validators, and Cross-Skill Alignment

**Status**: PROPOSED (2026-05-07)
**Phase**: machine-facing layer + cross-skill alignment + migration tier of the scene-commitment-arc pivot
**Depends on**: archived SPEC-19 (schemas + canonical vocabularies)
**Blocks**: SPEC-20 (runtime pipeline cannot submit arc-record patches without engine ops + validators), SPEC-21 (authoring cannot validate v2 records without validators + canonical vocabularies wired in)
**Source**: `reports/scene-arc-storylet-research-brief.md`; `reports/scene-commitment-arc.md` §10 Validation Strategy, §6 Runtime Pipeline; current engine surface at `tools/patch-engine/`, `tools/validators/`, `tools/world-mcp/`, `tools/world-index/`; cross-checked against `docs/FOUNDATIONS.md` §Machine-Facing Layer, §Story Bundles, archived SPEC-13 (atomic-source migration) and archived SPEC-14 (PA contract reconciliation).

## Problem Statement

SPEC-19 defines the v2 schemas (SLT, CHC, ARC_TRACE) and the canonical-vocabulary enums; SPEC-20 defines the runtime pipeline behavior; SPEC-21 defines the authoring-skill behavior. None of those specs land without the corresponding **engine surface**:

- **Patch-engine ops**: `create_arc_trace_record` does not exist. The runtime cannot persist ARC_TRACE records.
- **Validators**: `record_schema_compliance` only knows the v1 SLT and CHC envelopes. No validator enforces choice_worthiness, stop-policy parsability, effect-model legality, ARC_TRACE evidence alignment, or narrative-point classification.
- **Canonical-vocabularies**: the new closed enums (`commitment_class`, `arc_archetype`, `narrative_point`, `strong_axis`, `strong_outcome`, `stop_predicate`) need TypeScript implementations and exposure via `mcp__worldloom__get_canonical_vocabulary`.
- **Indexer**: `world-index` does not parse ARC_TRACE records or surface arc-level fields for retrieval.
- **MCP retrieval**: `get_record`, `list_records`, `get_records` need extension to handle the `arc_trace_record` type.
- **Sibling skills**: `branching-story-bootstrap` Phase 6 (storylet pool seed) generates beat-granular SLTs by default; Phase 7 (root page render) selects a beat-granular PG-0001 storylet and renders one beat; Phase 8 (initial choice generation) delegates to page-cycle Phase 8's Amendment B Pipeline (the v1 Phase 8 — beat-granular CHC emission, no choice-surface gate, no choice-worthiness validation, no commitment-class semantics). `branching-story-health-audit` SAU report measures beat-cadence metrics. `story-fact-promotion-to-canon` sources promotion candidates from per-beat SF claims.
- **Migration**: the existing test bundle at `worlds/erotica-world/stories/red-bunny/` carries v1 records that have no v2 form. The bundle is discarded per the user's "we have one test story we will discard."

This spec lands the machine-layer + cross-skill + migration work.

## Approach

Five tracks. Each track is independently reviewable; tracks 1-3 are foundational and must land before SPEC-20 / SPEC-21 implementation begins. Tracks 4-5 land in lockstep with SPEC-20 / SPEC-21.

### Track 1 — Patch-Engine Op + Op Vocabulary Extension

Add one new patch-engine op for ARC_TRACE records:

| Op | Target | Payload shape | Append-only semantic |
|---|---|---|---|
| `create_arc_trace_record` | `worlds/<slug>/stories/<story-slug>/_source/arc-traces/ARCTRACE-NNNN.yaml` | `{op, target_world, target_file, payload: {story_slug, record}}` | one file per record; created at page-cycle Phase 11 alongside other story-bundle records |

The op follows the existing story-bundle-op convention (`create_pg_record`, `create_se_record`, etc.) — payload includes `story_slug` and `record`. The engine derives the actual write path from `record.id` (preserving existing convention).

The op type definitions land in `tools/patch-engine/src/ops/`:

- `tools/patch-engine/src/ops/create-arc-trace-record.ts` — new file
- `tools/patch-engine/src/ops/types.ts` — discriminated union extension
- `tools/patch-engine/src/ops/shared.ts` — if the new op shares helpers with existing story-bundle ops

The envelope schema (in `tools/patch-engine/src/envelope/`) extends `expected_id_allocations` to include `arc_trace_ids`. The pre-apply check `id_allocation_race` extends to cover `ARCTRACE-NNNN` ids.

### Track 2 — Validators

Six new validators land in `tools/validators/src/rules/`. Each follows the existing validator structure: a deterministic check function over a parsed record set, returning a `ValidatorResult` with PASS/FAIL + reason + record-id reference.

| Validator | Coverage | Failure mode |
|---|---|---|
| `arc_schema_compliance` | `shape: scene_commitment_arc` SLTs have all seven new structural blocks (arc_contract, dramatic_unit, beat_plan, execution_envelope, stop_policy, effect_model, exit_portfolio) populated; required sub-fields per block are non-empty | HARD-REJECT |
| `choice_worthiness_completeness` | `choice_kind: scene_commitment` CHCs have non-empty `likely_effects`, populated `choice_worthiness` block (strategic_question_answered, ≥1 strong_axes entry, expected_state_delta, why_not_microbeat, foreseeable_difference) | HARD-REJECT |
| `stop_policy_parsability` | every entry in `stop_policy.normal_exits[].predicate` and `stop_policy.interrupt_before[].predicate` parses against the extended DSL grammar; predicate args match the per-predicate args schema | HARD-REJECT |
| `effect_model_legality` | every `effect_model.variants[]` entry has ≥1 required_effects; required_effects.type values are from the closed effect-type enum; forbidden_effects similarly; ≥1 variant; variant.maps_to_outcome is in arc.arc_contract.allowed_outcome_band | HARD-REJECT |
| `effect_model_replay_safety` | every PG record's `state_snapshot.applied_effect_variant` is a valid `variants[].id` of the realized arc's `effect_model`; the SE record's ops are derivable from the chosen variant's required_effects | HARD-REJECT |
| `arc_trace_evidence_alignment` | every ARC_TRACE evidence_span has valid `{start, end}` byte offsets within the page's prose; every effect_evidence references a real `arc.effect_model.variants[<applied>].required_effects[N]`; every stop_condition_hit.id references a real `arc.stop_policy.normal_exits[N].id` or `interrupt_before[N].id` | HARD-REJECT |
| `narrative_point_classification` | the page record's `state_snapshot.narrative_point_classification` is in the closed enum; the classification is consistent with the ARC_TRACE.stop_condition_hit.category (NATURAL_COMMITMENT_HINGE iff stop_condition_hit.category == normal_exit; INTERRUPT_HINGE iff interrupt_before; CONTINUE_ONLY_PAUSE iff safety_valve; TERMINAL_OR_CHAPTER_CLOSE per existing terminal-branch logic) | HARD-REJECT |

The existing `record_schema_compliance` validator extends to handle SLT v2 + CHC v2 + ARC_TRACE record types. The existing `storylet_predicate_dsl_parsability` validator's grammar-loading logic is shared with `stop_policy_parsability` (both consume the extended `predicate-dsl.md`).

Validator implementations land in:

- `tools/validators/src/rules/arc_schema_compliance.ts`
- `tools/validators/src/rules/choice_worthiness_completeness.ts`
- `tools/validators/src/rules/stop_policy_parsability.ts`
- `tools/validators/src/rules/effect_model_legality.ts`
- `tools/validators/src/rules/effect_model_replay_safety.ts`
- `tools/validators/src/rules/arc_trace_evidence_alignment.ts`
- `tools/validators/src/rules/narrative_point_classification.ts`
- `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts` extended with stop-predicate forms

The CLI surface `world-validate` (existing) gains coverage of the new validators automatically (no new CLI command; validators register through the existing rule-registry pattern).

### Track 3 — Canonical-Vocabularies + Indexer + MCP Retrieval

**Canonical-vocabularies extension** (`tools/world-index/src/public/canonical-vocabularies.ts`):

Six new closed enums per SPEC-19 §E:

```typescript
export const COMMITMENT_CLASSES = [
  'stay_available_without_pressure',
  'offer_practical_help',
  'ask_one_bounded_question',
  'withdraw_without_abandoning',
  'confess_one_thing',
  'accept_offered_help',
  'refuse_with_grace',
  'escalate_to_confrontation',
  'conceal_under_pressure',
  'seek_third_party',
  'change_venue',
  'make_public_commitment',
  'private_betrayal',
  'bear_witness',
  'release_pressure',
  'tighten_pressure',
  'defer_decision',
  'force_disclosure',
  'mirror_acknowledgment',
  'intimacy_advance',
] as const;

export const ARC_ARCHETYPES = [
  'fragile_offer', 'bounded_question', 'confession_received',
  'refusal_and_aftercare', 'practical_aid_attempt',
  'withdrawal_without_abandonment', 'escalation_to_confrontation',
  'concealment_under_pressure', 'third_party_intervention',
  'investigation_followup', 'aftermath_processing', 'route_change',
  'public_commitment', 'private_betrayal', 'intimacy_negotiation',
  'boundary_setting', 'restitution_offered', 'silent_witness',
  'forced_disclosure', 'pressure_release',
] as const;

export const NARRATIVE_POINTS = [
  'CONTINUE_ARC', 'NATURAL_COMMITMENT_HINGE', 'INTERRUPT_HINGE',
  'CONTINUE_ONLY_PAUSE', 'TERMINAL_OR_CHAPTER_CLOSE',
] as const;

export const STRONG_AXES = [
  'relationship_trajectory', 'obligation_state', 'information_posture',
  'risk_cost_exposure', 'route_or_scene_type', 'thread_pressure',
  'irreversibility', 'character_intention',
] as const;

export const STRONG_OUTCOMES = [
  'succeeds', 'partially_succeeds', 'fails_with_consequence', 'backfires',
  'accepted_with_limits', 'refused_without_break', 'partially_deflected',
  'interrupted_before_resolution',
] as const;

export const STOP_PREDICATES = [
  // normal_exits
  'commitment_satisfied', 'commitment_blocked', 'commitment_overturned',
  'npc_makes_demand', 'npc_makes_disclosure', 'participant_exits',
  'scene_goal_resolves', 'scene_goal_changes', 'new_obligation_created',
  'open_thread_reprioritized', 'time_or_location_changes',
  // interrupt_before
  'irreversible_cost_imminent', 'consent_boundary_imminent',
  'violence_or_harm_imminent', 'forbidden_mystery_resolution_risk',
  'protagonist_goal_change_required', 'selected_commitment_would_be_violated',
  'user_write_in_conflicts_with_envelope',
  'only_next_action_would_create_major_state_change',
] as const;
```

The MCP tool `mcp__worldloom__get_canonical_vocabulary({class: <enum-class-name>})` extends to surface the new enums. Existing class names (`domain`, `epistemic_class`, etc.) preserved.

**Indexer extension** (`tools/world-index/src/`):

The world-index parses story-bundle records into the SQLite index. ARC_TRACE records become a new node type in the index schema:

- `arc_trace_node` — id, story_id, created_at_page (the PG ref), arc_realized (the SLT ref), effect_variant_applied, semantic_critic_verdict.status, plus fulltext-indexed claims/actions for `mcp__worldloom__search_nodes` queries.

Edges:
- `arc_trace_describes_page` (ARC_TRACE → PG)
- `arc_trace_realizes_arc` (ARC_TRACE → SLT)
- `arc_trace_observes_action_by` (ARC_TRACE → STENT for each observed_action.actor)

The existing `world-index render` CLI gains optional `--arc-traces` flag to include ARC_TRACE records in story-bundle merged-markdown output.

**MCP retrieval extension** (`tools/world-mcp/src/`):

- `get_record(record_id)` accepts `ARCTRACE-NNNN` ids; returns the parsed YAML record with optional `section_path` projection (e.g., `effect_evidence` to project just the effect-evidence block).
- `list_records(record_type='arc_trace_record', story_slug)` returns ARC_TRACE records for a story bundle.
- `get_records_field(record_ids, field_path)` supports field-projection on ARC_TRACE records (e.g., `field_path: 'semantic_critic_verdict.status'`).
- `get_record_schema(record_type='arc_trace_record')` returns the v2 schema metadata.

The retrieval surface preserves the existing `story_slug`-required discipline for story-bundle records.

### Track 4 — Sibling-Skill Alignment

**branching-story-bootstrap** (`.claude/skills/branching-story-bootstrap/`):

- Phase 6 (Storylet Pool Seed) recomputes `target_pool_size` arithmetic for arc-granularity. Under v1, target was ~20 storylets; under v2, fewer arcs cover more story state because each arc spans multiple beats. New default: `target_pool_size = max(8, ceil(world_complexity_factor × 10))`. The `world_complexity_factor` is derived from STORY_KERNEL premise breadth + cast count + thread count (specific arithmetic owned by the bootstrap skill's reference doc).
- Phase 6 invokes `storylet-pool-authoring mode=seed parent_skill_invocation=true` per existing convention (preserved); the sub-routine returns v2 SLT records.
- STORY_KERNEL.md template gains the `cadence_policy` and `menu_policy` blocks from SPEC-20 §H.
- Phase 11 staged commit: pre-allocates `ARCTRACE-NNNN` ids? No — bootstrap does not produce arc-trace records (they only appear at page-cycle ticks). The bootstrap allocates SLT ids for the seed pool; ARCTRACE allocation happens at page-cycle time.
- **Phase 7 (Root Page Render) becomes scene-setter mode**: under v2, PG-0001 is rendered without an SLT selection — there is no "PG-0001 storylet" to score and select, because no arc closes at PG-0001 (the user picks the first commitment via PG-0001's menu, and the first true arc render happens at PG-0002 via page-cycle). Bootstrap Phase 7's prompt structure is preserved (content_policy verbatim FIRST + world context + story kernel + Prose Craft Contract + cast bound + state context) but the "selected storylet" prompt block is replaced by an "entry pressure framing" prompt block drawn from STORY_KERNEL's central dramatic question and the Phase 5 obligations / threads. The instruction shifts from "render the selected beat" to "render the scene-setter that establishes entry pressure and exposes 4-6 plausible commitment-class next moves." The Prose Craft Contract still applies; the post-render cross-check still runs; max_words is governed by STORY_KERNEL's `cadence_policy.preferred_words_per_arc[1]` upper bound (default 2000). PG-0001's emitted records carry `applied_effect_variant: null`, `narrative_point_classification: NATURAL_COMMITMENT_HINGE`, `arc_trace_id: null`, `arc_trace_emitted: false` per SPEC-20 §F's Bootstrap PG-0001 special case.
- **Phase 8 (Initial Choice Generation) delegates to SPEC-20 §F in PG-0001 special-case mode**: bootstrap Phase 8's existing delegation to page-cycle Phase 8 is preserved as the integration mechanism, but page-cycle Phase 8 under v2 IS the choice-surface gate (SPEC-20 §F). Bootstrap supplies `PG-0001.state_snapshot` as the current state, the Phase 7.5 Visible Affordance Map as additional anchors, and `governor_nudge: "bootstrap root; favor premise-aligned entry pressure and initial agency spread"`. The choice-surface gate runs in PG-0001 special-case mode per SPEC-20 §F's "Bootstrap PG-0001 special case" sub-paragraph: narrative-point classification defaults to NATURAL_COMMITMENT_HINGE; hybrid exit portfolio drawn from initial obligations + threads + seed-pool arc eligibility (no `native_seeds` from a closed arc); choice-worthiness validation applies normally (mandatory non-empty `likely_effects`, populated `choice_worthiness` block, ≥1 `strong_axes` entry per CHC); strong-axis collective difference applies normally (≥2 distinct `strong_axes` across the menu). The legacy `branching-story-bootstrap/references/phase-8-choice-generation.md` "Required CHC diversification" + "Pair-distance discipline" sub-sections are SUPERSEDED by SPEC-20 §F's choice-surface gate; the reference doc is rewritten to delegate-and-cite SPEC-20 §F rather than duplicate the v1 Amendment B Pipeline prose.
- **Phase 9 (Validation Gates) extends with the new validators**: the existing 13 bootstrap gates (mystery firewall, invariant compatibility, content policy presence, ID uniqueness, branch path consistency, cast intention coverage, obligation salience, epistemic class declared, storylet diversity, prose ledger consistency, choice consequence-capacity, state_snapshot completeness, recursive reference closure) are joined by the 5 new validators from SPEC-20's Phase 9 extension that apply at PG-0001: `arc_envelope_conformance` (vacuous at PG-0001 — no arc selected; gate auto-PASSes with rationale `"PG-0001 root special case — no arc selected"`), `effect_model_replay_safety` (root-page exception — accepts `applied_effect_variant: null` when `id == PG-0001`), `arc_trace_evidence_alignment` (vacuous at PG-0001 — no ARC_TRACE emitted; gate auto-PASSes), `narrative_point_classification` (PG-0001 root-page exception — accepts the bootstrap-default NATURAL_COMMITMENT_HINGE), and `choice_worthiness_completeness` (applies non-vacuously to PG-0001's emitted CHCs — every CHC must satisfy the v2 validation). The bootstrap-skill's Phase 9 total becomes 18 gates; gate count and per-gate PASS-with-rationale discipline preserved.
- **Phase 9.5 (Bootstrap Discipline Validator) storylet diversity check uses commitment_class under v2**: the existing 10 Phase 9.5 discipline checks include a "storylet diversity" check that under v1 measured per-`shape:` distribution. Under v2 (where every authored SLT carries `shape: scene_commitment_arc`), per-shape distribution is degenerate; the check rebinds to per-`arc_contract.commitment_class` distribution (parallel to SPEC-21 Phase 5's diversity-axis refactor: ≤30% per commitment_class threshold for the seed batch). The other 9 discipline checks are v2-agnostic and preserved verbatim. Phase 9.5 total remains 10 checks; the storylet-diversity check's measurement axis is the only sub-change.
- **Phase 1 (Premise Normalization) may derive cadence_policy / menu_policy defaults from premise**: the STORY_KERNEL.md `cadence_policy` and `menu_policy` blocks (per SPEC-20 §H) ship with hardcoded defaults when neither block is explicitly populated. Under v2, Phase 1's premise-normalization step MAY derive overrides for these defaults from the premise's tone signals — slow-paced literary premises lean toward `preferred_words_per_arc[1]: 1500` (lower upper bound) and `default_min_words_between_menus: 1500` (longer between menus); action-oriented premises lean toward `preferred_words_per_arc[1]: 2500` and `default_min_words_between_menus: 900`. The derivation is recommendation-only — the user can override at Phase 10 HARD-GATE review or by editing STORY_KERNEL.md after bootstrap completes. When Phase 1 does not derive overrides (e.g., ambiguous premise tone), the hardcoded defaults from SPEC-20 §H apply unchanged.
- **Per-bundle INDEX.md template wording updates for arc cadence**: the `templates/story-bundle-index.md` storylet-pool summary line currently reads "storylet pool: <count> seed storylets covering <shapes>" (where `<shapes>` enumerates the v1 shape distribution). Under v2, every authored SLT carries `shape: scene_commitment_arc` so `<shapes>` is degenerate; the line becomes "storylet pool: <count> seed scene-commitment arcs covering <commitment_classes>" enumerating the per-commitment_class distribution from the seed batch. Phase 11 step 5's per-bundle INDEX write reflects this. The Phase 10 deliverable summary's "Storylet pool: <count> seed storylets covering <shapes>" line in the existing bootstrap SKILL.md template (line 264 of `branching-story-bootstrap/SKILL.md`) similarly updates to "covering <commitment_classes>".

**branching-story-health-audit** (`.claude/skills/branching-story-health-audit/`):

The SAU report (`audits/SAU-NNNN-<date>.md`) gains three new metric sections:

- **Choice cadence**: mean words per arc, mean words between menus, count of CONTINUE_ONLY_PAUSE pages, count of CONTINUE_ARC pages, count of INTERRUPT_HINGE pages, ratio of menu-emitting pages to total pages.
- **Arc conformance**: % of pages whose ARC_TRACE shows `semantic_critic_verdict.status == pass`; per-violation breakdown of `possible_violations[]` by envelope_item; mean `realized_beats[]` realization rate.
- **Commitment-class coverage**: distribution of arcs realized across the bundle's pages; gaps (commitment_classes appearing in 0 pages); over-representation (commitment_classes appearing in >40% of pages).

The RSP card schema (`audits/SAU-NNNN/remediation-storylet-proposals/RSP-NNNN-<slug>.md`) extends:

```yaml
target_commitment_class: <commitment_class enum>
target_arc_archetype: <arc_archetype enum>
sketch_arc_contract: >
sketch_dramatic_unit: >
```

The id class `RSP-NNNN` is preserved (no rename). The card body's free-form rationale section preserves its existing structure; the new fields are an additive header block.

The three new metric sections + the RSP card schema extension are NOT self-contained — they require integration into the audit's Process Flow, argument enum, Pre-flight retrieval, Phase 3 sub-check enumeration, Phase 4 closure-walk extension, Phase 7 self-check structural floors, and the existing v1 choice sub-checks. The integration extends across:

- **`audit_focus` argument enum extends with three new values**: the existing 22-value enum (per `branching-story-health-audit/SKILL.md` arguments frontmatter line 16) gains `arc_conformance`, `choice_cadence`, and `commitment_class_coverage` as diagnostic categories. Each follows the existing focus-narrowing semantics (when narrowed to a single category, Phases 3-5 skip non-matching sub-checks; Phase 4's snapshot-integrity and recursive-reference-closure checks always run when focus is `all` OR matches). When `audit_focus=arc_conformance`, Phase 3's new arc-conformance sub-check runs and the rest of Phase 3 is skipped (parallel to the existing `mystery_firewall` and `prose_ledger_consistency` focus narrow patterns).
- **Pre-flight World-State Prerequisites extends with ARC_TRACE whole-class load**: existing Pre-flight loads world canon, whole-class M, whole-class INV, story-bundle pages + cited records along scoped branches. Under v2, additionally load all ARC_TRACE records for the audited branches via `mcp__worldloom__list_records(world_slug, record_type='arc_trace_record', story_slug=<story_slug>, include_full_body=true)`. The whole-class load is bounded by `story_slug`; `include_full_body=true` is required because Phase 3's arc-conformance sub-check reads `realized_beats[]`, `possible_violations[]`, `stop_condition_hit`, and `effect_evidence[]` from each trace.
- **Phase 3 Coverage Analysis gains three new sub-checks**:
  - **Choice Cadence** (`audit_focus=choice_cadence`): per audited branch, compute mean words per arc-page (sum of pages-prose word counts / page count), mean words between menus (sum of words across consecutive non-menu-emitting pages, per `narrative_point_classification ∈ {CONTINUE_ARC, CONTINUE_ONLY_PAUSE}`), count of `CONTINUE_ONLY_PAUSE` pages, count of `CONTINUE_ARC` pages, count of `INTERRUPT_HINGE` pages, ratio of menu-emitting pages (`narrative_point_classification ∈ {NATURAL_COMMITMENT_HINGE, INTERRUPT_HINGE}`) to total pages. Findings: mean words between menus < `STORY_KERNEL.cadence_policy.default_min_words_between_menus / 2` → `warning` (menu-thrash); ratio of menu-emitting pages > 70% AND mean words per arc-page < 700 → `warning` (beat-cadence regression). Per-branch metrics in the SAU report's Choice Cadence section.
  - **Arc Conformance** (`audit_focus=arc_conformance`): per audited branch, compute % of pages whose ARC_TRACE shows `semantic_critic_verdict.status == pass`; per-violation breakdown of `possible_violations[]` grouped by `envelope_item`; mean `realized_beats[]` realization rate (count of `realized: true` / total beat count across all traces). Findings: any page whose ARC_TRACE shows `semantic_critic_verdict.status == reject_arc` → `warning` (arc selection was structurally wrong; surface for retroactive arc-selection review); any envelope-violation `severity: high` → `error` (forbidden_actions violated in rendered prose); cumulative envelope-violation `severity: medium` count > 30% of pages → `warning` (envelope-discipline drift). Per-branch metrics in the SAU report's Arc Conformance section.
  - **Commitment-Class Coverage** (`audit_focus=commitment_class_coverage`): per audited branch, tabulate the distribution of `arc.arc_contract.commitment_class` across the realized arcs (the SLT cited by each page's `storylet_realized` field; resolve to the SLT record's `arc_contract.commitment_class`). Findings: gaps (commitment_classes from the canonical-vocabularies enum appearing in 0 of the bundle's realized arcs) → `info` (under-utilization); over-representation (any single commitment_class appearing in >40% of pages) → `warning` (commitment-monoculture). Per-branch and bundle-aggregate metrics in the SAU report's Commitment-Class Coverage section.
- **Phase 7 Self-Check structural-floor extensions**: the existing structural floors (branch-isolation, snapshot-drift, forbidden-M, physical-staging) are joined by:
  - ARC_TRACE evidence-alignment failures (any `effect_evidence[].effect_ref` pointing outside the arc's `effect_model.variants[<applied>].required_effects[N]` range; any evidence_span outside prose byte-range) → ALWAYS `error`. Self-check test added: "ARC_TRACE evidence-alignment findings cite the trace id, the offending evidence index, the byte-range / variant-index error, and severity is `error`."
  - High-severity envelope violations (any `possible_violations[].severity: high`) → ALWAYS `error`. Medium-severity violations are `warning` by default; low-severity are `info`. Self-check test added: "Envelope-violation findings cite the page id, the trace id, the offending envelope_item, the prose evidence_span, the severity, and severity classification matches the floors above."
- **Phase 4 Cross-Branch Reference Closure Leakage (Recursive) extends to ARC_TRACE references**: the existing recursive walk's exhaustive list of story-local ID references (covering OBL.dependent_facts[], CHC.continuation_capacity.valid_seed_storylets[], etc.) extends with the ARC_TRACE record's references:
  - `ARC_TRACE.created_at_page` → must satisfy the existing PG branch_path rule.
  - `ARC_TRACE.arc_realized` → SLT id; satisfies the existing SLT global-or-branch-local rule.
  - `ARC_TRACE.observed_actions[].actor` → STENT id; satisfies the existing STENT rule.
  - `ARC_TRACE.observed_actions[].target` → STENT / STOBJ / STLOC id; satisfies the existing rule.
  - `ARC_TRACE.effect_evidence[].effect_ref` → variant index in the arc's `effect_model.variants[<applied>].required_effects[]`; the index must be in-range (0 ≤ index < required_effects.length). Out-of-range → `error` ("ARCTRACE-NNNN.effect_evidence[N].effect_ref points outside arc.effect_model.variants[<applied>].required_effects[] range").
  - `ARC_TRACE.stop_condition_hit.id` → must reference a real `arc.stop_policy.normal_exits[N].id` or `interrupt_before[N].id`. Unknown id → `error`.
- **Existing `choice_pair_distance` sub-check extends for v2 strong-axis collective difference**: the existing v1 8-axis pair-distance check (per `branching-story-health-audit/SKILL.md` Phase 3 §Choice Pair-Distance Integrity) is preserved as the structural baseline. Under v2, additionally check (per CHC v2 schema in SPEC-19 §B): the menu's surviving CHCs MUST collectively cover ≥2 distinct `choice_worthiness.strong_axes` entries. Two CHCs that both engage only `relationship_trajectory` share the same axis profile; the menu fails the strong-axis-collective-difference check. Findings cite the page id, the menu's strong_axes union, the rule violation, severity (`warning` by default; `error` when the page's available choices collapse to a single strong-axis profile).
- **Existing `choice_continuation_capacity` sub-check extends for v2 CHC → arc references**: under v2, every CHC's `continuation_capacity.valid_seed_storylets[]` may name v2 SLT records (`shape: scene_commitment_arc`). The existing check that each named SLT exists and is legal under the post-choice delta extends to verify the named arc's `arc_contract.commitment_class` matches the CHC's `commitment_class` field (the CHC's continuation MUST be eligible for the chosen commitment-class). Mismatch → `warning`. Empty `valid_seed_storylets[]` AND empty `jit_shape_spec` AND empty native-seed reference (when the CHC was emitted as part of a hybrid exit portfolio) is still the existing dead-end `error`.

The audit's existing Phase 7 self-check enumeration extends with one new test per the structural-floor additions above (total Phase 7 self-check tests grows from 11 to 13).

**story-fact-promotion-to-canon** (`.claude/skills/story-fact-promotion-to-canon/`):

The SP-NNNN promotion ledger and proposal-package shape extends to source from `arc.effect_model.variants[<applied>].required_effects[]` rather than per-beat SF claims:

- The `source_kind` enum gains `arc_effect_promotion` (existing values preserved: `story_fact`, `mystery_resolution`, `character_arc_outcome`, `artifact_canonization`).
- For `source_kind: arc_effect_promotion`, the proposal-package's `proposed_canon_fact` is derived from the arc's `effect_model.variants[<applied>].required_effects[]` — typically a `fact_create` op or a relationship/thread axis shift that has world-level implications.
- The HARD-GATE handoff to `canon-addition` is preserved (the only lawful story→world canon mutation path remains canon-addition).
- Existing `story_fact` source kind is preserved for legacy paths.

**Full specification of `source_kind: arc_effect_promotion`** — the four existing source-kinds each have detailed Pre-flight validation, Phase 1 source extraction, Phase 2 CF translation, Phase 4 mystery firewall, Phase 10 superseding-record shape, and per-source-kind required arguments. The new fifth source-kind needs the same:

- **New required arguments** (added to the existing argument list):
  - `source_arc_id`: required when `source_kind=arc_effect_promotion`. The `SLT-NNNN` (v2 `shape: scene_commitment_arc`) whose `effect_model` contains the variant being promoted. The arc must be present in the bundle's storylet pool (whether `provenance.origin: bootstrap_seed` / `focus_authoring` / `audit_remediation` / `runtime_jit`).
  - `source_page_id`: required when `source_kind=arc_effect_promotion`. The `PG-NNNN` whose `state_snapshot.applied_effect_variant` refers to the variant being promoted; the arc cited in `source_arc_id` must match the page's `storylet_realized` field.
  - `applied_variant_id`: required when `source_kind=arc_effect_promotion`. The variant `id` from `arc.effect_model.variants[]` whose `required_effects[]` are being promoted; must equal the page's `state_snapshot.applied_effect_variant`.
  - `effect_index`: required when `source_kind=arc_effect_promotion` AND the chosen variant's `required_effects[]` has multiple entries. The 0-based index identifying which `required_effects[N]` is the promotion target. When `required_effects[]` has exactly one entry, this argument may be omitted (defaults to 0).
- **Pre-flight validation branch**: validate `worlds/<world-slug>/stories/<story-slug>/_source/storylets/SLT-<source_arc_id>.yaml` exists; validate the storylet record has `record_version: 2` and `shape: scene_commitment_arc`; validate `worlds/<world-slug>/stories/<story-slug>/_source/pages/PG-<source_page_id>.yaml` exists; validate the page's `storylet_realized == source_arc_id`; validate the page's `state_snapshot.applied_effect_variant == applied_variant_id`; validate `applied_variant_id` exists in the arc's `effect_model.variants[].id` list; validate `effect_index` is in-range for `arc.effect_model.variants[<applied_variant_id>].required_effects[]`.
- **Phase 1 source extraction (`arc_effect_promotion` branch)**: load the arc record (`SLT-<source_arc_id>.yaml`) including `arc_contract`, `dramatic_unit`, `effect_model.variants[<applied_variant_id>]`, and the specific `required_effects[<effect_index>]` entry being promoted. Load the page record (`PG-<source_page_id>.yaml`) including its `state_snapshot` (for the post-arc-application story state) and the cited `applied_event_ops` SE record (which carries the deterministic ops applied at arc-close). Load the rendered prose (`pages-prose/PG-<source_page_id>.md`) — this is the supporting prose excerpt for the proposal_package. If an ARC_TRACE record exists for this page (per `state_snapshot.arc_trace_id`), load it via `mcp__worldloom__get_record(arc_trace_id)` and capture the `effect_evidence[<effect_index>]` entry as additional proposal-package evidence (the trace's evidence_span proves the prose realized the effect being promoted). Walk the arc's preconditions and `dramatic_unit.entry_pressure` along the branch_path to capture the framing context.
- **Phase 2 CF candidate translation (`arc_effect_promotion` branch)**: the arc-effect entry being promoted is one of the closed effect-types per SPEC-19 §A `effect_model.variants[].required_effects[].type`: `relationship_axis_shift`, `thread_pressure_delta`, `obligation_status_change`, `fact_create`, `fact_invalidate`, `consequence_open`, `consequence_address`, `cast_change`, `location_change`, `mystery_progress`. CF candidate translation per type:
  - `fact_create` → CF candidate's `statement` derives from the fact's `subject/predicate/object` form; `type` per the fact's category; `scope.geographic / temporal / social` per the fact's `known_by` and the arc's `commitment_scope`; `truth_scope.diegetic_status` per the fact's `epistemic_class`; `domains_affected` requires user/Phase-2-LLM enumeration (the arc-effect doesn't pre-declare domains).
  - `relationship_axis_shift` → CF candidate is typically `type: belief` or `type: institution` describing the relationship-axis state at world-canon scale (e.g., the arc that closes with `trust_without_pressure: +1` between two STENTs may be promoted as a CF establishing world-canon `<character>` and `<character>` in a trusted relationship).
  - `thread_pressure_delta` → typically NOT directly promotable (thread pressure is story-local by design). If the user invokes `arc_effect_promotion` for a thread_pressure_delta, the Phase 2 LLM emits a structured warning recommending re-routing as `character_arc_outcome` or `story_fact` instead.
  - `obligation_status_change` → typically NOT directly promotable. If invoked, emit the same structured warning.
  - `consequence_open` / `consequence_address` → typically NOT directly promotable; story-local consequence semantics. Warning.
  - `cast_change` / `location_change` → may be promotable when the change has world-canon implications (e.g., a character's death in-story IF the user accepts the death as world-canon). Phase 2 LLM produces a CF candidate framing the change as a CF with appropriate scope.
  - `mystery_progress` → routes via `source_kind: mystery_resolution` instead, NOT `arc_effect_promotion`. If a user invokes `arc_effect_promotion` for a `mystery_progress` effect, Pre-flight HARD-REJECTs with "use source_kind=mystery_resolution for mystery progression promotions; arc_effect_promotion is for non-mystery effects."
  
  The translation respects the same Phase 2 laundering firewall as the four existing source kinds — `source_basis.derived_from` carries CF parent ids only; promotion provenance flows through SP+CH+PA per the Option A schema reconciliation already documented in SPEC-22.
- **Phase 4 mystery-firewall handling (`arc_effect_promotion` branch)**: the arc's `execution_envelope.mystery_preservation.forbidden_resolutions[]` is checked against the world's whole-class M load (already loaded at Pre-flight). If the arc's envelope omits a `forbidden`-status M id that the proposed CF could touch, HARD-REJECT with "arc envelope does not include forbidden M-NNNN; arc-effect promotion cannot proceed without explicit envelope coverage." For arc effects whose CF candidate would resolve a non-forbidden M, route via `source_kind: mystery_resolution` instead (Pre-flight HARD-REJECT per the routing-rule above for `mystery_progress`).
- **Phase 10 superseding-record shape (`arc_effect_promotion` branch)**: the supersession unit is NOT the arc record itself (the SLT remains in the bundle's pool unmodified — arcs are reusable templates). The supersession unit is the **arc-effect-derived SF record** that the arc's variant.required_effects[<effect_index>] would have produced when the page-cycle applied the variant at the page's Phase 5 state-mutation step. Per SPEC-20 §C "Phase 5 — State Mutation at Arc-Close", every entry in `variants[<chosen>].required_effects[]` maps to one or more `SE.ops` entries that produce records (e.g., `fact_create` → `create_sf_record` with the new SF's id). Phase 10 Step 2 for `arc_effect_promotion` submits a `create_sf_record` op for a SUPERSEDING SF (allocated via `mcp__worldloom__allocate_next_id(world_slug, 'SF', story_slug=<story_slug>)`):
  
  ```yaml
  id: SF-<new-id>
  story_id: STORY-NNNN
  logical_id: <original SF logical_id from page-cycle's Phase 5 application>
  supersedes: <original SF id from page-cycle's Phase 5 application>
  created_at_page: <source_page_id>
  promoted_to_cf: CF-NNNN
  promoted_via_arc: SLT-<source_arc_id>
  promoted_via_variant: <applied_variant_id>
  promoted_via_effect_index: <effect_index>
  # all other fields inherited from original SF
  ```
  
  When the original arc-effect was a `relationship_axis_shift` or `cast_change` or other non-SF op, the supersession is the corresponding record class (`SREL-NNNN` superseder for relationship_axis_shift; `STENT-NNNN` superseder for cast_change). The `promoted_to_cf` / `promoted_via_*` fields are added uniformly across record classes.
- **Proposal_package extension fields (`arc_effect_promotion` branch)**: the proposal_package's existing schema (`promotion_id`, `source_kind`, `source_record`, `promotion_branch_path`, `cf_candidate`, `provenance`, `scope_inflation_check`, `mystery_firewall`, `downstream_impact`, `rule_12_two_trace_check`, `contradiction_handling_preference`, `cross_story_impact_scan_performed`, `execution_mode`, `content_policy`) extends with:
  - `source_arc_id`: the `SLT-NNNN` whose variant is being promoted.
  - `applied_variant_id`: the variant being promoted.
  - `effect_index`: the index in `variants[<applied>].required_effects[]`.
  - `arc_trace_id`: `ARCTRACE-NNNN` if a trace was emitted for the page (per `PG.state_snapshot.arc_trace_id`); `null` if `arc_trace_emitted: false`.
  - `arc_trace_evidence_span`: when `arc_trace_id` is non-null, the `effect_evidence[<effect_index>].evidence_span` `{start, end}` byte offsets — the proof that the prose realized the effect being promoted (additional evidence for downstream canon-addition's adjudication LLM critics).
  
  The `provenance.supporting_pages` carries `[source_page_id]` (one page); `provenance.supporting_prose_excerpts` carries the rendered arc page's prose (typically 1500-2000 words for an arc-cadence page vs. potentially many pages for character_arc_outcome). The `provenance.source_record` field carries `{source_arc_id, applied_variant_id, effect_index}` instead of a single record id (the four existing source kinds carry single record ids).

**branching-story-page-cycle's record-schemas reference** (`.claude/skills/branching-story-page-cycle/references/record-schemas.md`):

The PG record schema extends with two new fields:

```yaml
state_snapshot:
  ...                                                # existing fields preserved
  applied_effect_variant: <variant id>               # the variant chosen at Phase 4b
  narrative_point_classification: <narrative_point enum>  # the Phase 8 classification

  # ARC_TRACE pointer (when emitted)
  arc_trace_id: ARCTRACE-NNNN | null
  arc_trace_emitted: true | false                    # false in low-budget interactive_runtime
```

### Track 5 — Migration: Discard the Test Story Bundle

The existing test story bundle at `worlds/erotica-world/stories/red-bunny/` carries v1 records. The user has confirmed (research brief): "We have one test story we will discard. The redesign is forward-only."

**Migration directive** (one-time operation; not a reusable migration):

1. The user, after spec approval and SPEC-19 + SPEC-22 implementation, deletes the bundle: `rm -rf worlds/erotica-world/stories/red-bunny/`.
2. The deletion is recorded as a "bundle discard" entry in this spec's audit trail (the spec is the audit trail; no CH-NNNN is allocated because no world-canon mutation occurred).
3. The `worlds/erotica-world/stories/INDEX.md` file is edited to remove the red-bunny entry. If red-bunny was the only entry, the file is reduced to an empty stories index.
4. Worlds bootstrapped after the cutover (`worlds/animalia/`, plus future worlds) emit v2 records exclusively from `branching-story-bootstrap`. No story bundles exist in `worlds/animalia/` at SPEC-22 intake; the first bootstrap there is a v2-native run.

**Forward-only discipline**: there is no v1-to-v2 migration of records. Worlds with existing v1 SLT/CHC records (only `worlds/erotica-world/stories/red-bunny/` at SPEC-22 intake) discard the bundle. Future worlds start v2-native.

**Hook 3 surface check**: `worlds/<slug>/stories/<slug>/_source/arc-traces/` is automatically covered by the existing pattern `worlds/<slug>/stories/<slug>/_source/...`. No hook configuration change is needed.

## Deliverables

| File | Track | Action |
|---|---|---|
| `tools/patch-engine/src/ops/create-arc-trace-record.ts` | 1 | NEW |
| `tools/patch-engine/src/ops/types.ts` | 1 | extend discriminated union |
| `tools/patch-engine/src/ops/shared.ts` | 1 | (if needed) shared helpers |
| `tools/patch-engine/src/envelope/schema.ts` | 1 | extend `expected_id_allocations.arc_trace_ids` |
| `tools/patch-engine/src/pre-apply-checks/id_allocation_race.ts` | 1 | extend to cover ARCTRACE ids |
| `tools/validators/src/rules/arc_schema_compliance.ts` | 2 | NEW |
| `tools/validators/src/rules/choice_worthiness_completeness.ts` | 2 | NEW |
| `tools/validators/src/rules/stop_policy_parsability.ts` | 2 | NEW |
| `tools/validators/src/rules/effect_model_legality.ts` | 2 | NEW |
| `tools/validators/src/rules/effect_model_replay_safety.ts` | 2 | NEW |
| `tools/validators/src/rules/arc_trace_evidence_alignment.ts` | 2 | NEW |
| `tools/validators/src/rules/narrative_point_classification.ts` | 2 | NEW |
| `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts` | 2 | extend with stop-predicate forms |
| `tools/validators/src/rules/record_schema_compliance.ts` | 2 | extend for SLT v2 + CHC v2 + ARC_TRACE |
| `tools/world-index/src/public/canonical-vocabularies.ts` | 3 | add 6 new enums |
| `tools/world-index/src/public/types.ts` | 3 | add types for SLT v2, CHC v2, ARC_TRACE; extend node-type enum |
| `tools/world-index/src/parsers/arc-trace-parser.ts` | 3 | NEW (or extend existing story-record parser) |
| `tools/world-index/src/index-schema.sql` (or equivalent) | 3 | add `arc_trace_node` table + edge tables |
| `tools/world-mcp/src/tools/get_record.ts` | 3 | accept ARCTRACE ids; section_path projection |
| `tools/world-mcp/src/tools/list_records.ts` | 3 | accept `record_type='arc_trace_record'` |
| `tools/world-mcp/src/tools/get_record_schema.ts` | 3 | return v2 schema metadata |
| `tools/world-mcp/src/tools/get_canonical_vocabulary.ts` | 3 | surface new enum classes |
| `.claude/skills/branching-story-bootstrap/SKILL.md` | 4 | Phase 6 target_pool_size arithmetic; STORY_KERNEL template; Phase 7 scene-setter mode; Phase 8 PG-0001 special-case delegation; Phase 9 gate count 13 → 18 |
| `.claude/skills/branching-story-bootstrap/references/phase-6-storylet-pool-seed.md` | 4 | rewrite for arc-granularity arithmetic |
| `.claude/skills/branching-story-bootstrap/references/phase-3-story-kernel.md` (or equivalent) | 4 | add cadence_policy + menu_policy template blocks |
| `.claude/skills/branching-story-bootstrap/references/phase-7-root-page-render.md` | 4 | rewrite for scene-setter mode (no SLT selection at PG-0001; entry-pressure framing prompt block replaces the selected-storylet block); preserve Prose Craft Contract + post-render cross-check |
| `.claude/skills/branching-story-bootstrap/references/phase-8-choice-generation.md` | 4 | rewrite to delegate-and-cite SPEC-20 §F in PG-0001 special-case mode; supersede the v1 "Required CHC diversification" + "Pair-distance discipline" sub-sections |
| `.claude/skills/branching-story-bootstrap/references/phase-9-validation-gates.md` | 4 | extend gate count 13 → 18 with the 5 SPEC-20 / SPEC-22 validators applied at PG-0001 (vacuous-at-root for arc_envelope_conformance + arc_trace_evidence_alignment; root-page exception for effect_model_replay_safety + narrative_point_classification; non-vacuous for choice_worthiness_completeness) |
| `.claude/skills/branching-story-health-audit/SKILL.md` | 4 | add three new metric sections to SAU report |
| `.claude/skills/branching-story-health-audit/references/sau-report-shape.md` (or equivalent) | 4 | document new sections |
| `.claude/skills/branching-story-health-audit/templates/rsp-card.md` (or equivalent) | 4 | extend RSP card schema with target_commitment_class + target_arc_archetype |
| `.claude/skills/story-fact-promotion-to-canon/SKILL.md` | 4 | add `source_kind: arc_effect_promotion`; extend SP-NNNN package shape |
| `.claude/skills/branching-story-page-cycle/references/record-schemas.md` | 4 | extend PG.state_snapshot with applied_effect_variant + narrative_point_classification + arc_trace_id + arc_trace_emitted |
| `worlds/erotica-world/stories/red-bunny/` | 5 | DELETE (one-time, user-driven, post-spec-approval) |
| `worlds/erotica-world/stories/INDEX.md` | 5 | remove red-bunny entry |

## FOUNDATIONS Alignment

| Principle | Stance | Rationale |
|---|---|---|
| §Machine-Facing Layer | aligns | new validators land in the executable rule set; new patch-engine op extends the typed envelope; canonical-vocabularies surface the new enums via `get_canonical_vocabulary` |
| §Story Bundles §4 (Write Discipline) | aligns | `create_arc_trace_record` routes through `submit_patch_plan`; Hook 3's `worlds/<slug>/stories/<slug>/_source/...` pattern automatically covers `arc-traces/` |
| §Story Bundles §3 (Read Discipline) | aligns | ARC_TRACE retrievable via `get_record(record_id)`; whole-class via `list_records('arc_trace_record', story_slug)`; field-projection via `get_record_field` and `get_records_field` |
| §Canonical Storage Layer | aligns | ARC_TRACE atomic-YAML records under `_source/arc-traces/ARCTRACE-NNNN.yaml`; one record per file; SPEC-13 atomic-source pattern preserved |
| Rule 6 (No Silent Retcons) | aligns | the test-story discard is recorded in this spec's audit trail (the spec IS the audit trail); the bundle's deletion is a story-bundle-level operation, not a world-canon mutation, so no CH-NNNN is allocated |
| HARD-GATE Discipline | aligns | story-fact-promotion-to-canon HARD-GATE preserved; the new `source_kind: arc_effect_promotion` route still hands off to `canon-addition` under its own HARD-GATE; no skill bypasses the canon-mutation path |
| Default Reality / §Default Reality | aligns | the v2 schema is forward-only; the discard of the test bundle does not retroactively rewrite history (the bundle is destroyed, not re-interpreted) |

## Verification

- **Patch-engine round-trip**: a v2 SLT + CHC v2 + ARC_TRACE patch plan validates → submits → produces files-on-disk that re-read identically through `get_record`.
- **Validator coverage**: every Phase 9 gate of branching-story-page-cycle (post-SPEC-20, total 17 gates) is backed by an executable validator. A bare PASS without rationale → treated as FAIL per existing skill discipline.
- **Canonical-vocabularies enum coverage**: `mcp__worldloom__get_canonical_vocabulary({class: 'commitment_class'})` returns the 20-entry array; same for the other 5 new enums.
- **Indexer ingestion**: a story bundle with 50 pages × 1 ARC_TRACE per page (50 ARCTRACE records) ingests in <10s wall-clock on the existing world-index builder.
- **Sibling-skill interop**:
  - `branching-story-bootstrap` Phase 6 produces a v2-native seed pool (10 arcs by default; v1 SLT records absent from the output).
  - `branching-story-health-audit` SAU report's choice-cadence section lists mean words per arc and menu-emission ratio over the bundle.
  - `story-fact-promotion-to-canon` SP-NNNN package with `source_kind: arc_effect_promotion` produces a valid `canon-addition` proposal package whose `proposed_canon_fact` is derived from `arc.effect_model.variants[<applied>].required_effects[]`.
- **Migration**: `worlds/erotica-world/stories/red-bunny/` is absent from disk after the discard; `worlds/erotica-world/stories/INDEX.md` no longer references it; worlds without prior story bundles (e.g., `worlds/animalia/`) bootstrap v2-native through `branching-story-bootstrap`.
- **Hook 3 coverage**: a direct `Edit` or `Write` to `worlds/<slug>/stories/<slug>/_source/arc-traces/ARCTRACE-NNNN.yaml` is structurally blocked by Hook 3 (extending the existing `worlds/<slug>/stories/<slug>/_source/...` pattern). No hook config change required.

## Out of Scope

- **Schema definitions** — owned by archived SPEC-19.
- **Runtime pipeline behavior** — owned by SPEC-20.
- **Authoring-skill rewrite** — owned by SPEC-21.
- **JIT arc promotion to author-pool** — deferred follow-on (a runtime JIT arc that validates and is approved may be promoted to author-pool by a future skill or manual workflow; the `provenance.origin: jit_promoted_to_authoring` value is reserved but not driven by v1).
- **Cache arc render packets by branch hash** — deferred runtime optimization.
- **Arc archetype library expansion beyond the initial 20** — append-only authorial change to canonical-vocabularies.ts + arc-archetypes.md; no spec required.
- **Constrained decoding (NeuroLogic-style)** — deferred per ChatGPT-Pro's §16 guidance.
- **Empirical token-cost telemetry** — implementation-time measurement, not a separate spec.

## Risks & Open Questions

- **Validator interaction surface**: extending `record_schema_compliance` for SLT v2 + CHC v2 + ARC_TRACE is the largest validator change. The existing v1 SLT/CHC schemas are dropped (no parallel-format support); the validator's v1 paths can be removed in lockstep with the test-bundle discard. If a partial cutover is needed (some worlds on v1, some on v2), the validator would need a `record_version` discriminator. Recommendation: full cutover, no partial coexistence.
- **ARCTRACE id allocation contention**: under `interactive_runtime` auto-chain, multiple page-cycle ticks may run in rapid succession, each allocating ARCTRACE ids. The existing `id_allocation_race` defense-in-depth backstop covers this; no new contention model needed.
- **Indexer schema migration**: adding `arc_trace_node` and edge tables to the SQLite index requires a schema-migration step on existing worlds. Since `_index/world.db` is gitignored and regenerated by `world-index build`, the migration is "rebuild the index" — no on-disk migration script needed.
- **Sibling-skill rollout order**: `branching-story-bootstrap` Phase 6 depends on `storylet-pool-authoring mode=seed parent_skill_invocation=true` returning v2 records (SPEC-21). The order Track 4 sub-changes land: bootstrap STORY_KERNEL template extension → page-cycle record-schemas extension → bootstrap Phase 6 arithmetic → health-audit SAU extensions → promotion source_kind extension. Bundling these into one or two implementation tickets is acceptable.
- **RSP card schema migration**: existing audit reports under `worlds/<slug>/stories/<slug>/audits/SAU-NNNN/remediation-storylet-proposals/` may carry RSP cards without the new fields. Since these are audit trails (informational, not engine-consumed for non-current audits), the migration is: new audits emit cards with the new fields; old audits remain as historical record. No re-emission of historical RSPs.
- **Validator implementation effort**: 7 new validators (incl. extension of 2 existing) + extension of `record_schema_compliance` is substantial. Estimate: 1-2 weeks of focused implementation for an experienced TypeScript engineer with familiarity with the existing validator patterns.
- **Test fixtures**: each new validator needs unit-test fixtures (passing record + failing record per failure mode). Existing validator-test patterns at `tools/validators/test/` cover the structure; the new fixtures need to span SLT v2 (with all seven blocks correct vs each block missing/malformed), CHC v2 (with each choice_worthiness sub-field present vs absent), ARC_TRACE (with each evidence_span valid vs out-of-range vs missing).
