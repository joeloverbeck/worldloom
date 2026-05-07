# Phase 7: Multi-Beat Arc Render

Phase 7 renders the selected scene-commitment arc as one continuous prose unit. The unit of render is the arc, not a beat. The LLM receives the arc's structural blocks and the chosen variant's required effects, then produces prose that embodies the beat plan as scene movement.

LLM output goes to a working buffer only. Disk writes still happen at Phase 11 after the engine YAML transaction and validation gates pass.

## LLM Prompt Assembly

Order matters; `content_policy` is FIRST so it binds the model before any other instruction.

```
[content_policy block — verbatim, from `branching-story-page-cycle/templates/content-policy.txt`]

[story kernel — premise + designing principle + tone + content_intensity_baseline + invariants_acknowledged + mysteries_in_play]

[PROSE CRAFT CONTRACT — verbatim from `branching-story-page-cycle/references/prose-craft-contract.md`]

[arc.arc_contract block]
- commitment_class
- user_intent
- strategic_question_answered

[arc.dramatic_unit block]
- scene_question
- entry_pressure
- value_delta_target

[arc.beat_plan block]
- min_beats
- max_beats
- beat functions
- required turn-shape notes
- DO NOT echo beat functions as markdown or prose headers

[arc.execution_envelope block]
- invariants
- required_functions
- allowed_tactics
- prohibited_actions
- style_directives
- mystery_preservation

[arc.stop_policy.normal_exits block]
- normal exits the prose may steer toward
- chosen variant determines which exit family the render should satisfy

[chosen variant.required_effects]
- required arc-close effects selected in Phase 4b
- render these as realized scene consequences, not as ledger jargon

[scene context]
- location: <derived from arc location_requirements + current state>
- cast present: <list of STENT names + role_in_story>
- POV: <STENT name>
- facts visible to POV: <list>
- open OBLs visible to POV: <list>
- current STINT for POV: <goals + fears + current_pressure summary>
- current_state highlights needed to honor the arc envelope

[recent prose continuity — for narrative and world continuity ONLY (where things are, who is present, what just happened); do NOT echo prior phrasings, recurring metaphors, or specific concrete anchors verbatim]
- Last ~2 pages of prose along this branch_path (NOT sibling branches)

[governor_nudge — what kind of arc-pressure the story needs now]

INSTRUCTION:
Render the arc as continuous prose, NOT as a beat-headered enumeration. The beat plan
is the structural sketch — the prose should embody the beats as scene movement, not
list them. The arc closes when one of stop_policy.normal_exits[] fires; arrange the
prose to drive toward exactly one exit. Honor Prose Craft Contract Rule 11: length
follows content; do not pad to fill space and do not truncate to fit a budget. Do
not violate any prohibited_actions. Do not resolve any forbidden mystery.
```

## Length per Prose Craft Contract Rule 11

Arc render length follows content: the prose is as long as the beats, the cast's reactions, and the natural close-where-the-next-commitment-becomes-available require. There is no target word count, no minimum to clear, and no maximum to honor at the LLM-facing surface.

The engine-side `arc.stop_policy.safety_valves.max_words` is a runaway-defense termination trigger only. The engine sees it; the LLM does not. It is never surfaced in the rendering prompt and is not used as a re-prompt constraint. A render that closes cleanly before the safety valve fires is not extended to reach a length. A render that exceeds the safety valve is re-prompted as a runaway-defense failure, not as a soft word-budget miss.

Pacing is structural, not word-count based. How multi-beat the prose feels and how often the user is asked to commit are expressed through `arc.beat_plan.min_beats`, `arc.beat_plan.max_beats`, and the `cadence_policy` arc-unit fields, not through any word-count budget.

## Beat-Header Policy

The LLM MUST NOT emit beat headers in the rendered prose. Beat plans live in the prompt; rendered prose is continuous.

Post-render validation runs a markdown-header-detection pass on the prose working buffer. Any markdown header that exposes the beat structure, such as `# Beat 1`, `## Beat 2`, or a comparable section-heading enumeration, fails Phase 7 and triggers a re-prompt. Persistent header leakage after the shared re-prompt budget is exhausted escalates to the user through the Phase 7.6 validation path.

## Post-Render Prose Critic

Executes AFTER the LLM produces prose to the working buffer and BEFORE Phase 7.6 ARC_TRACE extraction and validation. The 8-axis prose critic and the rendering prompt share a single source of truth: `branching-story-page-cycle/references/prose-craft-contract.md`. The critic's verdict cites the contract's diagnostic vocabulary; failures route to a re-prompt with the cited instances inlined.

**Critic call inputs:**

- The rendered prose (from the working buffer).
- The prose craft contract verbatim.
- The prior 1-2 pages of prose along the branch (for cross-page tic detection: `recurring_metaphor_across_pages` and `identical_anchor_recurrence`).
- The arc's `beat_plan`, `execution_envelope`, and chosen variant's `required_effects[]` as context for padding-or-truncation and ledger-jargon checks.

**8-axis prose critic verdict shape:**

```yaml
prose_critic_verdict:
  filter_word_saturation: clean | minor | moderate | severe   # cite up to 5 instances
  recurring_metaphor_across_pages: clean | found              # cite verbatim re-uses
  identical_anchor_recurrence: clean | found                  # cite verbatim re-uses
  self_narrating_self: clean | minor | moderate | severe      # cite up to 3 instances
  bracket_paraphrasing_dialogue: clean | found                # cite paragraphs
  ledger_jargon_leakage: clean | found                        # cite tokens
  abstract_noun_saturation: clean | minor | moderate | severe
  padding_or_truncation: clean | minor | moderate | severe    # cite up to 5 instances
  overall_verdict: PASS | SOFT_FAIL | HARD_FAIL
```

**Routing:**

| Verdict | Trigger | Action |
|---|---|---|
| `HARD_FAIL` | `ledger_jargon_leakage: found` OR >=2 axes at `severe` | Re-prompt with cited instances inlined; counts against the shared 3-re-prompt budget; after 3 fails, escalate to the user with the verdict |
| `SOFT_FAIL` | Any single axis at `moderate`/`severe`, OR `recurring_metaphor_across_pages` / `identical_anchor_recurrence` / `bracket_paraphrasing_dialogue` flagged `found` | Re-prompt with cited instances inlined; counts against the shared 3-re-prompt budget |
| `PASS` | All axes `clean` (with up to `minor` allowed on the severity-typed axes) | Proceed to Phase 7.6 ARC_TRACE extraction and three-layer validation |

**Per `execution_mode`:**

| Mode | Critic axes run |
|---|---|
| `authoring` (default) | All 8 axes |
| `interactive_runtime` | `ledger_jargon_leakage` (HARD-FAIL surface) + `recurring_metaphor_across_pages` + `identical_anchor_recurrence` only; `padding_or_truncation` is excluded from runtime mode for cost discipline, so runtime trusts the rendering prompt's Rule 11 instruction unless Phase 7.6 surfaces a structural issue |
| `batch_generation` | All 8 axes at configured checkpoints only; default off |

The prose critic shares the existing 3-re-prompt budget with Phase 7.6's three-layer validation. It does not introduce a separate budget. The contract's rule numbering (1-11) is the citation index used in re-prompts and verdicts.

## Phase 7.6 Handoff

After the prose critic passes, Phase 7 hands the working-buffer prose to Phase 7.6. Phase 7.6 owns ARC_TRACE extraction and deterministic/semantic validation of:

- markdown-header absence;
- beat-count fidelity against `arc.beat_plan.min_beats` / `max_beats`;
- forbidden-M preservation;
- branch-scope legality;
- effect-variant legality;
- required-effect evidence alignment;
- stop-condition classification.

Phase 7 does not emit choices. Phase 8 receives only a validated arc-close narrative point after Phase 7.6, then decides whether a choice surface is needed.
