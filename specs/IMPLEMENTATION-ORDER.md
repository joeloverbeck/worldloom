# Implementation Order

**Last updated:** 2026-05-25
**Status:** active
**Source brainstorm:** [`reports/slt-chc-overhaul-third-iteration.md`](../reports/slt-chc-overhaul-third-iteration.md) triaged at [`docs/triage/2026-05-25-slt-chc-overhaul-third-iteration-triage.md`](../docs/triage/2026-05-25-slt-chc-overhaul-third-iteration-triage.md).

This file sequences the live specs under `specs/`. Each row records the spec, the change shape, dependency, and gating risk. Once a spec ships, its row is archived alongside the spec file at `archive/specs/IMPLEMENTATION-ORDER-<date>.md`.

## Active sequence

| Order | Spec | Shape | Depends on | Gating risk |
|---|---|---|---|---|
| 1 | [SPEC-83 — SLT Cooldown Window Correctness](SPEC-83-slt-cooldown-window-correctness.md) | bug fix + diagnostic extension in `tools/world-mcp/` | none | small blast radius; isolated to one MCP tool + its tests. |
| 2 | [SPEC-84 — Replay/Fork and Branch-Scope Golden Fixtures](SPEC-84-replay-and-branch-scope-fixtures.md) | new fixture + integration tests; test-only | none structurally; benefits from SPEC-83 landing first so the cooldown bug doesn't perturb the fixture's filter_trace assertions | moderate fixture-authoring effort; no source code change. |
| 3 | [SPEC-85 — Non-Player Driver Golden Fixtures](SPEC-85-non-player-driver-golden-fixtures.md) | four new fixtures + four integration tests; test-only | none structurally | largest fixture-authoring effort (four bundles + four test files); no source code change. |

## Dependency rationale

- **SPEC-83 ships first** because it is the only behavioral bug fix in the iteration. Its blast radius is contained to `select-storylet-candidates.ts` and its tests. Landing it before the new fixtures means SPEC-84 and SPEC-85 fixtures can rely on correct cooldown semantics without working around the bug.
- **SPEC-84 sequences before SPEC-85** because the replay/branch-scope fixture is smaller (one bundle, one test file) and exercises the same MCP retrieval surface SPEC-83 touches; landing it second confirms SPEC-83's filter_trace shape is stable before the larger non-player-driver fixture suite consumes it. There is no hard dependency — SPEC-84 and SPEC-85 could swap order without breaking either.
- **SPEC-85 is the largest piece** of fixture authoring in this iteration (four bundles + four integration tests, each mirroring the Red Kiln Ambush pattern). It ships last so the smaller specs are not blocked behind it.

## Out of scope for this implementation pass

The items below were considered during iteration-3 triage and **rejected, deferred, or folded into the accepted specs**. They are listed here so future operators (especially iteration 4, if it emerges) do not silently re-propose them. The full per-item rationale lives in [`docs/triage/2026-05-25-slt-chc-overhaul-third-iteration-triage.md`](../docs/triage/2026-05-25-slt-chc-overhaul-third-iteration-triage.md).

### Folded into SPEC-83

- **Report SPEC-87 — Candidate filter trace diagnostics** (cooldown-specific portion). The `filter_trace.cooldown_active_samples` extension lands as part of SPEC-83 §4.2. The broader §7a-prose-extension portion of report SPEC-87 is deferred (see below).

### Combined into SPEC-84

- **Report SPEC-85 — Branch-scoped / branch-prefix-scoped exclusion fixtures**. Combined with report SPEC-84 (replay/fork live global pool fixtures) into the single SPEC-84 here, because both prove replay-time SLT visibility correctness across scope dimensions. Splitting would over-fragment fixture authoring. See [SPEC-84 §1](SPEC-84-replay-and-branch-scope-fixtures.md) for the combined design.

### Deferred (consumer-thin / lift-condition unmet)

- **Report SPEC-87 — Page-plan §7a candidate-filter summary prose + `candidate_filter_trace_shape` validator** (the non-cooldown portion). Deferred per triage §DEFER: no named deterministic consumer (the per-call `filter_trace` already exists on the MCP response; the proposed §7a addition would obligate page-plan authors without a structural reader). Re-evaluate when a real audit-trail or replay-debugging failure cannot be diagnosed from existing `filter_trace` + `SE.commitment` fields.
- **Report SPEC-88 — Choice promise / non-player response quality validators**. Deferred per triage §DEFER: language-pattern validators are heuristic and false-positive-prone; the report itself notes "This must not be hard schema law because language is contextual"; no empirical pain has surfaced. Re-evaluate when a real playtest produces an outcome-promise pattern the existing `choice_set_noncollapse` and `chc_slt_selected_commitment_trace` validators miss.
- **Report SPEC-89 — Authored large-pool fixture**. Deferred per triage §DEFER (YAGNI): SPEC-81's 1,000-SLT synthetic proof IS the scaling proof; ~25 SLTs at page 4 of the deleted pre-overhaul production bundle does not yet bind on the retrieval path. Re-evaluate when a real production bundle reaches 100+ SLTs and playtest surfaces a retrieval-correctness issue the synthetic proof did not catch.
- **Report §10 Player Agency Modes contract addition** (4th bullet in the STORY_KERNEL.md agency contract enumerating initiator / responder / witness / continuation_confirmer / constrained_write_in_author). Deferred per triage §DEFER: 4 of the 5 proposed modes already exist as the `player_response_mode` schema enum on `SE.turn_driver`; the contract amendment would obligate page-plan / prose-attach authors without a reader. The cited consumer is the deferred prose-attach hidden-mind-leak check. Re-evaluate when that check lifts (i.e., a real renderer emits non-player-driver prose).

### Rejected (re-tread)

- **Report §10 `branching-story-prose-attach` non-player-driver hidden-mind-leak validator**. Rejected per triage §REJECT — direct re-tread of iteration-2 IMPLEMENTATION-ORDER §Out-of-Scope deferral on "Non-player driver semantics expansion / prose-attach hidden-mind-leak check (iteration-2 SPEC-84)." No renderer change since iteration-2; no real rendered prose for non-player driver pages exists in the repo; lift-condition unmet. The page-commit-time `turn_driver_pov_observer_firewall` validator absorbs the structural risk for now.

### Persistent rejections inherited from iteration-2 (re-iterated for visibility)

These items from iteration 2 remain out of scope and were NOT re-proposed by the iteration-3 report (which is itself a positive sign — the iteration-2 IMPLEMENTATION-ORDER §Out-of-Scope discipline held). Re-listed here so iteration 4 has them in one place:

- **Hybrid `CHC.binding` object** — rejected and superseded by archived SPEC-79's field removal. Closed.
- **`CHC.late_bound: bool` flag** — subsumed by SPEC-79's hard removal (absence IS the late-bound default). Closed permanently.
- **Rich SLT grounding fields** (`causal_pressure_classes`, `required_active_record_classes`, `role_lanes`, `actor_binding_policy`, `source_records`) — rejected per archived SPEC-77 §4 + `additionalProperties: false` on the grounding subobject. Closed.
- **`SSEL` persistent selection-trace record class** — rejected per archived SPEC-51 §FOUNDATIONS Alignment §5b "Zero new record classes, fields, MCP packets." Closed.
- **Replay/fork as a separate structural spec** — subsumed by archived SPEC-79 (live-global-pool semantics is automatic post-removal). The test-only fixture spec (SPEC-84 in this iteration) is a different ask and is in scope.
- **8-axis storylet generation matrix** — narrowed by archived SPEC-80 to the 2-axis driver-kind × pressure-source-class coverage. The remaining 6 axes stay out of scope.
- **Pool-level pressure-distribution scoring / drama-manager pattern** — rejected per FOUNDATIONS §Story Bundles §5c.
- **Embeddings as legality filters** — rejected per FOUNDATIONS §5c. Embeddings, if ever added, sit above the symbolic shortlist as a diversification pass.
- **Server-side full predicate evaluation** — out of scope; revisit only when profiling shows the turn-cycle Phase-2 evaluator is the bottleneck.
- **Per-CHC `player_response_mode` schema field** — canonical on `SE.turn_driver` per archived SPEC-76; per-CHC variant is a schema-change spec contingent on a real consumer.

## Notes

- Spec IDs continue from archived SPEC-82.
- The shared story state contract at `.claude/skills/_shared-templates/story-state-contract.md` and the shared record schemas at `.claude/skills/_shared-templates/story-record-schemas.md` are the authoritative surfaces for story-record schemas per FOUNDATIONS §Story Bundles §5b. None of the three active specs in this iteration amend either contract — all three are test/bugfix only.
- This sequence is the third iteration of SLT/CHC overhaul work. The first iteration's IMPLEMENTATION-ORDER (now at `archive/specs/IMPLEMENTATION-ORDER-2026-05-24.md`) shipped SPEC-76 / SPEC-77 / SPEC-78. The second iteration's IMPLEMENTATION-ORDER (now at `archive/specs/IMPLEMENTATION-ORDER-2026-05-25-2.md`) shipped SPEC-79 / SPEC-80 / SPEC-81 / SPEC-82. This iteration adds SPEC-83 / SPEC-84 / SPEC-85 — a hardening pass around the landed architecture (one bug fix, five golden fixtures across three test specs).
- No `git commit` is performed by spec writers; the user reviews the diff and commits.
