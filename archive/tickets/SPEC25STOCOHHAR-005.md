# SPEC25STOCOHHAR-005: urgency on OBL and CNSQ

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — modified `tools/validators/src/schemas/story-obligation.schema.json`, `tools/validators/src/schemas/story-consequence.schema.json`; amended `.claude/skills/_shared-templates/story-state-contract.md` (§4.5.4, §4.5.5, Gate 6, page-plan §10); modified `branching-story-bootstrap`, `branching-story-turn-cycle`, `branching-story-health-audit`, `commitment-block-authoring`; updated validator tests and the SPEC-25 implementation note.
**Deps**: None

## Problem

At intake, Gate 6 (terminal proof) reasoned about "high-salience debts." Debts were open `OBL` / `CNSQ` / `THR`. `THR` carried `urgency`, `STINT` carried `urgency`, `SLT` carried `saliency.urgency`, but `OBL` and `CNSQ` did not. Gate 6 could not evaluate debt salience uniformly across the debt-bearing classes, and SPEC25STOCOHHAR-006's existential predicates (`any_obligation_open`, `any_consequence_pending`) needed an `urgency?` argument to filter on. This ticket adds required `urgency` to `OBL` and `CNSQ`.

## Assumption Reassessment (2026-05-14)

1. At intake, contract §4.5.4 `OBL` and §4.5.5 `CNSQ` had no `urgency` field, and `tools/validators/src/schemas/story-obligation.schema.json` / `story-consequence.schema.json` mirrored that absence. `THR` already carried `urgency` (referenced by SPEC-25 D3 and the contract §4.5.6 schema).
2. SPEC-25 D3 prescribes `urgency: low | medium | high*` (required) on both `OBL` and `CNSQ`. `tags` is explicitly **not** added — `obligation_kind` / `consequence_kind` already serve categorization.
3. Cross-skill boundary under audit: the `OBL` / `CNSQ` schemas (contract §4.5.4 / §4.5.5 ↔ the two JSON schema files) consumed by `branching-story-bootstrap` / `branching-story-turn-cycle` (write side), `branching-story-health-audit` Gate 6 / debt-threshold checks (read side), and SPEC25STOCOHHAR-006's existential predicates (`any_obligation_open` / `any_consequence_pending` carry an `urgency?` argument).
4. FOUNDATIONS §Story Bundles §5b (Schema-Minimalism At Story Scope): restated before trusting the spec — `urgency` is load-bearing because it is directly consumed by Gate 6's debt-salience reasoning and by the SPEC25STOCOHHAR-006 existential predicates; `tags` is correctly dropped because it would duplicate the open-vocabulary `obligation_kind` / `consequence_kind` categorizers.
5. Schema extension: `story-obligation.schema.json` and `story-consequence.schema.json` are extended. Consumers — the four skills above plus `record_schema_compliance`. The extension is a **required** field on each; greenfield (zero production story bundles per SPEC-25 §Problem), so no existing-record migration cost. The skill writers are updated in this same ticket to emit it.
6. HARD-GATE read: required and completed because story-bundle JSON Schema changes affect machine-enforced `record_schema_compliance` validation signals. The change tightens required fields and does not relax patch-engine approval, write ordering, approval tokens, or Mystery Reserve firewall behavior.
7. Reassessment correction: the drafted skill dry-run acceptance is not executable in this Codex context because `.claude/skills/` are prose workflow contracts without a runner or fixture harness. The truthful proof is package-local schema enforcement plus manual/grep review of the skill producer/consumer prose.
8. Same-seam proof fallout: `tools/validators/tests/structural/contract-schema-roundtrip.test.ts` already guards amended story-schema required/property sets and representative records, so it moved with the schema change.

## Architecture Check

1. Adding `urgency` to `OBL` and `CNSQ` makes debt salience uniform across all four debt-bearing classes (`OBL` / `CNSQ` / `THR` / `STINT`), so Gate 6 reads one field name everywhere instead of special-casing which classes expose salience.
2. No shims: `urgency` is required on both schemas; no optional-with-inference fallback for `urgency`-less records (there are none — greenfield).

## Verification Layers

1. Both schemas carry `urgency` (the three-value enum) in `properties` and `required` -> grep-proof / schema validation.
2. Gate 6 reads `OBL` / `CNSQ` `urgency` uniformly with `THR.urgency` -> manual/grep review of `branching-story-health-audit` and the shared contract Gate 6 prose.
3. `branching-story-bootstrap` / `branching-story-turn-cycle` set `urgency` on every `OBL` / `CNSQ` creation -> manual/grep review of write-side skill prose.
4. Page-plan §10 and commitment-block authoring expose urgency as the downstream debt-salience surface -> manual/grep review.

## Landed Changes

### 1. Contract §4.5.4 + §4.5.5

Added `urgency: low | medium | high*` (required) to both the `OBL` and `CNSQ` schemas. Did not add `tags`.

### 2. Schemas

Added `urgency` (enum `low` / `medium` / `high`) to `properties` and `required` in `tools/validators/src/schemas/story-obligation.schema.json` and `tools/validators/src/schemas/story-consequence.schema.json`.

### 3. Skills — write side

`branching-story-bootstrap` + `branching-story-turn-cycle`: set `urgency` on every `OBL` / `CNSQ` creation.

### 4. Skills — read side

`branching-story-health-audit`: Gate 6 / debt-threshold checks read `OBL` / `CNSQ` `urgency` uniformly with `THR.urgency`. `commitment-block-authoring`: added a note that the SPEC25STOCOHHAR-006 existential predicates can filter on `urgency`. Page-plan §10 (open obligations / consequences / threads) debt rendering surfaces `urgency`.

## Files to Touch

- `.claude/skills/_shared-templates/story-state-contract.md` (modify — §4.5.4, §4.5.5)
- `tools/validators/src/schemas/story-obligation.schema.json` (modify)
- `tools/validators/src/schemas/story-consequence.schema.json` (modify)
- `tools/validators/tests/structural/record-schema-compliance.test.ts` (modify)
- `tools/validators/tests/structural/contract-schema-roundtrip.test.ts` (modify)
- `.claude/skills/branching-story-bootstrap/SKILL.md` (modify)
- `.claude/skills/branching-story-turn-cycle/SKILL.md` (modify)
- `.claude/skills/branching-story-health-audit/SKILL.md` (modify)
- `.claude/skills/commitment-block-authoring/SKILL.md` (modify)
- `specs/SPEC-25-story-coherence-hardening.md` (modify — implementation note)

## Out of Scope

- A `tags` field on `OBL` / `CNSQ` — explicitly rejected by SPEC-25 D3.
- `THR` / `STINT` / `SLT` urgency surfaces — already present, not touched.
- The SPEC25STOCOHHAR-006 existential predicates themselves — this ticket only adds the field they will filter on.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/validators && npm run test` — builds first, then `record_schema_compliance` rejects an `OBL` and a `CNSQ` missing `urgency`, and one of each with an out-of-enum value.
2. Manual/grep review: `branching-story-health-audit` Gate 6 reads debt salience from required record `urgency` on open `OBL` / `CNSQ` / `THR`.
3. `grep -l urgency tools/validators/src/schemas/story-obligation.schema.json tools/validators/src/schemas/story-consequence.schema.json` lists both files.

### Invariants

1. Every `OBL` and every `CNSQ` record carries `urgency` drawn from `{low, medium, high}`.
2. Debt salience is read through one field name (`urgency`) across `OBL` / `CNSQ` / `THR` / `STINT`.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/record-schema-compliance.test.ts` (modify) — add `OBL`-with / without-`urgency` and `CNSQ`-with / without-`urgency` cases.
2. `tools/validators/tests/structural/contract-schema-roundtrip.test.ts` (modify) — update story-schema field-set guard and representative valid records.

### Commands

1. `cd tools/validators && npm run test`
2. `grep -l urgency tools/validators/src/schemas/story-obligation.schema.json tools/validators/src/schemas/story-consequence.schema.json`
3. Manual/grep review command:
   ```bash
   rg -n 'required `urgency` field|record `urgency`|always setting `urgency`|with `urgency`|urgency\?' .claude/skills/_shared-templates/story-state-contract.md .claude/skills/branching-story-bootstrap/SKILL.md .claude/skills/branching-story-turn-cycle/SKILL.md .claude/skills/branching-story-health-audit/SKILL.md .claude/skills/commitment-block-authoring/SKILL.md
   ```
4. A `tools/validators`-scoped `npm run test` is the correct executable boundary for the schema change; skill-prose changes have no unit-test harness, so they are verified by manual/grep review.

## Outcome

Completed on 2026-05-14.

Implemented D3. `OBL` and `CNSQ` now require `urgency: low | medium | high` in the shared story-state contract and in their JSON Schemas. `record_schema_compliance` rejects missing and out-of-enum urgency values for both record classes, and the existing contract/schema roundtrip guard now expects the tightened field sets.

Updated the story-skill prose so bootstrap and turn-cycle set `urgency` on every emitted `OBL` / `CNSQ`, health-audit Gate 6 reads debt salience from record `urgency`, page-plan §10 surfaces urgency for open debts, and commitment-block authoring preserves urgency for downstream SPEC25STOCOHHAR-006 existential-predicate filtering.

Updated `specs/SPEC-25-story-coherence-hardening.md` with a dated implementation note marking D3 as landed.

## Verification Result

1. `cd tools/validators && npm run test` — PASS; package build completed and all 201 compiled tests passed.
2. `grep -l urgency tools/validators/src/schemas/story-obligation.schema.json tools/validators/src/schemas/story-consequence.schema.json` — PASS; both schema files are listed.
3. Manual/grep review of the shared contract and four named skills — PASS; the write-side skills set `urgency`, health-audit reads record `urgency`, page-plan §10 includes urgency, and commitment-block authoring names the future `urgency?` filter.
4. `docs/HARD-GATE-DISCIPLINE.md` reviewed — PASS; this tightening does not relax approval, submit, pre-apply, or Mystery Reserve firewall behavior.

## Deviations

- The drafted skill dry-run was replaced with manual/grep review because the repo has no executable `.claude/skills/` runner or mixed-debt fixture harness in this Codex context.
- `tools/validators/tests/structural/contract-schema-roundtrip.test.ts` was added to the touched set as same-seam proof fallout because it guards the required/property field lists for story schemas.
- `cd tools/validators && npm run test` emits Git's default-branch-name hint from a temp git fixture; it is non-fatal and unrelated to this ticket.
