# SFPC-001: Revert `story-fact-promotion-to-canon` interim fallbacks after MCPENH-018 + MCPENH-019 land

**Status**: COMPLETED
**Priority**: LOW
**Effort**: Small
**Engine Changes**: None — skill-prose-only ticket. Touches `.claude/skills/story-fact-promotion-to-canon/SKILL.md` and its worked example.
**Deps**: `archive/tickets/MCPENH-018-add-sp-id-class-to-allocator.md` (completed — Pre-flight Step 6 fallback removal depends on `SP` id_class being live in `mcp__worldloom__allocate_next_id`); `archive/tickets/MCPENH-019-register-story-fact-promotion-task-type.md` (completed — Pre-flight Step 7 fallback removal depends on `story_fact_promotion_to_canon` being live in `TASK_TYPES`)

## Problem

`story-fact-promotion-to-canon` shipped under Shape A (per the gap-filler interview's Deferred-infrastructure-architecture decision): with manual-scan + interim-task_type fallbacks plus `Guardrails §Known integration debt` disclosures naming the prerequisite tickets. The skill is fully functional under those fallbacks, but the SKILL.md prose carries forward-compatible wording committing to the post-landing stance ("allocate `SP-NNNN` via `mcp__worldloom__allocate_next_id(...)` once `MCPENH-018-add-sp-id-class-to-allocator` lands; until then, manual scan...").

At intake, both `MCPENH-018-add-sp-id-class-to-allocator` and `MCPENH-019-register-story-fact-promotion-task-type` had landed, so the interim fallback prose was stale: a maintainer reading the SKILL.md saw instructions to fall back to a manual scan when the live allocator was already available, which was misleading and could lead to unnecessary inconsistency.

This ticket performed the post-landing prose cleanup in the skill — removing the manual-scan fallback at Pre-flight Step 6, removing the `task_type='canon_addition'` interim at Pre-flight Step 7 + World-State Prerequisites, and removing the corresponding three entries from `Guardrails §Known integration debt` (including the SFPC-001 entry).

## Assumption Reassessment (2026-05-03)

1. The skill's interim-fallback prose is concentrated in:
   - HARD-GATE block §(a): `until then a manual scan of ... is the documented fallback`.
   - World-State Prerequisites: the `task_type='story_fact_promotion_to_canon'` paragraph carries the `Until the task_type registers, fall back to task_type='canon_addition'` clause.
   - Pre-flight Check Step 6: `Until then, manual scan ... allocate next + 1`.
   - Pre-flight Check Step 7: `Until then, fall back to task_type='canon_addition'`.
   - Guardrails §Known integration debt: three bulleted entries naming MCPENH-018, MCPENH-019, and SFPC-001.
   - FOUNDATIONS Alignment table, Tooling Recommendation row: `via mcp__worldloom__get_context_packet(task_type='story_fact_promotion_to_canon') once MCPENH-019 lands; until then task_type='canon_addition' fallback`.
2. Removing the interim prose preserves the post-landing committed instruction unchanged in every site (the forward-compatible-prose framing was chosen specifically to make this ticket small). The skill change deletes or shortens stale fallback text; the example change updates illustrative Pre-flight Trace wording to the live allocator/task_type path.
3. Cross-skill / cross-artifact boundary: this ticket touches one skill file (`.claude/skills/story-fact-promotion-to-canon/SKILL.md`) and its worked example (`.claude/skills/story-fact-promotion-to-canon/examples/sf-promotion-example.md`). No sibling skill, template, test, validator, or repo doc changes are owned.
4. Reverting the `Guardrails §Known integration debt` section means deleting the three bullets and (a) replacing with a stub note like "No outstanding integration debt at this time. — 2026-MM-DD" OR (b) deleting the section header entirely (the Guardrails section reads cleanly without a "Known integration debt" sub-section). Recommend (b) — the section's purpose was to track active debt; with no debt, the section is noise.
5. At intake, the skill's example file (`examples/sf-promotion-example.md`) cited the manual-scan fallback in the Pre-flight Trace narrative ("manual scan fallback used (MCPENH-018 not yet landed) ✓"). The landed update replaces that narrative with the live `mcp__worldloom__allocate_next_id` call and registered `story_fact_promotion_to_canon` context-packet task type.
6. No FOUNDATIONS principle changes; no canon-write semantics change; the HARD-GATE edit is wording-only and preserves the same required Pre-flight allocator step after MCPENH-018.
7. Direct external `mcp__worldloom__allocate_next_id` / `mcp__worldloom__get_context_packet` invocation is not exposed in this Codex session. Live prerequisite proof therefore uses the archived completed tickets plus package-source and package-test references that registered `SP` and `story_fact_promotion_to_canon`; this ticket's owned proof is the consuming-skill cleanup grep.

## Architecture Check

1. Skill-prose cleanup is the cheapest path: a small diff that removes stale fallback wording without changing any committed instruction. Alternative (rewriting the prose to remove fallback narrative entirely from the start) would have required predicting the landing order of MCPENH-018 + MCPENH-019 ahead of time, which is what the forward-compatible-prose discipline was designed to avoid.
2. No backwards-compatibility shim: the live allocator + live task_type are the only correct invocations after the prerequisites land. A maintainer running this skill against an older `tools/world-mcp` checkout (pre-MCPENH-018 + pre-MCPENH-019) would see `mcp__worldloom__allocate_next_id` return an "Unsupported id_class 'SP'" error, which is the correct failure mode (it tells the user to land the prerequisites or use a newer tools checkout).

## Verification Layers

1. **MCPENH-018 has landed (status: COMPLETED)** → `archive/tickets/MCPENH-018-add-sp-id-class-to-allocator.md` exists with `Status: COMPLETED`.
2. **MCPENH-019 has landed (status: COMPLETED)** → same as above for MCPENH-019.
3. **`SP` is live in the allocator source and tests** → codebase grep-proof over `tools/world-mcp/src/tools/allocate-next-id.ts`, `tools/world-mcp/src/server.ts`, and allocator / dispatch tests.
4. **`story_fact_promotion_to_canon` is live in the context-packet task type source and tests** → codebase grep-proof over `tools/world-mcp/src/ranking/profiles/index.ts`, context-packet maps, and focused tests.
5. **Skill-prose cleanup leaves no `Until` / `until then` / `fallback` language tied to MCPENH-018 / MCPENH-019** → grep `.claude/skills/story-fact-promotion-to-canon/SKILL.md` for `MCPENH-018`, `MCPENH-019`, `manual scan`, `task_type='canon_addition'` (in the fallback context — distinct from the substantive references that may legitimately remain elsewhere).
6. **Example file aligned** → `.claude/skills/story-fact-promotion-to-canon/examples/sf-promotion-example.md` no longer claims "MCPENH-018 not yet landed."

## Landed Changes

### 1. Edited HARD-GATE block §(a)

Removed the clause "; until then a manual scan of `worlds/<world-slug>/stories/<story-slug>/story-promotions/SP-*.md` is the documented fallback (see Guardrails §Known integration debt)" — leaving only the `mcp__worldloom__allocate_next_id` instruction.

### 2. Edited World-State Prerequisites — `task_type` paragraph

Removed "once `MCPENH-019-register-story-fact-promotion-task-type` lands" and the `task_type='canon_addition'` fallback clause — leaving only the registered-task_type instruction with its rationale (reserve-priority full bodies for invariants and mystery_reserve).

### 3. Edited Pre-flight Check Step 6

Removed the MCPENH-018/manual-scan fallback sentence — leaving only the live allocator instruction.

### 4. Edited Pre-flight Check Step 7

Removed the MCPENH-019/`canon_addition` fallback sentence — leaving only the live task_type instruction.

### 5. Removed Guardrails §Known integration debt

Deleted the entire `Known integration debt` sub-section (header + three bullet entries: MCPENH-018, MCPENH-019, SFPC-001). The Guardrails section's other entries remain unchanged.

### 6. Edited FOUNDATIONS Alignment Tooling Recommendation row

Removed "once MCPENH-019 lands; until then `task_type='canon_addition'` fallback" — leaving only the registered-task_type reference.

### 7. Edited example narrative (`examples/sf-promotion-example.md`)

In the Pre-flight Trace section, changed `SP-0001 allocated (first promotion in this story) — manual scan fallback used (MCPENH-018 not yet landed) ✓` to `SP-0001 allocated via mcp__worldloom__allocate_next_id(world_slug='animalia', id_class='SP', story_slug='harborwatch-conspiracy') ✓`.

In the same section, changed `World canon loaded via task_type='canon_addition' (MCPENH-019 fallback)` to `World canon loaded via task_type='story_fact_promotion_to_canon'` and updated the packet-contents description accordingly (reserve-priority full bodies for invariants and mystery_reserve).

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
3. Package source and completed dependency closeouts prove the live allocator/task_type surfaces exist; this consuming-skill cleanup does not require mutating a real story bundle.

### Invariants

1. The skill's HARD-GATE wording, FOUNDATIONS Alignment table, and Validation Rules section are unchanged in semantic meaning — only the fallback narrative is removed.
2. The Guardrails section retains all non-debt entries; only the `Known integration debt` sub-section is removed.

## Test Plan

### New/Modified Tests

None — documentation-only ticket; verification is grep-based plus package-source/dependency closeout inspection (skill-creator-generated skills do not have automated tests in `tools/`; verification is per the Verification Layers above).

### Commands

1. `grep -n 'MCPENH-018\|MCPENH-019\|manual scan\|until then\|fallback' .claude/skills/story-fact-promotion-to-canon/SKILL.md .claude/skills/story-fact-promotion-to-canon/examples/sf-promotion-example.md` (verifies fallback narrative removed).
2. `rg -n "SP|story-promotions|story_fact_promotion_to_canon|TASK_TYPES|ID_CLASSES" tools/world-mcp/src tools/world-mcp/tests tools/world-mcp/README.md docs/MACHINE-FACING-LAYER.md docs/CONTEXT-PACKET-CONTRACT.md CLAUDE.md` (verifies the live prerequisite surfaces remain present).

## Outcome

Completed on 2026-05-03.

- Removed all MCPENH-018/MCPENH-019 fallback prose from `story-fact-promotion-to-canon` while preserving the HARD-GATE requirement to allocate `SP-NNNN` before writes.
- Removed `Guardrails §Known integration debt` now that the listed debts are no longer active.
- Updated the worked example so its Pre-flight Trace uses the live SP allocator and registered `story_fact_promotion_to_canon` context-packet task type.

## Verification Result

1. `rg -n "MCPENH-018|MCPENH-019|manual scan|until then|fallback|Known integration debt|task_type='canon_addition'" .claude/skills/story-fact-promotion-to-canon/SKILL.md .claude/skills/story-fact-promotion-to-canon/examples/sf-promotion-example.md` — no matches; stale fallback markers were removed from the consuming skill and example.
2. `rg -n "SP|story-promotions|story_fact_promotion_to_canon|TASK_TYPES|ID_CLASSES" tools/world-mcp/src/tools/allocate-next-id.ts tools/world-mcp/src/server.ts tools/world-mcp/src/ranking/profiles/index.ts tools/world-mcp/src/context-packet/shared.ts tools/world-mcp/src/context-packet/governing-world-context.ts tools/world-mcp/src/context-packet/full-body-delivery.ts tools/world-mcp/tests/tools/allocate-next-id.test.ts tools/world-mcp/tests/server/dispatch.test.ts tools/world-mcp/tests/tools/get-context-packet.test.ts tools/world-mcp/tests/context-packet/full-body-delivery.test.ts tools/world-mcp/README.md docs/MACHINE-FACING-LAYER.md docs/CONTEXT-PACKET-CONTRACT.md CLAUDE.md` — confirmed the prerequisite allocator/task_type surfaces and tests/docs remain present.
3. `git diff --check` — passed.

## Deviations

- Direct external `mcp__worldloom__allocate_next_id(...)` and `mcp__worldloom__get_context_packet(...)` invocation is not exposed in this Codex session. Verification used completed dependency closeouts plus package-source/test grep proof for prerequisite presence, then direct stale-marker grep proof for this ticket's owned consuming-skill cleanup.
