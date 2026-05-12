# STPOOL-003: Add `realization_target` to beat scaffolds in storylet-record.yaml

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: None — template/reference edits only; the field is already required by `tools/validators/src/schemas/story-storylet.schema.json`.
**Deps**: None (parallelizable with STPOOL-002; STPOOL-002 is already archived)

## Problem

At intake, the main beat scaffold and all three worked example arcs in `.claude/skills/storylet-pool-authoring/templates/storylet-record.yaml` omitted the `beat_plan.beats[].realization_target` field. The field is required by the engine schema:

- Main scaffold at `templates/storylet-record.yaml:188-199` shows beats with only `id`, `function`, `required`, `state_significance`.
- `fragile_offer` example (`:289-293`) — beats omit `realization_target`.
- `bounded_question` example (`:339-343`) — beats omit `realization_target`.
- `escalation_to_confrontation` example (`:388-392`) — beats omit `realization_target`.

At intake, `branching-story-bootstrap/references/phase-6-storylet-pool-seed.md` documented the validator requirement and still said the storylet template's beat examples omitted this field.

Before this ticket, records constructed by following the template would fail Phase 5b `record_schema_compliance` (the VALENH-002 engine-side backstop for Phase 4 gate 9 schema completeness, per `SKILL.md:268`).

This was uncovered by storylet-pool-authoring streamlining audit 2026-05-12 finding F-02.

## Assumption Reassessment (2026-05-12)

1. At intake, `templates/storylet-record.yaml` main scaffold, `fragile_offer`, `bounded_question`, and `escalation_to_confrontation` beat examples all omitted `realization_target`.
2. Verified bootstrap's reference at `branching-story-bootstrap/references/phase-6-storylet-pool-seed.md` documents the same requirement and cites the live JSON schema as the enforcement surface.
3. The field is open-vocab kebab-case — the template's job is to surface the field with representative values per beat, not to constrain its content.
4. FOUNDATIONS Rule 1 (No Floating Facts) per `references/governance-and-foundations.md` — storylet records require complete structural field sets; missing required sub-fields fails Rule 1 via gate 9.
5. Same-seam consumer prose in `storylet-pool-authoring/references/phase-3-structured-drafting.md` also describes the required `beat_plan` beat field set without `realization_target`; this ticket owns aligning that prompt-facing reference with the corrected template.
6. The bootstrap `phase-6-storylet-pool-seed.md` landmine note remains as a validator-alignment reminder but no longer claims the storylet template currently omits `realization_target`.

## Architecture Check

1. Additive-only template edit — corrects an omission rather than changing existing field semantics.
2. No backwards-compatibility consideration needed; in-tree storylets that already pass `record_schema_compliance` already carry the field.

## Verification Layers

1. **Template completeness** — every beat in the scaffold + every beat in every worked example carries `realization_target` → `grep -c 'realization_target:' .claude/skills/storylet-pool-authoring/templates/storylet-record.yaml` returns `16`.
2. **Value shape** — every corrected `realization_target:` value is kebab-case → the recorded `awk` proof exits 0.
3. **Live JSON schema agreement** — `tools/validators/src/schemas/story-storylet.schema.json` confirms `realization_target` is required on every `beat_plan.beats[]` entry → the recorded schema grep finds the required-field row.
4. **Same-seam prose alignment** — direct prompt/reference prose no longer omits the field or tells authors the template omits it → the recorded stale-anchor `rg` returns no hits.

## Landed Changes

### 1. Add `realization_target` to the main beat scaffold

The main `beat_plan.beats[]` scaffold now includes `realization_target` on B1, B2, and B3:

```yaml
beats:                                   # 3-8 entries
  - id: B1
    function: <beat_function string>     # open-vocab kebab-case
    realization_target: realizes-initial-scene-movement # REQUIRED; open-vocab kebab-case scene movement this beat realizes
    required: true
    state_significance: none             # none | <strong_axis enum>
```

B2 and B3 carry matching kebab-case exemplar values.

### 2. Add `realization_target` to every example arc's beats

Each example arc (`fragile_offer`, `bounded_question`, `escalation_to_confrontation`) now carries `realization_target` on every beat with a representative kebab-case value that matches the beat's `function` semantics. Example from `fragile_offer`:

```yaml
- {id: B1, function: pressure-setup, realization_target: realizes-need-being-named, required: true, state_significance: obligation_state}
- {id: B2, function: offer-extended, realization_target: realizes-help-being-offered, required: true, state_significance: relationship_trajectory}
- {id: B3, function: response-received, realization_target: realizes-recipient-decision, required: true, state_significance: obligation_state}
- {id: B4, function: aftermath-marked, realization_target: realizes-cost-residue, required: false, state_significance: none}
```

The other two example arcs use analogous `realizes-<verb-phrase>` shapes.

### 3. Align direct beat-field prose consumers

The Phase 3 structured-drafting reference now includes `realization_target` in the required `beat_plan` field list. The bootstrap Phase 6 landmine note now says the storylet template's scaffold and examples include the field.

## Files to Touch

- `.claude/skills/storylet-pool-authoring/templates/storylet-record.yaml` (modify)
- `.claude/skills/storylet-pool-authoring/references/phase-3-structured-drafting.md` (modify)
- `.claude/skills/branching-story-bootstrap/references/phase-6-storylet-pool-seed.md` (modify)
- `docs/triage/2026-05-12-storylet-pool-authoring-audit-triage.md` (modify, closeout status row only)
- `archive/tickets/STPOOL-003-add-realization-target-to-beat-scaffolds.md` (modify, closeout)

## Out of Scope

- Documenting the realization_target field's authoring semantics beyond a brief inline comment (a deeper reference doc would be valuable but is its own ticket).
- Auditing in-tree storylet records — `record_schema_compliance` would have rejected them at submit time if the field were missing, so existing records already comply.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -c 'realization_target:' .claude/skills/storylet-pool-authoring/templates/storylet-record.yaml` returns `16` (3 scaffold beats + 4 fragile_offer + 4 bounded_question + 5 escalation beats).
2. `awk '/realization_target:/ { line=$0; sub(/^.*realization_target:[[:space:]]*/, "", line); sub(/[[:space:],#].*$/, "", line); if (line !~ /^[a-z][a-z0-9-]*[a-z0-9]$/) { print FNR ":" line; bad=1 } } END { exit bad }' .claude/skills/storylet-pool-authoring/templates/storylet-record.yaml` exits 0.
3. `grep -n '"required": \["id", "function", "required", "state_significance", "realization_target"\]' tools/validators/src/schemas/story-storylet.schema.json` returns the schema required-field row.

### Invariants

1. Every beat in `templates/storylet-record.yaml` (scaffold + examples) carries `realization_target` with an open-vocab kebab-case value.
2. `tools/validators/src/schemas/story-storylet.schema.json` requires the same field on every beat (no schema change implied).
3. Direct prompt/reference prose that enumerates the required beat field set includes `realization_target` and no longer tells bootstrap authors the template omits it.

## Test Plan

### New/Modified Tests

1. None — skill-template/reference edit; existing validator coverage at `tools/validators/` is the runtime backstop.

### Commands

1. `grep -c 'realization_target:' .claude/skills/storylet-pool-authoring/templates/storylet-record.yaml`
2. `awk '/realization_target:/ { line=$0; sub(/^.*realization_target:[[:space:]]*/, "", line); sub(/[[:space:],#].*$/, "", line); if (line !~ /^[a-z][a-z0-9-]*[a-z0-9]$/) { print FNR ":" line; bad=1 } } END { exit bad }' .claude/skills/storylet-pool-authoring/templates/storylet-record.yaml`
3. `grep -n '"required": \["id", "function", "required", "state_significance", "realization_target"\]' tools/validators/src/schemas/story-storylet.schema.json`
4. `rg -n 'function/required/state_significance|beat examples omit|examples omit this field|Main beat scaffold and all three example arcs omit|Records following the template will fail' .claude/skills/storylet-pool-authoring .claude/skills/branching-story-bootstrap docs/triage/2026-05-12-storylet-pool-authoring-audit-triage.md`

## Outcome

Completed 2026-05-12. `.claude/skills/storylet-pool-authoring/templates/storylet-record.yaml` now includes `beat_plan.beats[].realization_target` on all 16 scaffold/worked-example beats. The Phase 3 drafting reference and bootstrap Phase 6 landmine note now match the corrected template and the validator-required beat field set. The triage row marks STPOOL-003 completed and archived.

## Verification Result

1. `grep -c 'realization_target:' .claude/skills/storylet-pool-authoring/templates/storylet-record.yaml` -> `16`.
2. `awk '/realization_target:/ { line=$0; sub(/^.*realization_target:[[:space:]]*/, "", line); sub(/[[:space:],#].*$/, "", line); if (line !~ /^[a-z][a-z0-9-]*[a-z0-9]$/) { print FNR ":" line; bad=1 } } END { exit bad }' .claude/skills/storylet-pool-authoring/templates/storylet-record.yaml` -> no output, exit 0.
3. `grep -n '"required": \["id", "function", "required", "state_significance", "realization_target"\]' tools/validators/src/schemas/story-storylet.schema.json` -> required-field row found.
4. `rg -n 'function/required/state_significance|beat examples omit|examples omit this field|Main beat scaffold and all three example arcs omit|Records following the template will fail' .claude/skills/storylet-pool-authoring .claude/skills/branching-story-bootstrap docs/triage/2026-05-12-storylet-pool-authoring-audit-triage.md` -> no stale same-seam hits after the triage row update.

## Deviations

- Replaced the drafted `grep -A2 "^\s*- id: B[1-9]" ...` proof because it only matches uncommented scaffold beats and misses the commented worked examples. The landed proof counts all `realization_target:` lines directly.
- Widened the file set to include the Phase 3 drafting reference, the bootstrap Phase 6 reference, and the triage status row because reassessment found same-seam prose that would otherwise remain stale after the template correction.
