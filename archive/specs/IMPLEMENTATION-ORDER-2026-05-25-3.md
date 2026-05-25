# Implementation Order

**Last updated:** 2026-05-25
**Status:** COMPLETED - archived 2026-05-25 as `archive/specs/IMPLEMENTATION-ORDER-2026-05-25-3.md`
**Source brainstorm:** [`reports/slt-chc-overhaul-third-iteration.md`](../reports/slt-chc-overhaul-third-iteration.md) triaged at [`docs/triage/2026-05-25-slt-chc-overhaul-third-iteration-triage.md`](../docs/triage/2026-05-25-slt-chc-overhaul-third-iteration-triage.md).
**Deferred-items reassessment** (post-completion): [`docs/triage/2026-05-25-implementation-order-deferred-items-reassessment.md`](../docs/triage/2026-05-25-implementation-order-deferred-items-reassessment.md) — re-verified every §Out-of-Scope lift-condition remains unmet; no new specs warranted.

This file sequences the live specs under `specs/`. Each row records the spec, the change shape, dependency, and gating risk. Once a spec ships, its row is archived alongside the spec file at `archive/specs/IMPLEMENTATION-ORDER-<date>.md`.

## Active sequence

No active specs remain in this iteration-3 sequence.

## Shipped in this sequence

| Spec | Ticket(s) | Result |
|---|---|---|
| [SPEC-83 — SLT Cooldown Window Correctness](../archive/specs/SPEC-83-slt-cooldown-window-correctness.md) | [SPEC83SLTCOOWIN-001](../archive/tickets/SPEC83SLTCOOWIN-001.md) | Completed 2026-05-25; fixed numeric cooldown windows, branch-isolated prior-selection lookup, and additive `filter_trace.cooldown_active_samples` diagnostics in `tools/world-mcp/`. |
| [SPEC-84 — Replay/Fork and Branch-Scope Golden Fixtures](../archive/specs/SPEC-84-replay-and-branch-scope-fixtures.md) | [SPEC84REPBRASCO-001](../archive/tickets/SPEC84REPBRASCO-001.md), [SPEC84REPBRASCO-002](../archive/tickets/SPEC84REPBRASCO-002.md) | Completed 2026-05-25; fixture + integration tests proving replay-time SLT visibility correctness across replay/fork and branch-scope dimensions; test-only, no source code change. |
| [SPEC-85 — Non-Player Driver Golden Fixtures](../archive/specs/SPEC-85-non-player-driver-golden-fixtures.md) | [SPEC85NONPLADRI-001](../archive/tickets/SPEC85NONPLADRI-001.md) through [SPEC85NONPLADRI-004](../archive/tickets/SPEC85NONPLADRI-004.md) | Completed 2026-05-25; four authored fixtures + four integration tests (clock_fire, offstage_action, secret_reveal, multi_actor_collision); test-only, no source code change. |

## Dependency rationale

- **SPEC-83, SPEC-84, and SPEC-85 are complete and archived.** The iteration-3 sequence shipped in the recorded order without dependency surprises.
- **SPEC-83 shipped first** because it was the only behavioral bug fix in the iteration. Its blast radius was contained to `select-storylet-candidates.ts`, the embedded context-packet trace type, and tests. SPEC-84 and SPEC-85 fixtures relied on correct cooldown semantics without working around the bug.
- **SPEC-84 sequenced before SPEC-85** because the replay/branch-scope fixture was smaller (one bundle, one test file) and exercised the same MCP retrieval surface SPEC-83 touched; landing it second confirmed SPEC-83's filter_trace shape was stable before the larger non-player-driver fixture suite consumed it. There was no hard dependency — SPEC-84 and SPEC-85 could have swapped order without breaking either.
- **SPEC-85 was the largest piece** of fixture authoring in this iteration (four bundles + four integration tests, each mirroring the Red Kiln Ambush pattern). It shipped last so the smaller specs were not blocked behind it.

## Out of scope for this implementation pass

The items below were considered during iteration-3 triage and **rejected, deferred, or folded into the accepted specs**. They are listed here so future operators (especially iteration 4, if it emerges) do not silently re-propose them. The full per-item rationale lives in [`docs/triage/2026-05-25-slt-chc-overhaul-third-iteration-triage.md`](../docs/triage/2026-05-25-slt-chc-overhaul-third-iteration-triage.md).

### Folded into SPEC-83

- **Report SPEC-87 — Candidate filter trace diagnostics** (cooldown-specific portion). The `filter_trace.cooldown_active_samples` extension landed as part of archived SPEC-83 §4.2. The broader §7a-prose-extension portion of report SPEC-87 is deferred (see below).

### Combined into SPEC-84

- **Report SPEC-85 — Branch-scoped / branch-prefix-scoped exclusion fixtures**. Combined with report SPEC-84 (replay/fork live global pool fixtures) into the single SPEC-84 here, because both prove replay-time SLT visibility correctness across scope dimensions. Splitting would over-fragment fixture authoring. See [SPEC-84 §1](../archive/specs/SPEC-84-replay-and-branch-scope-fixtures.md) for the combined design.

### Deferred (consumer-thin / lift-condition unmet)

- **Report SPEC-87 — Page-plan §7a candidate-filter summary prose + `candidate_filter_trace_shape` validator** (the non-cooldown portion). Deferred per triage §DEFER: no named deterministic consumer (the per-call `filter_trace` already exists on the MCP response; the proposed §7a addition would obligate page-plan authors without a structural reader). Re-evaluate when a real audit-trail or replay-debugging failure cannot be diagnosed from existing `filter_trace` + `SE.commitment` fields.
- **Report SPEC-88 — Choice promise / non-player response quality validators**. Deferred per triage §DEFER: language-pattern validators are heuristic and false-positive-prone; the report itself notes "This must not be hard schema law because language is contextual"; no empirical pain has surfaced. Re-evaluate when a real playtest produces an outcome-promise pattern the existing `choice_set_noncollapse` and `chc_slt_selected_commitment_trace` validators miss.
- **Report SPEC-89 — Authored large-pool fixture**. Deferred per triage §DEFER (YAGNI): SPEC-81's 1,000-SLT synthetic proof IS the scaling proof; ~25 SLTs at page 4 of the deleted pre-overhaul production bundle does not yet bind on the retrieval path. Re-evaluate when a real production bundle reaches 100+ SLTs and playtest surfaces a retrieval-correctness issue the synthetic proof did not catch.
- **Report §10 Player Agency Modes contract addition** (4th bullet in the STORY_KERNEL.md agency contract enumerating initiator / responder / witness / continuation_confirmer / constrained_write_in_author). Deferred per triage §DEFER: 4 of the 5 proposed modes already exist as the `player_response_mode` schema enum on `SE.turn_driver`; the contract amendment would obligate page-plan / prose-attach authors without a reader. The cited consumer is the deferred prose-attach hidden-mind-leak check. Re-evaluate when that check lifts (i.e., a real renderer emits non-player-driver prose).
- **SPEC-84 §9 Risks #1 — `matchesSourceRecordIds` over-rejection vs validator-layer `isBranchLocal`**. Deferred — at retrieval time, `tools/world-mcp/src/tools/select-storylet-candidates.ts`'s `matchesSourceRecordIds` uses the coarser `isStoryLocalRecordId` (rejects every story-bundle prefix uniformly when a global-pool SLT cites a story-bundle record from its `preconditions.hard`/`soft` refs), while the validator layer's `tools/validators/src/structural/branch-isolation.ts` uses the finer `isBranchLocal` (`tools/validators/src/structural/branch-locality-utils.ts:18`) which honors the `bundle_genesis_record` exception per FOUNDATIONS §Story Bundles §5 Rule 4 and the shared story state contract at `.claude/skills/_shared-templates/story-record-schemas.md:139-140` (genesis = `created_at_page == PG-1`, visible from every branch). The over-rejection is currently invisible — no fixture or production bundle authors a global SLT with a genesis-record predicate ref, and the static `branch-isolation` validator (failure code `global_storylet_references_branch_local`) catches any genuinely-bad case before retrieval is reached, so retrieval-time over-rejection is a belt-and-suspenders defense, not a primary gate. Fix path: relax `matchesSourceRecordIds` to use `isBranchLocal` instead, threading `BranchLocalityContext` (parent page's `branchId` + record maps + rootPageIds) into the retrieval check; SPEC-84's landed fixture continues to pass because STPLAN-99 has `created_at_page: PG-4` (BR-2 leaf, not genesis), so it's branch-local from BR-1 under either check. Re-evaluate when a real fixture or production bundle authors a global SLT with a genesis-record predicate ref AND the over-rejection becomes a visible bug (a globally-applicable storylet missing from retrieval results for branches that don't own the genesis record).

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

- Spec IDs continue from archived SPEC-85 (next available: SPEC-86).
- The shared story state contract at `.claude/skills/_shared-templates/story-state-contract.md` and the shared record schemas at `.claude/skills/_shared-templates/story-record-schemas.md` are the authoritative surfaces for story-record schemas per FOUNDATIONS §Story Bundles §5b. None of the three specs in this iteration amended either contract — all three were test/bugfix only.
- This sequence is the third iteration of SLT/CHC overhaul work. The first iteration's IMPLEMENTATION-ORDER (now at `archive/specs/IMPLEMENTATION-ORDER-2026-05-24.md`) shipped SPEC-76 / SPEC-77 / SPEC-78. The second iteration's IMPLEMENTATION-ORDER (now at `archive/specs/IMPLEMENTATION-ORDER-2026-05-25-2.md`) shipped SPEC-79 / SPEC-80 / SPEC-81 / SPEC-82. This iteration shipped SPEC-83 / SPEC-84 / SPEC-85 — a hardening pass around the landed architecture (one bug fix, five golden fixtures across three test specs).
- Post-completion reassessment of the §Out-of-Scope deferred and rejected items is recorded at [`docs/triage/2026-05-25-implementation-order-deferred-items-reassessment.md`](../docs/triage/2026-05-25-implementation-order-deferred-items-reassessment.md). Every lift-condition remained measurably unmet; no iteration-4 spec is queued at archive time.
- No `git commit` is performed by spec writers; the user reviews the diff and commits.
