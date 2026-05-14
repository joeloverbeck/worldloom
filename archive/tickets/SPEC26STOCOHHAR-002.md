# SPEC26STOCOHHAR-002: Define bundle_genesis_record / branch_local_record scope vocabulary

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `.claude/skills/_shared-templates/story-state-contract.md` (shared contract), `branching-story-health-audit` and `commitment-block-authoring` skill prose, plus a SPEC-26 implementation note in `specs/SPEC-26-story-coherence-hardening-ii.md`. `tools/validators/src/rules/rule_storylet_predicate_dsl_parsability.ts` was inspected but not modified.
**Deps**: None

## Problem

At intake, branch-locality was tested two incompatible ways. `branching-story-health-audit/SKILL.md` (`global_author_pool_branch_dependency`) used a crude "`created_at_page` is non-null" test, while `commitment-block-authoring/SKILL.md` correctly recognized that root-of-tree records (created at `PG-1`, in every branch's `branch_path`) are globally visible. The crude test could falsely flag valid global-author-pool `SLT` blocks that reference genesis records (e.g., `SLT-9` referencing `BEL-3` minted at `PG-1`). The shared contract also had no term for the distinction, so each consumer re-derived it.

## Assumption Reassessment (2026-05-14)

1. Historical intake evidence from SPEC-26 Step 2: before this ticket, `branching-story-health-audit/SKILL.md` read "`global_author_pool_branch_dependency` — global-author-pool `SLT` records ... with preconditions referencing branch-local records (records whose `created_at_page` is non-null)."; `commitment-block-authoring/SKILL.md` already stated the correct root-of-tree semantics. `branch_isolation_leak` used and still uses a distinct sibling-branch test.
2. Historical intake evidence from `.claude/skills/_shared-templates/story-state-contract.md`: before this ticket, §4.2 documented `branch_path` as the canonical anchor but had no `bundle_genesis_record` / `branch_local_record` term. This ticket added those terms near the §4.2 `branch_path` treatment.
3. Cross-skill boundary under audit: the branch-locality concept shared between the contract (§4.2 `branch_path`), `branching-story-health-audit` (the `global_author_pool_branch_dependency` check), and `commitment-block-authoring` (the §Branch-scope legality rule). The contract now owns the definition and both skills reference it — eliminating the two-derivation drift.
4. FOUNDATIONS principle under audit: Rule 4 (No Globalization by Accident), expressed at story scope by FOUNDATIONS §Story Bundles §5, still requires global author-pool storylets not to reference branch-local records. `docs/FOUNDATIONS.md` §5 still carries the old wording; SPEC26STOCOHHAR-009 (D8) owns that FOUNDATIONS reconciliation. This ticket sharpened the contract + skill boundary without loosening the rule.
5. Mismatch + correction: before this ticket, `branching-story-health-audit`'s "`created_at_page` is non-null" test contradicted `commitment-block-authoring`'s correct root-of-tree handling. Correction landed — `bundle_genesis_record` / `branch_local_record` are defined once in the contract; both skills reference that definition; the health-audit test now references `branch_local_record`.
6. Implementation check: `tools/validators/src/rules/rule_storylet_predicate_dsl_parsability.ts` has no built-in branch-locality calculation to align. Its only scope check is `requireExistentialScope`, which restricts existential predicates to `global_author_pool` / `branch_prefix_scoped`; it does not inspect `created_at_page`, `branch_path`, or `visible_branch_path_prefix`.
7. User-supplied SPEC-26 reference check: added a dated D2 implementation note to `specs/SPEC-26-story-coherence-hardening-ii.md`; remaining D2 problem/verifier prose in the spec is historical intake context until archival. `docs/FOUNDATIONS.md` remains intentionally stale here because SPEC26STOCOHHAR-009 owns D8.

## Architecture Check

1. A single contract-owned definition consumed by both skills is cleaner than two independent derivations — it removes the drift class entirely (one consumer cannot be wrong if there is only one definition). `commitment-block-authoring` already has the correct logic inline; lifting it to the contract and replacing the inline copy with a reference is a strict consolidation.
2. No backwards-compatibility aliasing or shims — the crude `created_at_page`-non-null test is replaced outright, not kept as a fallback.

## Verification Layers

1. The contract owns one branch-locality definition -> codebase grep-proof: `bundle_genesis_record` and `branch_local_record` are defined in `story-state-contract.md` and referenced by `branching-story-health-audit` and `commitment-block-authoring`.
2. The corrected health-audit prose no longer uses the crude non-null test -> negative grep-proof over `branching-story-health-audit/SKILL.md`; manual contract review confirms genesis references are accepted through the `bundle_genesis_record` definition and genuinely branch-local references still map to `global_author_pool_branch_dependency`.
3. The validator-side branch-locality test, if any, agrees with the contract -> codebase grep-proof + manual review: `rule_storylet_predicate_dsl_parsability.ts` was inspected; no built-in branch-locality test is present, so no validator edit or package test lane applies.
4. (Single-layer not applicable — this is a cross-skill + cross-artifact ticket; the three layers above map the contract-ownership invariant, the false-positive-elimination invariant, and the validator-agreement invariant to distinct proof surfaces.)

## Landed Changes

### 1. Contract: defined the two scope terms

In `.claude/skills/_shared-templates/story-state-contract.md`, near the §4.2 `branch_path` treatment, added:
- `bundle_genesis_record`: a story-bundle record whose `created_at_page` is `PG-1`, where `PG-1` is the `root_page_id` of the root branch. Genesis records sit in every branch's `branch_path` and are visible to all branches unless later superseded or closed.
- `branch_local_record`: a record created after `PG-1` whose `created_at_page` is not in the active `branch_path` (or, for an `SLT`, not in the `visible_branch_path_prefix` authorized for that block).

### 2. health-audit: fixed the crude test

In `.claude/skills/branching-story-health-audit/SKILL.md`, changed `global_author_pool_branch_dependency` to test preconditions referencing a `branch_local_record` per the shared contract definition instead of records whose `created_at_page` is non-null. Confirmed `branch_isolation_leak` needs no change — it remains a distinct sibling-branch active-snapshot check.

### 3. commitment-block-authoring: replaced inline restatement with a reference

In `.claude/skills/commitment-block-authoring/SKILL.md`, replaced the inline root-of-tree visibility restatement with a reference to the new shared contract vocabulary, preserving the worked example (`SLT-9` references `BEL-3` minted at `PG-1`).

### 4. Validator: inspected for branch-locality logic

Inspected `tools/validators/src/rules/rule_storylet_predicate_dsl_parsability.ts`. It does not encode a branch-locality test, so no validator edit was needed.

### 5. SPEC-26 note

Added a dated D2 implementation note to `specs/SPEC-26-story-coherence-hardening-ii.md` because the user explicitly supplied the SPEC-26 reference for this run.

## Files to Touch

- `.claude/skills/_shared-templates/story-state-contract.md` (modify)
- `.claude/skills/branching-story-health-audit/SKILL.md` (modify)
- `.claude/skills/commitment-block-authoring/SKILL.md` (modify)
- `specs/SPEC-26-story-coherence-hardening-ii.md` (modify — D2 implementation note)
- `tools/validators/src/rules/rule_storylet_predicate_dsl_parsability.ts` (inspected only; no edit because it does not encode branch-locality)

## Out of Scope

- The `docs/FOUNDATIONS.md` §Story Bundles §5 wording update that carries the crude formulation — that is SPEC26STOCOHHAR-009 (D8).
- Any change to `branch_path` semantics or the `BR` record schema.
- The `branch_isolation_leak` check; confirmation found it unaffected because it remains a sibling-branch active-snapshot test, not a global-author-pool dependency test.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -n 'bundle_genesis_record\|branch_local_record' .claude/skills/_shared-templates/story-state-contract.md` returns the two definitions.
2. `grep -n 'created_at_page.*non-null\|created_at_page.*is non-null' .claude/skills/branching-story-health-audit/SKILL.md` returns no matches (the crude test is gone); `grep -n 'branch_local_record' .claude/skills/branching-story-health-audit/SKILL.md` returns the corrected `global_author_pool_branch_dependency` test.
3. `rg -n 'branch_path|created_at_page|visible_branch_path_prefix|branch_local|bundle_genesis|branch_prefix|global_author_pool' tools/validators/src/rules/rule_storylet_predicate_dsl_parsability.ts` shows no branch-locality calculation; package build/test is not applicable because no validator source changed.

### Invariants

1. Exactly one definition of branch-locality exists in the pipeline (the contract); all consumers reference it rather than re-deriving it.
2. The corrected `global_author_pool_branch_dependency` test rejects genuinely branch-local references while accepting genesis-record references — Rule 4 (No Globalization by Accident) is sharpened, not loosened.

## Test Plan

### New/Modified Tests

1. None — this was a contract/skill prose ticket; the validator branch was inspected and did not require source or test changes.

### Commands

1. `grep -rn 'bundle_genesis_record\|branch_local_record' .claude/skills/_shared-templates/story-state-contract.md .claude/skills/branching-story-health-audit/SKILL.md .claude/skills/commitment-block-authoring/SKILL.md`
2. `grep -n 'created_at_page.*non-null\|created_at_page.*is non-null' .claude/skills/branching-story-health-audit/SKILL.md` (must return no matches)
3. `rg -n 'branch_path|created_at_page|visible_branch_path_prefix|branch_local|bundle_genesis|branch_prefix|global_author_pool' tools/validators/src/rules/rule_storylet_predicate_dsl_parsability.ts`
4. `git diff --check`
5. The grep commands are the primary verification boundary for the contract + skill prose. The validator build/test lane was not run because the conditional validator code path was not taken.

## Outcome

Completed. The shared story-state contract now defines `bundle_genesis_record` and `branch_local_record`. `branching-story-health-audit` now keys `global_author_pool_branch_dependency` to `branch_local_record` instead of the crude non-null `created_at_page` test. `commitment-block-authoring` now references the shared vocabulary instead of re-deriving root-of-tree visibility inline. SPEC-26 has a dated implementation note marking D2 as landed in this active ticket.

## Verification Result

1. `grep -rn 'bundle_genesis_record\|branch_local_record' .claude/skills/_shared-templates/story-state-contract.md .claude/skills/branching-story-health-audit/SKILL.md .claude/skills/commitment-block-authoring/SKILL.md` returned the contract definitions plus the two consumer references.
2. `grep -n 'created_at_page.*non-null\|created_at_page.*is non-null' .claude/skills/branching-story-health-audit/SKILL.md` returned no matches.
3. `rg -n 'branch_path|created_at_page|visible_branch_path_prefix|branch_local|bundle_genesis|branch_prefix|global_author_pool' tools/validators/src/rules/rule_storylet_predicate_dsl_parsability.ts` returned only the existing `global_author_pool` / `branch_prefix_scoped` existential-predicate scope check, confirming no branch-locality calculation was present.
4. `git diff --check` passed.

## Deviations

1. The drafted skill dry-run was replaced with grep-proof plus manual contract review because the repo does not expose an executable health-audit dry-run harness for this prose skill in the current Codex context.
2. `docs/FOUNDATIONS.md` still carries the crude Story Bundles §5 branch-isolation phrasing by design; SPEC26STOCOHHAR-009 owns D8 FOUNDATIONS reconciliation after its prerequisites land.
3. `tools/validators/src/rules/rule_storylet_predicate_dsl_parsability.ts` and its tests were not modified because the inspected validator has no branch-locality test to align.
