# SPEC48SESTRINT-008: Refactor `tools/world-index/src/parse/atomic.ts` `edgesForStoryEvent` to read `SE.record_introductions[]` instead of parsing tags

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — refactors `tools/world-index/src/parse/atomic.ts` `edgesForStoryEvent` helper; removes parser import
**Deps**: 001

## Problem

SPEC-48 §Phase D specifies refactoring the world-index `edgesForStoryEvent` helper at `tools/world-index/src/parse/atomic.ts:971`. The helper currently invokes `extractIntroTags(rationale)` from `intro-tag-parser.ts` (imported at line 10) to derive introduction-derived edges from parsed tags in `SE.world_logic_rationale`. Under SPEC-48's clean break, the parser file is slated for deletion in ticket 009; without refactoring this consumer first, ticket 009 cannot land. The reassess-spec M4 finding confirmed this consumer at audit time (replacing the spec's earlier "audit, likely no change required" framing with "known refactor target").

## Assumption Reassessment (2026-05-19)

1. **Current consumer surface verified**: `tools/world-index/src/parse/atomic.ts:10` imports `extractIntroTags` from `./intro-tag-parser.js`; line 971 invokes `for (const tag of extractIntroTags(stringField(record, "world_logic_rationale") ?? ""))` inside `edgesForStoryEvent`. The helper emits one edge per parsed introduction tag with edge type derived from the tag's class (CLK, STSEC, STQ, THR, STENT, SREL, STPLAN, STEMO).
2. **SPEC-48 D-D1 enumeration**: replace the parser invocation with a read over `SE.record_introductions[]` to emit the equivalent introduction-derived edges; remove the parser import at line 10. The reassess-spec M4 finding explicitly named this as a known refactor target.
3. **Cross-skill boundary**: `atomic.ts` is the world-index per-class edge extractor dispatch. The `edgesForStoryEvent` helper is one of many per-class helpers (others: `edgesForStoryBelief`, `edgesForStoryRelationship`, `edgesForStoryIntention`, etc. per SPEC-46 D-C2 enumeration). The refactor preserves the helper's edge-emission shape — same edge types, same source/target node IDs — only the data source (structured field vs parsed tag) changes.
4. **No FOUNDATIONS principle directly cited**: this is a pure edge-extraction refactor preserving existing semantics. The schema-minimalism doctrine (§5b) is touched indirectly (typed structured-field read is more aligned with §5b than parser-driven extraction), but the refactor itself is mechanical.

## Architecture Check

1. **Direct structured-field read at the world-index layer**: `atomic.ts` reads `SE.record_introductions[]` via a typed iteration (the parsed YAML already exposes the structured field as a typed array under the SE record's parsed payload) — no need for a typed reader helper here because world-index is upstream of the validators package and operates on raw parsed YAML; the field's shape is constrained by the schema at ticket 001. Cleaner than maintaining a parser-driven extraction layer that duplicates schema-enforced structure.
2. **No backwards-compatibility aliasing**: the parser import is removed outright; no shim re-implements the parser-driven extraction. After ticket 009 lands, the parser file no longer exists and this refactor's read-from-structured-field path is the only edge-extraction mechanism.

## Verification Layers

1. Parser import removed → grep proof: `grep -n "intro-tag-parser\|extractIntroTags" tools/world-index/src/parse/atomic.ts` returns zero matches AFTER refactor.
2. Structured-field read present → grep proof: `grep -n "record_introductions" tools/world-index/src/parse/atomic.ts` returns ≥1 match in `edgesForStoryEvent` (or its renamed equivalent) AFTER refactor.
3. Edge-extraction regression coverage → `npm test --prefix tools/world-index` passes; if a SPEC-46-introduced edge-extraction test fixture exercises `edgesForStoryEvent`, verify that fixture's emitted edges count + types remain identical before/after refactor (the refactor preserves semantics; only the input source changes).

## What to Change

### 1. Refactor `edgesForStoryEvent` at `tools/world-index/src/parse/atomic.ts:971`

Replace the parser-call (`for (const tag of extractIntroTags(stringField(record, "world_logic_rationale") ?? ""))`) with a structured-field read:

```typescript
const introductions = arrayField(record, "record_introductions") ?? [];
for (const intro of introductions) {
  const recordId = stringField(intro, "record_id");
  const introClass = stringField(intro, "class");
  if (recordId === null || introClass === null) continue;
  // emit edge: SE → introduced-record, with edge type derived from introClass
  // ... (preserve existing edge-type-by-class mapping)
}
```

The edge-type mapping (e.g., `introClass: CLK` → edge type `event_introduces_clock`) is preserved verbatim from the existing tag-driven code path. Field accessors (`arrayField`, `stringField`) follow the existing pattern used in atomic.ts.

### 2. Remove parser import at line 10

Delete the `import { extractIntroTags } from "./intro-tag-parser.js"` line. After this removal + ticket 003 (utility refactor drops parser re-exports) + ticket 004 (intro-grounding refactor retargets cross-package import), the parser file has no consumers and can be deleted by ticket 009.

### 3. Verify edge-extraction test fixture coverage

If a world-index test fixture exists for `edgesForStoryEvent` (likely under `tools/world-index/tests/parse/atomic.test.ts` or similar), update its test inputs from tag-grammar form to structured-field form. Assertion outputs (emitted edges count + types) are unchanged.

## Files to Touch

- `tools/world-index/src/parse/atomic.ts` (modify)
- World-index test fixtures exercising `edgesForStoryEvent`, if any exist (modify — update inputs only)

## Out of Scope

- Other per-class edge extractors in `atomic.ts` (no changes; they don't consume the parser).
- Validator refactor (covered by tickets 003-007).
- Parser file deletion (deferred to ticket 009).
- World-mcp / docs surface updates (deferred to ticket 012).

## Acceptance Criteria

### Tests That Must Pass

1. `npm test --prefix tools/world-index` — full world-index test suite passes.
2. Grep proof: `grep -n "intro-tag-parser\|extractIntroTags" tools/world-index/src/parse/atomic.ts` returns zero matches.
3. Grep proof: `grep -n "record_introductions" tools/world-index/src/parse/atomic.ts` returns ≥1 match in the refactored `edgesForStoryEvent`.

### Invariants

1. Edge-extraction semantics preserved: every SE event that previously emitted N introduction-derived edges via parsed tags now emits the same N edges via structured-field reads (where the SE record's `record_introductions[]` carries the equivalent N entries).
2. The world-index build regression test confirms no edge-type regression — `world-index build` over a representative fixture world produces the same edge count + edge types before/after refactor.

## Test Plan

### New/Modified Tests

1. World-index test fixtures for `edgesForStoryEvent` (modify, if existing) — update test inputs from tag-grammar form to structured-field form; assertion outputs unchanged.

### Commands

1. `npm test --prefix tools/world-index` — full world-index test suite.
2. `grep -n "extractIntroTags\|intro-tag-parser" tools/world-index/src/parse/atomic.ts` — confirms zero matches.
