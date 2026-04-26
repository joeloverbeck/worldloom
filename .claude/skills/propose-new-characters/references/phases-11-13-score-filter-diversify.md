# Phases 11–13: Score, Filter, Diversify

## Phase 11: Score and Select

Score each canon-gate-surviving seed on 10 dimensions (1–5 each):

- `world_rootedness`
- `niche_distinctiveness`
- `pressure_richness`
- `voice_distinctiveness`
- `ordinary_life_relevance`
- `artifact_utility`
- `thematic_freshness`
- `expansion_potential`
- `canon_burden` — LOWER better
- `overlap_risk` — LOWER better

**Aggregate**: (`world_rootedness` + `niche_distinctiveness` + `pressure_richness` + `voice_distinctiveness` + `ordinary_life_relevance` + `artifact_utility` + `thematic_freshness` + `expansion_potential`) − (`canon_burden` + `overlap_risk`). Range [−10, +40].

**Pairwise distance axes** against existing registry AND against other candidates:

geography / institution / species-body / power-relation / pressure-cluster / knowledge-access / perception-filter / voice-family / artifact-affordance / likely-story-scale.

**Selection via max-min** (NOT raw total):

1. Take the highest-value viable seed first.
2. For each next choice, prefer the candidate maximizing combined {`quality_score` + `min_distance_from_selected` + `min_redundancy_vs_registry`}.
3. Continue until X proposals are selected.

**Rule**: A slightly lower-scoring proposal may be preferable if it opens a genuinely new world window.

**Mandatory critic pass**: Theme / Tone Critic.

## Phase 12: Filter Out Bad Proposals

Apply 13 rejection triggers. Each triggered rejection logged to the batch manifest's Phase 12 Rejected-Candidate Log with trigger name + seed content + diagnosis target:

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
10. Potentially load-bearing round character

Also vary across 8 contrast axes:

elite ↔ common / settled ↔ mobile / literate ↔ oral / orthodox ↔ heterodox / lawful ↔ illicit / old ↔ young / kin-tied ↔ socially-detached / local ↔ transregional.

**Rule**: At least some proposals are mirrors or foils of existing registry entries; at least some belong to separate mosaic zones. Empty slots are diagnostic signals (recorded with rationale), not bugs. Filling an empty slot with a lower-scoring candidate just to avoid the empty state is forbidden.

Record filled + empty slots in the batch manifest's Phase 13 Diversification Audit table.

**NCP allocation timing**: After Phase 13 settles its slot fillers, allocate one `NCP-NNNN` per slot-filling card via `mcp__worldloom__allocate_next_id(world_slug, 'NCP')`, called in card order. Bind each card's `NCP-NNNN` before Phase 14 begins so the audit trail (Phase 14 composition, Phase 15 tests, Phase 10e repair-log cross-references) can use the id.
