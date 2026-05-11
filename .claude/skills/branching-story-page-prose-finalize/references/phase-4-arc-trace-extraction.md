# Phase 4: ARC_TRACE Extraction

Phase 4 absorbs the Layer 2 (post-render trace extraction) and Layer 3 (semantic conformance critic) logic that, pre-PROSESPLIT-007, lived in `branching-story-page-cycle/references/phase-7-6-arc-trace-extraction.md`. After the rework, page-cycle no longer emits ARC_TRACE — finalize is the only emitter, because evidence_spans require rendered prose to extract from, and that prose only exists at finalize time.

Layer 1 (deterministic structural validation) is not run here — the plan's frontmatter and the selected arc's `arc.beat_plan` / `arc.execution_envelope` / `arc.stop_policy` were validated at plan-commit time (page-cycle Phase 7's plan-emit step). What remains for finalize is the prose-coupled extraction (Layer 2) and the semantic-quality critic (Layer 3).

## When Phase 4 Runs vs Skips

| Condition | Action |
|---|---|
| `PG.storylet_realized != null` (any non-root page on any branch) | Run Phase 4 — Layer 2 always, Layer 3 per per-execution-mode budget. |
| `PG.storylet_realized == null` (bootstrap PG-0001 root case ONLY) | Skip Phase 4. No ARCTRACE record allocated, no ARCTRACE op enters the Phase 7 envelope, and `state_snapshot.arc_trace_emitted` remains `false`, `state_snapshot.arc_trace_id` remains `null`. |

Pre-flight's ARCTRACE allocation already followed this rule — Phase 4 does not allocate; it consumes the pre-allocated id when running, or no-ops when skipping.

## Inputs

- Rendered prose body.
- Selected arc record (the `SLT-NNNN` named in `PG.storylet_realized`, loaded at pre-flight). Includes `arc.beat_plan`, `arc.execution_envelope`, `arc.stop_policy`, `arc.effect_model.variants[]`.
- Chosen variant id (from `PG.state_snapshot.applied_effect_variant`) and its `required_effects[]`.
- The page being finalized (`PG-NNNN`) and its `branch_path`.
- Whole-class Mystery Reserve and Invariant loads from pre-flight.
- Execution mode.

## Layer 2: Post-Render Trace Extraction

Layer 2 is an LLM critic call. The prompt receives the rendered prose plus the selected arc's `beat_plan`, `execution_envelope`, `stop_policy`, and the chosen variant's `required_effects[]`. It returns one ARC_TRACE record body.

### Required ARC_TRACE Shape

```yaml
id: ARCTRACE-NNNN
story_id: STORY-NNNN
created_at_page: PG-NNNN
arc_realized: SLT-NNNN
effect_variant_applied: <variant id>

realized_beats:
  - beat_id: B1
    function: <beat_function string>
    evidence_span: { start: <char offset>, end: <char offset> }
    realized: true | partially | not

observed_actions:
  - actor: STENT-NNNN
    action: <canonical verb>
    target: STENT-NNNN | STOBJ-NNNN | STLOC-NNNN | abstract | null
    evidence_span: { start: <char offset>, end: <char offset> }

observed_claims:
  - claim: >
    source: narrator | character | inference
    canon_status: story_local | apparent | forbidden_risk
    evidence_span: { start: <char offset>, end: <char offset> }

possible_violations:
  - envelope_item: invariant_directive | required_function | prohibited_action
    severity: low | medium | high
    evidence_span: { start: <char offset>, end: <char offset> }

stop_condition_hit:
  id: <kebab-case stop id from arc.stop_policy>
  category: normal_exit | interrupt_before | safety_valve
  evidence_span: { start: <char offset>, end: <char offset> }

effect_evidence:
  - effect_ref: <variants[].required_effects[N]>
    realized: true | partially | not
    evidence_span: { start: <char offset>, end: <char offset> }

semantic_critic_verdict:
  status: pass | revise_prose | reject_arc | promote_interrupt
  reasons: []
  required_revision_constraints: []

notes: >
```

(The shape is identical to the post-PROSESPLIT-007 ARCTRACE schema; finalize is the new home of the same record class.)

### Layer 2 Structural Validation

After Layer 2 returns the record body, validate that:

| Check | Failure mode |
|---|---|
| `realized_beats[]` count is within `[arc.beat_plan.min_beats, arc.beat_plan.max_beats]` | HARD-FAIL Phase 4. |
| All `evidence_span.{start, end}` offsets are within `[0, len(prose))` | HARD-FAIL Phase 4. |
| Every `effect_evidence[].effect_ref` matches an entry in the chosen variant's `required_effects[]` | HARD-FAIL Phase 4. |
| `stop_condition_hit.id` matches an entry in `arc.stop_policy.normal_exits[]` or `arc.stop_policy.interrupt_before[]` or `arc.stop_policy.safety_valves` | HARD-FAIL Phase 4. |
| `possible_violations[].envelope_item` references a real entry in `arc.execution_envelope.{invariants, required_functions, prohibited_actions}` | HARD-FAIL Phase 4. |

A structural HARD-FAIL surfaces with cited evidence-span offsets and out-of-range items; the user investigates whether the prose itself misses the arc envelope or the critic's parsing was confused. No re-prompt loop — the user revises the prose externally (or the plan, if the plan's arc envelope is judged too strict) and re-runs.

## Layer 3: Semantic Conformance Critic

Layer 3 is an LLM critic call over the Layer 2 record plus the selected arc record. It returns one verdict for `semantic_critic_verdict.status`:

| Verdict | Meaning | Route |
|---|---|---|
| `pass` | The prose realizes the selected arc, chosen variant, stop condition, and execution envelope well enough. | Proceed to Phase 5. |
| `revise_prose` | The arc is valid but the prose needs targeted repair — the trace extraction succeeded but the semantic quality is off. | HARD-FAIL Phase 4. User revises prose externally; re-runs. |
| `reject_arc` | The arc selected at plan-time was structurally wrong for the prose that got rendered. | HARD-FAIL Phase 4. User re-runs `branching-story-page-cycle` with a different storylet excluded from re-pick, regenerates the plan, re-renders, re-runs finalize. |
| `promote_interrupt` | The arc hit an interrupt before a natural close. | This is a pass-with-classification — the Phase 4 verdict still routes to Phase 5 as `pass`, but the page's `state_snapshot.narrative_point_classification` (already set at plan-commit by page-cycle Phase 8) is verified against the interrupt classification. If the existing classification disagrees, surface as a Phase 5 `arc_trace_evidence_alignment` mismatch (not a Phase 4 HARD-FAIL — Phase 4 reports what the trace says; Phase 5 cross-checks against state). |

Layer 3 does NOT weaken any HARD-GATE. Finalize never crosses the story-to-world boundary; any `canon_candidate` route would have been handled at plan-time via page-cycle's Phase 4.5, not here.

## Per-Execution-Mode Budget

| Mode | Layer 2 | Layer 3 | ARC_TRACE persisted |
|---|---|---|---|
| `authoring` (default) | Always run | Always run; max 1 critic call (no re-prompt loop in this skill, unlike page-cycle's pre-rework 2-call budget) | Yes |
| `interactive_runtime` | Always run | Run only when Layer 2 produced `possible_violations[]` with `severity >= medium`; max 1 critic call | Yes when Layer 2 succeeded |
| `batch_generation` | Always run | Skip by default; run at configured checkpoints only | Yes when Layer 2 succeeded |

In `interactive_runtime` low-budget Layer 3 skip, the `semantic_critic_verdict.status` field is set to `pass` with `notes: "Layer 3 skipped under interactive_runtime budget; trace structurally valid"`. Layer 2 must still produce a structurally valid trace for ARC_TRACE to be persisted.

If Layer 2 fails (structural HARD-FAIL above) under ANY mode, Phase 4 fails — no fallback to `arc_trace_emitted: false`. The skill is finalize, not omit; a finalize that can't extract a trace from rendered prose has found a real defect in the prose-vs-arc relationship.

## Phase 4 Output

On Phase 4 Layer 2 + Layer 3 PASS (or Layer 3 skipped per mode):

- `ARCTRACE_record_body` cached in working context for Phase 7's `create_arc_trace_record` op.
- `arc_trace_emitted = true` recorded for Phase 7's PG field update.
- `arc_trace_id = ARCTRACE-NNNN` (the pre-allocated id) recorded for Phase 7's PG field update.

On Phase 4 skip (PG.storylet_realized == null):

- `arc_trace_emitted = false`, `arc_trace_id = null` (no PG field update emitted by Phase 7 for these fields — they remain at their plan-commit values).
- No ARCTRACE op in the Phase 7 envelope.

On Phase 4 HARD-FAIL: halt. No Phase 5, no Phase 6, no engine writes.
