# PPLAN-002: Restrict §7 / §18 body mystery enumeration to engaged mysteries; non-engaged forbidden mysteries stay in frontmatter only

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — edits the canonical page-plan template and both phase-7 plan-authoring references; no validator, tool, or hook changes (validator continues to read `frontmatter.forbidden_resolutions[]`).
**Deps**: None.

## Problem

The body of the page plan exists to brief the external prose renderer; the frontmatter exists to drive engine validators. Currently both surfaces enumerate every mystery in `mysteries_in_play[]` even when the mystery is *"Not relevant to cast; declared for completeness."*

On `worlds/erotica-world/stories/red-bunny/pages-prose-plans/PG-0003.md`:
- §7 (Mysteries in play) enumerates six mysteries including "Cause of the elevated prevalence of the female-passing intersex variant in this world" — explicitly annotated *"Not relevant to cast; declared for completeness"*.
- §18 (DO NOT REVEAL) re-enumerates the same forbidden mysteries with the same prose.
- §15-inlined storylet `execution_envelope.mystery_preservation.forbidden_resolutions[]` is a third surface where the same M-NNNN ids appear.

This is the "do not think of a pink elephant" pathology: each forbidden topic is introduced to the renderer as a candidate that must be remembered to suppress. The renderer reads the plan cold; every line of forbidden-topic enumeration is attention-tax on prose generation. The user's framing: *"if a world mystery shouldn't be mentioned at all, then why even bring up the mystery in the plan?"*

The structural answer is: the frontmatter `forbidden_resolutions[]` array is the load-bearing surface — both Phase 9 gate 1 (mystery firewall) and `branching-story-page-prose-finalize` Phase 2 (forbidden-mystery scan over rendered prose) read it. The body §7 / §18 enumeration adds nothing the validator needs and actively harms the renderer.

## Assumption Reassessment (2026-05-12)

1. **Frontmatter `forbidden_resolutions[]` is the validator-bearing surface, not body §7.** Verified: `.claude/skills/branching-story-bootstrap/references/phase-9-validation-gates.md:9` (gate 1 reads `frontmatter.forbidden_resolutions[]`); `.claude/skills/branching-story-page-cycle/references/phase-7-6-arc-trace-extraction.md:23` (forbidden-mystery preservation check reads `frontmatter.forbidden_resolutions[]`); `.claude/skills/branching-story-page-prose-finalize/references/phase-1-plan-prose-pairing.md:78` (finalize Phase 2 reads `plan.forbidden_resolutions` from frontmatter cache). No validator depends on body §7 / §18 enumeration.
2. **`mysteries_in_play[]` lives in STORY_KERNEL.md and feeds frontmatter.** Verified: `.claude/skills/branching-story-bootstrap/templates/story-kernel.md:43`. Bootstrap Phase 4 declares the array (`.claude/skills/branching-story-bootstrap/references/phase-4-firewall-and-invariant-audit.md:13`); plan-authoring projects each `forbidden`-status M into `frontmatter.forbidden_resolutions[]` (`phase-7-root-page-plan.md:67`, `phase-7-page-plan.md:119`). The frontmatter projection is mandatory and stays.
3. **Shared boundary under audit**: the canonical page-plan template (`.claude/skills/_shared-templates/page-plan.md` §7 comment at line 121-124 and §18 DO NOT REVEAL comment at line 218-219) is the single source of truth for body content shape. Both phase-7 references defer to it. Editing the template + the two phase-7 references covers the body-shape surface; no further sites drive body §7 content.
4. **FOUNDATIONS principle under audit**: Rule 7 (Preserve Mystery Deliberately) and §Story Bundles §4 firewall-split (plan-time + finalize-time). The change is a body-shape hygiene fix; it does NOT weaken the firewall. Plan-time firewall enforcement continues via `frontmatter.forbidden_resolutions[]` → Phase 9 gate 1 + Phase 7.6 Layer 1 preservation check. Finalize-time enforcement continues via the deterministic regex + LLM critic at `branching-story-page-prose-finalize` Phase 2/3 against `plan.forbidden_resolutions` (read from frontmatter, not body). Both gates remain mandatory; both continue to fire on the same data; body §7 enumeration was never the firewall mechanism.
5. **Adjacent contradiction**: the §15-inlined SLT record's `execution_envelope.mystery_preservation.forbidden_resolutions[]` array re-asserts the same M-ids in the body. That re-assertion is a separate concern handled by PPLAN-005 (§15 SLT schema-to-prose translation), which drops engine-only fields from the §15 body view while preserving them in frontmatter. This ticket does NOT touch §15.

## Architecture Check

1. The fix is documentary discipline: the canonical template states the §7/§18 inlining rule; both phase-7 references defer to it. Editing the rule once at the template (with mirror updates at the two phase-7 reference sites) propagates to every future plan without code or validator change.
2. No backwards-compatibility shims. Validator gates read the frontmatter, which is unchanged. Existing plans (with the old verbose §7) remain valid under the validator and finalize gates; the change applies to plans authored after the documentation update.

## Verification Layers

1. **Template §7 instruction restricts to engaged mysteries** → codebase grep-proof: `grep -nE 'engaged|in play.*scene' .claude/skills/_shared-templates/page-plan.md` returns the new §7 comment language; bare "every M-NNNN" without the engaged qualifier is absent.
2. **Template §18 DO NOT REVEAL drops the redundant mystery re-enumeration** → codebase grep-proof: the §18 comment names "the forbidden_resolutions[] frontmatter array" as the engine surface and does not require body re-listing; a manual diff of `pages-prose-plans/PG-NNNN.md` §18 sections before and after shows the §7 mystery list is not duplicated.
3. **Frontmatter `forbidden_resolutions[]` still carries every `forbidden`-status M** → schema validation: Phase 9 gate 1 (`mystery_firewall`) and Phase 7.6 Layer 1 forbidden-mystery-preservation gate continue to PASS on a re-authored plan.
4. **Skill dry-run on a known story**: re-author PG-0004 of `worlds/erotica-world/stories/red-bunny`; inspect §7 of the resulting plan — only mysteries with `status: passive | active` AND semantic engagement on this page should appear, OR mysteries the page is at risk of accidentally resolving (whose status is `forbidden`). M-3 and M-4 (forbidden, declared-for-completeness, not engaged this page) should NOT appear in §7 body; they MUST appear in `frontmatter.forbidden_resolutions`.
5. **Finalize firewall continues to fire**: a contrived test plan that introduces a forbidden-M-resolution claim in rendered prose must still be HARD-FAIL-rejected at `branching-story-page-prose-finalize` Phase 2 — confirming the body §7 reduction did not weaken the runtime firewall.

## What to Change

### 1. `.claude/skills/_shared-templates/page-plan.md` §7 comment (lines 121-124)

Replace:
> `INLINE: every M-NNNN with status and forbidden_resolutions[]. Mark which mysteries the renderer must NOT resolve in this page.`

with:
> `INLINE only mysteries the renderer is in semantic risk of touching this page. Inclusion criteria (any of): (a) M-NNNN appears in the selected storylet's `mystery_safety.M_touched[]` or `M_progressed[]`; (b) M-NNNN's domain overlaps an in-scope CF, OBL, THR, or character intention; (c) M-NNNN status is forbidden AND the page's beat plan operates in a domain where accidental resolution is non-trivial. Mysteries declared in `mysteries_in_play[]` for kernel completeness but with no semantic engagement on this page do NOT appear in §7 body. The complete `frontmatter.forbidden_resolutions[]` list remains the validator-bearing surface (Phase 9 gate 1; finalize Phase 2 regex / critic). Each inlined entry carries: M id, status, future_resolution_safety, one-line "what is unknown" prose, and a one-line scene-relevant posture cue ("hold as ambient register; do not resolve"; "engaged via cast member's belief; do not commit a world-truth value").`

### 2. `.claude/skills/_shared-templates/page-plan.md` §18 DO NOT REVEAL comment (lines 217-219)

Replace the existing body-list shape with:
> `- The mysteries from §7 above carry their per-mystery posture cues; do not collapse to a flat "never mention" list (the renderer must understand WHY each mystery is held, not just that it is held).`
> `- "Do not use internal record-identifier vocabulary in the prose" (the literal enumeration of prefix tokens is engine concern carried in frontmatter `forbidden_engine_vocabulary[]`; the renderer-facing rule is the one-line negative).`

(The second bullet's "do not use internal record-identifier vocabulary" line is the surface PPLAN-007 owns; this ticket lands the §18 reshape without redundant frontmatter prefix re-enumeration.)

### 3. `.claude/skills/branching-story-bootstrap/references/phase-7-root-page-plan.md` (around line 86-87)

Update the body-shape directive for §15-alt / §7 / §18 to reference the engaged-mystery filter rule from the template. The current instruction *"Phase 4 mysteries_in_play"* is unchanged for §15-alt (entry-pressure framing); add an explicit note: §7 body uses the engaged-mystery filter; the complete forbidden list stays in `frontmatter.forbidden_resolutions[]`.

### 4. `.claude/skills/branching-story-page-cycle/references/phase-7-page-plan.md` (around line 35)

Same as item 3 for the page-cycle case. The `[scene direction — REQUIRED TURN, STOPPING POINT, DO NOT REVEAL (the M-NNNN forbidden list and engine-vocabulary tokens list from frontmatter)]` prompt-assembly line (line 54-55) needs revision: DO NOT REVEAL body content draws from §7's engaged-only set, not from the complete `frontmatter.forbidden_resolutions[]`.

### 5. `.claude/skills/branching-story-bootstrap/references/phase-9-validation-gates.md` (gate 19 row) and `.claude/skills/branching-story-page-cycle/references/phase-9-validation-gates.md` (gate 18 row)

Add a sentence to the `plan_completeness_check` gate: §7 (Mysteries in play) is populated according to the engaged-mystery filter; absence of an engaged M is a re-prompt; presence of a non-engaged forbidden M is a re-prompt asking the plan author to remove the body entry while preserving the frontmatter list.

## Files to Touch

- `.claude/skills/_shared-templates/page-plan.md` (modify)
- `.claude/skills/branching-story-bootstrap/references/phase-7-root-page-plan.md` (modify)
- `.claude/skills/branching-story-page-cycle/references/phase-7-page-plan.md` (modify)
- `.claude/skills/branching-story-bootstrap/references/phase-9-validation-gates.md` (modify)
- `.claude/skills/branching-story-page-cycle/references/phase-9-validation-gates.md` (modify)

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
4. Full-pipeline verification: re-run `branching-story-page-cycle` on PG-0004 of `worlds/erotica-world/stories/red-bunny`; §7 of the resulting plan contains at most the mysteries the page semantically engages; `frontmatter.forbidden_resolutions[]` continues to contain every `forbidden`-status M in `mysteries_in_play[]`.
5. The deferred Phase-2 forbidden-mystery-resolution regex/critic at `branching-story-page-prose-finalize` continues to HARD-FAIL on rendered prose that resolves a forbidden M — confirming the firewall mechanism is unchanged.

### Invariants

1. Plan-time mystery firewall enforcement reads from `frontmatter.forbidden_resolutions[]`, not from body §7. (Already true; ticket re-affirms by documentary edit, no code change required.)
2. Finalize-time rendered-prose mystery firewall enforcement reads from `plan.forbidden_resolutions` (cached at finalize Phase 1). (Already true; unchanged.)
3. Every `forbidden`-status M in `mysteries_in_play[]` appears in `frontmatter.forbidden_resolutions[]` regardless of body §7 inclusion. (Existing Rule; this ticket does not weaken it.)

## Test Plan

### New/Modified Tests

1. None — documentation-only ticket. Existing Phase 9 gates and finalize Phase 2 forbidden-mystery scan remain the proof surfaces for firewall integrity.

### Commands

1. `grep -n 'engaged' .claude/skills/_shared-templates/page-plan.md` (verifies the engaged-mystery filter is named in §7).
2. Manual diff: compare §7 of `worlds/erotica-world/stories/red-bunny/pages-prose-plans/PG-0003.md` (six mysteries enumerated, including "Not relevant to cast; declared for completeness") against §7 of a re-authored PG-0004 plan (only semantically engaged mysteries).
3. Contrived re-render: hand-edit a rendered `pages-prose/PG-NNNN.md` to insert a forbidden-mystery resolution claim and confirm `branching-story-page-prose-finalize` Phase 2 HARD-FAILs.
