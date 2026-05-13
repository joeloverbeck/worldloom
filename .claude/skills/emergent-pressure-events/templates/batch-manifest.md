---
# Batch Manifest — template
#
# Emitted by the emergent-pressure-events skill as the audit record for a single
# invocation. Pairs with a set of pressure-event card files at
# worlds/<world-slug>/pressure-events/EPE-<integer>-<slug>.md plus optional sidecar
# files at worlds/<world-slug>/pressure-events/EPE-<integer>-<slug>.proposal.md
# whose ids appear in card_ids and sidecars_emitted respectively.
#
# The manifest is the batch's audit trail: every phase output has a named home
# in the body. The frontmatter is summary metadata; the body is the proof-of-work.
#
# Required fields must not be left as TODO or empty (enforced by Phase 7 Test 7).

batch_id: BATCH-<integer>                         # monotonic per-world
world_slug: ""
generated_date: ""                           # ISO date

parameters:                                  # echo of Phase 0 normalized parameters
  batch_size: 5                              # default 5
  novelty_range: moderate                    # conservative | moderate | bold
  origin_type_focus: []                      # subset of the 14-value origin_type taxonomy; empty = unrestricted
    # - scarcity
    # - faction_rivalry
  taboo_areas: []                            # free-form
  current_date: ""                           # ISO date used as the "now" reference
  current_season: null                       # free-form (e.g., "high winter") OR null

pressure_inventory_summary: >                # one-paragraph prose summary of Phase 1 output
  Short prose summary of the world's currently-active pressures: which
  origin_type clusters dominate, which canon facts and section records anchor
  them, which mysteries are in play. Detailed inventory lives in the body.

card_ids: []                                 # every EPE-<integer> emitted by this batch (Phase 4-survivors)
  # - EPE-1
  # - EPE-2

sidecars_emitted: []                         # subset of card_ids whose downstream_routing == canonize
                                             # (each sidecar is EPE-<integer>-<slug>.proposal.md next to the EPE card)
  # - EPE-1                               # canonize-routed, sidecar PR-42 emitted
  # - EPE-3                               # canonize-routed, sidecar PR-43 emitted

dropped_card_ids: []                         # card ids the user excluded at Phase 8 HARD-GATE drop-list
  # - EPE-2

phase_4_drop_log_ids: []                     # seed ids dropped at Phase 4 (untraceable seeds; never reached card form)
  # - EPE-99                               # allocated EPE-<integer>, dropped at Phase 4 — permanent gap

user_approved: false                         # set true at Phase 8 commit

notes: >
  Free-form notes. Phase 6e repairs that fired at the batch level (e.g., 6d
  collisions that forced a card drop + slot-regeneration) may be summarized here.
---

# Batch BATCH-<integer> — <World-Slug-TitleCased>

## Pressure Inventory

<Prose: the output of Phase 1 enumeration across the world's atomic records —
canon facts (CF-*), section records (SEC-*), mystery reserve (M-*), open
questions (OQ-*), and recent change-log entries (CH-*). Each entry cites
specific record ids and a pressure_type from the 14-value taxonomy.>

| pressure_label | source_records | pressure_type | current_intensity | recurrence_flag |
|----------------|----------------|---------------|-------------------|-----------------|
| ...            | ...            | ...           | ...               | ...             |

## Phase 2 Origin-Type Mapping

<Table: which Pressure Inventory entries mapped to which 5-slot diversification
grid slot. Each row shows pressure_label -> slot label.>

| Slot | Slot label | Pressures mapped | Filled by EPE |
|------|------------|------------------|---------------|
| 1 | Material pressure | ... | EPE-<integer> |
| 2 | Social/political pressure | ... | EPE-<integer> |
| 3 | Ideological/ritual pressure | ... | — (empty: <reason>) |
| 4 | Capability/economic edge | ... | EPE-<integer> |
| 5 | Public-health pressure | ... | — (empty: no inventory entry mapped) |

## Phase 3 Seed Generation Log

<For each non-empty slot, count of seeds generated (1-3).
List each seed as one sentence with its slot label and provisional traceability.>

## Phase 4 Drop Log

<For each seed dropped at Phase 4 (untraceable), a row:>

| EPE-<integer> | Seed text | Slot | Missing-anchor reason |
|----------|-----------|------|----------------------|
| EPE-99 | ... | 3 (Ideological/ritual) | Pressure entry only cited SEC-INS-007; no CF anchor |

## Phase 6 Canon Safety Check Traces

### Phase 6a — Invariant Conformance per card

<Per card: every INV id tested, pass/fail per invariant, any exception fired
(contested_canon reclassification, local re-scope).>

### Phase 6b — Mystery Reserve Firewall per card

<Per card: every M id tested, overlap status, any forbidden-MR drop-trigger
or active/passive citation in mysteries_touched.>

### Phase 6c — Distribution Discipline per card

<Per card: scope.geographic + why_not_universal rationale, CFs consulted,
rumor carve-out if applied.>

### Phase 6d — Batch-level Light Check

<For each card pair, all three sub-checks (joint-MR-resolution, direct
contradiction, redundant origin_type) recorded.>

| Pair | Joint-MR | Contradiction | Redundancy | 6e action |
|------|----------|---------------|------------|-----------|
| (EPE-1, EPE-2) | pass | pass | pass | none |

## Phase 6e Repair Log

<For each repair that fired (at any Phase 6 sub-phase), a row:>

| Card | Sub-phase | Repair-type | Justification |
|------|-----------|-------------|---------------|
| EPE-3 | 6c | narrow | scope.geographic dropped global -> regional after capability-CF check |

## Phase 2 Diversification Audit

<Table: same shape as Phase 2 mapping but final state after Phase 6e + drop-list.>

| Slot | Title | Filled by | Empty? Rationale |
|------|-------|-----------|-------------------|
| 1 | Material pressure (scarcity) | EPE-1 | — |
| 2 | Social/political pressure (succession) | EPE-2 | — |
| 3 | Ideological/ritual pressure | — | empty: Phase 4 drop (CF coverage too thin for taboo_breach origin_type) |
| 4 | Capability/economic edge | EPE-3 | — |
| 5 | Public-health pressure | — | empty: no inventory entry mapped (no active disease pressure in current world state) |

## Phase 7 Test Results

<One row per Phase 7 test, per card for per-card tests + per batch for batch tests.>

- Test 1 (Rule 2, per-card no-pure-cosmetics): PASS / FAIL — <rationale>
- Test 2 (Rule 4, per-card scope discipline): PASS / FAIL — <rationale>
- Test 3 (Rule 5, per-card consequence propagation): PASS / FAIL — <rationale>
- Test 4 (Rule 7, per-card mystery-firewall completeness): PASS / FAIL — <rationale>
- Test 5 (Phase 2, batch-level no-silent-empty-slots): PASS / FAIL — <rationale>
- Test 6 (Phase 6d, batch-level collision trace complete): PASS / FAIL — <rationale>
- Test 7 (schema completeness, batch-level + per-card): PASS / FAIL — <rationale>
- Test 8 (sidecar parse-readiness, per canonize-routed card): PASS / FAIL — <rationale>
