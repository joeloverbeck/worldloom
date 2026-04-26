---
batch_id: BATCH-0003
world_slug: animalia
source_artifact_id: DA-0001
source_artifact_path: "worlds/animalia/diegetic-artifacts/a-season-on-the-circuit.md"
generated_date: "2026-04-20"

parameters:
  max_cards: 5
  novelty_range: moderate
  taboo_areas: []
  allow_soft_canon_only: false

claim_extraction_summary: >
  Approximately 94 distinct factual claims extracted from the travelogue's
  prose body. Narrator stance breakdown: ~80 asserted, ~7 hedged (notably
  "almost sure she meant it"; "the slightly more honest thing"; "I am told"
  about the Lock-Keeper's Cat blood-broth), ~5 rhetorical ("if I am at the
  back of your tavern, you will know"; travelogue aside-to-reader register),
  ~2 conditional (the open offers to Brinewick reader). Frontmatter
  claim_map present (18 author-tagged entries from the diegetic-artifact-
  generation source run); zero prose/frontmatter disagreements detected —
  the artifact's author-classified canonicity is internally coherent with
  prose extraction. The travelogue's voice-heavy register produced a large
  R10 winnow population; institutional mining-yield concentrated on the
  cellar-job sequence (paragraphs 5-7) and the bardic-economy asides
  (paragraphs 2, 3, 8, 9, 10).

classification_counts:
  grounded: 33
  partially_grounded: 2
  not_addressed: 59
  contradicts: 0
  extends_soft: 0
  # T8: 33 + 2 + 59 + 0 + 0 = 94 = total extracted ✓

flagged_contradictions: []

mr_positional_flags: []

single_narrator_concentration_flag:
  triggered: true
  count: 3
  affected_card_ids:
    - PR-0014
    - PR-0015
    - PR-0017
  rationale: >
    All 3 surviving cards (after user Phase 8 drop-list of PR-0013 and
    PR-0016) hinge on Vespera Nightwhisper's (CHAR-0001) firsthand
    travelogue testimony via DA-0001. Count 3 is BELOW the 4-6 flag
    threshold, so the batch-level concentration flag itself is technically
    sub-threshold — recorded here for audit hygiene rather than as
    escalation. Phase 6d.1 evidence-breadth already demoted each surviving
    card to soft_canon via partial-support pathway, recognizing the sole-
    testimony character for each. The artifact's stated inflation-bias
    (per frontmatter desired_relation_to_truth) is documented per-card
    in narrator_reliability_basis; the surviving cards' narrator-stances
    are (PR-0014) offhand-professional-aside, (PR-0015) self-deprecating
    technical-descriptor, (PR-0017) aside-to-reader brief, all of which
    reduce inflation-risk relative to the travelogue's self-promotional
    spine.

card_ids:
  - PR-0014
  - PR-0015
  - PR-0017

dropped_card_ids:
  - PR-0013
  - PR-0016

user_approved: true

notes: >
  User approved at Phase 8 HARD-GATE with drop-list [PR-0013, PR-0016].
  No per-card rationale provided; dropped IDs become permanent gaps in
  the PR-NNNN sequence. Surviving cards retain originally-allocated PR-
  ids (PR-0014, PR-0015, PR-0017).

  Dropped card summaries (retained for audit):
  - PR-0013 "Herb-Wife's Hazard-Mark and Pre-Dawn Informal Chartered-
    Ceramic-Handler Response Chain" (contested_canon / institution,
    score +19) — dropped by user at Phase 8. The card had passed Phase 6
    Canon Safety Check cleanly; drop-rationale is user-reserved.
  - PR-0016 "Bardic Theft-Register Audience-Applause Etiquette for
    Borrowed / Re-Worked Material" (contested_canon / ritual, score
    +16) — dropped by user at Phase 8. The card had passed Phase 6
    cleanly; drop-rationale is user-reserved.

  No Phase 6f repairs fired on any card (surviving or dropped) during
  Phase 6 Canon Safety Check — all 5 cards passed 6a invariant conformance,
  6b Mystery Reserve firewall (every M-1 through M-20 checked per card),
  6c distribution discipline, and 6d Diegetic-to-World laundering (all
  three sub-tests) on first pass. No positional MR flag fired — Vespera's
  CF-0017 / CF-0024 bardic-circuit + contractor-auxiliary world-position
  is M-7-adjacent (per worked-example W bardic-custody clause), but her
  surviving cards' claim content does not trespass into M-7 specialist
  reputation-genealogy territory, and no other MR entry's forbidden-
  answer set was engaged.

  Phase 6e batch-level: joint-closure and mutual-contradiction checks
  passed cleanly across all C(5,2)=10 pairs at full batch; after drop-
  list reduction to 3 cards, C(3,2)=3 remaining pairs remain clean.
  Single-narrator concentration reduced from count 5 (at full batch,
  in 4-6 flag-band) to count 3 (sub-threshold) on drop-list application.

  Selective-loading note: CANON_LEDGER.md was selectively-read for CFs
  CF-0006, CF-0009, CF-0014, CF-0016, CF-0017, CF-0018, CF-0020, CF-0024,
  CF-0026, CF-0038, CF-0040, CF-0041, CF-0043 per Phase 2 classification
  needs; remaining CFs reached via grep line-map only. MYSTERY_RESERVE.md
  was selectively-read via section-header grep (M-1 through M-20
  identified; per-entry overlap check applied across all 20). INVARIANTS.md
  was loaded in full (smaller file). WORLD_KERNEL.md was loaded in full.
  EVERYDAY_LIFE.md was selectively-read for §Intoxication (blood-broth
  register) and the (a) canal-heartland cluster. GEOGRAPHY.md, INSTITUTIONS.md,
  TIMELINE.md, PEOPLES_AND_SPECIES.md, MAGIC_OR_TECH_SYSTEMS.md, OPEN_
  QUESTIONS.md reached via artifact frontmatter's documented world_
  consistency references without additional Read — the artifact's own
  Canon Safety Check Trace (Phase 7a-7e) provided canon-anchoring
  discipline that this mining run inherited.
---

# Batch BATCH-0003 — Animalia — mined from DA-0001

## Source Artifact

**Title**: *A Season on the Circuit: Dispatches from Vespera Nightwhisper*
**Author**: Vespera Nightwhisper (CHAR-0001)
**Artifact type**: Travelogue / self-promotional bard's column, published in a Brinewick civic journal
**Artifact in-world date**: Current Unstable Present, Incident Wave era (TIMELINE Layer 4), approximately 8-10 moons before Vespera's dossier-present
**Communicative purpose**: Travelogue narration + self-legitimation (contracted-bard narrative-custody for payment, per CF-0017 + CF-0024 channel)
**Desired relation to truth**: Biased and deliberately false in places (per artifact frontmatter) — Vespera inflates her renown, conceals her middle-tier (not named-veteran) status, conceals her creative block, and performs the private-myth of violence-clarifies-me for audience rather than confesses it.

The artifact is a working-bard's self-promotional travelogue targeting a literate canal-heartland reading audience (Brinewick), designed to recruit them to her upcoming Brinewick tavern performances. Its register is florid, feline-inflected, AES-1-adjacent dry-comic in places, and structurally inflation-biased. The cellar-job sequence (paragraphs 5-7) is the densest canonizable territory — it names a recognizable CF-0024 contractor-auxiliary incident with CF-0006 chartered ceramic-handling overlap — and the bardic-economy asides (paragraphs 2, 3, 8, 9, 10) name smaller performance-culture and compensation texture. The travelogue's inflation-bias lives mostly in the narrator's self-presentation rather than in the institutional detail, which makes the institutional-mining yield defensible against inflation-risk per-card.

## Claim Extraction Trace (Phase 1)

Prose-primary extraction at independent-factual-assertion granularity yielded 94 claims. Frontmatter claim_map present (18 author-tagged entries); zero prose/frontmatter disagreements. Representative non-trivial extraction decisions:

- *"I have walked and barged and limped a good part of it"* (para 2) — hedged (narrator flagged this as inflation in frontmatter; classified grounded via CF-0017 mobility register; R10 winnowed for self-presentation).
- *"Three weeks of dust and barley-bread and the short kind of poetry the drylanders trade with strangers"* (para 3) — asserted + aside-register; definite-article "the short kind of poetry" characterizes a specific genre; **carried forward as candidate (Candidate A)**.
- *"I played the lock-night at a town I can only call 'the one with the green shutters'"* (para 4) — asserted + definite-article "the lock-night" treats the occasion as reader-familiar; **carried forward as candidate (Candidate B)**.
- *"The lockmaster's posting wall—you know the kind; your own Brinewick has the better version, with the proper oilcloth hood against rain"* (para 5) — asserted (architectural claim); scored +12, below cap, rejected.
- *"A household with something in the cellar that was not a house-cat, and a herb-wife's mark alongside, which is how the polite ones write 'I cannot handle this; please send someone who knows the wall of noise when the wall goes wrong.'"* (para 5) — asserted (institutional signaling-convention claim); **carried forward as candidate (Candidate D, later PR-0013, user-dropped)**.
- *"The chartered folk prefer the kind quietly handled, and the house owes me nothing if I stay quiet"* (para 7) — asserted-observational + narrator-self-interest note; integrated into Candidate D.
- *"Aldous got the serious share; I took the corner-share a contracted auxiliary gets when she holds the lantern and keeps the door and runs once, down a stair, for a thing the ceramic-handler had left in his bag"* (para 7) — asserted with definite-article "the corner-share"; **carried forward as candidate (Candidate E, later PR-0015)**.
- *"Do not applaud if you know the original. Applaud if you like my version better, which is almost but not quite the same thing"* (para 9) — asserted (audience-convention claim with specific instruction-form); **carried forward as candidate (Candidate G, later PR-0016, user-dropped)**.
- *"The Lock-Keeper's Cat ... keeps fermented blood-broth under the counter for carnivore-folk patrons who know to ask"* (para 10) — learned-from-authority ("I am told"); partially-grounded by EVERYDAY_LIFE §Intoxication; scored +13 but tied with Candidate A at cap boundary and lost tiebreak on diversity criterion; rejected.

### Extraction Statistics

- **Total claims extracted**: 94
- **By narrator stance**: asserted ~80 / hedged ~7 / conditional ~2 / rhetorical ~5
- **Frontmatter tags present**: yes (18 author-tagged claim_map entries)
- **Prose/frontmatter disagreements**: 0 (diagnostic signal of a well-authored diegetic-artifact-generation source run)

## Phase 2 Classification Counts

| Classification | Count | Outcome |
|---|---|---|
| grounded | 33 | discarded silently |
| partially_grounded | 2 | discarded silently with trigger R11-partial |
| not_addressed | 59 | carried to Phase 3 |
| contradicts | 0 | — |
| extends_soft | 0 | — |

**T8 accounting check**: 33 + 2 + 59 + 0 + 0 = **94**. Equals total claims extracted. **PASS.**

The 2 partially_grounded claims (silently discarded per R11-partial): (i) "Brinewick has a literate reading journal that publishes travelogue columns" — DIS-2 + CF-0038 commerce-hub density implies a literate reading public; the specific journal institution is incremental below the +10 significance threshold; (ii) "Ward-inspector's drill-bell rings at dawn" — drill-bell existence is CAU-3 public-layer + CF-0007 ward-breach-drills committed; dawn timing is an incremental specification below significance threshold.

## Flagged Contradictions (Handoff to continuity-audit)

No contradictions with existing canon detected. T10 vacuously satisfied.

## Phase 3 Narrator-Reliability Mapping Trace

| Candidate | Claim (one-line) | Stance | Centrality | Cross-ref | Mapped status |
|---|---|---|---|---|---|
| A | Drylanders trade "short kind of poetry" with strangers | firsthand | peripheral (aside) | no (sole-source-for-naming) | soft_canon (drylands regional) |
| B | "Lock-night" as named canal-circuit performance occasion | firsthand | peripheral (aside) | partial (CF-0015/CF-0017/CF-0024/CF-0038 partial support) | soft_canon |
| C | Brinewick posting-wall oilcloth-hood weather-proofing | firsthand | peripheral | partial (CF-0038/CF-0024 partial support) | soft_canon |
| D | Herb-wife mark → informal ceramic-handler chain | firsthand | central (cellar-job spine) | partial (CF-0006/CF-0024/CF-0040/CF-0041 partial support) | contested_canon (disputed — narrator self-interest) |
| E | "Corner-share" named contractor-auxiliary tier | firsthand | central (pay-split naming) | partial (CF-0009/CF-0024 partial support) | soft_canon |
| F | Song-into-cook-fire-smoke winter household practice | firsthand | peripheral (memoir-fragment) | no (sole-source; one-household-one-winter) | soft_canon (local) |
| G | Audience applause-etiquette for bardic borrowed/stolen material | firsthand | peripheral (performance-promotion aside) | no (sole-source-for-naming) | contested_canon (bardic-circuit oral-register) |
| H | Lock-Keeper's Cat under-counter fermented blood-broth protocol | learned-from-authority | peripheral | partial (EVERYDAY_LIFE §Intoxication partial support) | soft_canon (Brinewick mixed-tavern) |

## Phase 4 Score Matrix

| Candidate | coherence | propagation | story_yield | distinctiveness | ordinary_life | mystery_preservation | integration_burden | redundancy | aggregate |
|---|---|---|---|---|---|---|---|---|---|
| D (PR-0013, dropped) | 4 | 4 | 4 | 4 | 3 | 5 | 3 | 2 | **+19** |
| B (PR-0014) | 5 | 2 | 3 | 4 | 3 | 5 | 2 | 2 | **+18** |
| E (PR-0015) | 5 | 2 | 2 | 3 | 3 | 5 | 1 | 2 | **+17** |
| G (PR-0016, dropped) | 4 | 2 | 2 | 3 | 3 | 5 | 1 | 2 | **+16** |
| A (PR-0017) | 4 | 1 | 1 | 3 | 2 | 5 | 1 | 2 | **+13** |
| H (rejected) | 5 | 1 | 1 | 2 | 3 | 5 | 1 | 3 | +13 |
| C (rejected) | 4 | 1 | 1 | 2 | 2 | 5 | 1 | 2 | +12 |
| F (rejected) | 3 | 1 | 1 | 2 | 2 | 5 | 1 | 2 | +11 |

Top 5 scores survived Phase 5 cap (max_cards=5): D, B, E, G, A. User drop-list at Phase 8 subsequently removed D (PR-0013) and G (PR-0016) from the written batch, leaving PR-0014, PR-0015, PR-0017.

## Phase 5 Rejected-Candidates Log

**Phase 4-surviving candidates rejected at Phase 5 cap**:

| Cand | Score | Trigger | Rationale |
|---|---|---|---|
| H | +13 | Cap-boundary (tied with A) | Tied with Candidate A at +13 at cap rank 5. Lost tiebreak on domain-diversity criterion: Candidate A introduces drylands cultural-practice domain (new territory for this batch); Candidate H is a minor specification of existing EVERYDAY_LIFE Brinewick mixed-tavern blood-broth register, close to existing prose. Candidate for future Brinewick-focused mining batch. |
| C | +12 | Cap-boundary (below) | Below cap at +12. Oilcloth-hood posting-wall specification is coherent architectural detail with minor propagation; candidate for a future Brinewick-focused mining batch that bundles multiple posting-wall / canal-infrastructure architectural specifications. |
| F | +11 | R10 + R5 + cap | R10 mere-texture + R5 cosmetic + below cap. The narrator's one-household-one-winter "woman I called mother" framing confirms sole-source narrow-scope memory; propagation is minimal (EVERYDAY_LIFE annotation only); the folk-practice register is real but this specific attestation is too personal-scope to canonize as even soft_canon. The claim cannot carry Rule 4 scope-stabilizers without fabricating institutional anchor not attested in the artifact. |

**Phase 5 R10 bulk-rejections on not_addressed voice/texture claims** (51 claims total; representative sample enumerated):

- "The canal has been a hard road these six months" — narrator-personal voice.
- Vespera carries lute-viol in battered case — personal texture.
- "Pale cream fur, mismatched eyes, two silver hoops in the left ear and three in the right" — personal descriptor.
- "If I am at the back of your tavern, you will know" — rhetorical aside.
- "The caravan-master there would not thank me for telling the journal about his hospitality" — personal-scope deflection.
- Scorpion anecdote ("killed it with a copper spoon") — comic-ironic travelogue anecdote.
- "Coming back to the heartland was like coming back to water" — voice / metaphor.
- "I drank silver enough to drink for a week ... mostly in one" — personal.
- "The herb-wife's mark pulled at my tail before my head caught up" — personal reaction voice.
- "I do not write well in stillness" — narrator-mythology performed-belief.
- "There is an old rumor about me ... my best work comes the morning after a bad night" — narrator-mythology performed-belief.
- "I have three new pieces in polish and two more waiting their turn" — frontmatter-tagged inflation.
- Lute-viol difficulty register ("long fingers or long patience") — R10 instrument-texture.
- "The circuit remembers its dead the way the canal remembers its locks" — voice / idiom.
- "I stopped being embarrassed to steal a few years ago" — voice framing for G's canonizable substance (the applause-etiquette, not the stealing-confession).
- "I have reached the age where ale is for other people's pleasure" — voice / valedictory rhetorical.
- (~35 additional voice/personal-scope/rhetorical claims in the same register.)

**T9 test**: every Phase 5 rejection has trigger id + one-line rationale recorded above. **PASS.**

## Surviving Cards (Ranked by Score)

After user Phase 8 drop-list application (PR-0013, PR-0016 dropped), the batch emits 3 cards:

| Rank | card_id | Title | proposed_status | mining_context | score_aggregate |
|---|---|---|---|---|---|
| 1 | PR-0014 | Canal Lock-Night Bard-Performance Occasion | soft_canon | Para 4 — "I played the lock-night at a town I can only call 'the one with the green shutters'" | +18 |
| 2 | PR-0015 | Corner-Share Contractor-Auxiliary Compensation Tier | soft_canon | Para 7 — "I took the corner-share a contracted auxiliary gets when she holds the lantern and keeps the door" | +17 |
| 3 | PR-0017 | Drylander "Short Kind of Poetry" Stranger-Hospitality | soft_canon | Para 3 — "Three weeks of dust and barley-bread and the short kind of poetry the drylanders trade with strangers" | +13 |

## Phase 6 Canon Safety Check Traces

### Phase 6a-6c Per-Card Summary

| card_id | 6a Invariants | 6b MR Firewall | 6c Distribution | Overall |
|---|---|---|---|---|
| PR-0014 | PASS all 16 | PASS all 20 MR ids | PASS (3 stabilizers, 4 CFs consulted) | PASS |
| PR-0015 | PASS all 16 | PASS all 20 MR ids | PASS (3 stabilizers, 6 CFs consulted) | PASS |
| PR-0017 | PASS all 16 | PASS all 20 MR ids | PASS (3 stabilizers, 4 CFs consulted) | PASS |

(Note: Dropped cards PR-0013 and PR-0016 also passed 6a-6c at full-batch evaluation before user drop-list; not re-run post-drop, as they are not written.)

### Phase 6d Per-Card Laundering Firewall

#### PR-0014 — Canal Lock-Night Bard-Performance Occasion

- **6d.1 Evidence-breadth**: `partial` — CF-0015 canal infrastructure + CF-0017 bardic tavern performance + CF-0024 lockmaster posting-wall + CF-0038 canal-circuit bardic quarter-year rotation commit surrounding mechanics; specification-delta is the "lock-night" naming. Proposed_status `soft_canon` defensible.
- **6d.2 Epistemic-horizon**: `pass` — Vespera is CF-0017 working circuit-bard; occasion is within professional horizon.
- **6d.3 MR Positional**: `pass` — bardic-custody M-7 adjacency noted; claim about audience-composition / occasion-naming does not trespass into specialist reputation-genealogy territory. M-19 canal-origin not touched.

#### PR-0015 — Corner-Share Contractor-Auxiliary Compensation Tier

- **6d.1 Evidence-breadth**: `partial` — CF-0009 copper-silver denomination spread + CF-0024 contractor-auxiliary hazard-pay asymmetry commit underlying mechanics; specification-delta is the serious-share / corner-share bifurcation naming. Proposed_status `soft_canon` defensible.
- **6d.2 Epistemic-horizon**: `pass` — Vespera is working CF-0024 contractor-auxiliary; vocabulary is within professional horizon.
- **6d.3 MR Positional**: `pass` — bardic-custody + contractor-auxiliary M-7 adjacency noted; corner-share is SUB-specialist auxiliary pay, categorically distinct from M-7 specialist reputation-genealogy register.

#### PR-0017 — Drylander "Short Kind of Poetry" Stranger-Hospitality

- **6d.1 Evidence-breadth**: `partial` — CF-0017 bardic-circuit oral-performance register + CF-0024 caravan-escort drylands reach + GEOGRAPHY §drylands + EVERYDAY_LIFE drylands-texture commit surrounding mechanics; specification-delta is the hospitality-poetry stranger-exchange NAMING as drylands-specific convention.
- **6d.2 Epistemic-horizon**: `pass` — Vespera's three-week dryland caravan travel (per artifact frontmatter author_profile.mobility) places observation within reach, tempered by exposure-depth calibration note.
- **6d.3 MR Positional**: `pass` — M-4 (progenitor-ontology) and M-7 (bardic-custody) adjacencies noted; claim content (hospitality-protocol naming) does not trespass into either MR's forbidden-answer territory. Drylands hospitality-poetry may take progenitor figures as verse-matter, but the convention makes no ontological claim — verse-material is genre, not doctrine.

### Phase 6e Batch-level Check Trace

**Joint-closure** (full-batch eval across all 20 MR entries × C(5,2)=10 card-pairs at full batch; post-drop C(3,2)=3 pairs):

At full batch (5 cards): all 200 card-pair × MR-entry checks clean. No card-pair jointly narrows an MR that neither alone does. PASS.

Post-drop (3 cards PR-0014 / PR-0015 / PR-0017): C(3,2)=3 pairs remain.
- PR-0014 × PR-0015: lock-night occasion + corner-share compensation. Both within CF-0017 / CF-0024 register; no joint MR-narrowing.
- PR-0014 × PR-0017: lock-night occasion + drylands hospitality-poetry. Both within bardic / oral-register; domain-distinct; no joint MR-narrowing.
- PR-0015 × PR-0017: corner-share compensation + drylands hospitality-poetry. Canal-heartland vs drylands regional divergence; no joint MR-narrowing.
**PASS.**

**Mutual-contradiction** (C(5,2)=10 pairs full batch; C(3,2)=3 pairs post-drop):

At full batch: all 10 pairs checked clean. Notable same-domain pair D + E (herb-wife chain + corner-share) is naturally aligned (corner-share IS the auxiliary compensation in the chain), not contradictory. B + G (performance-venue + performance-convention) compatible.

Post-drop (3 pairs):
- PR-0014 × PR-0015: compatible (lock-night occasion uses CF-0017 bardic labor; corner-share applies to chartered-plus-auxiliary cellar-work, which is CF-0024 adjacency not overlapping CF-0017 performance labor).
- PR-0014 × PR-0017: compatible (canal-heartland lock-night vs drylands hospitality-poetry are regionally distinct).
- PR-0015 × PR-0017: compatible (canal-heartland compensation vocabulary vs drylands hospitality-register; explicitly regionally scoped).
**PASS.**

**Single-narrator concentration**:

At full batch (5 cards), count 5 sat in the 4-6 flag-only band (triggered flag; no repair-loop). Post-drop (3 cards), count 3 is below the 4-card flag threshold — sub-threshold. Recorded in frontmatter `single_narrator_concentration_flag` for audit hygiene rather than as escalation signal. Each surviving card's Phase 6d.1 evidence-breadth `partial` pathway explicitly acknowledges and sustains the sole-testimony character via partial-supporting CF anchoring.

### Phase 6f Repair Log

No repairs fired. All 5 cards (including the two later user-dropped) passed all Phase 6 sub-checks on first pass.

## Phase 7 Test Results

**Per-card tests** (run per surviving card post-drop):

| Test | PR-0014 | PR-0015 | PR-0017 |
|---|---|---|---|
| T1 (Rule 2 domain coverage) | PASS — 4 of 14 Rule-2 domains touched (economy, settlement_life, language, status_signaling) | PASS — 4 of 14 (labor, economy, language, status_signaling) | PASS — 4 of 14 (language, settlement_life, status_signaling, religion) |
| T2 (Rule 4 scope honesty) | PASS — recommended_scope declared regional; not global; why_not_universal populated with 3 stabilizers | PASS — regional; 3 stabilizers; configuration-gate + sibling-regional-gate + vocabulary-travel-limit | PASS — regional drylands; 3 stabilizers; drylands-economy-gate + sociality-gate + one-way-cultural-flow-limit |
| T3 (Rule 5 consequence completeness) | PASS — 3 immediate + 4 longer-term; longer-term traces economy + language + settlement_life + institutional-texture (≥2 domains) | PASS — 3 immediate + 4 longer-term; longer-term traces economy + language + charter-audit-discipline + widow-pension-register (≥2 domains) | PASS — 3 immediate + 4 longer-term; longer-term traces language + religion + settlement_life + status_signaling (≥2 domains) |
| T4 (Rule 3 stabilizer presence) | PASS — why_not_universal populated (not rumor scope) | PASS — why_not_universal populated (not rumor scope) | PASS — why_not_universal populated (not rumor scope) |
| T5 (CSC trace completeness) | PASS — invariants_respected 16-entry list; mystery_reserve_firewall records all 20 MR ids with per-entry rationale; distribution_discipline 4 CFs consulted; diegetic_to_world_laundering all 3 sub-tests with test_result + rationale | PASS — same structure; 6 CFs consulted | PASS — same structure; 4 CFs consulted |
| T6 (source artifact binding) | PASS — source_artifact_id: DA-0001; derived_from_artifact_path populated | PASS | PASS |
| T7 (prose completeness) | PASS — all body sections populated; no stubs | PASS | PASS |

**Batch-level tests**:

- **T8 (classification accounting)**: **PASS** — 33 + 2 + 59 + 0 + 0 = 94 = total claims extracted. 51-150-band rejection-log + count-check convention satisfied.
- **T9 (rejection log completeness)**: **PASS** — Phase 5 rejections (H, C, F) each have trigger id + rationale; R10 bulk-rejections tallied with representative sample enumeration above.
- **T10 (flagged-contradictions handoff completeness)**: **PASS (vacuous)** — `flagged_contradictions: []`; no contradictions detected; vacuous-pass noted.
- **T11 (batch-level CSC trace completeness)**: **PASS** — joint-closure, mutual-contradiction, single-narrator concentration each recorded with per-pair or per-card results above.

## HARD-GATE Deliverable Summary (Phase 8)

**Target paths**:
- `worlds/animalia/proposals/PR-0014-canal-lock-night-bard-performance-occasion.md` (written)
- `worlds/animalia/proposals/PR-0015-corner-share-contractor-auxiliary-compensation.md` (written)
- `worlds/animalia/proposals/PR-0017-drylander-short-poetry-stranger-hospitality.md` (written)
- `worlds/animalia/proposals/batches/BATCH-0003.md` (this manifest)
- `worlds/animalia/proposals/INDEX.md` (append 3 new lines)

**User-dropped cards**: PR-0013 (herb-wife-mark chain), PR-0016 (bardic theft-applause etiquette). Drop-rationale: user-reserved (no per-card rationale provided in drop-response). Dropped IDs are permanent gaps; surviving cards retain originally-allocated PR-NNNN ids.

**Empty-batch**: no — 3 cards survive drop-list application.
