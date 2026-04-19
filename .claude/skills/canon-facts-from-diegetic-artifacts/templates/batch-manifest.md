---
# Batch Manifest — template (mining variant)
#
# Emitted by the canon-facts-from-diegetic-artifacts skill as the audit record
# for a single invocation. Pairs with a set of proposal-card files at
# worlds/<world-slug>/proposals/PR-NNNN-<slug>.md whose ids appear in card_ids.
#
# The manifest is the batch's audit trail: every phase output has a named home
# in the body. The frontmatter is summary metadata; the body is the proof-of-work.
#
# EMPTY BATCH: if Phase 6/7 produces zero surviving cards OR the user drops all
# cards at Phase 8, the manifest STILL writes with card_ids: [] and narrative
# explanation in the body. The empty-batch manifest is a diagnostic record
# documenting that this artifact was examined, preventing redundant re-mining.
#
# Required fields must not be left as TODO or empty (enforced by Phase 7 T8/T9/T10/T11).

batch_id: BATCH-0000                         # monotonic per-world
world_slug: ""
source_artifact_id: DA-0000                  # DA-NNNN of the source artifact
source_artifact_path: ""                     # full path — e.g., worlds/<slug>/diegetic-artifacts/<da-slug>.md
generated_date: ""                           # ISO date

parameters:                                  # echo of Phase 0 normalized parameters
  max_cards: 5                               # default 5; integer ≥0 (0 = dry-run / reconnaissance)
  novelty_range: moderate                    # conservative | moderate | bold
  taboo_areas: []                            # free-form
  allow_soft_canon_only: false               # if true, all hard_canon candidates demoted to soft_canon

claim_extraction_summary: >                  # one-paragraph prose summary of Phase 1
  Short prose summary of claim extraction: how many claims were extracted from
  the artifact, what narrator stances were most common, whether frontmatter tags
  were present and how often they disagreed with prose-derived classification.

classification_counts:                       # Phase 2 output — Phase 7 T8 accounting test
  grounded: 0                                # already in canon; discarded silently
  partially_grounded: 0                      # CF partially commits the mechanic; incremental specification
                                             # below Phase 4 significance threshold (≤ +10 aggregate);
                                             # discarded silently with trigger R11-partial
  not_addressed: 0                           # carried forward as candidates
  contradicts: 0                             # routed to flagged_contradictions
  extends_soft: 0                            # routed to flagged_contradictions
  # T8: grounded + partially_grounded + not_addressed + contradicts + extends_soft == total_claims_extracted

flagged_contradictions: []                   # Phase 2 output — not cards; handoff to continuity-audit
  # - claim_summary: "author asserts X in region Y"
  #   conflict_with: CF-0042
  #   conflict_type: extends_soft             # contradicts | extends_soft
  #   handoff_note: >
  #     "The author's assertion that X obtains in region Y extends CF-0042's
  #      soft_canon scoping (currently region Z only). Run continuity-audit on
  #      this artifact + CF-0042 to adjudicate whether this is canon diffusion
  #      (retcon) or author overreach (rejection)."

mr_positional_flags: []                      # Phase 6d.3 author-level warnings
  # - author_descriptor: "the chronicle's monastic author"
  #   mr_id_overlap: MR-0003
  #   per_card_rejections: [PR-0012]
  #   session_warning: >
  #     "The author's world-position may give them access to MR-0003's forbidden-
  #      answer set. Cards from this artifact (and potentially other artifacts by
  #      the same author) should be mined with elevated MR firewall caution."

single_narrator_concentration_flag:          # Phase 6e flag
  triggered: false                           # true if >3 surviving cards hinge on sole-testimony from same author
  count: 0
  affected_card_ids: []
  rationale: ""

card_ids: []                                 # every PR-NNNN emitted by this batch (surviving Phase 6-7)
  # - PR-0012
  # - PR-0013

dropped_card_ids: []                         # card ids the user excluded at Phase 8 HARD-GATE drop-list
  # - PR-0014

user_approved: false                         # set true at Phase 8 commit

notes: >
  Free-form notes. Phase 6f repairs that fired at the batch level (e.g., 6e
  collisions that forced a card drop) may be summarized here. Author-level
  safety signals the user should carry across sessions.
---

# Batch BATCH-NNNN — <World-Slug-TitleCased> — mined from DA-NNNN

## Source Artifact

<Prose: artifact title, author (lifted from artifact frontmatter if available),
artifact type (chronicle / sermon / travelogue / etc.), artifact date (in-world),
artifact communicative purpose. Include a one-paragraph summary of what the
artifact is and why it became a mining target.>

## Claim Extraction Trace (Phase 1)

<Prose: total claims extracted from artifact prose. For each extraction decision
that was non-trivial, one bullet with:
 - claim content (verbatim or paraphrase with citation)
 - narrator's stated stance (asserted / hedged / conditional / rhetorical)
 - frontmatter tag hint if present
 - prose/frontmatter disagreement note if they disagreed>

### Extraction Statistics

- **Total claims extracted**: N
- **By narrator stance**: asserted N1 / hedged N2 / conditional N3 / rhetorical N4
- **Frontmatter tags present**: yes/no
- **Prose/frontmatter disagreements**: N (diagnostic signal — a high count may
  indicate a hand-authored artifact with stale tags OR a generated artifact whose
  Phase 3 Claim Selection drifted from prose reality)

## Phase 2 Classification Counts

| Classification | Count | Outcome |
|---|---|---|
| grounded | N | discarded silently |
| partially_grounded | N | discarded silently with trigger R11-partial |
| not_addressed | N | carried to Phase 3 |
| contradicts | N | flagged_contradictions (see list below) |
| extends_soft | N | flagged_contradictions (see list below) |

**T8 accounting check**: grounded + partially_grounded + not_addressed + contradicts + extends_soft = N. Must equal total claims extracted.

## Flagged Contradictions (Handoff to continuity-audit)

<For each `flagged_contradictions` entry from frontmatter, a sub-section:

### Contradiction N

**Claim**: <verbatim or paraphrased claim from artifact with citation.>

**Conflicts with**: <CF-NNNN or invariant id>

**Conflict type**: contradicts / extends_soft

**Handoff note to continuity-audit**: <prose explaining what continuity-audit
should adjudicate. Include specific invocation recommendation:
`/continuity-audit <world_slug> --focus-on DA-NNNN + CF-NNNN`.>

If no flagged contradictions, state: "No contradictions with existing canon detected.">

## Phase 3 Narrator-Reliability Mapping Trace

<Per not_addressed candidate (whether or not it survived to a card), one row:

| Claim (one-line) | Narrator stance | Centrality | Cross-ref | Mapped status |
|---|---|---|---|---|
| ... | firsthand | central | yes | hard_canon |
| ... | secondhand | incidental | no | contested_canon [disputed] |>

## Phase 4 Score Matrix

| Claim / Card | coherence | propagation | story_yield | distinctiveness | ordinary_life | mystery_preservation | integration_burden | redundancy | aggregate |
|---|---|---|---|---|---|---|---|---|---|
| PR-NNNN ... | | | | | | | | | |

## Phase 5 Rejected-Candidates Log

<For each candidate rejected at Phase 5, a row:
- claim content (one sentence)
- trigger fired (R1-R12 by number + name)
- one-line rationale
- whether Phase 5 cap also excluded it, or it was below threshold/rejected independently>

## Surviving Cards (Ranked by Score)

<Ranked list of cards that passed Phase 5 cap. Each row:
- rank
- card_id (PR-NNNN)
- title
- proposed_status
- mining_context (one line)
- score_aggregate>

## Phase 6 Canon Safety Check Traces

### Phase 6a-6c Per-Card Summary

<Table: card_id | 6a invariants | 6b MR firewall | 6c distribution | pass/fail overall>

### Phase 6d Per-Card Laundering Firewall

<For each card, a sub-block:

#### PR-NNNN — <title>

**6d.1 Evidence-breadth**: <result + impact on proposed_status>
**6d.2 Epistemic-horizon**: <result + scope adjustments if any>
**6d.3 MR Positional**: <result + positional flag if triggered>>

### Phase 6e Batch-level Check Trace

**Joint-closure**: <for each card pair tested, pass/fail with MR-id if fail>

**Mutual-contradiction**: <for each card pair tested, pass/fail with specifics if fail>

**Single-narrator concentration**: <count of cards with sole-testimony dependency, threshold check, flag status>

### Phase 6f Repair Log

<For each repair fired, a row:
- card_id
- sub-check that failed (6a / 6b / 6c / 6d.1 / 6d.2 / 6d.3 / 6e)
- repair-type applied (narrow / reclassify / add_stabilizer / drop / loop_to_phase_3)
- loop attempt count (1 or 2; drop-only beyond 2)
- justification>

## Phase 7 Test Results

**Per-card tests** (run per surviving card — list results per-card or in a table):

- **T1 (Rule 2, domain coverage)**: PASS / FAIL — <rationale per card>
- **T2 (Rule 4, scope honesty)**: PASS / FAIL — <rationale per card>
- **T3 (Rule 5, consequence completeness)**: PASS / FAIL — <rationale per card>
- **T4 (Rule 3, stabilizer presence)**: PASS / FAIL — <rationale per card>
- **T5 (CSC trace completeness)**: PASS / FAIL — <rationale per card>
- **T6 (source artifact binding)**: PASS / FAIL — <rationale per card>
- **T7 (prose completeness)**: PASS / FAIL — <rationale per card>

**Batch-level tests**:

- **T8 (classification accounting)**: PASS / FAIL — <rationale>
- **T9 (rejection log completeness)**: PASS / FAIL — <rationale>
- **T10 (flagged-contradictions handoff completeness)**: PASS / FAIL — <rationale>
- **T11 (batch-level CSC trace completeness)**: PASS / FAIL — <rationale>

## HARD-GATE Deliverable Summary (Phase 8)

<At Phase 8 this section is filled with: target write paths, any Phase 8 drop-list
applied, empty-batch status if applicable. On write, this section records the
state at user approval moment.>

**Target paths**:
- `worlds/<world-slug>/proposals/PR-NNNN-<slug>.md` (per non-dropped card)
- `worlds/<world-slug>/proposals/batches/BATCH-NNNN.md` (this manifest)
- `worlds/<world-slug>/proposals/INDEX.md` (append or create)

**User-dropped cards**: <card_ids removed by drop-list, or "none">

**Empty-batch**: <yes/no; if yes, rationale based on extraction and rejection tallies>
