# SPEC26STOCOHHAR-002: Define bundle_genesis_record / branch_local_record scope vocabulary

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `.claude/skills/_shared-templates/story-state-contract.md` (shared contract), `branching-story-health-audit` and `commitment-block-authoring` skill prose, and possibly `tools/validators/src/rules/rule_storylet_predicate_dsl_parsability.ts`.
**Deps**: None

## Problem

Branch-locality is tested two incompatible ways. `branching-story-health-audit/SKILL.md:168` (`global_author_pool_branch_dependency`) uses a crude "`created_at_page` is non-null" test, while `commitment-block-authoring/SKILL.md:224` correctly recognizes that root-of-tree records (created at `PG-1`, in every branch's `branch_path`) are globally visible. The crude test falsely flags valid global-author-pool `SLT` blocks that reference genesis records (e.g., `SLT-9` referencing `BEL-3` minted at `PG-1`). The contract has no shared term for the distinction, so each consumer re-derives it — and one consumer derives it wrong.

## Assumption Reassessment (2026-05-14)

1. Verified against the current codebase at SPEC-26 Step 2: `branching-story-health-audit/SKILL.md:168` reads "`global_author_pool_branch_dependency` — global-author-pool `SLT` records ... with preconditions referencing branch-local records (records whose `created_at_page` is non-null)."; `commitment-block-authoring/SKILL.md:224` already states the correct semantics — "Root-of-tree records (those created on the root branch BR-1's root page PG-1) ARE in every branch's `branch_path` per shared contract §4.2 and remain visible to global-author-pool blocks". `:167` (`branch_isolation_leak`) uses a distinct sibling-branch test.
2. Verified against `.claude/skills/_shared-templates/story-state-contract.md`: §4.2 documents `branch_path` (line 95) as "ordered list of pages from root to here on this branch; for root page (PG-1) contains exactly [PG-1]" — the canonical anchor for the new definitions. The contract has no current `bundle_genesis_record` / `branch_local_record` term.
3. Cross-skill boundary under audit: the branch-locality concept shared between the contract (§4.2 `branch_path`), `branching-story-health-audit` (the `global_author_pool_branch_dependency` check), and `commitment-block-authoring` (the §Branch-scope legality rule). After this ticket the contract owns the definition and both skills reference it — eliminating the two-derivation drift.
4. FOUNDATIONS principle under audit: Rule 4 (No Globalization by Accident), expressed at story scope by FOUNDATIONS §Story Bundles §5 — "Global author-pool storylets must not reference branch-local record IDs whose `created_at_page` is non-null." The §5 phrasing itself carries the crude formulation; this ticket fixes the contract + skills, and SPEC26STOCOHHAR-009 (D8) reconciles the §5 wording. The corrected test must still reject genuinely branch-local references — sharpening the boundary, not loosening it.
5. Mismatch + correction: `branching-story-health-audit:168`'s "`created_at_page` is non-null" test contradicts `commitment-block-authoring:224`'s correct root-of-tree handling — the same architectural concept tested two ways. Correction — define `bundle_genesis_record` / `branch_local_record` once in the contract; point both skills at the definition; the health-audit test changes from "non-null `created_at_page`" to "references a `branch_local_record`".

## Architecture Check

1. A single contract-owned definition consumed by both skills is cleaner than two independent derivations — it removes the drift class entirely (one consumer cannot be wrong if there is only one definition). `commitment-block-authoring` already has the correct logic inline; lifting it to the contract and replacing the inline copy with a reference is a strict consolidation.
2. No backwards-compatibility aliasing or shims — the crude `created_at_page`-non-null test is replaced outright, not kept as a fallback.

## Verification Layers

1. The contract owns one branch-locality definition -> codebase grep-proof: `bundle_genesis_record` and `branch_local_record` are defined in `story-state-contract.md` and referenced (not re-derived) by `branching-story-health-audit` and `commitment-block-authoring`.
2. The corrected health-audit test no longer false-flags genesis references -> skill dry-run: a `global_author_pool` `SLT` referencing a `PG-1`-minted `BEL` does not raise `global_author_pool_branch_dependency`; a `SLT` referencing a non-root-page record still does.
3. The validator-side branch-locality test (if any) agrees with the contract -> codebase grep-proof + manual review: `rule_storylet_predicate_dsl_parsability.ts` is inspected for its own branch-locality test; if present, it is aligned with the `bundle_genesis_record` definition; if absent, the absence is recorded.
4. (Single-layer not applicable — this is a cross-skill + cross-artifact ticket; the three layers above map the contract-ownership invariant, the false-positive-elimination invariant, and the validator-agreement invariant to distinct proof surfaces.)

## What to Change

### 1. Contract: define the two scope terms

In `.claude/skills/_shared-templates/story-state-contract.md`, near the §4.2 `branch_path` treatment, add:
- `bundle_genesis_record`: a story-bundle record whose `created_at_page` is `PG-1`, where `PG-1` is the `root_page_id` of the root branch. Genesis records sit in every branch's `branch_path` and are visible to all branches unless later superseded or closed.
- `branch_local_record`: a record created after `PG-1` whose `created_at_page` is not in the active `branch_path` (or, for an `SLT`, not in the `visible_branch_path_prefix` authorized for that block).

### 2. health-audit: fix the crude test

In `.claude/skills/branching-story-health-audit/SKILL.md:168`, change `global_author_pool_branch_dependency` to test "preconditions referencing a `branch_local_record`" (per the new contract definition) instead of "records whose `created_at_page` is non-null". Confirm `:167` (`branch_isolation_leak`) needs no change — its sibling-branch test is unaffected by genesis records, since a `PG-1` record's `created_at_page` is on the root branch, not a sibling.

### 3. commitment-block-authoring: replace inline restatement with a reference

In `.claude/skills/commitment-block-authoring/SKILL.md:224`, replace the inline restatement of root-of-tree visibility logic with a reference to the new contract definitions, preserving the worked example (`SLT-9` references `BEL-3` minted at `PG-1`).

### 4. Validator: align any built-in branch-locality test

Inspect `tools/validators/src/rules/rule_storylet_predicate_dsl_parsability.ts` (which gained author-pool / branch-prefix scope checks in SPEC-25 D4). If it encodes its own branch-locality test, align it with the `bundle_genesis_record` definition. If it does not, record that finding in the ticket's completion note — no edit needed.

## Files to Touch

- `.claude/skills/_shared-templates/story-state-contract.md` (modify)
- `.claude/skills/branching-story-health-audit/SKILL.md` (modify)
- `.claude/skills/commitment-block-authoring/SKILL.md` (modify)
- `tools/validators/src/rules/rule_storylet_predicate_dsl_parsability.ts` (modify — only if it encodes a branch-locality test; confirm at implementation)

## Out of Scope

- The `docs/FOUNDATIONS.md` §Story Bundles §5 wording update that carries the crude formulation — that is SPEC26STOCOHHAR-009 (D8).
- Any change to `branch_path` semantics or the `BR` record schema.
- The `branch_isolation_leak` check (`:167`) unless step 2's confirmation finds it affected.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -n 'bundle_genesis_record\|branch_local_record' .claude/skills/_shared-templates/story-state-contract.md` returns the two definitions.
2. `grep -n 'created_at_page.*non-null\|created_at_page.*is non-null' .claude/skills/branching-story-health-audit/SKILL.md` returns no matches (the crude test is gone); `grep -n 'branch_local_record' .claude/skills/branching-story-health-audit/SKILL.md` returns the corrected `global_author_pool_branch_dependency` test.
3. If `tools/validators/` was modified: `cd tools/validators && npm run build && npm run test` passes.

### Invariants

1. Exactly one definition of branch-locality exists in the pipeline (the contract); all consumers reference it rather than re-deriving it.
2. The corrected `global_author_pool_branch_dependency` test rejects genuinely branch-local references while accepting genesis-record references — Rule 4 (No Globalization by Accident) is sharpened, not loosened.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/rules/rule_storylet_predicate_dsl_parsability.test.ts` — modify ONLY if step 4 finds the validator encodes a branch-locality test; add a case proving a genesis-record reference from a global-author-pool block is accepted. If the validator has no such test, no test change is needed.

### Commands

1. `grep -rn 'bundle_genesis_record\|branch_local_record' .claude/skills/_shared-templates/story-state-contract.md .claude/skills/branching-story-health-audit/SKILL.md .claude/skills/commitment-block-authoring/SKILL.md`
2. `cd tools/validators && npm run build && npm run test` (only if `rule_storylet_predicate_dsl_parsability.ts` was modified)
3. The grep in command 1 is the primary verification boundary for the contract + skill prose; the validator build/test in command 2 applies only on the conditional code path.
