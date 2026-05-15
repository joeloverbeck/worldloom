# SPEC32STOCONHAR-004: Fix closeout FOUNDATIONS Alignment retrieval residue

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: `story-promotion-closeout` (skill prose only)
**Deps**: None

## Problem

`.claude/skills/story-promotion-closeout/SKILL.md` contains two passages whose retrieval semantics contradict each other:

- Pre-flight (`:48` HARD-GATE list, `:154` Pre-flight step 5): correctly requires linked CF / CH / PA records to be existence-verified through MCP retrieval — `mcp__worldloom__get_records(record_ids=<linked_cf_ids + linked_ch_ids>)` and `mcp__worldloom__get_record(record_id=<linked_pa_id>)`. This is the post-SPEC-31-D10 state.
- FOUNDATIONS Alignment / Tooling Recommendation row at line 357: states *"Linked canon-addition records loaded via direct file reads (CF / CH / PA paths); no `get_context_packet` retrieval needed since closeout works against direct record paths."* This is the pre-SPEC-31-D10 wording that was not updated when the Pre-flight prose was rewritten.

The phrase "direct file reads" reads naturally as filesystem reads of `_source/canon/CF-<integer>.yaml` etc., which is exactly what SPEC-31 D10 rejected. Future implementers reading the FOUNDATIONS Alignment table for the canonical retrieval shape will see the wrong wording. Closeout is the defense against fake canon-addition outputs; a documentation loophole authorizing filesystem reads weakens that defense even though the Pre-flight code path is correct.

FOUNDATIONS.md §Tooling Recommendation at line 528 requires MCP retrieval for story-pipeline skills reading world-canon: *"Story-pipeline skills (Skill Category 2c) depend on this same MCP retrieval surface for world-canon reads."* The closeout skill is Category 2c per `docs/FOUNDATIONS.md` §Story Bundles §7, so the Tooling Recommendation row must align with this requirement.

## Assumption Reassessment (2026-05-16)

1. Closeout SKILL.md:357 contradiction confirmed by direct grep — the literal text *"Linked canon-addition records loaded via direct file reads (CF / CH / PA paths); no `get_context_packet` retrieval needed since closeout works against direct record paths."* is present at line 357. Pre-flight at :48 (HARD-GATE list) and :154 (Pre-flight step 5) correctly cite `mcp__worldloom__get_records` and `mcp__worldloom__get_record`.
2. FOUNDATIONS §Tooling Recommendation at `docs/FOUNDATIONS.md:528` — *"Story-pipeline skills (Skill Category 2c) depend on this same MCP retrieval surface for world-canon reads."* — already aligns with the corrected wording. No FOUNDATIONS edit is required by this ticket.
3. Cross-skill / cross-artifact boundary: this ticket touches one skill's own FOUNDATIONS Alignment table; no sibling skill mirrors the same row. The skill-internal contradiction between Pre-flight and the alignment table is resolved by rewriting the table row, not by sibling cascade.
4. FOUNDATIONS §Tooling Recommendation (line 510–528): MCP retrieval is non-negotiable for story-pipeline world-canon reads. The corrected wording closes a documentation loophole that authorized filesystem reads; the Pre-flight code path was already correct post-SPEC-31-D10.

## Architecture Check

1. Cleaner than leaving the contradiction in place: a future implementer reading the FOUNDATIONS Alignment table without checking Pre-flight would copy the "direct file reads" wording into a new skill or a sibling ticket, re-opening the SPEC-31 D10 loophole. Aligning the two surfaces eliminates the cross-section contradiction.
2. No backwards-compatibility shims. The change is a single table row replacement; the Pre-flight code path and the patch-engine surfaces are unaffected.

## Verification Layers

1. Closeout SKILL.md:357 FOUNDATIONS Alignment Tooling Recommendation row references MCP retrieval (not direct file reads) → codebase grep-proof (`grep -n "mcp__worldloom__get_records" .claude/skills/story-promotion-closeout/SKILL.md` returns a match in the rewritten row).
2. No occurrence of "direct file reads" remains in the closeout skill → codebase grep-proof (`grep -n "direct file reads" .claude/skills/story-promotion-closeout/SKILL.md` returns no matches).
3. Pre-flight and FOUNDATIONS Alignment are mutually consistent: both prescribe MCP retrieval for linked CF / CH / PA → manual review confirms the alignment row matches the Pre-flight invocations at :48 and :154.

## What to Change

### 1. Replace the Tooling Recommendation row at line 357

Replace the existing FOUNDATIONS Alignment table row in `.claude/skills/story-promotion-closeout/SKILL.md:357` — currently:

```
| Tooling Recommendation | Pre-flight | Linked canon-addition records loaded via direct file reads (CF / CH / PA paths); no `get_context_packet` retrieval needed since closeout works against direct record paths. |
```

with:

```
| Tooling Recommendation | Pre-flight | Linked canon-addition records are loaded read-only through `mcp__worldloom__get_records(record_ids=<linked_cf_ids + linked_ch_ids>, world_slug=<world_slug>)` and per-PA `mcp__worldloom__get_record(record_id=<linked_pa_id>, world_slug=<world_slug>)`. No `get_context_packet` retrieval is needed because the accepted-output ids are known. Direct filesystem reads of `_source/canon/`, `_source/change-log/`, or `adjudications/` are not used for linked-output verification (see Pre-flight step 5). |
```

## Files to Touch

- `.claude/skills/story-promotion-closeout/SKILL.md` (modify — FOUNDATIONS Alignment Tooling Recommendation row at line 357)

## Out of Scope

- FOUNDATIONS.md edit — FOUNDATIONS already requires MCP retrieval at line 528; no amendment needed.
- Pre-flight code-path changes — the Pre-flight invocations at :48 and :154 are already correct (post SPEC-31 D10).
- New validator-fixture directory under `tools/validators/tests/fixtures/story-promotion-closeout/` — no per-skill subdirectory convention exists in the codebase, and the closeout linked-record verification is a skill-level pre-flight check not a structural validator. Per Step 2 Issue 2 disposition: verification is grep-proof on the SKILL.md, not a fixture-driven test.
- Other Tooling Recommendation rows in the same table — only the row at line 357 is updated.
- Sibling skills' FOUNDATIONS Alignment tables — no sibling skill mirrors this specific row's wording.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -n "mcp__worldloom__get_records" .claude/skills/story-promotion-closeout/SKILL.md` returns matches at both Pre-flight (around :48 / :154) AND the rewritten FOUNDATIONS Alignment row (around :357).
2. `grep -n "direct file reads" .claude/skills/story-promotion-closeout/SKILL.md` returns no matches.
3. `grep -nE "Linked canon-addition records are loaded read-only through" .claude/skills/story-promotion-closeout/SKILL.md` returns a match in the rewritten alignment row.
4. `grep -n "see Pre-flight step 5" .claude/skills/story-promotion-closeout/SKILL.md` returns a match in the rewritten alignment row (cross-reference to the Pre-flight code path).

### Invariants

1. Pre-flight code path (the actual retrieval invocations at :48 and :154) remains unchanged.
2. FOUNDATIONS Alignment table now aligns with Pre-flight code path — no cross-section contradiction.
3. Closeout continues to function as the defense against fake canon-addition outputs: linked CF / CH / PA records are existence-verified via MCP before any patch plan is built or submitted.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `grep -n "direct file reads" .claude/skills/story-promotion-closeout/SKILL.md` (must return no matches)
2. `grep -n "mcp__worldloom__get_records" .claude/skills/story-promotion-closeout/SKILL.md` (must return matches at Pre-flight AND alignment row)
3. `grep -nE "Linked canon-addition records are loaded read-only" .claude/skills/story-promotion-closeout/SKILL.md` (confirms rewritten row landed)
