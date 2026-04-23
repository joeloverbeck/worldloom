# Phase 8: Validation and Rejection Tests

Run all 9 tests below and record each as PASS / FAIL with a one-line rationale into the dossier's Canon Safety Check Trace section. Any FAIL halts and loops back to the originating phase. Do NOT proceed to Phase 9 until every test records PASS.

1. **(Rule 2, Phase 0)** Every required input resolves to a specific named entity in a loaded world file — no "generic" bindings.
2. **(Rule 2, Phase 1)** Every material-reality fact in the dossier cites a loaded file and section (or named clause).
3. **(Rule 3, Phase 5)** Every capability has populated `how_learned`, `cost_to_acquire`, `teachers_institutions` (or explicit self-teaching with stated cost), `unusual_or_ordinary`, and `body_class_place_shape`. No hand-wave stabilizers.
4. **(Rule 4, Phase 7c)** Every capability either fits a matching CF's `who_can_do_it`, or has a `world_consistency.distribution_exceptions` entry citing a Phase 2 institutional embedding.
5. **(Rule 7, Phase 7b)** `world_consistency.mystery_reserve_firewall` lists every MYSTERY_RESERVE entry that was checked at Phase 7b (regardless of overlap), with the overlap-or-no-overlap status documented in the Canon Safety Check Trace prose. A non-empty MYSTERY_RESERVE with an empty firewall list fails this test — silent firewall means no firewall.
6. **(Rule 7, Phase 3 + Phase 7b)** The character's `known_firsthand` and `wrongly_believes` fields contain no content matching any MYSTERY_RESERVE `disallowed cheap answers` item.
7. **(Phase 7a)** `world_consistency.invariants_respected` lists every invariant tested against the character. No invariant may be silently skipped.
8. **(Phase 2 coverage)** Every institutional axis present in `INSTITUTIONS.md` for this region/class/species has a stated character relation in the dossier — even if the relation is "none, and here is why." No silent gaps.
9. **(Schema completeness)** No dossier field listed in `templates/character-dossier.md` is left as TODO, placeholder, or empty where the schema requires content.

Recording format per test (one row of the Canon Safety Check Trace section):

```
- Test N (Rule R / topic): PASS — <one-line rationale>
```

A PASS without rationale is treated as FAIL. The recorded trace is what the user reads at Phase 9 HARD-GATE; absent or undocumented validation breaks the audit trail.
