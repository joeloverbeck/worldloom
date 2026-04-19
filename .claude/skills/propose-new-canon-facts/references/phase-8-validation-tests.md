# Phase 8: Validation and Rejection Tests

Run all 10 tests. Each records PASS / FAIL with a one-line rationale into the batch manifest's Canon Safety Check Trace. Any FAIL halts and loops to the responsible phase. Do NOT proceed to Phase 9 until all pass.

## Per-card tests (run over every card)

1. **(Rule 2, Phase 5)** Each card's `canon_fact_statement` materially changes at least one of the 14 domains listed in FOUNDATIONS Rule 2 (labor / embodiment / social norms / architecture / mobility / law / trade / war / kinship / religion / language / status signaling / ecology / daily routine). A card that changes none is pure flavor; fail.
2. **(Rule 3, Phase 7c + 7e)** Each capability card has populated `recommended_scope`, `why_not_universal`, and `integration_burden`. No hand-wave stabilizers.
3. **(Rule 4, Phase 7c)** No capability card has `recommended_scope: global` without explicit `why_not_universal` referencing ontology or infrastructure.
4. **(Rule 5, Phase 3 + Phase 6 template)** Each card populates `immediate_consequences` AND `longer_term_consequences` AND `likely_required_downstream_updates`. No blank consequence fields.
5. **(Rule 7, Phase 7b)** Each card's `canon_safety_check.mystery_reserve_firewall` lists every MR entry checked, with overlap status documented in the Trace prose. Empty firewall + non-empty MR = fail.
6. **(Rule 7, Phase 7b)** No card's `canon_fact_statement` or consequences match any MR entry's `disallowed_cheap_answers`.

## Batch-level tests

7. **(Phase 6)** Every slot intended to be filled per `batch_size` selection is either filled or explicitly marked empty with a rationale. No silent gaps.
8. **(Phase 7d)** The batch manifest's Phase 7d trace lists every card-pair tested. Empty trace when batch has ≥2 cards = fail.
9. **(Phase 5 audit)** The batch manifest's rejected-seed log contains every seed rejected at Phase 5 with the trigger cited.
10. **(Schema completeness)** No card or batch manifest frontmatter field is left as TODO, placeholder, or empty where the schema requires content.

Recording format per test (in the batch manifest):

```
- Test N (Rule R / topic): PASS — <one-line rationale>
```

A PASS without rationale is treated as FAIL. The recorded trace is what the user reads at Phase 9 HARD-GATE; absent or undocumented validation breaks the audit trail.
