# NWB Batch Manifest — template
#
# Hybrid YAML frontmatter + markdown body. Emitted by the
# propose-new-worlds-from-preferences skill once per invocation, capturing
# the full deliverable summary the user reviewed at Phase 14 HARD-GATE.
#
# This file is the audit trail for the batch — it records what was generated,
# what was rejected, what was repaired, what was dropped at the gate, and
# whether distinctness was enforced. It is NOT canon and never feeds
# create-base-world; only NWP cards do.

---
# ===== identification =====

batch_id: NWB-0000                           # monotonic, pipeline-scoped
generated_date: ""                           # ISO date
source_preference_document: ""               # path to preference_path argument
parameters_path: ""                          # path to parameters_path argument (or "" if interview)

# ===== generation parameters (Phase 0) =====

parameters:
  proposal_count_requested: 8
  intended_use_case: ""                      # novel | rpg | open_world_game | anthology | transmedia | lore_sandbox
  scale_preference: ""                       # one_settlement | region | continent | planet | solar_system | cosmology
  inspiration_distance: ""                   # close | moderate | distant | structural_only
  novelty_preference: ""                     # low | medium | high
  existing_world_policy: ""                  # strict_avoid | no_repeat_niche | not_applicable
  content_boundaries:
    sexual_content: ""                       # forbidden | allowed_if_structural | ask_or_tag
    body_horror: ""
    child_endangerment: ""
    religion: ""
    politics: ""
    oppression: ""
  genre_diversification: ""                  # diversify | single_family
  inferred_defaults: []                      # list of parameter keys whose value was auto-applied under Auto Mode

# ===== distinctness enforcement (Phase 3 / 11a) =====

distinctness_enforced: true                  # false under Empty Worlds Path
existing_worlds_scanned: []                  # list of {world_slug, occupancy_summary}; empty under Empty Worlds Path

# ===== generation output =====

card_ids: []                                 # list of NWP-NNNN ids written this batch
dropped_card_ids: []                         # list of NWP-NNNN ids the user dropped at the HARD-GATE
                                             # dropped cards are recorded but never written to disk

# ===== bootstrap surface =====

bootstrap_writes_required: false             # true on first ever invocation (no .gitkeep / no .gitignore entry)
bootstrap_writes_performed: []               # list of paths actually written at Phase 14 bootstrap step
                                             # e.g., ["world-proposals/.gitkeep", ".gitignore"]

# ===== gate state =====

user_approved: false                         # set true at Phase 14 just before write
deliverable_summary_distinctness_banner_surfaced: false
                                             # set true if Empty Worlds Path AND the banner was shown to the user
---

# Batch Manifest — {{batch_id}}

## Bootstrap-Writes-Required Notice

(Only present if `bootstrap_writes_required: true`.) This batch performed first-time bootstrap of the `world-proposals/` directory. Files written:

- `world-proposals/.gitkeep` (empty, tracked)
- `.gitignore` two-line append: `world-proposals/*` and `!world-proposals/.gitkeep`

## DISTINCTNESS UNENFORCED Banner

(Only present if `distinctness_enforced: false`.)

> **DISTINCTNESS UNENFORCED — no existing worlds to compare against.**
>
> Phase 3 essence-mapping, Phase 4 niche occupancy mapping, Phase 8 distinctness check, and Phase 11a cross-world Mystery Reserve firewall were all SKIPPED because `worlds/` contained no world directories at Pre-flight. The user accepted this gap at the Phase 14 HARD-GATE deliberately. Subsequent invocations of this skill (after `create-base-world` has produced one or more worlds) will re-enable all four checks automatically.

## Preference Essence Report (Phase 1-2)

### Dominant patterns

(List top-weighted patterns from Phase 1 essence extraction.)

### Strong dislikes

(List rejected patterns and anti-inspirations.)

### Design formula

(One paragraph compressing the preference into a generative grammar.)

## Existing World Essence Map (Phase 3)

(Standard Path: one block per existing world matching the source proposal's `world_slug / primary_difference / survival_constraint / ... / hard_avoid_repetition / ambient_reusable_motifs` schema. Empty Worlds Path: single line "No existing worlds — distinctness checks unenforced".)

## Niche Vacancy Map (Phase 4)

### Hard-occupied
- ...

### Soft-occupied
- ...

### Ambient-only motifs
- ...

### Open
- ...

### Especially-promising vacancies
- ...

(Empty Worlds Path: all niches classified as Open; vacancy diagnosis runs against the design grammar alone.)

## Phase 5/6 Seed Generation + Sanity-Pass Summary

- Seeds generated: <count>
- Seeds rejected at Phase 6: <count>
- Surviving seeds → Phase 7: <count>

### Phase 6 Rejection Log

(One line per rejected seed: seed_id, family, trigger fired, one-line rationale.)

## Phase 8 Distinctness-Check Log

(Standard Path: one block per surviving skeleton with weighted scores against each existing world's essence + transform decisions taken. Empty Worlds Path: "Skipped — no existing worlds.")

## Phase 9 Score Matrix + Max-Min Selection Trace

| Skeleton | Aggregate | Selected | Max-Min Rationale |
|----------|-----------|----------|-------------------|
| ...      | ...       | yes/no   | ...               |

(Selection trace records which finalist was picked at each max-min step, the distance metric used, and which preference clusters were covered.)

## Phase 11 Canon Safety Check Audit

### 11a — Per-card Cross-World MR Firewall
(One line per card per existing world: card_id, world_slug, M-ids checked, overlap findings.)

### 11b — Per-card Forbidden-Mystery Presence
(One line per card: card_id, forbidden_count, resolution-safety coupling verified.)

### 11c — Batch-level Mutual Distinctness
(Pairwise distinctness matrix across finalists; flag any pairwise score ≥ 0.65.)

### 11d — Batch-level World-Grammar Fidelity
(Per `favored_*` cluster: representative finalist or "uncovered" flag.)

## Phase 11e Repair Log

(Empty when no repairs fired. Otherwise: one block per repair with phase looped to, reason, outcome.)

## Phase 12 Validation Test Results

| Test | Result | Rationale |
|------|--------|-----------|
| 1 — One-Sentence Fertility | PASS / FAIL | ... |
| 2 — Minimal Departure | PASS / FAIL | ... |
| 3 — Consequence Propagation | PASS / FAIL | ... |
| 4 — Ordinary-Life | PASS / FAIL | ... |
| 5 — Institution | PASS / FAIL | ... |
| 6 — Geography-as-Law | PASS / FAIL | ... |
| 7 — History-as-Pressure | PASS / FAIL | ... |
| 8 — Misrecognition | PASS / FAIL | ... |
| 9 — Mystery Reserve | PASS / FAIL | ... |
| 10 — Faction | PASS / FAIL | ... |
| 11 — Body / Personhood | PASS / FAIL | ... |
| 12 — Native Procedure | PASS / FAIL | ... |
| 13 — Anti-Pastiche | PASS / FAIL | ... |
| 14 — Existing-World Non-Redundancy | PASS / FAIL / SKIPPED | ... (SKIPPED only under Empty Worlds Path) |
| 15 — Tone Contract | PASS / FAIL | ... |
| 16 — Canonical Vocabulary Conformance | PASS / FAIL | ... |
| 17 — Create-Base-World Readiness | PASS / FAIL | ... |

(Bare PASS without rationale = FAIL per CLAUDE.md and FOUNDATIONS skill discipline.)

## User-Drop-List

(Empty if user accepted all finalists at the HARD-GATE. Otherwise: one line per dropped NWP-id with the user's stated reason if given.)

## Critic-Pass Trace Summary

(Aggregated `critic_pass_trace` notes across finalists, one block per phase.)
