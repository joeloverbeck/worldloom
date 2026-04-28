# Phase 8: Validation and Rejection Tests

Run all 10 tests below and record each as PASS / FAIL with a one-line rationale into the dossier's Canon Safety Check Trace section. Any FAIL halts and loops back to the originating phase. Do NOT proceed to Phase 9 until every test records PASS.

1. **(Rule 2, Phase 0)** Every required input resolves to a specific named entity in a loaded world file — no "generic" bindings.
2. **(Rule 2, Phase 1)** Every material-reality fact in the dossier cites a loaded file and section (or named clause).
3. **(Rule 3, Phase 5)** Every capability has populated `how_learned`, `cost_to_acquire`, `teachers_institutions` (or explicit self-teaching with stated cost), `unusual_or_ordinary`, and `body_class_place_shape`. No hand-wave stabilizers.
4. **(Rule 4, Phase 7c)** Every capability either fits a matching CF's `who_can_do_it`, or has a `world_consistency.distribution_exceptions` entry citing a Phase 2 institutional embedding.
5. **(Rule 7, Phase 7b)** `world_consistency.mystery_reserve_firewall` lists every M-NNNN record that was checked at Phase 7b (regardless of overlap), with the overlap-or-no-overlap status documented in the Canon Safety Check Trace prose. A world with any M records but an empty firewall list fails this test — silent firewall means no firewall.
6. **(Rule 7, Phase 3 + Phase 7b)** The character's `known_firsthand` and `wrongly_believes` fields contain no content matching any M record's `disallowed_cheap_answers` item.
7. **(Phase 7a)** `world_consistency.invariants_respected` lists every invariant tested against the character. No invariant may be silently skipped.
8. **(Phase 2 coverage)** Every institutional axis present in the SEC-INS records for this region/class/species has a stated character relation in the dossier — even if the relation is "none, and here is why." No silent gaps.
9. **(Schema completeness)** No dossier field listed in `templates/character-dossier.md` is left as TODO, placeholder, or empty where the schema requires content.
10. **World-Grown Specificity (FOUNDATIONS §World Queries #6: "What kinds of people can plausibly exist here?")** — judgment only. This test carries the worldbuilding-pattern signal from Pattern #4 / #27 / #29 / #30 / #72 / #82: the dossier's profession + capability + institutional embedding + voice metaphors + body / personhood condition + epistemic position collectively make this character implausible in another world. PASS rationale MUST enumerate at least 3 of the following 6 specificity axes, citing the specific world-state record or dossier section that grounds each:
    - **Profession premise-specificity** (Pattern #4 / #82) — the character's profession exists because of the world's premise; it cannot be lifted into a generic-fantasy or generic-modern setting unchanged. Cite the SEC-INS / CF that grounds the profession.
    - **Capability gating by world-specific CF** (Pattern #26) — the character's capability is exercised within the distribution / cost / stabilizer envelope of a specific CF. Cite the CF and the binding rationale.
    - **Institutional embedding via world-specific records** (Pattern #38 / #82) — the character's institutional axes (family, law, religion, employer, military, taboo) cite world-specific INV / SEC / ENT records by id. Cite at least 1 such binding.
    - **Voice metaphors from world-specific sources** (Pattern #29 / #97) — the character's metaphors and idioms draw from world-specific environmental / social / metaphysical material, not generic-register language. Cite at least 1 metaphor and its world-source.
    - **Body / personhood condition** (Pattern #27 / #28) — the character's body is shaped by world-specific embodiment rules (species traits / body modifications / aging rules / kinship marks). Cite the SEC-PAS / CF / INV that grounds the condition.
    - **Epistemic position grounded in world-specific information topology** (Pattern #19 / #69) — what the character knows, believes, or cannot know is structured by the world's information environment (literacy distribution / propaganda / managed ignorance / forbidden knowledge). Cite the M / CF / INV that grounds the position.

    FAIL trigger: fewer than 3 specificity axes can be cited, OR the cited bindings are nominal (for example, `profession=blacksmith` without explaining why the world's smelting, metallurgy, or labor distribution makes the role specifically world-grown). FAIL routes back to the responsible construction phase: Phase 5 for capability, Phase 2 for institutional embedding, Phase 6 for voice, Phase 1 for body, Phase 3 for epistemic position, and Phase 0 for profession.

Recording format per test (one row of the Canon Safety Check Trace section):

```
- Test N (Rule R / topic): PASS — <one-line rationale>
```

A PASS without rationale is treated as FAIL. The recorded trace is what the user reads at Phase 9 HARD-GATE; absent or undocumented validation breaks the audit trail.
