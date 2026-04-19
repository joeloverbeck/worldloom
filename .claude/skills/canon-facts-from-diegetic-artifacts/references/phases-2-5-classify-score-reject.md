# Phases 2-5: Classify Claims → Map Status → Score → Reject → Cap

Load this reference when entering Phase 2 to classify the ledger, Phase 3 to map narrator-reliability, Phase 4 to score, and Phase 5 to apply rejection triggers and the max_cards cap.

## Phase 2: Classify Claims vs Existing Canon

For each claim in the ledger, determine its relation to existing canon by cross-referencing against CANON_LEDGER.md + INVARIANTS.md + domain files. Five classification buckets:

- **`grounded`** — an existing CF directly states this fact. **Discard silently.** The artifact correctly honored canon; no card needed.
- **`partially_grounded`** — an existing CF partially commits the mechanic, and the claim adds small incremental specification below the Phase 4 significance threshold. Examples: a CF establishes tavern-keeper-vouch as real social asset and the claim adds that tavern-keeper vouch-records travel inter-polity as reputation; a CF establishes aftermath-itemized cannibal-case register and the claim articulates a forensic span-of-weeks reading. **Discard silently** (same outcome as `grounded`) and log in the rejection trace with trigger `R11-partial`. Phase 4 heuristic for the significance threshold: if the incremental novelty would score ≤ +10 aggregate (i.e., ≤ +4 above the +6 Phase 5 threshold), treat as partially_grounded; if ≥ +11, promote to `not_addressed` and let Phase 4/5 decide on full merits.
- **`not_addressed`** — no existing CF speaks to this fact (or only unrelated CFs share incidental vocabulary). **Candidate for mining.** Carry forward to Phase 3.
- **`contradicts`** — the claim collides with an existing CF or an INVARIANT. **Route to flagged-contradictions list** with per-item handoff prose naming the specific CF/invariant and recommending `continuity-audit`. Do NOT emit as a card.
- **`extends-soft`** — the claim asserts in scope Y a fact currently soft_canon scoped to X, where Y ≠ X and there is no CF stating the fact holds in Y. **Route to flagged-contradictions list** with handoff prose recommending `continuity-audit` to adjudicate whether real diffusion (retcon) or author overreach.

Record classification counts in the batch manifest:

- `grounded_count`
- `partially_grounded_count`
- `not_addressed_count`
- `contradicts_count`
- `extends_soft_count`

**T8 accounting (Phase 7 validation)**: the five counts sum to the total claims extracted at Phase 1. See `phases-7-8-validate-and-commit.md` for count-fidelity discipline.

## Phase 3: Proposed Status Mapping

Apply the narrator-reliability mapping table to each `not_addressed` candidate:

| Narrator posture | Default `proposed_status` |
|---|---|
| firsthand + central + cross-referenced elsewhere in canon | `hard_canon` |
| firsthand + artifact is sole source | `soft_canon` (scope = author's region/institution) |
| secondhand / reported / "it is said" | `contested_canon` [diegetic_status: disputed] |
| propagandistic / doctrinal framing | `contested_canon` [propagandistic] |
| legendary / mythic framing | `contested_canon` [legendary] |
| outside epistemic horizon | Phase 6d.2 forces narrow/reject; Phase 3 records best-guess with `horizon-flagged` marker |

**Cross-referenced elsewhere** means Phase 2 found partial or adjacent support across multiple CFs or other diegetic artifacts that independently corroborate the claim — not just that the artifact itself is internally consistent. A single artifact asserting a claim firsthand without independent corroboration maps to the `sole source` row and thus to `soft_canon`.

Apply `allow_soft_canon_only` override if set: demote all `hard_canon` candidates to `soft_canon` with scope narrowed to artifact's region. Candidates already mapped to `contested_canon` stay `contested_canon`.

## Phase 4: Score Each Candidate

Score on 8 dimensions (1-5):

**Higher-better** (first six):
- `coherence` — fit with WORLD_KERNEL genre/tonal/chronotope contract
- `propagation_value` — how many domains the fact touches downstream
- `story_yield` — what story engines it activates (per WORLD_KERNEL §Natural Story Engines)
- `distinctiveness` — is the fact world-right and concrete, or generic?
- `ordinary_life_relevance` — how visible is it in daily life (Rule 2 bias check)
- `mystery_preservation` — does it preserve / shape MR entries or leak them?

**Lower-better** (last two):
- `integration_burden` — how many world files need updating on accept?
- `redundancy_risk` — how close is it to existing canon?

Aggregate = sum(first 6) − sum(last 2). **Threshold: +6** (same as `propose-new-canon-facts`).

`novelty_range` (Phase 0 parameter) influences scoring weight:
- `conservative`: prefer high-coherence / low-integration-burden; penalize high-distinctiveness
- `moderate`: balanced (default)
- `bold`: reward high-distinctiveness / high-story-yield; tolerate higher integration-burden

## Phase 5: Apply Rejection Triggers + Cap

Apply all 12 rejection triggers. Each rejection is logged to the batch manifest with trigger id + one-line rationale:

### R1-R9 (mirrored from `propose-new-canon-facts` Phase 5)

1. **R1. Trivializes major existing struggles** — the fact undermines a pressure the world depends on (e.g., renders winter-fever non-lethal, makes ward-breach routine).
2. **R2. Universalizes rare powers (Rule 4 violation)** — claims a rare capability for a broader population than the existing canon supports.
3. **R3. Overexplains important mysteries (Rule 7 violation)** — the claim resolves an MR-forbidden answer or narrows the bounded unknown past its discipline.
4. **R4. Duplicates current facts (redundancy)** — identical or near-identical to an existing CF; `partially_grounded` at Phase 2 catches this pre-R4, but R4 fires as Phase 5 safety net.
5. **R5. Exists only as aesthetic flourish (Rule 2 violation)** — texture without domain propagation. Overlaps R10 (this skill's mining-specific variant); R5 is the generic form.
6. **R6. Requires massive retcons for little gain** — `integration_burden` ≥ 5 without proportionate `propagation_value`.
7. **R7. Breaks tonal contract** — violates WORLD_KERNEL §Tonal Contract (e.g., a heroic-quest register in a low-magic lived-in world).
8. **R8. Makes the world too "clever" and less believable** — the fact feels constructed-for-cleverness rather than lived-in.
9. **R9. Solves more problems than it creates** — a fact that resolves too many existing frictions at once; productive world-state lives on unresolved tension.

### R10-R12 (mining-specific)

10. **R10. Mere artifact texture** — voice / flavor / sensory detail only, no domain propagation. Reject. This is the mining-specific variant of R5; where R5 catches aesthetic flourish generically, R10 catches texture claims that survived Phase 1's factual-vs-voice triage but have no propagation. Often paired with `R11-partial` at the same candidate (texture AND partially grounded).
11. **R11. Grounded in existing canon** — Phase 2 safety net. Reject silently. Subvariant **R11-partial** fires for `partially_grounded` Phase 2 classifications where the incremental specification is below the Phase 4 significance threshold.
12. **R12. Would require invariant revision** — route to flagged-contradictions list instead of emitting. Canon-reading skills do not emit invariant-revising candidates; that's `canon-addition`'s authority on an explicit retcon proposal (which this skill does not produce).

Rank survivors by aggregate score descending; keep top `max_cards`. Log every rejection (claim + trigger id + one-line rationale) in the batch manifest's Phase 5 Rejected-Candidates Log.

## FOUNDATIONS cross-references

- **Rule 2** (No Pure Cosmetics): Phase 4 `ordinary_life_relevance` + Phase 5 R5 + R10
- **Rule 3** (No Specialness Inflation): Phase 3 narrator-reliability cap + Phase 4 `integration_burden`
- **Rule 4** (No Globalization by Accident): Phase 3 scope cap + Phase 5 R2
- **Rule 7** (Preserve Mystery): Phase 5 R3 (bounded-unknown firewall); Phase 6 continues the discipline
