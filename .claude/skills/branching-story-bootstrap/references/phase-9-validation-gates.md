# Phase 9: Validation Gates (Canon Safety Check phase)

Reference for `branching-story-bootstrap` Phase 9 — the 12-gate canon-safety audit that gates HARD-GATE Phase 10 approval. Each gate must record PASS with a one-line rationale into `STORY_KERNEL.md`'s `validation_trace` field. Any FAIL halts the bootstrap and routes to the responsible upstream phase. A bare "PASS" without rationale is treated as FAIL per the FOUNDATIONS skill discipline.

---

| # | Gate | Check | Routes to on FAIL |
|---|---|---|---|
| 1 | Mystery firewall (Rule 7) | No `forbidden`-status M-NNNN resolved by any storylet, fact, obligation, or page | Phase 4 |
| 2 | Invariant compatibility (Rule 4) | All `applied_event_ops` respect every world INV's `break_conditions` | Phase 4 |
| 3 | Content policy presence | content_policy block embedded verbatim in STORY_KERNEL.md AND in every assembled LLM prompt this run | Pre-flight |
| 4 | ID uniqueness | Allocated IDs do not collide with any existing record in this story | Pre-flight |
| 5 | Branch path consistency | `PG-0001.branch_path == [PG-0001]` AND `parent_page_id == null` AND `branch_id == BR-0001` | Phase 7 |
| 6 | Cast intention coverage | Every protagonist + major has a non-empty bare-numeric `STINT-NNNN` record whose `stent_id` points to its STENT | Phase 2 |
| 7 | Obligation salience (Rule 5) | Every initial OBL declares salience, urgency, ≥2 payoff_modes | Phase 5 |
| 8 | Epistemic class declared (Rule 1) | Every initial SF declares `epistemic_class` | Phase 3 |
| 9 | Storylet diversity | Seed pool covers ≥5 distinct shapes from the Phase 6 coverage table | Phase 6 |
| 10 | Prose ledger consistency | PG-0001 prose introduces no entity as physically present unless in `cast_present`; load-bearing factual claims are state-snapshot-grounded; resolves no mystery | Phase 7 |
| 11 | Choice consequence-capacity | Every emitted CHC has at least one continuation storylet (in seed pool or `jit_generatable`) | Phase 8 |
| 12 | State_snapshot completeness + recursive reference closure | `current_location`, `entity_status`, `relationships_current`, and the epistemic-faceted fact lists populated; every non-PG story-local ID cited inside any record reachable from `state_snapshot` either has `created_at_page == null` (globally legal — author-pool storylets only) or `created_at_page == PG-0001`; every PG reference is allowed when that PG id is in the root `branch_path` (`[PG-0001]`) because the page record's own id is its branch anchor | Phase 7 |

---

**Whole-class loads from Pre-flight power gates 1, 2, and 9**: M-record full bodies for gate 1's `forbidden`-status check + `M_resolution_claims` interrogation; INV-record full bodies for gate 2's `break_conditions` audit. Without those whole-class loads, Phase 4 and Phase 9 cannot honor their canon-safety contract.
