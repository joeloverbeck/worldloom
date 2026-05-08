# SPEC21SCECOM-002: Storylet-record.yaml v2 usage examples per archetype

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — comment-only additions to `.claude/skills/storylet-pool-authoring/templates/storylet-record.yaml`; no schema-structural changes
**Deps**: `archive/tickets/SPEC21SCECOM-001.md` (uses archetype names from the new arc-archetypes.md library)

## Problem

At intake, `templates/storylet-record.yaml` had already been updated to v2 schema (record_version: 2; shape: scene_commitment_arc) by archived SPEC-19, but the template's inline comments documented field shapes generically without per-archetype usage examples. Authors filling the v2 template by hand or reading it as a reference got the structural skeleton but no concrete examples of how `arc_contract`, `dramatic_unit`, `beat_plan`, `execution_envelope`, `stop_policy`, `effect_model`, and `exit_portfolio` fields look when populated for specific archetypes (e.g., what does `effect_model.variants[]` look like for a `fragile_offer` arc vs. an `escalation_to_confrontation` arc?). Per SPEC-21 §Deliverables row 7, the spec called for adding usage examples for v2 fields per archetype.

## Assumption Reassessment (2026-05-08)

1. The current template at `.claude/skills/storylet-pool-authoring/templates/storylet-record.yaml` (verified during SPEC-21 reassessment 2026-05-08) is v2 (`record_version: 2`, `shape: scene_commitment_arc`) with all seven structural blocks present (arc_contract, dramatic_unit, beat_plan, execution_envelope, stop_policy, effect_model, exit_portfolio) per archived SPEC-19 §A. The structural fields are already in place; this ticket adds usage examples only.
2. Archetype names referenced in usage examples MUST match the 20 archetype names landed by SPEC21SCECOM-001 in `templates/arc-archetypes.md` (which in turn match SPEC-22 §Track 3 ARC_ARCHETYPES enum). Three archetypes selected for example coverage SHOULD span the range of the 20 — recommend `fragile_offer` (offer/help shape), `bounded_question` (information/disclosure shape), and `escalation_to_confrontation` (pressure/conflict shape).
3. Cross-skill boundary under audit: this template is consumed by Phase 3 (Structured Drafting) as the v2 SLT scaffold and by Phase 4 gate 9 (Schema completeness) for structural-field validation. The shared boundary is the field-name surface — SPEC-22's `arc_schema_compliance` validator (Track 2) HARD-REJECTs SLTs missing any of the seven new structural blocks; usage examples must NOT alter the existing field set, only annotate it with per-archetype content.

## Architecture Check

1. Inline comments are the natural authoring-quality lift here — readers of the template see usage context without leaving the file. The alternative (separate `templates/storylet-record-examples.yaml`) duplicates the schema and creates drift risk between the canonical template and the examples; inline comments avoid that.
2. No backwards-compatibility shims — comment-only additions; no field renames, no removed fields, no aliasing.

## Verification Layers

1. Schema-fidelity invariant → schema validation: re-running SPEC-22's `arc_schema_compliance` validator (once SPEC-22 lands) on a sample SLT generated from the template MUST still PASS — no field renames or removals introduced. Pre-SPEC-22 spot check: `grep -E "^(record_version|id|story_id|title|shape|content_intensity|hard_preconds|soft_preconds|cast_requirements|location_requirements|opens_obligations|pays_off_obligations|complicates_obligations|transfers_obligations|fact_effects|relationship_effects|tone_tags|theme_tags|tension_delta|aftermath_weight|mystery_safety|provenance|visibility|arc_contract|dramatic_unit|beat_plan|execution_envelope|stop_policy|effect_model|exit_portfolio|notes):" templates/storylet-record.yaml` returns the same set as before this edit.
2. Archetype-name validity invariant → cross-reference against SPEC21SCECOM-001's `templates/arc-archetypes.md`: every archetype name cited in a usage example must appear as a `## ` heading in the archetype library.

## Landed Changes

### 1. Appended per-archetype usage example comments to `templates/storylet-record.yaml`

After the current inline schema comments, added 3 worked-example comment blocks (one per representative archetype) showing populated-field examples for the three archetypes named in Assumption Reassessment item 2:

- `# Example — fragile_offer archetype:` — shows populated `arc_contract` (commitment_class: offer_practical_help; arc_archetype: fragile_offer; user_intent + strategic_question_answered for an offer arc), `dramatic_unit.scene_question` ("Will the offer be accepted, refused, or deflected?"), `beat_plan` (3-4 beats: pressure_setup → offer_extended → response_received → aftermath), `execution_envelope.invariants` (e.g., `respect-refusal-without-pressure`), `stop_policy.normal_exits` (commitment_satisfied / commitment_blocked / participant_exits), `effect_model.variants` (1-3 variants per success_policy: contested), `exit_portfolio.native_seeds` (3 seeds spanning accepted-help / refused-with-grace / deflected-by-third-party).
- `# Example — bounded_question archetype:` — shows a populated information-posture arc example.
- `# Example — escalation_to_confrontation archetype:` — shows a populated pressure-axis arc example.

Each example block is comment-only (no actual YAML keys at file root level — the current template remains one canonical record skeleton, not multiple records). The append added 150 lines.

## Files to Touch

- `.claude/skills/storylet-pool-authoring/templates/storylet-record.yaml` (modify — append per-archetype example blocks as comments)

## Out of Scope

- Schema-structural changes (owned by archived SPEC-19; the v2 schema is locked)
- Adding more than 3 representative examples (open-ended expansion is out of scope; 3 archetypes spanning offer / information / pressure is sufficient coverage per SPEC-21 §Deliverables row 7)
- Updating `references/phase-3-structured-drafting.md` to reference these examples (owned by SPEC21SCECOM-005)

## Acceptance Criteria

### Tests That Must Pass

1. `grep "^# Example — " .claude/skills/storylet-pool-authoring/templates/storylet-record.yaml` returns exactly 3 lines (one per representative archetype)
2. Every archetype name in the example headings appears as a `## ` heading in `.claude/skills/storylet-pool-authoring/templates/arc-archetypes.md` (cross-reference check)
3. The pre-existing top-level field set remains unchanged: `grep -E "^[a-z_]+:" .claude/skills/storylet-pool-authoring/templates/storylet-record.yaml` returns the same field list as before this edit (no fields added, removed, or renamed at the canonical-record level)

### Invariants

1. Usage examples are comment-only (lines beginning with `#`); no canonical-record YAML structure is altered
2. Every archetype cited in an example is in the closed ARC_ARCHETYPES enum (verified via cross-reference to SPEC21SCECOM-001's library)

## Test Plan

### New/Modified Tests

1. None — documentation-only ticket; verification is grep-based per Acceptance Criteria above.

### Commands

1. `grep "^# Example — " .claude/skills/storylet-pool-authoring/templates/storylet-record.yaml | wc -l` (expect 3)
2. `wc -l .claude/skills/storylet-pool-authoring/templates/storylet-record.yaml` (expect 417 lines; pre-edit 267 lines + 150-line append)
3. `diff <(git show HEAD:.claude/skills/storylet-pool-authoring/templates/storylet-record.yaml | grep -E "^[a-z_]+:" | sort) <(grep -E "^[a-z_]+:" .claude/skills/storylet-pool-authoring/templates/storylet-record.yaml | sort)` (expect no diff — top-level field set unchanged)
4. `for name in fragile_offer bounded_question escalation_to_confrontation; do grep -q "^## $name$" .claude/skills/storylet-pool-authoring/templates/arc-archetypes.md && printf '%s ok\n' "$name"; done` (expect all 3 ok)

## Outcome

Completed 2026-05-08. Added comment-only worked examples for `fragile_offer`, `bounded_question`, and `escalation_to_confrontation` to `.claude/skills/storylet-pool-authoring/templates/storylet-record.yaml`. The examples cover `arc_contract`, `dramatic_unit`, `beat_plan`, `execution_envelope`, `stop_policy`, `effect_model`, and `exit_portfolio` usage without adding, removing, or renaming any canonical top-level YAML field.

## Verification Result

1. `grep '^# Example — ' .claude/skills/storylet-pool-authoring/templates/storylet-record.yaml | wc -l` -> 3.
2. `wc -l .claude/skills/storylet-pool-authoring/templates/storylet-record.yaml` -> 417 lines, exactly 150 lines over the pre-edit 267-line template.
3. `awk 'BEGIN{seen=0; bad=0} /^# Example — /{seen=1} seen && NF && $0 !~ /^#/{print NR ":" $0; bad=1} END{exit bad}' .claude/skills/storylet-pool-authoring/templates/storylet-record.yaml` -> no output, exit 0; all nonblank example lines are comments.
4. `diff <(git show HEAD:.claude/skills/storylet-pool-authoring/templates/storylet-record.yaml | grep -E '^[a-z_]+:' | sort) <(grep -E '^[a-z_]+:' .claude/skills/storylet-pool-authoring/templates/storylet-record.yaml | sort)` -> no diff; top-level field set unchanged.
5. `for name in fragile_offer bounded_question escalation_to_confrontation; do grep -q "^## $name$" .claude/skills/storylet-pool-authoring/templates/arc-archetypes.md && printf '%s ok\n' "$name"; done` -> all 3 archetype headings found.

## Deviations

- None. The implementation stayed bounded to comment-only examples in `storylet-record.yaml`; sibling phase rewrites remain active follow-up work.
