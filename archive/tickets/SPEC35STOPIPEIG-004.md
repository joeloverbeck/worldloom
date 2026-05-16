# SPEC35STOPIPEIG-004: Rename expected_witness_coverage to non_propagation_tag_shape

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `tools/validators` (validator rename + registry update + tests) + cross-skill sweep (`branching-story-turn-cycle/SKILL.md`, `branching-story-health-audit/SKILL.md`, `spec-to-tickets/SKILL.md`) + cross-doc sweep (`tools/validators/README.md`, `docs/triage/2026-05-16-story-related-improvements-eighth-iteration-triage.md`, integration test, registry test)
**Deps**: `archive/specs/SPEC-35-story-pipeline-eighth-iteration-fixes.md` D4

## Problem

At intake, `tools/validators/src/structural/expected-witness-coverage.ts` only validated `non_propagation:` tag syntax + closed-reason coverage; it did NOT compute direct/indirect expected witnesses from active `STSTAT.location/agency`, did NOT compare `group=` labels to computed witness groups, and did NOT verify BEL create/supersession coverage for those groups. The validator's old name promised witness coverage while its implementation performed tag-shape checking. This was overclaim drift — a future operator reading the registry could assume coverage that was not there.

Full witness coverage (the auditor's A4 "better change" path) is structurally cleaner but materially larger in scope; deferred to a follow-up validator-hardening-II spec per SPEC-35 §Risks & Open Questions. The immediate fix is to rename the validator to accurately describe what it does today: tag-shape checking on the `non_propagation:` token convention.

## Assumption Reassessment (2026-05-16)

1. At intake, `tools/validators/src/structural/expected-witness-coverage.ts` exported `expectedWitnessCoverage` with `name: "expected_witness_coverage"`. Codebase grep surfaced the following live consumer sites: `tools/validators/src/public/registry.ts` (import + array entry); `tools/validators/tests/structural/expected-witness-coverage.test.ts` (imports + test names); `tools/validators/tests/integration/validate-patch-plan.test.ts` (execution-name assertion); `tools/validators/tests/structural/registry.test.ts` (registry-name list); `tools/validators/README.md` (validator-name bullet); `docs/triage/2026-05-16-story-related-improvements-eighth-iteration-triage.md`; and `.claude/skills/spec-to-tickets/SKILL.md`.
2. SPEC-35 D4 names a 4-step rename (file + exported name + registry + test file) plus a 5th sweep step. Live validation expanded the sweep to include `README.md`, `validate-patch-plan.test.ts`, `registry.test.ts`, `docs/triage/2026-05-16-story-related-improvements-eighth-iteration-triage.md`, and `.claude/skills/spec-to-tickets/SKILL.md`. `.claude/skills/branching-story-turn-cycle/SKILL.md` and `.claude/skills/branching-story-health-audit/SKILL.md` did not contain the old validator name, but they did contain the relevant expected-witness tag surfaces, so this ticket added one `non_propagation_tag_shape` forward-pointer to each. `.claude/skills/_shared-templates/story-state-contract.md` had zero hits (no contract-doc edit needed).
3. Cross-skill boundary under audit: the validator-name convention used across (a) the validator registry registration surface, (b) integration-test execution-name assertions, (c) story-pipeline skill-prose validator-listing surfaces, and (d) the validator's README docs entry. All sites must be updated in one ticket to preserve the registry's name-to-implementation invariant.
4. Rule 5 (No Consequence Evasion) motivates this ticket via the audit-trail discipline: a validator whose name promises witness coverage but only does tag-shape checking misleads a future operator reading the registry. Restated: the principle's enforcement surface (per FOUNDATIONS §Validation Rules §Rule 5 enforcement map) is `tools/validators/src/rules/rule5-no-consequence-evasion.ts` for the primary Rule-5 check; `non_propagation_tag_shape` is an adjacent discipline that enforces the SYNTACTIC precondition of the non-propagation-tag mechanism that Rule 5 surfaces use. The rename closes the audit-trail drift; the full witness-coverage validator (deferred to validator-hardening-II) would extend Rule 5 enforcement at structural-validator scope.
5. This ticket touches a Canon Safety Check surface (validator registry): the rename preserves the registered surface (same `applies_to` predicate, same fixtures, same enforcement semantics) — only the name changes. No Mystery Reserve firewall weakening; no semantic shift.
6. This ticket renames a validator surface — sweep blast radius per area: `tools/validators/` 7 sites (registry + 2 test files + integration test + structural test + README + the validator file itself); `.claude/skills/` 3 skill files (turn-cycle + health-audit forward pointers, plus `spec-to-tickets` worked-precedent wording); `docs/` 1 triage doc; `specs/` zero operational changes (SPEC-35 itself is allowed to reference the old name in §Problem Statement/§Deliverables prose).

## Architecture Check

1. A clean rename (no alias) is structurally correct because all consumers are in-tree and updated in the same patch. Alternative considered: keep `expected_witness_coverage` as an alias for `non_propagation_tag_shape` during a deprecation window — rejected per spec §Key design decisions because aliasing is justified only for out-of-tree consumers (third-party plugins, external scripts); here, all consumers are static and the rename + sweep is a bounded operation.
2. No backwards-compatibility aliasing introduced. The validator's exported symbol, registered name, file path, and test-file path all change atomically; integration-test name assertions update to the new string; skill-prose references update to the new name with a one-time forward-pointer to the deferred full witness-coverage validator.

## Verification Layers

1. Validator file renamed + exported symbol renamed → codebase grep-proof: `grep -rnE 'expected_witness_coverage|expectedWitnessCoverage|expected-witness-coverage' tools/ .claude/skills/ docs/ | grep -v '/archive/' | grep -v '/dist/' | grep -v 'SPEC-35'` returns zero hits (the spec itself is allowed to reference the old name in its prose).
2. Registry registration uses new name → `grep -n 'nonPropagationTagShape\|non_propagation_tag_shape' tools/validators/src/public/registry.ts` returns matches at the import line and array-entry line.
3. Integration test uses new execution-name string → `grep -n "non_propagation_tag_shape" tools/validators/tests/integration/validate-patch-plan.test.ts` returns a match.
4. Skill-prose references updated with forward-pointer → 2 skill files contain `non_propagation_tag_shape` and a parenthetical pointing to SPEC-35 §Risks & Open Questions for the deferred full-coverage validator.
5. Full validator suite still passes → `npm test` in `tools/validators/`.

## Landed Changes

### 1. Renamed validator file

`tools/validators/src/structural/expected-witness-coverage.ts` moved to `tools/validators/src/structural/non-propagation-tag-shape.ts`.

### 2. Renamed exported validator name + added forward-pointer comment

In the renamed file, the export is now `nonPropagationTagShape`, the registered name is `non_propagation_tag_shape`, emitted verdicts carry `validator: "non_propagation_tag_shape"`, and the top-of-file comment records that full witness coverage remains deferred to validator-hardening-II.

### 3. Update registry

In `tools/validators/src/public/registry.ts`, the import and `structuralValidators` array entry now use `nonPropagationTagShape`.

### 4. Rename test file + update imports/strings

`tools/validators/tests/structural/expected-witness-coverage.test.ts` moved to `tools/validators/tests/structural/non-propagation-tag-shape.test.ts`; imports, symbol references, and test names now use `nonPropagationTagShape` / `non_propagation_tag_shape`.

### 5. Update integration test

In `tools/validators/tests/integration/validate-patch-plan.test.ts`, the skipped-execution assertion now looks for `non_propagation_tag_shape`.

### 6. Update registry test

In `tools/validators/tests/structural/registry.test.ts`, the registry-name list now includes `non_propagation_tag_shape`.

### 7. Update README

In `tools/validators/README.md`, the active validator list now names `non_propagation_tag_shape`.

### 8. Update skill-prose references with one-time forward-pointer

In `.claude/skills/branching-story-turn-cycle/SKILL.md` and `.claude/skills/branching-story-health-audit/SKILL.md`, expected-witness tag surfaces now name `non_propagation_tag_shape` once with the deferred full-witness-coverage pointer. In `.claude/skills/spec-to-tickets/SKILL.md`, the SPEC-35 worked precedent now names the landed validator rename without preserving the retired identifier.

### 9. Updated active triage current-state wording

In `docs/triage/2026-05-16-story-related-improvements-eighth-iteration-triage.md`, active quick-reference wording now names `non_propagation_tag_shape` and avoids preserving the retired identifier outside SPEC-35 itself.

## Files to Touch

- `tools/validators/src/structural/expected-witness-coverage.ts` → `tools/validators/src/structural/non-propagation-tag-shape.ts` (rename + edit)
- `tools/validators/tests/structural/expected-witness-coverage.test.ts` → `tools/validators/tests/structural/non-propagation-tag-shape.test.ts` (rename + edit)
- `tools/validators/src/public/registry.ts` (modify)
- `tools/validators/tests/integration/validate-patch-plan.test.ts` (modify)
- `tools/validators/tests/structural/registry.test.ts` (modify)
- `tools/validators/README.md` (modify)
- `.claude/skills/branching-story-turn-cycle/SKILL.md` (modify)
- `.claude/skills/branching-story-health-audit/SKILL.md` (modify)
- `.claude/skills/spec-to-tickets/SKILL.md` (modify)
- `docs/triage/2026-05-16-story-related-improvements-eighth-iteration-triage.md` (modify)

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
6. `npm test` in `tools/validators/` passes.
7. Skill-prose grep `grep -nE 'non_propagation_tag_shape' .claude/skills/branching-story-{turn-cycle,health-audit}/SKILL.md` returns matches that include the one-time forward-pointer parenthetical in each file.

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

## Outcome

Completed: 2026-05-16.

The validator was renamed from the former witness-coverage surface to `non_propagation_tag_shape` across source, registry, tests, README, active story-pipeline skill prose, the active triage quick reference, and the `spec-to-tickets` worked precedent. The implementation preserved behavior: the validator still checks `non_propagation:` tag syntax and closed-reason coverage with the same `applies_to` predicate and diagnostic codes, while the new name and forward-pointer avoid implying full witness-coverage computation.

## Verification Result

- `cd tools/validators && npm run clean` — passed; removed stale compiled `dist/` output before rename proof.
- `cd tools/validators && npm run build` — passed.
- `cd tools/validators && npm test` — passed: 304 tests, 304 pass.
- `test ! -e tools/validators/dist/src/structural/expected-witness-coverage.js && test ! -e tools/validators/dist/tests/structural/expected-witness-coverage.test.js` — passed; old compiled files are absent after the clean rebuild.
- `grep -rnE 'expected_witness_coverage|expectedWitnessCoverage|expected-witness-coverage' tools/ .claude/skills/ docs/ | grep -v '/archive/' | grep -v '/dist/' | grep -v 'SPEC-35'` — expected no-match result; no active operational stale-name hits remain.
- `grep -nE 'nonPropagationTagShape|non_propagation_tag_shape' tools/validators/src/public/registry.ts` — passed with 2 matches.
- `grep -nE 'non_propagation_tag_shape' .claude/skills/branching-story-turn-cycle/SKILL.md .claude/skills/branching-story-health-audit/SKILL.md` — passed; both skill files contain the one-time forward-pointer.

## Deviations

- Live reassessment found that the two branching-story skills did not contain the old validator name. Instead of forcing a nonexistent replacement, this ticket added the new validator name to the relevant expected-witness tag surfaces with a one-time deferred-full-coverage pointer.
- The stale-name sweep found current operational hits outside the original file list in `docs/triage/2026-05-16-story-related-improvements-eighth-iteration-triage.md` and `.claude/skills/spec-to-tickets/SKILL.md`; both were updated as same-seam fallout so the active zero-hit proof is truthful.
