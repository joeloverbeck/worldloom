# SPEC19SCECOM-002: CHC v2 fields + ARC_TRACE record class in record-schemas.md

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — extends `branching-story-page-cycle` skill reference (`references/record-schemas.md`): adds CHC v2 schema fields (record_version, choice_kind, commitment_class, strategy_cluster, choice_worthiness block + mandatory non-empty likely_effects mandate) and a new ARC_TRACE record class section. Adds a narrow transition note to `branching-story-page-cycle/SKILL.md` so the live skill does not silently present the v2 schema reference as a fully-landed runtime rewrite. No impact on existing CHC consumers at the field-name level — the v2 fields are additive on top of the preserved v1 `choice_contract` and `continuation_capacity` blocks.
**Deps**: None — schema-text-only ticket; runtime / validator / engine-op consumers land in SPEC-20 / SPEC-22.

## Problem

At intake, `branching-story-page-cycle/references/record-schemas.md` documented the v1 CHC (Choice) record with `choice_contract`, `likely_effects`, `continuation_capacity`, `minimum_state_change`, and `success_policy` fields. Empirical evidence at SPEC-19 reassessment time (2026-05-07) showed 40/40 emitted CHC records in `worlds/erotica-world/stories/red-bunny/` carried `likely_effects: []` (the field existed but was never filled — see SPEC-19 §Problem Statement), confirming that the v1 schema did not structurally enforce the "every choice must change ≥1 strong axis" discipline that SPEC-19's scene-commitment-arc pivot requires.

The SPEC-19 §B fix extends the CHC record schema with **four new fields** (record_version, choice_kind, commitment_class, strategy_cluster) plus a **structurally enforced choice_worthiness block** containing strategic_question_answered, strong_axes, expected_state_delta, why_not_microbeat, foreseeable_difference. The mandatory non-empty `likely_effects` rule under v2 closes the most damning gap from the test bundle.

Separately, SPEC-19 §C introduces a new derived story-bundle record class — **ARC_TRACE** — for the post-render trace extracted by SPEC-20 §Phase 7.6 (semantic-critic-driven extraction of realized beats, observed actions, observed claims, possible violations, stop-condition hits, effect evidence). ARC_TRACE is non-authoritative for replay (replay equality is preserved by `effect_model.variants[]` determinism plus the variant chosen at SPEC-20 §Phase 4b being recorded in `PG.state_snapshot.applied_effect_variant`); ARC_TRACE records may be deleted, regenerated, or omitted in low-cost runtime modes without breaking replay.

This ticket landed the documentation for both schema additions in the same skill reference file, consolidating the SPEC-19 §B and §C deliverables that the spec's §Deliverables table groups under one row.

## Assumption Reassessment (2026-05-07)

1. **Current CHC record documentation (verified at SPEC-19 reassessment 2026-05-07)**: `.claude/skills/branching-story-page-cycle/references/record-schemas.md` (153 lines) documents the v1 CHC record with the `choice_contract` block (user_intent, guaranteed_action, success_policy, allowed_outcome_band, forbidden_outcomes, minimum_state_change), the `continuation_capacity` block (post_choice_delta, valid_seed_storylets, jit_shape_spec, validation_basis), and `likely_effects` (currently empty in 40/40 test-bundle records as of 2026-05-07). No `record_version` discriminator is currently declared on CHC records.
2. **SPEC-19 §B and §C as authority for the v2 additions**: the four new CHC v2 fields (record_version: 2, choice_kind: scene_commitment | tactical_beat, commitment_class, strategy_cluster), the `choice_worthiness` block (5 sub-fields), the mandatory non-empty `likely_effects` mandate, and the ARC_TRACE record class are specified in `specs/SPEC-19-scene-commitment-arc-schema.md` §B + §C. The landed ARC_TRACE reference documents five scalar top-level fields, seven structured sub-blocks (`realized_beats`, `observed_actions`, `observed_claims`, `possible_violations`, `stop_condition_hit`, `effect_evidence`, `semantic_critic_verdict`), and top-level `notes`.
3. **Cross-skill shared boundary under audit**: `references/record-schemas.md` is consumed by SPEC-20 (runtime page-cycle Phase 7.6 ARC_TRACE extraction reads the schema), SPEC-21 (storylet-pool-authoring Phase 3 LLM prompt cites the CHC v2 schema for choice generation), and SPEC-22 Track 2 (validators `choice_worthiness_completeness`, `arc_trace_evidence_alignment`, `effect_model_replay_safety` enforce the schema). All consumers post-date this ticket and are explicitly out-of-scope for SPEC-19 Tier-1; this ticket ships the contract text alone.
4. **FOUNDATIONS principle under audit — Story Bundles §5 Rule 1 (No Floating Facts) at story scope**: the v2 CHC structurally enforces "every scene_commitment choice must declare its commitment_class, strategy_cluster, choice_worthiness block, and non-empty likely_effects" — a record missing any of these fields is HARD-REJECTed by SPEC-22's `choice_worthiness_completeness` validator. The closure of the 40/40 empty-likely_effects gap is the primary structural payoff. ARC_TRACE structurally enforces "every claim in observed_actions, observed_claims, possible_violations, stop_condition_hit, effect_evidence carries an evidence_span with valid byte offsets pointing into the rendered prose" — enforced by SPEC-22's `arc_trace_evidence_alignment` validator.
5. **Mystery Reserve firewall — preserved**: ARC_TRACE's `observed_claims[].canon_status` field uses the existing `story_local | apparent | forbidden_risk` taxonomy (story-local M_resolution_claims authority discipline per FOUNDATIONS §Story Bundles §5 Rule 7); no new resolution-authority class is introduced. The new `forbidden_risk` value is the protective annotation a Layer-3 semantic critic uses to flag a claim that risks resolving an MR-forbidden mystery — which then routes to Phase 7.6's `revise_prose` or `reject_arc` verdict (owned by SPEC-20). The firewall is preserved both per-storylet (existing `mystery_safety` block on SLT records) and per-render (new `possible_violations[]` and `observed_claims[].canon_status: forbidden_risk` on ARC_TRACE).
6. **Schema extension shape — additive only**: the v2 CHC fields are additive on top of the preserved v1 `choice_contract` and `continuation_capacity` blocks (per SPEC-19 §B "the legacy `choice_contract` and `continuation_capacity` blocks are preserved; the addition is additive"). The mandatory non-empty `likely_effects` rule does not break existing v1 CHC records that have empty arrays — it triggers HARD-REJECT only for records emitted under `choice_kind: scene_commitment` (the v2 standard). The `tactical_beat` `choice_kind` is reserved for narrow cases where a true beat-granular choice is structurally required (e.g., terminal-branch acknowledgment); v2 LLM proposers default to `scene_commitment`. ARC_TRACE is a new record class entirely — no existing schema is modified by its addition. Consumers: SPEC-20 (runtime), SPEC-21 (authoring), SPEC-22 (validators + indexer + MCP retrieval surface).
7. **Parent skill disclosure added as same-seam required fallout**: `.claude/skills/branching-story-page-cycle/SKILL.md` still describes the v1 beat-oriented runtime phases and Phase 8 CHC generation. Fully rebinding those phases to scene-commitment arcs is SPEC-20 work, but leaving no transition note after updating the schema reference would make the live skill misleading. This ticket therefore adds a short schema-transition note while leaving the operational rewrite out of scope.

## Architecture Check

1. **Two semantic additions in one file is the cleanest decomposition**: SPEC-19's §Deliverables table groups CHC v2 + ARC_TRACE under one row ("Add CHC v2 fields + ARC_TRACE record class prose anchor") because both edits are "extend the same skill reference file with new scene-commitment-arc record types". A reviewer reviewing record-schemas.md sees both extensions in the same diff. Splitting would force a single-file race without gaining reviewability.
2. **No backwards-compatibility shim**: the v2 CHC fields are additive on the existing v1 envelope (the v1 `choice_contract` and `continuation_capacity` blocks remain unchanged); ARC_TRACE is a wholly new record class. No dual-version logic in the schema text.

## Verification Layers

1. **CHC v2 fields documented** → codebase grep-proof: each of `record_version`, `choice_kind`, `commitment_class`, `strategy_cluster` appears in the CHC section with type/constraint annotations matching SPEC-19 §B.
2. **`choice_worthiness` block documented with 5 sub-fields** → codebase grep-proof: `choice_worthiness:` block contains `strategic_question_answered`, `strong_axes`, `expected_state_delta`, `why_not_microbeat`, `foreseeable_difference`.
3. **Mandatory non-empty likely_effects rule documented** → codebase grep-proof: prose explicitly notes that `likely_effects` is MANDATORY non-empty under v2 with HARD-REJECT semantics enforced by SPEC-22's `choice_worthiness_completeness`.
4. **ARC_TRACE record class section added** → codebase grep-proof: a new section (heading or anchored block) documents ARC_TRACE with the five scalar top-level fields (id, story_id, created_at_page, arc_realized, effect_variant_applied), the seven structured sub-blocks (realized_beats, observed_actions, observed_claims, possible_violations, stop_condition_hit, effect_evidence, semantic_critic_verdict), and top-level notes.
5. **ARC_TRACE replay-non-authoritative semantics documented** → codebase grep-proof: prose explicitly states ARC_TRACE is non-authoritative for replay; replay equality is preserved by `PG.state_snapshot.applied_effect_variant` + `effect_model.variants[]` determinism (cross-references SPEC-19 §A's effect_model paragraph and SPEC-20 §Phase 4b).
6. **Mystery Reserve firewall preserved across observed_claims taxonomy** → FOUNDATIONS alignment check: §Story Bundles §5 Rule 7 — the `canon_status` field on observed_claims uses the existing `story_local | apparent | forbidden_risk` taxonomy; no new resolution-authority class weakens the firewall. Manual review of the documented schema confirms the taxonomy alignment.
7. **Validator-side enforcement deferred** → cross-spec: SPEC-22 Track 2 (`choice_worthiness_completeness`, `arc_trace_evidence_alignment`, `effect_model_replay_safety` validators) is the runtime gate; this ticket only ships the schema text.
8. **Operational skill rewrite deferred but disclosed** → manual review: `branching-story-page-cycle/SKILL.md` contains a schema-transition note naming SPEC-20 as owner of the full runtime rewrite.

## Landed Changes

### 1. Added a CHC v2 sub-section under the existing CHC record documentation

Added a new sub-section titled `### CHC v2 fields (record_version: 2)` under the existing CHC record section in `references/record-schemas.md` that:

- Documents the four new fields with type/constraint annotations:
  - `record_version: 2` (integer literal; v2 discriminator)
  - `choice_kind: scene_commitment | tactical_beat` (`scene_commitment` is the v2 standard; `tactical_beat` is reserved for narrow cases — terminal-branch acknowledgment, etc.; v2 LLM proposers default to `scene_commitment`)
  - `commitment_class: <commitment_class enum value>` (closed enum from `tools/world-index/src/public/canonical-vocabularies.ts`; SPEC-22 Track 3 ships the enum implementation; required when `choice_kind == scene_commitment`)
  - `strategy_cluster: <kebab-case open-vocab tag>` (open-vocab narrative-tagging label; required when `choice_kind == scene_commitment`)
- Documents the new `choice_worthiness:` block with all 5 sub-fields per SPEC-19 §B:
  - `strategic_question_answered: >` (one-line scene-question prose)
  - `strong_axes: [...]` (≥1 entry from `strong_axis` enum: relationship_trajectory, obligation_state, information_posture, risk_cost_exposure, route_or_scene_type, thread_pressure, irreversibility, character_intention)
  - `expected_state_delta:` (per-axis projection: relationship, obligation, thread, information, risk, route, irreversibility, intention; non-empty)
  - `why_not_microbeat: >` (author-side argument the choice is not a gesture)
  - `foreseeable_difference: >` (what the user can foresee will differ from sibling choices)
- Documents the mandatory non-empty `likely_effects` rule: every `choice_kind: scene_commitment` CHC must carry a non-empty `likely_effects` array. The `choice_worthiness_completeness` validator (SPEC-22 Track 2) HARD-REJECTs empty arrays. It references the SPEC-19 empirical gap (40/40 v1 records had empty `likely_effects` at reassessment on 2026-05-07).
- Notes that the v1 `choice_contract` and `continuation_capacity` blocks are preserved — additive extension only.
- Notes that the menu's options must collectively differ on at least two strong axes (SPEC-20's Phase 8 choice-surface gate); this ticket documents the per-CHC contract — the cross-CHC menu-level gate is owned by SPEC-20.

### 2. Added a new ARC_TRACE record class section

Added a new top-level section titled `## ARC_TRACE Record (story-bundle-scoped)` that documents the full ARC_TRACE schema per SPEC-19 §C:

- **Storage**: `worlds/<slug>/stories/<story-slug>/_source/arc-traces/ARCTRACE-NNNN.yaml` — one record per file, story-bundle-scoped, allocate via `mcp__worldloom__allocate_next_id(world_slug, 'ARCTRACE', story_slug=...)`.
- **Replay-safety semantics**: ARC_TRACE is non-authoritative for replay. Replay equality is preserved by (a) `effect_model.variants[]` determinism on the parent SLT record, plus (b) the chosen variant id being recorded in `PG.state_snapshot.applied_effect_variant` (PG-schema field added by SPEC-20 §Phase 4b + SPEC-22 §Track 4). ARC_TRACE records may be deleted, regenerated, or omitted in low-cost runtime modes without breaking replay.
- **Top-level fields**: id (ARCTRACE-NNNN), story_id (STORY-NNN), created_at_page (PG-NNNN — the page whose render this trace describes), arc_realized (SLT-NNNN — the arc selected at SPEC-20 §Phase 4), effect_variant_applied (variant id from arc.effect_model.variants[]).
- **Sub-blocks** (all 7):
  - `realized_beats[]`: beat_id, function, evidence_span (start + end char offsets), realized (true | partially | not)
  - `observed_actions[]`: actor (STENT-NNNN), action (canonical verb), target (STENT-NNNN | STOBJ-NNNN | STLOC-NNNN | abstract | null), evidence_span
  - `observed_claims[]`: claim (structured-form claim extracted from prose), source (narrator | character | inference), canon_status (story_local | apparent | forbidden_risk), evidence_span
  - `possible_violations[]`: envelope_item (invariant_directive | required_function | prohibited_action), severity (low | medium | high), evidence_span
  - `stop_condition_hit`: id (kebab-case stop id from arc.stop_policy), category (normal_exit | interrupt_before | safety_valve), evidence_span
  - `effect_evidence[]`: effect_ref (variants[].required_effects[N]), realized (true | partially | not), evidence_span
  - `semantic_critic_verdict`: status (pass | revise_prose | reject_arc | promote_interrupt — Phase 7.6 Layer 3 result), reasons[], required_revision_constraints[] (used by Phase 7 re-prompt budget)
- **`notes`**: free-form authorial / debugger notes.

Cross-reference: the patch-engine op `create_arc_trace_record` is owned by SPEC-22 Track 1; the validators `arc_trace_evidence_alignment` and `effect_model_replay_safety` are owned by SPEC-22 Track 2; the indexer/MCP retrieval surface (`list_records('arc_trace_record', story_slug)`) is owned by SPEC-22 Track 3; Phase 7.6 ARC_TRACE extraction is owned by SPEC-20.

### 3. Added parent-skill transition disclosure

Added a short schema-transition note to `.claude/skills/branching-story-page-cycle/SKILL.md` so the parent skill discloses that `record-schemas.md` now carries SPEC-19 v2 schema anchors while the completed operational runtime rewrite remains SPEC-20 scope.

## Files to Touch

- `.claude/skills/branching-story-page-cycle/references/record-schemas.md` (modify)
- `.claude/skills/branching-story-page-cycle/SKILL.md` (modify — transition note only)

## Out of Scope

- TypeScript types for CHC v2 / ARC_TRACE (owned by SPEC-22 Track 3)
- Patch-engine `create_arc_trace_record` op (owned by SPEC-22 Track 1)
- Validators `choice_worthiness_completeness`, `arc_trace_evidence_alignment`, `effect_model_replay_safety`, `narrative_point_classification` (owned by SPEC-22 Track 2)
- SPEC-20 §Phase 7.6 ARC_TRACE extraction logic (Layer 1 deterministic structural / Layer 2 LLM-critic trace extraction / Layer 3 semantic conformance critic)
- SPEC-20 §Phase 8 choice-surface gate (the per-menu cross-CHC discipline; this ticket documents only the per-CHC contract)
- Full `branching-story-page-cycle` operational rewrite from v1 beat-storylet pages to v2 scene-commitment arc pages (owned by SPEC-20); this ticket only adds a transition disclosure.
- PG schema extension for `applied_effect_variant`, `arc_trace_id`, `arc_trace_emitted` (owned by SPEC-20 §Phase 4b + SPEC-22 §Track 4)
- Indexer extension for `arc_trace_record` (owned by SPEC-22 Track 3)
- MCP retrieval surface for ARCTRACE ids (owned by SPEC-22 Track 3)
- `CLAUDE.md` §ID Allocation Conventions docs-update for `ARCTRACE-NNNN` (routed through SPEC-22 §Track 3 per SPEC-19 §Risks)
- SLT v2 schema (completed by `archive/tickets/SPEC19SCECOM-001.md`)
- Stop-predicate DSL grammar text (owned by ticket SPEC19SCECOM-003 in this batch)
- Migration of existing v1 CHC records — including discard of `worlds/erotica-world/stories/red-bunny/` (owned by SPEC-22 Track 5)

## Acceptance Criteria

### Tests That Must Pass

1. `grep -E "record_version: 2|choice_kind:|commitment_class:|strategy_cluster:|choice_worthiness:" .claude/skills/branching-story-page-cycle/references/record-schemas.md` returns matches for each term (5 distinct term matches at minimum).
2. `grep -E "strategic_question_answered|strong_axes|expected_state_delta|why_not_microbeat|foreseeable_difference" .claude/skills/branching-story-page-cycle/references/record-schemas.md | wc -l` returns ≥5 (the `choice_worthiness` sub-fields are documented).
3. `grep -E "MANDATORY|HARD-REJECT|choice_worthiness_completeness" .claude/skills/branching-story-page-cycle/references/record-schemas.md` returns matches confirming the mandatory non-empty `likely_effects` rule is documented with HARD-REJECT framing tied to the SPEC-22 validator.
4. `grep -E "ARC_TRACE|ARCTRACE-NNNN|arc_trace_record" .claude/skills/branching-story-page-cycle/references/record-schemas.md` returns matches confirming the new ARC_TRACE record class section is present.
5. `grep -E "realized_beats|observed_actions|observed_claims|possible_violations|stop_condition_hit|effect_evidence|semantic_critic_verdict" .claude/skills/branching-story-page-cycle/references/record-schemas.md | wc -l` returns ≥7 (each ARC_TRACE sub-block is documented).
6. `grep -E "applied_effect_variant|non-authoritative for replay|effect_model.variants" .claude/skills/branching-story-page-cycle/references/record-schemas.md` returns matches confirming the replay-safety semantics are documented.
7. `grep -c "Schema transition note" .claude/skills/branching-story-page-cycle/SKILL.md` returns `1`.

### Invariants

1. CHC v2 extension is additive at the field-name level: existing v1 `choice_contract` and `continuation_capacity` blocks remain documented as-is; the new fields layer on top with explicit `record_version: 2` discrimination.
2. ARC_TRACE is documented as a derived, replay-non-authoritative artifact. Replay equality is structurally guaranteed by `effect_model.variants[]` determinism + `PG.state_snapshot.applied_effect_variant` recording — NOT by ARC_TRACE persistence.
3. Mystery Reserve firewall is preserved across the new schema: `observed_claims[].canon_status` uses the existing `story_local | apparent | forbidden_risk` taxonomy without weakening; `possible_violations[]` provides additional render-time enforcement that complements the per-storylet `mystery_safety` block.
4. The runtime skill rewrite remains deferred but disclosed: `branching-story-page-cycle/SKILL.md` names SPEC-20 as owner of the full operational rewrite.

## Test Plan

### New/Modified Tests

1. `None — schema-authoring ticket; verification is grep-based against the modified reference file. Validator-side test coverage is owned by SPEC-22 Track 2 (`choice_worthiness_completeness`, `arc_trace_evidence_alignment`, `effect_model_replay_safety` HARD-REJECT semantics for v2 CHCs missing required fields and ARC_TRACE records with malformed evidence_spans); runtime-side coverage is owned by SPEC-20's Phase 7.6 ARC_TRACE extraction tests.`

### Commands

1. `grep -E "(record_version: 2|choice_kind:|commitment_class:|strategy_cluster:|choice_worthiness:|ARC_TRACE|ARCTRACE-NNNN|realized_beats|observed_actions|observed_claims|possible_violations|stop_condition_hit|effect_evidence|semantic_critic_verdict|applied_effect_variant)" .claude/skills/branching-story-page-cycle/references/record-schemas.md | wc -l` — must return a count consistent with all v2 CHC fields + all ARC_TRACE sub-blocks being documented (≥15 distinct term matches expected; exact count depends on prose density).
2. Read the modified reference file end-to-end and confirm by inspection: (a) the CHC v2 sub-section is clearly demarcated from the v1 documentation; (b) the ARC_TRACE section has full sub-block skeletons matching SPEC-19 §C; (c) cross-references to SPEC-20 / SPEC-22 ownership are present for the runtime / validator / engine-op deferral. The narrower-than-grep verification boundary applies because the value of this ticket is the structural shape of new prose-and-YAML documentation, not a binary symbol-presence check — `grep | wc -l` does not catch malformed sub-block schemas that match at the term level.
3. `grep -c "Schema transition note" .claude/skills/branching-story-page-cycle/SKILL.md` — must return `1`.

## Outcome

Completed 2026-05-07. `.claude/skills/branching-story-page-cycle/references/record-schemas.md` now documents SPEC-19 CHC v2 fields with `record_version: 2`, `choice_kind`, `commitment_class`, `strategy_cluster`, the five-field `choice_worthiness` block, preserved v1 `choice_contract` / `continuation_capacity` blocks, and mandatory non-empty `likely_effects` for `scene_commitment` choices.

The same reference now documents the new story-bundle-scoped ARC_TRACE record class with replay-non-authoritative semantics, storage path, allocation route, SPEC-20 / SPEC-22 ownership deferrals, every SPEC-19 §C sub-block, evidence-span requirements, and the Mystery Reserve safety taxonomy for `observed_claims[].canon_status`.

`.claude/skills/branching-story-page-cycle/SKILL.md` now contains a schema-transition note so operators can distinguish this landed SPEC-19 schema anchor from the still-deferred SPEC-20 operational runtime rewrite.

## Verification Result

Ran 2026-05-07:

1. `grep -E "record_version: 2|choice_kind:|commitment_class:|strategy_cluster:|choice_worthiness:" .claude/skills/branching-story-page-cycle/references/record-schemas.md` -> matched the CHC v2 heading plus all five target terms.
2. `grep -E "strategic_question_answered|strong_axes|expected_state_delta|why_not_microbeat|foreseeable_difference" .claude/skills/branching-story-page-cycle/references/record-schemas.md | wc -l` -> `5`.
3. `grep -E "MANDATORY|HARD-REJECT|choice_worthiness_completeness" .claude/skills/branching-story-page-cycle/references/record-schemas.md` -> matched the mandatory non-empty `likely_effects` line and validator HARD-REJECT prose.
4. `grep -E "ARC_TRACE|ARCTRACE-NNNN|arc_trace_record" .claude/skills/branching-story-page-cycle/references/record-schemas.md` -> matched the ARC_TRACE heading, storage/allocation prose, id skeleton, and `arc_trace_record` retrieval deferral.
5. `grep -E "realized_beats|observed_actions|observed_claims|possible_violations|stop_condition_hit|effect_evidence|semantic_critic_verdict" .claude/skills/branching-story-page-cycle/references/record-schemas.md | wc -l` -> `8`.
6. `grep -E "applied_effect_variant|non-authoritative for replay|effect_model.variants" .claude/skills/branching-story-page-cycle/references/record-schemas.md` -> matched replay-safety prose and `effect_variant_applied`.
7. `grep -E "(record_version: 2|choice_kind:|commitment_class:|strategy_cluster:|choice_worthiness:|ARC_TRACE|ARCTRACE-NNNN|realized_beats|observed_actions|observed_claims|possible_violations|stop_condition_hit|effect_evidence|semantic_critic_verdict|applied_effect_variant)" .claude/skills/branching-story-page-cycle/references/record-schemas.md | wc -l` -> `19`.
8. `grep -c "Schema transition note" .claude/skills/branching-story-page-cycle/SKILL.md` -> `1`.
9. Manual review of `.claude/skills/branching-story-page-cycle/references/record-schemas.md` confirmed the CHC v2 subsection is clearly demarcated from v1, ARC_TRACE has full SPEC-19 §C sub-block skeletons, replay equality is not attributed to ARC_TRACE persistence, and SPEC-20 / SPEC-22 deferrals are explicit.
10. Manual FOUNDATIONS alignment check against `docs/FOUNDATIONS.md` §Story Bundles §5 confirmed the schema preserves Rule 1 through required CHC v2 / ARC_TRACE structure and Rule 7 through `story_local | apparent | forbidden_risk` without adding a new resolution-authority class.

## Deviations

1. Reassessment added `.claude/skills/branching-story-page-cycle/SKILL.md` to the touched file set for a transition note. The full runtime phase rewrite remains SPEC-20 scope.
2. The ticket remains schema-text-only. No TypeScript types, validators, patch-engine ops, indexer support, MCP retrieval changes, runtime ARC_TRACE extraction, or v1 story migration were implemented here; those remain SPEC-20 / SPEC-22 scope as listed above.
