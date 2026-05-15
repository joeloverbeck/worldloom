# SPEC31STOCONHAR-007: Parseable non-propagation tags inside `SE.world_logic_rationale`

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `.claude/skills/_shared-templates/story-state-contract.md`, `.claude/skills/branching-story-turn-cycle/SKILL.md`, `.claude/skills/branching-story-health-audit/SKILL.md`, new `tools/validators/src/structural/expected-witness-coverage.ts`, `tools/validators/src/public/registry.ts`
**Deps**: `archive/specs/SPEC-31-story-contract-hardening-iii.md`

## Problem

The closed enum of 5 non-propagation reasons exists at `branching-story-turn-cycle/SKILL.md:292` and `branching-story-health-audit/SKILL.md:190` (`no_witness`, `witness_incapacitated`, `evidence_concealed`, `institution_suppresses_report`, `event_leaves_no_accessible_trace`). But turn-cycle `:293` says rationales are recorded in "authoring notes and carry the load-bearing rationale into `SE.world_logic_rationale`" — free-form. Health-audit Phase 2d cannot deterministically replay coverage decisions because the rationale lives in unstructured prose. The SE schema's `world_logic_rationale` is a `string` field with `minLength: 1` (`tools/validators/src/schemas/story-event.schema.json:89`); a tag convention inside that string is cheap, no schema field needed.

## Assumption Reassessment (2026-05-15)

1. **Codebase symbols verified**: turn-cycle `:292-293`, health-audit `:190`, SE schema `:89` (`world_logic_rationale: {type: string, minLength: 1}`) all verified.
2. **Spec assumptions verified**: `archive/specs/SPEC-31-story-contract-hardening-iii.md` §D7 specifies the tag format and validator.
3. **Cross-skill / cross-artifact boundary under audit**: SE schema's `world_logic_rationale` field (consumer-side) + contract §4.3 SE block (spec) + 2 skills (turn-cycle emits; health-audit replays).
4. **FOUNDATIONS principle under audit (restated)**: §Story Bundles §5b (Schema-Minimalism) — adding a structured `non_propagation` array to SE would proliferate schema; reusing the existing `world_logic_rationale` string with a parseable tag convention preserves §5b. Distinct from FOUNDATIONS Rule 5.
5. **Validator scope corrected against live schema**: `SE` has no structured `expected_witnesses` field, so a package validator cannot independently compute "uncovered witness group" from the event record alone. The landed validator will enforce the parseable mini-format, warn on malformed `non_propagation:` tags, and fail legacy closed-set non-propagation prose (`no_witness`, `witness_incapacitated`, `evidence_concealed`, `institution_suppresses_report`, `event_leaves_no_accessible_trace`) when it is not carried as a parseable tag. Turn-cycle and health-audit remain the surfaces that compute which groups require coverage.
6. **Package proof command corrected**: the repo has no root workspace manifest, so the drafted `pnpm --filter @worldloom/validators test -t "expected_witness_coverage"` is not a truthful command. The package-local proof is `npm test -- --test-name-pattern=expected_witness_coverage` from `tools/validators`, with `npm run build` produced by the package script.

## Architecture Check

1. **Cleaner than alternative**: structured field would proliferate SE schema for limited gain; the tag convention inside an existing string field is parseable, replayable, and zero-schema-cost.
2. **No backwards-compatibility shims**: tag format is new; no legacy world_logic_rationale prose to migrate.

## Verification Layers

1. **SE with valid tag for uncovered group passes** → structural validation (validator test: `non_propagation:evidence_concealed(group=public, records=[BEL-12])` → PASS).
2. **SE using a closed-set non-propagation reason without a tag is rejected** → structural validation (`expected_witness_tag_missing` FAIL).
3. **SE with malformed tag is flagged** → structural validation (`expected_witness_tag_malformed` WARN).
4. **Health-audit Phase 2d parses tags during replay** → manual contract review plus grep proof over the edited skill text. There is no executable skill dry-run runner in this repo.

## Landed Changes

### 1. Contract `.claude/skills/_shared-templates/story-state-contract.md` §4.3 SE block

Added near the existing `world_logic_rationale` documentation:
```
When an expected witness group receives no BEL create/supersession, the
rationale MUST include a parseable non-propagation tag inside
`SE.world_logic_rationale`:

    non_propagation:<reason>(group=<label>, records=[<record_ids>])

Valid `<reason>` values: `no_witness`, `witness_incapacitated`,
`evidence_concealed`, `institution_suppresses_report`,
`event_leaves_no_accessible_trace`.

The tag is carried inside `world_logic_rationale` to avoid adding a schema
field, but it is mechanically consumed by turn-cycle validation and
health-audit replay.
```

### 2. Turn-cycle `branching-story-turn-cycle/SKILL.md` Phase 4 `:293`

Replaced the free-form rationale instruction with the tagged form and added Phase 9 check `expected_witness_tag_presence`: when a non-propagation rationale is required, the SE's `world_logic_rationale` MUST contain the tagged form for each uncovered witness group.

### 3. Health-audit `branching-story-health-audit/SKILL.md` Phase 2d `:190`

Health-audit now parses the tagged form during replay. Each `expected_witnesses.direct[]` and `expected_witnesses.indirect[]` member must be accounted for by either a created/superseded BEL OR a parseable non-propagation tag with a matching `group` and records.

### 4. New validator `tools/validators/src/structural/expected-witness-coverage.ts`

Added structural parsing of the tag format:
- `expected_witness_tag_malformed` (severity: warn) — tag present but doesn't match regex.
- `expected_witness_tag_missing` (severity: fail) — `SE.world_logic_rationale` uses a closed-set non-propagation reason but does not carry it as a parseable `non_propagation:<reason>(group=<label>, records=[<record_ids>])` tag.

Registered in `tools/validators/src/public/registry.ts`.

## Files to Touch

- `.claude/skills/_shared-templates/story-state-contract.md` (modify — §4.3 SE block)
- `.claude/skills/branching-story-turn-cycle/SKILL.md` (modify — `:293`, Phase 9 check)
- `.claude/skills/branching-story-health-audit/SKILL.md` (modify — Phase 2d, `:190`)
- `tools/validators/src/structural/expected-witness-coverage.ts` (new)
- `tools/validators/src/public/registry.ts` (modify — register)
- `tools/validators/tests/structural/expected-witness-coverage.test.ts` (new fixtures)
- `tools/validators/tests/structural/registry.test.ts` (modify — registry expectation)
- `tools/validators/tests/integration/spec04-verification.test.ts` (modify — validator counts)
- `tools/validators/tests/integration/validate-patch-plan.test.ts` (modify — pre-apply skip expectation)
- `tools/validators/README.md` (modify — structural validator inventory/count)
- `archive/specs/SPEC-31-story-contract-hardening-iii.md` (modify — dated D7 implementation note)

## Out of Scope

- New SE schema field for structured non-propagation — explicitly avoided per §5b minimalism.
- Adding new non-propagation reasons to the closed enum — out of scope; the 5 existing reasons are the contract.

## Acceptance Criteria

### Tests That Must Pass

1. Validator test: SE with `world_logic_rationale` containing `non_propagation:evidence_concealed(group=public, records=[BEL-12])` for an uncovered group → PASS.
2. Validator test: SE with legacy prose naming `evidence_concealed` but no parseable tag → `expected_witness_tag_missing` FAIL.
3. Validator test: SE with malformed tag (`non_propagation:evidence_concealed group=public)` — missing parens) → `expected_witness_tag_malformed` WARN.

### Invariants

1. Every uncovered witness group in turn-cycle output has a parseable tag in `SE.world_logic_rationale`.
2. Health-audit replay deterministically reconstructs witness-coverage decisions from SE prose.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/expected-witness-coverage.test.ts` — new fixtures: tag-present-and-valid, tag-malformed, legacy-reason-without-tag.

### Commands

1. From `tools/validators`: `npm test -- --test-name-pattern=expected_witness_coverage` → green. The package wrapper did not narrow to only the named tests; it built and ran the full compiled suite, 262 tests passing.
2. `grep -n "non_propagation:" .claude/skills/branching-story-turn-cycle/SKILL.md .claude/skills/branching-story-health-audit/SKILL.md` → matches at the documented sites.

## Outcome

Completed: 2026-05-15

The shared story-state contract now defines the `non_propagation:<reason>(group=<label>, records=[<record_ids>])` mini-format inside `SE.world_logic_rationale`. Turn-cycle now requires one tag per uncovered expected witness group, and health-audit now consumes matching tags during witness-coverage replay.

The validators package now registers `expected_witness_coverage`, with focused tests for valid tags, legacy closed-set reason prose without a tag, malformed tags, and `create_se_record` pre-apply applicability. The validator inventory and registry/count tests were updated to include the new structural validator.

## Verification Result

- `git diff --check -- .claude/skills/_shared-templates/story-state-contract.md .claude/skills/branching-story-turn-cycle/SKILL.md .claude/skills/branching-story-health-audit/SKILL.md archive/specs/SPEC-31-story-contract-hardening-iii.md tools/validators/src/structural/expected-witness-coverage.ts tools/validators/src/public/registry.ts tools/validators/tests/structural/expected-witness-coverage.test.ts tools/validators/tests/structural/registry.test.ts tools/validators/tests/integration/spec04-verification.test.ts tools/validators/tests/integration/validate-patch-plan.test.ts tools/validators/README.md archive/tickets/SPEC31STOCONHAR-007.md` — passed.
- From `tools/validators`: `npm test -- --test-name-pattern=expected_witness_coverage` — passed after the package script rebuilt `dist/`; wrapper executed the full compiled suite with 262 passing tests.
- `grep -n "non_propagation:" .claude/skills/branching-story-turn-cycle/SKILL.md .claude/skills/branching-story-health-audit/SKILL.md` — found the turn-cycle authoring/check guidance and health-audit replay guidance.

## Deviations

- The validator cannot independently detect every "uncovered witness group" because `SE` has no structured `expected_witnesses` field. The landed boundary keeps group computation in turn-cycle and health-audit, and makes the validator enforce parseable tags plus fail legacy closed-set reason prose that is not tagged.
- The drafted `pnpm --filter @worldloom/validators test -t "expected_witness_coverage"` command was replaced because this repo has no root workspace manifest. The package-local `npm test -- --test-name-pattern=expected_witness_coverage` command is truthful, but the wrapper ran the full compiled suite rather than only the named tests.
