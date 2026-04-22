# SPEC-01-010: Tighten named-entity heuristic to avoid heading/body seam false positives

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — modifies `tools/world-index/src/parse/entities.ts` so heuristic `named_entity` extraction stays conservative at section-heading boundaries.
**Deps**: `archive/tickets/SPEC-01-006.md` (entity extraction pass)

## Problem

`tools/world-index/tests/entities.test.ts` currently fails against the live implementation because the capitalized-multiword heuristic emits a false-positive entity spanning a section heading and the first prose word (`Harbor Notes\n\nThe`). That pollutes `entity_mentions` / `named_entity` output with a synthetic cross-boundary token that does not exist in the world text as an entity.

## Assumption Reassessment (2026-04-22)

1. The live heuristic in `tools/world-index/src/parse/entities.ts` scanned the full section body, including heading lines, with `CAPITALIZED_MULTIWORD_REGEX = /\\b([A-Z][a-z]+(?:\\s+[A-Z][a-z]+){1,3})\\b/g`. Because that regex used `\\s+`, it matched both the cross-line seam (`Harbor Notes\\n\\nThe`) and the heading-only candidate (`Harbor Notes`) that the existing fixture already treats as false positives.
2. `tools/world-index/tests/entities.test.ts` is already asserting the intended conservative behavior for this fixture: `Harbor Watch` should be captured, `Once Upon` should not, and the total `mentions_entity` edge count should remain 3. The current failure is therefore implementation drift against an existing test contract, not a missing expectation.
3. Cross-artifact boundary: this pass emits `entity_mentions` rows plus virtual `named_entity` nodes/`mentions_entity` edges that downstream retrieval and validator work consume. False-positive candidates here become persisted index artifacts, not just local parse noise.
4. FOUNDATIONS principle under audit: **Core Principle** — canon facts must live inside a constrained model rather than a loose bag of tokens. Index-time entity artifacts that splice headings and body text into non-entities weaken that structural model.
5. Adjacent concern classification: the separate `cli-smoke.test.js` failure noted during SPEC-01-007 review is owned by active `tickets/SPEC-01-008.md`; it is not part of this ticket.

## Architecture Check

1. Tightening the heuristic at span construction time is cleaner than adding more stoplist exceptions after the fact. The canonical path is to refuse malformed cross-line candidates and skip heading-line scanning before they become persisted `named_entity` nodes.
2. No backwards-compatibility aliasing or dual heuristic paths should be introduced. The live conservative heuristic should simply stop matching heading/body seam artifacts.

## Verification Layers

1. The existing `tools/world-index/tests/entities.test.ts` fixture stops producing `entity:harbor-notes-the` and returns exactly 3 `mentions_entity` edges -> targeted tool command.
2. The tightened heuristic still captures legitimate multiword prose entities such as `Harbor Watch` in that same fixture -> targeted tool command.
3. `tools/world-index/src/parse/entities.ts` no longer permits newline-crossing capitalized spans in the heuristic candidate path and skips ATX heading lines during heuristic scanning -> codebase grep-proof/manual review.

## What to Change

### 1. Tighten heuristic candidate extraction in `tools/world-index/src/parse/entities.ts`

Adjust the capitalized-multiword heuristic so it only scans prose lines and does not join tokens across section-heading/body boundaries or other newline-separated spans. Keep the heuristic conservative rather than trying to recover every possible multi-line proper noun.

### 2. Keep the fixture-backed proof truthful

No test edits were needed; the existing fixture already expressed the intended conservative boundary.

## Files to Touch

- `tools/world-index/src/parse/entities.ts` (modify)

## Out of Scope

- Registry-backed entity extraction changes
- Retrieval ranking changes in SPEC-02
- Broad heuristic retuning beyond the specific newline-crossing false positive
- CLI smoke test repairs owned by `tickets/SPEC-01-008.md`

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/world-index && npm run build && node --test dist/tests/entities.test.js`
2. `node -e "<repo-local probe that prints extractEntities(...) output for the Harbor Notes fixture>"` shows only `entity:brinewick`, `entity:salt-wardens`, and `entity:harbor-watch`
3. `cd tools/world-index && node --test dist/tests/entities.test.js dist/tests/semantic.test.js`

### Invariants

1. The heuristic candidate path does not create multiword entity candidates by crossing newline boundaries between headings and prose, and it does not emit heading-only candidates from ATX heading lines.
2. Legitimate same-line multiword entities in the fixture remain discoverable without introducing a fallback alias path.

## Test Plan

### New/Modified Tests

1. None — existing `tools/world-index/tests/entities.test.ts` already guarded the concrete false-positive seam found during SPEC-01-007 post-ticket review, so the implementation was brought back into alignment with the live test contract.
2. `tools/world-index/tests/semantic.test.ts` — rerun as adjacent parser proof to ensure the heuristic tightening does not disturb nearby semantic extraction expectations.

### Commands

1. `cd tools/world-index && npm run build && node --test dist/tests/entities.test.js`
2. `cd tools/world-index && node --test dist/tests/entities.test.js dist/tests/semantic.test.js`
3. `rg -n "CAPITALIZED_MULTIWORD_REGEX|collectHeuristicCandidates" tools/world-index/src/parse/entities.ts` — manual confirmation that the heuristic no longer accepts newline-crossing spans

## Outcome

- **Completion date**: 2026-04-22
- **What changed**: Restricted heuristic candidate extraction to non-heading prose lines and tightened the capitalized multiword regex to stay on a single physical line. The extractor now emits only `Brinewick`, `Salt Wardens`, and `Harbor Watch` for the Harbor Notes fixture instead of persisting heading/body seam artifacts.

## Verification Result

1. `cd tools/world-index && npm run build && node --test dist/tests/entities.test.js` — passed
2. `node -e "<repo-local extractEntities Harbor Notes probe>"` — confirmed output contains only `entity:brinewick`, `entity:salt-wardens`, and `entity:harbor-watch`
3. `cd tools/world-index && node --test dist/tests/entities.test.js dist/tests/semantic.test.js` — passed
4. `rg -n "CAPITALIZED_MULTIWORD_REGEX|collectHeuristicCandidates" tools/world-index/src/parse/entities.ts` — confirmed the heuristic scans line-by-line and no longer uses newline-permissive spacing

## Deviations

- No fixture edits were required. The live `tools/world-index/tests/entities.test.ts` contract already captured the intended conservative behavior, so the closeout narrowed to implementation alignment plus proof reruns.
