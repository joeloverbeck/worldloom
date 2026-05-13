# PPLAN-002: Restrict §7 / §18 body mystery enumeration to engaged mysteries; non-engaged forbidden mysteries stay in frontmatter only

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — edits the canonical page-plan template, both phase-7 plan-authoring references, both parent skill summary examples, and both Phase 9 plan-completeness gate descriptions; no validator, tool, or hook changes (validator continues to read `frontmatter.forbidden_resolutions[]`).
**Deps**: None.

## Problem

The body of the page plan exists to brief the external prose renderer; the frontmatter exists to drive engine validators. At intake, both surfaces enumerated every mystery in `mysteries_in_play[]` even when the mystery was *"Not relevant to cast; declared for completeness."*

At intake, `worlds/erotica-world/stories/red-bunny/pages-prose-plans/PG-3.md` showed the redundant body shape:
- §7 (Mysteries in play) enumerates six mysteries including "Cause of the elevated prevalence of the female-passing intersex variant in this world" — explicitly annotated *"Not relevant to cast; declared for completeness"*.
- §18 (DO NOT REVEAL) re-enumerates the same forbidden mysteries with the same prose.
- §15-inlined storylet `execution_envelope.mystery_preservation.forbidden_resolutions[]` is a third surface where the same M-NNNN ids appear.

This was the "do not think of a pink elephant" pathology: each forbidden topic was introduced to the renderer as a candidate that must be remembered to suppress. The renderer reads the plan cold; every line of forbidden-topic enumeration is attention-tax on prose generation. The user's framing: *"if a world mystery shouldn't be mentioned at all, then why even bring up the mystery in the plan?"*

The landed structural answer is: the frontmatter `forbidden_resolutions[]` array is the load-bearing surface — both Phase 9 gate 1 (mystery firewall) and `branching-story-page-prose-finalize` Phase 2 (forbidden-mystery scan over rendered prose) read it. The body §7 / §18 enumeration added nothing the validator needed and actively harmed the renderer.

## Assumption Reassessment (2026-05-12)

1. **Frontmatter `forbidden_resolutions[]` is the validator-bearing surface, not body §7.** Verified: `.claude/skills/branching-story-bootstrap/references/phase-9-validation-gates.md` gate 1 reads `frontmatter.forbidden_resolutions[]`; `.claude/skills/branching-story-page-cycle/references/phase-7-6-arc-trace-extraction.md` reads `frontmatter.forbidden_resolutions[]`; `.claude/skills/branching-story-page-prose-finalize/references/phase-1-plan-prose-pairing.md` caches `plan.forbidden_resolutions` from frontmatter. No validator depends on body §7 / §18 enumeration.
2. **`mysteries_in_play[]` lives in STORY_KERNEL.md and feeds frontmatter.** Verified: `.claude/skills/branching-story-bootstrap/templates/story-kernel.md` declares the field. Bootstrap Phase 4 declares the array (`.claude/skills/branching-story-bootstrap/references/phase-4-firewall-and-invariant-audit.md`); plan-authoring projects each `forbidden`-status M into `frontmatter.forbidden_resolutions[]` (`phase-7-root-page-plan.md`, `phase-7-page-plan.md`). The frontmatter projection is mandatory and stays.
3. **Shared boundary under audit**: the canonical page-plan template (`.claude/skills/_shared-templates/page-plan.md` §7 and §18 comments) is the single source of truth for body content shape. Both phase-7 references defer to it. Editing the template + the two phase-7 references covers the body-shape surface; no further sites drive body §7 content.
4. **FOUNDATIONS principle under audit**: Rule 7 (Preserve Mystery Deliberately) and §Story Bundles §4 firewall-split (plan-time + finalize-time). The change is a body-shape hygiene fix; it does NOT weaken the firewall. Plan-time firewall enforcement continues via `frontmatter.forbidden_resolutions[]` → Phase 9 gate 1 + Phase 7.6 Layer 1 preservation check. Finalize-time enforcement continues via the deterministic regex + LLM critic at `branching-story-page-prose-finalize` Phase 2/3 against `plan.forbidden_resolutions` (read from frontmatter, not body). Both gates remain mandatory; both continue to fire on the same data; body §7 enumeration was never the firewall mechanism.
5. **Parent skill summary fallout**: `.claude/skills/branching-story-bootstrap/SKILL.md` and `.claude/skills/branching-story-page-cycle/SKILL.md` both include Phase 10 / plan-preview examples whose §18 `DO NOT REVEAL` line still says a forbidden M list is surfaced in the plan body. Those examples are same-seam documentation and are updated here to say §18 carries the engaged mystery posture cues from §7, while leaving the engine-vocabulary cleanup to PPLAN-007.
6. **Adjacent contradiction**: the §15-inlined SLT record's `execution_envelope.mystery_preservation.forbidden_resolutions[]` array re-asserts the same M-ids in the body. That re-assertion is a separate concern handled by PPLAN-005 (§15 SLT schema-to-prose translation), which drops engine-only fields from the §15 body view while preserving them in frontmatter. This ticket does NOT touch §15.

## Architecture Check

1. The fix is documentary discipline: the canonical template states the §7/§18 inlining rule; both phase-7 references defer to it. Editing the rule once at the template (with mirror updates at the two phase-7 reference sites) propagates to every future plan without code or validator change.
2. No backwards-compatibility shims. Validator gates read the frontmatter, which is unchanged. Existing plans (with the old verbose §7) remain valid under the validator and finalize gates; the change applies to plans authored after the documentation update.

## Verification Layers

1. **Template §7 instruction restricts to engaged mysteries** → codebase grep-proof: `grep -n 'engaged' .claude/skills/_shared-templates/page-plan.md` returns the new §7 comment language; the old complete-list anchors are absent from active skill/template surfaces.
2. **Template §18 DO NOT REVEAL drops the redundant mystery re-enumeration** → codebase grep-proof: stale anchors such as `M-NNNN forbidden list` and `list of M-NNNN forbidden` are absent from the active template/skill surfaces.
3. **Frontmatter `forbidden_resolutions[]` remains validator-bearing** → source contract review + grep-proof: the edited template/reference/gate files still name `frontmatter.forbidden_resolutions[]`; no validator/tool/hook code changed.
4. **Parent skill examples are aligned** → source review: bootstrap and page-cycle Phase 10 / plan-preview examples now describe engaged mystery posture cues from §7.
5. **Finalize firewall is unchanged** → manual contract review: finalize still reads `plan.forbidden_resolutions` from frontmatter; this ticket did not edit finalize code or references.

## Landed Changes

### 1. `.claude/skills/_shared-templates/page-plan.md` §7 comment

Replaced the old complete-body-list instruction:
> `INLINE: every M-NNNN with status and forbidden_resolutions[]. Mark which mysteries the renderer must NOT resolve in this page.`

with the engaged-only body rule:
> `INLINE only mysteries the renderer is in semantic risk of touching this page. Inclusion criteria (any of): (a) M-NNNN appears in the selected storylet's `mystery_safety.M_touched[]` or `M_progressed[]`; (b) M-NNNN's domain overlaps an in-scope CF, OBL, THR, or character intention; (c) M-NNNN status is forbidden AND the page's beat plan operates in a domain where accidental resolution is non-trivial. Mysteries declared in `mysteries_in_play[]` for kernel completeness but with no semantic engagement on this page do NOT appear in §7 body. The complete `frontmatter.forbidden_resolutions[]` list remains the validator-bearing surface (Phase 9 gate 1; finalize Phase 2 regex / critic). Each inlined entry carries: M id, status, future_resolution_safety, one-line "what is unknown" prose, and a one-line scene-relevant posture cue ("hold as ambient register; do not resolve"; "engaged via cast member's belief; do not commit a world-truth value").`

### 2. `.claude/skills/_shared-templates/page-plan.md` §18 DO NOT REVEAL comment

Replaced the mystery body-list shape with:
> `- The mysteries from §7 above carry their per-mystery posture cues; do not collapse to a flat "never mention" list (the renderer must understand WHY each mystery is held, not just that it is held).`

The existing engine-vocabulary bullet remains in place; the one-line record-identifier cleanup is PPLAN-007's surface.

### 3. `.claude/skills/branching-story-bootstrap/references/phase-7-root-page-plan.md`

Updated the body-shape directive for §15-alt / §7 / §18 to reference the engaged-mystery filter rule from the template. The current instruction *"Phase 4 mysteries_in_play"* is unchanged for §15-alt (entry-pressure framing); §7 body uses the engaged-mystery filter, and the complete forbidden list stays in `frontmatter.forbidden_resolutions[]`.

### 4. `.claude/skills/branching-story-page-cycle/references/phase-7-page-plan.md`

Same as item 3 for the page-cycle case. The prompt-assembly line now says DO NOT REVEAL body content draws from §7's engaged-only set, not from the complete `frontmatter.forbidden_resolutions[]`.

### 5. `.claude/skills/branching-story-bootstrap/references/phase-9-validation-gates.md` (gate 19 row) and `.claude/skills/branching-story-page-cycle/references/phase-9-validation-gates.md` (gate 18 row)

Added a sentence to the `plan_completeness_check` gate: §7 (Mysteries in play) is populated according to the engaged-mystery filter; absence of an engaged M is a re-prompt; presence of a non-engaged forbidden M is a re-prompt asking the plan author to remove the body entry while preserving the frontmatter list.

### 6. Parent skill summary examples

Updated the Phase 10 / plan-preview examples in `.claude/skills/branching-story-bootstrap/SKILL.md` and `.claude/skills/branching-story-page-cycle/SKILL.md` so §18 `DO NOT REVEAL` describes engaged mystery posture cues from §7 rather than a complete forbidden M body list. Preserved the existing engine-vocabulary wording for PPLAN-007.

## Files to Touch

- `.claude/skills/_shared-templates/page-plan.md` (modify)
- `.claude/skills/branching-story-bootstrap/references/phase-7-root-page-plan.md` (modify)
- `.claude/skills/branching-story-page-cycle/references/phase-7-page-plan.md` (modify)
- `.claude/skills/branching-story-bootstrap/references/phase-9-validation-gates.md` (modify)
- `.claude/skills/branching-story-page-cycle/references/phase-9-validation-gates.md` (modify)
- `.claude/skills/branching-story-bootstrap/SKILL.md` (modify)
- `.claude/skills/branching-story-page-cycle/SKILL.md` (modify)

## Out of Scope

- Frontmatter `forbidden_resolutions[]` shape (unchanged; remains comprehensive — every `forbidden`-status M in `mysteries_in_play[]`).
- §15-inlined SLT `execution_envelope.mystery_preservation.forbidden_resolutions[]` body engagement (handled by PPLAN-005).
- `frontmatter.forbidden_engine_vocabulary[]` body view (handled by PPLAN-007).
- Re-authoring of existing rendered plans.

## Acceptance Criteria

### Tests That Must Pass

1. The canonical template `.claude/skills/_shared-templates/page-plan.md` §7 comment names the engaged-mystery filter explicitly.
2. The canonical template §18 comment does NOT re-enumerate the §7 mystery list verbatim.
3. Phase 9 `plan_completeness_check` re-prompt rule for §7 body fires when the LLM author over-includes non-engaged forbidden mysteries.
4. Parent bootstrap/page-cycle plan-preview examples no longer say §18 carries a complete forbidden M body list.
5. Frontmatter `forbidden_resolutions[]` references remain present as the validator-bearing surface; no validator/tool/hook code changed.

### Invariants

1. Plan-time mystery firewall enforcement reads from `frontmatter.forbidden_resolutions[]`, not from body §7. (Already true; ticket re-affirms by documentary edit, no code change required.)
2. Finalize-time rendered-prose mystery firewall enforcement reads from `plan.forbidden_resolutions` (cached at finalize Phase 1). (Already true; unchanged.)
3. Every `forbidden`-status M in `mysteries_in_play[]` appears in `frontmatter.forbidden_resolutions[]` regardless of body §7 inclusion. (Existing Rule; this ticket does not weaken it.)

## Test Plan

### New/Modified Tests

1. None — documentation-only ticket. Existing Phase 9 gates and finalize Phase 2 forbidden-mystery scan remain the proof surfaces for firewall integrity.

### Commands

1. `grep -n 'engaged' .claude/skills/_shared-templates/page-plan.md` (verifies the engaged-mystery filter is named in §7).
2. `grep -n 'forbidden_resolutions\[\]' .claude/skills/_shared-templates/page-plan.md .claude/skills/branching-story-bootstrap/references/phase-7-root-page-plan.md .claude/skills/branching-story-page-cycle/references/phase-7-page-plan.md .claude/skills/branching-story-bootstrap/references/phase-9-validation-gates.md .claude/skills/branching-story-page-cycle/references/phase-9-validation-gates.md` (verifies the validator-bearing surface remains named).
3. `if rg -n 'every M-NNNN with status and forbidden_resolutions|M-NNNN forbidden list|list of M-NNNN forbidden' .claude/skills/_shared-templates/page-plan.md .claude/skills/branching-story-bootstrap .claude/skills/branching-story-page-cycle; then exit 1; fi` (verifies the old body-list instruction is gone from active skill/template surfaces).
4. `git diff --check -- .claude/skills/_shared-templates/page-plan.md .claude/skills/branching-story-bootstrap/SKILL.md .claude/skills/branching-story-bootstrap/references/phase-7-root-page-plan.md .claude/skills/branching-story-bootstrap/references/phase-9-validation-gates.md .claude/skills/branching-story-page-cycle/SKILL.md .claude/skills/branching-story-page-cycle/references/phase-7-page-plan.md .claude/skills/branching-story-page-cycle/references/phase-9-validation-gates.md archive/tickets/PPLAN-002-mystery-enumeration-restriction.md`

## Outcome

Completion date: 2026-05-12.

Implemented the engaged-mystery body filter across the active page-plan body contract:

- `.claude/skills/_shared-templates/page-plan.md` §7 now inlines only mysteries semantically engaged by the page or at non-trivial accidental-resolution risk.
- `.claude/skills/_shared-templates/page-plan.md` §18 now points to §7 posture cues instead of listing every forbidden mystery again.
- Bootstrap and page-cycle Phase 7 references now instruct plan authors to keep complete forbidden-M coverage in frontmatter and keep non-engaged forbidden mysteries out of the body.
- Bootstrap and page-cycle Phase 9 `plan_completeness_check` rows now re-prompt on missing engaged mysteries or over-included non-engaged forbidden mysteries.
- Parent skill plan-preview examples now say §18 carries engaged mystery posture cues from §7.

## Verification Result

1. `grep -n 'engaged' .claude/skills/_shared-templates/page-plan.md` — PASS; the §7 template comment includes the engaged posture cue language.
2. `grep -n 'forbidden_resolutions\[\]' ...` over the template, both Phase 7 references, and both Phase 9 gate references — PASS; the validator-bearing frontmatter surface remains explicitly named.
3. `if rg -n 'every M-NNNN with status and forbidden_resolutions|M-NNNN forbidden list|list of M-NNNN forbidden' ...; then exit 1; fi` over active skill/template surfaces — PASS; old complete-body-list anchors are absent.
4. Manual review — PASS; PPLAN-005 remains the §15 SLT-body cleanup owner, and PPLAN-007 remains the engine-vocabulary body cleanup owner.
5. `git diff --check -- <owned paths>` — PASS.

## Deviations

- Did not re-author PG-4 or run a contrived finalize failure. The live repo does not expose an executable skill dry-run harness for these prose workflow skills in this ticket's scope; this documentation-only change is verified by source contract review and grep proofs. The finalize firewall remains unchanged because the edited surfaces are template/reference prose and the validator-bearing `frontmatter.forbidden_resolutions[]` contract is preserved.
- Historical design notes under `docs/plans/` still describe the older verbose plan shape. They are not active skill/template authority and were left untouched.
