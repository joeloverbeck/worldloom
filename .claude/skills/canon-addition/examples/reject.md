# Example: REJECT

Walks through a proposal that yields REJECT. Shows when the skill refuses to accept even with repairs, and how REJECT still produces actionable output (a resubmission menu of narrower alternatives).

## Scenario

Target world: the same low-fantasy agrarian setting from the accept example. Its Kernel establishes: magic is rare and dangerous, magical education is not institutionalized, civilization is institutionally thin.

## Proposal

> Magic is now widely taught in state-funded schools across the western realms, with a standard curriculum and licensed instructors.

## Walkthrough

### Phase 0: Normalize

- **Statement**: state-sponsored mass magical education exists in the western realms.
- **Underlying world-change**: magical capability is available to the literate classes at population scale; states have institutional capacity to run standardized curricula; "licensed instructor" implies a certifying body and a legal framework; magic ceases to be scarce by training alone.
- **Canon fact types**: institution + resource distribution + social practice.

### Phase 1: Scope Detection

- Geographic: regional ("western realms" — plural).
- Temporal: current ("now").
- Social: public (not restricted to elites — "widely taught").
- Diffusion risk: already maximal within the stated scope.

### Phase 2: Invariant Check

Tested against:
- Kernel invariant *magic is rare and dangerous* → **direct violation** at the distribution level. Wide institutional teaching by definition makes magic not rare.
- Kernel invariant *civilization is institutionally thin* → **direct violation** at the institutional level. State-funded standardized schooling at population scale is institutionally thick.
- Distribution invariant *large-scale magical schooling does not exist* (if present in `INVARIANTS.md`) → **direct violation**.

**Result**: incompatible. Two Kernel-level invariants violated.

**Hard rejection triggers hit**: "direct violation of world-defining scarcity/distribution logic" AND "collapse of primary genre contract" (the world's low-magic frame is part of the genre contract).

### Phase 3–6: Abbreviated

Because Phase 2 hit two hard-rejection triggers, Phases 3–6 are run for record completeness but cannot rescue the proposal.

- **Phase 3**: grants mass spellcasting capability to the literate classes.
- **Phase 4**: prerequisites listed (trained teachers, standardized texts, state funding) are all "uncommon" at best and do not exist at scale in the current world.
- **Phase 5**: diffusion is already universalized within the stated scope.
- **Phase 6**: consequence propagation spans all 13 domains at first-order alone — the world would be unrecognizable.

### Escalation Gate

13 / 13 domains touched → dispatch six critic sub-agents.

**Critic synthesis (abbreviated)**:
- All six critics independently flag the proposal as a world-rewrite, not a world-extension.
- **Theme/Tone Critic**: "This is a different world. The low-magic frame is not an invariant you can repair around; it is the world's identity."
- **Continuity Archivist**: retroactive invalidation of too much established canon — every prior CF about magic rarity would need rewriting.
- **Mystery Curator**: magic's origin, currently a passive mystery, becomes untenable — mass teaching implies mass understanding of magic's source.

### Phase 7: Counterfactual Pressure Test

Cannot produce credible stabilizers.
- "The schools are new" fails — the proposal explicitly says "widely taught," implying established practice.
- "The schools are expensive" fails — "state-funded" removes that lever.
- "The schools are dangerous" fails — "standard curriculum" implies safety has been institutionally managed.

### Phase 8: Contradiction Classification

- **Hard contradictions**: 2 (both Kernel invariants above).
- **Soft contradictions**: cascading — every prior magic-related CF would need retroactive rework.
- **Tone/thematic mismatch**: severe. The world's low-magic frame is not recoverable under this proposal.

### Phase 9: Repair Pass

Repair options considered:
- **Reduce scope**: "one western realm teaches magic privately, not state-funded." This is a different proposal — salvageable as a future `ACCEPT_AS_LOCAL_EXCEPTION` submission. Routed to the Resubmission Menu.
- **Reduce reproducibility**: "only hereditary magical families." Different proposal — routes to resubmission.
- **Reclassify as contested belief**: "some western realms *claim* to have magical academies, but the claim is propagandistic." Salvageable as `ACCEPT_AS_CONTESTED_BELIEF` — routes to resubmission.
- **Move to Mystery Reserve**: not applicable; the proposal is not a mystery shape.

No repair preserves the user's stated dramatic intent ("widely taught, state-funded") within the current world's Kernel. Repairs would effectively rewrite the proposal into a different, narrower proposal.

### Phase 10: Narrative and Thematic Fit

- Deepens identity: no — erases it.
- Trivializes struggle: yes — magic ceases to be a site of danger and scarcity.
- Universalizes specialness: yes — the exemplar violation of Rule 3.
- Creates story engines: yes, but the story engines of a *different* genre (academy fiction, licensure politics), not this world's.

### Phase 11: Adjudication

**Verdict**: `REJECT`

**Phase-cited justification**: Phase 2 (two Kernel invariants violated at the distribution and institutional level; hard rejection triggers hit); Phase 7 (no plausible stabilizer can rescue the proposal within the current world); Phase 9 (no repair preserves the user's dramatic intent without effectively rewriting the proposal); Phase 10 (world identity would be erased).

### Phase 12b: Draft Adjudication Report

Includes:
- Original proposal (copied).
- Phase 0–11 analysis above.
- Verdict + justification.
- Critic reports verbatim (because the escalation gate fired).
- **Why This Cannot Be Repaired**: names the two Kernel invariants violated, names the genre-contract element (low-magic frame) that would be erased, names the distribution invariant (if present in `INVARIANTS.md`) that would be inverted. Recommends three narrower proposals the user could submit instead (per Phase 9).

### Phase 13b: Validation

All tests pass.

### Phase 14b: Commit

User approves report summary. Atomic write of `worlds/<slug>/adjudications/PA-0013-reject.md`. No canon mutated. Report written; the user has a menu of three narrower proposals to try instead.

## Takeaway

REJECT is not a failure; it is a clear signal that the proposal as stated does not fit this world. The skill did three things that matter:
1. Named the specific invariants the proposal violates at Phase 2 — "breaks the world" is not a valid verdict; "violates invariants X and Y" is.
2. Ran Phase 9 repairs anyway to produce a concrete resubmission menu — the user gets three actionable alternatives, not just "no."
3. Preserved the user's dramatic intent wherever possible (academy-fiction sensibility → could become `ACCEPT_AS_CONTESTED_BELIEF` if framed as propaganda).
