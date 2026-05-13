# Research Memo — Why This Pipeline Shape

## Summary

The redesign follows three observed patterns from interactive narrative and software architecture:

1. Interactive narrative systems must preserve user agency while maintaining coherent state progression.
2. Storylets work best as small content/state-transition units with prerequisites and effects, not giant plot-arc schemas.
3. Event-sourced append-only records plus snapshots are the right primitive for replay, audit, and rewinding to prior states — but only if the event log is the authority and prose is not treated as a second event source.

## Findings applied

### Interactive narrative coherence is a state-space problem

Research on interactive narrative frames the central challenge as balancing coherent story progression with user agency. The correct response to arbitrary user action is not to protect a planned act structure, but to reason from world state, available actions, and consequences.

Applied change: remove dramatic act obligations and model each user choice as a causal state transition from a page snapshot.

### Storylets should be simple and recombinable

Storylet practice defines storylets as content with prerequisites and effects on world state. Modern implementations add saliency and repetition control, but the core remains small and state-driven.

Applied change: collapse `scene_commitment_arc` into `commitment_block` with preconditions, beats, effects, exits, and saliency.

### Dynamic choice systems assemble from stateful fragments

Dynamic choice-driven systems such as StoryAssembler assemble text and choices from fragments with effects, and drive narrative by states reached through fragment effects.

Applied change: the turn-cycle selects or creates a commitment block, applies effects, then emits choices from the new state.

### Social simulation needs belief/affordance state

Simulationist systems such as Versu use social practices as affordance providers while autonomous agents choose actions. For branching prose, the equivalent lightweight requirement is explicit belief/visibility state.

Applied change: add `BEL` records and page-level affordances. This is what lets lies, public acts, suspicion, secrecy, betrayal, and killing main characters remain coherent without plot rails.

### Event sourcing supports rewind, replay, audit, and branching

Event sourcing stores immutable events and reconstructs state by replay; snapshots optimize reconstruction. This fits the user's go-back-to-any-page requirement exactly.

Applied change: page snapshots become the fork primitive; `SE` events and state deltas become the authority; rendered prose becomes an attachable artifact.

## Main critique of current pipelines

The current architecture is overpaying for the plan/prose boundary. It already commits state before prose, then spends several minutes finalizing prose to update fields and create trace artifacts. That is backwards. The state transition should stand on its own. Prose validation should be a receipt, not a second state-transition workflow.

## Main risk of the redesign

The biggest risk is that prose may introduce attractive new facts after state commit. The new model handles this explicitly: prose-attach flags invented structural facts and routes to prose revision, repair turn, or canon promotion. It does not silently accept prose inventions as state.
