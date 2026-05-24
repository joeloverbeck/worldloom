# Implementation Order

**Last updated:** 2026-05-24
**Source brainstorm:** `reports/slt-chc-overhaul-second-iteration.md` triaged at `docs/triage/2026-05-24-slt-chc-overhaul-second-iteration-triage.md`.

This file sequences the live specs under `specs/`. Each row records the spec, the change shape, dependency, and gating risk. Once a spec ships, its row is archived alongside the spec file at `archive/specs/IMPLEMENTATION-ORDER-<date>.md`.

**Completed sequence rows:** SPEC-82 shipped on 2026-05-24 and is archived at `archive/specs/SPEC-82-remaining-schema-drift-repairs.md`; its completed row is archived at `archive/specs/IMPLEMENTATION-ORDER-2026-05-24-3.md`.

## Active sequence

| Order | Spec | Change shape | Depends on | Notes / gating risk |
|---|---|---|---|---|
| 1 | [`SPEC-79`](SPEC-79-chc-associated-commitment-block-removal.md) | Remove `CHC.associated_commitment_block` field; switch validator to `PG.input.choice_id` resolution; update bootstrap, turn-cycle, Red Kiln fixture | — | Atomic landing: schema + validator + bootstrap + turn-cycle + fixtures + contract must ship together. No production stories exist (per the iteration-2 user redirection); zero migration burden outside in-repo fixtures. Operationalizes branch-safe live-global-pool semantics as the unconditional default. |
| 2 | [`SPEC-81`](SPEC-81-indexed-storylet-candidate-retrieval.md) | New MCP tool `select_storylet_candidates`; SLT projection columns + edges in world-index; turn-cycle Phase 2.1 + commitment-block-authoring Phase 1 + story_bundle_context wiring | — | Infrastructure spec. The largest of the four (estimated 3,000-5,000 LOC). Independent of SPEC-79 in mechanics; can ship in parallel if implementor capacity allows, but sequenced after SPEC-79 to avoid landing two large schema/contract changes in the same window. Unblocks SPEC-80 once Phase 2 (the MCP tool itself) lands. |
| 3 | [`SPEC-80`](SPEC-80-storylet-pool-driver-kind-pressure-source-coverage.md) | Authoring-time driver-kind × pressure-source-class coverage diagnostic in bootstrap Phase 6 + commitment-block-authoring Phase 1 + optional health-audit Phase 2o | SPEC-81 (soft) | Closes the iteration-1 reactivity loop at the pool-coverage layer (the upstream cause that SPEC-76's active-pressure handling discipline could only mitigate downstream). Can implement against existing `list_records(include_full_body=true)` path before SPEC-81 Phase 2 lands; swap to projection API once available without changing diagnostic code. |

## Dependency rationale

- **SPEC-79 → SPEC-81 → SPEC-80** is the remaining recommended order after SPEC-82 shipped. SPEC-79 is the user-named operational priority (the CHC-binding-temptation concern); it is independent of SPEC-81/SPEC-80 and should land before they pile schema/contract surface area on top. SPEC-81 is infrastructure that SPEC-80 leverages; SPEC-81 can ship without SPEC-80 (the new MCP tool benefits turn-cycle Phase 2 immediately), but SPEC-80 benefits from SPEC-81's projection API even though it can ship against the fallback path.
- **SPEC-79 and SPEC-81 are mechanically independent**. If implementor capacity supports parallel work, they can land in parallel; the sequencing above is risk-staging discipline, not a hard dependency.
- **SPEC-80 has a soft dependency on SPEC-81**. SPEC-80's coverage diagnostic operates against SLT projection records; without SPEC-81, the diagnostic reads via `list_records(include_full_body=true)` (the existing path). SPEC-80 documents this dual-path discipline in its §9 Implementation Notes.

## Out of scope for this implementation pass

The items below were considered during iteration-2 triage and **rejected or deferred**. They are listed here so future operators (especially iteration 3, if it emerges) do not silently re-propose them. The full per-item rationale lives in `docs/triage/2026-05-24-slt-chc-overhaul-second-iteration-triage.md`.

- **Hybrid `CHC.binding` object** (iteration-2 SPEC-79 original framing — 4-mode enum + `intent_signature` + `replay_policy` + `promise_limits`). Rejected. The simpler repair (removal) is in active SPEC-79. Adding new structural binding surface would reintroduce the temptation the removal eliminates.
- **`CHC.late_bound: bool` flag** (iteration-1 R1 alternative path). Subsumed by SPEC-79's hard removal — the field's absence IS the late-bound default. Closed permanently.
- **Rich SLT grounding fields** (`causal_pressure_classes`, `required_active_record_classes`, `role_lanes`, `actor_binding_policy`, `source_records` — iteration-2 SPEC-80 original framing). Rejected — direct re-tread of iteration-1 R4-R7 plus SPEC-77 §4 explicit cut. `additionalProperties: false` on the grounding subobject structurally forbids these. SPEC-77's banned-phrase + 2-field minimum is the load-bearing surface.
- **`SSEL` persistent selection-trace record class** (iteration-2 SPEC-81 original framing). Rejected — re-tread of iteration-1 D5 plus conflict with SPEC-51 §FOUNDATIONS Alignment §5b ("Zero new record classes, fields, MCP packets"). Trace lives in `SE.commitment.alias_bindings` + `SE.state_delta` + `SLT.effects.bound:<alias>` + `CHC.grounded_in`. The filter trace that SPEC-81's `select_storylet_candidates` emits is a per-call diagnostic, not a persistent record.
- **Replay/fork live global pool as separate spec** (iteration-2 SPEC-83). Subsumed by SPEC-79 — the live global pool semantics is automatic once `CHC.associated_commitment_block` is removed.
- **Non-player driver semantics expansion / prose-attach hidden-mind-leak check** (iteration-2 SPEC-84). Deferred — re-tread of iteration-1 D4. The page-commit-time `turn_driver_pov_observer_firewall` validator absorbs the structural risk; the prose-attach pass is the remaining theoretical gap, deferred until a real renderer emits non-player-driver prose. The other components of SPEC-84 (NPC / offstage / clock / secret / multi-actor fixtures) are already covered by SPEC-76's per-kind `contains` constraints and the Red Kiln Ambush fixture verifies `npc_action`.
- **8-axis storylet generation matrix** (iteration-2 SPEC-85 original framing). Narrowed to the 2-axis driver-kind × pressure-source-class coverage in active SPEC-80. The other 6 axes (move family, response/action family, actor role lane, onstage/offstage, mystery/canon authority, aftermath/recovery/de-escalation) are either already covered by existing diagnostics, already a per-SLT schema field without consumer demand for pool-level coverage, or speculative without consumer.
- **Pool-level pressure-distribution scoring / drama-manager pattern**. Rejected per SPEC-50 D.2 and FOUNDATIONS §Story Bundles §5c. SPEC-80's coverage diagnostic decides presence/absence only, never relative weighting; this is the load-bearing distinction.
- **Embeddings as legality filters**. Rejected per FOUNDATIONS §5c. SPEC-81's filtering is fully symbolic; embeddings, if ever added, sit above the symbolic shortlist as a diversification pass.
- **Server-side predicate evaluation** (moving the turn-cycle Phase 2 evaluator into the MCP tool). Out of scope for SPEC-81. The MCP tool runs a cheap structural opcode/class check; full predicate evaluation with alias substitution stays in the turn-cycle evaluator. Moving evaluation server-side is a separate spec contingent on profiling evidence.
- **Per-CHC `player_response_mode` schema field**. Out of scope for SPEC-79 §6.1's fixture repair. `player_response_mode` is canonical on `SE.turn_driver` per SPEC-76, not on CHC. If a future consumer surfaces that needs per-CHC response-mode authority, it would be a schema-change spec.

## Notes

- Spec IDs continue from SPEC-78 (archived 2026-05-24 — FOUNDATIONS amendment for driver-primitive principle extensions).
- The shared story state contract at `.claude/skills/_shared-templates/story-state-contract.md` and the shared record schemas at `.claude/skills/_shared-templates/story-record-schemas.md` are the authoritative surfaces for story-record schemas per FOUNDATIONS §Story Bundles §5b; SPEC-79 amends both.
- This sequence is the second iteration of SLT/CHC overhaul work. The first iteration's IMPLEMENTATION-ORDER (now at `archive/specs/IMPLEMENTATION-ORDER-2026-05-24.md`) shipped SPEC-76, SPEC-77, and SPEC-78 — the driver primitive, the minimal SLT grounding, and the FOUNDATIONS amendment that backs both. Iteration 2 builds on that foundation: SPEC-79 simplifies CHC, SPEC-80 closes the pool-coverage upstream of the reactivity loop, SPEC-81 scales retrieval, and SPEC-82 cleans up two drift artifacts surfaced by the iteration-2 verification pass.
- No `git commit` is performed by spec writers; the user reviews the diff and commits.
