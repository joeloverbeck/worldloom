# Phase 6: HARD-GATE Approval

Phase 6 is the user-approval gate. In `authoring` mode it is shown; in `interactive_runtime` and `batch_generation` it is hidden after Phase 5 PASS. Any Phase 2 / Phase 3 / Phase 4 / Phase 5 failure surfaces in every mode (the gate is hidden, not bypassed).

## Per-Execution-Mode Visibility

| Mode | Phase 6 visibility |
|---|---|
| `authoring` (default) | HARD-GATE shown — user must explicitly approve before Phase 7 |
| `interactive_runtime` | HARD-GATE hidden; auto-commits to Phase 7 after Phase 5 PASS; gate shown only on any phase failure |
| `batch_generation` | HARD-GATE hidden until a configured checkpoint or any phase failure |

When the gate is shown — either electively in `authoring` or because an earlier phase failed — present the Deliverable Summary below.

## Deliverable Summary

```
PROSE FINALIZE PROPOSED: PG-NNNN (branch: <branch_path>)
Story bundle: <world-slug>/<story-slug>
Plan: pages-prose-plans/PG-NNNN.md
Rendered prose: pages-prose/PG-NNNN.md (<word count> words, <char count> chars)

PHASE 1 — PLAN / PROSE PAIRING:
- state_hash drift: <none | drift detected: plan=<hash> pg=<hash>>
- canon_revision drift: <none | drift detected: plan=<CH> pg=<CH>>
- accept_plan_drift: <bool>
- plan_id match: <bool>

PHASE 2 — DETERMINISTIC PRE-CRITIC:
- Engine-vocabulary leakage: <PASS | FAIL with cited offsets>
- Forbidden-mystery resolution: <PASS | FAIL with cited M and offsets>
- REQUIRED TURN heuristic: <PASS | WARN with <N>/<M> keyword match>

PHASE 3 — 8-AXIS PROSE CRITIC (overall: <PASS | SOFT_FAIL | HARD_FAIL>):
- filter_word_saturation: <verdict, cited spans if non-PASS>
- recurring_metaphor_across_pages: <verdict, cited spans if non-PASS>
- identical_anchor_recurrence: <verdict, cited spans if non-PASS>
- self_narrating_self: <verdict, cited spans if non-PASS>
- bracket_paraphrasing_dialogue: <verdict, cited spans if non-PASS>
- ledger_jargon_leakage: <verdict, cited spans if non-PASS>
- abstract_noun_saturation: <verdict, cited spans if non-PASS>
- padding_or_truncation: <verdict, cited spans if non-PASS>

PHASE 4 — ARC_TRACE EXTRACTION:
- Triggered: <true | false (PG.storylet_realized == null; bootstrap root)>
- Layer 2 (trace extraction): <PASS | HARD_FAIL>
- Layer 3 (semantic critic): <pass | revise_prose | reject_arc | promote_interrupt | skipped under mode budget>
- ARCTRACE id (pre-allocated): <ARCTRACE-NNNN | n/a>
- Realized beats: <N> of <[min, max]> (<percentage> realized)
- Effect evidence: <N> of <M> required_effects evidenced (<percentage>)
- Stop condition: <kebab-id> (<category>)
- Possible violations: <count by severity>

PHASE 5 — DEFERRED GATE RESOLUTION:
- prose_ledger_consistency: <PASS — rationale | FAIL>
- arc_trace_evidence_alignment: <PASS — rationale | FAIL | PASS auto-rationale when ARC_TRACE not emitted>
- prose_critic_8_axis: <PASS — rationale | PASS with SOFT_FAIL aggregation>

TARGET FIELD UPDATES (Phase 7 will emit):
- PG.prose_path: null → "pages-prose/PG-NNNN.md"
- PG.prose_status: "pending" → "rendered"
- PG.deferred_validation_trace.prose_ledger_consistency: "DEFERRED — ..." → "PASS — <rationale>"
- PG.deferred_validation_trace.arc_trace_evidence_alignment: "DEFERRED — ..." → "PASS — <rationale>"
- PG.deferred_validation_trace.prose_critic_8_axis: "DEFERRED — ..." → "PASS — <rationale>"
- PG.state_snapshot.arc_trace_emitted: <current bool> → <true | unchanged>     (only when Phase 4 ran)
- PG.state_snapshot.arc_trace_id: <current value> → "ARCTRACE-NNNN" | <unchanged>  (only when Phase 4 ran)

NEW RECORDS:
- SE-NNNN (action: prose_finalized) — always
- ARCTRACE-NNNN — only when Phase 4 ran

TARGET WRITE PATHS:
- _source/pages/PG-NNNN.yaml (field updates via update_record_field)
- _source/events/SE-NNNN.yaml (new record)
- _source/arc-traces/ARCTRACE-NNNN.yaml (new record; only when Phase 4 ran)
- INDEX.md (page-row prose_status flip)
```

## User Options

| Option | When available | Effect |
|---|---|---|
| ACCEPT | Always (when Phase 6 reached) | Proceed to Phase 7 — engine submit + INDEX.md edit. |
| ACCEPT_AS_IS | Only when Phase 3 overall is `SOFT_FAIL` | Proceed to Phase 7. The soft-failed axes + cited instances are inlined into `SE.notes` for the audit trail. Phase 5's `prose_critic_8_axis` gate records `PASS — Phase 3 SOFT_FAIL on <N> axes; user accepted via ACCEPT_AS_IS`. |
| REVISE-prose | Always | No writes; halt. User revises `pages-prose/PG-NNNN.md` externally and re-runs the skill. Re-running is idempotent because `prose_status` is still `pending`. |
| REJECT | Always | No writes; halt. Same end-state as REVISE-prose; the difference is intent — REJECT signals the user does not plan to retry. |

## SE.notes Composition

Compose `SE.notes` at Phase 6 (when the user chooses ACCEPT or ACCEPT_AS_IS) so Phase 7 can include the final notes string in its `create_se_record` op payload. The notes string composes from:

1. Base form (always): `"Prose finalized; deferred validators resolved; ARCTRACE emitted: <bool>."`
2. Plan drift suffix (when Phase 1 detected accepted drift): `"Plan drift accepted: canon_revision advanced from <plan-CH> to <pg-CH> between plan-commit and finalize."`
3. SOFT_FAIL suffix (when user chose ACCEPT_AS_IS): `"Phase 3 SOFT_FAIL on axes [<comma-separated>]; user accepted via ACCEPT_AS_IS at Phase 6."`
4. REQUIRED TURN warning suffix (when Phase 2 Check 3 warned): `"Phase 2 REQUIRED TURN keyword heuristic warning: <N>/<M> content-word match; Phase 3 + Phase 5 verdicts adjudicated final compliance."`

Join the components with single spaces; no markdown.

## Halting Behaviour

If the user chooses REVISE-prose or REJECT, halt immediately. Do NOT write anything. Specifically: do NOT mutate the PG record, do NOT create SE, do NOT create ARCTRACE, do NOT edit INDEX.md, and do NOT clean up temp files (temp files are not yet written — Phase 7 writes them).

If the user chooses ACCEPT or ACCEPT_AS_IS, route to Phase 7.

## Phase 6 Output

- User verdict (ACCEPT / ACCEPT_AS_IS / REVISE-prose / REJECT).
- Final `SE.notes` string composed.
- If verdict was ACCEPT_AS_IS, `prose_critic_8_axis` gate rationale updated to include the user-accepted note.
- All working-context records ready for Phase 7's envelope assembly.
