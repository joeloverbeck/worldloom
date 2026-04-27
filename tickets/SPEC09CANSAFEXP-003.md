# SPEC09CANSAFEXP-003: Rule 11 + Rule 12 validators and CLI rule-filter regex extension

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `tools/validators/src/rules/rule11-action-space.ts` (new); `tools/validators/src/rules/rule12-redundancy.ts` (new); `tools/validators/src/public/registry.ts` registers both validators in `ruleValidators`; `tools/validators/src/cli/_helpers.ts` extends `RULE_FILTER_PATTERN` and `--rules` help-text rule list to accept 11 and 12.
**Deps**: `archive/tickets/SPEC09CANSAFEXP-001.md`, SPEC09CANSAFEXP-002

## Problem

SPEC-09 Move 1 adds Rules 11 (No Spectator Castes by Accident) and 12 (No Single-Trace Truths). FOUNDATIONS.md declares the rules (delivered by `archive/tickets/SPEC09CANSAFEXP-001.md`), and the CF schema will encode the data shape they read (delivered by SPEC09CANSAFEXP-002). This ticket adds the executable rule validators that consume the schema-validated CF and emit Rule 11 / Rule 12 verdicts. Both validators must be invocable through `world-validate <slug> --rules=11` / `--rules=12` (or combined `--rules=11,12`), and the CLI's `RULE_FILTER_PATTERN` regex (currently `/^([124567])(?:,([124567]))*$/`, confirmed at `tools/validators/src/cli/_helpers.ts:33`) must be extended to accept these rule numbers. Without this ticket the rules are documentation-only.

## Assumption Reassessment (2026-04-27)

1. `tools/validators/src/rules/` currently contains rule1, rule2, rule4, rule5, rule6, rule7 (rule3 is unmechanized per archived SPEC-04 §Risks; canon-addition/SKILL.md:108 confirms Rule 3 is judgment-only). New files `rule11-action-space.ts` and `rule12-redundancy.ts` follow the existing rule-validator naming and surface convention.
2. `tools/validators/src/public/registry.ts` exports `ruleValidators` as a `readonly Validator[]`, currently registering 6 rule validators. SPEC09CANSAFEXP-003 adds 2 entries.
3. `tools/validators/src/cli/_helpers.ts` declares `RULE_FILTER_PATTERN = /^([124567])(?:,([124567]))*$/` at line 33 and references it in `validateOptions()`. Help-text at the same file declares "Comma-separated rule numbers (1,2,4,5,6,7)" — both must be updated to include 11 and 12.
4. **Cross-skill / cross-artifact boundary under audit**: this ticket extends the `ruleValidators` registry. Consumers of the registry — `world-validate` CLI, `validatePatchPlan` pre-apply gate, `selectValidators()` helper — pick up the new validators automatically once registered. Hook 5 stays structural-only per Q3=(b), so no Hook 5 update needed.
5. **FOUNDATIONS principle motivating this ticket**: Rule 11 mechanizes "specialness must be balanced by ordinary-actor leverage" — extending Rule 3's judgment-only specialness check with a leverage-enumeration check that IS mechanizable. Rule 12 mechanizes "core truths leave traces in multiple registers" — directly instantiating Rule 5 (No Consequence Evasion) at canon level.
6. **Schema dependency**: Rule 11 reads `cf.exception_governance` (populated form) for activation-conditions/rate-limits/mobility-limits/etc. AND looks for ≥3 leverage entries. Rule 12 reads `cf.status` (hard_canon trigger) and cross-references the world-index for trace-register coverage across SEC records. Both validators depend on SPEC09CANSAFEXP-002 having landed the schema extensions.
7. **Mechanizable vs judgment surface (per /reassess-spec finding M3)**: Rule 11's mechanizable layer checks `≥3 entries from the permissible-forms enum`; the judgment layer ("each leverage entry tied to a concrete in-world mechanism") stays in canon-addition skill prose, NOT in the validator. Same shape as Phase 14a Test 8's mechanical/judgment split.
8. **Rename/removal blast radius**: `RULE_FILTER_PATTERN` is referenced only at `tools/validators/src/cli/_helpers.ts` (one site). Help-text "1,2,4,5,6,7" appears in the same file. Pipeline-wide grep for `(1,2,4,5,6,7)` and `RULE_FILTER_PATTERN` confirms no external callers — this is a single-file regex extension.

## Architecture Check

1. Per-rule validator modules following the existing rule-validator pattern (one file per rule, registered in `public/registry.ts`) keep the validator surface uniform. Bundling Rule 11 and Rule 12 into a single module would conflate two distinct semantic concerns (action-space integrity vs trace redundancy) and complicate test isolation.
2. The CLI regex extension is bundled with the validators because the CLI surface and the validator existence are tightly coupled — a `--rules=11` invocation that fails the regex would never reach the validator dispatch logic. Splitting them would create a window where rules 11/12 exist but cannot be invoked through the CLI.
3. No backwards-compatibility shims introduced. `RULE_FILTER_PATTERN` is extended in place; existing rule-number invocations (`--rules=1,2,4`) remain valid.

## Verification Layers

1. `RULE_FILTER_PATTERN` accepts `11`, `12`, `11,12`, `1,11`, etc. — codebase grep-proof + unit test of `validateOptions()` with the new inputs.
2. `--rules=11` CLI invocation runs only the `rule11_action_space` validator on a fixture world — skill dry-run via `world-validate fixture-world --rules=11 --json`.
3. `--rules=12` CLI invocation runs only the `rule12_redundancy` validator — skill dry-run via `world-validate fixture-world --rules=12 --json`.
4. Rule 11 mechanizable check: capability-type CF with `exception_governance` populated but lacking ≥3 leverage entries from the permissible-forms enum FAILS — schema validation + rule-validator dry-run.
5. Rule 12 mechanizable check: hard-canon core-truth CF lacking ≥2 trace-register entries (cross-referenced via world-index) FAILS — rule-validator dry-run + world-index integration.
6. Animalia regression: all 48 existing CFs pass `world-validate animalia --rules=11,12 --json` because the grandfather clause permits historical CFs without leverage / trace-register declarations — codebase grep-proof + animalia dry-run.

## What to Change

### 1. `tools/validators/src/rules/rule11-action-space.ts` (new)

Implement the validator following the existing `rule5-no-consequence-evasion.ts` pattern:

- Export a `Validator` named `rule11_action_space` whose `applies_to(ctx)` predicate fires on every CF whose `type` matches the capability/exception-introducing taxonomy (importable from `@worldloom/validators/structural/record-schema-compliance` per SPEC09CANSAFEXP-002's exported helper `requiresExceptionGovernance`).
- For each applicable CF, parse `cf.exception_governance` (populated form). The validator OWNs the leverage-list location decision: prefer reading from a structured field if SPEC09CANSAFEXP-002 declared one; otherwise parse from `cf.notes` (transitional). Document the location explicitly in the validator's emitted `findings[].evidence` field.
- Mechanizable check: count leverage entries; assert ≥3; assert each entry matches the permissible-forms enum (`locality`, `secrecy`, `legitimacy`, `bureaucracy`, `numbers`, `ritual_authority`, `domain_expertise`, `access`, `timing`, `social_trust`, `deniability`, `infrastructural_control`).
- Judgment surface stays out: do NOT attempt to validate that each leverage entry "ties to a concrete in-world mechanism" — that's canon-addition Phase 14a Test 11's responsibility (delivered by SPEC09CANSAFEXP-004).
- Emit `pass | fail` verdicts with structured `findings[]` per the existing rule-validator framework convention.

### 2. `tools/validators/src/rules/rule12-redundancy.ts` (new)

Implement the validator following the existing rule-validator pattern:

- Export a `Validator` named `rule12_redundancy` whose `applies_to(ctx)` predicate fires on every CF whose `status === 'hard_canon'` AND whose `truth_scope.world_level === true` (hard-canon core truth).
- For each applicable CF, cross-reference the world-index via the `Context.index` read surface to count distinct trace-register coverage: query SEC records (across `_source/everyday-life/`, `_source/institutions/`, `_source/economy-and-resources/`, etc.) for `touched_by_cf` references back to the CF, then classify each touching SEC by trace register (law / ritual / architecture / slang / ledgers / funerary / landscape / bodily-scars / supply-chains / songs / maps / educational-customs / bureaucratic-forms / other-named).
- Mechanizable check: count distinct registers; assert ≥2 distinct trace registers per the SPEC-09 §Open Question 2 descriptive list.
- Hidden-truth carve-out: if the CF cites a Mystery Reserve entry (via `source_basis.derived_from` containing an `M-NNNN` ID), apply the carve-out — Rule 12 PASSES with rationale.
- Emit `pass | fail` verdicts.

### 3. `tools/validators/src/public/registry.ts` — register both validators

Append to `ruleValidators`:

```ts
import { rule11ActionSpace } from "../rules/rule11-action-space.js";
import { rule12Redundancy } from "../rules/rule12-redundancy.js";

export const ruleValidators: readonly Validator[] = [
  rule1NoFloatingFacts,
  rule2NoPureCosmetics,
  rule4NoGlobalizationByAccident,
  rule5NoConsequenceEvasion,
  rule6NoSilentRetcons,
  rule7MysteryReservePreservation,
  rule11ActionSpace,
  rule12Redundancy
];
```

### 4. `tools/validators/src/cli/_helpers.ts` — extend RULE_FILTER_PATTERN and help text

Replace the current pattern at line 33:

```ts
const RULE_FILTER_PATTERN = /^([124567])(?:,([124567]))*$/;
```

with:

```ts
const RULE_FILTER_PATTERN = /^(?:1[12]|[124567])(?:,(?:1[12]|[124567]))*$/;
```

This accepts single-digit `1,2,4,5,6,7` and two-digit `11,12` in any combination.

Update the help-text string in `printHelp()` (the `--rules=<list>` line) from "Comma-separated rule numbers (1,2,4,5,6,7)" to "Comma-separated rule numbers (1,2,4,5,6,7,11,12)". Update the validation error message similarly: "1,2,4,5,6,7,11,12".

### 5. `tools/validators/tests/`

Add test fixtures and test cases:
- `tests/rules/rule11-action-space.test.ts` (new) — capability-type CF passing/failing the leverage check.
- `tests/rules/rule12-redundancy.test.ts` (new) — hard-canon core-truth CF passing/failing the trace-register count, including the hidden-truth carve-out.
- `tests/cli/rule-filter-pattern.test.ts` (modify or new) — exercise the new regex with `11`, `12`, `11,12`, `1,11`, `1,2,11,12`, plus rejection cases (`13`, `21`, `0`).

## Files to Touch

- `tools/validators/src/rules/rule11-action-space.ts` (new)
- `tools/validators/src/rules/rule12-redundancy.ts` (new)
- `tools/validators/src/public/registry.ts` (modify) — append two new validators
- `tools/validators/src/cli/_helpers.ts` (modify) — extend regex + help text + error message
- `tools/validators/tests/rules/rule11-action-space.test.ts` (new)
- `tools/validators/tests/rules/rule12-redundancy.test.ts` (new)
- `tools/validators/tests/cli/rule-filter-pattern.test.ts` (new or modify if existing)
- `tools/validators/tests/fixtures/` — add fixtures named per the test cases above

## Out of Scope

- Schema extension (delivered by SPEC09CANSAFEXP-002; this ticket consumes the conditionally-mandatory blocks)
- Skill-side judgment layer for Rule 11 ("each leverage entry tied to a concrete in-world mechanism") — delivered by SPEC09CANSAFEXP-004 in canon-addition Phase 14a Test 11
- Hook 5 invocation — Hook 5 stays structural-only per Q3=(b); rule validators 11/12 run via pre-apply `validatePatchPlan` and direct `world-validate --rules=11,12` invocations
- Trace-register taxonomy canonicalization (SPEC-09 §Open Question 2 — descriptive list for v1; canonicalize later if false-positive/false-negative rates are high)
- continuity-audit silent-area-canonization check (delivered by SPEC09CANSAFEXP-005)

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/validators && npm test` — full validator test suite passes including new tests for rule11, rule12, and the extended `RULE_FILTER_PATTERN`.
2. `node tools/validators/dist/src/cli/world-validate.js --help` from repo root — help text shows `--rules=11`, `--rules=12`, `--rules=11,12` as accepted.
3. `node tools/validators/dist/src/cli/world-validate.js animalia --rules=11 --json` from repo root — animalia regression: all 48 historical CFs PASS Rule 11 (grandfather clause holds: capability-type historical CFs grandfathered via `audits/validation-grandfathering.yaml`).
4. `node tools/validators/dist/src/cli/world-validate.js animalia --rules=12 --json` from repo root — same regression for Rule 12.
5. Synthetic fixture: capability-type CF with `exception_governance` populated but only 2 leverage entries → rule11 FAILS with a message naming the count shortfall.
6. Synthetic fixture: hard-canon core-truth CF with only 1 trace register → rule12 FAILS with a message naming the count shortfall.
7. Synthetic fixture: hard-canon core-truth CF citing a Mystery Reserve entry in `source_basis.derived_from` → rule12 PASSES with the hidden-truth carve-out rationale.

### Invariants

1. The 6 existing rule validators (rule1, rule2, rule4, rule5, rule6, rule7) continue to pass on animalia post-extension. Rule 3 remains unmechanized.
2. `RULE_FILTER_PATTERN` accepts every valid rule combination: single rules, multi-rule lists, mixed single + double digit (e.g., `1,11`). Rejects invalid rule numbers (e.g., `3`, `13`, `0`).
3. `world-validate` exit codes preserved: 0 = all pass, 1 = ≥1 fail, 2 = invalid input, 3 = index missing.
4. New rule validators implement the standard `Validator` interface (per `tools/validators/src/framework/types.ts`) without ad-hoc extensions.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/rules/rule11-action-space.test.ts` (new) — happy-path PASS, count-shortfall FAIL, enum-mismatch FAIL, n_a-block PASS-trivially.
2. `tools/validators/tests/rules/rule12-redundancy.test.ts` (new) — happy-path PASS (≥2 registers), count-shortfall FAIL, hidden-truth carve-out PASS.
3. `tools/validators/tests/cli/rule-filter-pattern.test.ts` (new) — accept/reject matrix for the extended regex.

### Commands

1. `cd tools/validators && npm test` — package-local test suite.
2. `cd tools/validators && npm run build` — TypeScript compile (covers typecheck).
3. `node tools/validators/dist/src/cli/world-validate.js animalia --rules=11,12 --json` from repo root — animalia regression smoke test for both new rules.
