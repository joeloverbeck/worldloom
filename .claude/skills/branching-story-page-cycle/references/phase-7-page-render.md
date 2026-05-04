# Phase 7: Page Render

## LLM Prompt Assembly

Order matters; content_policy is FIRST so it binds the model before any other instruction.

```
[content_policy block — verbatim, NC-21]

[story kernel — premise + designing principle + tone + content_intensity_baseline + invariants_acknowledged + mysteries_in_play]

[selected storylet — title + tone_tags + theme_tags + content_intensity + opens_obligations + pays_off_obligations]

[scene context]
- location: <derived from storylet location_requirements + state>
- cast present: <list of STENT names + role_in_story>
- POV: <STENT name>
- facts visible to POV: <list>
- open OBLs visible to POV: <list>
- current STINT for POV: <goals + fears + current_pressure summary>

[recent prose continuity]
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
```

LLM produces prose. Engine writes to a working buffer (NOT to disk yet — disk write happens at Phase 11 inside the atomic transaction).

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
