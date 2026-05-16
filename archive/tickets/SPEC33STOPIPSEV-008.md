# SPEC33STOPIPSEV-008: Correct prose-attach "no world-canon retrieval needed" wording

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `.claude/skills/branching-story-prose-attach/SKILL.md` skill-prose update at lines 114 and ~326 plus a SPEC-33 implementation note; no tool/validator/patch-engine changes.
**Deps**: archive/tickets/SPEC33STOPIPSEV-006.md (the replacement wording cross-references the shared `_shared-templates/persisted-packet-recovery.md` template created by 006).

## Problem

At intake, `.claude/skills/branching-story-prose-attach/SKILL.md:114` and the parallel FOUNDATIONS Alignment / Tooling Recommendation row at ~line 326 read: "No world-canon retrieval needed — the plan body inlines all load-bearing canon excerpts." But Phase 3 deterministic check 3 (`forbidden_mystery_resolution`, lines 185-189, after SPEC-32 D1's amendment) retrieves firewall fields via `mcp__worldloom__get_firewall_content(world_slug, m_ids=<plan §11 ids>)` **unless the page plan already inlines the same fields**. The unconditional "no retrieval needed" claim contradicted the conditional retrieval path that runs in standard operation when plan §11 names mysteries that aren't fully inlined.

## Assumption Reassessment (2026-05-16)

1. **Codebase verification of contradictory claim**: live grep of `branching-story-prose-attach/SKILL.md` confirms line 114 and ~line 326 say "No world-canon retrieval needed — the plan body inlines all load-bearing canon excerpts"; lines 185-189 (Phase 3 check 3) confirm conditional `get_firewall_content` retrieval when plan §11 does not inline firewall fields.
2. **Specs/docs cross-reference**: SPEC-33 §D8 names the contradiction; SPEC-32 D1 (archived) is the source of the conditional retrieval at Phase 3 check 3.
3. **Cross-skill boundary**: the shared boundary under audit is the `get_firewall_content` retrieval contract — when plan §11 inlines firewall fields, no retrieval is needed; when plan §11 names mysteries without inlining their firewall fields, retrieval is required. The wording must reflect this conditional path.
4. **FOUNDATIONS principle restatement**: §3 Read Discipline (skill prose must accurately document its retrieval calls; the unconditional "no retrieval needed" claim contradicts the conditional `get_firewall_content` retrieval at Phase 3 check 3). The Deps field declares the cross-template dependency on archive/tickets/SPEC33STOPIPSEV-006.md; landing 008 before 006 would have left the cross-reference dangling.

## Architecture Check

1. The replacement names the conditional retrieval path explicitly — "Targeted `get_firewall_content` retrieval is required when plan §11 does not inline the Mystery Reserve firewall fields" — and threads in the persisted-summary recovery cross-reference for completeness. Cleaner than alternatives that would (a) keep the unconditional "no retrieval needed" claim (continues to mislead skill runners into skipping required retrieval) or (b) remove all references to retrieval from the FOUNDATIONS Alignment row (would obscure the conditional path).
2. No backwards-compatibility aliasing/shims introduced — the wording is corrected without legacy-claim retention.

## Verification Layers

1. The "No world-canon retrieval needed" sentence is removed → codebase grep-proof.
2. The replacement names `get_firewall_content` and the conditional firing on plan §11 inlining → codebase grep-proof.
3. The persisted-summary cross-reference points at the shared template (created by archive/tickets/SPEC33STOPIPSEV-006.md) → manual link verification.

## Landed Changes

### 1. Replaced the wording at line 114 and the parallel FOUNDATIONS Alignment / Tooling Recommendation row (~line 326)

In `.claude/skills/branching-story-prose-attach/SKILL.md`, line 114 and the FOUNDATIONS Alignment / Tooling Recommendation row now say that context-packet retrieval is normally unnecessary because the plan body inlines load-bearing canon, while targeted `mcp__worldloom__get_firewall_content` retrieval is required when plan §11 does not inline the Mystery Reserve firewall fields used by Phase 3 check 3.

Both replacements also point to `.claude/skills/_shared-templates/persisted-packet-recovery.md` for persisted-summary recovery. The final wording uses "if retrieval returns `delivery_status: persisted_with_summary`" rather than the drafted "either retrieval" phrasing, because the live shared template is the authority for persisted-summary recovery behavior.

## Files to Touch

- `.claude/skills/branching-story-prose-attach/SKILL.md` (modify — two occurrences)
- `specs/SPEC-33-story-pipeline-seventh-iteration-fixes.md` (modify — D8 implementation note)

## Out of Scope

- The `get_firewall_content` MCP tool implementation — already exists and is unchanged.
- Phase 3 check 3 logic — already correctly performs conditional retrieval; not modified.
- The shared `_shared-templates/persisted-packet-recovery.md` template — created by archive/tickets/SPEC33STOPIPSEV-006.md (this ticket's dependency); not modified here.
- Other prose-attach SKILL.md sections (Phase 3 check 8 promotion-claims, Phase 6 write order) — covered by archive/tickets/SPEC33STOPIPSEV-002.md (D2) and archive/tickets/SPEC33STOPIPSEV-003.md (D3). Same-file co-location: this ticket's two edit sites (line 114, ~line 326) are independent of D2's line 213 and D3's Phase 6 block.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -n 'No world-canon retrieval needed' .claude/skills/branching-story-prose-attach/SKILL.md` returns zero matches.
2. `grep -n 'get_firewall_content' .claude/skills/branching-story-prose-attach/SKILL.md` returns matches at line 114, Phase 3 check 3 / related Rule 7 prose, and the Tooling Recommendation row.
3. `grep -cn 'persisted-packet-recovery.md' .claude/skills/branching-story-prose-attach/SKILL.md` returns 3 (line 114, the existing Pre-flight recovery block, and the Tooling Recommendation row).
4. `test -f .claude/skills/_shared-templates/persisted-packet-recovery.md` succeeds, confirming archive/tickets/SPEC33STOPIPSEV-006.md's shared template dependency exists.

### Invariants

1. Skill prose accurately describes the conditional retrieval path — no unconditional "no retrieval needed" claim that contradicts Phase 3 check 3's conditional `get_firewall_content` call.
2. Cross-references to shared templates resolve to existing files at landing time.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `grep -n 'No world-canon retrieval needed' .claude/skills/branching-story-prose-attach/SKILL.md` — must return zero matches.
2. `grep -cn 'persisted-packet-recovery.md' .claude/skills/branching-story-prose-attach/SKILL.md` — count must be 3 (line 114 + the existing Pre-flight recovery block + the Tooling Recommendation row).
3. `test -f .claude/skills/_shared-templates/persisted-packet-recovery.md` — must succeed (sanity check that the dependency landed before this ticket).
4. A narrower per-skill grep is the right verification boundary because the cross-reference target is a static file and no functional code path exercises the wording change.

## Outcome

Completed: 2026-05-16

Updated `.claude/skills/branching-story-prose-attach/SKILL.md` at the World-State Prerequisites paragraph and the FOUNDATIONS Alignment / Tooling Recommendation row. Both sites now preserve the no-normal-context-packet-retrieval point while documenting the conditional `mcp__worldloom__get_firewall_content` call required when plan §11 does not inline Mystery Reserve firewall fields.

Added a dated D8 implementation note to `specs/SPEC-33-story-pipeline-seventh-iteration-fixes.md` so the active spec no longer reads as if the D8 contradiction is still current after this ticket lands.

## Verification Result

1. `grep -n 'No world-canon retrieval needed' .claude/skills/branching-story-prose-attach/SKILL.md` returned no matches (exit 1, expected for this negative proof).
2. `grep -n 'get_firewall_content' .claude/skills/branching-story-prose-attach/SKILL.md` returned the new line 114 and Tooling Recommendation row matches, plus the existing Phase 3 / Rule 7 references.
3. `grep -cn 'persisted-packet-recovery.md' .claude/skills/branching-story-prose-attach/SKILL.md` returned `3`.
4. `test -f .claude/skills/_shared-templates/persisted-packet-recovery.md` succeeded.

## Deviations

The landed wording uses "if retrieval returns `delivery_status: persisted_with_summary`" instead of the drafted "if either retrieval returns" phrase. This keeps the prose aligned with the live shared recovery template while still linking the corrected retrieval description to persisted-summary recovery.
