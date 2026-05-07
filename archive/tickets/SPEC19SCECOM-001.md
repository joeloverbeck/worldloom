# SPEC19SCECOM-001: SLT v2 schema in storylet-record.yaml

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — modifies `storylet-pool-authoring` skill template (`templates/storylet-record.yaml`): replaces v1 SLT envelope with v2 (record_version discriminant, narrowed shape, 7 new structural blocks, choice_templates removed). Adds a narrow transition note to `storylet-pool-authoring/SKILL.md` so the live skill does not silently present the v2 template as a fully-landed authoring rewrite. No impact on `branching-story-page-cycle`'s Phase 4 reader at the field-name level — the v2 envelope is a superset of v1's preserved fields.
**Deps**: None — schema-text-only ticket; runtime / validator / authoring consumers land in SPEC-20 / SPEC-21 / SPEC-22.

## Problem

At intake, the current SLT (storylet) record template treated a storylet as a single beat (`shape: entry_pressure | cast_introduction | …`), which forced `branching-story-page-cycle` Phase 8 to manufacture agency every 500–1500 words whether or not the story had reached a meaningful hinge. Empirical evidence from the test story bundle at `worlds/erotica-world/stories/red-bunny/` (40 CHC across 8 PG records as of 2026-05-07; 40/40 with empty `likely_effects`; majority `success_policy: guaranteed`; minimum_state_change includes `intention` on ~28/30 records — see SPEC-19 §Problem Statement) confirmed the pacing pathology.

The SPEC-19 structural fix was to **redefine the storylet as a scene-commitment arc** — a multi-beat dramatic unit that plays out one selected commitment from activation to natural close — and to make the storylet template encode the arc-shape contract directly. This ticket landed the foundation: replacing the v1 SLT template with the v2 schema (record_version: 2, shape: scene_commitment_arc, plus seven new structural blocks per SPEC-19 §A) so that downstream specs (SPEC-20 runtime, SPEC-21 authoring, SPEC-22 engine) can bind to the schema.

## Assumption Reassessment (2026-05-07)

1. **Current v1 envelope (verified at SPEC-19 reassessment 2026-05-07)**: `.claude/skills/storylet-pool-authoring/templates/storylet-record.yaml` (148 lines) carries the v1 envelope with fields `id, story_id, title, shape, content_intensity, hard_preconds, soft_preconds, cast_requirements, location_requirements, opens_obligations, pays_off_obligations, complicates_obligations, transfers_obligations, fact_effects, relationship_effects, tone_tags, theme_tags, tension_delta, aftermath_weight, mystery_safety, choice_templates, provenance, visibility, notes`. The v2 envelope per SPEC-19 §A preserves all these field names (the v1 fields "remain on the v2 record as field names") except `choice_templates`, which is MUST-omitted under v2 with HARD-REJECT semantics enforced by SPEC-22's `arc_schema_compliance` validator.
2. **SPEC-19 §A as authority for the v2 envelope**: the v2 envelope structure (record_version, narrowed shape, 7 new blocks: `arc_contract`, `dramatic_unit`, `beat_plan`, `execution_envelope`, `stop_policy`, `effect_model`, `exit_portfolio`) is fully specified in `archive/specs/SPEC-19-scene-commitment-arc-schema.md` §A. No drift between the spec text and this ticket's What to Change.
3. **Cross-skill shared boundary under audit**: `templates/storylet-record.yaml` has documented downstream-consumer parity with `branching-story-page-cycle` Phase 4 (per the file's own header comment, lines 9–14). The v2 envelope preserves every v1 field name the Phase 4 reader uses (`visibility`, `hard_preconds`, `soft_preconds`, `mystery_safety`, `M_resolution_claims`, `provenance`, `content_intensity`); Phase 4's bytes-compatible parity is preserved. Phase 4 will gain new arc-aware logic in SPEC-20, but THIS ticket does not break the existing reader.
4. **FOUNDATIONS principle under audit — Story Bundles §5 Rule 1 (No Floating Facts) at story scope**: the v2 envelope structurally enforces the "every storylet declares its commitment, scene-question, beat plan, execution envelope, stop policy, effect model, and exit portfolio" contract. Each new block has required sub-fields enumerated in SPEC-19 §A; missing fields → validator HARD-REJECT (validator owned by SPEC-22 Track 2). No Floating Facts at story scope is structurally upheld by the schema, not just discipline.
5. **Mystery Reserve firewall — preserved, not weakened**: the v2 `execution_envelope.mystery_preservation.forbidden_resolutions[]` block ADDS per-arc M-NNNN forbidden-status propagation across all beats inside the arc; it does NOT replace or modify the existing `mystery_safety` block (which retains `forbidden_M_resolved`, `M_touched`, `M_progressed`, `M_resolution_claims`, `resolution_safety_per_M`). The two layers are complementary: `mystery_safety` is the per-storylet declaration; `execution_envelope.mystery_preservation` is the per-arc render-time enforcement contract. Both compose; neither is weakened. FOUNDATIONS §Story Bundles §5 Rule 7 (Preserve Mystery Deliberately) is upheld.
6. **Schema extension shape — additive at the field-name level, narrowing at the shape-enum level**: at the field-name level the v2 envelope is a SUPERSET of v1 (every v1 field name except `choice_templates` is preserved). At the `shape:` enum level the v2 schema narrows the legal value to a single literal `scene_commitment_arc` (the v1 enum's 14 values — `entry_pressure`, `cast_introduction`, `threat_escalation`, `relational_dynamics`, `routine_disruption`, `aftermath_sequel`, `reflection_dilemma`, `mystery_edge_brush`, `fork_recovery`, `thread_resolution`, `aftermath_residue`, `intimacy`, `confrontation`, `other` — are retired). Consumers of the schema: `branching-story-page-cycle` Phase 4 reader (field-name parity preserved); SPEC-20's runtime arc-selection logic (will read v2-only); SPEC-22's `arc_schema_compliance` validator (will HARD-REJECT records missing v2 blocks). The cutover is forward-only — no v1 records survive (SPEC-22 §Migration discards `worlds/erotica-world/stories/red-bunny/`).
7. **Rename / removal blast radius — `shape:` enum values + `choice_templates`**: live reassessment found v1 storylet schema consumers in `tools/validators/src/schemas/story-storylet.schema.json`, `tools/validators/src/rules/rule_storylet_predicate_dsl_parsability.ts`, validator fixtures/tests, `tools/world-mcp` story-bundle filter examples/tests, and `storylet-pool-authoring` operational prose. This ticket still does not implement those runtime/validator updates: SPEC-22 owns validators and engine types; SPEC-20 owns page-cycle runtime behavior; SPEC-21 owns the full authoring-skill rewrite. The active ticket absorbs only the parent skill's minimal transition disclosure because `templates/storylet-record.yaml` is part of that skill and must not silently contradict its operator-facing status.
8. **Parent skill disclosure added as same-seam required fallout**: `.claude/skills/storylet-pool-authoring/SKILL.md` still describes v1 shape distribution, Phase 3 `choice_templates`, and v1 diversity gates. Fully rebinding those phases would be SPEC-21 work, but leaving no transition note after replacing the template would make the live skill misleading. This ticket therefore adds a short schema-transition note while leaving the operational rewrite out of scope.

## Architecture Check

1. **Schema-text-only scope is the cleanest decomposition**: SPEC-19 Tier-1 ships the contract text; engine implementation, runtime behavior, authoring rewrites, and migration land in SPEC-20 / SPEC-21 / SPEC-22. This ticket touches the SLT template plus one parent-skill transition disclosure and ships one logical change (v1 → v2 envelope replacement). Splitting further (e.g., one ticket per new block) would force artificial dependencies (single-file race) without gaining reviewability.
2. **No backwards-compatibility shim**: the cutover is forward-only. v1 records do not coexist with v2; SPEC-22 §Migration discards the test bundle. The template is replaced cleanly without dual-version fallback in the file itself. The "preserved as field names" v1 → v2 envelope-superset relationship is a parser-tolerance contract for consumers (branching-story-page-cycle Phase 4 won't crash on v2 records), not a runtime dual-version shim within the template.

## Verification Layers

1. **v2 envelope is field-name superset of v1 (except `choice_templates`)** → codebase grep-proof: every v1 field name (id, story_id, title, content_intensity, hard_preconds, soft_preconds, cast_requirements, location_requirements, opens_obligations, pays_off_obligations, complicates_obligations, transfers_obligations, fact_effects, relationship_effects, tone_tags, theme_tags, tension_delta, aftermath_weight, mystery_safety, provenance, visibility, notes) still present in the modified template.
2. **shape narrowed to single value** → codebase grep-proof: `^shape: scene_commitment_arc` present; no surviving v1 enum comment listing alternatives.
3. **choice_templates removed** → codebase grep-proof: `grep -c "^choice_templates:" .claude/skills/storylet-pool-authoring/templates/storylet-record.yaml` returns 0.
4. **7 new structural blocks present** → codebase grep-proof: each of `^arc_contract:`, `^dramatic_unit:`, `^beat_plan:`, `^execution_envelope:`, `^stop_policy:`, `^effect_model:`, `^exit_portfolio:` present.
5. **record_version discriminant present** → codebase grep-proof: `^record_version: 2` present.
6. **Mystery Reserve firewall preserved** → FOUNDATIONS alignment check: §Story Bundles §5 Rule 7 — the v2 template retains the existing `mystery_safety` block AND adds the new `execution_envelope.mystery_preservation` block; both are layers in a complementary contract, neither is removed. Manual review of the modified template confirms the dual-layer firewall.
7. **Validator-side enforcement deferred** → cross-spec: SPEC-22 Track 2 (`arc_schema_compliance` validator) is the runtime gate that HARD-REJECTs v2 SLTs missing required fields; this ticket only ships the schema text, not the gate.
8. **Operational skill rewrite deferred but disclosed** → manual review: `storylet-pool-authoring/SKILL.md` contains a schema-transition note naming SPEC-21 as owner of the full authoring-phase rewrite.

## Landed Changes

### 1. Updated header comment block to v2

Rewrote the file's leading comment to:
- Reference the v2 schema and `shape: scene_commitment_arc` discriminant
- List the v2 required structural fields: id, story_id, title, record_version, shape, content_intensity, hard_preconds, soft_preconds, cast_requirements, location_requirements, opens_obligations, pays_off_obligations, complicates_obligations, transfers_obligations, fact_effects, relationship_effects, tone_tags, theme_tags, tension_delta, aftermath_weight, mystery_safety (with all sub-fields), provenance (with all sub-fields), visibility (with scope + scoping fields), arc_contract, dramatic_unit, beat_plan, execution_envelope, stop_policy, effect_model, exit_portfolio
- Note that `choice_templates` is HARD-REJECTed under v2 (presence triggers `arc_schema_compliance` validator failure — owned by SPEC-22 Track 2)
- Update the "DOWNSTREAM CONSUMER PARITY" note to call out that v2 preserves all v1 field names the Phase 4 reader uses (visibility, hard_preconds, soft_preconds, mystery_safety, M_resolution_claims, provenance, content_intensity) AND adds the seven new arc-aware blocks consumed by SPEC-20's Phase 4 arc-selection logic

### 2. Added `record_version: 2` discriminant

Inserted immediately after the comment block, before `id:`:
```yaml
record_version: 2                          # v2 schema per SPEC-19 §A; legacy v1 retired
```

### 3. Narrowed `shape:` to single value

Replaced `shape: relational_dynamics                 # entry_pressure | cast_introduction | …` with:
```yaml
shape: scene_commitment_arc                # only legal value under v2 (see SPEC-19 §A); legacy enum retired
```

### 4. Added the seven new structural blocks per SPEC-19 §A

Inserted each block with sub-field skeleton + inline comments matching SPEC-19 §A's YAML examples after the existing `visibility:` block and before the closing `notes:` block. Each block includes:

- **`arc_contract`**: commitment_class, arc_archetype, actor, target, user_intent, strategic_question_answered, commitment_scope, success_policy, allowed_outcome_band
- **`dramatic_unit`**: scene_question, entry_pressure (thread + description), value_delta_target (relationship + thread_pressure + obligation + information_posture), natural_close_definition
- **`beat_plan`**: mode (`ordered_soft`), min_beats (2..6), max_beats (3..8), beats[] (3–8 entries with id, function, required, state_significance)
- **`execution_envelope`**: invariants[], required_functions[], allowed_tactics[], prohibited_actions[], style_directives[], mystery_preservation (forbidden_resolutions, allowed_claims)
- **`stop_policy`**: normal_exits[] (id + predicate + args), interrupt_before[] (id + predicate + args), safety_valves (max_internal_beats, max_words)
- **`effect_model`**: selected_before_render: true, variants[] (id, maps_to_outcome, probability_weight, required_effects[], forbidden_effects[])
- **`exit_portfolio`**: native_seeds[] (id, commitment_class, strategy_cluster, expected_state_delta, continuation_arc_selector with include_tags + require_arc_archetype), engine_discovered_exit_budget (min, max, allowed_sources)

Inline comments mirror SPEC-19 §A's authority annotations where the template skeleton has a corresponding field (e.g., `# closed enum — see canonical-vocabularies` for `commitment_class`; `# only supported value in v1; future modes may add branchy_dag` for `beat_plan.mode`).

### 5. Removed the `choice_templates:` block

Deleted the entire `choice_templates:` block and replaced it with a retirement comment:
```yaml
# choice_templates — REMOVED under v2. The runtime LLM proposer no longer reads choice scaffolds
# from SLT records; that role moves to exit_portfolio.native_seeds (see arc_contract above).
# Presence of choice_templates on a v2 record is HARD-REJECTed by SPEC-22's arc_schema_compliance.
```

### 6. Updated fact_effects + relationship_effects framing

The SPEC-19 §A semantics shift landed: `fact_effects` and `relationship_effects` are documented as **default per-arc effect packages** that map onto `effect_model.variants[]` rows at authoring time. The field blocks remain as-authored.

### 7. Added parent-skill transition note

Added a short note near the top of `.claude/skills/storylet-pool-authoring/SKILL.md` stating that `templates/storylet-record.yaml` has moved to SPEC-19 SLT v2, while the full operational authoring-phase rewrite is owned by SPEC-21. The v1 operational phases were not rewritten in this ticket.

## Files to Touch

- `.claude/skills/storylet-pool-authoring/templates/storylet-record.yaml` (modify)
- `.claude/skills/storylet-pool-authoring/SKILL.md` (modify — transition note only)

## Out of Scope

- TypeScript implementation of SLT v2 record type (owned by SPEC-22 Track 3)
- Migration of existing v1 SLT records — including discard of `worlds/erotica-world/stories/red-bunny/` (owned by SPEC-22 Track 5)
- Validators (`arc_schema_compliance`, `effect_model_legality`, `effect_model_replay_safety`) (owned by SPEC-22 Track 2)
- Authoring-skill rewrites that emit v2 SLTs (owned by SPEC-21)
- Runtime page-cycle Phase 4 arc-selection / Phase 4b effect-variant-selection / Phase 5 arc-level effect application (owned by SPEC-20)
- `arc-archetypes.md` library content (owned by SPEC-21 §G)
- PG schema extension for `state_snapshot.applied_effect_variant`, `arc_trace_id`, `arc_trace_emitted` (owned by SPEC-20 §Phase 4b + SPEC-22 §Track 4)
- `branching-story-page-cycle` Phase 8 rewrite from agency-generator to choice-surface validator (owned by SPEC-20)
- CHC v2 schema (owned by ticket SPEC19SCECOM-002 in this batch)
- ARC_TRACE record class documentation (owned by ticket SPEC19SCECOM-002 in this batch)
- Stop-predicate DSL grammar text (owned by ticket SPEC19SCECOM-003 in this batch)
- Full `storylet-pool-authoring` operational rewrite from v1 beat-storylets to v2 scene-commitment arcs (owned by SPEC-21); this ticket only adds a transition disclosure.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -c "^record_version: 2" .claude/skills/storylet-pool-authoring/templates/storylet-record.yaml` returns `1`.
2. `grep -c "^shape: scene_commitment_arc" .claude/skills/storylet-pool-authoring/templates/storylet-record.yaml` returns `1` AND `grep -c "shape: relational_dynamics" .claude/skills/storylet-pool-authoring/templates/storylet-record.yaml` returns `0` (legacy enum example value gone).
3. `grep -E "^(arc_contract|dramatic_unit|beat_plan|execution_envelope|stop_policy|effect_model|exit_portfolio):" .claude/skills/storylet-pool-authoring/templates/storylet-record.yaml | wc -l` returns `7`.
4. `grep -c "^choice_templates:" .claude/skills/storylet-pool-authoring/templates/storylet-record.yaml` returns `0`.
5. `grep -E "^(id|story_id|title|content_intensity|hard_preconds|soft_preconds|cast_requirements|location_requirements|opens_obligations|pays_off_obligations|complicates_obligations|transfers_obligations|fact_effects|relationship_effects|tone_tags|theme_tags|tension_delta|aftermath_weight|mystery_safety|provenance|visibility|notes):" .claude/skills/storylet-pool-authoring/templates/storylet-record.yaml | wc -l` returns `22` (all v1 field names preserved at the top-level field-name level).
6. `grep -c "Schema transition note" .claude/skills/storylet-pool-authoring/SKILL.md` returns `1`.

### Invariants

1. v2 envelope is a field-name superset of v1 except for `choice_templates` (the only field name removed); every other v1 field name remains addressable so `branching-story-page-cycle` Phase 4's reader continues to parse v2 records without modification.
2. Mystery Reserve firewall is preserved across both layers: per-storylet declaration via `mystery_safety` (unchanged) AND per-arc render-time enforcement via `execution_envelope.mystery_preservation.forbidden_resolutions[]` (new). FOUNDATIONS §Story Bundles §5 Rule 7 is structurally upheld by the schema, not just discipline.
3. The cutover is forward-only: no v1 records coexist with v2; the cutover is enforced at SPEC-22 Track 5 (test-bundle discard), not via in-template dual-version logic.

## Test Plan

### New/Modified Tests

1. `None — schema-authoring ticket; verification is grep-based against the modified template file. Validator-side test coverage is owned by SPEC-22 Track 2 (`arc_schema_compliance` HARD-REJECT semantics for v2 records missing required blocks); runtime parse coverage is owned by SPEC-20's Phase 4 arc-selection tests; authoring-skill emission coverage is owned by SPEC-21's storylet-pool-authoring Phase 4 gate tests.`

### Commands

1. `grep -E "^(record_version: 2|shape: scene_commitment_arc|arc_contract:|dramatic_unit:|beat_plan:|execution_envelope:|stop_policy:|effect_model:|exit_portfolio:)" .claude/skills/storylet-pool-authoring/templates/storylet-record.yaml | wc -l` — must return `9` (record_version + shape + 7 new blocks).
2. `grep -c "^choice_templates:" .claude/skills/storylet-pool-authoring/templates/storylet-record.yaml` — must return `0`.
3. `grep -c "Schema transition note" .claude/skills/storylet-pool-authoring/SKILL.md` — must return `1`.
4. Read the modified template end-to-end and confirm by inspection: (a) the seven new blocks have full sub-field skeletons matching SPEC-19 §A; (b) the header comment references v2 and lists the v2 required-fields set; (c) the `choice_templates:` block is replaced by a retirement comment naming SPEC-22's `arc_schema_compliance` HARD-REJECT. The narrower-than-grep verification boundary applies because the value of this ticket is the structural shape of new YAML content, not a binary symbol-presence check — `wc -l` does not catch malformed sub-field skeletons that grep matches at the block-name level.

## Outcome

Completed 2026-05-07. `.claude/skills/storylet-pool-authoring/templates/storylet-record.yaml` now declares SPEC-19 SLT v2 with `record_version: 2`, `shape: scene_commitment_arc`, the seven scene-commitment-arc structural blocks, preserved v1 top-level field names except `choice_templates`, and dual-layer Mystery Reserve protection through `mystery_safety` plus `execution_envelope.mystery_preservation`.

`.claude/skills/storylet-pool-authoring/SKILL.md` now contains a schema-transition note so operators can distinguish this landed v2 template from the still-deferred SPEC-21 operational authoring rewrite.

## Verification Result

Ran 2026-05-07:

1. `grep -c '^record_version: 2' .claude/skills/storylet-pool-authoring/templates/storylet-record.yaml` → `1`.
2. `grep -c '^shape: scene_commitment_arc' .claude/skills/storylet-pool-authoring/templates/storylet-record.yaml` → `1`.
3. `grep -c 'shape: relational_dynamics' .claude/skills/storylet-pool-authoring/templates/storylet-record.yaml` → `0` output (grep exits 1 on zero matches).
4. `grep -E '^(arc_contract|dramatic_unit|beat_plan|execution_envelope|stop_policy|effect_model|exit_portfolio):' .claude/skills/storylet-pool-authoring/templates/storylet-record.yaml | wc -l` → `7`.
5. `grep -c '^choice_templates:' .claude/skills/storylet-pool-authoring/templates/storylet-record.yaml` → `0` output (grep exits 1 on zero matches).
6. `grep -E '^(id|story_id|title|content_intensity|hard_preconds|soft_preconds|cast_requirements|location_requirements|opens_obligations|pays_off_obligations|complicates_obligations|transfers_obligations|fact_effects|relationship_effects|tone_tags|theme_tags|tension_delta|aftermath_weight|mystery_safety|provenance|visibility|notes):' .claude/skills/storylet-pool-authoring/templates/storylet-record.yaml | wc -l` → `22`.
7. `grep -c 'Schema transition note' .claude/skills/storylet-pool-authoring/SKILL.md` → `1`.
8. `grep -E '^(record_version: 2|shape: scene_commitment_arc|arc_contract:|dramatic_unit:|beat_plan:|execution_envelope:|stop_policy:|effect_model:|exit_portfolio:)' .claude/skills/storylet-pool-authoring/templates/storylet-record.yaml | wc -l` → `9`.
9. Manual review of the modified template confirmed the seven SPEC-19 §A blocks, v2 header, `choice_templates` retirement comment, preserved `mystery_safety`, and new `execution_envelope.mystery_preservation`.
10. `git add -N tickets/SPEC19SCECOM-001.md` followed by `git diff --check -- .claude/skills/storylet-pool-authoring/templates/storylet-record.yaml .claude/skills/storylet-pool-authoring/SKILL.md tickets/SPEC19SCECOM-001.md` → pass; intent-to-add marker cleared with `git reset -- tickets/SPEC19SCECOM-001.md`.

## Deviations

1. Reassessment found live v1 validator and MCP example/test consumers (`tools/validators/*`, `tools/world-mcp/*`) despite the initial ticket saying there were no production-code consumers of the v1 enum values. Those changes remain deferred to SPEC-22 and are intentionally not edited here.
2. Reassessment found parent `storylet-pool-authoring` operational prose still describing v1 authoring phases. A narrow transition note was added in this ticket; the full operational rewrite remains SPEC-21 scope.
3. The drafted combined grep proof command was corrected because its colon placement counted only the seven block labels, not `record_version` or `shape`. The landed `Test Plan` records the corrected command that returns `9`.
