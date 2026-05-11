# Phase 5: Deferred Gate Resolution

Phase 5 resolves the three deferred gates that page-plan.md's frontmatter `deferred_validation_trace` field holds in `"DEFERRED — awaiting prose render"` state until finalize runs. Each gate produces a `PASS — <rationale>` or `FAIL — <reason>` verdict that Phase 7 writes into `PG.deferred_validation_trace.<gate>` via `update_record_field`.

A bare `PASS` without rationale is treated as `FAIL` — the validation contract requires one-line justification for every PASS per CLAUDE.md §Non-Negotiables.

## Gate 1: `prose_ledger_consistency`

**What it checks.** The rendered prose's narrative claims (POV character actions, observed facts, scene-state changes) are consistent with `PG.state_snapshot` (the post-applied-event-ops ledger state). Same logic as `branching-story-health-audit`'s Rule 1+7 boundary check, but applied to a single page rather than a whole bundle.

**Method.**

1. Parse the rendered prose into a coarse claim set: actions performed by POV, presence/absence of cast in scene, state-impacting events (a fight, a confession, an object passing hands).
2. For each parsed claim, look up the corresponding `PG.state_snapshot` entry:
   - Action by POV → does `applied_event_ops` contain an SE-NNNN whose payload describes this action?
   - Cast presence → does `state_snapshot.cast_present[]` contain the STENT references the prose names?
   - Object passing hands → does `state_snapshot.inventory_by_entity` reflect the transfer?
   - Pressure shift → does `state_snapshot.threads_active` show the THR pressure delta?
3. A claim with NO state-snapshot grounding is a `prose_ledger_inconsistency` finding.
4. A state delta with NO prose grounding is the inverse problem — the engine recorded a change the prose didn't show. Also a finding.

**Verdict.**

- All claims grounded AND all state deltas reflected: `PASS — N prose claims grounded; M state deltas reflected; no ungrounded/unreflected items`.
- One or more ungrounded/unreflected items: `FAIL — <count> findings: <comma-separated short citations>`.

A FAIL on `prose_ledger_consistency` is HARD — it indicates the prose doesn't match the engine's view of what this page did. Surface findings to the user; user revises prose externally and re-runs.

## Gate 2: `arc_trace_evidence_alignment`

**What it checks.** The ARCTRACE record's `evidence_spans[]` (`realized_beats[].evidence_span`, `observed_actions[].evidence_span`, `effect_evidence[].evidence_span`, `stop_condition_hit.evidence_span`) cite character offsets in the rendered prose that actually exist and contain content consistent with their claims.

This is the executable counterpart of the Phase 4 Layer 2 structural validation — Layer 2 verified offsets are in `[0, len(prose))`; Phase 5 verifies the cited text at those offsets matches the claim.

**Method.**

When `arc_trace_emitted == true`:

1. For each `evidence_span` in the ARCTRACE record body, extract `prose[span.start:span.end]`.
2. Verify the extracted text is non-empty and is consistent with the cited claim:
   - `realized_beats[N].evidence_span` should cite text that semantically realizes the `beat_function`.
   - `observed_actions[N].evidence_span` should cite text where the named actor performs the named action (verbatim or near-verbatim).
   - `effect_evidence[N].evidence_span` should cite text consistent with the chosen variant's `required_effects[effect_ref]`.
   - `stop_condition_hit.evidence_span` should cite text matching the named stop-id's natural-language cue from `arc.stop_policy`.
3. For deterministic offsets-existence-check, this is regex/substring matching. For consistency-check, this is the same critic that ran Phase 4 Layer 3 — but here it operates only on the evidence_spans, not the whole prose, so the budget is small.

**Verdict.**

- All evidence_spans existent and consistent: `PASS — N evidence_spans verified against rendered prose`.
- Any span out-of-range: `FAIL — evidence_span <slot> cites offsets [<start>, <end>) outside prose length <N>`.
- Any span inconsistent: `FAIL — evidence_span <slot> at offsets [<start>, <end>) cites text "<excerpt>" inconsistent with claim "<claim>"`.

When `arc_trace_emitted == false` (Phase 4 was skipped because `PG.storylet_realized == null`):

- Auto-PASS with rationale: `PASS — ARC_TRACE not emitted (PG.storylet_realized == null, bootstrap root case)`.

## Gate 3: `prose_critic_8_axis`

**What it checks.** The Phase 3 overall verdict. This gate is a pass-through of Phase 3's result — Phase 5 does not re-run the critic.

**Method.**

Record Phase 3's `overall` verdict directly:

- `PASS` (all 8 axes PASS): `PASS — all 8 axes PASS per Phase 3 critic`.
- `SOFT_FAIL` (1-3 SOFT_FAIL, no HARD_FAIL): `PASS — Phase 3 SOFT_FAIL on <N> axes (<axis names>); user accepted via ACCEPT_AS_IS at Phase 6`. (This gate records PASS only if the user did accept ACCEPT_AS_IS — Phase 6 routes the gate verdict through.)
- `SOFT_FAIL` (1-3 SOFT_FAIL) BUT user chose REVISE-prose at Phase 6: skill halted at Phase 6; Phase 5 never wrote.
- `HARD_FAIL`: skill halted at Phase 3; Phase 5 never ran.

So in practice, `prose_critic_8_axis` records either `PASS — all 8 axes PASS` or `PASS — SOFT_FAIL on <N> axes; user accepted`. A FAIL state for this gate never lands in `PG.deferred_validation_trace` because halting always happens before Phase 7 writes.

## Phase 5 Halting Discipline

| Gate | FAIL routes to |
|---|---|
| `prose_ledger_consistency` | HALT. User revises prose externally and re-runs. The PG record is NOT updated. |
| `arc_trace_evidence_alignment` | HALT (FAIL is a real defect — the ARCTRACE record is internally inconsistent with the prose it was extracted from). User revises prose externally and re-runs. |
| `prose_critic_8_axis` | Pass-through of Phase 3. Halting always happened earlier. |

## Phase 5 Output

A `deferred_validation_trace` working-context object populated with three keys:

```yaml
prose_ledger_consistency: PASS — <rationale>     # or FAIL → halt
arc_trace_evidence_alignment: PASS — <rationale>  # or FAIL → halt; auto-PASS when arc_trace_emitted == false
prose_critic_8_axis: PASS — <rationale>           # pass-through of Phase 3
```

Phase 7 emits three `update_record_field` ops setting `PG.deferred_validation_trace.<key>` for each key.

If any gate FAILs, halt — do NOT proceed to Phase 6 or Phase 7. Report the failed gate + rationale to the user. The PG record stays in `prose_status: pending`; the user revises the prose file externally and re-runs.
