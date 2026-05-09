# Phase 7.6: ARC_TRACE Extraction and Three-Layer Validation

Phase 7.6 runs after Phase 7's prose critic passes and before Phase 8 decides whether a choice surface is needed. It turns the rendered prose working buffer into a structured ARC_TRACE artifact, validates the render against the selected scene-commitment arc, and emits the narrative-point evidence Phase 8 consumes.

ARC_TRACE is a derived debugging and validation artifact. It is not replay-authoritative. Replay equality is governed by the selected arc's `effect_model.variants[]` and the chosen variant id stored on `PG.state_snapshot.applied_effect_variant`.

## Inputs

- Rendered prose working buffer from Phase 7.
- The selected arc record (`SLT-NNNN`) including `arc.beat_plan`, `arc.execution_envelope`, `arc.stop_policy`, and `arc.effect_model.variants[]`.
- The chosen variant id selected in Phase 4b plus its `required_effects[]`.
- The current page id being assembled (`PG-NNNN`) and branch path.
- Whole-class Mystery Reserve and Invariant loads from Pre-flight.
- Execution mode: `authoring`, `interactive_runtime`, or `batch_generation`.

## Layer 1 - Deterministic Structural Validation

Layer 1 is engine-only. It does not call an LLM. It fail-fasts structural problems before semantic criticism spends more tokens, and it re-checks the structural fields that Layer 2 materializes before Phase 8 can proceed.

| Check | Requirement | Fail Route |
|---|---|---|
| Markdown-header absence | Rendered prose contains no beat headers or markdown section headings that expose the beat plan. | Re-prompt Phase 7 with the offending header spans inlined. |
| Beat-count fidelity | ARC_TRACE `realized_beats[]` count must be in `[arc.beat_plan.min_beats, arc.beat_plan.max_beats]`. The engine-side `arc.stop_policy.safety_valves.max_words` is an absolute runaway cutoff only; exceeding it is HARD-FAIL, while coming in under any word count is not a Layer 1 failure per Prose Craft Contract Rule 11. | Re-prompt Phase 7 or escalate after budget exhaustion. |
| Forbidden Mystery preservation | Every M id in `arc.execution_envelope.mystery_preservation.forbidden_resolutions[]` is absent from extracted claims whose `canon_status` is `forbidden_risk`. | HARD-FAIL. Re-prompt with the forbidden-M constraint surfaced; budget exhaustion escalates to the user. |
| Branch-scope legality | Extracted references do not point to sibling-branch story-local records. ARC_TRACE references must stay inside this page's branch path, with the same branch-isolation discipline as Phase 9 recursive reference closure. | Route to Phase 5 or Phase 7 depending on whether the illegal reference came from state or prose. |
| Effect-variant legality | `effect_variant_applied` names an existing entry in `arc.effect_model.variants[]`. | Route to Phase 4b; the chosen variant is invalid. |

Layer 1 shares the Phase 7 re-prompt budget. Persistent failure after three re-prompts escalates to the user with the failed checks and evidence inlined.

## Layer 2 - Post-Render Trace Extraction

Layer 2 is an LLM critic call. It receives the rendered prose, the selected arc's `beat_plan`, `execution_envelope`, and `stop_policy`, plus the chosen variant's `required_effects[]`. It returns one ARC_TRACE record for the page.

Required ARC_TRACE shape:

```yaml
id: ARCTRACE-NNNN
story_id: STORY-NNN
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

The Layer 2 record is structurally validated by SPEC-22's `arc_trace_evidence_alignment` validator. That validator must reject out-of-range prose spans, `effect_evidence[]` entries that do not reference a real chosen-variant `required_effects[N]`, and `stop_condition_hit.id` values that do not reference a real `arc.stop_policy.normal_exits[]` or `interrupt_before[]` id.

If Layer 2 cannot produce a structurally valid record within the shared budget, the page cannot proceed to Phase 8 in `authoring` mode. In lower-cost modes, the runtime may omit persistence only when the configured budget permits `arc_trace_emitted: false`; it may not silently treat an invalid trace as valid.

## Layer 3 - Semantic Conformance Critic

Layer 3 is an LLM critic call over structured inputs, not a free-form reread of raw prose alone. It consumes the ARC_TRACE plus the selected arc record and returns exactly one verdict:

| Verdict | Meaning | Route |
|---|---|---|
| `pass` | The prose realizes the selected arc, chosen variant, stop condition, and execution envelope well enough to continue. | Proceed to Phase 8. |
| `revise_prose` | The arc is valid but the prose needs targeted repair. | Re-prompt Phase 7 with `required_revision_constraints[]`; counts against the shared budget. |
| `reject_arc` | The Phase 4 arc selection was structurally wrong for the current state or user commitment. | Re-run Phase 4 with the current arc excluded. |
| `promote_interrupt` | The arc hit an interrupt before a natural close. | Phase 8 receives `INTERRUPT_HINGE` as the narrative point. |

Layer 3's verdict must not weaken the Phase 4.5 canon-promotion HARD-GATE. Any `canon_candidate` route still hands off to `story-fact-promotion-to-canon` in every execution mode.

## Per-Execution-Mode Budget

| Mode | Layer 3 Budget | Persistence |
|---|---|---|
| `authoring` | Always run. Maximum 2 critic calls per arc render: one initial call and one call after a prose revision. | ARC_TRACE is emitted. |
| `interactive_runtime` | Run only if Layer 1 or Layer 2 surfaced a possible violation. Maximum 1 critic call. | May omit ARC_TRACE under low-budget configuration with `arc_trace_emitted: false`. |
| `batch_generation` | Skip by default; run at configured checkpoints. | Emit only at configured checkpoints or when validation policy requires it. |

The Phase 7 prose critic and Phase 7.6 validation share one three-reprompt budget. Phase 7.6 does not create a separate retry pool.

## ARC_TRACE Persistence

When emitted, ARC_TRACE persists through SPEC-22's `create_arc_trace_record` patch-engine op:

```yaml
op: create_arc_trace_record
target_world: <world-slug>
target_file: worlds/<world-slug>/stories/<story-slug>/_source/arc-traces/ARCTRACE-NNNN.yaml
payload:
  story_slug: <story-slug>
  record: <ARC_TRACE record>
```

The op is included in the Phase 11 patch envelope only when `arc_trace_emitted: true`. Under low-budget `interactive_runtime` configurations, no ARC_TRACE file is created and the PG record records `state_snapshot.arc_trace_id: null` plus `state_snapshot.arc_trace_emitted: false`.

Omitting a trace does not break replay equality. It does reduce debugging evidence; investigating an arc-level pathology should re-run or reproduce the page in `authoring` mode so ARC_TRACE is emitted.

## Phase 9 Gate: `arc_envelope_conformance`

`arc_envelope_conformance` is a deterministic Phase 9 gate that consumes ARC_TRACE evidence after Layers 1-3.

For pages with `arc_trace_emitted: true`, the gate validates:

- no `possible_violations[]` entry with `severity: high` slipped past Layers 1-3 unaddressed;
- every `possible_violations[].envelope_item` references a real entry in `arc.execution_envelope.{invariants, required_functions, prohibited_actions}`;
- every `effect_evidence[]` realized status is consistent with the chosen variant's `required_effects[]`;
- `stop_condition_hit.id` and category are consistent with the arc's `stop_policy.normal_exits[]`, `interrupt_before[]`, or safety valves.

For pages with `arc_trace_emitted: false`, the gate auto-PASSes with rationale:

```text
ARC_TRACE not emitted under low-budget interactive_runtime configuration
```

The validator implementation is owned by SPEC-22 Track 2. SPEC-22 currently lists seven validators in Track 2; this gate is the cross-spec eighth validator identified in SPEC-20's risk note and must be added during the SPEC-22 reassessment before runtime implementation is considered complete.

## Phase 8 Handoff

Phase 8 receives the validated narrative point evidence:

- `NATURAL_COMMITMENT_HINGE` when `stop_condition_hit.category == normal_exit`.
- `INTERRUPT_HINGE` when `stop_condition_hit.category == interrupt_before` or Layer 3 returned `promote_interrupt`.
- `CONTINUE_ONLY_PAUSE` when a safety valve caused a continue-only pause.
- `TERMINAL_OR_CHAPTER_CLOSE` when terminal branch logic applies.
- `CONTINUE_ARC` only for split or unresolved arc flows explicitly allowed by the runtime.

Phase 8 owns choice-surface emission. Phase 7.6 only validates the render and provides the structured trace and narrative-point evidence.
