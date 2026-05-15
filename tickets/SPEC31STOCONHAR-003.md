# SPEC31STOCONHAR-003: Fix `SLT.created_at_page` origin/scope rule

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `.claude/skills/_shared-templates/story-state-contract.md`, `.claude/skills/commitment-block-authoring/SKILL.md`, `.claude/skills/branching-story-turn-cycle/SKILL.md`, new `tools/validators/src/structural/slt-created-at-page-origin-consistency.ts`, `tools/validators/src/public/registry.ts`
**Deps**: `specs/SPEC-31-story-contract-hardening-iii.md`

## Problem

Contract `.claude/skills/_shared-templates/story-state-contract.md:266` declares `created_at_page: null only for global_author_pool`. But `commitment-block-authoring/SKILL.md:175` writes `created_at_page: null` for both `direct_batch` and `audit_repair` modes — neither of which is `global_author_pool` scope. The contract rule keys off scope visibility; the skill behavior keys off origin and authoring time. The two diverge silently.

## Assumption Reassessment (2026-05-15)

1. **Codebase symbols verified**: contract `:266` and commitment-block-authoring `:175` confirmed at quoted locations during brainstorm verification.
2. **Spec assumptions verified**: `specs/SPEC-31-story-contract-hardening-iii.md` §D3 specifies the origin-keyed rule explicitly.
3. **Cross-skill / cross-artifact boundary under audit**: contract §4.4 SLT schema + 2 skills (commitment-block-authoring authors blocks; turn-cycle creates `runtime_jit` blocks). New validator enforces consistency.
4. **FOUNDATIONS principle under audit (restated)**: §Story Bundles §5b (Schema-Minimalism) — the `created_at_page` field is load-bearing for provenance (page-local creation tracking), not for branch legality. The reformulation keeps the field load-bearing while removing the contradiction.

## Architecture Check

1. **Cleaner than alternative**: keying the rule by origin (which the skill already tracks via `provenance.origin`) matches the actual semantics; the existing scope-keyed rule mis-describes the constraint. Branch legality is independently governed by `scope.visibility / branch_id / visible_branch_path_prefix`.
2. **No backwards-compatibility shims**: no production stories; the contract correction is strict from day one.

## Verification Layers

1. **SLT with `origin: runtime_jit` and `created_at_page: null` is rejected** → schema validation (validator test).
2. **SLT with `origin: author_batch` and `created_at_page: null` passes** → schema validation.
3. **Turn-cycle dry-run creates runtime-JIT SLT with `created_at_page` set** → skill dry-run.

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

In the runtime-JIT SLT creation path, explicitly set `created_at_page: PG-<integer>` (current turn's page id) and `provenance.origin: runtime_jit`. Cite §4.4's rule in the prose.

### 4. New validator `tools/validators/src/structural/slt-created-at-page-origin-consistency.ts`

- `origin == runtime_jit` → `created_at_page` MUST be `PG-<integer>` (non-null, matching pattern).
- `origin ∈ {bootstrap_seed, author_batch, manual_authoring, audit_repair}` → `created_at_page` MAY be null.
- Emit `slt_created_at_page_origin_mismatch` (severity: fail) on violation.

### 5. Register the rule in `tools/validators/src/public/registry.ts`.

## Files to Touch

- `.claude/skills/_shared-templates/story-state-contract.md` (modify — §4.4)
- `.claude/skills/commitment-block-authoring/SKILL.md` (modify — Phase 2, Phase 3)
- `.claude/skills/branching-story-turn-cycle/SKILL.md` (modify — runtime-JIT path)
- `tools/validators/src/structural/slt-created-at-page-origin-consistency.ts` (new)
- `tools/validators/src/public/registry.ts` (modify — register)
- `tools/validators/tests/structural/slt-created-at-page-origin-consistency.test.ts` (new)

## Out of Scope

- SLT schema-level enforcement at JSON-schema level — validator-rule level is sufficient.
- Migration of legacy SLT records — none exist.

## Acceptance Criteria

### Tests That Must Pass

1. Validator test: `origin: runtime_jit`, `created_at_page: null` → FAIL.
2. Validator test: `origin: author_batch`, `created_at_page: null` → PASS.
3. Validator test: `origin: bootstrap_seed`, `created_at_page: PG-1` → PASS (page-creation context allowed even for non-JIT origins).

### Invariants

1. Every runtime-JIT SLT names its creating page.
2. Branch legality determination uses `scope.*` fields only; `created_at_page` is not consulted for visibility decisions.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/slt-created-at-page-origin-consistency.test.ts` — fixtures per Acceptance Criteria.

### Commands

1. `pnpm --filter @worldloom/validators test -t "slt_created_at_page_origin_consistency"` → green.
2. `grep -n "global_author_pool" .claude/skills/_shared-templates/story-state-contract.md` near `:266` → matches reflect the new comment, not the stale rule.
