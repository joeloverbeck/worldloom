# SPEC20SCECOM-003: Phase 7 — Multi-Beat Arc Render with Length-per-Rule-11 Discipline

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `.claude/skills/branching-story-page-cycle/references/phase-7-page-render.md` rewritten for continuous multi-beat prose; LLM-prompt block updated; 8-axis prose critic preserved per `prose-craft-contract.md`; engine-only `safety_valves.max_words` runaway-defense (NOT visible to LLM); Length per Prose Craft Contract Rule 11 (no word target/floor at LLM-facing surface).
**Deps**: `archive/tickets/SPEC20SCECOM-001.md` (Phase 4b chooses variant fed into prompt); `archive/tickets/SPEC20SCECOM-002.md` (state-mutation discipline established before render)

## Problem

At intake, Phase 7 rendered one beat as continuous prose per `phase-7-page-render.md` post-`b28aead`; the rendered prose's length followed content (Prose Craft Contract Rule 11), with no word target/floor at the LLM-facing surface. Under the scene-commitment-arc pivot, Phase 7 now renders ALL beats of an arc in ONE LLM call (not one beat) — so the prompt structure expands to include the arc's structural blocks (`arc_contract`, `dramatic_unit`, `beat_plan`, `execution_envelope`, `stop_policy.normal_exits`) plus the chosen variant's `required_effects[]`. SPEC-20 §D specifies the rewritten prompt structure, the beat-header policy, and the Length-per-Rule-11 discipline that prevents the b28aead-removed word-target padding pathology from re-entering the prompt.

## Assumption Reassessment (2026-05-07)

1. At reassessment before implementation, verified `.claude/skills/branching-story-page-cycle/references/phase-7-page-render.md` existed and housed single-beat render prose. The 8-axis prose critic verdict (per `prose-craft-contract.md`) already included `padding_or_truncation` as the 8th axis (added in commit `b28aead` 2026-05-06). Post-cutover, the rewritten prompt block adds arc-level structural blocks but preserves the Length-per-Rule-11 instruction verbatim.
2. Verified `prose-craft-contract.md` Rule 11 ("Length follows content") is the active runtime contract that the rewritten Phase 7 prompt must honor — *"Page length is not a target. … There is no words-per-page range to hit, no minimum to clear, no maximum to honor."* This ticket's rewrite preserves the contract by NOT introducing word-count targets or floors at the LLM-facing surface; the engine-only `arc.stop_policy.safety_valves.max_words` (defined in archived SPEC-19 §A) remains a runaway-defense termination trigger only.
3. Cross-skill boundary: `branching-story-page-cycle/references/phase-7-…` consumes (a) the arc record and chosen variant produced by SPEC20SCECOM-001 (Phase 4 + 4b), (b) the prose-craft-contract from `prose-craft-contract.md` (verbatim in prompt), (c) the content_policy block from `templates/content-policy.txt` (verbatim). The contract under audit is the LLM-prompt block ordering (content_policy FIRST) and the Length-per-Rule-11 discipline that the prompt must NOT contradict.
4. FOUNDATIONS Rule 6 (No Silent Retcons) — renumbered from template item 4: this ticket preserves the b28aead Rule 11 contract by structurally preventing word-count target/floor reintroduction; the explicit attribution to commit `b28aead` is documented inline so future readers see why the discipline exists.
5. Verification-boundary correction: the drafted skill dry-run / fixture render proof is not executable yet because the live repo does not have SPEC-22's v2 validators/schema implementation or the SPEC20SCECOM-011 capstone fixture surface. This ticket's truthful proof is documentation-surface grep plus manual review against SPEC-20 §D, `prose-craft-contract.md` Rule 11, and FOUNDATIONS Mystery Reserve / no-silent-retcon discipline.

## Architecture Check

1. Rendering all beats of an arc in ONE LLM call (vs. N calls for N beats) is the load-bearing structural change of the scene-commitment-arc pivot — it eliminates the per-beat token-cost amplification (~5 calls per beat × N beats per scene) that the pivot's research brief identified as a primary pathology. Continuous prose also matches the dramatic unit (a scene, not a sequence of beats).
2. Length-per-Rule-11 discipline preserves the b28aead contract structurally. Reintroducing word-count targets or floors at the LLM-facing surface would re-trigger the padding pathology that drove `b28aead`'s removal of word-per-page guidelines. The engine-only `safety_valves.max_words` runaway-defense provides a hard upper bound without becoming a target.
3. No backwards-compatibility aliasing/shims: v1 single-beat render is retired; the rewritten prompt is the only render path post-cutover.

## Verification Layers

1. LLM-prompt block ordering (content_policy verbatim FIRST; arc structural blocks after) → codebase grep-proof in `phase-7-page-render.md` for the prompt block sequence.
2. Length-per-Rule-11 discipline (no word target/floor at LLM-facing surface) → codebase grep-proof in `phase-7-page-render.md` confirming absence of phrases like "target N words", "min words", "preferred_words_per_arc"; presence of "Length per Prose Craft Contract Rule 11" anchor.
3. Beat-header absence policy → codebase grep-proof for the markdown-header-detection re-prompt rule.
4. 8-axis prose critic preserved → codebase grep-proof in the same reference for the 8-axis verdict structure (matches existing `prose-craft-contract.md` verdict shape including `padding_or_truncation`).

## Landed Changes

### 1. Phase 7 prompt structure

In `.claude/skills/branching-story-page-cycle/references/phase-7-page-render.md`, replaced the single-beat render prompt with a multi-beat arc render prompt. The prompt structure is now:

```
[content_policy verbatim]
[story kernel]
[prose craft contract verbatim]
[arc.arc_contract block]                     # commitment_class, user_intent, strategic_question_answered
[arc.dramatic_unit block]                    # scene_question, entry_pressure, value_delta_target
[arc.beat_plan block]                        # beat functions (NOT to be echoed as beat headers in prose)
[arc.execution_envelope block]               # invariants, required_functions, allowed_tactics, prohibited_actions, style_directives
[arc.stop_policy.normal_exits block]         # which exits the LLM may steer toward (the chosen variant determines which)
[chosen variant.required_effects]            # what state must change by arc-close
[scene context — cast, location, current_state highlights]
[recent prose continuity along branch_path only]
[governor_nudge]

INSTRUCTION:
Render the arc as continuous prose, NOT as a beat-headered enumeration. The beat plan
is the structural sketch — the prose should embody the beats as scene movement, not
list them. The arc closes when one of stop_policy.normal_exits[] fires; arrange the
prose to drive toward exactly one exit. Honor Prose Craft Contract Rule 11: length
follows content; do not pad to fill space and do not truncate to fit a budget. Do
not violate any prohibited_actions. Do not resolve any forbidden mystery.
```

### 2. Length-per-Rule-11 paragraph

Added a paragraph after the prompt block:

> **Length per Prose Craft Contract Rule 11**: arc render length follows content — the prose is as long as the beats, the cast's reactions, and the natural close-where-the-next-commitment-becomes-available require. There is no target word count, no minimum to clear, and no maximum to honor at the LLM-facing surface. The engine-side `arc.stop_policy.safety_valves.max_words` is a runaway-defense termination trigger only (engine sees it; LLM does not); it is never surfaced in the rendering prompt and is not used as a re-prompt constraint. Pacing — how multi-beat the prose feels, how often the user is asked to commit — is expressed structurally through `arc.beat_plan.min_beats` / `max_beats` and the `cadence_policy` arc-unit fields in §H, not through any word-count budget.

### 3. Beat-header policy

The reference now states that the LLM MUST NOT emit beat headers in the rendered prose. Beat plans live in the prompt; the prose is continuous. Validator: a markdown-header-detection pass on the rendered prose; presence of headers → re-prompt.

### 4. 8-axis prose critic preserved

Updated the existing prose-critic invocation to cite "8-axis prose critic" (matches `prose-craft-contract.md` post-`b28aead`); the verdict shape enumerates: filter-word saturation, recurring-metaphor across pages, identical-anchor recurrence, self-narrating-self, bracket-paraphrasing-dialogue, ledger-jargon-leakage, abstract-noun-saturation, padding-or-truncation. Critic budget: up to 3 re-prompts (shared with Phase 7.6 three-layer validation — SPEC20SCECOM-004).

### 5. Phase 7.6 handoff

Removed the v1 implication that Phase 7 ends by preparing 4-6 choices. The reference now states that Phase 7 hands a prose working buffer to Phase 7.6 for ARC_TRACE extraction and validation, and that Phase 8 decides the choice surface only after a validated arc-close narrative point.

## Files to Touch

- `.claude/skills/branching-story-page-cycle/references/phase-7-page-render.md` (modify)

## Out of Scope

- Phase 7.6 ARC_TRACE extraction (SPEC20SCECOM-004) — this ticket lands the render; the trace extraction is a separate phase.
- `prose-craft-contract.md` modifications — already at correct state post-`b28aead`; this ticket consumes it.
- STORY_KERNEL.md `cadence_policy` blocks (SPEC20SCECOM-007).
- Storylet template comment edit (SPEC20SCECOM-010).
- `safety_valves.max_words` schema field (already defined in archived SPEC-19 §A).
- SKILL.md Phase 7 description summary (SPEC20SCECOM-009).

## Acceptance Criteria

### Tests That Must Pass

1. Documentation proof: `phase-7-page-render.md` documents the Phase 7 prompt as one multi-beat arc render, not one beat render.
2. Documentation proof: `phase-7-page-render.md` documents Length-per-Rule-11 discipline and keeps `safety_valves.max_words` engine-only, not LLM-facing.
3. Documentation proof: `phase-7-page-render.md` documents markdown beat headers as a post-render re-prompt trigger.
4. Documentation proof: `phase-7-page-render.md` preserves the 8-axis prose critic verdict structure from `prose-craft-contract.md`, including `padding_or_truncation`.

### Invariants

1. The LLM-facing prompt does NOT contain word-count targets, floors, or ranges (no `min_words: N`, no `target_words: N`, no `preferred_words: [N, M]`); only Rule 11 instruction.
2. The 8-axis prose critic verdict structure is preserved verbatim from `prose-craft-contract.md` (no axis additions or removals; ordering preserved).

## Test Plan

### New/Modified Tests

1. None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment. Full-pipeline empirical verification, including a real arc-shape fixture render and safety-valve behavior, is owned by SPEC20SCECOM-011 capstone after SPEC-22 lands.

### Commands

1. `grep -nE "Length per Prose Craft Contract Rule 11|continuous prose|beat plan is the structural sketch" .claude/skills/branching-story-page-cycle/references/phase-7-page-render.md` — confirms NEW prompt anchors land.
2. `grep -nE "target.*words|preferred_words|min_words" .claude/skills/branching-story-page-cycle/references/phase-7-page-render.md | grep -v "Rule 11\|safety_valves\|engine-only\|runaway-defense"` — should return zero matches outside the deliberate Rule 11 / engine-only attribution paragraphs (audit-trail retention exception per `reassess-spec/references/spec-writing-rules.md` §Audit-trail retention exception).
3. `grep -n "8-axis prose critic" .claude/skills/branching-story-page-cycle/references/phase-7-page-render.md` — confirms 8-axis (not 7-axis) critic citation lands.

## Outcome

Completed: 2026-05-07. `.claude/skills/branching-story-page-cycle/references/phase-7-page-render.md` now documents Phase 7 as a one-call multi-beat arc render. The prompt block places `content_policy` first, embeds story kernel and prose craft contract before arc structure, supplies `arc_contract`, `dramatic_unit`, `beat_plan`, `execution_envelope`, `stop_policy.normal_exits`, and chosen `variant.required_effects[]`, and instructs continuous prose instead of beat-headered enumeration.

The reference now records Length-per-Rule-11 discipline, keeps `arc.stop_policy.safety_valves.max_words` engine-only as a runaway-defense trigger, adds a beat-header re-prompt policy, preserves the 8-axis prose critic verdict shape including `padding_or_truncation`, and hands the validated prose buffer to Phase 7.6 before Phase 8 decides the choice surface.

## Verification Result

1. PASS — `grep -nE "Length per Prose Craft Contract Rule 11|continuous prose|beat plan is the structural sketch" .claude/skills/branching-story-page-cycle/references/phase-7-page-render.md`.
2. PASS — `grep -nE "target.*words|preferred_words|min_words" .claude/skills/branching-story-page-cycle/references/phase-7-page-render.md | grep -v "Rule 11\|safety_valves\|engine-only\|runaway-defense"` returned zero non-exempt matches.
3. PASS — `grep -n "8-axis prose critic" .claude/skills/branching-story-page-cycle/references/phase-7-page-render.md`.
4. PASS — `grep -nE "markdown-header|Beat-Header Policy|Phase 7.6|padding_or_truncation|ledger_jargon_leakage" .claude/skills/branching-story-page-cycle/references/phase-7-page-render.md`.
5. PASS — manual review against `specs/SPEC-20-scene-commitment-arc-runtime-pipeline.md` §D, `prose-craft-contract.md` Rule 11 / diagnostic vocabulary, and `docs/FOUNDATIONS.md` confirmed the landed Phase 7 reference preserves no-silent-retcon and forbidden-mystery discipline while moving render cadence from beat to arc.

## Deviations

1. The drafted skill dry-run / fixture render proof was not executed because SPEC-22's v2 validators and schema implementation remain pending, and the full empirical fixture proof is owned by SPEC20SCECOM-011. This ticket's accepted proof is the documentation-surface contract.
2. Parent `.claude/skills/branching-story-page-cycle/SKILL.md` still has v1 Phase 7 summary prose by design. Active follow-up `tickets/SPEC20SCECOM-009.md` owns the cross-cutting SKILL.md process-flow and phase-summary update after the phase reference files land.
