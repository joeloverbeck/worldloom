# Phase 8: Validation and Rejection Tests

Run all 11 tests. Each recorded as PASS / FAIL with one-line rationale into Canon Safety Check Trace. Any FAIL halts and loops back to the originating phase.

1. **(Rule 2, Phase 0)** Every HARD input binds to a specific named world entity — no "generic" bindings. SOFT defaults explicitly noted.
2. **(Rule 2, Phase 4)** Every texture element in the artifact body cites its source file and world-embedded reason. No decorative texture.
3. **(Phase 0b)** Author Reality Construction has no null fields among the 15 mandatory author-profile fields (trauma_history_if_relevant and sex/gender may be null when not relevant, but the null must be deliberate).
4. **(Phase 1)** Every candidate claim considered for the artifact has one of the six source tags. No untagged claims.
5. **(Rule 7, Phase 7b)** `world_consistency.mystery_reserve_firewall` lists every MR entry checked, overlap or not. Empty firewall list when MYSTERY_RESERVE has entries fails.
6. **(Rule 7, Phase 3 + 7b)** Artifact body, `claim_map`, and `epistemic_horizon.wrongly_believed` contain no content matching any MR `disallowed cheap answers` item.
7. **(Phase 7a)** `world_consistency.invariants_respected` lists every invariant tested. No invariant silently skipped.
8. **(Rule 4, Phase 7c)** Every attributed Author capability fits a matching CF's `who_can_do_it` or has an entry in `world_consistency.distribution_exceptions` citing Phase 0b embedding. Every world-fact claim in the body respects its CF's distribution on access.
9. **(Phase 7d, 4 rules)** The four diegetic-safety rules each pass.
10. **(Phase 7e)** World-Truth and Narrator-Truth both pass.
11. **(Schema completeness)** No frontmatter field in `templates/diegetic-artifact.md` is left as TODO, placeholder, or empty where schema requires content. The markdown body contains a non-empty artifact text AND a populated Canon Safety Check Trace section.

Recording format per test:

```
- Test N (Rule R / Phase P / topic): PASS — <one-line rationale>
```

A PASS without rationale is treated as FAIL.
