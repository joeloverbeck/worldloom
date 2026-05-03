# SFPC-001: Revert `story-fact-promotion-to-canon` interim fallbacks after MCPENH-018 + MCPENH-019 land

**Status**: PENDING
**Priority**: LOW
**Effort**: Small
**Engine Changes**: None — skill-prose-only ticket. Touches `.claude/skills/story-fact-promotion-to-canon/SKILL.md` exclusively.
**Deps**: `archive/tickets/MCPENH-018-add-sp-id-class-to-allocator.md` (completed — Pre-flight Step 6 fallback removal depends on `SP` id_class being live in `mcp__worldloom__allocate_next_id`); `tickets/MCPENH-019-register-story-fact-promotion-task-type.md` (must land first — Pre-flight Step 7 fallback removal depends on `story_fact_promotion_to_canon` being live in `TASK_TYPES`)

## Problem

`story-fact-promotion-to-canon` shipped under Shape A (per the gap-filler interview's Deferred-infrastructure-architecture decision): with manual-scan + interim-task_type fallbacks plus `Guardrails §Known integration debt` disclosures naming the prerequisite tickets. The skill is fully functional under those fallbacks, but the SKILL.md prose carries forward-compatible wording committing to the post-landing stance ("allocate `SP-NNNN` via `mcp__worldloom__allocate_next_id(...)` once `MCPENH-018-add-sp-id-class-to-allocator` lands; until then, manual scan...").

Once both `MCPENH-018-add-sp-id-class-to-allocator` and `MCPENH-019-register-story-fact-promotion-task-type` land, the interim fallback prose becomes stale: a maintainer reading the SKILL.md sees instructions to fall back to a manual scan when the live allocator is now available, which is misleading and could lead to unnecessary inconsistency.

This ticket performs the post-landing prose cleanup in the skill — removing the manual-scan fallback at Pre-flight Step 6, removing the `task_type='canon_addition'` interim at Pre-flight Step 7 + World-State Prerequisites, and removing the corresponding three entries from `Guardrails §Known integration debt` (this ticket itself becomes a no-op once executed, so the SFPC-001 entry is also removed at the same time).

## Assumption Reassessment (2026-05-03)

1. The skill's interim-fallback prose is concentrated in:
   - HARD-GATE block §(a): `until then a manual scan of ... is the documented fallback`.
   - World-State Prerequisites: the `task_type='story_fact_promotion_to_canon'` paragraph carries the `Until the task_type registers, fall back to task_type='canon_addition'` clause.
   - Pre-flight Check Step 6: `Until then, manual scan ... allocate next + 1`.
   - Pre-flight Check Step 7: `Until then, fall back to task_type='canon_addition'`.
   - Guardrails §Known integration debt: three bulleted entries naming MCPENH-018, MCPENH-019, and SFPC-001.
   - FOUNDATIONS Alignment table, Tooling Recommendation row: `via mcp__worldloom__get_context_packet(task_type='story_fact_promotion_to_canon') once MCPENH-019 lands; until then task_type='canon_addition' fallback`.
2. Removing the interim prose preserves the post-landing committed instruction unchanged in every site (the forward-compatible-prose framing was chosen specifically to make this ticket trivial). The diff is delete-only.
3. Cross-skill / cross-artifact boundary: this ticket touches ONE file (`.claude/skills/story-fact-promotion-to-canon/SKILL.md`). No sibling skill, no template, no example, no test, no validator, no doc.
4. Reverting the `Guardrails §Known integration debt` section means deleting the three bullets and (a) replacing with a stub note like "No outstanding integration debt at this time. — 2026-MM-DD" OR (b) deleting the section header entirely (the Guardrails section reads cleanly without a "Known integration debt" sub-section). Recommend (b) — the section's purpose was to track active debt; with no debt, the section is noise.
5. The skill's example file (`examples/sf-promotion-example.md`) cites the manual-scan fallback in the Pre-flight Trace narrative ("manual scan fallback used (MCPENH-018 not yet landed) ✓"). This ticket should also update that line to reflect the post-landing reality OR replace with "(SP-0001 allocated via mcp__worldloom__allocate_next_id ✓)" — the example narrative is illustrative, not normative; either approach works but the cleaner choice is to update the example so future readers don't think the fallback is current.
6. No FOUNDATIONS principle changes; no canon-write semantics change; no HARD-GATE wording change.

## Architecture Check

1. Skill-prose cleanup is the cheapest path: a delete-only diff that removes stale fallback wording without changing any committed instruction. Alternative (rewriting the prose to remove fallback narrative entirely from the start) would have required predicting the landing order of MCPENH-018 + MCPENH-019 ahead of time, which is what the forward-compatible-prose discipline was designed to avoid.
2. No backwards-compatibility shim: the live allocator + live task_type are the only correct invocations after the prerequisites land. A maintainer running this skill against an older `tools/world-mcp` checkout (pre-MCPENH-018 + pre-MCPENH-019) would see `mcp__worldloom__allocate_next_id` return an "Unsupported id_class 'SP'" error, which is the correct failure mode (it tells the user to land the prerequisites or use a newer tools checkout).

## Verification Layers

1. **MCPENH-018 has landed (status: COMPLETED)** → `archive/tickets/MCPENH-018-add-sp-id-class-to-allocator.md` exists with `Status: COMPLETED`.
2. **MCPENH-019 has landed (status: COMPLETED)** → same as above for MCPENH-019.
3. **`mcp__worldloom__allocate_next_id(world_slug, 'SP', story_slug=...)` returns a valid SP-NNNN** → live allocator test against the deployed `tools/world-mcp`.
4. **`mcp__worldloom__get_context_packet(task_type='story_fact_promotion_to_canon', ...)` returns a valid packet** → live context-packet test.
5. **Skill-prose cleanup leaves no `Until` / `until then` / `fallback` language tied to MCPENH-018 / MCPENH-019** → grep `.claude/skills/story-fact-promotion-to-canon/SKILL.md` for `MCPENH-018`, `MCPENH-019`, `manual scan`, `task_type='canon_addition'` (in the fallback context — distinct from the substantive references that may legitimately remain elsewhere).
6. **Example file aligned** → `.claude/skills/story-fact-promotion-to-canon/examples/sf-promotion-example.md` no longer claims "MCPENH-018 not yet landed."

## What to Change

### 1. Edit HARD-GATE block §(a)

Remove the clause "; until then a manual scan of `worlds/<world-slug>/stories/<story-slug>/story-promotions/SP-*.md` is the documented fallback (see Guardrails §Known integration debt)" — leaving only the `mcp__worldloom__allocate_next_id` instruction.

### 2. Edit World-State Prerequisites — `task_type` paragraph

Remove "once `MCPENH-019-register-story-fact-promotion-task-type` lands" and "Until the task_type registers, fall back to `task_type='canon_addition'` (closest existing match — opportunistic priority for invariants/MR plus optimized governing-world-context for CF/CH/M/OQ retrieval, since the proposal package will be re-routed to canon-addition anyway). See Guardrails §Known integration debt." — leaving only the registered-task_type instruction with its rationale (reserve-priority full bodies for invariants and mystery_reserve).

### 3. Edit Pre-flight Check Step 6

Remove "once `MCPENH-018-add-sp-id-class-to-allocator` lands. Until then, manual scan `worlds/<world-slug>/stories/<story-slug>/story-promotions/SP-*.md` (and the proposal-package sidecar `SP-*-proposal-package.yaml`) for the highest existing SP integer; allocate `next + 1`. See Guardrails §Known integration debt." — leaving only the live allocator instruction.

### 4. Edit Pre-flight Check Step 7

Remove "once `MCPENH-019-register-story-fact-promotion-task-type` lands. Until then, fall back to `task_type='canon_addition'` (closest existing match — opportunistic priority for invariants/MR; the proposal package routes to canon-addition anyway, which uses the same task_type)." — leaving only the live task_type instruction.

### 5. Edit Guardrails §Known integration debt

Delete the entire `Known integration debt` sub-section (header + three bullet entries: MCPENH-018, MCPENH-019, SFPC-001). The Guardrails section's other entries remain unchanged.

### 6. Edit FOUNDATIONS Alignment Tooling Recommendation row

Remove "once MCPENH-019 lands; until then `task_type='canon_addition'` fallback" — leaving only the registered-task_type reference.

### 7. Edit example narrative (`examples/sf-promotion-example.md`)

In the Pre-flight Trace section, change `SP-0001 allocated (first promotion in this story) — manual scan fallback used (MCPENH-018 not yet landed) ✓` to `SP-0001 allocated via mcp__worldloom__allocate_next_id(world_slug='animalia', id_class='SP', story_slug='harborwatch-conspiracy') ✓`.

In the same section, change `World canon loaded via task_type='canon_addition' (MCPENH-019 fallback)` to `World canon loaded via task_type='story_fact_promotion_to_canon'` and update the packet-contents description accordingly (reserve-priority full bodies for invariants and mystery_reserve).

## Files to Touch

- `.claude/skills/story-fact-promotion-to-canon/SKILL.md` (modify)
- `.claude/skills/story-fact-promotion-to-canon/examples/sf-promotion-example.md` (modify)

## Out of Scope

- Any change to `tools/world-mcp/` (covered by MCPENH-018 + MCPENH-019).
- Any change to other skills (this is a single-skill cleanup; sibling skills' references to `story-fact-promotion-to-canon` were already corrected at the skill's compile-time per Procedure §6 sub-step 5(c)).
- Any change to FOUNDATIONS.md (skill-creator never edits FOUNDATIONS; this skill's compile run already verified its alignment without FOUNDATIONS edits).
- Any new validator, hook, or schema (not needed; the prose cleanup does not change semantics).

## Acceptance Criteria

### Tests That Must Pass

1. `grep -n 'MCPENH-018\|MCPENH-019\|manual scan\|until then' .claude/skills/story-fact-promotion-to-canon/SKILL.md` returns no matches in the fallback contexts (matches in unrelated prose are out-of-scope; this ticket's scope is the explicit fallback narrative removal).
2. `grep -n 'MCPENH-018\|MCPENH-019\|fallback' .claude/skills/story-fact-promotion-to-canon/examples/sf-promotion-example.md` returns no matches.
3. The skill, invoked end-to-end against a real story bundle, allocates SP-NNNN via the live allocator and loads world canon via the live task_type without falling back. (Manual dry-run.)

### Invariants

1. The skill's HARD-GATE wording, FOUNDATIONS Alignment table, and Validation Rules section are unchanged in semantic meaning — only the fallback narrative is removed.
2. The Guardrails section retains all non-debt entries; only the `Known integration debt` sub-section is removed.

## Test Plan

### New/Modified Tests

None — documentation-only ticket; verification is grep-based + a manual skill dry-run against a real story bundle (skill-creator-generated skills do not have automated tests in `tools/`; verification is per the Verification Layers above).

### Commands

1. `grep -n 'MCPENH-018\|MCPENH-019\|manual scan\|until then\|fallback' .claude/skills/story-fact-promotion-to-canon/SKILL.md .claude/skills/story-fact-promotion-to-canon/examples/sf-promotion-example.md` (verifies fallback narrative removed).
2. Manual end-to-end skill invocation against a test story bundle (verifies live allocator + live task_type both work; produces a real SP-NNNN.md and a real proposal-package.yaml; canon-addition handoff completes).
