# SPEC48SESTRINT-008: Refactor `tools/world-index/src/parse/atomic.ts` `edgesForStoryEvent` to read `SE.record_introductions[]` instead of parsing tags

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — refactors `tools/world-index/src/parse/atomic.ts` `edgesForStoryEvent` helper; removes parser import
**Deps**: archive/tickets/SPEC48SESTRINT-001.md

## Problem

At intake, SPEC-48 §Phase D identified the world-index `edgesForStoryEvent` helper as the remaining world-index parser consumer: it invoked `extractIntroTags(rationale)` from `intro-tag-parser.ts` to derive introduction-derived evidence edges from parseable tags in `SE.world_logic_rationale`. Under SPEC-48's clean break, ticket 009 deletes the parser file, so this consumer had to move first. The refactor is now landed: `edgesForStoryEvent` reads `SE.record_introductions[]` directly.

## Assumption Reassessment (2026-05-19)

1. **Current consumer surface verified**: At intake, `tools/world-index/src/parse/atomic.ts` imported `extractIntroTags` from `./intro-tag-parser.js` and invoked `for (const tag of extractIntroTags(stringField(record, "world_logic_rationale") ?? ""))` inside `edgesForStoryEvent`. Live correction: the helper did **not** derive class-specific edge types from the intro class; it emitted `creation_evidence` edges from the introduced record id (`CLK-*`, `STSEC-*`, `STQ-*`, etc.) to each evidence record. This ticket preserves that edge shape while changing the data source from parser tags to `SE.record_introductions[]`.
2. **SPEC-48 D-D1 enumeration**: replace the parser invocation with a read over `SE.record_introductions[]` to emit the equivalent introduction-derived edges; remove the parser import identified at intake. The reassess-spec M4 finding explicitly named this as a known refactor target.
3. **Cross-skill boundary**: `atomic.ts` is the world-index per-class edge extractor dispatch. The `edgesForStoryEvent` helper is one of many per-class helpers (others: `edgesForStoryBelief`, `edgesForStoryRelationship`, `edgesForStoryIntention`, etc. per SPEC-46 D-C2 enumeration). The refactor preserves the helper's edge-emission shape — `creation_evidence` edges from introduced record nodes to evidence record nodes, plus the existing `state_delta_*` edges from the SE node — only the data source (structured field vs parsed tag) changes.
4. **Same-package tests under scope**: `tools/world-index/tests/structured-edges.test.ts`, `tools/world-index/tests/story-bundle-edges.test.ts`, and the SPEC-45/SPEC-46 integration tests encoded introduction evidence in `world_logic_rationale` tags and counted expected evidence edges via `extractIntroTags`. Those are same-seam proof fixtures for the changed extraction path, so this ticket updates them to seed/read `record_introductions[]` instead. Parser unit tests remain out of scope for ticket 009.
5. **No FOUNDATIONS principle directly cited**: this is a pure edge-extraction refactor preserving existing semantics. The schema-minimalism doctrine (§5b) is touched indirectly (typed structured-field read is more aligned with §5b than parser-driven extraction), but the refactor itself is mechanical.

## Architecture Check

1. **Direct structured-field read at the world-index layer**: `atomic.ts` reads `SE.record_introductions[]` via a typed iteration (the parsed YAML already exposes the structured field as a typed array under the SE record's parsed payload) — no need for a typed reader helper here because world-index is upstream of the validators package and operates on raw parsed YAML; the field's shape is constrained by the schema at ticket 001. Cleaner than maintaining a parser-driven extraction layer that duplicates schema-enforced structure.
2. **No backwards-compatibility aliasing**: the parser import is removed outright; no shim re-implements the parser-driven extraction. After ticket 009 lands, the parser file no longer exists and this refactor's read-from-structured-field path is the only edge-extraction mechanism.

## Verification Layers

1. Parser import removed → grep proof: `grep -n "intro-tag-parser\|extractIntroTags" tools/world-index/src/parse/atomic.ts` returns zero matches AFTER refactor.
2. Structured-field read present → grep proof: `grep -n "record_introductions" tools/world-index/src/parse/atomic.ts` returns ≥1 match in `edgesForStoryEvent` (or its renamed equivalent) AFTER refactor.
3. Edge-extraction regression coverage → `npm test --prefix tools/world-index` passes; if a SPEC-46-introduced edge-extraction test fixture exercises `edgesForStoryEvent`, verify that fixture's emitted edges count + types remain identical before/after refactor (the refactor preserves semantics; only the input source changes).

## Landed Changes

### 1. Refactor `edgesForStoryEvent` at `tools/world-index/src/parse/atomic.ts:971`

Replaced the parser-call with a structured-field read:

```typescript
  const introductions = recordArrayField(record, "record_introductions");
  for (const intro of introductions) {
    const recordId = stringField(intro, "record_id");
    if (recordId === null) continue;
    for (const evidenceId of stringArrayField(intro, "evidence")) {
      edges.push(createStoryRefEdge(storyNodeId(storySlug, recordId), "creation_evidence", storySlug, evidenceId));
    }
  }
```

The existing edge shape (`creation_evidence` from introduced record node to evidence record) is preserved verbatim from the existing tag-driven code path. Field accessors (`recordArrayField`, `stringField`, `stringArrayField`) follow the existing pattern used in `atomic.ts`.

### 2. Removed parser import

Deleted the `import { extractIntroTags } from "./intro-tag-parser.js"` line from `tools/world-index/src/parse/atomic.ts`. After this removal + ticket 003 (utility refactor drops parser re-exports) + ticket 004 (intro-grounding refactor retargets cross-package import), the parser file has no production source consumers and can be deleted by ticket 009. Parser unit tests remain until ticket 009.

### 3. Updated edge-extraction test fixture coverage

Updated existing world-index fixtures for `edgesForStoryEvent` from tag-grammar form to structured-field form. Assertion outputs (emitted edges count + types) are unchanged. Added/updated one focused inert-prose assertion showing tag-like `world_logic_rationale` text no longer drives edge extraction.

## Files to Touch

- `tools/world-index/src/parse/atomic.ts` (modify)
- `tools/world-index/tests/structured-edges.test.ts` (modify — update story-event introduction fixture from tag prose to structured fields)
- `tools/world-index/tests/story-bundle-edges.test.ts` (modify — update story-event introduction fixture from tag prose to structured fields)
- `tools/world-index/tests/integration/spec45-atomic-integration.test.ts` (modify — update fixture and expected-count helper to read structured fields)
- `tools/world-index/tests/integration/spec46-story-bundle-edges-integration.test.ts` (modify — update fixture and expected-count helper to read structured fields)

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

1. `tools/world-index/tests/structured-edges.test.ts` — updated story-event fixtures to use `record_introductions[]` and assert tag-like prose is inert.
2. `tools/world-index/tests/story-bundle-edges.test.ts` — updated story-event fixture to use `record_introductions[]`.
3. `tools/world-index/tests/integration/spec45-atomic-integration.test.ts` — updated synthetic story fixture and expected-count helper to read `record_introductions[]`.
4. `tools/world-index/tests/integration/spec46-story-bundle-edges-integration.test.ts` — updated synthetic story fixture and expected-count helper to read `record_introductions[]`.

### Commands

1. `npm test --prefix tools/world-index` — full world-index test suite.
2. `grep -n "extractIntroTags\|intro-tag-parser" tools/world-index/src/parse/atomic.ts` — confirms zero matches.

## Outcome

Completed: 2026-05-19.

`tools/world-index/src/parse/atomic.ts` no longer imports or calls the introduction tag parser from `edgesForStoryEvent`. Introduction evidence edges are now emitted by iterating `SE.record_introductions[]` and preserving the existing `creation_evidence` edge shape from introduced record node to evidence record node.

The same-package test fixtures that prove story-event edge extraction now seed structured introduction entries instead of parseable prose tags. Parser-specific unit tests are intentionally left for ticket 009, which owns parser deletion.

## Verification Result

Commands run:

1. From `tools/world-index`: `npm run build` passed.
2. From `tools/world-index`: `node --test dist/tests/structured-edges.test.js dist/tests/story-bundle-edges.test.js dist/tests/integration/spec45-atomic-integration.test.js dist/tests/integration/spec46-story-bundle-edges-integration.test.js` passed (`29` tests).
3. From repo root: `grep -n "extractIntroTags\|intro-tag-parser" tools/world-index/src/parse/atomic.ts` returned no matches (expected proof signal).
4. From repo root: `grep -n "record_introductions" tools/world-index/src/parse/atomic.ts` returned the structured-field read in `edgesForStoryEvent`.
5. From `tools/world-index`: `npm test` passed (`129` tests).

## Deviations

- Live reassessment corrected the drafted "edge type derived from intro class" wording. The actual pre-refactor edge shape was `creation_evidence` from introduced record node to evidence record node; this run preserved that shape.
- The same-package fixture updates were broader than the initial "if any exist" wording because several world-index tests counted expected creation-evidence edges by parsing tags. Those fixtures are same-seam proof surfaces for the refactor.
