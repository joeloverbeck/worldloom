# SPEC38STOLOCDIE-010: New rule validator `chc_grounded_in_artifact_accessible`

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — new rule validator at `tools/validators/src/rules/rule_chc_grounded_in_artifact_accessible.ts` + paired test + registration in `tools/validators/src/public/registry.ts` + CLI selector, registry/count/integration tests, package README inventory, and SPEC-38 implementation note
**Deps**: None

## Problem

At intake, a CHC's `grounded_in.records[]` could legitimately include `DA-<integer>` references (per `.claude/skills/_shared-templates/story-record-schemas.md` §4.5.12), but no validator enforced that every such DA was active in the emitting PG's `state_snapshot.active_records.DA[]`. Operators could produce a CHC that grounded in a DA which had been superseded, was never created, or belonged to a sibling branch. This ticket closes the CHC-grounding accessibility gap that ticket 005 (health-audit Phase 2x) consumes.

## Assumption Reassessment (2026-05-17)

1. Verified codebase has analogous rule validators at `tools/validators/src/rules/rule_<snake>.ts` (per existing `rule_choice_set_noncollapse.ts` and `rule_storylet_predicate_dsl_parsability.ts` — both non-numbered rules following the `rule_<snake>.ts` naming convention). Verified registry seam at `tools/validators/src/public/registry.ts` lines 28-31 (existing imports) + lines 62-73 (existing `ruleValidators` array enumerating 10 current validators). Verified registry test at `tools/validators/tests/rules/registry.test.ts` asserts the exact name list via `assert.deepEqual(ruleValidators.map((v) => v.name), [...])`. Verified test naming at `tools/validators/tests/rules/rule_<snake>.test.ts` (per existing `rule_choice_set_noncollapse.test.ts`).
2. Verified SPEC-38 §D10 prescribes the validator. Filename in spec is `chc-grounded-in-artifact-accessible.ts`; codebase convention for non-numbered rules is `rule_<snake>.ts` per existing precedent — mechanical-drift correction propagated silently per `/spec-to-tickets` §Codebase truth guardrail (corrected path: `rule_chc_grounded_in_artifact_accessible.ts`; corrected test path: `rule_chc_grounded_in_artifact_accessible.test.ts`).
3. Cross-skill boundary: this validator is consumed by `branching-story-health-audit` Phase 2x (ticket 005). The verdict code `chc_grounded_in_da_not_active` must match the name ticket 005 cites. The registry surface (`tools/validators/src/public/registry.ts` import + `ruleValidators` array entry) and registry test (`tools/validators/tests/rules/registry.test.ts` assertion list) must be updated atomically in this ticket — both files touched together to prevent test failures.
4. FOUNDATIONS principle motivating this ticket: §Story Bundles §6b Information / Observer Firewall — choice grounding must respect runtime accessibility; a CHC grounding in a DA that is not active in the emitting PG's `state_snapshot.active_records.DA[]` violates the runtime-accessibility contract. Rule 1 No Floating Facts: CHC must remain reachable from its grounding records.
5. HARD-GATE / canon-write ordering: this ticket adds a NEW rule validator under `tools/validators/src/rules/`. Per the validator-modification-gates-canon-write rule, validator additions/modifications gate canon and story-bundle record writes at engine pre-apply time. The new validator emits FAIL verdicts that the patch engine consumes; landing the validator extends the canon-safety surface. Confirmed the validator STRENGTHENS the firewall (catches a previously-uncaught CHC-grounding gap) — it does NOT weaken the Mystery Reserve firewall, does NOT silently resolve MR entries, and does NOT change any existing validator's verdict semantics.
6. Reassessment found same-package registry inventory fallout not listed in the draft: `tools/validators/README.md` still named 10 rule-derived/story-scope validators, `tools/validators/tests/integration/spec04-verification.test.ts` asserted rule/total counts and the sorted rule-name list, `tools/validators/src/cli/_helpers.ts` needed the new named selector for `--rules=chc_grounded_in_artifact_accessible`, `tools/validators/tests/cli/rule-filter-pattern.test.ts` needed selector coverage, and `tools/validators/tests/integration/validate-patch-plan.test.ts` needed to classify the new validator as skipped for clean non-story pre-apply plans. These were same-seam proof and public-inventory surfaces, so they were absorbed into this ticket.

## Architecture Check

1. New rule validator (cleaner than embedding the check in an existing validator): the check has distinct trigger semantics (CHC-record iteration with cross-record lookup into PG.state_snapshot) that don't match any existing validator's pattern. Following the established `rule_<snake>.ts` naming convention for non-numbered rules. Verdict code follows the established lowercase-snake convention.
2. No backwards-compatibility shims; net-new validator with no prior history.

## Verification Layers

1. Validator file exists at corrected path → codebase grep-proof: `test -f tools/validators/src/rules/rule_chc_grounded_in_artifact_accessible.ts`.
2. Test file exists with ≥4 tests passing → `cd tools/validators && npm test` (build + run).
3. Registry import + ruleValidators array entry added → codebase grep-proof: `grep -n 'ruleChcGroundedInArtifactAccessible' tools/validators/src/public/registry.ts` returns ≥2 matches (one import line + one array entry).
4. Registry test extended to include new name → codebase grep-proof: `grep -n 'chc_grounded_in_artifact_accessible' tools/validators/tests/rules/registry.test.ts` returns ≥1 match.
5. No regressions on existing suite → `cd tools/validators && npm test` produces zero failures on the existing structural + rule + schema + integration tests.

## Landed Changes

### 1. New validator source file

Path: `tools/validators/src/rules/rule_chc_grounded_in_artifact_accessible.ts`.

Landed behavior per SPEC-38 §D10:
- Queries story-scoped `page_record` and `choice_record` records.
- Treats the emitting PG as any page whose `state_snapshot.active_records.CHC[]` contains the CHC.
- For every `DA-<integer>` in that CHC's `grounded_in.records[]`, verifies that the DA appears in the same PG's `state_snapshot.active_records.DA[]`.
- Emits FAIL verdict `chc_grounded_in_da_not_active` with CHC id, DA id, emitting PG id, and `grounded_in.records[]` reference path when the DA is missing.
- Applies in full-world mode, incremental mode for page/choice touched files, and pre-apply mode for page/choice story ops.

Export shape (matching existing rule validators):

```ts
export const ruleChcGroundedInArtifactAccessible: Validator = {
  name: "chc_grounded_in_artifact_accessible",
  severity_mode: "fail",
  applies_to: (ctx) => /* CHC patches or full-world */,
  run: async (input, ctx) => verdicts
};
```

### 2. New test file

Path: `tools/validators/tests/rules/rule_chc_grounded_in_artifact_accessible.test.ts`. Landed tests cover:

- `chc_grounds_in_active_da_passes` — CHC grounds in DA-1; DA-1 in active records. Expect pass.
- `chc_grounds_in_inactive_da_fails` — CHC grounds in DA-1; DA-1 NOT in active records. Expect verdict `chc_grounded_in_da_not_active`.
- `chc_grounds_in_superseded_da_fails` — CHC grounds in DA-1; DA-1 superseded by DA-2 and no longer active. Expect verdict.
- `chc_with_no_da_grounding_passes` — CHC grounds in BEL + SF only, no DA. Expect pass.
- `applies to full-world, incremental, and story pre-apply runs` — applicability boundary proof.

### 3. Register in `tools/validators/src/public/registry.ts`

Added `ruleChcGroundedInArtifactAccessible` to the rule import block and `ruleValidators` array.

### 4. Update `tools/validators/tests/rules/registry.test.ts`

Appended `"chc_grounded_in_artifact_accessible"` to the exact registry assertion in the same order as `registry.ts`.

### 5. Update package inventory, CLI selector, and integration proof surfaces

Added the new validator to the package README inventory, CLI named-rule selector set, rule-filter test, SPEC-04 registry/count capstone, and clean pre-apply execution-status test.

## Files to Touch

- `tools/validators/src/rules/rule_chc_grounded_in_artifact_accessible.ts` (new)
- `tools/validators/tests/rules/rule_chc_grounded_in_artifact_accessible.test.ts` (new)
- `tools/validators/src/public/registry.ts` (modify — add import + array entry)
- `tools/validators/tests/rules/registry.test.ts` (modify — extend assertion list)
- `tools/validators/src/cli/_helpers.ts` (modify — add named rule selector)
- `tools/validators/tests/cli/rule-filter-pattern.test.ts` (modify — selector acceptance)
- `tools/validators/tests/integration/spec04-verification.test.ts` (modify — rule/total counts and sorted rule list)
- `tools/validators/tests/integration/validate-patch-plan.test.ts` (modify — clean pre-apply skip classification)
- `tools/validators/README.md` (modify — validator count and inventory)
- `archive/specs/SPEC-38-story-local-diegetic-artifact-authoring.md` (modify — D10 implementation note)

## Out of Scope

- Body-similarity clustering for duplicate DAs (lives in ticket 011)
- Prose-mention detection (lives in ticket 012)
- Health-audit Phase 2x prose (lives in ticket 005 which CONSUMES this validator's verdict code)
- DA schema changes (deferred per SPEC-38 §Out of Scope)
- Skill prose updates (none required for this ticket — the validator is consumed by ticket 005 separately)

## Acceptance Criteria

### Tests That Must Pass

1. Validator implemented and registered (import + array entry in `registry.ts`).
2. All 4 minimum tests pass.
3. `cd tools/validators && npm test` produces zero regressions on existing suite.
4. `tools/validators/tests/rules/registry.test.ts` includes the new name in its assertion.
5. `world-validate --rules=chc_grounded_in_artifact_accessible` is accepted by CLI option validation.

### Invariants

1. The validator enforces CHC-grounding accessibility at engine pre-apply time (`severity_mode: "fail"`).
2. Verdict code `chc_grounded_in_da_not_active` matches the name cited by ticket 005 (health-audit Phase 2x).
3. No existing validator's behavior is modified; addition-only.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/rules/rule_chc_grounded_in_artifact_accessible.test.ts` (new) — 4 tests per SPEC-38 §D10 acceptance criteria.
2. `tools/validators/tests/rules/registry.test.ts` (modify) — extend `assert.deepEqual` name list.

### Commands

1. `cd tools/validators && npm run build` (TypeScript compile)
2. `cd tools/validators && npm test` (full suite — build + run all `dist/tests/**/*.test.js`)
3. Targeted: `cd tools/validators && npm run build && node --test dist/tests/rules/rule_chc_grounded_in_artifact_accessible.test.js` for iterative dev.

## Outcome

Completed on 2026-05-17. Added the `chc_grounded_in_artifact_accessible` rule validator, registered it, exposed it as a named CLI rule selector, updated rule registry/count tests and package README inventory, and added a SPEC-38 implementation note. The validator emits FAIL verdict `chc_grounded_in_da_not_active` when an active CHC grounds in a DA that is absent from the emitting PG's `state_snapshot.active_records.DA[]`.

## Verification Result

1. `cd tools/validators && npm run build` — passed.
2. `cd tools/validators && node --test dist/tests/rules/rule_chc_grounded_in_artifact_accessible.test.js` — passed 5 tests.
3. `cd tools/validators && node --test dist/tests/rules/registry.test.js dist/tests/integration/spec04-verification.test.js dist/tests/cli/rule-filter-pattern.test.js` — passed 12 tests.
4. `cd tools/validators && node --test dist/tests/integration/validate-patch-plan.test.js --test-name-pattern 'clean pre-apply plan'` — passed; the package's Node wrapper still executed the file's full 15-test set, and the relevant clean pre-apply case now classifies the new validator as skipped.
5. `cd tools/validators && npm test` — passed 348 tests.

## Deviations

1. Same-seam package inventory and proof surfaces were wider than the draft ticket: README count/inventory, CLI named-rule selector, rule-filter acceptance, SPEC-04 count/name assertions, and clean pre-apply execution-status classification moved with the registry addition.
2. The validator source follows the live non-numbered rule naming convention `rule_<snake>.ts`, not the kebab-case filename in the original SPEC-38 prose.
