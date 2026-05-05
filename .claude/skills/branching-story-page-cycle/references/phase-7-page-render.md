# Phase 7: Page Render

## LLM Prompt Assembly

Order matters; content_policy is FIRST so it binds the model before any other instruction.

```
[content_policy block — verbatim, NC-21]

[story kernel — premise + designing principle + tone + content_intensity_baseline + invariants_acknowledged + mysteries_in_play]

[PROSE CRAFT CONTRACT — verbatim from `branching-story-page-cycle/references/prose-craft-contract.md`]

[selected storylet — title + tone_tags + theme_tags + content_intensity + opens_obligations + pays_off_obligations]

[scene context]
- location: <derived from storylet location_requirements + state>
- cast present: <list of STENT names + role_in_story>
- POV: <STENT name>
- facts visible to POV: <list>
- open OBLs visible to POV: <list>
- current STINT for POV: <goals + fears + current_pressure summary>

[recent prose continuity — for narrative and world continuity ONLY (where things are, who is present, what just happened); do NOT echo prior phrasings, recurring metaphors, or specific concrete anchors verbatim]
- Last ~2 pages of prose along this branch_path (NOT sibling branches)

[governor_nudge — what kind of beat the story needs now]

INSTRUCTION:
Render the next page in <length_target> words. Show through action, dialogue, and
sensory detail. Respect content_intensity. Do not invent facts beyond those in
state context. Do not resolve any mystery declared in mysteries_in_play[] unless
the selected storylet explicitly authorizes resolution.

End the page at a moment where 4-6 distinct choices for what happens next would
be natural. The applied event from the user's prior choice is:
<event summary>. Make this consequence visible.

Honor the PROSE CRAFT CONTRACT above. The post-render prose critic will flag
filter-word saturation, recurring-metaphor recurrence across pages,
identical-anchor reuse, self-narrating-self patterns, ledger-jargon leakage,
and bracket-paraphrasing.
```

LLM produces prose. Engine writes to a working buffer (NOT to disk yet — disk write happens at Phase 11 inside the atomic transaction).

## Post-Render Prose Critic

Executes AFTER the LLM produces prose to the working buffer and BEFORE the canon-safety cross-check below. The critic and the rendering prompt share a single source of truth: `branching-story-page-cycle/references/prose-craft-contract.md`. The critic's verdict cites the contract's diagnostic vocabulary; failures route to a re-prompt with the cited instances inlined.

**Critic call inputs:**

- The rendered prose (from the working buffer).
- The prose craft contract verbatim.
- The prior 1-2 pages of prose along the branch (for cross-page tic detection — `recurring_metaphor_across_pages` and `identical_anchor_recurrence`).

**Verdict shape:**

```yaml
prose_critic_verdict:
  filter_word_saturation: clean | minor | moderate | severe   # cite up to 5 instances
  recurring_metaphor_across_pages: clean | found              # cite verbatim re-uses
  identical_anchor_recurrence: clean | found                  # cite verbatim re-uses
  self_narrating_self: clean | minor | moderate | severe      # cite up to 3 instances
  bracket_paraphrasing_dialogue: clean | found                # cite paragraphs
  ledger_jargon_leakage: clean | found                        # cite tokens
  abstract_noun_saturation: clean | minor | moderate | severe
  overall_verdict: PASS | SOFT_FAIL | HARD_FAIL
```

**Routing:**

| Verdict | Trigger | Action |
|---|---|---|
| `HARD_FAIL` | `ledger_jargon_leakage: found` OR ≥2 axes at `severe` | Re-prompt with cited instances inlined; counts against the existing 3-re-prompt budget; after 3 fails, escalate to the user with the verdict |
| `SOFT_FAIL` | Any single axis at `moderate`/`severe`, OR `recurring_metaphor_across_pages` / `identical_anchor_recurrence` / `bracket_paraphrasing_dialogue` flagged `found` | Re-prompt with cited instances inlined; counts against the existing 3-re-prompt budget |
| `PASS` | All axes `clean` (with up to `minor` allowed on the `severity`-typed axes) | Proceed to canon-safety cross-check below |

**Per `execution_mode`:**

| Mode | Critic axes run |
|---|---|
| `authoring` (default) | All 7 axes |
| `interactive_runtime` | `ledger_jargon_leakage` (HARD-FAIL surface) + `recurring_metaphor_across_pages` + `identical_anchor_recurrence` only |
| `batch_generation` | All 7 axes at configured checkpoints only; default off |

The critic shares the existing 3-re-prompt budget with the canon-safety cross-check and the fail-fast checks below — it does NOT introduce a new budget. The contract's rule numbering (1-10) is the citation index used in re-prompts and verdicts.

## Cross-Check (engine + post-render claim classification)

The prose MAY include:
- sensory detail, metaphor, environmental color
- memories of past events (this branch's events or world-canon events the POV would know)
- rumors (must be marked as such in narration; circulating SFs of `epistemic_class: rumor` are OK to surface)
- offstage references to absent characters
- named absent characters (a letter from someone not present is fine)
- incidental objects not in `objects_in_scope` if their use is not load-bearing for the page's transaction

The prose MAY NOT:
- depict an entity as physically present unless included in `cast_present`
- make a load-bearing factual claim absent from `state_snapshot` (objective_facts, apparent_facts, belief_state_by_actor, world canon visible to POV)
- create a usable object, clue, location, relationship, or secret unless that fact is written as an `SF` / `STOBJ` / `STLOC` / `SREL` / `DA` record this turn
- resolve a mystery unless the selected storylet's `mystery_safety.M_resolution_claims` authorizes the corresponding `resolution_authority`

After rendering, run a post-render extraction step. The engine asks an LLM critic to extract candidate load-bearing claims from the prose and classify each:

| Classification | Action |
|---|---|
| `already-ledgered` | no action |
| `incidental-color` | no action; record as `prose_only` (no ledger update needed) |
| `needs-ledger-record` | engine emits the corresponding SF / STOBJ / STLOC / SREL / DA record this turn (or re-prompts the LLM to remove the claim if it's not actually load-bearing) |
| `contradiction` | re-prompt to remove or revise; the prose contradicts existing state |
| `mystery-risk` | hard-reject; the prose risks unauthorized mystery resolution |

This makes prose richer (rumor / memory / scenery / offstage references all permitted) and keeps the validator honest about what actually requires a ledger entry.

| Quick fail-fast checks (before extraction) | On fail |
|---|---|
| Does the prose violate the content_intensity band? | Re-prompt with band correction |
| Does the prose contradict the storylet's intended fact_effects (overrides instead of honoring)? | Re-prompt |
| Does the prose violate the choice contract's `forbidden_outcomes` (Phase 8)? | HARD-REJECT → re-prompt |

Up to 3 re-prompts before escalating to the user.
