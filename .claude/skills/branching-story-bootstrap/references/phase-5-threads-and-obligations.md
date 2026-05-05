# Phase 5: Initial Threads + Obligations

Reference for `branching-story-bootstrap` Phase 5 — the structural-setup phase that converts the Phase 4 audit-sketched threads/obligations into emitted THR + OBL records and initializes the consequences ledger. Rule 5 enforcement (salience + urgency + ≥2 payoff modes) is the load-bearing halt condition.

---

## Threads

Generate 2-5 `THR-NNNN` (replace acts entirely):

- one **main thread** (the story's central pressure)
- one **primary relationship thread** (often the protagonist + a key second)
- optionally one **threat clock** (escalating external pressure)
- optionally one **mystery-edge thread** (touches but does not resolve M-NNNN)
- optionally one **subthread** for tonal contrast

THR fields (full schema in `templates/story-records.yaml`): `id`, `story_id`, `type` (`mystery | relationship | threat | quest | theme | survival`), `status` (`dormant | active | pressured | critical | resolved | failed`), `title`, `owner_cast[STENT]`, `obligations[OBL]`, `current_pressure`, `desired_cadence`, `created_at_page: PG-0001`.

---

## Obligations

For each thread, generate initial `OBL-NNNN`. OBL fields include `type`, `introduced_at_event`, `introduced_at_page`, `owner`, `subjects[STENT]`, `visible_to_reader`, `known_by[STENT]`, **`salience: 0..10`**, **`urgency: 0..10`**, `emotional_weight`, `decay_rate`, `required_closure`, **`possible_payoff_modes` (≥2)** drawn from {`literal_fulfillment`, `ironic_reversal`, `failed_expectation`, `symbolic_echo`, `transfer`, `red_herring`, `tragic_loss`, `abandon_with_acknowledgment`}, `constraints[predicate]`, `dependent_facts[SF]`, `coverage_cache` (advisory), `status: open`, `notes`.

**Rule 5 enforcement (halt condition)**: every initial OBL must declare `salience`, `urgency`, AND ≥2 `possible_payoff_modes`. An obligation with one payoff mode is rigid — the runtime cannot honor wild user choices. Halt and expand payoff modes; do NOT proceed to Phase 6.

---

## Consequences ledger initialization

**Initialize consequences ledger**: emit `_source/consequences/` as an empty directory at this phase; `consequences_pending: []` and `consequences_addressed: []` populated on PG-0001's `state_snapshot` at Phase 7.
