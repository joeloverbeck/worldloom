# Phases 7-8: Validate and Commit

Load this reference when entering Phase 7 (validation tests) and Phase 8 (HARD-GATE + commit).

## Phase 7: Validation and Rejection Tests

Every test records **PASS with one-line rationale** OR **FAIL with specific gap**. **A PASS without rationale is treated as FAIL** per FOUNDATIONS discipline. Any FAIL halts and loops to the responsible phase.

### Per-card tests

- **T1. Domain coverage.** At least one of the 14 Rule-2 domains listed in `domains_touched`. Enforces Rule 2.
- **T2. Scope honesty.** `recommended_scope` explicitly declared; if `geographic: global`, 6c rationale exists. Enforces Rule 4.
- **T3. Consequence completeness.** Both `immediate_consequences` and `longer_term_consequences` populated with ≥ 1 entry each; longer-term traces through ≥ 2 Rule-2 domains. Enforces Rule 5.
- **T4. Stabilizer presence.** `why_not_universal` populated OR `social: rumor` scope declared. Enforces Rule 3.
- **T5. CSC trace completeness.** `canon_safety_check` fields fully populated: `invariants_respected` or `invariants_violated` non-empty; `mystery_reserve_firewall` records every MR id; `distribution_discipline.canon_facts_consulted` non-empty; `diegetic_to_world_laundering` records all three sub-tests with `test_result` + rationale.
- **T6. Source artifact binding.** `source_artifact_id` field populated with DA-NNNN id; `source_basis.derived_from_artifact_path` populated.
- **T7. Prose completeness.** Every markdown body section populated (no placeholder text, no `<...>` stubs).

### Batch-level tests

- **T8. Classification accounting.** `grounded_count + partially_grounded_count + not_addressed_count + contradicts_count + extends_soft_count` equals total claims extracted at Phase 1. **No claim unaccounted for.** See Count fidelity discipline below.
- **T9. Rejection log completeness.** Every Phase 5 rejection logged with trigger id AND one-line rationale. An R11-partial rejection carries the trigger subvariant id.
- **T10. Flagged-contradictions handoff.** Every `flagged_contradictions` entry has continuity-audit handoff prose naming the specific CF or invariant it conflicts with. An empty `flagged_contradictions: []` list vacuously passes T10 — explicitly note the vacuous pass in the batch manifest with one-line rationale ("No contradictions detected; T10 vacuously satisfied").
- **T11. Batch-level CSC trace completeness.** Phase 6e trace records `joint_closure_check`, `mutual_contradiction_check`, and `single_narrator_concentration_check` with per-pair or per-card results.

### Count fidelity discipline (T8)

T8 passes when every extracted claim is assigned to exactly one of the five classification buckets. Fidelity by batch size:

- **≤ 50 claims**: include a per-claim classification table inline in the batch manifest body, with one row per claim showing claim one-liner + bucket + (for `not_addressed`) candidate id + (for rejected) trigger id. Exact enumeration required.
- **51 - 150 claims**: include the rejection-log table (which already enumerates every rejection) plus a count-check line showing the five bucket counts summing to total. The surviving-cards count is implied by the card frontmatter; the `partially_grounded` and `grounded` buckets are summarized by count but individual claims need not be enumerated.
- **> 150 claims**: same as 51-150 but with a loose-tolerance convention: count accuracy is ±5% — if Phase 1 extraction was clearly at consistent granularity per the `phase-1-claim-extraction.md` convention, minor miscounts below the tolerance do not fail T8. Over the tolerance, loop back to Phase 1 for re-extraction.

**Tolerance is NOT a substitute for enumeration at 51-150.** The rejection-log is still complete; the tolerance applies only to aggregate count checks at very large batches.

## Phase 8: Commit

### Deliverable Summary

Present the deliverable to the user before any write. The summary contains:

1. **Claim extraction trace** from Phase 1: total claims extracted, breakdown by narrator stance, prose/frontmatter disagreement count.
2. **Phase 2 classification counts**: grounded / partially_grounded / not_addressed / contradicts / extends-soft.
3. **Phase 5 Rejected-Candidates Log**: every rejection with trigger id and one-line rationale.
4. **Flagged-contradictions list**: each entry with its continuity-audit handoff prose. If empty, state so explicitly with T10 vacuous-pass note.
5. **Full batch**: every surviving card's frontmatter + body, every card's Canon Safety Check trace.
6. **Phase 6f Repair Log**: every repair with card-id + sub-check-id + repair-type + justification. If none fired, state so.
7. **Phase 6e Batch-level CSC trace**: joint-closure, mutual-contradiction, single-narrator concentration findings.
8. **Phase 7 Validation & Rejection Tests**: all 11 test results with rationales.
9. **Target write paths**: `worlds/<world-slug>/proposals/PR-NNNN-<slug>.md` (per card), `worlds/<world-slug>/proposals/batches/BATCH-NNNN.md`, `worlds/<world-slug>/proposals/INDEX.md`.

### HARD-GATE Response Mapping

The user's response maps to one of four actions:

| User response form | Action |
|---|---|
| `approve`, `approved`, `yes`, `write`, `commit`, `ship it`, or equivalent minimal affirmative | **(a) Approve as-is** — proceed to atomic write with no drops. |
| `approve drop PR-NNNN[, PR-NNNN...]`, `approve except PR-NNNN`, `keep all but PR-NNNN` | **(b) Approve with drop-list** — proceed to atomic write excluding named cards. |
| `revise <card-id> <phase>`, `loop to phase N`, or any response naming specific revisions | **(c) Revision request** — loop to the named phase. |
| `reject`, `abort`, `cancel`, `no` | **(d) Reject and abort** — no writes. |

Ambiguous responses default to asking for clarification, not to option (a).

### Drop-list behavior

Same as sibling `propose-new-canon-facts`: surviving cards retain their originally-allocated PR-NNNN IDs (no renumbering), dropped IDs become permanent gaps, dropped cards are recorded in manifest `dropped_card_ids` with per-card rationale from the user's response, and the Phase 6e trace retains dropped-pair results as audit evidence. **Post-drop re-evaluation**: the Phase 6e `single_narrator_concentration_flag` is re-evaluated against the post-drop card count before final manifest write — see `phase-6-canon-safety-check.md` §Single-narrator concentration, Post-drop-list re-evaluation. Joint-closure and mutual-contradiction trace results stay in their pre-drop state as dropped-pair audit evidence.

### Empty-batch behavior

If after Phase 6 the survivor count is zero, OR the user drops all cards at the HARD-GATE, the batch manifest STILL writes with `card_ids: []` and a narrative explanation in the body (claim extraction trace, rejection tally, flagged-contradictions count). INDEX.md receives one line: `- BATCH-NNNN (empty — see manifest) — mined-from-<DA-NNNN>`. Durable evidence the artifact was examined; prevents redundant re-mining.

Filling an empty batch by lowering score thresholds or weakening rejection triggers is forbidden — that would hide diagnostic information about the artifact's canon density.

### Write Order (sequencing matters for partial-failure recovery)

On approval, write in this order:

1. **Each non-dropped card first**: `worlds/<world-slug>/proposals/PR-NNNN-<slug>.md`. Set `source_basis.user_approved: true` on each card immediately before its write. Semantics: "review-approved for inclusion in batch", NOT "canonized".
2. **Batch manifest second**: `worlds/<world-slug>/proposals/batches/BATCH-NNNN.md` with `dropped_card_ids` populated and `user_approved: true`. Create the `batches/` directory if absent.
3. **INDEX.md last**: read existing file (create with header `# Proposal Cards — <World-Slug-TitleCased>` + blank line if absent), append one line per non-dropped card OR one empty-batch line, sort by PR-NNNN ascending (empty-batch lines sorted by BATCH-NNNN), write back.

### INDEX.md line format

`- [<title>](PR-NNNN-<slug>.md) — <proposed_status> / <type> / mined-from-<DA-NNNN>, batch BATCH-NNNN`

For empty batches: `- BATCH-NNNN (empty — see manifest) — mined-from-<DA-NNNN>`

**Format-per-source-skill note**: This skill's `mined-from-DA-NNNN` slot replaces the sibling `propose-new-canon-facts` skill's enrichment-category-letter slot. When both skills have contributed to the same INDEX.md, lines have visually inconsistent tags (e.g., `/ A,` vs `/ mined-from-DA-0002,`). This is DESIGNED divergence — each source-skill's tag slot signals provenance. A reviewer-friendly convention: the INDEX.md header may include a one-line comment documenting the per-source-skill format ("propose-new-canon-facts entries tag with enrichment-category letter; canon-facts-from-diegetic-artifacts entries tag with `mined-from-DA-NNNN`").

Report all written paths. Do NOT commit to git.
