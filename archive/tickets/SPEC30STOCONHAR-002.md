# SPEC30STOCONHAR-002: Bootstrap `branch_path` Doc Cleanup

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `.claude/skills/branching-story-bootstrap/SKILL.md` one-line correction plus SPEC-30 status note
**Deps**: None

## Problem

At intake, `.claude/skills/branching-story-bootstrap/SKILL.md:295` said "§4.2's PG schema enumeration omits explicit listing of the field but §4.4 treats it as canonical". This was true under an earlier contract revision. The shared contract at `_shared-templates/story-state-contract.md:97` already listed `branch_path: [PG-<integer>]*` in §4.2 explicitly, with the §4.4 cross-reference noted in the same field comment. The bootstrap note was stale residue that misdirected authors reading the bootstrap before the contract.

## Assumption Reassessment (2026-05-15)

1. At intake, verified `.claude/skills/branching-story-bootstrap/SKILL.md:295` carried the stale wording exactly: `§4.2's PG schema enumeration omits explicit listing of the field but §4.4 treats it as canonical` (inside the `branch_path: ["PG-1"]` bullet).
2. Verified `_shared-templates/story-state-contract.md:97` carries `branch_path: [PG-<integer>]*` as an explicit field on the §4.2 PG schema, with a cross-reference comment to §4.4 already noting the storylet `visible_branch_path_prefix` linkage and the `recursive_reference_closure` authorization rule.
3. Cross-skill / cross-artifact boundary under audit: the bootstrap prose authoritatively references the shared contract §4.2. At intake, the stale wording was the only active-skill instance of bootstrap claiming the contract omitted a field that the contract in fact includes; after the edit, `grep -rn "§4.2's PG schema enumeration omits" .claude/skills/` returns zero active-skill matches.
4. FOUNDATIONS principle under audit: Rule 6 (No Silent Retcons) at the documentation surface — before this ticket, bootstrap prose claiming the contract omitted a field it includes was a docs-level retcon hazard for future authors (who would assume the contract was silent on `branch_path` membership and improvise).
5. Explicit SPEC-30 reference checked per invocation: `archive/specs/SPEC-30-story-contract-hardening-ii.md` carried D2 as active draft prose at implementation time. Because this ticket landed D2 without rewriting the broader draft spec, closeout added a dated implementation note near the spec header and treated remaining D2 section prose as historical context unless a later ticket owned a full spec rewrite.

## Architecture Check

1. Single-line correction at the exact stale location preserves the surrounding prose discipline. Alternative — rewriting the larger paragraph — would touch unrelated content and obscure the diff's intent.
2. No backwards-compatibility shim: the old wording disappears outright from active skill prose.

## Verification Layers

1. Stale-wording removal → codebase grep-proof: `grep -rn "§4.2's PG schema enumeration omits" .claude/skills/` returns ZERO matches after the edit.
2. New-wording presence → codebase grep-proof: `grep -n "Required by §4.2 of the shared contract" .claude/skills/branching-story-bootstrap/SKILL.md` returns exactly one hit at the corrected line.
3. Single-layer ticket: this is a documentation-only correction; no validator surface, no schema surface, no behavior change. Additional layer mapping is not applicable.

## Landed Changes

### 1. Bootstrap line 295 rewrite

In `.claude/skills/branching-story-bootstrap/SKILL.md` around line 295, replaced the stale `§4.2's PG schema enumeration omits explicit listing of the field but §4.4 treats it as canonical` clause within the `branch_path: ["PG-1"]` bullet with: *"Required by §4.2 of the shared contract; §4.4 documents the cross-reference into `SLT.scope.visible_branch_path_prefix` and the `recursive_reference_closure` validator's authorization rule."* The rest of the bullet, including the prefix prose about appending PG ids on subsequent turns, remains unchanged.

### 2. SPEC-30 D2 implementation note

Added a 2026-05-15 implementation note near the top of `archive/specs/SPEC-30-story-contract-hardening-ii.md` stating that D2 landed via this ticket and that remaining D2 prose is historical specification context unless contradicted by the note.

## Files to Touch

- `.claude/skills/branching-story-bootstrap/SKILL.md` (modify — one-bullet correction at ~line 295)
- `archive/specs/SPEC-30-story-contract-hardening-ii.md` (modify — dated implementation note for D2 closeout)

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

## Outcome

Completion date: 2026-05-15.

Completed. Bootstrap Phase 6 now describes `PG.branch_path` as required by shared contract §4.2 and keeps the §4.4 `SLT.scope.visible_branch_path_prefix` / `recursive_reference_closure` linkage without implying the §4.2 schema omits the field. SPEC-30 also has a D2 implementation note so the draft deliverable section is historical context rather than a current-status claim.

## Verification Result

1. `grep -rn "§4.2's PG schema enumeration omits" .claude/skills/` returned zero matches, proving the stale bootstrap/skill wording was removed from active skills.
2. `grep -n "Required by §4.2 of the shared contract" .claude/skills/branching-story-bootstrap/SKILL.md` returned exactly one hit at the corrected `branch_path` bullet.
3. Manual review confirmed `archive/specs/SPEC-30-story-contract-hardening-ii.md` carries a dated D2 implementation note and that the remaining D2 prose is explicitly historical under that note.

## Deviations

1. The user supplied `specs/SPEC-30*` as an explicit authority, so this run added `archive/specs/SPEC-30-story-contract-hardening-ii.md` to the touched file set for a dated implementation note. The original ticket listed only the bootstrap skill file.
2. The accepted stale-wording removal proof remains scoped to `.claude/skills/`. The old phrase remains in this completed ticket and in SPEC-30 D2 as labelled historical intake/specification context.
