# SPEC33STOPIPSEV-002: Fix prose-attach invalid `PG.SE.promotion_claims[]` path

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — `.claude/skills/branching-story-prose-attach/SKILL.md` skill-prose update; no tool/validator/patch-engine changes.
**Deps**: None

## Problem

`.claude/skills/branching-story-prose-attach/SKILL.md:213` (Phase 3 deterministic check 8 — `canon_claim_without_authority`) references the path `PG.SE.promotion_claims[]`. The PG schema at `_shared-templates/story-state-contract.md` §4.2 does not nest SE. The link from PG to its resolving event is `input.resolved_event_id: SE-<integer>*`. The `promotion_claims[]` field lives on the SE record itself (§4.3 lines 236–238). The path `PG.SE.promotion_claims[]` is not resolvable; the check is un-executable as written. (Line 134 of the same skill — `including plan.plan_hash, state_hash, and SE.promotion_claims[] if any` — is already correct and not in scope; the auditor's drafted A2 would have re-corrected line 134 unnecessarily.)

## Assumption Reassessment (2026-05-16)

1. **Codebase verification of invalid path**: live grep of `branching-story-prose-attach/SKILL.md` confirms line 213 reads `... without corresponding 'PG.SE.promotion_claims[]' evidence ...`; live read of `_shared-templates/story-state-contract.md` §4.2 (PG schema) confirms PG has no nested SE — the link field is `input.resolved_event_id: SE-<integer>*`. The `promotion_claims[]` field lives on SE per §4.3 (lines 236-238).
2. **Specs/docs cross-reference**: this ticket is the narrowed form of audit amendment A2 per SPEC-33 §D2 key design decision — line 134 is already correct (`SE.promotion_claims[]` without `PG.` prefix); only line 213 needs the fix.
3. **Cross-skill boundary**: the shared boundary under audit is the PG↔SE link convention in `_shared-templates/story-state-contract.md` §4.2 (PG input link) and §4.3 (SE schema). The skill prose must name the canonical resolution path (`PG.input.resolved_event_id` → load SE → `SE.promotion_claims[]`).
4. **FOUNDATIONS principle restatement**: §5 Validation Rules at Story Scope (Rule 1 — No Floating Facts: skill prose must name real schema paths per the shared story-state contract).

## Architecture Check

1. The replacement names `PG.input.resolved_event_id` as the resolution path and `SE.promotion_claims[]` as the field's actual host — both schema-canonical. Cleaner than alternatives that would (a) add a nested `SE` block to PG (would violate Schema-Minimalism — SE is a separate record class) or (b) leave the prose pointing at a non-existent path (continues the un-executable check).
2. No backwards-compatibility aliasing/shims introduced — the invalid path is removed without legacy aliases.

## Verification Layers

1. Path resolves to a real schema field → codebase grep-proof (`grep -n 'PG.SE.promotion_claims' branching-story-prose-attach/SKILL.md` returns zero matches; the replacement names `PG.input.resolved_event_id` and `SE.promotion_claims[]`).
2. Line 134 remains untouched → manual review (the auditor's A2 over-correction would have rewritten line 134; this ticket explicitly does not).

## What to Change

### 1. Replace line 213 in prose-attach SKILL.md Phase 3 check 8

In `.claude/skills/branching-story-prose-attach/SKILL.md` (Phase 3 deterministic check 8 — `canon_claim_without_authority`), replace:

```
Any such assertion without corresponding `PG.SE.promotion_claims[]` evidence
```

with:

```
Any such assertion without corresponding `SE.promotion_claims[]` evidence on
the resolving event (loaded via `PG.input.resolved_event_id`)
```

## Files to Touch

- `.claude/skills/branching-story-prose-attach/SKILL.md` (modify)

## Out of Scope

- Line 134 of the same skill (`including plan.plan_hash, state_hash, and SE.promotion_claims[] if any`) — already correct; not in scope. The auditor's drafted A2 would have re-corrected it; this ticket explicitly excludes line 134 per SPEC-33 §D2 key design decision.
- Other prose-attach SKILL.md sections (Phase 6 write order, Phase 3 check 3 forbidden-mystery, FOUNDATIONS Alignment row) — covered by SPEC33STOPIPSEV-003 (D3 Phase 6) and SPEC33STOPIPSEV-008 (D8 retrieval wording).
- SE-record schema or PG-record schema amendments — not proposed; the canonical schemas are correct, only the skill-prose path was wrong.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -n 'PG.SE.promotion_claims' .claude/skills/branching-story-prose-attach/SKILL.md` returns zero matches.
2. `grep -n 'PG.input.resolved_event_id' .claude/skills/branching-story-prose-attach/SKILL.md` returns the replaced sentence at line 213.
3. Line 134's wording remains unchanged (manual visual check or `grep -n 'including .plan.plan_hash., .state_hash., and .SE.promotion_claims'` returns line 134 unchanged).

### Invariants

1. Every cited path in prose-attach Phase 3 check 8 resolves to a real schema field per `_shared-templates/story-state-contract.md` §4.
2. The PG↔SE link convention (`PG.input.resolved_event_id` → SE record) is the canonical resolution path for any SE field referenced from PG context.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `grep -n 'PG.SE.promotion_claims' .claude/skills/branching-story-prose-attach/SKILL.md` — must return zero matches.
2. `grep -n 'PG.input.resolved_event_id' .claude/skills/branching-story-prose-attach/SKILL.md` — must return the replacement at line 213's neighborhood.
3. A narrower command is the right verification boundary because the fix is one sentence; no test runner exercises check-8 prose. The schema canonicity is the proof surface, not test execution.
