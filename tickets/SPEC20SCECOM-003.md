# SPEC20SCECOM-003: Phase 7 — Multi-Beat Arc Render with Length-per-Rule-11 Discipline

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `.claude/skills/branching-story-page-cycle/references/phase-7-page-render.md` rewritten for continuous multi-beat prose; LLM-prompt block updated; 8-axis prose critic preserved per `prose-craft-contract.md`; engine-only `safety_valves.max_words` runaway-defense (NOT visible to LLM); Length per Prose Craft Contract Rule 11 (no word target/floor at LLM-facing surface).
**Deps**: `archive/tickets/SPEC20SCECOM-001.md` (Phase 4b chooses variant fed into prompt); `archive/tickets/SPEC20SCECOM-002.md` (state-mutation discipline established before render)

## Problem

Current Phase 7 renders one beat as continuous prose per `phase-7-page-render.md` post-`b28aead`; the rendered prose's length follows content (Prose Craft Contract Rule 11), with no word target/floor at the LLM-facing surface. Under the scene-commitment-arc pivot, Phase 7 must render ALL beats of an arc in ONE LLM call (not one beat) — so the prompt structure expands to include the arc's structural blocks (`arc_contract`, `dramatic_unit`, `beat_plan`, `execution_envelope`, `stop_policy.normal_exits`) plus the chosen variant's `required_effects[]`. SPEC-20 §D specifies the rewritten prompt structure, the beat-header policy, and the Length-per-Rule-11 discipline that prevents the b28aead-removed word-target padding pathology from re-entering the prompt.

## Assumption Reassessment (2026-05-07)

1. Verified `.claude/skills/branching-story-page-cycle/references/phase-7-page-render.md` exists and houses current single-beat render prose. The 8-axis prose critic verdict (per `prose-craft-contract.md`) includes `padding_or_truncation` as the 8th axis (added in commit `b28aead` 2026-05-06). Post-cutover, the rewritten prompt block adds arc-level structural blocks but preserves the Length-per-Rule-11 instruction verbatim.
2. Verified `prose-craft-contract.md` Rule 11 ("Length follows content") is the active runtime contract that the rewritten Phase 7 prompt must honor — *"Page length is not a target. … There is no words-per-page range to hit, no minimum to clear, no maximum to honor."* This ticket's rewrite preserves the contract by NOT introducing word-count targets or floors at the LLM-facing surface; the engine-only `arc.stop_policy.safety_valves.max_words` (defined in archived SPEC-19 §A) remains a runaway-defense termination trigger only.
3. Cross-skill boundary: `branching-story-page-cycle/references/phase-7-…` consumes (a) the arc record and chosen variant produced by SPEC20SCECOM-001 (Phase 4 + 4b), (b) the prose-craft-contract from `prose-craft-contract.md` (verbatim in prompt), (c) the content_policy block from `templates/content-policy.txt` (verbatim). The contract under audit is the LLM-prompt block ordering (content_policy FIRST) and the Length-per-Rule-11 discipline that the prompt must NOT contradict.
4. FOUNDATIONS Rule 6 (No Silent Retcons) — renumbered from template item 4: this ticket preserves the b28aead Rule 11 contract by structurally preventing word-count target/floor reintroduction; the explicit attribution to commit `b28aead` is documented inline so future readers see why the discipline exists.

## Architecture Check

1. Rendering all beats of an arc in ONE LLM call (vs. N calls for N beats) is the load-bearing structural change of the scene-commitment-arc pivot — it eliminates the per-beat token-cost amplification (~5 calls per beat × N beats per scene) that the pivot's research brief identified as a primary pathology. Continuous prose also matches the dramatic unit (a scene, not a sequence of beats).
2. Length-per-Rule-11 discipline preserves the b28aead contract structurally. Reintroducing word-count targets or floors at the LLM-facing surface would re-trigger the padding pathology that drove `b28aead`'s removal of word-per-page guidelines. The engine-only `safety_valves.max_words` runaway-defense provides a hard upper bound without becoming a target.
3. No backwards-compatibility aliasing/shims: v1 single-beat render is retired; the rewritten prompt is the only render path post-cutover.

## Verification Layers

1. LLM-prompt block ordering (content_policy verbatim FIRST; arc structural blocks after) → codebase grep-proof in `phase-7-page-render.md` for the prompt block sequence.
2. Length-per-Rule-11 discipline (no word target/floor at LLM-facing surface) → codebase grep-proof in `phase-7-page-render.md` confirming absence of phrases like "target N words", "min words", "preferred_words_per_arc"; presence of "Length per Prose Craft Contract Rule 11" anchor.
3. Beat-header absence policy → codebase grep-proof for the markdown-header-detection re-prompt rule.
4. 8-axis prose critic preserved → codebase grep-proof in the same reference for the 8-axis verdict structure (matches existing `prose-craft-contract.md` verdict shape including `padding_or_truncation`).

## What to Change

### 1. Phase 7 prompt structure (rewrite)

In `.claude/skills/branching-story-page-cycle/references/phase-7-page-render.md`, replace the current single-beat render prompt with a multi-beat arc render prompt. The prompt structure (in code-block form):

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

### 2. Length-per-Rule-11 paragraph (NEW)

Add a paragraph after the prompt block:

> **Length per Prose Craft Contract Rule 11**: arc render length follows content — the prose is as long as the beats, the cast's reactions, and the natural close-where-the-next-commitment-becomes-available require. There is no target word count, no minimum to clear, and no maximum to honor at the LLM-facing surface. The engine-side `arc.stop_policy.safety_valves.max_words` is a runaway-defense termination trigger only (engine sees it; LLM does not); it is never surfaced in the rendering prompt and is not used as a re-prompt constraint. Pacing — how multi-beat the prose feels, how often the user is asked to commit — is expressed structurally through `arc.beat_plan.min_beats` / `max_beats` and the `cadence_policy` arc-unit fields in §H, not through any word-count budget.

### 3. Beat-header policy

The LLM MUST NOT emit beat headers in the rendered prose. Beat plans live in the prompt; the prose is continuous. Validator: a markdown-header-detection pass on the rendered prose; presence of headers → re-prompt.

### 4. 8-axis prose critic preserved

Update the existing prose-critic invocation to cite "8-axis prose critic" (matches `prose-craft-contract.md` post-`b28aead`); enumerate the axes: filter-word saturation, recurring-metaphor across pages, identical-anchor recurrence, self-narrating-self, bracket-paraphrasing-dialogue, ledger-jargon-leakage, abstract-noun-saturation, padding-or-truncation. Critic budget: up to 3 re-prompts (shared with Phase 7.6 three-layer validation — SPEC20SCECOM-004).

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

1. Skill dry-run: `branching-story-page-cycle` renders an arc-shape SLT through Phase 7 on a fixture story; rendered prose is continuous (no `## Beat 1` / `## Beat 2` markdown headers); 8-axis prose critic verdict is PASS or SOFT_FAIL with re-prompt budget intact.
2. Length-per-Rule-11 enforcement: the rendered prose's length is determined by content, not by `safety_valves.max_words` ceiling — fixture renders that close at `stop_policy.normal_exits[]` BEFORE hitting the safety valve are NOT re-prompted to extend the prose.
3. Engine-only safety valve: prose that exceeds `safety_valves.max_words` IS re-prompted with the runaway-defense surfacing (engine catches the runaway; LLM never saw the ceiling as a target).

### Invariants

1. The LLM-facing prompt does NOT contain word-count targets, floors, or ranges (no `min_words: N`, no `target_words: N`, no `preferred_words: [N, M]`); only Rule 11 instruction.
2. The 8-axis prose critic verdict structure is preserved verbatim from `prose-craft-contract.md` (no axis additions or removals; ordering preserved).

## Test Plan

### New/Modified Tests

1. None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment. Full-pipeline empirical verification owned by SPEC20SCECOM-011 capstone.

### Commands

1. `grep -nE "Length per Prose Craft Contract Rule 11|continuous prose|beat plan is the structural sketch" .claude/skills/branching-story-page-cycle/references/phase-7-page-render.md` — confirms NEW prompt anchors land.
2. `grep -nE "target.*words|preferred_words|min_words" .claude/skills/branching-story-page-cycle/references/phase-7-page-render.md | grep -v "Rule 11\|safety_valves\|engine-only\|runaway-defense"` — should return zero matches outside the deliberate Rule 11 / engine-only attribution paragraphs (audit-trail retention exception per `reassess-spec/references/spec-writing-rules.md` §Audit-trail retention exception).
3. `grep -n "8-axis prose critic" .claude/skills/branching-story-page-cycle/references/phase-7-page-render.md` — confirms 8-axis (not 7-axis) critic citation lands.
