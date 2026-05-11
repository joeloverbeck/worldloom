# Phase 7.6: ARC_TRACE Layer 1 Validation (Layer 2 / Layer 3 deferred to finalize)

Phase 7.6 runs after Phase 7's plan-completeness check and before Phase 8 decides whether a choice surface is needed. Phase 7.6 at plan-commit runs ONLY **Layer 1 (deterministic structural validation)** over the plan's frontmatter (`declared_intended_beats[]`, `declared_stop_condition`, `forbidden_resolutions[]`, `chosen_variant_id`, `required_effects[]`) and the inlined selected-arc record. **Layer 2 (post-render trace extraction)** and **Layer 3 (semantic conformance critic)** require rendered prose to extract evidence_spans from — they are DEFERRED to `branching-story-page-prose-finalize` Phase 4.

ARC_TRACE is a derived debugging and validation artifact. It is not replay-authoritative. Replay equality is governed by the selected arc's `effect_model.variants[]` and the chosen variant id stored on `PG.state_snapshot.applied_effect_variant`. Page-cycle does not emit ARC_TRACE; finalize is the only emitter.

## Inputs (plan-commit time)

- The Phase 7 plan buffer: the populated copy of `.claude/skills/_shared-templates/page-plan.md` (frontmatter + body) not yet written to disk.
- The selected arc record (`SLT-NNNN`) including `arc.beat_plan`, `arc.execution_envelope`, `arc.stop_policy`, and `arc.effect_model.variants[]`.
- The chosen variant id selected in Phase 4b plus its `required_effects[]`.
- The current page id being assembled (`PG-NNNN`) and branch path.
- Whole-class Mystery Reserve and Invariant loads from Pre-flight.
- Execution mode: `authoring`, `interactive_runtime`, or `batch_generation`.

## Layer 1 — Deterministic Structural Validation (RUNS at plan-commit)

Layer 1 is engine-only. It does not call an LLM. It validates the plan's structural commitments against the selected arc envelope BEFORE any prose render. The checks operate over the plan's frontmatter and inlined records rather than over rendered prose.

| Check | Requirement | Fail Route |
|---|---|---|
| Beat-count fidelity | The plan's `frontmatter.declared_intended_beats[]` array length is within `[arc.beat_plan.min_beats, arc.beat_plan.max_beats]`. Each entry's `beat_function` matches an entry in `arc.beat_plan.beat_functions`. | Re-prompt Phase 7 with the cited mismatch; counts against the Phase 7 re-prompt budget. |
| Forbidden Mystery preservation | Every M id in `arc.execution_envelope.mystery_preservation.forbidden_resolutions[]` AND every `forbidden`-status M-NNNN in `mysteries_in_play[]` is present in `frontmatter.forbidden_resolutions[]`. | HARD-FAIL. Re-prompt Phase 7 with the missing M ids inlined; budget exhaustion escalates to the user. |
| Branch-scope legality | Every inlined record id (SF, OBL, CNSQ, THR, SREL, STINT, SLT, STLOC, STOBJ, BR) in the plan body either has `created_at_page == null` (globally legal — author-pool storylets only) OR `created_at_page ∈ this_page.branch_path`. Sibling-branch references are rejected. | Route to Phase 5; the illegal reference indicates state-mutation drift. |
| Effect-variant legality | `frontmatter.chosen_variant_id` names an existing entry in `arc.effect_model.variants[]`; `frontmatter.required_effects[]` matches that variant's `required_effects[]` verbatim. | Route to Phase 4b; the chosen variant is invalid or required_effects[] was copied wrong. |
| Stop-condition declaration | `frontmatter.declared_stop_condition.exit_class` is one of `normal`, `terminal`, `interrupt`; `exit_signal` is a non-empty one-sentence string; the declared exit is consistent with `arc.stop_policy.normal_exits[]` / `interrupt_before[]` / terminal-branch semantics. | Re-prompt Phase 7 with the cited mismatch. |

Markdown-header absence is **N/A at plan-commit** — the plan has structured sections by template (§1, §2, ...) and no beat headers leak into a non-existent prose render. The check moves to finalize Phase 2 / Phase 3, where it runs against the user-supplied rendered prose.

Layer 1 shares the Phase 7 re-prompt budget. Persistent failure after three re-prompts escalates to the user with the failed checks and evidence inlined.

## Layer 2 — Post-Render Trace Extraction (DEFERRED)

Layer 2 requires rendered prose to extract evidence_spans from. It does not run at plan-commit.

**Cross-reference**: `branching-story-page-prose-finalize/references/phase-4-arc-trace-extraction.md` is the new home of Layer 2. Finalize Phase 4 runs the LLM critic call over the user-supplied `pages-prose/PG-NNNN.md`, receives the rendered prose plus the plan's selected arc + chosen variant context, and returns one ARC_TRACE record body with byte-offset `evidence_span`s.

At plan-commit time, the PG record's `state_snapshot.arc_trace_emitted: false`, `state_snapshot.arc_trace_id: null`. Finalize Phase 4 flips these via `update_record_field` ops in finalize's Phase 7 envelope.

## Layer 3 — Semantic Conformance Critic (DEFERRED)

Layer 3 consumes the Layer 2 record plus the selected arc record and returns one `semantic_critic_verdict.status` verdict. Because Layer 2 requires rendered prose, Layer 3 also DEFERS to finalize.

**Cross-reference**: `branching-story-page-prose-finalize/references/phase-4-arc-trace-extraction.md` §Layer 3. Finalize handles the `pass | revise_prose | reject_arc | promote_interrupt` routing end-to-end. `reject_arc` at finalize re-runs `branching-story-page-cycle` with a different storylet excluded from re-pick; `revise_prose` halts finalize and asks the user to revise prose externally.

## Per-Execution-Mode Budget (plan-commit)

Layer 1 runs in every execution mode at plan-commit — it is engine-only and cost-free. The per-execution-mode budget table for Layer 2 / Layer 3 lives in `branching-story-page-prose-finalize/references/phase-4-arc-trace-extraction.md` §Per-Execution-Mode Budget.

## ARC_TRACE Persistence

Page-cycle does NOT emit ARC_TRACE. The `create_arc_trace_record` patch-engine op is NOT in the Phase 11 envelope. ARCTRACE-NNNN is NOT pre-allocated at page-cycle pre-flight.

When finalize runs successfully, finalize Phase 7 emits the `create_arc_trace_record` op (when `PG.storylet_realized != null`) and updates the PG record's `state_snapshot.arc_trace_emitted: true`, `state_snapshot.arc_trace_id: ARCTRACE-NNNN`.

## Phase 9 Gates Affected (at plan-commit)

- `arc_envelope_conformance` — Layer-1-only at plan-commit; the deterministic check that the plan's frontmatter and inlined arc record are internally consistent.
- `arc_trace_evidence_alignment` — **DEFERRED at plan-commit**. Recorded as `"DEFERRED — awaiting prose render"` on `PG.deferred_validation_trace.arc_trace_evidence_alignment`. Finalize Phase 5 flips to PASS/FAIL.
- `effect_model_replay_safety` — runs at plan-commit over `chosen_variant_id` and `required_effects[]`.
- `narrative_point_classification` — runs at plan-commit; `PG.state_snapshot.narrative_point_classification` is set by Phase 8 and validated against the plan's `declared_stop_condition.exit_class`.

See `references/phase-9-validation-gates.md` for the full gate table.

## Phase 8 Handoff

Phase 8 receives the validated plan and the Phase 7.5 Visible Affordance Map. The narrative-point classification comes from the plan's `declared_stop_condition.exit_class`:

- `NATURAL_COMMITMENT_HINGE` when `exit_class: normal` and the declared exit signals a normal arc close.
- `INTERRUPT_HINGE` when `exit_class: interrupt`.
- `CONTINUE_ONLY_PAUSE` when the arc's stop_policy permits a continue-only pause and the declared exit signals one.
- `TERMINAL_OR_CHAPTER_CLOSE` when `exit_class: terminal`.

Phase 8 may revise the classification on its own evidence (cast-state changes, OBL closures, terminal-branch logic); the plan's declaration is an initial commitment, not a hard contract until the prose renders.

---

## Cross-references

- Phase 7 plan authoring (where the structural commitments are declared): `references/phase-7-page-plan.md`
- Phase 9 gate table (DEFERRED rows, `plan_completeness_check`, `arc_trace_evidence_alignment` deferral): `references/phase-9-validation-gates.md`
- Convergence point — Layer 2 / Layer 3 extraction + ARCTRACE emission: `.claude/skills/branching-story-page-prose-finalize/references/phase-4-arc-trace-extraction.md`
- ARC_TRACE record schema: `references/record-schemas.md` §ARC_TRACE Record
