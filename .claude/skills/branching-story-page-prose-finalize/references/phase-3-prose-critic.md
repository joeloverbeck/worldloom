# Phase 3: 8-axis Prose Critic

Phase 3 runs an LLM critic over the rendered prose against the Prose Craft Contract's diagnostic vocabulary. The eight axes come from `branching-story-page-cycle/references/prose-craft-contract.md` §Diagnostic Vocabulary; this Phase 3 is now the SOLE site where the post-render critic runs (the critic was moved out of `branching-story-page-cycle` Phase 7 in the prose-rendering-out-of-skill refactor — Phase 7 is now plan-authoring only, and there is no rendered prose at plan-commit to critique). The critic operates on user-supplied or external-LLM-rendered prose. The verdict feeds the Phase 5 `prose_critic_8_axis` gate and (on `SOFT_FAIL`) the Phase 6 ACCEPT_AS_IS routing.

## Axes

The eight axes come verbatim from `.claude/skills/branching-story-page-cycle/references/prose-craft-contract.md` §Diagnostic Vocabulary. Load that file at Phase 3 prompt assembly; do NOT inline the table here. The axes (for cross-reference only):

1. `filter_word_saturation` — Rules 2, 3
2. `recurring_metaphor_across_pages` — Rules 6, 7
3. `identical_anchor_recurrence` — Rule 6
4. `self_narrating_self` — Rule 8
5. `bracket_paraphrasing_dialogue` — Rule 8
6. `ledger_jargon_leakage` — Rule 9 (Phase 2 already caught the deterministic regex form; Phase 3 catches paraphrased / hyphenated-compound forms the regex missed)
7. `abstract_noun_saturation` — Rules 4, 5
8. `padding_or_truncation` — Rule 11

The canonical source of truth IS the prose-craft-contract.md file. If a future edit to that file adds a ninth axis or renames an existing one, this skill consumes the updated vocabulary automatically because Phase 3's prompt loads the contract verbatim — no duplication is maintained here.

## Inputs

- Rendered prose body.
- `prose-craft-contract.md` (loaded at pre-flight from `.claude/skills/branching-story-page-cycle/references/prose-craft-contract.md`).
- `content_policy` block from STORY_KERNEL.md (loaded at pre-flight; inlined FIRST in the critic prompt).
- Prior 1-2 rendered prose pages along `branch_path` (loaded at pre-flight; used for cross-page tic detection on axes 2 and 3).
- Plan §18 REQUIRED TURN line (used as a scene-coherence anchor; the critic also flags `padding_or_truncation` if the prose pads past the REQUIRED TURN or truncates before reaching it).

## Prompt Shape

Assemble the LLM critic prompt in this order:

```
1. content_policy verbatim
2. references/prose-craft-contract.md verbatim (full file, including §Diagnostic Vocabulary table)
3. Cross-page-tic instructions:
   "The following are the 1-2 most recent pages along this branch. Inspect axes 2
   (recurring_metaphor_across_pages) and 3 (identical_anchor_recurrence) against these
   pages — any metaphor token, specific concrete anchor, or characteristic phrasing
   reused verbatim or near-verbatim is a fault."

   [prior pages-prose/PG-NNNN.md body, separated by ===PRIOR-PAGE-BOUNDARY===]
4. Plan §18 REQUIRED TURN cue:
   "The plan committed the following REQUIRED TURN for this page:
   '<one-sentence binding outcome>'. Inspect axis 8 (padding_or_truncation) against this:
   does the prose realize the REQUIRED TURN by its end, neither padding past it nor
   truncating before reaching it?"
5. Rendered prose:
   "===RENDERED-PROSE-BEGIN===
   [rendered prose body]
   ===RENDERED-PROSE-END==="
6. Verdict instruction:
   "Return one verdict per axis (PASS / SOFT_FAIL / HARD_FAIL) with cited instances.
   Then return an overall verdict that aggregates per-axis results:
   - PASS: all 8 axes PASS.
   - SOFT_FAIL: 1-3 axes SOFT_FAIL, no axis HARD_FAIL.
   - HARD_FAIL: any axis HARD_FAIL OR ≥4 axes SOFT_FAIL.
   Cite specific offsets / quoted spans for every non-PASS axis."
```

## Verdict Shape

The critic returns a structured verdict:

```yaml
overall: PASS | SOFT_FAIL | HARD_FAIL
per_axis:
  filter_word_saturation:
    verdict: PASS | SOFT_FAIL | HARD_FAIL
    cited_instances: ["<quoted span at offset N>", ...]
  recurring_metaphor_across_pages: { verdict: ..., cited_instances: [...] }
  identical_anchor_recurrence: { verdict: ..., cited_instances: [...] }
  self_narrating_self: { verdict: ..., cited_instances: [...] }
  bracket_paraphrasing_dialogue: { verdict: ..., cited_instances: [...] }
  ledger_jargon_leakage: { verdict: ..., cited_instances: [...] }
  abstract_noun_saturation: { verdict: ..., cited_instances: [...] }
  padding_or_truncation: { verdict: ..., cited_instances: [...] }
notes: <one-paragraph overall observation>
```

## Severity Aggregation

| Per-axis distribution | Overall | Routing |
|---|---|---|
| All 8 PASS | PASS | Proceed to Phase 4. |
| 1-3 SOFT_FAIL, no HARD_FAIL | SOFT_FAIL | Proceed to Phase 4; surface at Phase 6; user may elect ACCEPT_AS_IS or REVISE-prose. |
| Any HARD_FAIL | HARD_FAIL | Halt. No Phase 4, no Phase 5, no Phase 6, no engine writes. Report axes + cited instances to user; user revises prose externally and re-runs. |
| ≥4 SOFT_FAIL | HARD_FAIL | Same as above — too many soft failures aggregate to hard. |

## Cross-page Tic Detection Discipline

Axes 2 and 3 (`recurring_metaphor_across_pages`, `identical_anchor_recurrence`) require prior-page context to evaluate. When the page being finalized is `PG-0001` (no parent / no prior prose along branch_path), these axes auto-PASS with rationale:

```
recurring_metaphor_across_pages: PASS — PG-0001 root page; no prior prose along branch_path
identical_anchor_recurrence: PASS — PG-0001 root page; no prior prose along branch_path
```

Otherwise, the critic must compare against the loaded prior pages. If `branch_path` length is 1 (parent is PG-0001), only one prior page is loaded; this is sufficient.

## Halting Policy

Phase 3 has NO re-prompt loop — unlike `branching-story-page-cycle` Phase 7, which has a 3-re-prompt budget shared with Phase 7.6. Here, the prose is supplied externally; the skill cannot regenerate it. A `HARD_FAIL` returns the cited axes + instances to the user, who:

- Revises the prose file at `pages-prose/PG-NNNN.md`, or
- Re-renders against the same plan via the external renderer, or
- Re-runs `branching-story-page-cycle` (or `branching-story-bootstrap` for PG-0001) Phase 7 to regenerate the plan if the plan itself is judged the source of the failure.

In all cases the user then re-runs `branching-story-page-prose-finalize`.

## Phase 3 Output

- `overall` verdict (PASS / SOFT_FAIL / HARD_FAIL).
- Per-axis verdicts and cited instances.
- Recorded in working context for:
  - Phase 5's `prose_critic_8_axis` gate (records the overall verdict + a one-line rationale derived from `notes`).
  - Phase 6's deliverable summary (full per-axis breakdown).
  - Phase 7's SE event notes (one-line summary of the verdict).
