# Prose Craft Contract — Manual Story Studio variant

This is the prose-craft surface read at compose time by the Manual Studio prompt composer and inlined verbatim into §13 of every external prompt. It is a sibling document, not a fork, of `docs/prose-renderer-contract/prose-craft-contract.md`. The canonical contract serves the branching pipeline's scene-plan surface; this file serves the Manual Studio 2–5-beat cluster surface. Drift between them is expected and acceptable.

This file is read fresh from disk on every composition. Editing it changes the next prompt produced; previously-saved `prompts/PROMPT-<n>.md` files retain their own snapshot.

---

## POV Discipline

The prose runs at a single point of view per prompt. Whatever §2 of the prompt names as the POV — first person, close third, distant third — that treatment is binding for the cluster the LLM is rendering. Do not slip POVs mid-beat. If multiple cast members are present, the non-POV characters are observed through the POV's eyes, never narrated from the inside.

Default close-third or first-person prose stays inside the POV's diction, judgments, and rhythms. Distant-third or omniscient framings widen only as far as §2 commits, and never far enough to start narrating a non-POV character's interior.

## Free Indirect Discourse Over Filtered Interiority

The POV's vocabulary, judgments, and sentence rhythms enter the prose without `she thought / he felt / I knew / she realized` tags. The thought IS the word choice; the tag is overhead.

- *Bad:* "I noticed the floorboard had been pried up and felt that it mattered."
- *Better:* "The floorboard had been pried up. Of course it had."

Filtered interiority is permissible when the filtering itself is the point being dramatized — a moment of recognition where the noticing IS the event, or a deliberate distancing for a specific emotional reason. Otherwise, cut it.

## Filter-Word Cuts

`saw / heard / felt / noticed / knew / realized / watched / sensed / observed` interpose a pane of glass between reader and POV. Default to cutting them. The character does not need to be reported perceiving the thing; render the thing.

- *Bad:* "She saw the bruise on his wrist."
- *Better:* "The bruise on his wrist. Four fingers."

## Concrete Sensory Grounding

Every abstract claim pairs with a concrete instance — a specific object, a texture, a sound, a smell, a body posture, a named gesture. Generic "atmosphere" or "mood" abstractions are not enough; the reader needs something with weight and edge to hold.

- *Bad:* "The room felt tense and uncertain."
- *Better:* "Nobody had touched the bread. The pitcher sweated onto the cloth."

Move down and up the ladder of abstraction. Don't dwell at either rung. A whole page of unanchored interiority drifts; a whole page of unprocessed sensory image flattens. Alternate.

## No Ledger Jargon

The character does not know they live inside a ledger. Do not use Worldloom record-class names or data-model vocabulary in narrator voice or interiority. No record-id-shaped tokens (uppercase class prefix followed by a hyphen and digits), no tool-check vocabulary, no lifecycle or replacement-history terminology, no engine-operation vocabulary.

The POV's interior may name a *secret*, a *promise*, a *debt*, a *bruise*, a *suspicion* — never a record id. The composer translates record content into novelist-facing prose for §3 through §12 of the prompt; this rule restates that translation discipline as a craft rule the LLM must honor in its output.

## Length Follows Content

The prose is exactly as long as the beats and the cast's reactions require — no longer, no shorter. There is no target length, no minimum to clear, no maximum to honor. A cluster that lands in two hundred words lands in two hundred words; a cluster that needs a thousand to reach its stopping point lands in a thousand. Do not extend to reach a length; do not compress to fit a length.

Pacing is structural: the beats and the stop rule decide where the prose ends, not a budget. Word count does not enter the consideration.

## 2–5 Beat Cluster Framing

The LLM is rendering a small chunk of forward motion — a 2–5-beat cluster, parameterized in §5 of the prompt by the story's `prompt_policy.default_beat_count`. This is not an arc, not a scene, not an act, not a chapter. Begin from the current situation as established in §3 and §11. Follow the manual moment directive in §4. Stop at the first materially new response point per §14 — a decision pressure, an emotional turn, a changed tactic, a refusal, a reveal-withheld, a newly exposed vulnerability.

Do not summarize future consequences. Do not narrate beyond the immediate exchange or action that produces the first new thing the author has to decide about.

## Manual Directive Primacy

The author's directive in §4 of the prompt is the highest-priority instruction in the composition. Cast voice (§7), beliefs and secrets (§8 / §10), physical continuity (§11), and forbidden inventions (§12) are supporting context. In a conflict between the directive and any other section, the directive wins. The other sections shape *how* the directive is rendered; they do not override *what* the directive requires.

The directive is also the source of moment-specific intent that the records cannot express. If the directive asks for a hesitation that the cast's default_strategy would not produce, the directive overrides — the author is telling the LLM that this is the moment the character departs from default.

## Prose as Manuscript, Not State

The LLM writes prose. The author updates Manual Studio records by hand after pasting the prose into the manuscript. The prose does not "change state" — the author's record edits do. This frees the rendered prose from any obligation to be self-consistent with a state-update step; the prose is a manuscript artifact, and any inconsistencies with later record updates are reconciled by the author's review, not by the LLM.

Prose may render decisive emotional, relational, practical, or informational turns when the directive and beat cluster call for them. Do not summarize or label a durable after-state as settled unless the directive explicitly asks for that. Render the observable experience of the turn. Manual Story Studio will not infer or apply state changes from the prose; after saving, the author reviews which records should be created or edited.
