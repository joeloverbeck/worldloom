# FOUNDATIONS-005: Reconcile `direct_user_approval` CF field authority

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — `docs/FOUNDATIONS.md`, `tools/validators/src/schemas/canon-fact-record.schema.json`, focused validator/world-index fixtures, and `canon-addition` / CF-parity producer surfaces.
**Deps**: `archive/tickets/SPEC28STOCONHAR-005.md`

## Problem

`archive/tickets/SPEC28STOCONHAR-005.md` corrected the story-promotion proposal-package comments so `source_basis.direct_user_approval` stays `false` through `story-fact-promotion-to-canon`; Phase 7 approves proposal creation, not canon acceptance. During that work, reassessment preserved a separate world-canon concern: at intake, `source_basis.direct_user_approval` existed in the Canon Fact Record shape and validator schema, but no live validator, `canon-addition` phase, or patch-engine operation appeared to consume the field's value.

Leaving a required CF field without operational or documented authority was brittle: future skills could mistake it for a canon-acceptance switch, while the actual canon acceptance authority is `canon-addition` adjudication plus HARD-GATE approval and patch-engine submission.

## Assumption Reassessment (2026-05-15)

1. Verified against `archive/tickets/SPEC28STOCONHAR-005.md`: D5 intentionally fixed only the story-promotion skill/template comments and explicitly left the CF-schema-level `direct_user_approval` question out of scope.
2. Verified against `docs/triage/2026-05-15-story-related-improvements-triage.md`: the `source_basis.direct_user_approval` field-without-a-consumer concern is listed as a follow-up, not an accepted SPEC-28 deliverable.
3. Cross-artifact shared boundary: Canon Fact Record authority and acceptance provenance across `docs/FOUNDATIONS.md` §Canon Fact Record Schema, `tools/validators/src/schemas/canon-fact-record.schema.json`, `.claude/skills/canon-addition`, and CF-shaped producer templates such as `story-fact-promotion-to-canon`.
4. FOUNDATIONS principle motivating this ticket: canon acceptance is an append-only canon process, not a template-side boolean. The field must either be given documented semantics and a real consumer, or be removed/relaxed consistently so it no longer looks like a shadow approval path.
5. HARD-GATE / canon-write ordering: this ticket must not weaken `canon-addition`'s HARD-GATE, approval-token, or patch-engine submission discipline. Any reconciliation keeps canon acceptance authority in `canon-addition` and the patch engine.
6. Adjacent contradiction classification: this is separate cleanup exposed by SPEC28STOCONHAR-005, not unfinished D5 work. D5 is complete because it corrected the misleading story-skill handoff comments and `[null]` default.
7. Live reconciliation choice: keep `source_basis.direct_user_approval` as an accepted Canon Fact Record field, but make its value meaningful by constraining accepted `canon_fact_record` rows to `true` in the JSON Schema. Pre-acceptance story-promotion proposal packages may still carry `false` because their Phase 7 approval authorizes proposal creation only; `canon-addition` is responsible for transforming an accepted proposal into a true accepted-CF record after its own HARD-GATE approval.
8. Same-seam fixture fallout: `tools/world-index/tests/fixtures/fixture-semantic-edges.md`, `tools/world-index/tests/semantic.test.ts`, and `tests/fixtures/animalia/_source/canon/CF-0016.yaml` contain accepted-CF fixture rows with `direct_user_approval: false`; those are proof fixtures, not live world canon, and must move with the accepted-CF schema contract. Active story-promotion / continuity-audit proposal templates remain intentionally false and need clearer non-accepted-candidate wording rather than schema-driven conversion.

## Architecture Check

1. Keeping the field and constraining accepted CFs to `true` is cleaner than removing it because existing canon records, fixtures, index types, and patch-engine examples already treat the field as accepted-CF provenance. The change turns an inert boolean into a validator-enforced marker of completed canon acceptance.
2. No backwards-compatibility aliasing or parallel approval paths are introduced. Story-promotion candidates may state `false` only as pre-acceptance handoff metadata; actual canon acceptance remains `canon-addition` plus HARD-GATE approval, approval-token issuance, and patch-engine submission.

## Verification Layers

1. Field authority reconciled -> codebase grep-proof / manual review over `docs/FOUNDATIONS.md`, `tools/validators/src/schemas/canon-fact-record.schema.json`, `.claude/skills/canon-addition`, `.claude/skills/story-fact-promotion-to-canon`, and other CF-parity producer surfaces.
2. Canon acceptance authority preserved -> FOUNDATIONS alignment check against §Story Bundles write discipline and `docs/HARD-GATE-DISCIPLINE.md`.
3. Validator/schema behavior truthful -> focused `record_schema_compliance` proof that accepted CF records with `false` now fail and accepted CF records with `true` pass.
4. Producer/consumer parity preserved -> manual review that pre-acceptance CF-shaped candidate templates and canon-addition parse/emit guidance distinguish proposal-package `false` from accepted-record `true`.

## Landed Changes

### 1. Reassessed and chose the field contract

Kept `source_basis.direct_user_approval` as an accepted CF field. `docs/FOUNDATIONS.md` now defines its semantics: accepted Canon Fact Records must carry `true`, meaning the fact has passed `canon-addition` adjudication, HARD-GATE approval, approval-token issuance, and patch-engine submission. It is not a story-promotion approval switch.

### 2. Reconciled CF producer surfaces

Updated `tools/validators/src/schemas/canon-fact-record.schema.json` so accepted CF records require `source_basis.direct_user_approval` to be `true`, added focused `record_schema_compliance` rejection coverage, corrected accepted-CF fixtures, and truthed CF-shaped skill templates so proposal-package `false` is explicitly pre-acceptance while accepted CFs are emitted with `true`.

### 3. Preserved the approval boundary

Canon acceptance authority remains in `canon-addition` adjudication, HARD-GATE approval, approval-token issuance, and patch-engine submission. No template-side boolean bypass was introduced.

## Files to Touch

- `docs/FOUNDATIONS.md` (modify)
- `docs/triage/2026-05-15-story-related-improvements-triage.md` (modify same-seam status note)
- `tools/validators/src/schemas/canon-fact-record.schema.json` (modify)
- `tools/validators/tests/structural/record-schema-compliance.test.ts` (modify)
- `tools/world-index/tests/fixtures/fixture-semantic-edges.md` and `tools/world-index/tests/semantic.test.ts` (modify accepted-CF fixture false values)
- `tests/fixtures/animalia/_source/canon/CF-0016.yaml` (modify fixture accepted-CF false value)
- `.claude/skills/canon-addition/SKILL.md` and `.claude/skills/canon-addition/references/engine-envelope-shape.md` (modify)
- `.claude/skills/story-fact-promotion-to-canon/SKILL.md` and `.claude/skills/story-fact-promotion-to-canon/templates/proposal-package.yaml` (modify)
- `.claude/skills/continuity-audit/templates/retcon-proposal-card.md`, `.claude/skills/create-base-world/templates/canon-fact-record.yaml`, and `.claude/skills/skill-creator/templates/canon-fact-record.yaml` (modify stale approval comments)

## Out of Scope

- Reopening `archive/tickets/SPEC28STOCONHAR-005.md`; D5's story-promotion package correction is complete.
- Changing story-bundle promotion/closeout ordering beyond preserving the existing `story-fact-promotion-to-canon` -> `canon-addition` -> `story-promotion-closeout` handoff.
- Direct world-content migration unless live reassessment proves existing checked fixtures or sample worlds require it for the chosen schema contract.

## Acceptance Criteria

### Tests That Must Pass

1. A grep over `docs/FOUNDATIONS.md`, `tools/validators/src/schemas/canon-fact-record.schema.json`, `.claude/skills/`, and relevant examples/templates shows no stale `direct_user_approval` semantics that imply story-promotion Phase 7 canon acceptance.
2. `docs/FOUNDATIONS.md` and the validator schema agree that `source_basis.direct_user_approval` exists on accepted CF records, is required, and must be `true`.
3. `canon-addition` remains the exclusive canon-acceptance authority; producer templates can only carry pre-acceptance `false` values that do not bypass adjudication, HARD-GATE approval, approval-token discipline, or patch-engine submission.

### Invariants

1. Canon acceptance authority is not duplicated across a CF field and `canon-addition`.
2. The CF schema and all CF-shaped producer templates remain in parity.
3. The Mystery Reserve firewall and HARD-GATE approval flow are not weakened.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/record-schema-compliance.test.ts` — add focused coverage that an accepted CF with `direct_user_approval: false` is rejected.
2. `tools/world-index/tests/semantic.test.ts` — update the accepted-CF fixture literal to match the new schema contract.

### Commands

1. `rg -n "direct_user_approval|source_basis" docs/FOUNDATIONS.md tools/validators/src/schemas/canon-fact-record.schema.json .claude/skills`
2. `npm test -- --test-name-pattern direct_user_approval` from `tools/validators`.
3. `node --test dist/tests/structural/record-schema-compliance.test.js --test-name-pattern "direct user approval"` from `tools/validators` after build.
4. `npm run build` from `tools/world-index`, then `node --test dist/tests/semantic.test.js`.
5. `git diff --check`

## Outcome

Completed on 2026-05-15. `source_basis.direct_user_approval` is now accepted-CF provenance: persisted Canon Fact Records must validate with `true`, and pre-acceptance proposal packages document `false` as handoff metadata that `canon-addition` transforms only after its own HARD-GATE. The same-seam triage note, skill templates, schema, fixtures, and focused tests were updated to match.

## Verification Result

1. `rg -n "direct_user_approval: false|direct_user_approval\": false|direct_user_approval.*false" .claude docs tools tests tickets archive | head -200` — passed by manual classification. Remaining live operational hits are pre-acceptance proposal templates or the intentional validator rejection test; archive/triage/ticket hits are historical intake or closeout evidence.
2. `npm test -- --test-name-pattern direct_user_approval` from `tools/validators` — passed; the wrapper built the package and ran the validators test set successfully (221 tests).
3. `node --test dist/tests/structural/record-schema-compliance.test.js --test-name-pattern "direct user approval"` from `tools/validators` — passed; the compiled structural file included the new accepted-CF rejection test (28 tests).
4. `npm run build` from `tools/world-index` — passed.
5. `node --test dist/tests/semantic.test.js` from `tools/world-index` — passed (2 tests).

## Deviations

The focused `tools/validators` package wrapper did not narrow to a single subtest; it still ran the full validators test set. I kept that as broad verification and added the compiled structural-file proof for the schema behavior. No direct world-content migration was performed; only checked fixtures were updated.
