# SPEC30STOCONHAR-002: Bootstrap `branch_path` Doc Cleanup

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `.claude/skills/branching-story-bootstrap/SKILL.md` one-line correction
**Deps**: None

## Problem

`.claude/skills/branching-story-bootstrap/SKILL.md:295` says "§4.2's PG schema enumeration omits explicit listing of the field but §4.4 treats it as canonical". This was true under an earlier contract revision. The shared contract at `_shared-templates/story-state-contract.md:97` now lists `branch_path: [PG-<integer>]*` in §4.2 explicitly, with the §4.4 cross-reference noted in the same field comment. The bootstrap note is stale residue that misdirects authors reading the bootstrap before the contract.

## Assumption Reassessment (2026-05-15)

1. Verified `.claude/skills/branching-story-bootstrap/SKILL.md:295` carries the stale wording exactly: `§4.2's PG schema enumeration omits explicit listing of the field but §4.4 treats it as canonical` (inside the `branch_path: ["PG-1"]` bullet).
2. Verified `_shared-templates/story-state-contract.md:97` carries `branch_path: [PG-<integer>]*` as an explicit field on the §4.2 PG schema, with a cross-reference comment to §4.4 already noting the storylet `visible_branch_path_prefix` linkage and the `recursive_reference_closure` authorization rule.
3. Cross-skill / cross-artifact boundary under audit: the bootstrap prose authoritatively references the shared contract §4.2; the stale wording is the only known instance of bootstrap claiming the contract omits a field that the contract in fact includes. No other skill currently mirrors the stale claim (verified by `grep -rn "§4.2's PG schema enumeration omits" .claude/skills/` returning a single hit in bootstrap).
4. FOUNDATIONS principle under audit: Rule 6 (No Silent Retcons) at the documentation surface — bootstrap prose claiming the contract omits a field it includes is a docs-level retcon hazard for future authors (who would assume the contract is silent on `branch_path` membership and improvise).

## Architecture Check

1. Single-line correction at the exact stale location preserves the surrounding prose discipline. Alternative — rewriting the larger paragraph — would touch unrelated content and obscure the diff's intent.
2. No backwards-compatibility shim: the old wording disappears outright.

## Verification Layers

1. Stale-wording removal → codebase grep-proof: `grep -rn "§4.2's PG schema enumeration omits" .claude/skills/` returns ZERO matches after the edit.
2. New-wording presence → codebase grep-proof: `grep -n "Required by §4.2 of the shared contract" .claude/skills/branching-story-bootstrap/SKILL.md` returns exactly one hit at the corrected line.
3. Single-layer ticket: this is a documentation-only correction; no validator surface, no schema surface, no behavior change. Additional layer mapping is not applicable.

## What to Change

### 1. Bootstrap line 295 rewrite

In `.claude/skills/branching-story-bootstrap/SKILL.md` around line 295, replace the `§4.2's PG schema enumeration omits explicit listing of the field but §4.4 treats it as canonical` clause within the `branch_path: ["PG-1"]` bullet with: *"Required by §4.2 of the shared contract; §4.4 documents the cross-reference into `SLT.scope.visible_branch_path_prefix` and the `recursive_reference_closure` validator's authorization rule."* Preserve the rest of the bullet (the prefix prose about appending PG ids on subsequent turns) unchanged.

## Files to Touch

- `.claude/skills/branching-story-bootstrap/SKILL.md` (modify — one-bullet correction at ~line 295)

## Out of Scope

- Any other rewrite of bootstrap Phase 6 prose.
- Any change to the shared contract.
- Any change to `recursive_reference_closure` validator behavior or comments.
- Any other stale-doc sweep (this ticket is surgical; sibling drift, if any, lands in separate tickets).

## Acceptance Criteria

### Tests That Must Pass

1. `grep -rn "§4.2's PG schema enumeration omits" .claude/skills/` returns ZERO matches.
2. `grep -n "Required by §4.2 of the shared contract" .claude/skills/branching-story-bootstrap/SKILL.md` returns exactly one hit on the corrected bullet.

### Invariants

1. Bootstrap prose claims about contract §4.2 PG schema enumeration are accurate to the actual contract state.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `grep -rn "§4.2's PG schema enumeration omits" .claude/skills/`
2. `grep -n "Required by §4.2 of the shared contract" .claude/skills/branching-story-bootstrap/SKILL.md`
3. A narrower, file-targeted grep is the correct verification boundary because the change is intentionally surgical and full-pipeline tests have no behavior surface to exercise.
