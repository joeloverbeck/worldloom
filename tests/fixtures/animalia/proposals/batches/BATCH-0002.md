---
batch_id: BATCH-0002
world_slug: animalia
source_artifact_id: DA-0002
source_artifact_path: "worlds/animalia/diegetic-artifacts/after-action-report-harrowgate-contract.md"
generated_date: "2026-04-19"

parameters:
  max_cards: 5
  novelty_range: bold
  taboo_areas: []
  allow_soft_canon_only: false

claim_extraction_summary: >
  Approximately 99 distinct factual claims extracted from the artifact prose.
  Narrator stance breakdown: ~95 asserted, ~3 hedged (notably Auveth's mercy-kill
  uncertainty, Melissa's explicit M-16 origin-resolution decline, and her
  acknowledgement of certainty-limits on the mercy-kill question), ~1 conditional
  (the contingent "if my account does not match the corridor-watch's or magistrate's
  record" clause). Frontmatter claim_map was present with 21 author-classified
  canonicalizable-scope claims; zero prose/frontmatter disagreements detected —
  the author's self-classification is conservative and consistent with prose
  extraction. Many prose claims are institutional-procedural texture the author
  did not tag as canonizable; these are where the mining yield concentrated.

classification_counts:
  grounded: 84
  not_addressed: 15
  contradicts: 0
  extends_soft: 0

flagged_contradictions: []

mr_positional_flags: []

single_narrator_concentration_flag:
  triggered: true
  count: 5
  affected_card_ids:
    - PR-0008
    - PR-0009
    - PR-0010
    - PR-0011
    - PR-0012
  rationale: >
    All 5 surviving cards hinge on Melissa Threadscar's (CHAR-0002) sole testimony
    via DA-0002. Phase 6d.1 evidence-breadth test forced soft_canon for each
    because no CF or other diegetic artifact independently commits the specific
    institutional mechanics. Count = 5 is AT (not above) the Phase 6f loop
    threshold of 6; this does NOT trigger repair-loop. The flag is surfaced to
    document a natural consequence of mining a single ARR — if future artifacts
    from Melissa (or other CF-0024 contractor-veterans) are mined and engage the
    same Charter Hall / CF-0036 silence-protocol mechanics, evidence-breadth for
    any of these candidates may strengthen at that point. No 6f repair required.

card_ids:
  - PR-0008
  - PR-0009
  - PR-0010
  - PR-0011
  - PR-0012

dropped_card_ids: []

user_approved: true

notes: >
  User approved batch as-presented at Phase 8 HARD-GATE; no drop-list applied.
  No Phase 6f repairs fired during Phase 6 Canon Safety Check — all 5 cards
  passed 6a invariant conformance, 6b Mystery Reserve firewall, 6c distribution
  discipline, and 6d Diegetic-to-World laundering (all three sub-tests) on first
  pass. No positional MR flag fired — Melissa's CF-0024 contractor-veteran
  world-position is NOT in a position to access M-1, M-2, M-5, M-6, M-8, M-9
  forbidden-answer sets; she explicitly declines M-16 origin-resolution in the
  artifact; and her engagement with M-17 / M-18 is per-case current-application
  only (no continental prevalence claim; no silence-protocol antiquity claim).
  Phase 6e batch-level joint-closure and mutual-contradiction checks passed
  cleanly across all C(5,2)=10 pairs; single-narrator concentration triggered
  (count 5) and is documented above. All 5 cards are tightly clustered around
  CF-0024 / CF-0034 / CF-0036 operational mechanics (Charter Hall intake form,
  merchant-coalition bounty-row premium signaling, clergy-witness procedural
  recital, silent-settlement clause countersignature, ransom-clerk missing-
  person list reconciliation). Canon-addition adjudication may benefit from
  sequential consideration of PR-0010 / PR-0011 (sibling proposals that both
  emerged from the closed-room briefing moment) and of PR-0008 / PR-0012 (ordinary
  CF-0024 / CF-0034 contract-close procedure complementing the CF-0036 sealed-
  docket application). PR-0009 (premium-signaling) is the pre-hoc information-
  channel that complements the post-hoc sealed-docket application the other four
  cards articulate. The five cards together begin to render the institutional
  shape of how Charter Halls process CF-0036 cannibal-edge cases from pre-
  contract through post-recovery; additional mining of Melissa's later artifacts
  (or other contractor-veteran artifacts at chartered polities) would strengthen
  evidence-breadth for any of the five candidates.
---

# Batch BATCH-0002 — Animalia — mined from DA-0002

## Source Artifact

**DA-0002**: *After-Action Report on the Harrowgate Contract*, by Melissa "Threadscar" (CHAR-0002), recorded in the third moon after Thaw, ten years before her dossier-present age 42, filed at the Charter Hall of Harrowgate under sealed-docket line. Artifact type: institutional hunter-contractor contract-close after-action report (ARR); internal-restricted archive; parallels magistrate-court sealed-docket register at guild-archive level. Communicative purpose: narrate + memorialize, with desired-truth-relation "accurate" and emotional tone "bitter with cold-anger undertone; professional register maintained; AES-1 scarred-veteran cadence."

The artifact documents a CF-0034 bandit-suppression contract at Harrowgate (Cold North Highland) whose recovered scene triggered CF-0036 silence-protocol application: the crew killed four carnivore-folk sentries and six additional carnivore-folk bandits in a previously-opened non-guardian-active Maker-Age ruin, finding in the first chamber a cannibal-band "preparation-floor" — hanging bodies, display-line heads, cooked remains, restraint-marks on some victims. The closed-room briefing at Charter Hall applied grave-violation-of-person classification, sealed-access-to-magistrate-warrant, civic-oath burial, ruin-sign burning before thaw-moon close, a silent-settlement clause at 16 silver on the 8-per-share basis, and public-silence ordered on the band's composition and working-habit. The artifact is a frank internal-archive record Melissa filed as contractor of record.

The artifact is a rich mining target for two reasons: first, the author's claim_map is conservative and consistent with prose, which narrows the mining gap to institutional-procedural texture the author treated as background; second, the closed-room briefing is a concentrated institutional moment where multiple chartered-body mechanics are visible simultaneously (re-classification notice, premium-tier signaling, silent-settlement countersignature, clergy-witness recital, ransom-clerk reconciliation recommendation) — a compressed yield-region for CF-0034 / CF-0036 operational mechanics.

## Claim Extraction Trace (Phase 1)

~99 distinct factual claims extracted from the artifact prose. Extraction prioritized prose-first per skill discipline; frontmatter claim_map was consulted as hint only and found to be consistent with prose-derived classification (zero disagreements).

Non-trivial extraction decisions:

- **Header claims C1-C6** (contract metadata, posting venue, funder coalition, posting figure): grounded in CF-0024 Charter Hall bounty-row infrastructure and CF-0034 suppression-contract framing.
- **Crew composition claims C7-C13** (caravan arrival, tavern-keeper vouch, share-terms, kin-of-record posting): mix of grounded (CF-0024 texture) and minor-novel (tavern-keeper inter-polity vouch-record as reputational asset, rejected at R11 partial-groundedness).
- **Tracking narrative C14-C23** (five-day tracking, corridor pattern, ruin identification): fully grounded in CF-0027 / CF-0029 / CF-0034 framing.
- **Sentry engagement C25-C31**: grounded in CF-0020 / CF-0034.
- **First-chamber preparation-floor claims C32-C39**: all grounded in CF-0036 cannibal-edge aftermath-itemized register. The "butcher-height hanging," "display-line heads," and "scrap-pit" phrasing is CF-0036 in-register vocabulary.
- **Combat claims C41-C52**: grounded in CF-0020.
- **Leader's shout C46**: grounded in CF-0036 direct-speech-act report discipline.
- **Claim C50 (Auveth mercy-kill uncertainty)**: the only prominently-hedged prose claim; Melissa's self-reported certainty-limit is firsthand narrator-register, not canonizable.
- **Casualty payout claims C54-C56**: grounded in CF-0024 kin-of-record disbursement mechanics.
- **Intake claim C57-C59**: **NOT ADDRESSED** — the three-question form (PR-0008) and the pause-and-runner deviation are not in canon.
- **Closed-room briefing claims C60-C66**: mix of grounded (CF-0036 silence-protocol application) and **NOT ADDRESSED** — the premium-tier-as-prior-suspicion-signal (PR-0009), the clergy-witness procedural-recital register (PR-0010), and the silent-settlement clause per-share countersignature mechanics (PR-0011) are not in canon.
- **Classification recital C68-C72**: grounded in CF-0036 silence-protocol commitment, with the specific procedural-register framing mined as PR-0010.
- **Reservations C76 (Melissa's disagreement)**: contested narrator-register, not canonizable.
- **Narrator-disclaim claims C77-C78**: grounded in SOC-1 firewall discipline.
- **Sectarian recruiter reference C81**: CF-0036 tavern/posting-wall sectarian register — the heartland-caravanserai specificity is closely grounded; rejected at R11 partial-groundedness.
- **Preparation-floor forensic reading C83**: rejected at R10 mere texture / R11 grounded-in-CF-0036.
- **Corridor-watch missed-sign claim C84**: rejected at R4 specialness-inflation risk (corridor-watch as new named institutional role would conflict with CF-0034 settlement-hired hunter-contractor framing).
- **Ransom-clerk / missing-person-list recommendation C87**: **NOT ADDRESSED** — the cross-check reconciliation protocol (PR-0012) is not in canon.
- **Feeder claim C91**: grounded in CF-0034.
- **Corridor-familiarity vouch C93-C94**: scored +16 (below threshold +6 with penalties), rejected at R2 below-threshold; considered partial-grounded in CF-0024 tavern-vouch register.

### Extraction Statistics

- **Total claims extracted**: 99
- **By narrator stance**: asserted ~95 / hedged ~3 / conditional ~1
- **Frontmatter tags present**: yes (artifact has detailed claim_map with 21 author-classified canonicalizable-scope claims)
- **Prose/frontmatter disagreements**: 0 (the author's claim_map is consistent with prose-derived classification; this is a diagnostic signal of a well-authored artifact whose Phase 3 Claim Selection during diegetic-artifact-generation tracked prose reality; no disagreements indicate no stale-tag drift)

## Phase 2 Classification Counts

| Classification | Count | Outcome |
|---|---|---|
| grounded | 84 | discarded silently |
| not_addressed | 15 | carried to Phase 3 |
| contradicts | 0 | n/a — empty flagged_contradictions list |
| extends_soft | 0 | n/a — empty flagged_contradictions list |

**T8 accounting check**: 84 + 15 + 0 + 0 = 99. Equals total claims extracted. **PASS**.

## Flagged Contradictions (Handoff to continuity-audit)

**No contradictions with existing canon detected.** The artifact was carefully constructed against its own CSC trace, and independent prose-first re-derivation (without consulting the author's self-declared CSC) confirms the clean status. No prose claim contradicts any existing CF or invariant; no prose claim extends a soft_canon scope beyond its committed boundary without a qualifying CF. Handoff to `continuity-audit` is **not required**.

## Phase 3 Narrator-Reliability Mapping Trace

| Claim (one-line) | Narrator stance | Centrality | Cross-ref | Mapped status |
|---|---|---|---|---|
| Three-question standard intake (PR-0008) | firsthand | central | no | soft_canon |
| Premium-as-prior-suspicion-signal (PR-0009) | firsthand | central | no | soft_canon |
| Clergy-witness procedural recital (PR-0010) | firsthand | central | no | soft_canon |
| Silent-settlement per-share countersignature (PR-0011) | firsthand | central | no | soft_canon |
| Ransom-clerk / missing-person reconciliation (PR-0012) | firsthand | peripheral | no | soft_canon |
| Heartland caravanserai sectarian recruiter vector (rejected) | firsthand | peripheral | CF-0036 partial | n/a (R11 partial-grounded) |
| Butcher-height cannibal-band practice (rejected) | firsthand | central | CF-0036 grounded | n/a (R10 / R11) |
| Corridor-watch as named institutional role (rejected) | firsthand | peripheral | CF-0034 partial-conflict | n/a (R4 specialness-inflation risk) |
| Ruin-sign burned before thaw-moon close (rejected) | firsthand | peripheral | CF-0036 partial | n/a (R10 / scope-local) |
| Public-register cover-story template (rejected) | firsthand | central | CF-0036 partial | n/a (R10 / redundancy) |
| Years-without-clash metric for silence justification (rejected) | firsthand | peripheral | no | n/a (R2 below threshold) |
| Three-vault Maker-substructure typology (rejected) | firsthand | peripheral | no | n/a (R8 MR overlap risk) |
| Bounty-verification retained-item token (rejected) | firsthand | peripheral | no | n/a (R2 below threshold) |
| Tavern-keeper vouch-record as reputational asset (rejected) | firsthand | peripheral | CF-0024 partial | n/a (R11 partial-grounded) |
| Preparation-floor span-of-weeks forensic reading (rejected) | firsthand | central | CF-0036 grounded | n/a (R10 / R11) |

All five surviving candidates mapped to `soft_canon` per Phase 6d.1 evidence-breadth (artifact-sole-source pathway).

## Phase 4 Score Matrix

| Card | coherence | propagation | story | distinct | ordinary | mystery | integ | redund | **aggregate** |
|---|---|---|---|---|---|---|---|---|---|
| PR-0008 Three-question intake | 5 | 3 | 3 | 3 | 4 | 5 | 2 | 2 | **19** |
| PR-0009 Premium prior-suspicion signal | 5 | 4 | 4 | 4 | 4 | 5 | 2 | 2 | **22** |
| PR-0010 Clergy-witness procedural recital | 5 | 4 | 4 | 5 | 3 | 5 | 3 | 2 | **21** |
| PR-0011 Silent-settlement per-share countersignature | 5 | 5 | 4 | 4 | 3 | 5 | 3 | 2 | **21** |
| PR-0012 Ransom-clerk reconciliation | 5 | 4 | 4 | 3 | 4 | 5 | 2 | 2 | **19** |

All five surviving candidates passed the +6 Phase-5 threshold. Aggregate range +19 to +22.

## Phase 5 Rejected-Candidates Log

Ten not_addressed candidates rejected. Each entry: candidate claim, trigger fired, rationale, whether Phase 5 cap also excluded.

- **Heartland caravanserai as sectarian supremacist-recruiter vector** — **R11 grounded-in-existing-canon** — CF-0036 already commits "tavern and edge of posting-walls across my rotations" as sectarian register vectors; heartland-caravanserai-specific claim is within CF-0036's broader framing. Not cap-excluded; rejected independently.
- **Butcher-height hanging / display-line heads / scrap-pit cadence** — **R10 mere artifact texture** — CF-0036 aftermath-itemized register already commits these as in-register vocabulary. Not cap-excluded; rejected independently.
- **Corridor-watch as named distinct institutional role** — **R4 specialness-inflation risk** — the artifact's "corridor-watch missed the sign" framing risks creating a new named civic-force stratum that may conflict with CF-0034's explicit hunter-contractor / dragoon-firewall / settlement-hired framing; could also be read as informal reference to civic-watch in bandit corridors, which IS grounded. Not cap-excluded; rejected on structural grounds.
- **Ruin-sign burned before thaw-moon close** — **R10 mere texture / scope-local** — seasonal cleanup convention is Harrowgate-Highland-local per GEOGRAPHY Cold North Highland climate; CF-0036 commits the burn without the thaw-moon-close timing. Low propagation; not cap-excluded; rejected on scope-locality.
- **Public-register cover-story template "camp found, resisted, taken, payout cleared"** — **R10 mere texture / R11 redundancy** — already implicit in CF-0036 silence-protocol commitment (the silence-protocol IS the cover-story logic); the specific phrasing is texture. Not cap-excluded; rejected on redundancy.
- **"X winters without interspecies clash" metric for silence justification** — **R2 below threshold** — scored around +5 on integration-burden-balance; the metric exists in the artifact as officials' justification rhetoric but does not propagate into institutional mechanics strongly enough. Not cap-excluded.
- **Three-vault-chamber Maker-substructure typology** — **R8 Mystery Reserve leakage risk** — the artifact's "three vault-chambers deep under a slumped hillside" phrasing touches Maker-Age architectural adjacency (M-1 / M-8); safer as texture than as committed typology. Not cap-excluded; rejected on MR firewall grounds.
- **Bounty-verification by retained personal-item token (belt-buckle)** — **R2 below threshold** — scored around +14-16; lightweight institutional texture, low propagation beyond the specific case. Not cap-excluded; rejected on threshold.
- **Tavern-keeper inter-polity vouch-record as reputational asset** — **R11 partially grounded** — CF-0024 already commits tavern-keeper vouch as real social asset; the inter-polity reputation extension is close to existing canon. Not cap-excluded; rejected on partial-groundedness.
- **Preparation-floor build-out as forensic span-of-weeks evidence** — **R10 mere texture / R11 grounded** — CF-0036 aftermath-itemized register implies the evidentiary reading; the forensic articulation is texture. Not cap-excluded; rejected on texture / groundedness.

## Surviving Cards (Ranked by Score)

| Rank | Card ID | Title | Status | Mining Context | Aggregate |
|---|---|---|---|---|---|
| 1 | PR-0009 | Merchant-Coalition Bounty-Row Premium as Prior-Suspicion Signal | soft_canon | Closed-room briefing observation of prior-suspicion pattern | **22** |
| 2 | PR-0010 | Clergy-Witness Procedural Recital in Sealed Cannibal-Case Briefing | soft_canon | Senior clergy-witness register-distinction in closed-room | **21** |
| 3 | PR-0011 | Silent-Settlement Clause Per-Share Countersignature | soft_canon | Contractor's personal countersignature moment | **21** |
| 4 | PR-0008 | Three-Question Standard Intake at Hunter-Contractor Contract-Close | soft_canon | Senior hunter-officer's three-question form | **19** |
| 5 | PR-0012 | Ransom-Clerk and Missing-Person List Reconciliation | soft_canon | Assessment-section recommendation for case-closing cross-check | **19** |

## Phase 6 Canon Safety Check Traces

### Phase 6a-6c Per-Card Summary

| Card | 6a Invariants | 6b MR Firewall | 6c Distribution | Overall |
|---|---|---|---|---|
| PR-0008 | 16/16 PASS | 18/18 PASS | CF-0020/0024/0034 consulted; regional scope | **PASS** |
| PR-0009 | 16/16 PASS | 18/18 PASS (M-17 overlap noted, per-case scope preserved) | CF-0024/0028/0030/0034/0036 consulted; regional scope | **PASS** |
| PR-0010 | 16/16 PASS | 18/18 PASS (M-18 overlap noted, current-application only) | CF-0016/0024/0026/0033/0036 consulted; regional/restricted-group scope | **PASS** |
| PR-0011 | 16/16 PASS | 18/18 PASS (M-17 + M-18 overlaps noted, per-case scope preserved) | CF-0009/0024/0026/0033/0034/0036 consulted; regional/restricted-group scope | **PASS** |
| PR-0012 | 16/16 PASS | 18/18 PASS (M-17 overlap noted, per-case scope preserved) | CF-0024/0034/0036 consulted; regional scope | **PASS** |

### Phase 6d Per-Card Laundering Firewall

#### PR-0008 — Three-Question Standard Intake

- **6d.1 Evidence-breadth**: artifact-sole-source → soft_canon required → PASS.
- **6d.2 Epistemic-horizon**: Melissa's CF-0024 rotation-experience across heartland + highland Charter Halls places the three-question form within her direct-experience register → PASS.
- **6d.3 MR Positional**: her position gives firsthand access to ordinary intake practice; not to M-16/M-17/M-18 forbidden-answer sets → PASS.

#### PR-0009 — Premium Prior-Suspicion Signal

- **6d.1 Evidence-breadth**: artifact-sole-source → soft_canon required → PASS.
- **6d.2 Epistemic-horizon**: her posting-wall-reading competence + closed-room briefing firsthand observation → PASS.
- **6d.3 MR Positional**: her position compatible with firsthand per-case signaling knowledge; not with M-17 aggregate prevalence, M-16 doctrine-antiquity, M-18 silence-protocol-antiquity, or M-14 captain-mythography → PASS.

#### PR-0010 — Clergy-Witness Procedural Recital

- **6d.1 Evidence-breadth**: artifact-sole-source → soft_canon required → PASS.
- **6d.2 Epistemic-horizon**: her AES-1 register-discrimination competence per CHAR-0002 supports the register-distinction claim → PASS.
- **6d.3 MR Positional**: per-case recital observation; not M-18 founding-documents, M-16 doctrine-antiquity, M-5 sentience-boundary cosmology, or M-7 clergy-reputation archive → PASS.

#### PR-0011 — Silent-Settlement Per-Share Countersignature

- **6d.1 Evidence-breadth**: artifact-sole-source → soft_canon required → PASS.
- **6d.2 Epistemic-horizon**: her CF-0024 SOC-3 coin-contract literacy + personal countersignature → PASS.
- **6d.3 MR Positional**: per-case countersignature; not M-17 aggregate data, M-18 founding-documents, M-16 doctrine-antiquity, or M-14 captain-mythography → PASS.

#### PR-0012 — Ransom-Clerk Reconciliation

- **6d.1 Evidence-breadth**: artifact-sole-source → soft_canon required → PASS.
- **6d.2 Epistemic-horizon**: her multi-polity rotation experience places institutional machinery within professional-competence register → PASS.
- **6d.3 MR Positional**: per-case recommendation; not M-17 aggregate data, M-14 captain-mythography, or M-18 founding-documents → PASS.

### Phase 6e Batch-level Check Trace

**Joint-closure check** (all C(5,2)=10 pairs tested against all 18 MR entries): PASS — no pair jointly resolves any MR entry. Closest-watched pair is (PR-0009, PR-0012) both touching M-17 prevalence-unknown surface; PASS because both are per-case scoped and neither aggregates. (PR-0010, PR-0011) both touching M-18 silence-protocol-antiquity surface; PASS because both commit current-application only without antiquity claims.

**Mutual-contradiction check** (all 10 pairs): PASS — no pair asserts incompatible facts. PR-0010 (ritual register) and PR-0011 (economic register) are structurally complementary not contradictory. PR-0008 (ordinary intake) and PR-0010/PR-0011 (sealed-docket deviation) are structurally distinct registers that the artifact itself names as distinct; no contradiction. PR-0009 (pre-hoc information channel) and PR-0012 (post-hoc reconciliation) are temporally-sequenced complementary mechanisms; no contradiction.

**Single-narrator concentration check**: FLAG TRIGGERED, count 5, all 5 cards hinge on Melissa's sole testimony. Count is AT (not above) the 6f loop threshold of 6; no repair required. Flag surfaced in frontmatter `single_narrator_concentration_flag` for user-awareness during canon-addition adjudication sequencing.

### Phase 6f Repair Log

**No Phase 6f repairs fired.** All five cards passed 6a / 6b / 6c / 6d on first pass; batch-level 6e joint-closure and mutual-contradiction checks passed; single-narrator concentration flag was surfaced without triggering repair-loop (count 5 ≤ threshold 6).

## Phase 7 Test Results

### Per-card tests

| Test | PR-0008 | PR-0009 | PR-0010 | PR-0011 | PR-0012 |
|---|---|---|---|---|---|
| T1 (Rule 2 domain coverage ≥1) | PASS (5 domains) | PASS (5 domains) | PASS (5 domains) | PASS (5 domains) | PASS (5 domains) |
| T2 (Rule 4 scope honesty) | PASS (regional + why_not_universal) | PASS (regional + why_not_universal) | PASS (regional restricted-group + why_not_universal) | PASS (regional restricted-group + why_not_universal) | PASS (regional + why_not_universal) |
| T3 (Rule 5 consequence completeness) | PASS (immediate + longer-term ≥2 domains) | PASS | PASS | PASS | PASS |
| T4 (Rule 3 stabilizer presence) | PASS (why_not_universal populated) | PASS | PASS | PASS | PASS |
| T5 (CSC trace completeness) | PASS (all 6a/6b/6c/6d fields populated, 18/18 MR ids listed) | PASS | PASS | PASS | PASS |
| T6 (source artifact binding) | PASS (DA-0002 + artifact path) | PASS | PASS | PASS | PASS |
| T7 (prose completeness) | PASS (all sections populated, no stubs) | PASS | PASS | PASS | PASS |

### Batch-level tests

- **T8 (classification accounting)**: **PASS** — grounded (84) + not_addressed (15) + contradicts (0) + extends_soft (0) = 99, equals total claims extracted in Phase 1.
- **T9 (rejection log completeness)**: **PASS** — all 10 Phase 5 rejections documented above with trigger IDs (R1-R12) and one-line rationales.
- **T10 (flagged-contradictions handoff completeness)**: **PASS** — `flagged_contradictions: []` with explicit rationale documented in §Flagged Contradictions above. No continuity-audit handoff required.
- **T11 (batch-level CSC trace completeness)**: **PASS** — Phase 6e trace documented above covering joint-closure (all 10 pairs × 18 MR entries), mutual-contradiction (all 10 pairs), and single-narrator concentration (triggered, count 5, flag populated in frontmatter).

## HARD-GATE Deliverable Summary (Phase 8)

**Target paths**:
- `worlds/animalia/proposals/PR-0008-three-question-standard-intake-at-bandit-suppression-close.md` (written)
- `worlds/animalia/proposals/PR-0009-merchant-coalition-bounty-row-premium-prior-suspicion-signal.md` (written)
- `worlds/animalia/proposals/PR-0010-clergy-witness-procedural-recital-cannibal-case.md` (written)
- `worlds/animalia/proposals/PR-0011-silent-settlement-clause-per-share-countersignature.md` (written)
- `worlds/animalia/proposals/PR-0012-ransom-clerk-missing-person-list-reconciliation.md` (written)
- `worlds/animalia/proposals/batches/BATCH-0002.md` (this manifest)
- `worlds/animalia/proposals/INDEX.md` (appending 5 new rows for PR-0008 through PR-0012)

**User-dropped cards**: none.

**Empty-batch**: no. Five surviving cards, all written.
