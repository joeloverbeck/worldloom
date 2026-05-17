# SPEC37STOPIPTEN-001: Extend proposal_package_shape with conditional safety-block enforcement

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — modifies `tools/validators/src/structural/proposal-package-shape.ts` (existing structural validator); extends its test file; adds prescriptive prose to `.claude/skills/story-fact-promotion-to-canon/SKILL.md`. No new validator, no new patch-engine op, no new schema field.
**Deps**: None

## Problem

`tools/validators/src/structural/proposal-package-shape.ts:53-64` currently enforces only candidate purity (every key in `candidate` must be in `CANON_FACT_FIELDS` and not in `CANDIDATE_PROMOTION_FIELDS`) and `source_basis` field placement. The conditional safety-block predicates that `tools/validators/src/structural/record-schema-compliance.ts:140-153` already runs against accepted CF records — `requiresExceptionGovernance(type)` and `requiresEpistemicProfile(type)` — are never invoked on proposal-package candidates. Consequently a promotion proposal whose `candidate.type` is in `CF_TYPE_EXCEPTION_GOVERNANCE_REQUIRED` (e.g., `technology`, `magic_practice`) or `CF_TYPE_EPISTEMIC_PROFILE_REQUIRED` (the above plus `institution_with_secrecy`, `knowledge_asymmetric_fact`) passes `proposal_package_shape` even when `candidate.exception_governance` / `candidate.epistemic_profile` are absent. The promotion path catches the gap only at `canon-addition`'s `record_schema_compliance` step — after the proposal has been authored, surfaced for review at `story-promotion-closeout`, and submitted. The promotion skill `.claude/skills/story-fact-promotion-to-canon/SKILL.md` does not currently prescribe safety-block authoring; only a template comment at `templates/proposal-package.yaml` mentions it and defers to FOUNDATIONS. The validator must fire at the proposal-package layer so safety-block reasoning lives in the candidate where reviewers can evaluate it, rather than being deferred to canon-addition (where rejection is later, costlier, and trains authors to omit the very reasoning worldloom requires).

## Assumption Reassessment (2026-05-17)

1. `tools/validators/src/structural/proposal-package-shape.ts` exists and its candidate-purity loop sits at lines 53-57 with the `source_basis` loop at lines 59-64; the new conditional safety-block check fits cleanly between them.
2. `tools/validators/src/structural/record-schema-compliance.ts` already exports `requiresExceptionGovernance` (line 161) and `requiresEpistemicProfile` (line 165); `naRationaleVerdicts` at line 190 is **not currently exported** — implementer must either add `export` or extract the helper to a shared module so `proposal_package_shape` can reuse it without copy-paste duplication. The helper's actual signature is `(record: SchemaTarget, blockName: string, block: unknown)` — call sites must match this order (the spec prose at SPEC-37 D1 §1 shows a different order; defer to the live signature).
3. Cross-skill / cross-artifact boundary under audit: the shared canon-promotion contract between `story-fact-promotion-to-canon` (proposal authoring), `proposal_package_shape` (proposal-stage validation), and `record_schema_compliance` (accepted-CF validation). The same conditional safety-block predicates must enforce identically at both validation layers; divergence trains authors to skip safety-block reasoning at the proposal stage.
4. FOUNDATIONS principle under audit: `docs/FOUNDATIONS.md` §Canon Fact Record Schema §`epistemic_profile` (line 331) and §`exception_governance` (line 340) define the conditional safety-block contract for accepted CFs with non-trivial knowability or exception axes; Rule 2 (No Pure Cosmetics, line 422) makes safety-block reasoning non-optional. Enforcing the same contract at the proposal stage is a layering correction, not a new rule.
5. Canon Safety Check surface: `proposal_package_shape` is registered in `tools/validators/src/structural/` and runs at the patch engine's pre-apply phase whenever a proposal-package file is touched (per the `applies_to` predicate at line 18). Adding new verdict codes (`proposal_candidate_*` prefix, distinct from the `record_schema_compliance.*` prefix) preserves verdict-namespace separation in adjudication logs and does NOT weaken the Mystery Reserve firewall — the new check is additive enforcement of an existing safety contract, not a relaxation.

## Architecture Check

1. Reusing the predicates and rationale-quality helper from `record-schema-compliance.ts` keeps the safety-block contract single-source — if the contract evolves (e.g., a new type joins `CF_TYPE_EXCEPTION_GOVERNANCE_REQUIRED`), both validators pick up the change automatically. Forking a parallel implementation in `proposal-package-shape.ts` would create a drift surface.
2. No backwards-compatibility shims introduced. The new `proposal_candidate_*` verdict codes are additive; existing proposal-package fixtures with non-safety-sensitive candidate types continue to pass unchanged. The candidate-purity loop and `source_basis` loop are preserved verbatim.

## Verification Layers

1. New verdict codes fire on safety-sensitive candidates lacking required blocks → `npm test` in `tools/validators/` exercises the five new test cases at `tests/structural/proposal-package-shape.test.ts`.
2. Existing six tests remain green → same test command; regression coverage on candidate purity and `source_basis` placement is unchanged.
3. Rationale-quality helper integration → the two `n_a` rationale tests (substantive accept, thin reject) prove `naRationaleVerdicts` integration works identically at this validator and at `record_schema_compliance`.
4. Skill prose alignment → `grep -n "CF_TYPE_EPISTEMIC_PROFILE_REQUIRED" .claude/skills/story-fact-promotion-to-canon/SKILL.md` returns the new directive paragraph.
5. FOUNDATIONS alignment → `docs/FOUNDATIONS.md` §Canon Fact Record Schema §`epistemic_profile` and §`exception_governance` define the conditional contract this validator now mirrors at the proposal stage.

## What to Change

### 1. Validator extension at `tools/validators/src/structural/proposal-package-shape.ts` (landed)

`proposal-package-shape.ts` now imports `requiresEpistemicProfile`, `requiresExceptionGovernance`, and `naRationaleVerdicts` from `./record-schema-compliance`. The implementation chose the direct-export path for `naRationaleVerdicts` and the shared `SchemaTarget` type instead of creating a new helper module. The helper's actual signature remains `(record: SchemaTarget, blockName: string, block: unknown)`.

After the existing candidate-purity loop and before the `source_basis` loop, the validator now:

- Reads `candidate.type` as a string. If absent (i.e., `typeof candidate.type !== "string"`), emits verdict `proposal_candidate_missing_type` with message `proposal candidate missing 'type' field required for safety-block resolution`.
- If `requiresExceptionGovernance(type)` returns true AND `candidate.exception_governance === undefined`, emits verdict `proposal_candidate_exception_governance_missing` with message `proposal candidate type '<type>' requires exception_governance (see CF_TYPE_EXCEPTION_GOVERNANCE_REQUIRED)`.
- If `candidate.exception_governance` is present, builds a `SchemaTarget`-shaped adapter (file path = proposal-package path; node_id = the candidate's CF candidate id if available, else the file path) and invokes `naRationaleVerdicts(adapter, "exception_governance", candidate.exception_governance)`; any returned verdicts are rewritten to `validator: "proposal_package_shape"` and `code: "proposal_candidate_na_rationale_quality"` so adjudication logs distinguish proposal-stage failures from accepted-CF failures.
- If `requiresEpistemicProfile(type)` returns true AND `candidate.epistemic_profile === undefined`, emits verdict `proposal_candidate_epistemic_profile_missing` with analogous message.
- If `candidate.epistemic_profile` is present, invokes `naRationaleVerdicts` analogously and appends rewritten verdicts.

All new verdicts use `validator: "proposal_package_shape"`. Safety-block verdicts use the safety-block-specific `suggested_fix`: `"Add the required safety-block reasoning to candidate.exception_governance / candidate.epistemic_profile, or provide an { n_a: '<rationale>' } block citing a FOUNDATIONS ontology category keyword."`

### 2. Test extension at `tools/validators/tests/structural/proposal-package-shape.test.ts` (landed)

Five test cases were added, preserving the existing six:

- `proposal_package_shape_rejects_safety_sensitive_candidate_without_epistemic_profile` — fixture: proposal package with `candidate.type: knowledge_asymmetric_fact`, all other candidate fields valid (CF-shaped), no `epistemic_profile`. Assert verdict array contains exactly one verdict whose `code === "proposal_candidate_epistemic_profile_missing"`.
- `proposal_package_shape_rejects_safety_sensitive_candidate_without_exception_governance` — fixture: `candidate.type: technology`, no `exception_governance`. Assert one verdict with `code === "proposal_candidate_exception_governance_missing"`.
- `proposal_package_shape_accepts_non_sensitive_event_candidate_without_safety_blocks` — fixture: `candidate.type: event` (in neither required set), no safety blocks. Assert no safety-block verdict in the returned array (other existing checks may still apply; assert specifically on `proposal_candidate_*` verdict absence).
- `proposal_package_shape_accepts_substantive_n_a_safety_rationale` — fixture: `candidate.type: technology`, `candidate.exception_governance: { n_a: "no exception axis applies because this artifact's effect is universally available across the populace, per ontology category artifact ..." }`. Assert no `proposal_candidate_*` verdict.
- `proposal_package_shape_rejects_thin_n_a_safety_rationale` — fixture: same as above but `{ n_a: "N/A" }`. Assert one verdict with `code === "proposal_candidate_na_rationale_quality"`.

### 3. Skill-prose alignment at `.claude/skills/story-fact-promotion-to-canon/SKILL.md` (landed)

The proposal-package-authoring section now includes this directive after the candidate-shape guidance:

```
When `candidate.type` is in `CF_TYPE_EPISTEMIC_PROFILE_REQUIRED` (`capability`,
`bloodline`, `magic_practice`, `technology`, `divine_action`,
`artifact_dependent_truth`, `exception_introducing_fact`,
`institution_with_secrecy`, `knowledge_asymmetric_fact`) OR
`CF_TYPE_EXCEPTION_GOVERNANCE_REQUIRED` (the same list minus the last two), the
candidate MUST include the corresponding `epistemic_profile` and/or
`exception_governance` block — either as a full object, or as
`{ n_a: "<substantive rationale citing an ontology category>" }`. Do not defer
this reasoning to `canon-addition`; `proposal_package_shape` enforces it at
validation time. The reasoning lives in the candidate because it is part of
what story-promotion-closeout reviewers need to evaluate the proposal, not part
of the canon-addition adjudication.
```

## Files to Touch

- `tools/validators/src/structural/proposal-package-shape.ts` (modify)
- `tools/validators/src/structural/record-schema-compliance.ts` (modify — exports `SchemaTarget` and `naRationaleVerdicts`)
- `tools/validators/tests/structural/proposal-package-shape.test.ts` (modify)
- `.claude/skills/story-fact-promotion-to-canon/SKILL.md` (modify)
- `specs/SPEC-37-story-pipeline-tenth-iteration-fixes.md` (modify — D1 implementation note)

## Out of Scope

- Extending `templates/proposal-package.yaml` (the existing template comment at lines 52-70 already mentions the conditional requirement; updating the template is a separate doc-hygiene pass).
- Adding new safety-sensitive CF types to `CF_TYPE_EXCEPTION_GOVERNANCE_REQUIRED` or `CF_TYPE_EPISTEMIC_PROFILE_REQUIRED` — this ticket reuses the existing constants verbatim.
- Modifying `record_schema_compliance`'s existing accepted-CF enforcement — the contract there remains unchanged; this ticket mirrors it at the proposal stage.
- Adjudication-log surface changes (the `proposal_candidate_*` verdict-code prefix is the only adjudication-side change; downstream log formatters need no changes).

## Acceptance Criteria

### Tests That Must Pass

1. The five new test cases in `tools/validators/tests/structural/proposal-package-shape.test.ts` all pass.
2. The existing six test cases in the same file remain green.
3. `cd tools/validators && npm run build && npm test` exits 0.

### Invariants

1. Conditional safety-block predicates fire identically at the proposal-package layer and the accepted-CF layer — divergence would let one layer accept what the other rejects, defeating the layering correction.
2. `naRationaleVerdicts` remains single-source — both validators consume the same helper, so future contract evolution (e.g., new ontology-category keywords) propagates to both layers automatically.
3. Existing proposal-package fixtures with non-safety-sensitive candidate types continue to pass; the new check is additive enforcement, not a relaxation or a new universal requirement.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/proposal-package-shape.test.ts` — five new cases per §What to Change §2; covers safety-sensitive type rejection (×2), non-sensitive type acceptance, substantive `n_a` acceptance, thin `n_a` rejection.

### Commands

1. `cd tools/validators && npm run build && npm test` — full validators package verification.
2. `grep -n "proposal_candidate_" tools/validators/src/structural/proposal-package-shape.ts` — verify the new verdict codes are emitted from the right file.
3. `grep -n "CF_TYPE_EPISTEMIC_PROFILE_REQUIRED" .claude/skills/story-fact-promotion-to-canon/SKILL.md` — verify the directive paragraph landed in the consumer skill.

## Outcome

Completed: 2026-05-17.

This ticket extended `proposal_package_shape` so proposal-package candidates now enforce the same conditional CF safety-block contract that accepted CF records already enforce. Safety-sensitive `candidate.type` values now emit proposal-stage verdicts for missing `exception_governance`, missing `epistemic_profile`, missing `type`, and thin `{ n_a: ... }` rationales. The implementation reuses `requiresExceptionGovernance`, `requiresEpistemicProfile`, and `naRationaleVerdicts` from `record-schema-compliance.ts` so rationale-quality logic stays single-source.

The validators package gained five focused proposal-package tests, and `.claude/skills/story-fact-promotion-to-canon/SKILL.md` now tells authors to include the required safety blocks in the proposal candidate instead of deferring that reasoning to `canon-addition`. `specs/SPEC-37-story-pipeline-tenth-iteration-fixes.md` was updated with a D1 implementation note so the active spec no longer presents this deliverable as wholly pending.

## Verification Result

Commands run on 2026-05-17:

1. `cd tools/validators && npm test` — passed. The package script ran `npm run build` and then `node --test dist/tests/**/*.test.js`; result: 337 tests passed, 0 failed.
2. `grep -n "proposal_candidate_" tools/validators/src/structural/proposal-package-shape.ts` — passed. Found `proposal_candidate_missing_type`, `proposal_candidate_exception_governance_missing`, `proposal_candidate_epistemic_profile_missing`, and `proposal_candidate_na_rationale_quality`.
3. `grep -n "CF_TYPE_EPISTEMIC_PROFILE_REQUIRED" .claude/skills/story-fact-promotion-to-canon/SKILL.md` — passed. Found the inserted promotion-skill directive.

Ignored artifact classification: `tools/validators/dist/` was refreshed by the validators package build/test lane; `tools/validators/node_modules/` was pre-existing ignored package state.

## Deviations

- The optional helper-extraction path was not used. Exporting `SchemaTarget` and `naRationaleVerdicts` from `record-schema-compliance.ts` kept the change smaller while preserving single-source helper reuse.
- The test count is now 337 total validators package tests after adding the five proposal-package tests.
