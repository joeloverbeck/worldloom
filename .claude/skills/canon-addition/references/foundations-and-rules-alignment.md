# FOUNDATIONS Alignment and Validation Rules Upheld

Two cross-reference maps showing how this skill's phases implement FOUNDATIONS.md principles and enforce the Seven Validation Rules.

## Validation Rules This Skill Upholds

- **Rule 1: No Floating Facts** — Phase 13a (CF schema required fields) + Phase 14a (rejection test: prerequisites, costs_and_limits, visible_consequences all required).
- **Rule 2: No Pure Cosmetics** — Phase 0 (ontology attachment at classification) + Phase 14a (rejection test: `domains_affected` non-empty).
- **Rule 3: No Specialness Inflation** — Phase 7 (Counterfactual Pressure Test refuses hand-wave stabilizers) + Phase 14a (rejection test: stabilizer must name concrete mechanism).
- **Rule 4: No Globalization by Accident** — Phase 1 (Scope Detection) + Phase 14a (rejection test: any fact with non-global geographic scope OR non-public social scope must specify `distribution.why_not_universal` with at least one concrete stabilizer, regardless of `type`).
- **Rule 5: No Consequence Evasion** — Phase 6 (three-layer propagation) + Phase 14a (rejection test: 2nd/3rd-order consequences must appear in the CF record's `visible_consequences` OR in at least one Phase 13a patch targeting a file named in `required_world_updates`; a filename alone without a drafted patch does not satisfy).
- **Rule 6: No Silent Retcons** — Phase 13a (Change Log Entry + CF modification `notes`-field trace) + Phase 14a (`retcon_policy_checks` all true) + Phase 15a (inline `<!-- added by CF-NNNN -->` attribution on markdown prose; `notes`-field convention on YAML CF modifications).
- **Rule 7: Preserve Mystery Deliberately** — Phase 2 (`MYSTERY_RESERVE.md` loaded; forbidden-answer collisions detected) + Phase 10 (trivialization flagged) + Phase 14a (unrepaired collision halts).

## FOUNDATIONS Alignment

| Principle | Phase | Mechanism |
|-----------|-------|-----------|
| Tooling Recommendation (non-negotiable) | Pre-flight | FOUNDATIONS.md + 6 mandatory world files loaded before any phase; domain files loaded selectively per Phase 0 classification |
| Canon Layers §Hard / Soft / Contested | Phase 11 | Verdict determines CF `status`: ACCEPT→hard_canon; ACCEPT_AS_LOCAL_EXCEPTION→soft_canon; ACCEPT_AS_CONTESTED_BELIEF→contested_canon |
| Canon Layers §Mystery Reserve | Phase 9 | Repair pass may move fact *into* `MYSTERY_RESERVE.md` rather than open canon; OR may create a *new* MR entry to hold a bounded unknown the proposal manufactures (Rule 7) |
| Invariants §full schema | Phase 2 | Every invariant tested; repair pass may recommend invariant revision (routes to `change_type: ontology_retcon`) |
| Canon Fact Record Schema | Phase 13a | Every accepted fact becomes a full CF record matching the schema |
| Rule 1 (No Floating Facts) | Phase 13a, Phase 14a | CF schema fields + rejection test |
| Rule 2 (No Pure Cosmetics) | Phase 0, Phase 14a | Ontology attachment + non-empty domains test |
| Rule 3 (No Specialness Inflation) | Phase 7, Phase 14a | Stabilizer requirement + hand-wave rejection test |
| Rule 4 (No Globalization by Accident) | Phase 1, Phase 14a | Scope Detection + `distribution.why_not_universal` test |
| Rule 5 (No Consequence Evasion) | Phase 6, Phase 14a | Three-layer propagation + consequence-reflection test |
| Rule 6 (No Silent Retcons) | Phase 13a, Phase 14a, Phase 15a | Change Log Entry + `retcon_policy_checks` + inline attribution |
| Rule 7 (Preserve Mystery Deliberately) | Phase 2, Phase 10, Phase 14a | Mystery Reserve load + collision detection + unrepaired-collision test |
| Change Control Policy | Phase 15a | Change Log Entry written atomically with CF record(s) and domain-file patches; `downstream_updates` lists affected files |
