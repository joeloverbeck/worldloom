# SPEC48SESTRINT-006: Refactor `expected-witness-coverage.ts` to consume `SE.non_propagation_facts[]`

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — refactors 1 structural validator in `tools/validators/src/structural/`
**Deps**: archive/tickets/SPEC48SESTRINT-003.md

## Problem

SPEC-48 §Phase B specifies refactoring `expected-witness-coverage.ts` to read `SE.non_propagation_facts[]` directly instead of regex-scanning `world_logic_rationale` for `non_propagation:<reason>(group=..., records=[...])` tags. The validator currently carries its own local regex constant at line 34 (`TAG_PATTERN = /non_propagation:([A-Za-z_]+)\(group=([^,()[\]\s]+), records=\[([^\]]*)\]\)/g`) and a local `parseTags` helper called at line 121. Both must migrate to consume the new typed reader `readSeNonPropagationFacts(event)` from ticket 003. Without this refactor, the validator continues to parse the deprecated grammar; under SPEC-48's clean break (`world_logic_rationale` becomes prose-only), the validator's witness-coverage check silently misses every non-propagation fact authored in the new structured form.

## Assumption Reassessment (2026-05-19)

1. **Current consumer surface verified**: `tools/validators/src/structural/expected-witness-coverage.ts:34` defines local regex constant `TAG_PATTERN = /non_propagation:([A-Za-z_]+)\(group=([^,()[\]\s]+), records=\[([^\]]*)\]\)/g`; line 121 invokes a local `parseTags(...)` helper that uses this regex; line 458's `suggested_fix` string references the deprecated tag form (`"non_propagation:event_leaves_no_accessible_trace tag naming the DA in SE.world_logic_rationale."`).
2. **SPEC-48 D-B3 enumeration**: replace the regex-extract pass at line 34 (and its caller at line 121) with `readSeNonPropagationFacts(event)` from ticket 003's typed reader API. Rewrite `suggested_fix` strings to reference structured-field form per the M2-refined Phase B preamble.
3. **Cross-skill boundary**: `expected-witness-coverage.ts` consumes `SE.non_propagation_facts[]` (extended by ticket 001) via `readSeNonPropagationFacts(event)` (added by ticket 003 to `midstory-introduction-utils.ts`). The validator's existing PASS/FAIL contract (witness-coverage gap detection across direct-witness groups + non-propagation explanation requirements per `expected-witness-coverage.ts:404,416,428`) is preserved verbatim; only the read mechanism changes.
4. **Canon Safety surface**: `expected-witness-coverage.ts` is a structural validator in `tools/validators/src/structural/`. Per-ticket-type granularity rule for structural validators fires. The refactor preserves the witness-firewall semantics — every direct-witness gap that previously required a `non_propagation:` tag for explanation now requires a structured-field entry under the corresponding reason / group / records key; the firewall's PASS/FAIL contract is identical.

## Architecture Check

1. **Shared typed-reader as the read seam**: the validator imports `readSeNonPropagationFacts` from `midstory-introduction-utils.ts` (per ticket 003) rather than maintaining its own local regex + parseTags helper. Cleaner than per-validator regex parsing: removes 30+ lines of regex/parse machinery; single source of truth at the schema (ticket 001) + typed reader (ticket 003) layer.
2. **No backwards-compatibility aliasing**: the validator no longer falls back to regex-scanning `world_logic_rationale`; the local `TAG_PATTERN` regex + local `parseTags` helper are removed outright. No "try structured, fall back to regex" shim is introduced.

## Verification Layers

1. Local regex removed → grep proof: `grep -n "non_propagation:.*group=" tools/validators/src/structural/expected-witness-coverage.ts` returns zero matches in production code AFTER refactor (regex literal removed).
2. Typed reader consumed → grep proof: `grep -n "readSeNonPropagationFacts" tools/validators/src/structural/expected-witness-coverage.ts` returns ≥1 match AFTER refactor.
3. Witness-coverage regression coverage → `npm test --prefix tools/validators -- --test-name-pattern=expected-witness-coverage` passes with no test-case regression on the existing positive/negative cases.
4. `suggested_fix` strings updated → grep proof: `grep -n "non_propagation:.*tag naming\|non_propagation:event_leaves_no_accessible_trace tag" tools/validators/src/structural/expected-witness-coverage.ts` returns zero matches AFTER refactor.

## What to Change

### 1. Remove local regex + parseTags helper in `expected-witness-coverage.ts`

Delete the `TAG_PATTERN` regex constant at line 34 and the local `parseTags` helper function it backs. Replace the line 121 call site (`const tags = parseTags(stringValue(parsed.world_logic_rationale) ?? "")`) with `const nonPropagationFacts = readSeNonPropagationFacts(event)`. Refactor the downstream iteration over `tags[]` (in the witness-coverage gap-detection logic around lines 400-460) to iterate `nonPropagationFacts[]` instead. The shape change: each entry now exposes `{reason, group, records[]}` as typed properties rather than as regex match-group strings.

### 2. Update `suggested_fix` strings to reference structured-field form

Rewrite line 458's `suggested_fix` from `"non_propagation:event_leaves_no_accessible_trace tag naming the DA in SE.world_logic_rationale."` to `"add an SE.non_propagation_facts[] entry with reason=event_leaves_no_accessible_trace, group=<witness-group>, and records=[<DA-id>]"`. Audit all other `suggested_fix` strings in the file (around lines 404, 416, 428) for similar tag-grammar references and rewrite to structured-field form.

### 3. Preserve existing validator semantics

The witness-coverage gap-detection logic (covering every direct-witness in `expected_witnesses[]`, then iterating non-propagation facts to explain gaps) is unchanged in shape. Only the data source (structured field vs parsed tag) differs. Preserve all existing failure codes (`expected_witness_coverage.uncovered_direct_witness`, `expected_witness_coverage.invalid_non_propagation_group`, etc.).

## Files to Touch

- `tools/validators/src/structural/expected-witness-coverage.ts` (modify)
- `tools/validators/tests/structural/expected-witness-coverage.test.ts` (modify — update test inputs from tag-grammar form to structured-field form; assertion outputs unchanged)

## Out of Scope

- Introduction-grounding validator refactor (deferred to ticket 004).
- Plan-relation consumer refactor (deferred to ticket 005).
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
2. `grep -n "TAG_PATTERN\|non_propagation:.*group=" tools/validators/src/structural/expected-witness-coverage.ts` — confirms zero matches AFTER refactor.
