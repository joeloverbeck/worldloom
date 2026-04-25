# SPEC-04 Verification Coverage

| Spec Verification bullet | Test case name |
|---|---|
| Unit | SPEC-04 verification: Unit registry exposes the active mechanized validators |
| Integration | SPEC-04 verification: Full-world and bootstrap baseline is structured |
| Pre-apply mode | SPEC-04 verification: Pre-apply mode rejects a deliberate Rule 4 violation |
| Full-world mode | SPEC-04 verification: Full-world and bootstrap baseline is structured |
| Incremental mode | SPEC-04 verification: Incremental mode filters to relevant validators |
| Phase 14a migration | SPEC-04 verification: Phase 14a migration keeps Rule 3 skill-owned |
| False-positive / bootstrap baseline | SPEC-04 verification: Full-world and bootstrap baseline is structured |
| Engine rewire | SPEC-04 verification: Engine rewire entry returns validator verdicts |
| Schema conformance | SPEC-04 verification: Schema conformance has no atomic-source schema failures |
| Performance signal | SPEC-04 verification: Full-world duration is logged as a dev-loop signal |

The bootstrap baseline currently records pre-existing animalia findings instead
of expecting a clean run. SPEC-04 treats those as grandfather-or-fix audit work
before the broader Phase 2 Tier 1 gate is declared clean.
