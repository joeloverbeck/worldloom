# Phases 11–13: Score, Filter, Diversify

## Phase 11: Score and Select

Score each canon-gate-surviving seed on two layers.

### Layer A: World Validity

- `world_rootedness`
- `niche_distinctiveness`
- `institutional_embedding`
- `ordinary_life_relevance`
- `capability_cost_integrity`
- `canon_safety`
- `canon_burden` — LOWER better
- `overlap_risk` — LOWER better

### Layer B: Memorability

- `protagonist_grade_force`
- `contradiction_irreconcilability`
- `appetite_specificity`
- `self_mythology_strength`
- `pressure_behavior_distinctiveness`
- `voice_pressure_distinction`
- `relational_charge`
- `moral_psychological_edge`
- `world_specific_surprise`
- `cannot_be_swapped_out`

**Aggregate**: `validity_total + 1.5 * memorability_total - canon_burden - overlap_risk`.

A canon-safe but weak-memorability proposal must not survive on validity alone. A canon-requiring proposal may survive only when the implied facts are precisely routed and the payoff is worth the burden.

**Pairwise distance axes** against existing registry AND against other candidates:

geography / institution / species-body / power-relation / pressure-cluster / knowledge-access / perception-filter / voice-family / artifact-affordance / likely-story-scale.

**Selection via max-min** (NOT raw total):

1. Take the highest-value viable seed first.
2. For each next choice, prefer the candidate maximizing combined {`quality_score` + `min_distance_from_selected` + `min_redundancy_vs_registry`}.
3. Continue until X proposals are selected.

**Rule**: A slightly lower-scoring proposal may be preferable if it opens a genuinely new world window.

**Mandatory critic passes**: Theme / Tone Critic, Blandness Executioner, and Protagonist-Grade Critic. Each PASS requires a one-line rationale; a bare PASS is a FAIL.

## Phase 12: Filter Out Bad Proposals

Apply the original rejection triggers plus the protagonist-grade triggers. Each triggered rejection is logged to the batch manifest's Phase 12 Rejected-Candidate Log with trigger name + seed content + diagnosis target:

1. Differs only cosmetically from an existing registry entry
2. Profession clone
3. Moral inversion of an existing character
4. Exists only to dump lore
5. Bypasses world constraints
6. No institutional embedding
7. No ordinary-life reality
8. No repeatable choice pressure
9. Speaks in generic author voice
10. Would write the same artifacts as an existing registry entry with no new angle
11. Duplicates the same pressure cluster and voice family as another selected proposal
12. Requires massive new canon for little gain
13. Turns species or body into costume only
14. Valid but dull: a good Worldloom citizen with no behaviorally memorable pressure engine
15. Abstract contradiction that never becomes repeated behavior
16. Generic, polite, missing, or merely noun-stated appetite
17. Missing, generic, or slogan-only self-mythology
18. Absent, interchangeable, or synonym-only pressure behavior
19. Cosmetic weirdness not produced by a modeled world pressure
20. Relationship-neutral card with no costly need, resentment, fear, debt, devotion, rivalry, dependence, or likely harm
21. Moral or psychological edge sanded off to avoid discomfort
22. Timid mutation that only restates the original premise
23. Canon-requiring brilliance suppressed instead of routed to `canon-addition` or `propose-new-canon-facts`
24. Vocabulary-only voice distinction
25. Uncaused specialness by exception without cost, bottleneck, secrecy, taboo, distribution limit, or institutional mechanism

## Phase 13: Diversify the Final Batch

Fill 10 composition slots (left-to-right fill priority when X < 10):

1. Ordinary-life lens
2. Institution insider
3. Boundary broker
4. Pressure enforcer / gatekeeper
5. Sufferer or witness with low formal power
6. Artifact-native author
7. Ideological misreader or dissenter
8. Regionally distant mosaic figure
9. Body / species-differentiated lens
10. Protagonist-grade load-bearing character

Also vary across 8 contrast axes:

elite ↔ common / settled ↔ mobile / literate ↔ oral / orthodox ↔ heterodox / lawful ↔ illicit / old ↔ young / kin-tied ↔ socially-detached / local ↔ transregional.

**Rule**: At least some proposals are mirrors or foils of existing registry entries; at least some belong to separate mosaic zones. Empty slots are diagnostic signals (recorded with rationale), not bugs. Filling an empty slot with a lower-scoring candidate just to avoid the empty state is forbidden.

Record filled + empty slots in the batch manifest's Phase 13 Diversification Audit table.

**NCP allocation timing**: After Phase 13 settles its slot fillers, allocate one `NCP-<integer>` per slot-filling card via `mcp__worldloom__allocate_next_id(world_slug, 'NCP')`, called in card order. Bind each card's `NCP-<integer>` before Phase 14 begins so the audit trail (Phase 14 composition, Phase 15 tests, Phase 10e repair-log cross-references) can use the id. Note: the allocator is idempotent in absence of disk writes — calling `allocate_next_id(world_slug, 'NCP')` N times before any card lands on disk returns the same next-id N times. Reserve NCP-<integer>s in card order (first call returns `NCP-N`; assign `NCP-N` to card 1, ..., `NCP-(N+M-1)` to card M); the disk writes at Phase 16 commit (cards written in card order) bump the counter for the next batch.
