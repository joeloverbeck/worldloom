# SPEC31STOCONHAR-003: Fix `SLT.created_at_page` origin/scope rule

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `.claude/skills/_shared-templates/story-state-contract.md`, `.claude/skills/commitment-block-authoring/SKILL.md`, new `tools/validators/src/structural/slt-created-at-page-origin-consistency.ts`, `tools/validators/src/public/registry.ts`, validator registry/readme/tests, and same-seam SPEC-31 status note
**Deps**: `archive/specs/SPEC-31-story-contract-hardening-iii.md`

## Problem

At intake, contract `.claude/skills/_shared-templates/story-state-contract.md` declared `created_at_page: null only for global_author_pool`. But `commitment-block-authoring/SKILL.md` wrote `created_at_page: null` for both `direct_batch` and `audit_repair` modes — neither of which is necessarily `global_author_pool` scope. The contract rule keyed off scope visibility; the skill behavior keyed off origin and authoring time.

## Assumption Reassessment (2026-05-15)

1. **Codebase symbols verified**: live contract §4.4 still carried the scope-keyed `created_at_page` comment, and commitment-block-authoring Phase 2 still carried the `null for both modes` comment before this ticket.
2. **Spec assumptions verified**: `archive/specs/SPEC-31-story-contract-hardening-iii.md` §D3 specifies the origin-keyed rule explicitly.
3. **Cross-skill / cross-artifact boundary under audit**: contract §4.4 SLT schema + commitment-block-authoring authorship guidance + validators structural registry. Turn-cycle already had the runtime-JIT sentence at `branching-story-turn-cycle/SKILL.md` Phase 2 (`created_at_page: <new PG id>`, `provenance.origin: runtime_jit`), so no turn-cycle edit was required.
4. **FOUNDATIONS principle under audit (restated)**: §Story Bundles §5b (Schema-Minimalism) — the `created_at_page` field is load-bearing for provenance (page-local creation tracking), not for branch legality. The reformulation keeps the field load-bearing while removing the contradiction.
5. **HARD-GATE / validation-signal check**: read `docs/HARD-GATE-DISCIPLINE.md` because the new structural validator participates in `full-world`, `incremental`, and `pre-apply` validation. The validator is fail-closed for `create_slt_record` patch plans and skipped for unrelated pre-apply plans.

## Architecture Check

1. **Cleaner than alternative**: keying the rule by origin (which the skill already tracks via `provenance.origin`) matches the actual semantics; the existing scope-keyed rule mis-describes the constraint. Branch legality is independently governed by `scope.visibility / branch_id / visible_branch_path_prefix`.
2. **No backwards-compatibility shims**: no production stories; the contract correction is strict from day one.

## Verification Layers

1. **SLT with `origin: runtime_jit` and `created_at_page: null` is rejected** → schema validation (validator test).
2. **SLT with `origin: author_batch` and `created_at_page: null` passes** → schema validation.
3. **Turn-cycle runtime-JIT guidance names `created_at_page: <new PG id>` and `provenance.origin: runtime_jit`** → codebase grep-proof / manual contract review.

## What to Change

### 1. Contract `.claude/skills/_shared-templates/story-state-contract.md` §4.4

Replace `:266`:
```yaml
created_at_page: PG-<integer> | null        # required for provenance.origin: runtime_jit; nullable for page-independent authoring origins
```

Add explanatory paragraph after the SLT field block:
```
`created_at_page` is provenance for page-local creation, not branch scope. For
`provenance.origin: runtime_jit`, it MUST name the page whose turn created the
block. For `bootstrap_seed`, `author_batch`, `manual_authoring`, and
`audit_repair`, it MAY be null when the block is authored outside a page turn.
Branch legality is determined by `scope.visibility`, `scope.branch_id`, and
`scope.visible_branch_path_prefix`, not by `created_at_page`.
```

### 2. Commitment-block-authoring (`commitment-block-authoring/SKILL.md`)

Update Phase 2 schema comment at `:175`:
```yaml
created_at_page: null   # nullable for direct_batch and audit_repair (origin = author_batch or audit_repair, not runtime_jit)
```

Update Phase 3 gate 1 (or equivalent) to validate origin/scope consistency.

### 3. Turn-cycle (`branching-story-turn-cycle/SKILL.md`)

The runtime-JIT SLT creation path already sets `created_at_page: <new PG id>` and `provenance.origin: runtime_jit`; no edit was required.

### 4. New validator `tools/validators/src/structural/slt-created-at-page-origin-consistency.ts`

- `origin == runtime_jit` → `created_at_page` MUST be `PG-<integer>` (non-null, matching pattern).
- `origin ∈ {bootstrap_seed, author_batch, manual_authoring, audit_repair}` → `created_at_page` MAY be null.
- Emit `slt_created_at_page_origin_mismatch` (severity: fail) on violation.

### 5. Register the rule in `tools/validators/src/public/registry.ts`.

### 6. Keep validator inventory/proof surfaces current

Update the validators README, structural registry expected list, SPEC-04 validator-count assertions, and clean pre-apply execution-status test so the added structural validator is visible and skipped/passed in the correct modes.

## Files to Touch

- `.claude/skills/_shared-templates/story-state-contract.md` (modify — §4.4)
- `.claude/skills/commitment-block-authoring/SKILL.md` (modify — Phase 2, Phase 3)
- `tools/validators/src/structural/slt-created-at-page-origin-consistency.ts` (new)
- `tools/validators/src/public/registry.ts` (modify — register)
- `tools/validators/tests/structural/slt-created-at-page-origin-consistency.test.ts` (new)
- `tools/validators/tests/structural/registry.test.ts` (modify — expected structural list)
- `tools/validators/tests/integration/spec04-verification.test.ts` (modify — validator counts)
- `tools/validators/tests/integration/validate-patch-plan.test.ts` (modify — clean pre-apply skip expectation)
- `tools/validators/README.md` (modify — structural validator inventory)
- `archive/specs/SPEC-31-story-contract-hardening-iii.md` (modify — D3 implementation note)

## Out of Scope

- SLT schema-level enforcement at JSON-schema level — validator-rule level is sufficient.
- Migration of legacy SLT records — none exist.

## Acceptance Criteria

### Tests That Must Pass

1. Validator test: `origin: runtime_jit`, `created_at_page: null` → FAIL.
2. Validator test: `origin: author_batch`, `created_at_page: null` → PASS.
3. Validator test: `origin: bootstrap_seed`, `created_at_page: PG-1` → PASS (page-creation context allowed even for non-JIT origins).
4. Registry and clean pre-apply tests remain current after the new validator is registered.

### Invariants

1. Every runtime-JIT SLT names its creating page.
2. Branch legality determination uses `scope.*` fields only; `created_at_page` is not consulted for visibility decisions.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/slt-created-at-page-origin-consistency.test.ts` — fixtures per Acceptance Criteria and pre-apply selector coverage.
2. `tools/validators/tests/structural/registry.test.ts` — registers the new structural validator.
3. `tools/validators/tests/integration/spec04-verification.test.ts` — updates structural/total validator counts.
4. `tools/validators/tests/integration/validate-patch-plan.test.ts` — confirms unrelated clean pre-apply plans skip the new SLT validator.

### Commands

1. `cd tools/validators && npm run build` → green.
2. `cd tools/validators && node --test dist/tests/structural/slt-created-at-page-origin-consistency.test.js` → green.
3. `cd tools/validators && node --test dist/tests/structural/registry.test.js` → green.
4. `cd tools/validators && node --test dist/tests/integration/spec04-verification.test.js` → green.
5. `cd tools/validators && node --test dist/tests/integration/validate-patch-plan.test.js` → green.
6. `cd tools/validators && npm test` → green.
7. `rg -n 'created_at_page:.*null only for global_author_pool|created_at_page: null   # null for both modes|structuralValidators.length, 11|structuralValidators, ...ruleValidators.*21' .claude/skills tools/validators docs` → no matches.

## Outcome

Completed on 2026-05-15.

The SLT contract now keys `created_at_page` to `provenance.origin`: runtime-JIT storylets must name the creating page, while page-independent authoring origins may leave it null. Commitment-block-authoring now validates its own origin choices instead of relying on the old scope-keyed comment. A new structural validator, `slt_created_at_page_origin_consistency`, enforces the runtime-JIT page requirement and is registered in the validators package, README inventory, registry tests, SPEC-04 count guard, and clean pre-apply execution-status expectations. SPEC-31 now carries a D3 implementation note so the remaining original D3 prose is clearly historical intake context.

Turn-cycle required no edit in this ticket because its runtime-JIT path already states `created_at_page: <new PG id>` and `provenance.origin: runtime_jit`.

## Verification Result

1. `cd tools/validators && npm run build` — PASS.
2. `cd tools/validators && node --test dist/tests/structural/slt-created-at-page-origin-consistency.test.js` — PASS (4 tests).
3. `cd tools/validators && node --test dist/tests/structural/registry.test.js` — PASS (1 test).
4. `cd tools/validators && node --test dist/tests/integration/spec04-verification.test.js` — PASS (9 tests).
5. `cd tools/validators && node --test dist/tests/integration/validate-patch-plan.test.js` — PASS (15 tests).
6. `cd tools/validators && npm test` — PASS (254 tests). Output included npm/node TAP detail and git default-branch hints from temporary test repositories; no failures.
7. `rg -n 'created_at_page:.*null only for global_author_pool|created_at_page: null   # null for both modes|structuralValidators.length, 11|structuralValidators, ...ruleValidators.*21' .claude/skills tools/validators docs` — PASS with no matches.

## Deviations

- Replaced the drafted `pnpm --filter @worldloom/validators test -t ...` proof with the package-local build plus direct compiled `node --test` commands because this repo uses package-local `npm` scripts and compiled `dist/tests/**/*.js` for validators proof.
- Replaced the drafted turn-cycle dry-run proof with manual contract review and grep evidence. There is no executable story-skill dry-run runner in this repo, and the live turn-cycle prose already carried the runtime-JIT `created_at_page` requirement before this ticket.
