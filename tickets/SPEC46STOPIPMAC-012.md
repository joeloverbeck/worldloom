# SPEC46STOPIPMAC-012: STQ edge extraction (3 edges: source_records, payoff_of, answer_records)

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `tools/world-index/src/schema/types.ts` (3 new edge types in `STORY_EDGE_TYPES`), `tools/world-index/src/parse/atomic.ts` (new `edgesForStoryQuestion` helper + dispatch wiring), `tools/world-index/tests/story-bundle-edges.test.ts` (append per-class tests)
**Deps**: None

## Problem

The world-index story-edge extraction at `tools/world-index/src/parse/atomic.ts:564` does not extract `STQ` (story question / open setup) record relations. Setup-source provenance (`STQ.source_records[]`), payoff-of chain (`STQ.payoff_of[]`), and answer-record outcomes (`STQ.answer_records[]`) are schema-defined on the `STQ` record per SPEC-42 §4.5.16 but are not extracted as edges. These edges support the `story_question_open` / `story_question_status` / `any_story_question_open` / `promise_due` predicates per `story-state-contract.md` §5 by making the setup-to-payoff chain graph-queryable. Future reader-expectation / payoff packets (deferred per SPEC-46 §Out of Scope item 4) will depend on these edges to walk the setup-payoff lifecycle.

## Assumption Reassessment (2026-05-18)

1. `tools/world-index/src/schema/types.ts:84-99` declares `STORY_EDGE_TYPES`; `tools/world-index/src/parse/atomic.ts:564` is the dispatch site. The `STQ` schema at SPEC-42 §4.5.16 carries `source_records: [record ids]`, `payoff_of: [STQ ids]`, `answer_records: [record ids]` fields among others (`question_or_setup`, `setup_kind`, `salience`, `audience_visibility`, `status`, `answer_event`).
2. `specs/SPEC-46-story-pipeline-machine-facing-foundation-fixes.md` §Phase C table specifies the three STQ edges. The §Extractor implementation pattern paragraph names `edgesForStoryQuestion` as one of the seven per-class helpers.
3. Cross-skill boundary: the world-index edge extraction is consumed by MCP graph-walking helpers and prepares for the future reader-expectation packet (deferred per SPEC-46 §Out of Scope item 4) which will walk setup-to-payoff chains via `payoff_of` edges. Adding STQ edges is additive.
4. FOUNDATIONS §Tooling Recommendation motivates this ticket: making STQ setup-payoff chains graph-queryable supports the `promise_due(STQ, age_pages)` and `any_story_question_open` predicates and prepares for future reader-expectation surface. FOUNDATIONS §Rule 4 (No Globalization by Accident) is preserved by `createStoryRefEdge`.

## Architecture Check

1. Per-class helper pattern matches SPEC46STOPIPMAC-006's `edgesForStoryBelief`. `edgesForStoryQuestion` iterates three array fields and emits one edge per element. No nested-field access, no placeholder handling — all three fields take record ids cleanly. Alternative considered: emit an additional `story_question_answer_event` edge per `answer_event` field (single SE id) — rejected because the spec's Phase C table lists exactly three STQ edges; adding a fourth would expand scope beyond the spec's deliverable.
2. No backwards-compatibility aliasing or shims introduced.

## Verification Layers

1. **Per-edge positive case** → schema validation: fixture `STQ` records with each of the three source arrays populated emit the expected edges with correct source / target / `edge_type` (T-7 scope).
2. **Per-edge negative case** → schema validation: fixture `STQ` with empty arrays emits no edges.
3. **Setup-payoff chain walking** → manual review: a chain `STQ-1` (setup) ← `STQ-2.payoff_of=[STQ-1]` (payoff) produces one `story_question_payoff_of` edge from STQ-2 to STQ-1; walking from STQ-2 via the edge reaches STQ-1.
4. **No regression on existing edges** → `npm test --prefix tools/world-index` passes for the full world-index test suite.

## What to Change

### 1. Extend `STORY_EDGE_TYPES` with three new edge type strings

In `tools/world-index/src/schema/types.ts:84-99`, add three entries to `STORY_EDGE_TYPES`: `"story_question_source"`, `"story_question_payoff_of"`, `"story_question_answer_record"`.

### 2. Implement `edgesForStoryQuestion` helper

In `tools/world-index/src/parse/atomic.ts`, add `edgesForStoryQuestion(node: NodeRow, record: Record<string, unknown>, storySlug: string): EdgeRow[]`:
- `STQ.source_records[]` → iterate and emit one `story_question_source` edge per record id.
- `STQ.payoff_of[]` → iterate and emit one `story_question_payoff_of` edge per STQ id.
- `STQ.answer_records[]` → iterate and emit one `story_question_answer_record` edge per record id.

### 3. Wire `edgesForStoryQuestion` into `edgesForStoryRecord` dispatch

In `tools/world-index/src/parse/atomic.ts:564`, add a dispatch branch for the `story_question_record` node type.

### 4. Append STQ tests to `tools/world-index/tests/story-bundle-edges.test.ts`

Append positive + negative + setup-payoff-chain tests for the three STQ edges.

## Files to Touch

- `tools/world-index/src/schema/types.ts` (modify — add 3 entries to `STORY_EDGE_TYPES`; mechanical merge with sibling per-class tickets)
- `tools/world-index/src/parse/atomic.ts` (modify — add `edgesForStoryQuestion` + dispatch wiring)
- `tools/world-index/tests/story-bundle-edges.test.ts` (modify — append STQ tests)

## Out of Scope

- Other per-class extractors (BEL in 006, SREL in 007, STINT in 008, STSTAT in 009, CLK in 010, STSEC in 011, SE extension in 013).
- `story_question_answer_event` (singular `answer_event` SE id) edge — not in spec's Phase C table; out of scope.
- `STORY_EDGE_TYPES.length === 36` registry-completeness assertion — capstone ticket 015.
- `docs/MACHINE-FACING-LAYER.md` story-edge enumeration update — covered by SPEC46STOPIPMAC-014.
- `placeholder-skip` convention — not applicable to STQ.

## Acceptance Criteria

### Tests That Must Pass

1. Positive tests for `story_question_source`, `story_question_payoff_of`, `story_question_answer_record` — each emits expected edges with correct source / target / `edge_type` (T-7 scope).
2. Negative tests — empty arrays emit no edges.
3. Setup-payoff chain test — a 2-record chain (STQ-1 setup, STQ-2 with `payoff_of: [STQ-1]`) produces one `story_question_payoff_of` edge reachable from STQ-2.
4. `npm test --prefix tools/world-index` passes for the full world-index test suite.
5. `npm run build --prefix tools/world-index` typechecks cleanly.

### Invariants

1. Every emitted edge carries `storySlug` via `createStoryRefEdge` — bundle isolation is preserved (FOUNDATIONS §Rule 4 discipline).
2. `edgesForStoryQuestion` is independently testable from sibling per-class helpers.

## Test Plan

### New/Modified Tests

1. `tools/world-index/tests/story-bundle-edges.test.ts` — append positive + negative + setup-payoff-chain tests for the three STQ edges.

### Commands

1. `npm test --prefix tools/world-index` (targeted: full world-index test suite passes including new STQ edge tests)
2. `npm run build --prefix tools/world-index` (typechecks the extended `STORY_EDGE_TYPES`)
