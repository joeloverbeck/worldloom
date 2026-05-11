# BSBOOT-027: Make `phase-7-root-page-plan.md` a delta over the canonical plan template

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: None — documentation refactor inside `.claude/skills/branching-story-bootstrap/references/`.
**Deps**: None. BSBOOT-025 / BSBOOT-026 are independent (different files).

## Problem

`references/phase-7-root-page-plan.md` lines 87-138 inline a full §1-§19 enumeration of the comprehensive plan body — the same enumeration that already lives in the canonical shared template at `.claude/skills/_shared-templates/page-plan.md`. The two enumerations describe the same plan with mostly identical "INLINE: …" inline-everything instructions. The only material difference is the bootstrap PG-0001 root case (`selected_arc_id == null`): §15 and §16 are omitted, §15-alt replaces them, §12 and §14 read "(no pending consequences ...)" / "(no prior prose; this is the root page)", and the frontmatter root-case defaults (`selected_arc_id: null`, `chosen_variant_id: null`, `required_effects: []`).

Maintaining two parallel enumerations is a drift hazard — any edit to the canonical plan template must remember to land in bootstrap's parallel copy, and silent drift between the two would make a bootstrap plan structurally non-conformant to the renderer's expectation. The shared template is the right authority; bootstrap's Phase 7 reference should describe the root-case delta, not re-derive the whole plan body.

## Assumption Reassessment (2026-05-11)

1. `references/phase-7-root-page-plan.md` lines 87-138 enumerate every plan-body section §1 through §19 (with §15 and §16 omitted, §15-alt replacing them). Confirmed by direct read of the LLM prompt assembly block.
2. `.claude/skills/_shared-templates/page-plan.md` lines 81-213 enumerate §1 through §19 with conditional comments on §15 / §15-alt / §16 that already cover both the bootstrap-root case and the page-cycle non-root case. Confirmed by direct read.
3. `branching-story-page-cycle/references/phase-7-page-plan.md` is the sibling page-cycle reference; it uses a leaner shape (it cites the canonical template at line 25 and lines 100-138 describe a similar but not-identical enumeration). The sibling is also somewhat duplicative; the bootstrap audit recommended fixing bootstrap first as the higher-friction case. Page-cycle's analogous refactor is out of scope for this ticket but may motivate a follow-up (BSPAGE-NN).
4. The shared template's §15 comment already says `CONDITIONAL: present when frontmatter selected_arc_id != null` and §15-alt's comment says `CONDITIONAL: present when frontmatter selected_arc_id == null (bootstrap PG-0001 root case); replaces §15 and §16`. The canonical template already encodes the root-case conditional logic; bootstrap's reference does not need to re-describe it.
5. Cross-skill consumer check: no sibling skill cites `references/phase-7-root-page-plan.md` directly (verified by `grep -rn "branching-story-bootstrap/references/phase-7-root-page-plan" .claude/skills/`). The file is bootstrap-internal. Refactoring its prose does not break cross-skill citations.
6. The "Plan-completeness post-LLM check" block (lines 144-156) names specific frontmatter keys that must be populated and verifies their root-case shape (`selected_arc_id: null`, `chosen_variant_id: null`, `required_effects: []`). This block is bootstrap-specific (page-cycle has its own different post-LLM check) and must remain in the file — only the plan-body-enumeration block is duplicative.
7. The "Emit PG-0001 record" block (lines 160-211) names the page-cycle-compatible PG schema with bootstrap PG-0001 root-case fields. This is bootstrap-specific and must remain. Same for "Emit BR-0001 record" (lines 215-216) and "Emit SE-0001 bootstrap event" (lines 219-225).
8. Mismatch + correction: lines 87-138 are the duplicative block; the surrounding bootstrap-specific blocks stay.

## Architecture Check

1. The canonical template `.claude/skills/_shared-templates/page-plan.md` was created to be the single source of truth for plan body structure across `branching-story-bootstrap` Phase 7, `branching-story-page-cycle` Phase 7, `branching-story-page-prose-finalize` Phase 1, the Phase 7.5 declared-affordance validator, and the external prose renderer. Bootstrap's reference re-describing the same body undermines that single-source intent.
2. The delta shape (which sections change at the root case) is small enough — about 5-7 sections diverge — that listing them is materially shorter than inlining the full §1-§19 description. Net reduction: ~50 lines.
3. No backwards-compatibility aliasing introduced. The deleted text is replaced with a pointer + delta, not a stub.

## Verification Layers

1. `references/phase-7-root-page-plan.md` post-edit cites the canonical template path verbatim at the LLM prompt assembly block → codebase grep-proof (`grep -c "_shared-templates/page-plan.md" .claude/skills/branching-story-bootstrap/references/phase-7-root-page-plan.md` returns ≥1).
2. The delta described in the LLM prompt assembly block enumerates ONLY the root-case-specific section differences (§15 omitted, §16 omitted, §15-alt present, §12 root reading, §14 root reading) and the root-case frontmatter defaults — not the full plan body → manual review.
3. The "Plan-completeness post-LLM check", "Emit PG-0001 record", "Emit BR-0001 record", and "Emit SE-0001 bootstrap event" blocks remain unchanged from the pre-edit content → manual diff.
4. The shared template `.claude/skills/_shared-templates/page-plan.md` continues to document §1-§19 with conditional `selected_arc_id == null` / `!= null` comments — the source of truth this ticket aims to single-source from → manual review (no change to the shared template; verify the conditional comments cover the bootstrap case).

## What to Change

### 1. Replace lines 87-138 of `references/phase-7-root-page-plan.md` with a delta block

Current shape (paraphrased): the file's "Plan authoring — populate the canonical template" subsection contains an "LLM prompt assembly for plan authoring" code block that ends with `Frontmatter shape (root case):` and `Body shape (root case):` enumerations re-describing every section.

Replacement shape:

- Keep the `[content_policy block ...]`, `[world context ...]`, `[story kernel ...]`, `[PROSE CRAFT CONTRACT ...]`, `[cast bound ...]`, `[state context ...]`, `[entry pressure framing ...]`, and `INSTRUCTION:` framing (lines ~30-54) intact — these are the prompt-assembly inputs and the operator's job description.
- Replace the inline `Frontmatter shape (root case):` enumeration (lines ~55-85) with one paragraph: `The frontmatter required keys and their shapes are documented at .claude/skills/_shared-templates/page-plan.md (frontmatter block). At the bootstrap PG-0001 root case, populate the frontmatter exactly as the canonical template specifies, with these root-case-specific values:` followed by a short bullet list: `selected_arc_id: null`, `chosen_variant_id: null`, `required_effects: []`, `parent_page_id: null`, `branch_id: BR-0001`, `branch_path: [PG-0001]`, `state_hash_at_plan_time: bootstrap-pg0001-state-<story-slug>-v1`, `forbidden_resolutions[]: <every M-NNNN in mysteries_in_play[] whose future_resolution_safety == forbidden>`, `deferred_validation_trace: all three keys set to DEFERRED — awaiting prose render`.
- Replace the inline `Body shape (root case):` enumeration (lines ~86-134) with one paragraph: `The body sections §1 through §19 are documented at .claude/skills/_shared-templates/page-plan.md (markdown body). At the bootstrap PG-0001 root case, populate every section per the canonical template, with the following root-case deviations:` followed by a short bullet list:
  - `§12 Pending consequences: at PG-0001 root the consequences ledger is freshly initialized; populate with "(no pending consequences; bootstrap genesis state)" unless premise establishes a pre-PG-0001 CNSQ.`
  - `§14 Recent prose continuity: at PG-0001 root there is no parent prose; populate with "(no prior prose; this is the root page)".`
  - `§15 Selected scene-commitment arc: OMITTED at PG-0001 root.`
  - `§15-alt Entry pressure framing: PRESENT at PG-0001 root, replacing both §15 and §16. Inline STORY_KERNEL.central_dramatic_question + Phase 5 initial obligations + Phase 5 initial threads + Phase 4 mysteries_in_play + summary of seed-pool's available commitment_class[] affordances (without selecting one SLT).`
  - `§16 Chosen variant: OMITTED at PG-0001 root.`
  - `§17 Governor nudge: at PG-0001 root, populate with "bootstrap root; no prior-page governor".`
- Keep the closing two sentences at line 135-138 (`Every record id referenced ... is plan-completeness failures (Phase 9 gate 19) and plan_self_containment failures (Phase 9.5 check 11).`) — that statement is the bootstrap-specific inlining rule and stays. Adjust to read: `Every record id referenced in any plan section MUST be inlined verbatim in that section, per the canonical template's "Authoring rule" comment. Bare CF-NNNN / CHAR-NNNN / OBL-NNNN / etc. references are plan-completeness failures (Phase 9 gate 19) and plan_self_containment failures (Phase 9.5 check 11).`

### 2. Cross-reference block update

At the file's `## Cross-references` section (lines 228-235), the first bullet already cites `.claude/skills/_shared-templates/page-plan.md`. Promote it to the top of the section and update the prose to say: `Canonical plan template — single source of truth for §1-§19 body and frontmatter shape; this reference describes the bootstrap PG-0001 root-case delta only.`

## Files to Touch

- `.claude/skills/branching-story-bootstrap/references/phase-7-root-page-plan.md` (modify)

## Out of Scope

- Any change to `.claude/skills/_shared-templates/page-plan.md` (the canonical template — already correct).
- Any refactor of `branching-story-page-cycle/references/phase-7-page-plan.md` (page-cycle has a similar duplication that may warrant its own ticket; see Assumption Reassessment item 3).
- The "Plan-completeness post-LLM check", "Emit PG-0001 record", "Emit BR-0001 record", "Emit SE-0001 bootstrap event", and "Phase 9 dual-validation-trace mapping" blocks — bootstrap-specific, retained verbatim.
- Any change to the SKILL.md Procedure step 6 wording — already concise.

## Acceptance Criteria

### Tests That Must Pass

1. `wc -l .claude/skills/branching-story-bootstrap/references/phase-7-root-page-plan.md` returns a line count materially lower than the pre-edit count (target: ~40-50 lines removed; pre-edit is 236 lines, post-edit target ~185-195).
2. `grep -c "_shared-templates/page-plan.md" .claude/skills/branching-story-bootstrap/references/phase-7-root-page-plan.md` returns ≥2 (LLM prompt assembly block + Cross-references block both cite the canonical template).
3. The "Plan-completeness post-LLM check", "Emit PG-0001 record", "Emit BR-0001 record", and "Emit SE-0001 bootstrap event" sections are byte-identical to pre-edit content (manual diff).
4. Reading the file standalone produces a coherent description of bootstrap Phase 7 — root-case delta is named, canonical template is cited, post-LLM check is described — without requiring the reader to know what the canonical template contains in detail.

### Invariants

1. The canonical template at `.claude/skills/_shared-templates/page-plan.md` is the single source of truth for plan body structure; references in bootstrap and page-cycle describe deltas, not parallel enumerations.
2. The bootstrap PG-0001 root-case delta is documented in exactly one place (this reference) — drift between root-case rules and the rest of the plan structure remains traceable.

## Test Plan

### New/Modified Tests

1. `None — documentation-only refactor; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `wc -l .claude/skills/branching-story-bootstrap/references/phase-7-root-page-plan.md` — confirm line count reduction.
2. `grep -n "§" .claude/skills/branching-story-bootstrap/references/phase-7-root-page-plan.md | head -30` — confirm the file no longer contains a parallel §1-§19 body enumeration; only delta sections remain.
3. `diff <(grep -A 100 "## Plan-completeness post-LLM check" .claude/skills/branching-story-bootstrap/references/phase-7-root-page-plan.md | head -50) <(git show HEAD:.claude/skills/branching-story-bootstrap/references/phase-7-root-page-plan.md | grep -A 100 "## Plan-completeness post-LLM check" | head -50)` — the post-LLM check block is byte-identical to the pre-edit version.
