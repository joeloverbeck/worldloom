# SPEC31STOCONHAR-007: Parseable non-propagation tags inside `SE.world_logic_rationale`

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `.claude/skills/_shared-templates/story-state-contract.md`, `.claude/skills/branching-story-turn-cycle/SKILL.md`, `.claude/skills/branching-story-health-audit/SKILL.md`, new `tools/validators/src/structural/expected-witness-coverage.ts`, `tools/validators/src/public/registry.ts`
**Deps**: `specs/SPEC-31-story-contract-hardening-iii.md`

## Problem

The closed enum of 5 non-propagation reasons exists at `branching-story-turn-cycle/SKILL.md:292` and `branching-story-health-audit/SKILL.md:190` (`no_witness`, `witness_incapacitated`, `evidence_concealed`, `institution_suppresses_report`, `event_leaves_no_accessible_trace`). But turn-cycle `:293` says rationales are recorded in "authoring notes and carry the load-bearing rationale into `SE.world_logic_rationale`" — free-form. Health-audit Phase 2d cannot deterministically replay coverage decisions because the rationale lives in unstructured prose. The SE schema's `world_logic_rationale` is a `string` field with `minLength: 1` (`tools/validators/src/schemas/story-event.schema.json:89`); a tag convention inside that string is cheap, no schema field needed.

## Assumption Reassessment (2026-05-15)

1. **Codebase symbols verified**: turn-cycle `:292-293`, health-audit `:190`, SE schema `:89` (`world_logic_rationale: {type: string, minLength: 1}`) all verified.
2. **Spec assumptions verified**: `specs/SPEC-31-story-contract-hardening-iii.md` §D7 specifies the tag format and validator.
3. **Cross-skill / cross-artifact boundary under audit**: SE schema's `world_logic_rationale` field (consumer-side) + contract §4.3 SE block (spec) + 2 skills (turn-cycle emits; health-audit replays).
4. **FOUNDATIONS principle under audit (restated)**: §Story Bundles §5b (Schema-Minimalism) — adding a structured `non_propagation` array to SE would proliferate schema; reusing the existing `world_logic_rationale` string with a parseable tag convention preserves §5b. Distinct from FOUNDATIONS Rule 5.

## Architecture Check

1. **Cleaner than alternative**: structured field would proliferate SE schema for limited gain; the tag convention inside an existing string field is parseable, replayable, and zero-schema-cost.
2. **No backwards-compatibility shims**: tag format is new; no legacy world_logic_rationale prose to migrate.

## Verification Layers

1. **SE with valid tag for uncovered group passes** → schema validation (validator test: `non_propagation:evidence_concealed(group=public, records=[BEL-12])` → PASS).
2. **SE with uncovered witness group AND no tag is rejected** → schema validation (`expected_witness_tag_missing` FAIL).
3. **SE with malformed tag is flagged** → schema validation (`expected_witness_tag_malformed` WARN).
4. **Health-audit Phase 2d parses tags during replay** → skill dry-run (bundle with tagged rationale → audit succeeds; bundle with untagged uncovered group → audit emits gap).

## What to Change

### 1. Contract `.claude/skills/_shared-templates/story-state-contract.md` §4.3 SE block

Add near the existing `world_logic_rationale` documentation:
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

Replace the free-form rationale instruction with the tagged form. Add a Phase 9 check (or extend an existing one) `expected_witness_tag_presence`: when a non-propagation rationale is required, the SE's `world_logic_rationale` MUST contain the tagged form for each uncovered witness group.

### 3. Health-audit `branching-story-health-audit/SKILL.md` Phase 2d `:190`

Parse the tagged form during replay. Each `expected_witnesses.direct[]` and `expected_witnesses.indirect[]` member must be accounted for by either a created/superseded BEL OR a parseable non-propagation tag with a matching `group` and records.

### 4. New validator `tools/validators/src/structural/expected-witness-coverage.ts`

Structural parsing of the tag format:
- `expected_witness_tag_malformed` (severity: warn) — tag present but doesn't match regex.
- `expected_witness_tag_missing` (severity: fail) — witness group uncovered AND no tag.

Register in `tools/validators/src/public/registry.ts`.

## Files to Touch

- `.claude/skills/_shared-templates/story-state-contract.md` (modify — §4.3 SE block)
- `.claude/skills/branching-story-turn-cycle/SKILL.md` (modify — `:293`, Phase 9 check)
- `.claude/skills/branching-story-health-audit/SKILL.md` (modify — Phase 2d, `:190`)
- `tools/validators/src/structural/expected-witness-coverage.ts` (new or extend if a precursor exists)
- `tools/validators/src/public/registry.ts` (modify — register)
- `tools/validators/tests/structural/expected-witness-coverage.test.ts` (new fixtures)

## Out of Scope

- New SE schema field for structured non-propagation — explicitly avoided per §5b minimalism.
- Adding new non-propagation reasons to the closed enum — out of scope; the 5 existing reasons are the contract.

## Acceptance Criteria

### Tests That Must Pass

1. Validator test: SE with `world_logic_rationale` containing `non_propagation:evidence_concealed(group=public, records=[BEL-12])` for an uncovered group → PASS.
2. Validator test: SE with no BEL coverage for an expected witness group AND no tag → `expected_witness_tag_missing` FAIL.
3. Validator test: SE with malformed tag (`non_propagation:evidence_concealed group=public)` — missing parens) → `expected_witness_tag_malformed` WARN.

### Invariants

1. Every uncovered witness group in turn-cycle output has a parseable tag in `SE.world_logic_rationale`.
2. Health-audit replay deterministically reconstructs witness-coverage decisions from SE prose.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/expected-witness-coverage.test.ts` — new fixtures: tag-present-and-valid, tag-malformed, tag-absent-with-uncovered-witness.

### Commands

1. `pnpm --filter @worldloom/validators test -t "expected_witness_coverage"` → green.
2. `grep -n "non_propagation:" .claude/skills/branching-story-turn-cycle/SKILL.md .claude/skills/branching-story-health-audit/SKILL.md` → matches at the documented sites.
