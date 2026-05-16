# SPEC33STOPIPSEV-008: Correct prose-attach "no world-canon retrieval needed" wording

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `.claude/skills/branching-story-prose-attach/SKILL.md` skill-prose update at lines 114 and ~326; no tool/validator/patch-engine changes.
**Deps**: SPEC33STOPIPSEV-006 (the replacement wording cross-references the shared `_shared-templates/persisted-packet-recovery.md` template created by 006).

## Problem

`.claude/skills/branching-story-prose-attach/SKILL.md:114` and the parallel FOUNDATIONS Alignment / Tooling Recommendation row at ~line 326 read: "No world-canon retrieval needed — the plan body inlines all load-bearing canon excerpts." But Phase 3 deterministic check 3 (`forbidden_mystery_resolution`, lines 185-189, after SPEC-32 D1's amendment) retrieves firewall fields via `mcp__worldloom__get_firewall_content(world_slug, m_ids=<plan §11 ids>)` **unless the page plan already inlines the same fields**. The unconditional "no retrieval needed" claim contradicts the conditional retrieval path that runs in standard operation when plan §11 names mysteries that aren't fully inlined.

## Assumption Reassessment (2026-05-16)

1. **Codebase verification of contradictory claim**: live grep of `branching-story-prose-attach/SKILL.md` confirms line 114 and ~line 326 say "No world-canon retrieval needed — the plan body inlines all load-bearing canon excerpts"; lines 185-189 (Phase 3 check 3) confirm conditional `get_firewall_content` retrieval when plan §11 does not inline firewall fields.
2. **Specs/docs cross-reference**: SPEC-33 §D8 names the contradiction; SPEC-32 D1 (archived) is the source of the conditional retrieval at Phase 3 check 3.
3. **Cross-skill boundary**: the shared boundary under audit is the `get_firewall_content` retrieval contract — when plan §11 inlines firewall fields, no retrieval is needed; when plan §11 names mysteries without inlining their firewall fields, retrieval is required. The wording must reflect this conditional path.
4. **FOUNDATIONS principle restatement**: §3 Read Discipline (skill prose must accurately document its retrieval calls; the unconditional "no retrieval needed" claim contradicts the conditional `get_firewall_content` retrieval at Phase 3 check 3). The Deps field declares the cross-template dependency on SPEC33STOPIPSEV-006; landing 008 before 006 would leave the cross-reference dangling.

## Architecture Check

1. The replacement names the conditional retrieval path explicitly — "Targeted `get_firewall_content` retrieval is required when plan §11 does not inline the Mystery Reserve firewall fields" — and threads in the persisted-summary recovery cross-reference for completeness. Cleaner than alternatives that would (a) keep the unconditional "no retrieval needed" claim (continues to mislead skill runners into skipping required retrieval) or (b) remove all references to retrieval from the FOUNDATIONS Alignment row (would obscure the conditional path).
2. No backwards-compatibility aliasing/shims introduced — the wording is corrected without legacy-claim retention.

## Verification Layers

1. The "No world-canon retrieval needed" sentence is removed → codebase grep-proof.
2. The replacement names `get_firewall_content` and the conditional firing on plan §11 inlining → codebase grep-proof.
3. The persisted-summary cross-reference points at the shared template (which SPEC33STOPIPSEV-006 creates) → manual link verification.

## What to Change

### 1. Replace the wording at line 114 and the parallel FOUNDATIONS Alignment / Tooling Recommendation row (~line 326)

In `.claude/skills/branching-story-prose-attach/SKILL.md`, at both line 114 and the FOUNDATIONS Alignment / Tooling Recommendation row (~line 326), replace:

```
No world-canon retrieval needed — the plan body inlines all load-bearing canon excerpts.
```

with:

```
No context-packet retrieval is normally needed because the plan body inlines
the load-bearing canon. Targeted `mcp__worldloom__get_firewall_content`
retrieval is required when plan §11 does not inline the Mystery Reserve
firewall fields used by the `forbidden_mystery_resolution` check (Phase 3
check 3). Persisted-summary recovery still applies if either retrieval
returns `delivery_status: persisted_with_summary` (see
`.claude/skills/_shared-templates/persisted-packet-recovery.md`).
```

Implementer must read the full file and apply at both occurrences — the line numbers are landmarks, not exhaustive. The wording is identical at both sites.

## Files to Touch

- `.claude/skills/branching-story-prose-attach/SKILL.md` (modify — two occurrences)

## Out of Scope

- The `get_firewall_content` MCP tool implementation — already exists and is unchanged.
- Phase 3 check 3 logic — already correctly performs conditional retrieval; not modified.
- The shared `_shared-templates/persisted-packet-recovery.md` template — created by SPEC33STOPIPSEV-006 (this ticket's dependency); not modified here.
- Other prose-attach SKILL.md sections (Phase 3 check 8 promotion-claims, Phase 6 write order) — covered by SPEC33STOPIPSEV-002 (D2) and SPEC33STOPIPSEV-003 (D3). Same-file co-location: this ticket's two edit sites (line 114, ~line 326) are independent of D2's line 213 and D3's Phase 6 block.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -n 'No world-canon retrieval needed' .claude/skills/branching-story-prose-attach/SKILL.md` returns zero matches.
2. `grep -n 'get_firewall_content' .claude/skills/branching-story-prose-attach/SKILL.md` returns matches at lines 114 and ~326 in addition to its existing matches in Phase 3 check 3 (lines 185-189).
3. `grep -n 'persisted-packet-recovery.md' .claude/skills/branching-story-prose-attach/SKILL.md` returns matches at lines 114 and ~326 (cross-reference to the shared template created by SPEC33STOPIPSEV-006).
4. SPEC33STOPIPSEV-006 has landed (verifies the shared template exists at `.claude/skills/_shared-templates/persisted-packet-recovery.md` before the cross-reference is added).

### Invariants

1. Skill prose accurately describes the conditional retrieval path — no unconditional "no retrieval needed" claim that contradicts Phase 3 check 3's conditional `get_firewall_content` call.
2. Cross-references to shared templates resolve to existing files at landing time.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `grep -n 'No world-canon retrieval needed' .claude/skills/branching-story-prose-attach/SKILL.md` — must return zero matches.
2. `grep -cn 'persisted-packet-recovery.md' .claude/skills/branching-story-prose-attach/SKILL.md` — count must be ≥2 (line 114 + ~326).
3. `test -f .claude/skills/_shared-templates/persisted-packet-recovery.md` — must succeed (sanity check that the dependency landed before this ticket).
4. A narrower per-skill grep is the right verification boundary because the cross-reference target is a static file and no functional code path exercises the wording change.
