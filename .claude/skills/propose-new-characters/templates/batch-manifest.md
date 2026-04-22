# NCB Batch Manifest — template
#
# Emitted by the propose-new-characters skill as the audit record for a single
# invocation. Pairs with a set of NCP proposal-card files at
# worlds/<world-slug>/character-proposals/NCP-NNNN-<slug>.md whose ids appear in card_ids.
#
# The manifest is the batch's audit trail: every phase output has a named home
# in the body. The frontmatter is summary metadata; the body is the proof-of-work.
#
# Required fields must not be left as TODO or empty (enforced by Phase 15 Test 10-12).

---
batch_id: NCB-0000                           # monotonic per-world
world_slug: ""
generated_date: ""                           # ISO date, e.g. 2026-04-20

parameters:                                  # echo of Phase 0 normalized parameters
  batch_size: 7                              # default 7
  depth_mix:                                 # distribution over memorability modes
    emblematic: 0
    elastic: 0
    round_load_bearing: 0
  spread_vs_focus: spread                    # spread | focus | mixed
  density_rule_mode: auto                    # auto | sparse | balanced | dense (auto detects from registry size at Phase 0)
  target_domains: []                         # explicit domain list to deepen
  taboo_areas: []                            # free-form areas to avoid
  ordinary_vs_exceptional_mix: balanced      # hint; free-form
  artifact_author_share: 0                   # desired fraction 0.0-1.0
  under_modeled_priority: []                 # regions/species/institutions/classes to prioritize
  max_overlap_allowed: crowded_permitted     # crowded_permitted (default) | adjacent_only | open_only
  story_scale_mix:                           # distribution over scale levels
    intimate: 0
    local: 0
    regional: 0
    transregional: 0
  mosaic_cluster_preference: mixed           # cluster | separate | mixed
  upstream_audit_path: ""                    # optional path to continuity-audit report

registry_summary: >                          # one-paragraph prose summary
  Short summary of what the Person Registry looked like at batch-generation
  time: dossier count + artifact-author count + PA-adjudicated-figure count,
  plus a one-sentence characterization of density (character-sparse /
  balanced / character-dense) and the domains the registry already covers
  well vs those it leaves open.

card_ids: []                                 # every NCP-NNNN emitted by this batch (surviving through Phase 15)
  # - NCP-0001
  # - NCP-0002

dropped_card_ids: []                         # card ids the user excluded at Phase 16 HARD-GATE drop-list
  # - NCP-0003

user_approved: false                         # set true at Phase 16 commit

notes: >
  Free-form notes. Phase 10e repairs that fired at the batch level (e.g., 10d
  joint-closure forcing a card drop + slot-regeneration) may be summarized here.
  Also: user's stated routing preferences for canon-requiring cards, if any
  (e.g., "user prefers first_through_propose_new_canon_facts for all implied
  new institutions").
---

# Batch NCB-NNNN — <World-Slug-TitleCased>

## Registry Summary

<Prose: the output of Phase 1's registry build, with counts by source_type
 (dossier / artifact-author / artifact-speaker / artifact-annotator /
 artifact-correspondent / artifact-scribe / artifact-censor / artifact-patron /
 artifact-copyist / historical-salient-PA / offstage-gravity) and by
 occupancy_strength (hard / soft / ambient). One paragraph.>

## Constellation + Mosaic Audit

### Dense Clusters

<Bulleted list of registry clusters where multiple entries share a constellation
 link (kinship / patronage / rivalry / etc) — clusters that risk
 overrepresentation in the proposal batch.>

### Isolated Domains

<Bulleted list of world domains represented by only one (or zero) registry
 entries — the prime targets for new-proposal coverage.>

### Monopoly Windows

<Bulleted list of domains visible through only one existing registry
 entry — single-point-of-failure lenses on world truths.>

### Mosaic Mirrors

<Bulleted list of pairs of registry entries occupying parallel positions
 across separated zones (same taboo system in different regions; same
 trade route from opposite ends; same species pressure across continents).>

## Niche-Occupancy Map

<Table: Niche-signature dimensions × current-coverage assessment.
 Each row shows a niche area and whether it is filled / crowded / adjacent /
 open. Cite the registry entries occupying each filled/crowded row.>

| Niche Area | Coverage | Occupying Entries | Notes |
|------------|----------|-------------------|-------|
| ...        | ...      | ...               | ...   |

## Phase 5 Negative-Space Diagnosis

<For each of the 17 probes:
 - probe name and number (1-17)
 - status: fired / not_fired / merged_from_upstream_audit
 - if fired: one-sentence summary of the gap identified
 - remediation priority: high / medium / low
 - which enrichment target this probe feeds into>

## Phase 6 Seed Generation Log

<For each generated seed:
 - seed-internal id (s-01, s-02, ...)
 - diagnosis_target (which Phase 5 probe it addresses)
 - proposal_family (one of 16)
 - depth_class_hint
 - story_scale_hint
 - one-sentence seed summary>

## Phase 11 Score Matrix

<Table with one row per seed surviving Phase 10 canon gate:>

| Seed | world_root | niche_dist | pressure | voice | ord_life | artifact | theme | expansion | canon_burden | overlap | aggregate |
|------|-----------|-----------|----------|-------|----------|----------|-------|-----------|--------------|---------|-----------|
| ...  | ...       | ...       | ...      | ...   | ...      | ...      | ...   | ...       | ...          | ...     | ...       |

## Phase 12 Rejected-Candidate Log

<For each seed rejected at Phase 12, a row:
 - seed-internal id
 - trigger fired (one of the 13 rejection triggers by number + name)
 - one-sentence seed summary
 - diagnosis_target it addressed
 - whether the slot was later filled by another seed or left empty>

## Phase 13 Diversification Audit

<Table: 10 composition slots × filled-by / empty-with-rationale.>

| Slot | Composition Type | Filled By | Empty? / Rationale |
|------|------------------|-----------|---------------------|
| 1    | ordinary-life lens | NCP-NNNN | — |
| 2    | institution insider | NCP-NNNN | — |
| 3    | boundary broker | — | **true** — <rationale for why no seed filled this slot> |
| 4    | pressure enforcer / gatekeeper | NCP-NNNN | — |
| 5    | sufferer / witness with low formal power | NCP-NNNN | — |
| 6    | artifact-native author | NCP-NNNN | — |
| 7    | ideological misreader / dissenter | NCP-NNNN | — |
| 8    | regionally distant mosaic figure | NCP-NNNN | — |
| 9    | body / species-differentiated lens | — | **true** — <rationale> |
| 10   | load-bearing round character | NCP-NNNN | — |

### Contrast-Axis Coverage

<Table: 8 contrast axes × batch coverage.>

| Contrast Axis | Coverage Summary |
|---------------|------------------|
| elite ↔ common | ... |
| settled ↔ mobile | ... |
| literate ↔ oral | ... |
| orthodox ↔ heterodox | ... |
| lawful ↔ illicit | ... |
| old ↔ young | ... |
| kin-tied ↔ socially-detached | ... |
| local ↔ transregional | ... |

## Phase 10d Batch-level Check Trace

<For each card pair tested at Phase 10d, a row:>

| Pair (A, B) | Registry Non-Dup | Pairwise Non-Dup | Joint MR-Closure | Joint Registry-Dup | Phase 10e Action (if any) |
|-------------|------------------|------------------|------------------|---------------------|---------------------------|
| (NCP-A, NCP-B) | pass / fail : <details> | pass / fail | pass / fail + MR-id if fail | pass / fail + registry-id if fail | — |

<Note: pairs involving seeds later dropped at Phase 10e or Phase 16 drop-list
 are retained here as audit evidence that the full batch passed 10d before
 the drop was applied. Do NOT prune dropped-pair rows.>

## Phase 10e Repair Log

<For each repair that fired (at any Phase 10 sub-phase), a row:
 - card_id (or seed-internal id if dropped before Phase 14 composition)
 - sub-phase that failed (10a / 10b / 10c / 10d)
 - repair-type applied (1-6 from the ladder)
 - justification
 - outcome (repair succeeded / seed dropped / batch regenerated)>

## Phase 15 Test Results

<One row per test; all 12 must PASS for Phase 16 HARD-GATE to fire.
 A PASS without rationale is treated as FAIL.>

### Per-card tests (run per card in card_ids)

- Test 1 (Rule 2, Phase 2+7 — institutional embedding + central contradiction): PASS / FAIL — <per-card rationale>
- Test 2 (Rule 2, Phase 7 — repeated_forced_choice populated): PASS / FAIL — <rationale>
- Test 3 (Rule 3, Phase 7 — every capability has full stabilizer set): PASS / FAIL — <rationale>
- Test 4 (Rule 4, Phase 10c — canon_assumption_flags.status valid + implied_new_facts routing): PASS / FAIL — <rationale>
- Test 5 (Rule 7, Phase 10b — mystery_reserve_firewall complete audit list): PASS / FAIL — <rationale>
- Test 6 (Rule 7, Phase 8+10b — no disallowed_cheap_answers leak in known_firsthand or wrongly_believes): PASS / FAIL — <rationale>
- Test 7 (Phase 10a — invariants_respected lists every invariant tested): PASS / FAIL — <rationale>
- Test 8 (Phase 14 schema completeness — no TODO/placeholder/empty-where-required): PASS / FAIL — <rationale>
- Test 9 (Voice distinctiveness, Phase 9 — no duplicate voice families without explicit notes exemption): PASS / FAIL — <rationale>

### Batch-level tests

- Test 10 (Phase 13 diversification — audit table complete, empty slots rationalized): PASS / FAIL — <rationale>
- Test 11 (Phase 10d — check trace complete for all pairs tested at generation time): PASS / FAIL — <rationale>
- Test 12 (Phase 12 audit — rejected-candidate log complete with trigger + diagnosis target): PASS / FAIL — <rationale>
