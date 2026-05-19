# SPEC48SESTRINT-006: Refactor `expected-witness-coverage.ts` to consume `SE.non_propagation_facts[]`

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — refactors 1 structural validator in `tools/validators/src/structural/`
**Deps**: archive/tickets/SPEC48SESTRINT-003.md

## Problem

At intake, SPEC-48 §Phase B required `expected-witness-coverage.ts` to read `SE.non_propagation_facts[]` directly instead of regex-scanning `world_logic_rationale` for `non_propagation:<reason>(group=..., records=[...])` tags. The validator carried its own local regex constant and `parseTags` helper, and tests encoded the old tag syntax. This ticket migrated that validator to the typed reader `readSeNonPropagationFacts(event)` from ticket 003 so `world_logic_rationale` remains prose-only under SPEC-48's clean break.

## Assumption Reassessment (2026-05-19)

1. **Historical intake consumer surface verified**: before this ticket, `tools/validators/src/structural/expected-witness-coverage.ts` defined a local `TAG_PATTERN` regex, invoked a local `parseTags(...)` helper, and carried a `suggested_fix` string referencing the deprecated `non_propagation:event_leaves_no_accessible_trace` tag form in `SE.world_logic_rationale`.
2. **SPEC-48 D-B3 enumeration**: the regex-extract pass and its caller were replaced with `readSeNonPropagationFacts(event)` from ticket 003's typed reader API. `suggested_fix` strings now reference structured-field form per the M2-refined Phase B preamble.
3. **Cross-skill boundary**: `expected-witness-coverage.ts` consumes `SE.non_propagation_facts[]` (extended by ticket 001) via `readSeNonPropagationFacts(event)` (added by ticket 003 to `midstory-introduction-utils.ts`). The validator's existing PASS/FAIL contract (witness-coverage gap detection across direct-witness groups + non-propagation explanation requirements per `expected-witness-coverage.ts:404,416,428`) is preserved verbatim; only the read mechanism changes.
4. **Canon Safety surface**: `expected-witness-coverage.ts` is a structural validator in `tools/validators/src/structural/`. Per-ticket-type granularity rule for structural validators fires. The refactor preserves the witness-firewall semantics — every direct-witness gap that previously required a `non_propagation:` tag for explanation now requires a structured-field entry under the corresponding reason / group / records key; the firewall's PASS/FAIL contract is identical.
5. **HARD-GATE read**: `docs/HARD-GATE-DISCIPLINE.md` was read before implementation because `expected_witness_coverage` can run in pre-apply mode for `create_se_record` patch plans. The landed `applies_to` selector is unchanged; the pre-apply gate still fails closed through the same validator, now reading structured facts.
6. **Verdict-code compatibility**: the `expected_witness_coverage_tag_records_unresolved` code was preserved for the unresolved-record failure to avoid changing downstream waiver/grandfathering keys in a ticket whose owned behavior was the read mechanism and message/suggested-fix prose, not public verdict-code renaming.

## Architecture Check

1. **Shared typed-reader as the read seam**: the validator imports `readSeNonPropagationFacts` from `midstory-introduction-utils.ts` (per ticket 003) rather than maintaining its own local regex + parseTags helper. Cleaner than per-validator regex parsing: removes 30+ lines of regex/parse machinery; single source of truth at the schema (ticket 001) + typed reader (ticket 003) layer.
2. **No backwards-compatibility aliasing**: the validator no longer falls back to regex-scanning `world_logic_rationale`; the local `TAG_PATTERN` regex + local `parseTags` helper are removed outright. No "try structured, fall back to regex" shim is introduced.

## Verification Layers

1. Local regex removed → grep proof: `grep -n "non_propagation:.*group=" tools/validators/src/structural/expected-witness-coverage.ts` returns zero matches in production code AFTER refactor (regex literal removed).
2. Typed reader consumed → grep proof: `grep -n "readSeNonPropagationFacts" tools/validators/src/structural/expected-witness-coverage.ts` returns ≥1 match AFTER refactor.
3. Witness-coverage regression coverage → `node --test dist/tests/structural/expected-witness-coverage.test.js` passed from `tools/validators/`, and the full `npm test --prefix tools/validators` package suite passed.
4. `suggested_fix` strings updated → grep proof: `grep -n "non_propagation:.*tag naming\|non_propagation:event_leaves_no_accessible_trace tag" tools/validators/src/structural/expected-witness-coverage.ts` returns zero matches AFTER refactor.

## Landed Changes

### 1. Removed local regex + parseTags helper in `expected-witness-coverage.ts`

Deleted the `TAG_PATTERN` regex constant and the local `parseTags` helper. The validator now calls `readSeNonPropagationFacts(event)` once per SE and passes the typed facts through both direct-witness and indirect-propagation checks.

### 2. Updated verdict prose to reference structured-field form

Rewrote messages and `suggested_fix` strings that referred to non-propagation tags so they now direct authors to `SE.non_propagation_facts[]`. The unresolved-record verdict code remains `expected_witness_coverage_tag_records_unresolved` for compatibility, but its message now describes a structured non-propagation fact.

### 3. Preserved existing validator semantics

The witness-coverage gap-detection logic is unchanged in shape. Only the data source differs. Focused tests still cover direct-witness gaps, wrong group labels, unresolved records, indirect propagation gaps, and the `event_leaves_no_accessible_trace` escape hatch.

## Files to Touch

- `tools/validators/src/structural/expected-witness-coverage.ts` (modify)
- `tools/validators/tests/structural/expected-witness-coverage.test.ts` (modify — update test inputs from tag-grammar form to structured-field form; assertion outputs unchanged)

## Out of Scope

- Introduction-grounding validator refactor (deferred to ticket 004).
- Plan-relation consumer refactor (completed in archive/tickets/SPEC48SESTRINT-005.md).
- non-propagation-tag-shape replacement (deferred to ticket 007).
- Schema field changes (covered by ticket 001).
- Typed reader infrastructure (covered by ticket 003).
- Parser file deletion (deferred to ticket 009).

## Acceptance Criteria

### Tests That Must Pass

1. `npm test --prefix tools/validators` — full validator test suite passes with zero regression on `expected-witness-coverage` test cases.
2. Grep proof: `grep -n "non_propagation:.*group=" tools/validators/src/structural/expected-witness-coverage.ts` returns zero matches (regex constant removed).
3. Grep proof: `grep -n "readSeNonPropagationFacts" tools/validators/src/structural/expected-witness-coverage.ts` returns ≥1 match (typed reader consumed).

### Invariants

1. Witness-coverage gap detection preserves existing PASS/FAIL semantics — same failure codes, same severity, same gap-coverage-vs-non-propagation-explanation contract.
2. The validator no longer inspects `SE.world_logic_rationale` for structural facts — it consumes `SE.non_propagation_facts[]` via the typed reader from ticket 003.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/expected-witness-coverage.test.ts` (modify) — update test inputs from `non_propagation:<reason>(group=...)` tag form to `SE.non_propagation_facts: [{reason, group, records}]` structured-field form; assertion outputs unchanged.

### Commands

1. `npm test --prefix tools/validators` — full test suite.
2. `rg -n "TAG_PATTERN|parseTags|non_propagation:.*group=|non_propagation:.*tag|non-propagation tag|readSeNonPropagationFacts" tools/validators/src/structural/expected-witness-coverage.ts tools/validators/tests/structural/expected-witness-coverage.test.ts` — confirms the deprecated parser/tag anchors are gone from the owned source and test, with only the typed-reader import/use remaining.

## Outcome

Completed: 2026-05-19

Implemented the SPEC-48 expected-witness-coverage refactor:

- `tools/validators/src/structural/expected-witness-coverage.ts` now imports `readSeNonPropagationFacts` and consumes `SE.non_propagation_facts[]` directly.
- Removed the local tag regex and parser helper from the validator.
- Updated non-propagation verdict messages and suggested fixes to reference structured facts instead of tags in `world_logic_rationale`.
- Updated `tools/validators/tests/structural/expected-witness-coverage.test.ts` fixtures so non-propagation evidence is expressed through `non_propagation_facts[]`.

## Verification Result

- `npm run build --prefix tools/validators` passed.
- `node --test dist/tests/structural/expected-witness-coverage.test.js` passed from `tools/validators/` (`21` tests).
- `npm test --prefix tools/validators` passed (`620` tests).
- `rg -n "TAG_PATTERN|parseTags|non_propagation:.*group=|non_propagation:.*tag|non-propagation tag|readSeNonPropagationFacts" tools/validators/src/structural/expected-witness-coverage.ts tools/validators/tests/structural/expected-witness-coverage.test.ts` returned only the typed-reader import and call site.

## Deviations

- The unresolved-record verdict code remains `expected_witness_coverage_tag_records_unresolved` to preserve the validator's public failure-code surface. The runtime message and suggested fix now use structured-field language.
