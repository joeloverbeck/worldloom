# SPEC09CANSAFEXP-003: Rule 11 + Rule 12 validators and CLI rule-filter regex extension

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `tools/validators/src/rules/rule11-action-space.ts` (new); `tools/validators/src/rules/rule12-redundancy.ts` (new); `tools/validators/src/public/registry.ts` registers both validators in `ruleValidators`; `tools/validators/src/cli/_helpers.ts` extends `RULE_FILTER_PATTERN` and `--rules` help-text rule list to accept 11 and 12; package-local tests and user-facing validator docs updated.
**Deps**: `archive/tickets/SPEC09CANSAFEXP-001.md`, `archive/tickets/SPEC09CANSAFEXP-002.md`

## Problem

SPEC-09 Move 1 adds Rules 11 (No Spectator Castes by Accident) and 12 (No Single-Trace Truths). FOUNDATIONS.md declares the rules (delivered by `archive/tickets/SPEC09CANSAFEXP-001.md`), and the CF schema encodes the data shape they read (delivered by `archive/tickets/SPEC09CANSAFEXP-002.md`). At intake, the executable rule validators were absent, so Rule 11 / Rule 12 were documentation-only and `world-validate <slug> --rules=11` / `--rules=12` could not pass CLI option validation.

## Assumption Reassessment (2026-04-27)

1. At intake, `tools/validators/src/rules/` contained rule1, rule2, rule4, rule5, rule6, rule7 (rule3 is unmechanized per archived SPEC-04 §Risks; canon-addition/SKILL.md:108 confirms Rule 3 is judgment-only). New files `rule11-action-space.ts` and `rule12-redundancy.ts` follow the existing rule-validator naming and surface convention.
2. At intake, `tools/validators/src/public/registry.ts` exported `ruleValidators` as a `readonly Validator[]` registering 6 rule validators. SPEC09CANSAFEXP-003 adds 2 entries.
3. At intake, `tools/validators/src/cli/_helpers.ts` declared `RULE_FILTER_PATTERN = /^([124567])(?:,([124567]))*$/` and help text declared "Comma-separated rule numbers (1,2,4,5,6,7)" — both were updated to include 11 and 12.
4. **Cross-skill / cross-artifact boundary under audit**: this ticket extends the `ruleValidators` registry. Consumers of the registry — `world-validate` CLI, `validatePatchPlan` pre-apply gate, `selectValidators()` helper — pick up the new validators automatically once registered. Hook 5 stays structural-only per Q3=(b), so no Hook 5 update needed.
5. **FOUNDATIONS principle motivating this ticket**: Rule 11 mechanizes "specialness must be balanced by ordinary-actor leverage" — extending Rule 3's judgment-only specialness check with a leverage-enumeration check that IS mechanizable. Rule 12 mechanizes "core truths leave traces in multiple registers" — directly instantiating Rule 5 (No Consequence Evasion) at canon level.
6. **Schema dependency**: Rule 11 reads `cf.exception_governance` (populated form) for activation-conditions/rate-limits/mobility-limits/etc. AND looks for ≥3 leverage entries. Rule 12 reads `cf.status` (hard_canon trigger) and cross-references the world-index for trace-register coverage across SEC records. Both validators depend on `archive/tickets/SPEC09CANSAFEXP-002.md` having landed the schema extensions.
7. **Mechanizable vs judgment surface (per /reassess-spec finding M3)**: Rule 11's mechanizable layer checks `≥3 entries from the permissible-forms enum`; the judgment layer ("each leverage entry tied to a concrete in-world mechanism") stays in canon-addition skill prose, NOT in the validator. Same shape as Phase 14a Test 8's mechanical/judgment split.
8. **Rename/removal blast radius**: `RULE_FILTER_PATTERN` is referenced only at `tools/validators/src/cli/_helpers.ts` (one site). Help-text "1,2,4,5,6,7" appears in the same file. Pipeline-wide grep for `(1,2,4,5,6,7)` and `RULE_FILTER_PATTERN` confirms no external callers — this is a single-file regex extension.
9. SPEC09CANSAFEXP-002 did not add a structured `exception_governance.leverage` field. The landed Rule 11 validator therefore uses the transitional path allowed by SPEC-09: an explicit leverage list in `cf.notes`. It leaves the concrete-mechanism judgment layer to SPEC09CANSAFEXP-004.
10. SEC records do not have a dedicated trace-register field. The landed Rule 12 validator classifies trace registers from text in touched SEC headings, bodies, and extension labels/bodies, using the descriptive SPEC-09 v1 register list plus `other named register` markers.
11. Historical animalia CFs lack the new SPEC-09 canon-safety blocks by policy. Rule 11 / Rule 12 preserve the grandfather clause by skipping historical CFs without `epistemic_profile` or `exception_governance` in full-world mode; current-write block presence remains enforced by `record_schema_compliance`.

## Architecture Check

1. Per-rule validator modules following the existing rule-validator pattern (one file per rule, registered in `public/registry.ts`) keep the validator surface uniform. Bundling Rule 11 and Rule 12 into a single module would conflate two distinct semantic concerns (action-space integrity vs trace redundancy) and complicate test isolation.
2. The CLI regex extension is bundled with the validators because the CLI surface and the validator existence are tightly coupled — a `--rules=11` invocation that fails the regex would never reach the validator dispatch logic. Splitting them would create a window where rules 11/12 exist but cannot be invoked through the CLI.
3. No backwards-compatibility shims introduced. `RULE_FILTER_PATTERN` is extended in place; existing rule-number invocations (`--rules=1,2,4`) remain valid.

## Verification Layers

1. `RULE_FILTER_PATTERN` accepts `11`, `12`, `11,12`, `1,11`, etc. — codebase grep-proof + unit test of `validateOptions()` with the new inputs.
2. `--rules=11` CLI invocation runs only the `rule11_action_space` validator on animalia — targeted tool command via `world-validate animalia --rules=11 --json`.
3. `--rules=12` CLI invocation runs only the `rule12_redundancy` validator — targeted tool command via `world-validate animalia --rules=12 --json`.
4. Rule 11 mechanizable check: capability-type CF with `exception_governance` populated but lacking ≥3 leverage entries from the permissible-forms enum FAILS — schema validation + rule-validator dry-run.
5. Rule 12 mechanizable check: hard-canon core-truth CF lacking ≥2 trace-register entries (cross-referenced via world-index) FAILS — rule-validator dry-run + world-index integration.
6. Animalia regression: all 48 existing CFs pass `world-validate animalia --rules=11,12 --json` because the grandfather clause permits historical CFs without leverage / trace-register declarations — codebase grep-proof + animalia dry-run.

## What to Change

### 1. `tools/validators/src/rules/rule11-action-space.ts` (new)

Implement the validator following the existing `rule5-no-consequence-evasion.ts` pattern:

- Export a `Validator` named `rule11_action_space` whose `applies_to(ctx)` predicate fires on every CF whose `type` matches the capability/exception-introducing taxonomy (import the source-module helper `requiresExceptionGovernance` from `../structural/record-schema-compliance.js`; `archive/tickets/SPEC09CANSAFEXP-002.md` did not add a package `exports` subpath for this internal helper).
- For each applicable CF, parse `cf.exception_governance` (populated form). The validator OWNs the leverage-list location decision: SPEC09CANSAFEXP-002 did not declare a structured leverage field, so the landed validator parses an explicit leverage list from `cf.notes` (transitional).
- Mechanizable check: count leverage entries; assert ≥3; assert each entry matches the permissible-forms enum (`locality`, `secrecy`, `legitimacy`, `bureaucracy`, `numbers`, `ritual_authority`, `domain_expertise`, `access`, `timing`, `social_trust`, `deniability`, `infrastructural_control`).
- Judgment surface stays out: do NOT attempt to validate that each leverage entry "ties to a concrete in-world mechanism" — that's canon-addition Phase 14a Test 11's responsibility (delivered by SPEC09CANSAFEXP-004).
- Emit standard framework `Verdict[]` failures with rule-specific codes.

### 2. `tools/validators/src/rules/rule12-redundancy.ts` (new)

Implement the validator following the existing rule-validator pattern:

- Export a `Validator` named `rule12_redundancy` whose `applies_to(ctx)` predicate fires on every CF whose `status === 'hard_canon'` AND whose `truth_scope.world_level === true` (hard-canon core truth).
- For each applicable CF, cross-reference the world-index via the `Context.index` read surface to count distinct trace-register coverage: query SEC records (across `_source/everyday-life/`, `_source/institutions/`, `_source/economy-and-resources/`, etc.) for `touched_by_cf` references back to the CF, then classify each touching SEC by trace register (law / ritual / architecture / slang / ledgers / funerary / landscape / bodily-scars / supply-chains / songs / maps / educational-customs / bureaucratic-forms / other-named).
- Mechanizable check: count distinct registers; assert ≥2 distinct trace registers per the SPEC-09 §Open Question 2 descriptive list.
- Hidden-truth carve-out: if the CF cites a Mystery Reserve entry (via `source_basis.derived_from` containing an `M-NNNN` ID), apply the carve-out — Rule 12 PASSES with rationale.
- Emit standard framework `Verdict[]` failures with rule-specific codes.

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

Add synthetic test cases:
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
- `tools/validators/tests/rules/registry.test.ts` (modify) — 8-validator rule registry assertion
- `tools/validators/tests/integration/spec04-verification.test.ts` (modify) — validator-count and rule-name assertions
- `tools/validators/README.md` (modify) — rule inventory and CLI example
- `tools/validators/package.json` (modify) — package description no longer says Rule 1-7 only
- `docs/WORKFLOWS.md` (modify) — user-facing `--rules` list
- `specs/SPEC-09-canon-safety-expansion.md` (modify) — CLI extension wording truthed after landing
- `specs/IMPLEMENTATION-ORDER.md` (modify) — SPEC-09 Phase 2.5 status/order truthing

## Out of Scope

- Schema extension (delivered by `archive/tickets/SPEC09CANSAFEXP-002.md`; this ticket consumes the conditionally-mandatory blocks)
- Skill-side judgment layer for Rule 11 ("each leverage entry tied to a concrete in-world mechanism") — delivered by SPEC09CANSAFEXP-004 in canon-addition Phase 14a Test 11
- Hook 5 invocation — Hook 5 stays structural-only per Q3=(b); rule validators 11/12 run via pre-apply `validatePatchPlan` and direct `world-validate --rules=11,12` invocations
- Trace-register taxonomy canonicalization (SPEC-09 §Open Question 2 — descriptive list for v1; canonicalize later if false-positive/false-negative rates are high)
- continuity-audit silent-area-canonization check (delivered by SPEC09CANSAFEXP-005)

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/validators && npm test` — full validator test suite passes including new tests for rule11, rule12, and the extended `RULE_FILTER_PATTERN`.
2. `node tools/validators/dist/src/cli/world-validate.js --help` from repo root — help text shows `1,2,4,5,6,7,11,12` as accepted rule numbers.
3. `node tools/validators/dist/src/cli/world-validate.js animalia --rules=11 --json` from repo root — animalia regression: all 48 historical CFs PASS Rule 11 (historical full-world validation permits pre-SPEC-09 CFs without the new leverage surface; no `audits/validation-grandfathering.yaml` row is expected for this).
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

1. `tools/validators/tests/rules/rule11-action-space.test.ts` (new) — happy-path PASS, count-shortfall FAIL, unlabeled-notes prose FAIL, enum-mismatch FAIL, n_a-block PASS-trivially.
2. `tools/validators/tests/rules/rule12-redundancy.test.ts` (new) — happy-path PASS (≥2 registers), count-shortfall FAIL, hidden-truth carve-out PASS, historical missing-block PASS.
3. `tools/validators/tests/cli/rule-filter-pattern.test.ts` (new) — accept/reject matrix for the extended regex.

### Commands

1. `cd tools/validators && npm test` — package-local test suite.
2. `cd tools/validators && npm run build` — TypeScript compile (covers typecheck).
3. `node tools/validators/dist/src/cli/world-validate.js animalia --rules=11,12 --json` from repo root — animalia regression smoke test for both new rules.

## Outcome

Completion date: 2026-04-27.

Outcome amended: 2026-04-27.

Implemented the Rule 11 / Rule 12 validator slice:

- Added `rule11_action_space`, reading the existing `requiresExceptionGovernance()` helper and enforcing at least three permissible ordinary-actor leverage forms from an explicit `cf.notes` leverage list when `exception_governance` is populated.
- Added `rule12_redundancy`, enforcing at least two distinct textual trace registers across SEC records that touch a hard-canon core-truth CF, with the Mystery Reserve `source_basis.derived_from` carve-out.
- Registered both validators, extended CLI `--rules` filtering/help/error text for `11` and `12`, and updated package-local docs plus the repo workflow quick reference.
- Added package-local tests for Rule 11, Rule 12, the CLI rule filter, and updated registry/integration expectations from 6 to 8 rule validators.
- Updated `specs/IMPLEMENTATION-ORDER.md` so the SPEC-09 Phase 2.5 validator addition is marked complete and the diagram includes the already-landed structural-schema step.
- Truthed the active SPEC-09 CLI-extension wording now that `RULE_FILTER_PATTERN` has landed.
- Resolved the post-ticket-review blocker by removing Rule 11's broad unlabeled-notes fallback: only explicit `cf.notes` lines containing `leverage` are parsed as the transitional mini-format. Added a regression test proving unlabeled prose containing three permissible enum words still fails with a zero-count shortfall.

## Verification Result

- `cd tools/validators && npm test` — passed; 71 tests passed.
- `cd tools/validators && npm run build` — passed.
- `node tools/validators/dist/src/cli/world-validate.js --help` — passed; help lists `1,2,4,5,6,7,11,12`.
- `node tools/validators/dist/src/cli/world-validate.js animalia --rules=11 --json` — passed with `fail_count: 0`, `validators_run: ["rule11_action_space"]`.
- `node tools/validators/dist/src/cli/world-validate.js animalia --rules=12 --json` — passed with `fail_count: 0`, `validators_run: ["rule12_redundancy"]`.
- `node tools/validators/dist/src/cli/world-validate.js animalia --rules=11,12 --json` — passed with `fail_count: 0`, `validators_run: ["rule11_action_space","rule12_redundancy"]`.

## Post-Ticket Review Blocker (2026-04-27)

- Resolved before archival: `rule11-action-space.ts` no longer scans unlabeled prose when no line contains `leverage`. Missing explicit leverage-list lines now yield `rule11.insufficient_leverage_forms` with `found 0`.
- Regression coverage added: `tools/validators/tests/rules/rule11-action-space.test.ts` now asserts that unlabeled prose containing `locality`, `secrecy`, and `legitimacy` still fails.

## Deviations

- No new YAML fixture files were added under `tools/validators/tests/fixtures/`; the new rule tests use synthetic in-memory records, which is the existing rule-test pattern and directly proves the owned validator behavior.
- Rule 11 uses the SPEC-09 transitional `cf.notes` leverage-list path because SPEC09CANSAFEXP-002 did not add a structured leverage field to `exception_governance`.
- Rule 12 classifies trace registers from touched SEC text and extension text because SEC schema has no dedicated trace-register field in this ticket.
- `tools/validators/dist/` and `tools/validators/node_modules/` were pre-existing ignored package artifacts and remain expected ignored package/build state after verification.
