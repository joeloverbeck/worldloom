# SPEC25STOCOHHAR-005: urgency on OBL and CNSQ

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — modifies `tools/validators/src/schemas/story-obligation.schema.json`, `tools/validators/src/schemas/story-consequence.schema.json`; amends `.claude/skills/_shared-templates/story-state-contract.md` (§4.5.4, §4.5.5); modifies `branching-story-bootstrap`, `branching-story-turn-cycle`, `branching-story-health-audit`, `commitment-block-authoring`.
**Deps**: None

## Problem

Gate 6 (terminal proof) reasons about "high-salience debts." Debts are open `OBL` / `CNSQ` / `THR`. `THR` carries `urgency`, `STINT` carries `urgency`, `SLT` carries `saliency.urgency` — but `OBL` and `CNSQ` do not. Gate 6 cannot evaluate debt salience uniformly across the debt-bearing classes, and SPEC25STOCOHHAR-006's existential predicates (`any_obligation_open`, `any_consequence_pending`) need an `urgency?` argument to filter on. This ticket adds `urgency` to `OBL` and `CNSQ`.

## Assumption Reassessment (2026-05-14)

1. Contract §4.5.4 `OBL` and §4.5.5 `CNSQ` have no `urgency` field, and `tools/validators/src/schemas/story-obligation.schema.json` / `story-consequence.schema.json` mirror that absence. `THR` already carries `urgency` (referenced by SPEC-25 D3 and the contract §4.5.6 schema).
2. SPEC-25 D3 prescribes `urgency: low | medium | high*` (required) on both `OBL` and `CNSQ`. `tags` is explicitly **not** added — `obligation_kind` / `consequence_kind` already serve categorization.
3. Cross-skill boundary under audit: the `OBL` / `CNSQ` schemas (contract §4.5.4 / §4.5.5 ↔ the two JSON schema files) consumed by `branching-story-bootstrap` / `branching-story-turn-cycle` (write side), `branching-story-health-audit` Gate 6 / debt-threshold checks (read side), and SPEC25STOCOHHAR-006's existential predicates (`any_obligation_open` / `any_consequence_pending` carry an `urgency?` argument).
4. FOUNDATIONS §Story Bundles §5b (Schema-Minimalism At Story Scope): restated before trusting the spec — `urgency` is load-bearing because it is directly consumed by Gate 6's debt-salience reasoning and by the SPEC25STOCOHHAR-006 existential predicates; `tags` is correctly dropped because it would duplicate the open-vocabulary `obligation_kind` / `consequence_kind` categorizers.
5. Schema extension: `story-obligation.schema.json` and `story-consequence.schema.json` are extended. Consumers — the four skills above plus `record_schema_compliance`. The extension is a **required** field on each; greenfield (zero production story bundles per SPEC-25 §Problem), so no existing-record migration cost. The skill writers are updated in this same ticket to emit it.

## Architecture Check

1. Adding `urgency` to `OBL` and `CNSQ` makes debt salience uniform across all four debt-bearing classes (`OBL` / `CNSQ` / `THR` / `STINT`), so Gate 6 reads one field name everywhere instead of special-casing which classes expose salience.
2. No shims: `urgency` is required on both schemas; no optional-with-inference fallback for `urgency`-less records (there are none — greenfield).

## Verification Layers

1. Both schemas carry `urgency` (the three-value enum) in `properties` and `required` -> grep-proof / schema validation.
2. Gate 6 reads `OBL` / `CNSQ` `urgency` uniformly with `THR.urgency` -> skill dry-run of `branching-story-health-audit` on a mixed-urgency debt fixture.
3. `branching-story-bootstrap` / `branching-story-turn-cycle` set `urgency` on every `OBL` / `CNSQ` creation -> skill dry-run.

## What to Change

### 1. Contract §4.5.4 + §4.5.5

Add `urgency: low | medium | high*` (required) to both the `OBL` and `CNSQ` schemas. Do not add `tags`.

### 2. Schemas

Add `urgency` (enum `low` / `medium` / `high`) to `properties` and `required` in `tools/validators/src/schemas/story-obligation.schema.json` and `tools/validators/src/schemas/story-consequence.schema.json`.

### 3. Skills — write side

`branching-story-bootstrap` + `branching-story-turn-cycle`: set `urgency` on every `OBL` / `CNSQ` creation.

### 4. Skills — read side

`branching-story-health-audit`: Gate 6 / debt-threshold checks read `OBL` / `CNSQ` `urgency` uniformly with `THR.urgency`. `commitment-block-authoring`: add a note that the SPEC25STOCOHHAR-006 existential predicates can filter on `urgency`. Page-plan §10 (open obligations / consequences / threads) debt rendering may surface `urgency`.

## Files to Touch

- `.claude/skills/_shared-templates/story-state-contract.md` (modify — §4.5.4, §4.5.5)
- `tools/validators/src/schemas/story-obligation.schema.json` (modify)
- `tools/validators/src/schemas/story-consequence.schema.json` (modify)
- `.claude/skills/branching-story-bootstrap/SKILL.md` (modify)
- `.claude/skills/branching-story-turn-cycle/SKILL.md` (modify)
- `.claude/skills/branching-story-health-audit/SKILL.md` (modify)
- `.claude/skills/commitment-block-authoring/SKILL.md` (modify)

## Out of Scope

- A `tags` field on `OBL` / `CNSQ` — explicitly rejected by SPEC-25 D3.
- `THR` / `STINT` / `SLT` urgency surfaces — already present, not touched.
- The SPEC25STOCOHHAR-006 existential predicates themselves — this ticket only adds the field they will filter on.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/validators && npm run build && npm run test` — `record_schema_compliance` rejects an `OBL` and a `CNSQ` missing `urgency`, and one of each with an out-of-enum value.
2. Skill dry-run: `branching-story-health-audit` Gate 6 distinguishes a `high`-urgency open `OBL` from a `low`-urgency one.
3. `grep -l urgency tools/validators/src/schemas/story-obligation.schema.json tools/validators/src/schemas/story-consequence.schema.json` lists both files.

### Invariants

1. Every `OBL` and every `CNSQ` record carries `urgency` drawn from `{low, medium, high}`.
2. Debt salience is read through one field name (`urgency`) across `OBL` / `CNSQ` / `THR` / `STINT`.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/record-schema-compliance.test.ts` (modify) — add `OBL`-with / without-`urgency` and `CNSQ`-with / without-`urgency` cases.

### Commands

1. `cd tools/validators && npm run build && npm run test`
2. Skill dry-run of `branching-story-health-audit` on a debt fixture mixing `high`- and `low`-urgency open `OBL` / `CNSQ` records.
3. A `tools/validators`-scoped `npm run test` is the correct boundary for the schema change — the skill-prose changes are verified by the dry-run in command 2, which has no unit-test harness.
