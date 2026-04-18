---
# Batch Manifest — template
#
# Emitted by the propose-new-canon-facts skill as the audit record for a single
# invocation. Pairs with a set of proposal-card files at
# worlds/<world-slug>/proposals/PR-NNNN-<slug>.md whose ids appear in card_ids.
#
# The manifest is the batch's audit trail: every phase output has a named home
# in the body. The frontmatter is summary metadata; the body is the proof-of-work.
#
# Required fields must not be left as TODO or empty (enforced by Phase 8 Test 10).

batch_id: BATCH-0000                         # monotonic per-world
world_slug: ""
generated_date: ""                           # ISO date, e.g. 2026-04-18

parameters:                                  # echo of Phase 0 normalized parameters
  batch_size: 7                              # default 7
  novelty_range: moderate                    # conservative | moderate | bold
  enrichment_types: []                       # subset of the 10-value taxonomy; empty = all
    # - darker
    # - more_political
    # - more_local_texture
  taboo_areas: []                            # free-form
  upstream_audit_path: ""                    # optional path to continuity-audit report

diagnosis_summary: >                         # one-paragraph prose summary of Phase 1 diagnosis
  Short prose summary of the dossier in the body — which scan types found the
  most weaknesses, which domains were overrepresented / underrepresented,
  what the dominant remediation direction is.

card_ids: []                                 # every PR-NNNN emitted by this batch (surviving Phases 4-7)
  # - PR-0001
  # - PR-0002

dropped_card_ids: []                         # card ids the user excluded at Phase 9 HARD-GATE drop-list
  # - PR-0003

user_approved: false                         # set true at Phase 9 commit

notes: >
  Free-form notes. Phase 7e repairs that fired at the batch level (e.g., 7d
  collisions that forced a card drop + slot-regeneration) may be summarized here.
---

# Batch BATCH-NNNN — <World-Slug-TitleCased>

## Diagnosis Dossier

<Prose: the output of Phase 1's three scans across all 12 world files.>

### Thinness Findings

<For each of the 12 thinness indicators fired, a bullet with:
 - indicator name
 - world file(s) cited
 - remediation value: high / medium / low
 - one-sentence summary of the gap>

### Overstability Findings

<Same structure, 6 indicators.>

### Overcomplexity Findings

<Same structure, 4 indicators.>

### Upstream Audit Merge

<If upstream_audit_path was loaded, a note on what was merged from it and
 what scan types were skipped because the audit already covered them.>

## Enrichment Targets

<Table: diagnosis_finding -> enrichment_category (A-J) -> proposal_family (1-10).
 Each row shows which finding was selected, which category it was mapped to,
 and which family of proposals it targets.>

## Seed Generation Log

<For each target, count of seeds generated at Phase 3 (1-3 per target).
 List each seed as one sentence with its diagnosis_finding_reference.>

## Phase 4 Score Matrix

<Table: seed_id | coherence | propagation | story_yield | distinctiveness |
 ordinary_life | mystery_preservation | integration_burden | redundancy | aggregate>

## Phase 5 Rejected-Seed Log

<For each seed rejected at Phase 5, a row:
 - seed content (one sentence)
 - trigger fired (one of the 9 rejection triggers by number + name)
 - diagnosis_finding it addressed
 - whether Phase 3 regeneration produced a replacement or not>

## Phase 6 Diversification Audit

<Table: slot (1-7) | filled by (PR-NNNN) | alternative candidates considered | empty?>

| Slot | Title | Filled by | Empty |
|------|-------|-----------|-------|
| 1 (local texture) | ... | PR-NNNN | false |
| 2 (institutional adaptation) | ... | PR-NNNN | false |
| 3 (pressure-system intensifier) | ... | — | **true** — <rationale> |
| 4 (contested-belief) | ... | PR-NNNN | false |
| 5 (history residue) | ... | PR-NNNN | false |
| 6 (mystery-seeding) | ... | PR-NNNN | false |
| 7 (cross-domain connection) | ... | PR-NNNN | false |

## Phase 7d Batch-level Check Trace

<For each card pair tested, a row:
 - pair (PR-A, PR-B)
 - joint-closure check result (pass / fail + MR-id if fail)
 - direct-contradiction check result (pass / fail + specifics if fail)
 - diagnosis-redundancy check result (pass / fail + shared finding if fail)
 - Phase 7e action if any check failed>

## Phase 7e Repair Log

<For each repair that fired (at any Phase 7 sub-phase), a row:
 - card_id
 - sub-phase that failed (7a / 7b / 7c / 7d)
 - repair-type applied (1-5 from the ladder)
 - justification>

## Phase 8 Test Results

<One row per Phase 8 test, per card for per-card tests + per batch for batch tests.>

- Test 1 (Rule 2, per-card 14-domain check): PASS / FAIL — <rationale>
- Test 2 (Rule 3, per-card stabilizer populated): PASS / FAIL — <rationale>
- Test 3 (Rule 4, per-card scope not silently global): PASS / FAIL — <rationale>
- Test 4 (Rule 5, per-card consequences + downstream updates): PASS / FAIL — <rationale>
- Test 5 (Rule 7, per-card firewall complete): PASS / FAIL — <rationale>
- Test 6 (Rule 7, per-card no disallowed_cheap_answers leak): PASS / FAIL — <rationale>
- Test 7 (Phase 6, batch-level no silent empty slots): PASS / FAIL — <rationale>
- Test 8 (Phase 7d, batch-level collision trace complete): PASS / FAIL — <rationale>
- Test 9 (Phase 5 audit, rejected-seed log complete): PASS / FAIL — <rationale>
- Test 10 (schema completeness, batch-level + per-card): PASS / FAIL — <rationale>
