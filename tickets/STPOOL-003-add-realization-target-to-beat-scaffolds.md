# STPOOL-003: Add `realization_target` to beat scaffolds in storylet-record.yaml

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: None — template edit only; the field is already required by `tools/validators/src/schemas/story-storylet.schema.json`.
**Deps**: None (parallelizable with STPOOL-002)

## Problem

The main beat scaffold and all three worked example arcs in `.claude/skills/storylet-pool-authoring/templates/storylet-record.yaml` omit the `beat_plan.beats[].realization_target` field. The field is required by the engine schema:

- Main scaffold at `templates/storylet-record.yaml:188-199` shows beats with only `id`, `function`, `required`, `state_significance`.
- `fragile_offer` example (`:289-293`) — beats omit `realization_target`.
- `bounded_question` example (`:339-343`) — beats omit `realization_target`.
- `escalation_to_confrontation` example (`:388-392`) — beats omit `realization_target`.

Per `branching-story-bootstrap/references/phase-6-storylet-pool-seed.md:78`: *"`beat_plan.beats[].realization_target` is REQUIRED (open-vocab string; describes what scene-movement the beat realizes — typically a kebab-case phrase like `realizes-question-framed-as-scene-movement`). The storylet template's beat examples omit this field; the JSON schema at `tools/validators/src/schemas/story-storylet.schema.json` requires it on every beat."*

Records constructed by following the template will fail Phase 5b `record_schema_compliance` (the VALENH-002 engine-side backstop for Phase 4 gate 9 schema completeness, per `SKILL.md:268`).

This was uncovered by storylet-pool-authoring streamlining audit 2026-05-12 finding F-02.

## Assumption Reassessment (2026-05-12)

1. Verified `templates/storylet-record.yaml:188-199` (main scaffold), `:289-293` (fragile_offer beats), `:339-343` (bounded_question beats), and `:388-392` (escalation_to_confrontation beats) all omit `realization_target`.
2. Verified bootstrap's reference at `branching-story-bootstrap/references/phase-6-storylet-pool-seed.md:78` is the authoritative documentation of this requirement and cites the live JSON schema as the enforcement surface.
3. The field is open-vocab kebab-case — the template's job is to surface the field with a placeholder + a representative example value per beat, not to constrain its content.
4. FOUNDATIONS Rule 1 (No Floating Facts) per `references/governance-and-foundations.md` — storylet records require complete structural field sets; missing required sub-fields fails Rule 1 via gate 9.

## Architecture Check

1. Additive-only template edit — corrects an omission rather than changing existing field semantics.
2. No backwards-compatibility consideration needed; in-tree storylets that already pass `record_schema_compliance` already carry the field.

## Verification Layers

1. **Template completeness** — every beat in the scaffold + every beat in every worked example carries `realization_target` → `grep -A1 "function:" templates/storylet-record.yaml` shows the field present alongside `function:`.
2. **Live JSON schema agreement** — `tools/validators/src/schemas/story-storylet.schema.json` confirms `realization_target` is required on every `beat_plan.beats[]` entry → grep the JSON schema for `"realization_target"` and `"required"` co-occurrence.

## What to Change

### 1. Add `realization_target` to the main beat scaffold

In `templates/storylet-record.yaml:188-199`, extend each beat entry to include `realization_target`:

```yaml
beats:                                   # 3-8 entries
  - id: B1
    function: <beat_function string>     # open-vocab kebab-case
    realization_target: <kebab-case>     # open-vocab; describes the scene-movement this beat realizes (e.g., realizes-question-framed-as-scene-movement)
    required: true
    state_significance: none             # none | <strong_axis enum>
```

Apply the same shape to B2 and B3.

### 2. Add `realization_target` to every example arc's beats

For each example arc (`fragile_offer` lines 289-293, `bounded_question` lines 339-343, `escalation_to_confrontation` lines 388-392), add `realization_target` to every beat with a representative kebab-case value that matches the beat's `function` semantics. Example for `fragile_offer`:

```yaml
- {id: B1, function: pressure-setup, realization_target: realizes-need-being-named, required: true, state_significance: obligation_state}
- {id: B2, function: offer-extended, realization_target: realizes-help-being-offered, required: true, state_significance: relationship_trajectory}
- {id: B3, function: response-received, realization_target: realizes-recipient-decision, required: true, state_significance: obligation_state}
- {id: B4, function: aftermath-marked, realization_target: realizes-cost-residue, required: false, state_significance: none}
```

Use analogous `realizes-<verb-phrase>` shapes for the other two example arcs.

## Files to Touch

- `.claude/skills/storylet-pool-authoring/templates/storylet-record.yaml` (modify)

## Out of Scope

- Documenting the realization_target field's authoring semantics beyond a brief inline comment (a deeper reference doc would be valuable but is its own ticket).
- Auditing in-tree storylet records — `record_schema_compliance` would have rejected them at submit time if the field were missing, so existing records already comply.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -A2 "^\s*- id: B[1-9]" .claude/skills/storylet-pool-authoring/templates/storylet-record.yaml | grep -c "realization_target:"` returns a count equal to the total beat entries in scaffold + examples (≥13 beats: 3 in scaffold + 4 fragile_offer + 4 bounded_question + 4-5 escalation).
2. Every `realization_target:` value in the corrected template is kebab-case (matches `^[a-z][a-z0-9-]*[a-z0-9]$`).

### Invariants

1. Every beat in `templates/storylet-record.yaml` (scaffold + examples) carries `realization_target` with an open-vocab kebab-case value.
2. `tools/validators/src/schemas/story-storylet.schema.json` requires the same field on every beat (no schema change implied).

## Test Plan

### New/Modified Tests

1. None — template-only edit; existing validator coverage at `tools/validators/` is the runtime backstop.

### Commands

1. `grep -B1 -A4 'beats:' .claude/skills/storylet-pool-authoring/templates/storylet-record.yaml | head -80` — visual confirmation every beat block includes `realization_target`.
2. The next `storylet-pool-authoring` invocation's Phase 5b validate-patch-plan run is the integration test; success means `record_schema_compliance` PASSes for the generated SLT records.
