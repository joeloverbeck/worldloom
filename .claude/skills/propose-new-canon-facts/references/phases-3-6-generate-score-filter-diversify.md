# Phases 3-6: Generate Seeds, Score, Filter, Diversify

Phase 3 generates candidate seeds from world pressure points. Phase 4 scores each seed on 8 dimensions. Phase 5 applies 9 rejection triggers. Phase 6 diversifies the surviving cards across 7 batch slots.

## Phase 3: Generate Proposal Seeds

For each enrichment target, generate 1–3 candidate seeds using the proposal's 8 seed-generation prompts: what ordinary people would invent in response to known dangers; what institution must exist if a capability is real; what black market follows from a taboo; what local proverb/rite/profession/law current conditions naturally produce; what historical scar is still under-modeled; what species-specific adaptation has not been socially modeled; what material-culture detail implies a larger system; what conflict should exist but currently does not.

Each seed is a one-sentence candidate with implicit `proposed_status`, `type`, `domains_touched`, and a `diagnosis_finding_reference`.

**Rule** (from proposal): Prefer seeds that connect multiple existing facts to seeds introducing disconnected novelty. A seed referencing only one existing CF or invariant is weaker than one referencing two or more.

**FOUNDATIONS cross-ref**: Rule 5 (No Consequence Evasion) — seeds whose implications are not traceable through existing facts are rejected at Phase 5.

## Phase 4: Score Each Proposal

For every seed, score on 8 dimensions (1–5 each):
- `coherence`: fits world identity (WORLD_KERNEL tonal/genre/chronotope contract)
- `propagation_value`: how many domain files meaningful consequences touch
- `story_yield`: how many natural story engines it activates
- `distinctiveness`: differentiates from generic fantasy/scifi and from existing world elements
- `ordinary_life_relevance`: affects more than elite adventure scenes (Rule 2)
- `mystery_preservation`: deepens without flattening unknowns (Rule 7)
- `integration_burden`: lower is better; 5 = massive retcon, 1 = minimal
- `redundancy_risk`: lower is better (cross-check via `mcp__worldloom__search_nodes(node_type='canon_fact')` against existing CFs)

**Aggregate**: `(coherence + propagation + story_yield + distinctiveness + ordinary_life_relevance + mystery_preservation) − (integration_burden + redundancy_risk)`. Range is [−10, +28]. Seeds with aggregate < +6 are flagged for Phase 5 removal unless the diagnosis finding they address is `high`-value.

**Rule**: A seed scoring 5 on `distinctiveness` but 1 on `coherence` is rejected — striking seeds that do not fit are noise.

## Phase 5: Filter Out Bad Proposals

Apply the proposal's 9 rejection triggers — each rejection is logged to the batch manifest's body with the specific trigger and the rejected seed's content, creating an audit trail:
1. trivializes major existing struggles
2. universalizes rare powers (Rule 4 violation)
3. overexplains important mysteries (Rule 7 violation)
4. duplicates current facts (redundancy)
5. exists only as aesthetic flourish (Rule 2 violation)
6. requires massive retcons for little gain
7. breaks tonal contract (WORLD_KERNEL tonal contract)
8. makes the world too "clever" and less believable
9. solves more problems than it creates

**Rule**: A seed rejected here is never resurrected later. If a diagnosis finding runs out of seeds, return to Phase 3 to regenerate — never relax Phase 5's filters.

**FOUNDATIONS cross-refs**: Rule 2 (trigger 5); Rule 3 (trigger 2 partial); Rule 4 (trigger 2); Rule 7 (trigger 3); WORLD_KERNEL §Tonal Contract (trigger 7).

## Phase 6: Diversify the Batch

The batch must cover, where possible, 7 Phase-5 slots from the reference proposal:
1. local texture fact
2. institutional adaptation
3. pressure-system intensifier
4. contested-belief proposal
5. history residue proposal
6. mystery-seeding proposal
7. cross-domain connection

Fill strategy:
- `batch_size = 7` (default): fill all 7 slots exactly once.
- `batch_size < 7`: fill in priority order `1, 2, 5, 7, 3, 4, 6` — local-texture and institutional-adaptation first because they are the highest-yield for user review per the proposal's example output style.
- `batch_size > 7`: fill all 7 slots once, then double up starting from slots with multiple strong-scoring candidates from Phase 4.

If a slot has zero surviving candidates, **record the empty slot** in the batch manifest and do NOT substitute from another slot. Empty slots are diagnostic signals — the world may genuinely not need that enrichment type right now.

**Rule** (from proposal): Do not present a batch dominated by one type. User design choice depends on variety.
