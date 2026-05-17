# SPEC38STOLOCDIE-010: New rule validator `chc_grounded_in_artifact_accessible`

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — new rule validator at `tools/validators/src/rules/rule_chc_grounded_in_artifact_accessible.ts` + paired test + registration in `tools/validators/src/public/registry.ts` + registry-test assertion update
**Deps**: None

## Problem

A CHC's `grounded_in.records[]` may legitimately include `DA-<integer>` references (per `.claude/skills/_shared-templates/story-record-schemas.md` §4.5.12 line 603: `records: [STENT-<integer> | STLOC-<integer> | STOBJ-<integer> | BEL-<integer> | OBL-<integer> | CNSQ-<integer> | THR-<integer> | SREL-<integer> | DA-<integer>]*`), but no validator currently enforces that every such DA is active in the emitting PG's `state_snapshot.active_records.DA[]`. Operators can produce a CHC that grounds in a DA which has been superseded, was never created, or belongs to a sibling branch — the predicate-parsability validator does not catch this. This validator closes the CHC-grounding accessibility gap that ticket 005 (health-audit Phase 2x) consumes.

## Assumption Reassessment (2026-05-17)

1. Verified codebase has analogous rule validators at `tools/validators/src/rules/rule_<snake>.ts` (per existing `rule_choice_set_noncollapse.ts` and `rule_storylet_predicate_dsl_parsability.ts` — both non-numbered rules following the `rule_<snake>.ts` naming convention). Verified registry seam at `tools/validators/src/public/registry.ts` lines 28-31 (existing imports) + lines 62-73 (existing `ruleValidators` array enumerating 10 current validators). Verified registry test at `tools/validators/tests/rules/registry.test.ts` asserts the exact name list via `assert.deepEqual(ruleValidators.map((v) => v.name), [...])`. Verified test naming at `tools/validators/tests/rules/rule_<snake>.test.ts` (per existing `rule_choice_set_noncollapse.test.ts`).
2. Verified SPEC-38 §D10 prescribes the validator. Filename in spec is `chc-grounded-in-artifact-accessible.ts`; codebase convention for non-numbered rules is `rule_<snake>.ts` per existing precedent — mechanical-drift correction propagated silently per `/spec-to-tickets` §Codebase truth guardrail (corrected path: `rule_chc_grounded_in_artifact_accessible.ts`; corrected test path: `rule_chc_grounded_in_artifact_accessible.test.ts`).
3. Cross-skill boundary: this validator is consumed by `branching-story-health-audit` Phase 2x (ticket 005). The verdict code `chc_grounded_in_da_not_active` must match the name ticket 005 cites. The registry surface (`tools/validators/src/public/registry.ts` import + `ruleValidators` array entry) and registry test (`tools/validators/tests/rules/registry.test.ts` assertion list) must be updated atomically in this ticket — both files touched together to prevent test failures.
4. FOUNDATIONS principle motivating this ticket: §Story Bundles §6b Information / Observer Firewall — choice grounding must respect runtime accessibility; a CHC grounding in a DA that is not active in the emitting PG's `state_snapshot.active_records.DA[]` violates the runtime-accessibility contract. Rule 1 No Floating Facts: CHC must remain reachable from its grounding records.
5. HARD-GATE / canon-write ordering: this ticket adds a NEW rule validator under `tools/validators/src/rules/`. Per the validator-modification-gates-canon-write rule, validator additions/modifications gate canon and story-bundle record writes at engine pre-apply time. The new validator emits FAIL verdicts that the patch engine consumes; landing the validator extends the canon-safety surface. Confirmed the validator STRENGTHENS the firewall (catches a previously-uncaught CHC-grounding gap) — it does NOT weaken the Mystery Reserve firewall, does NOT silently resolve MR entries, and does NOT change any existing validator's verdict semantics.

## Architecture Check

1. New rule validator (cleaner than embedding the check in an existing validator): the check has distinct trigger semantics (CHC-record iteration with cross-record lookup into PG.state_snapshot) that don't match any existing validator's pattern. Following the established `rule_<snake>.ts` naming convention for non-numbered rules. Verdict code follows the established lowercase-snake convention.
2. No backwards-compatibility shims; net-new validator with no prior history.

## Verification Layers

1. Validator file exists at corrected path → codebase grep-proof: `test -f tools/validators/src/rules/rule_chc_grounded_in_artifact_accessible.ts`.
2. Test file exists with ≥4 tests passing → `cd tools/validators && npm test` (build + run).
3. Registry import + ruleValidators array entry added → codebase grep-proof: `grep -n 'ruleChcGroundedInArtifactAccessible' tools/validators/src/public/registry.ts` returns ≥2 matches (one import line + one array entry).
4. Registry test extended to include new name → codebase grep-proof: `grep -n 'chc_grounded_in_artifact_accessible' tools/validators/tests/rules/registry.test.ts` returns ≥1 match.
5. No regressions on existing suite → `cd tools/validators && npm test` produces zero failures on the existing structural + rule + schema + integration tests.

## What to Change

### 1. New validator source file

Path: `tools/validators/src/rules/rule_chc_grounded_in_artifact_accessible.ts`.

Behavior per SPEC-38 §D10:
- Iterate over every CHC record in scope via `ctx.index.query({ record_type: "choice_record", world_slug: ctx.world_slug, ...storyScope })`.
- For each `DA-<integer>` in `CHC.grounded_in.records[]`:
  - Locate the emitting PG (the page whose `state_snapshot.active_records.CHC[]` contains this CHC).
  - Verify the DA is present in that PG's `state_snapshot.active_records.DA[]`.
  - If missing, emit verdict `chc_grounded_in_da_not_active` with message naming CHC id, DA id, emitting PG id.

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

Path: `tools/validators/tests/rules/rule_chc_grounded_in_artifact_accessible.test.ts`. Minimum 4 tests per SPEC-38 §D10:

- `chc_grounds_in_active_da_passes` — CHC grounds in DA-1; DA-1 in active records. Expect pass.
- `chc_grounds_in_inactive_da_fails` — CHC grounds in DA-1; DA-1 NOT in active records. Expect verdict `chc_grounded_in_da_not_active`.
- `chc_grounds_in_superseded_da_fails` — CHC grounds in DA-1; DA-1 superseded by DA-2 and no longer active. Expect verdict.
- `chc_with_no_da_grounding_passes` — CHC grounds in BEL + SF only, no DA. Expect pass.

### 3. Register in `tools/validators/src/public/registry.ts`

Add import alongside existing rule imports (lines 28-31 region):

```ts
import { ruleChcGroundedInArtifactAccessible } from "../rules/rule_chc_grounded_in_artifact_accessible.js";
```

Add to `ruleValidators` array (lines 62-73 region) — append at the end or in alphabetical order matching the file's convention.

### 4. Update `tools/validators/tests/rules/registry.test.ts`

Append `"chc_grounded_in_artifact_accessible"` to the existing `assert.deepEqual(ruleValidators.map((v) => v.name), [...])` name list, in the same order as the registry.ts array entry.

## Files to Touch

- `tools/validators/src/rules/rule_chc_grounded_in_artifact_accessible.ts` (new)
- `tools/validators/tests/rules/rule_chc_grounded_in_artifact_accessible.test.ts` (new)
- `tools/validators/src/public/registry.ts` (modify — add import + array entry)
- `tools/validators/tests/rules/registry.test.ts` (modify — extend assertion list)

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
