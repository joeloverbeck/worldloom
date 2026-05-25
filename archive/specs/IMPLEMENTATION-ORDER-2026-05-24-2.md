# Implementation Order

**Last updated:** 2026-05-24
**Source brainstorm:** `archive/reports/slt-chc-overhaul-first-iteration.md` triaged at `docs/triage/2026-05-23-slt-chc-overhaul-first-iteration-triage.md`.

This file sequences the live specs under `specs/`. Each row records the spec, the change shape, dependency, and gating risk. Once a spec ships, its row is archived alongside the spec file at `archive/specs/IMPLEMENTATION-ORDER-<date>.md`.

All specs from this triage sequence are completed and archived as of 2026-05-24. The final snapshot is `archive/specs/IMPLEMENTATION-ORDER-2026-05-24.md`.

## Active sequence

| Order | Spec | Change shape | Depends on | Notes / gating risk |
|---|---|---|---|---|
| - | No active specs remain. | - | - | SPEC-76, SPEC-77, and SPEC-78 are archived. |

## Dependency rationale

- **SPEC-78 landed first (FOUNDATIONS is upstream).** [`SPEC-78`](../archive/specs/SPEC-78-foundations-amendment-driver-primitive-principle-extensions.md) is archived; SPEC-76's `Validation Rules Upheld` table cites the extended §5c ("Driver salience is local.") and the extended §6b (event-level driver declaration), so those citations are factual before SPEC-76 implementation begins.
- **SPEC-77 → SPEC-76 (satisfied).** SPEC-77's `compatible_turn_drivers[]` field references the closed enum `[player_action, player_write_in, npc_action, offstage_action, world_pressure, clock_fire, secret_reveal, multi_actor_collision]` introduced by archived [`SPEC-76`](../archive/specs/SPEC-76-turn-driver-primitive-and-pressure-driven-turn-cycle.md).

## Out of scope for this implementation pass

Both source-report items below were considered and **rejected or deferred** at triage. They are listed here so future operators do not silently re-propose them. The full per-item rationale lives in `docs/triage/2026-05-23-slt-chc-overhaul-first-iteration-triage.md`.

- **Full `CHC.binding` object replacing scalar `associated_commitment_block`** (source report §8.2). Rejected — `chc_slt_selected_commitment_trace` already validates the selected SLT's preconditions against parent-page active records, not a strict ID match. The "stale binding" problem the report frames is partly mitigated by the existing validator. Re-evaluate only if a future playtest surfaces concrete stale-binding pain that the active-pressure handling discipline (SPEC-76) does not absorb.
- **`SE.commitment.binding_resolution` + `instantiated_commitment` trace** (source report §8.1). Rejected — `alias_bindings` + SPEC-76's new `turn_driver.driver_records[]` covers the audit need.
- **`choice_set_quality_axes` validator** (source report §10.11). Rejected — the report's own §11.3 forbids hard-validating literary quality.
- **Candidate-commitment record (`SCOM` / `STCAND`)** (source report §6 Alternative D). Deferred per the report's own §17.1.
- **STCHAR Operational Axis Index closed-vocabulary taxonomy** (source report §9.4). Deferred — separate STCHAR-shape concern; not on the reactivity-fix critical path.
- **`branching-story-prose-attach` driver-fidelity receipt fields** (source report §9.6). Deferred — add only after the turn-driver field is real and a playtest confirms the prose-receipt surface needs it.
- **`SLT.reuse_mode` enum + 5 dropped `grounding.*` fields** (source report §8.3). Rejected as duplicative — derivable from existing `scope.visibility` × `provenance.origin` × `preconditions.hard[]` × `alias_bindings`. See SPEC-77 §4 Out of Scope for the per-field rejection grounds.
- **New FOUNDATIONS sub-section §5d "Driver Authority".** Rejected — would inflate FOUNDATIONS for what is fundamentally a clarification of two existing principles. SPEC-78 handles the narrower §5c / §6b extensions in place.

## Notes

- Spec IDs continue from SPEC-75 (archived 2026-05-23 — branch-aware STCHAR supersession).
- The shared story state contract at `.claude/skills/_shared-templates/story-state-contract.md` is the authoritative surface for story-record schemas per FOUNDATIONS §Story Bundles §5b; both specs amend it.
- No `git commit` is performed by spec writers; the user reviews the diff and commits.
