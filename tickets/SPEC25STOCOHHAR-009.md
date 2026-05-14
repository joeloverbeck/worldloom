# SPEC25STOCOHHAR-009: story-promotion-closeout BR-supersession cleanup

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — modifies `.claude/skills/story-promotion-closeout/SKILL.md` only; no schema, MCP, or validator change.
**Deps**: None

## Problem

`story-promotion-closeout` SKILL.md references "supersede a `BR`" in Phase 2 branch-handling (the `flag` and `archive` bullets), lists `BR-<integer>` (supersession) in its Output table, and lists `create_br_record` for branch supersession in Phase 5. But `BR`'s schema (contract §4.5.11) has no `supersedes` field, and the contract states "Branches fork; they do not supersede." This is dead / impossible logic that should be struck.

## Assumption Reassessment (2026-05-14)

1. `.claude/skills/story-promotion-closeout/SKILL.md` references the BR-supersession path at: line 123 (the Output-table `BR-<integer>` (supersession) row), lines 204-205 (the Phase 2 `flag` / `archive` bullets — "supersede a `BR` only if an existing §4.5.11 field such as `description` must change"), and line 276 (the Phase 5 op list includes `create_br_record` "for branch supersessions"). The skill already states the lawful alternative: "otherwise branch disposition is ledger/INDEX-only."
2. Contract §4.5.11 `BR` schema (line 507) has fields `id`, `story_id`, `created_at_page`, `label`, `description`, `parent_branch_id`, `forked_at_page_id`, `root_page_id` — no `supersedes` field. Contract line 509 states "Branches fork; they do not supersede." Confirmed against SPEC-25 D6.
3. Cross-skill boundary under audit: `story-promotion-closeout` is the only skill referencing BR-*supersession*. `create_br_record` itself remains a valid patch-engine op (registered in `tools/patch-engine/src/ops/create-story-record.ts` and the `envelope/schema.ts` op-kind enum) — used for branch *forking* by `branching-story-turn-cycle`. This ticket removes only `story-promotion-closeout`'s use of `create_br_record` for *supersession*, not the op.
4. FOUNDATIONS Rule 6 (No Silent Retcons): restated before trusting the spec — this is a retcon of skill behavior, removing a documented-but-impossible code path. Retcon justification: the BR-supersession path was never executable (`BR` has no `supersedes` field; the contract forbids branch supersession), so striking it removes dead instructions and aligns the skill with the §4.5.11 schema and the "branches fork; they do not supersede" contract statement. New behavior: branch disposition under `flag` / `archive` is recorded in the closeout ledger and `INDEX.md` (and per-world `stories/INDEX.md` for `archive`) — a path the skill already supports.
5. Rename / removal blast radius (FOUNDATIONS Rule 6 enforcement — confirming the removal is fully scoped): grepping the pipeline for `create_br_record` in a closeout / supersession context — only `story-promotion-closeout/SKILL.md:276` uses it for supersession; `branching-story-turn-cycle` and the patch engine use `create_br_record` for *forking*, which is unaffected. No schema, MCP, or validator surface references BR-supersession. The blast radius is contained to one SKILL.md file.

## Architecture Check

1. Striking the dead logic outright — rather than leaving it behind the "only if an existing §4.5.11 field must change" caveat — aligns the skill with the §4.5.11 schema reality: a `BR` carries only fork-lineage fields, none of which a supersession would meaningfully amend, so the caveat described an impossible case.
2. No shims: the BR-supersession path is removed outright, not left behind a feature flag, conditional, or deprecation note.

## Verification Layers

1. `story-promotion-closeout` SKILL.md contains no "supersede a `BR`" reference -> grep-proof.
2. `story-promotion-closeout` SKILL.md lists no `create_br_record` op and no `BR-<integer>` (supersession) Output-table row -> grep-proof.
3. Branch disposition under `flag` / `archive` is ledger / `INDEX.md`-only -> manual review of the revised Phase 2 bullets.

## What to Change

### 1. Phase 2 flag / archive bullets

Strike the "supersede a `BR` only if ..." clauses from the `flag` and `archive` bullets (lines 204-205). Branch disposition is recorded in the closeout ledger and bundle `INDEX.md` (and the per-world `stories/INDEX.md` for `archive`).

### 2. Output table

Remove the `BR-<integer>` (supersession) row from the Output table (line 123).

### 3. Phase 5 op list

Remove `create_br_record` from the Phase 5 patch-plan op list (line 276).

## Files to Touch

- `.claude/skills/story-promotion-closeout/SKILL.md` (modify)

## Out of Scope

- The `create_br_record` patch-engine op itself — it remains valid for branch *forking* (`branching-story-turn-cycle`).
- P0 #4 `SCX` crosslink record and P0 #5 `BRSTAT` branch-status record — rejected by SPEC-25 §Out of Scope (structural).
- Any `BR` schema change — `BR` correctly has no `supersedes` field; the schema is already right.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -nE "supersede a .BR.|BR-<integer>.*supersession|create_br_record" .claude/skills/story-promotion-closeout/SKILL.md` returns no matches.
2. Manual review: the Phase 2 `flag` / `archive` bullets describe ledger / `INDEX.md`-only branch disposition with no supersession path.
3. `grep -rn "create_br_record" .claude/skills/` — `branching-story-turn-cycle` (fork) usage remains; `story-promotion-closeout` has none.

### Invariants

1. `story-promotion-closeout` describes no BR-supersession path.
2. `create_br_record` is referenced by the pipeline only for branch forking, never for supersession.

## Test Plan

### New/Modified Tests

None — skill-prose ticket (no automated test files change); verification is grep-proof + manual review of the revised Phase 2 bullets.

### Commands

1. `grep -nE "supersede a .BR.|create_br_record|BR-<integer>" .claude/skills/story-promotion-closeout/SKILL.md`
2. `grep -rn "create_br_record" .claude/skills/`
3. A grep-proof is the correct verification boundary — this is a skill-prose deletion with no schema, MCP, or validator surface, and FOUNDATIONS Rule 6 attribution lives in this ticket's Assumption Reassessment item 4.
