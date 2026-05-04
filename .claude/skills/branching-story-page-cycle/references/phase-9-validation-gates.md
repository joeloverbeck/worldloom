# Phase 9: Validation Gates (Canon Safety Check phase)

Defense-in-depth checks before Phase 11 write. Each gate must record PASS with a one-line rationale on the new page's `validation_trace` field. A bare "PASS" without rationale is treated as FAIL per the FOUNDATIONS skill discipline. Any FAIL halts Phase 11 and routes to the responsible phase.

| # | Gate | Check | Routes to on FAIL |
|---|---|---|---|
| 1 | Mystery firewall (Rule 7) | No `forbidden`-status M-NNNN resolved by any applied op or rendered prose; `M_resolution_claims` properly routed per Phase 4.5 (apparent / branch_local_counterfactual / canon_candidate handoff) | Phase 4 |
| 2 | Invariant compatibility | All `applied_event_ops` respect every world INV's `break_conditions` (cross-checked against the whole-class INV load from Pre-flight) | Phase 1/2 |
| 3 | Recursive reference closure (branch-isolation invariant) | For every story-local record reachable from `this_page.state_snapshot` (one or more levels deep), recursively inspect every story-local ID reference inside that record (e.g., OBL.dependent_facts cites SFs; OBL.coverage_cache.compatible_storylets cites SLTs; SE.input_records / output_records; CNSQ.subjects; SREL.party_a / party_b; STINT.beliefs / secrets; etc.). Every referenced SF / SE / OBL / CNSQ / THR / SREL / STINT / STLOC / STOBJ / DA / SLT / CHC / BR must either have `created_at_page == null` (globally legal — author-pool storylets only) OR `created_at_page ∈ this_page.branch_path`. ANY sibling-branch reference at ANY depth halts the transaction. | Phase 5 |
| 4 | Snapshot-replay equality | `parent.state_snapshot + applied_event_ops == this_page.state_snapshot`; `state_hash_after` of last op == `this_page.state_hash` (catches drift bugs) | Phase 5 |
| 5 | ID uniqueness | Allocated IDs do not collide with any existing record in this story; Pre-flight uses `mcp__worldloom__allocate_next_id(world_slug, id_class, story_slug=...)` for story-scoped IDs and Phase 5 rechecks no target paths already exist before write. | Pre-flight + Phase 5 |
| 6 | Content policy presence | content_policy preamble was present verbatim in every LLM prompt assembled this run (parser, proposer, renderer, prose render, JIT generator) | Pre-flight |
| 7 | Prose ledger consistency | Phase 7 cross-checks all passed; post-render extraction emitted any `needs-ledger-record` entries; no `mystery-risk` classification survived | Phase 7 |
| 8 | Choice contract integrity | Every emitted CHC has a populated `choice_contract` block (user_intent, guaranteed_action, success_policy, allowed_outcome_band, forbidden_outcomes, minimum_state_change) | Phase 8 |
| 9 | Choice consequence-capacity | Every emitted CHC has at least one continuation path (storylet-or-JIT) | Phase 8 |
| 10 | State_snapshot integrity | All cited records exist on disk; no dangling references; epistemic-faceted lists populated; entity_status, current_location, relationships_current, intentions_current populated | Phase 5 |
| 11 | Epistemic class declared (Rule 1) | Every newly-created SF declares `epistemic_class` | Phase 5 |
| 12 | Consequence persistence | Every Phase 2 `required_aftermath` item produced either a CNSQ record or a newly-opened OBL record this turn (none silently dropped) | Phase 2 |

Some failures are auto-correctable (re-render prose, re-generate choices); some require user intervention (firewall breach, INV violation, recursive reference closure breach). The FAIL routing column names the responsible phase; auto-correction loops back to that phase with the failure context inlined.

**Whole-class loads from Pre-flight power gates 1, 2, and 3**: M-record full bodies for gate 1's `forbidden`-status check + `M_resolution_claims` interrogation; INV-record full bodies for gate 2's `break_conditions` audit; the cross-record reachability set anchored at `state_snapshot` for gate 3's recursive closure scan.
