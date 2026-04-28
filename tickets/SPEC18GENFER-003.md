# SPEC18GENFER-003: Phase 9 Acceptance Tests + §Validation Rules entry

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `.claude/skills/create-base-world/SKILL.md` §Phase 9 + §Validation Rules This Skill Upholds
**Deps**: SPEC18GENFER-002

## Problem

`create-base-world/SKILL.md` Phase 9 currently exercises a list of ~10 inline rejection triggers covering ~6 of FOUNDATIONS' 11 Acceptance Tests. Five FOUNDATIONS Acceptance Tests are absent or partial (Counterfactual #1, Inequality structure #4, Embodiment-forces #6, Scarcity-forces #7, Multi-perspective #11), and two load-bearing pattern tests from `reports/worldbuilding-patterns.md` (One-Sentence Fertility, Native Story Procedures) are unrepresented. Additionally, the leverage population added by SPEC18GENFER-002 has no Phase 9 self-validation test — a malformed leverage block would be caught only at Phase 11 engine pre-apply, AFTER the Phase 10 HARD-GATE user approval, forcing a roundtrip.

The §Validation Rules This Skill Upholds section currently has no entry for FOUNDATIONS §Acceptance Tests; the alignment is implicit and difficult to audit.

## Assumption Reassessment (2026-04-28)

1. Existing Phase 9 prose at `.claude/skills/create-base-world/SKILL.md:111-119` confirmed — rejection-trigger list of ~10 inline tests + schema spot-check + Coverage check (Rule-1 inverse). Existing §Validation Rules This Skill Upholds at lines 146-154 confirmed — table-style entries for Rules 1-7 with phase + mechanism columns; FOUNDATIONS §Acceptance Tests not currently listed.
2. SPEC-18 §Approach Track A3 (lines 60-72) lists eight new tests in order; §Deliverables A3 (line 104) commits to "append eight new tests"; §Deliverables A4 (line 105) commits to a new §Validation Rules entry naming 9-of-11 Acceptance Test coverage.
3. Cross-skill / cross-ticket boundary: Phase 9's Genesis spectator-caste check verifies what SPEC18GENFER-002 populates at Phase 8 (the `cf.notes` `leverage:`-line per `rule11_action_space` validator parsing convention). The §Validation Rules entry references SPEC18GENFER-004's delivery of canon-addition Phase 14a Test 13 for AT #9. Both cross-references resolve once the dependent tickets land.
4. FOUNDATIONS §Acceptance Tests (the 11 questions at `docs/FOUNDATIONS.md:444-459`) and Rule 11 (No Spectator Castes by Accident) motivate this — Phase 9 tests align with AT #1, #4, #6, #7, #8, #11 by name (6 net-new); existing rejection triggers cover AT #2, #3, #5 partially (3 holdovers); AT #9 is at canon-addition; AT #10 is deferred.

## Architecture Check

1. Phase 9 catches Acceptance-Test failures and leverage-block malformation BEFORE the Phase 10 HARD-GATE — the user is not asked to approve a deliverable that the engine validators (`rule11_action_space` + `record_schema_compliance`) will reject at Phase 11 pre-apply. Cleaner than letting validation fail post-approval.
2. No new validators introduced — Phase 9 tests are judgment-only (consistent with existing Phase 9 discipline). The mechanical `rule11_action_space` validator backstops at Phase 11; Phase 9's Genesis spectator-caste check mirrors its logic at the judgment layer.
3. The §Validation Rules entry makes the AT coverage auditable — a future audit can grep the entry to confirm which ATs land where.
4. No backwards-compat shims.

## Verification Layers

1. Phase 9 contains all 8 new test rows by name (Counterfactual / Inequality structure / Embodiment-forces / Scarcity-forces / Multi-perspective / One-Sentence Fertility / Native Story Procedures / Genesis spectator-caste check) → codebase grep-proof
2. Phase 9 introductory prose says "eight new tests" → codebase grep-proof
3. §Validation Rules entry references "9 of 11 Acceptance Tests" with the documented per-AT routing (6 net-new at Phase 9, 3 partial holdovers, AT #9 at canon-addition, AT #10 deferred) → codebase grep-proof
4. Skill dry-run: capability-bearing CF-0001 with empty leverage block must FAIL Phase 9; non-capability-bearing CF-0001 with empty leverage block must PASS Phase 9 trivially with conditional rationale → skill dry-run

## What to Change

### 1. §Phase 9 — Append eight new rejection tests

In `.claude/skills/create-base-world/SKILL.md` §Phase 9, after the existing rejection-trigger sentence ("species or peoples are cosmetic ... Equilibrium Explanation"), append the eight new tests in the order specified by SPEC-18 §Approach Track A3 (lines 64-71). Each test follows Phase 9's existing format: a one-line failure trigger and a one-line repair direction. PASS requires a one-line rationale citing the world's specific element that satisfies the test (bare PASS without rationale is FAIL per CLAUDE.md skill discipline; Track A3 introduces this PASS/FAIL+rationale format alongside the existing rejection-trigger format).

The eight tests:

| Test | FOUNDATIONS / Pattern source | What it asks |
|---|---|---|
| Counterfactual | FOUNDATIONS §Acceptance Tests #1 | Why this world and not a nearby alternative? Name ≥1 nearby alternative the world rejected and the constraint that forced it. |
| Inequality structure | FOUNDATIONS §Acceptance Tests #4 | What forms of inequality are structurally produced (not merely culturally permitted)? Name ≥2. |
| Embodiment-forces | FOUNDATIONS §Acceptance Tests #6 | What does embodiment force? Name ≥1 species / body-class / kinship consequence the embodiment-departures impose. |
| Scarcity-forces | FOUNDATIONS §Acceptance Tests #7 | What does scarcity force? Name the scarcest survival variable and ≥1 institutional / cultural consequence it produces. |
| Multi-perspective | FOUNDATIONS §Acceptance Tests #11 | Would a child / laborer / priest / smuggler / ruler each think the world fundamentally is the same thing? If they would all agree, the world has insufficient social-class divergence. |
| One-Sentence Fertility | Pattern #1, #98 | Can the world be reduced to one impossible sentence that GENERATES consequences in every direction? Vague wonders ("magic exists", "technology is advanced") fail; concrete impossibilities ("dragons anchor cities against earthquakes", "women dissolve at twenty") pass. |
| Native Story Procedures | Pattern #66, #71 | Name ≥3 story procedures (case / heist / expedition / hunt / dive / scavenge / pilgrimage / audit / ritual / patrol) impossible to reskin into another world. The world's native mode of investigation. |
| Genesis spectator-caste check | FOUNDATIONS §Acceptance Tests #8 / Rule 11 (No Spectator Castes by Accident) | If `requiresExceptionGovernance(CF-0001.type)` is true (`capability` / `bloodline` / `magic_practice` / `technology` / `divine_action` / `artifact_dependent_truth` / `exception_introducing_fact`), verify CF-0001's `notes` field contains a `leverage:`-prefixed line enumerating ≥3 forms drawn from the permissible enum (`locality`, `secrecy`, `legitimacy`, `bureaucracy`, `numbers`, `ritual_authority`, `domain_expertise`, `access`, `timing`, `social_trust`, `deniability`, `infrastructural_control`). PASS rationale must name the leverage forms. If `requiresExceptionGovernance(CF-0001.type)` is false, PASS trivially with the rationale citing the type and noting the test is conditional. Phase 9 catches the malformed leverage block before the Phase 10 HARD-GATE; the mechanical `rule11_action_space` validator backstops at Phase 11 engine pre-apply. |

Update the introductory prose for the appended block to read "Track A3 amends Phase 9's rejection-test list to add eight new tests; each fires as judgment-only (consistent with Phase 9's existing test discipline — none are validator-bound at Phase-9 time, though the eighth test mirrors the mechanical `rule11_action_space` validator's logic so Phase 9 catches a malformed leverage block before the Phase 10 HARD-GATE rather than at the Phase 11 engine pre-apply pass)."

### 2. §Validation Rules This Skill Upholds — Add FOUNDATIONS §Acceptance Tests entry

Add a new entry to the §Validation Rules This Skill Upholds bulleted list:

> **FOUNDATIONS §Acceptance Tests** — Phase 9 exercises 9 of 11 Acceptance Tests inline (6 net-new in this SPEC: AT #1 Counterfactual, AT #4 Inequality structure, AT #6 Embodiment-forces, AT #7 Scarcity-forces, AT #8 Genesis spectator-caste check / Rule 11, AT #11 Multi-perspective; 3 partial holdovers via existing rejection triggers: AT #2 powers not optimized away, AT #3 capabilities not mundane, AT #5 geography forces). AT #9 ('What do people falsely believe?') is enforced at canon-addition Phase 14a Test 13 (delivered by SPEC18GENFER-004). AT #10 ('What contradictions are permitted because they are diegetic rather than ontological?') is N/A at fact-creation time and emerges only at world-growth time — currently unchecked, deferred to a future spec. Failure on any test routes back to the responsible upstream phase (Phase 2 / 4 / 8 typically).

## Files to Touch

- `.claude/skills/create-base-world/SKILL.md` (modify)

## Out of Scope

- Phase 4 substantive section requirement (delivered by SPEC18GENFER-001)
- Phase 8 schema population (delivered by SPEC18GENFER-002)
- canon-addition Phase 0 misrecognition probe + Phase 14a Test 13 + PA structure (delivered by SPEC18GENFER-004)
- Promotion of Phase 9 self-validation tests to mechanical validators — explicit non-goal per SPEC-18 §Out of Scope (judgment-only by design)
- AT #10 ("diegetic contradictions permitted") coverage — explicitly deferred to a future spec per the §Validation Rules entry

## Acceptance Criteria

### Tests That Must Pass

1. `grep -E "Counterfactual|Inequality structure|Embodiment-forces|Scarcity-forces|Multi-perspective|One-Sentence Fertility|Native Story Procedures|Genesis spectator-caste check" .claude/skills/create-base-world/SKILL.md` returns ≥8 distinct matches
2. `grep -F "Phase 9 exercises 9 of 11 Acceptance Tests" .claude/skills/create-base-world/SKILL.md` returns 1 match
3. `grep -F "add eight new tests" .claude/skills/create-base-world/SKILL.md` returns 1 match
4. `grep -F "rule11_action_space" .claude/skills/create-base-world/SKILL.md` returns 1+ match (Genesis spectator-caste row references the validator)
5. Skill dry-run: invoke create-base-world with CF-0001 type=`capability` and empty leverage block — Phase 9 must reject with the Genesis spectator-caste check rationale
6. Skill dry-run: invoke create-base-world with CF-0001 type=`geography` and empty leverage block — Phase 9 must PASS the Genesis spectator-caste check trivially with conditional rationale
7. Skill dry-run: invoke create-base-world with CF-0001 statement "magic exists" — Phase 9 must reject (One-Sentence Fertility test)

### Invariants

1. All 8 new tests appear in Phase 9 in the order specified by SPEC-18 §Approach Track A3
2. Each new test follows the PASS+rationale discipline (bare PASS = FAIL per CLAUDE.md skill discipline)
3. The §Validation Rules entry accurately documents the 6 net-new ATs at Phase 9, 3 partial holdovers, AT #9 routing to canon-addition, AT #10 deferred
4. The Genesis spectator-caste check is conditional on `requiresExceptionGovernance(CF-0001.type)`; trivial PASS for non-exception-bearing types is the intended path

## Test Plan

### New/Modified Tests

1. None — documentation-only ticket; verification is command-based and existing pipeline coverage (the `rule11_action_space` validator and `record_schema_compliance` validator) is named in Assumption Reassessment.

### Commands

1. `grep -F "Genesis spectator-caste check" .claude/skills/create-base-world/SKILL.md`
2. `grep -F "9 of 11 Acceptance Tests" .claude/skills/create-base-world/SKILL.md`
3. `grep -F "add eight new tests" .claude/skills/create-base-world/SKILL.md`
4. `grep -nE "Acceptance Tests #[0-9]+" .claude/skills/create-base-world/SKILL.md` (confirms FOUNDATIONS-AT-numbered citations land verbatim)
