# SPEC27FOUCAN-002: Rule Numbering and Enforcement Map

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `docs/FOUNDATIONS.md` (§Validation Rules). No code or skill changes.
**Deps**: None

## Problem

`docs/FOUNDATIONS.md` §Validation Rules defines Rules 1-7, then jumps to 11-12; Rules 9 and 10 are only referenced, Rule 8 and Rule 13 are absent. The gap is intentional — `archive/specs/SPEC-09-canon-safety-expansion.md` rejected Rule 8 (folding it into the §Core Principle "Default Reality" paragraph) and demoted Rules 9/10 to cross-reference notes while keeping the externally-proposed numbers 11/12 — but FOUNDATIONS records none of this, so every new spec must reverse-engineer the gap. Separately, `canon-addition`'s internal "Validation Tests" are a distinct numbering scheme colliding at 11-13 (`docs/WORKFLOWS.md` cites "Test 13"; there is no Rule 13), inviting mistaken cross-references.

## Assumption Reassessment (2026-05-14)

1. `tools/validators/src/rules/` ships `rule1`–`rule7`, `rule11`, `rule12` validator files (no `rule3`, `rule8`, `rule9`, `rule10`, `rule13`); `tools/validators/src/public/registry.ts` `ruleValidators` confirms the set. Rule 3 is judgment-only (no validator). Confirmed via the SPEC-27 brainstorm verification pass.
2. `archive/specs/SPEC-09-canon-safety-expansion.md` documents the rejected-Rule-8 / demoted-9-10 decision; `canon-addition/SKILL.md` enumerates 14 numbered "Validation Tests" with Test 13 = misrecognition probe (mapping to FOUNDATIONS §Acceptance Tests #9, not to a Rule); `docs/WORKFLOWS.md` cites "Test 13". All confirmed in-context.
3. Shared boundary under audit: the FOUNDATIONS §Validation Rules numbering, which `canon-addition`, `character-generation`, `diegetic-artifact-generation`, and every future spec cite by number. The map is a documentation contract — it changes no validator behavior.
4. FOUNDATIONS principle under audit: §Validation Rules as a stable-reference contract. The map asserts no skill may cite a rule number whose meaning is not declared, and that skill-internal "Validation Tests" are not FOUNDATIONS "Validation Rules".

## Architecture Check

1. A single in-place enforcement map is cleaner than leaving the gap's rationale stranded in an archived spec — future spec authors get the answer from FOUNDATIONS itself rather than reverse-engineering it.
2. No backwards-compatibility aliasing — the map documents existing numbering; it renumbers nothing.

## Verification Layers

1. The map declares Rules 1-7/11/12, the 8/9/10/13 disposition, Rule 3's judgment-only status, and the Rule-vs-Test distinction -> manual review against `archive/specs/SPEC-09-canon-safety-expansion.md` + `tools/validators/src/rules/`.
2. No new "Rule 13" is minted; the map documents the existing Test 13 ↔ §Acceptance Tests #9 linkage instead -> FOUNDATIONS alignment check.
3. Single-artifact documentation ticket — only `docs/FOUNDATIONS.md` §Validation Rules is edited; no cross-skill invariant to map, so layers 1-2 cover the full proof surface.

## What to Change

### 1. Add the Rule Numbering and Enforcement Map

- At the top of `docs/FOUNDATIONS.md` §Validation Rules, add a "Rule Numbering and Enforcement Map" subsection stating: Rules 1-7/11/12 are the defined rules (each with name + enforcement surface — validator file, skill phase, or "judgment-only, no validator" for Rule 3); Rule 8 was rejected (SPEC-09) and folded into §Core Principle "Default Reality"; Rules 9/10 are demoted-to-cross-reference-note status, enforced by named skill phases; no skill may cite a rule number not declared here.

### 2. Document the Rule-vs-Test distinction

- The same subsection states that `canon-addition`'s numbered "Validation Tests" are a distinct scheme from FOUNDATIONS "Validation Rules" — Test N is not Rule N — and that `canon-addition` Validation Test 13 (misrecognition probe) maps to FOUNDATIONS §Acceptance Tests #9, not to any Rule. No new "Rule 13" is minted.

## Files to Touch

- `docs/FOUNDATIONS.md` (modify)

## Out of Scope

- Minting a new "Rule 13: No Perfect Recognition by Default" — rejected per spec §Out of Scope; misrecognition is already enforced via SPEC-18 (canon-addition Phase 0 probe + Test 13 + `epistemic_profile`).
- Renumbering any existing rule; adding a `rule8` / `rule9` / `rule10` / `rule13` validator.
- Editing `docs/WORKFLOWS.md`'s "Test 13" reference — it is correct as a Test reference; SPEC27FOUCAN-009 reconciles `WORKFLOWS.md` if needed.

## Acceptance Criteria

### Tests That Must Pass

1. A reader can determine, from `docs/FOUNDATIONS.md` §Validation Rules alone, why Rules 8/9/10/13 are absent and that a "Validation Test" number is not a "Validation Rule" number.
2. `grep -n "Rule Numbering and Enforcement Map" docs/FOUNDATIONS.md` returns the new subsection.

### Invariants

1. The map enumerates exactly the rules that exist (1-7, 11, 12) plus the explicit disposition of 8/9/10/13 — no phantom rule is declared.
2. No FOUNDATIONS "Rule 13" exists after this ticket.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and existing pipeline coverage (the rule1–rule7/rule11/rule12 validator file set) is named in Assumption Reassessment.`

### Commands

1. `grep -nE "Rule (8|9|10|13)" docs/FOUNDATIONS.md` — expect only the map's disposition lines, no rule definition.
2. `ls tools/validators/src/rules/` — confirm the validator set matches the map (`rule1`–`rule7`, `rule11`, `rule12`).
