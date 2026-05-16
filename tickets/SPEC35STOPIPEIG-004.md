# SPEC35STOPIPEIG-004: Rename expected_witness_coverage to non_propagation_tag_shape

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `tools/validators` (validator rename + registry update + tests) + cross-skill sweep (`branching-story-turn-cycle/SKILL.md`, `branching-story-health-audit/SKILL.md`) + cross-doc sweep (`tools/validators/README.md`, integration test, registry test)
**Deps**: `specs/SPEC-35-story-pipeline-eighth-iteration-fixes.md` D4

## Problem

`tools/validators/src/structural/expected-witness-coverage.ts` only validates `non_propagation:` tag syntax + closed-reason coverage; it does NOT compute direct/indirect expected witnesses from active `STSTAT.location/agency`, does NOT compare `group=` labels to computed witness groups, and does NOT verify BEL create/supersession coverage for those groups. The validator's name promises witness coverage; the validator's implementation performs tag-shape checking. This is overclaim drift — a future operator reading the validator name in the registry assumes coverage that isn't there.

Full witness coverage (the auditor's A4 "better change" path) is structurally cleaner but materially larger in scope; deferred to a follow-up validator-hardening-II spec per SPEC-35 §Risks & Open Questions. The immediate fix is to rename the validator to accurately describe what it does today: tag-shape checking on the `non_propagation:` token convention.

## Assumption Reassessment (2026-05-16)

1. `tools/validators/src/structural/expected-witness-coverage.ts:18-19` exports `expectedWitnessCoverage` with `name: "expected_witness_coverage"`. Codebase grep (Step 2) surfaces the following consumer sites: `tools/validators/src/public/registry.ts:6` (import) + `:46` (array entry); `tools/validators/tests/structural/expected-witness-coverage.test.ts` (entire file imports + test names); `tools/validators/tests/integration/validate-patch-plan.test.ts:126` (`execution.name === "expected_witness_coverage"`); `tools/validators/tests/structural/registry.test.ts:22` (string list entry); `tools/validators/README.md:45` (validator name bullet); `.claude/skills/branching-story-turn-cycle/SKILL.md` and `.claude/skills/branching-story-health-audit/SKILL.md` (skill-prose references to the validator name). All verified at Step 2.
2. SPEC-35 D4 names a 4-step rename (file + exported name + registry + test file) plus a 5th sweep step. Step 2 codebase validation expanded sweep to include `README.md`, `validate-patch-plan.test.ts`, `registry.test.ts` beyond the 2 skill files the spec enumerated; `.claude/skills/_shared-templates/story-state-contract.md` has zero hits (no contract-doc edit needed).
3. Cross-skill boundary under audit: the validator-name convention used across (a) the validator registry registration surface, (b) integration-test execution-name assertions, (c) story-pipeline skill-prose validator-listing surfaces, and (d) the validator's README docs entry. All sites must be updated in one ticket to preserve the registry's name-to-implementation invariant.
4. Rule 5 (No Consequence Evasion) motivates this ticket via the audit-trail discipline: a validator whose name promises witness coverage but only does tag-shape checking misleads a future operator reading the registry. Restated: the principle's enforcement surface (per FOUNDATIONS §Validation Rules §Rule 5 enforcement map) is `tools/validators/src/rules/rule5-no-consequence-evasion.ts` for the primary Rule-5 check; `non_propagation_tag_shape` is an adjacent discipline that enforces the SYNTACTIC precondition of the non-propagation-tag mechanism that Rule 5 surfaces use. The rename closes the audit-trail drift; the full witness-coverage validator (deferred to validator-hardening-II) would extend Rule 5 enforcement at structural-validator scope.
5. This ticket touches a Canon Safety Check surface (validator registry): the rename preserves the registered surface (same `applies_to` predicate, same fixtures, same enforcement semantics) — only the name changes. No Mystery Reserve firewall weakening; no semantic shift.
6. This ticket renames a validator surface — sweep blast radius per area: `tools/validators/` 7 sites (registry + 2 test files + integration test + structural test + README + the validator file itself); `.claude/skills/` 2 skill files (turn-cycle + health-audit); `docs/` zero; `specs/` zero (SPEC-35 itself is allowed to reference the old name in §Problem Statement/§Deliverables prose).

## Architecture Check

1. A clean rename (no alias) is structurally correct because all consumers are in-tree and updated in the same patch. Alternative considered: keep `expected_witness_coverage` as an alias for `non_propagation_tag_shape` during a deprecation window — rejected per spec §Key design decisions because aliasing is justified only for out-of-tree consumers (third-party plugins, external scripts); here, all consumers are static and the rename + sweep is a bounded operation.
2. No backwards-compatibility aliasing introduced. The validator's exported symbol, registered name, file path, and test-file path all change atomically; integration-test name assertions update to the new string; skill-prose references update to the new name with a one-time forward-pointer to the deferred full witness-coverage validator.

## Verification Layers

1. Validator file renamed + exported symbol renamed → codebase grep-proof: `grep -rnE 'expected_witness_coverage|expectedWitnessCoverage|expected-witness-coverage' tools/ .claude/skills/ docs/ | grep -v '/archive/' | grep -v '/dist/'` returns zero hits (the spec itself is allowed to reference the old name in its prose).
2. Registry registration uses new name → `grep -n 'nonPropagationTagShape\|non_propagation_tag_shape' tools/validators/src/public/registry.ts` returns matches at the import line and array-entry line.
3. Integration test uses new execution-name string → `grep -n "non_propagation_tag_shape" tools/validators/tests/integration/validate-patch-plan.test.ts` returns a match.
4. Skill-prose references updated with forward-pointer → 2 skill files contain `non_propagation_tag_shape` and a parenthetical pointing to SPEC-35 §Risks & Open Questions for the deferred full-coverage validator.
5. Full validator suite still passes → `npm test` in `tools/validators/`.

## What to Change

### 1. Rename validator file

`mv tools/validators/src/structural/expected-witness-coverage.ts tools/validators/src/structural/non-propagation-tag-shape.ts`

### 2. Rename exported validator name + add forward-pointer comment

In the renamed file (`non-propagation-tag-shape.ts`):
- Change `export const expectedWitnessCoverage: Validator = {` → `export const nonPropagationTagShape: Validator = {`.
- Change `name: "expected_witness_coverage"` → `name: "non_propagation_tag_shape"`.
- Update `validator: "expected_witness_coverage"` strings in `verdict.code`-emitting blocks (lines 108, 120) to `validator: "non_propagation_tag_shape"`.
- Add a top-of-file comment block:

```typescript
// This validator checks non_propagation: tag syntax and closed-reason coverage.
// Full witness coverage (computing direct/indirect witnesses from active STSTAT.location/agency,
// event kind/targets, BEL.basis.source_event) is planned for validator-hardening-II;
// see SPEC-35 §Risks & Open Questions.
```

### 3. Update registry

In `tools/validators/src/public/registry.ts`:
- Line 6: `import { expectedWitnessCoverage } from "../structural/expected-witness-coverage.js";` → `import { nonPropagationTagShape } from "../structural/non-propagation-tag-shape.js";`
- Line 46 (`structuralValidators` array entry): `expectedWitnessCoverage,` → `nonPropagationTagShape,`

### 4. Rename test file + update imports/strings

`mv tools/validators/tests/structural/expected-witness-coverage.test.ts tools/validators/tests/structural/non-propagation-tag-shape.test.ts`

In the renamed test file:
- Line 4 import: `import { expectedWitnessCoverage } from "../../src/structural/expected-witness-coverage.js";` → `import { nonPropagationTagShape } from "../../src/structural/non-propagation-tag-shape.js";`
- Update all `expectedWitnessCoverage.run(...)` and `expectedWitnessCoverage.applies_to(...)` references to `nonPropagationTagShape.run(...)` / `nonPropagationTagShape.applies_to(...)` (lines 8, 22, 35, 49, 50).
- Update all `test("expected_witness_coverage ...")` describe-block names to `test("non_propagation_tag_shape ...")` (lines 7, 21, 34, 48).

### 5. Update integration test

In `tools/validators/tests/integration/validate-patch-plan.test.ts:126`:
- Change `(execution) => execution.name === "expected_witness_coverage"` → `(execution) => execution.name === "non_propagation_tag_shape"`.

### 6. Update registry test

In `tools/validators/tests/structural/registry.test.ts:22`:
- Change the string entry `"expected_witness_coverage"` → `"non_propagation_tag_shape"`.

### 7. Update README

In `tools/validators/README.md:45`:
- Change the bullet `- expected_witness_coverage` → `- non_propagation_tag_shape`.

### 8. Update skill-prose references with one-time forward-pointer

In `.claude/skills/branching-story-turn-cycle/SKILL.md`:
- Replace each `expected_witness_coverage` reference with `non_propagation_tag_shape`.
- Add a ONE-TIME parenthetical at the FIRST reference site: `(full witness coverage planned but not yet implemented; see SPEC-35 §Risks & Open Questions)`.

In `.claude/skills/branching-story-health-audit/SKILL.md`:
- Same treatment: replace references; one-time parenthetical at the first occurrence.

## Files to Touch

- `tools/validators/src/structural/expected-witness-coverage.ts` → `tools/validators/src/structural/non-propagation-tag-shape.ts` (rename + edit)
- `tools/validators/tests/structural/expected-witness-coverage.test.ts` → `tools/validators/tests/structural/non-propagation-tag-shape.test.ts` (rename + edit)
- `tools/validators/src/public/registry.ts` (modify)
- `tools/validators/tests/integration/validate-patch-plan.test.ts` (modify)
- `tools/validators/tests/structural/registry.test.ts` (modify)
- `tools/validators/README.md` (modify)
- `.claude/skills/branching-story-turn-cycle/SKILL.md` (modify)
- `.claude/skills/branching-story-health-audit/SKILL.md` (modify)

## Out of Scope

- Full witness-coverage implementation (computing direct/indirect witnesses from active `STSTAT.location/agency`, event kind/targets, BEL `basis.source_event`) — deferred to validator-hardening-II spec per SPEC-35 §Risks & Open Questions.
- Aliasing the old name as a deprecated synonym — clean rename only.
- Changes to validator behavior — same fixtures, same `applies_to`, same diagnostics; only name changes.
- Edits to `.claude/skills/_shared-templates/story-state-contract.md` (zero hits per Step 2 grep).
- Edits to `docs/FOUNDATIONS.md` (zero hits).
- Edits to SPEC-35 itself (the spec is allowed to reference the old name in its §Problem Statement and §Deliverables prose).

## Acceptance Criteria

### Tests That Must Pass

1. `grep -rnE 'expected_witness_coverage|expectedWitnessCoverage|expected-witness-coverage' tools/ .claude/skills/ docs/ | grep -v '/archive/' | grep -v '/dist/' | grep -v 'SPEC-35'` returns zero hits.
2. `grep -nE 'nonPropagationTagShape|non_propagation_tag_shape' tools/validators/src/public/registry.ts` returns 2 matches (line 6 import + line 46 array entry).
3. Renamed `non-propagation-tag-shape.test.ts` tests still pass (same fixtures, same expectations, just new symbol name).
4. Integration test at `tools/validators/tests/integration/validate-patch-plan.test.ts` still passes with the renamed execution-name assertion.
5. Registry test at `tools/validators/tests/structural/registry.test.ts` still passes with the renamed string entry.
6. `npm test` in `tools/validators/` returns green.
7. Skill-prose grep `grep -nE 'non_propagation_tag_shape' .claude/skills/branching-story-{turn-cycle,health-audit}/SKILL.md` returns matches that include the one-time forward-pointer parenthetical at the FIRST occurrence in each file.

### Invariants

1. The validator's `applies_to` predicate, fixture coverage, and diagnostic codes are unchanged; only its name (file, exported symbol, registered name, test-file name) changes.
2. No skill prose claims `non_propagation_tag_shape` performs full witness coverage; the forward-pointer ensures future readers know full implementation is planned.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/non-propagation-tag-shape.test.ts` (renamed from `expected-witness-coverage.test.ts`; symbol/string updates only).
2. `tools/validators/tests/integration/validate-patch-plan.test.ts` (one-line execution-name update).
3. `tools/validators/tests/structural/registry.test.ts` (one-line string update).

### Commands

1. `cd tools/validators && npm test` — full validator suite, exercising the renamed validator via registry, structural tests, and integration tests.
2. `cd tools/validators && npm run build` — typechecks the rename (catches any missed import-path update).
3. `grep -rnE 'expected_witness_coverage|expectedWitnessCoverage|expected-witness-coverage' tools/ .claude/skills/ docs/ | grep -v '/archive/' | grep -v '/dist/' | grep -v 'SPEC-35'` — sweep verification command.
