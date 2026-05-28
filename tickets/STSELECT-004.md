# STSELECT-004: Regression coverage for `rankCandidates` urgency-banded round-robin, alphabetical move-family ordering, node-id tie-break, and `max_candidates` truncation order

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — new fixture/test additions in `tools/world-mcp/tests/tools/select-storylet-candidates.test.ts`. No production-code changes.
**Deps**: None.

## Problem

`tools/world-mcp/src/tools/select-storylet-candidates.ts:595-637` (`rankCandidates`) implements a non-trivial ranking algorithm: (a) sort by `slt_saliency_urgency` descending using `URGENCY_RANK` (high=3, medium=2, low=1, unknown=0); (b) within each urgency band, group by `slt_move_family`; (c) emit by round-robin across move-families in alphabetical order; (d) within the same urgency+family, preserve `node_id.localeCompare` ascending order (inherited from the initial sort). The shortlist is then truncated to `max_candidates` at line 823 via `slice(0, maxCandidates)`.

The existing test coverage does not exercise the algorithm's non-trivial branches:

- **No round-robin coverage.** The only ranking-aware fixture, `buildCandidateWorld` at `tools/world-mcp/tests/tools/select-storylet-candidates.test.ts:99-178`, leaves at most one SLT per urgency band passing the filter pipeline (SLT-1 = high/investigation, SLT-2 = medium/disclosure; all others filtered out). The asserted shortlist `["SLT-1", "SLT-2"]` is satisfied by any ordering algorithm that puts higher urgency first — including a naïve sort that drops the move-family round-robin entirely.
- **No alphabetical-family ordering coverage.** With one family per urgency band, the alphabetical sort at line 627 is never exercised. A regression that flipped to `.sort((a, b) => b.localeCompare(a))` (descending) would not be caught.
- **No node_id tie-break coverage.** With one SLT per urgency+family combination, `localeCompare` at line 604 is never the deciding sort key. A regression that dropped the tie-break (e.g., relied on Map iteration order) would not be caught.
- **No truncation-order coverage.** SPEC-81 §9.2 asserts `shortlisted_candidate_ids.length === 24` from a 1000-SLT pool, but asserts no specific IDs — a regression that reversed `slice(0, maxCandidates)` to `slice(-maxCandidates)` (returning the lowest-ranked 24) would pass the existing test.
- **No unknown-urgency / null-urgency coverage.** `URGENCY_RANK[urgency ?? ""] ?? 0` at lines 599, 609 produces rank=0 for null or unknown values, placing such SLTs at the bottom of the rank. Not tested.

This algorithm is load-bearing for the eligibility-layer fairness contract: storylet diversity across move-families within an urgency band is what prevents a single move-family from monopolizing the shortlist. A silent regression here degrades author-pool fairness without producing visible errors — a strictly worse failure mode than a crash, because the symptom is subtly biased shortlists rather than missing candidates.

## Assumption Reassessment (2026-05-28)

1. **Codebase reassessment**: confirmed at `tools/world-mcp/src/tools/select-storylet-candidates.ts:595-637` that `rankCandidates` performs (i) primary sort by urgency desc + node_id asc, (ii) bucketize by urgency, (iii) within each urgency, bucketize by family, (iv) round-robin emit across families in alphabetical order. The inner `while (output.length < urgencyOutputTarget)` loop relies on `byFamily.get(family)?.shift()` to consume one entry per family per pass; the implicit "if a family bucket is empty this pass, skip it next pass" is correct only because `.shift()` on an empty array returns `undefined` and the `if (next !== undefined)` branch guards the push.
2. **Truncation semantics**: confirmed at line 823 (`rankCandidates(afterCooldown).slice(0, maxCandidates)`) that truncation preserves rank order. The slice is the only post-rank operation before the shortlist is returned.
3. **Cross-skill / cross-artifact boundary**: this ticket audits the contract between `rankCandidates` and its callers (every story-pipeline skill that consumes `shortlisted_candidate_ids` — `branching-story-turn-cycle`, `branching-story-bootstrap`, `commitment-block-authoring`, `get_context_packet`'s `selection_shortlist` projection). The contract is "the first N entries of the shortlist are the highest-ranked N candidates by the documented urgency-band/round-robin rule"; the gap is that no test pins down "first N" as a behavior versus "any N."
4. **FOUNDATIONS principle restatement**: §Story Bundles Validation Rules §Rule 5 (No Consequence Evasion) is engaged at the eligibility-layer fairness boundary — round-robin across move-families within an urgency band protects continuation-storylet diversity, which is the fairness primitive that lets every page leave at least one continuation eligible. §Tooling Recommendation @ runtime selection (aligns — the documented MCP retrieval surface must produce stable, fair shortlists; coverage gaps weaken the contract operators rely on).
5. **Existing-output schema unchanged**: this ticket adds test coverage only; no production code changes. The `SelectStoryletCandidatesResponse` shape is unaffected.
6. **Pre-edit baseline**: `cd tools/world-mcp && npm test` is expected to pass before this ticket's edits (must be verified during implementation).

## Architecture Check

1. **Cleaner than alternatives.** Option A (this ticket — focused unit tests with hand-counted fixtures isolating each ranking branch) is the smallest change and re-uses the existing `select-storylet-candidates.test.ts` fixture machinery. Option B (a property-based test using a random-pool generator) is harder to debug when the ranking algorithm regresses and adds a dependency (no property-based framework currently in `tools/world-mcp`). Option C (extend SPEC-81 §9.3's hand-counted fixture) bloats a fixture whose value is per-stage count discipline, not ranking-order assertions.
2. **No backwards-compatibility aliasing/shims introduced.** Purely additive test coverage; no production code changes.

## Verification Layers

1. Round-robin across families within an urgency band emits in alphabetical family order, one entry per family per pass, looping back to the first family until each bucket is empty → regression assertion against a hand-counted fixture (e.g., 2 SLTs in family `alpha`, 1 in `beta`, 2 in `gamma`, all medium urgency → expected order `alpha-1, beta-1, gamma-1, alpha-2, gamma-2`).
2. Higher urgency outranks lower urgency regardless of family order → regression assertion (e.g., one `low`/`alpha` SLT vs. one `medium`/`zeta` SLT → `medium` first).
3. Tie-break by `node_id.localeCompare` ascending within same urgency+family → regression assertion (e.g., SLT-3 and SLT-10 same urgency+family → SLT-10 first because `"SLT-10" < "SLT-3"` per `localeCompare`; if ID ordering is meant to be numeric, this is itself a gap worth surfacing).
4. Truncation preserves rank order: `max_candidates: 3` against a 10-SLT pool with deterministic rank order returns the top-3 SLTs by rank, not any 3 → regression assertion.
5. Unknown / null `slt_saliency_urgency` ranks last (urgency=0) and is consistently ordered → regression assertion.

## Files to Touch

- `tools/world-mcp/tests/tools/select-storylet-candidates.test.ts` (modify — add ≥5 new tests with focused ranking fixtures)

## Out of Scope

- Changes to `rankCandidates` semantics (the algorithm is correct; only test coverage is missing).
- Tie-break-by-numeric-ID enhancement if §1.3 surfaces "SLT-10 ranks before SLT-3" as undesirable — that is a separate proposal, not a coverage gap.
- Coverage for the eight filter stages (covered by existing tests and STSELECT-005 / STSELECT-006).
- Coverage for the end-to-end indexer→selector pipeline (STSELECT-003's scope).
- Coverage for the `include_rejection_summary` flag defect (MCPENH-075's scope).

## Acceptance Criteria

### Tests That Must Pass

1. New `selectStoryletCandidates ranks round-robin across move families within an urgency band` test asserts the alphabetical family round-robin behavior described in §1.1.
2. New `selectStoryletCandidates ranks higher urgency before lower urgency regardless of family` test asserts the urgency-band primary sort.
3. New `selectStoryletCandidates breaks ties by node_id within the same urgency and family` test asserts the `localeCompare` tie-break (and incidentally documents that the ordering is lexicographic, not numeric).
4. New `selectStoryletCandidates truncation preserves rank order` test asserts that `max_candidates: 3` against a deterministic 10-SLT pool returns the top-3 by rank.
5. New `selectStoryletCandidates places unknown urgency last` test asserts null/unknown urgency ranks at the bottom of the order.
6. All existing tests in `tools/world-mcp/tests/tools/select-storylet-candidates.test.ts` continue to pass.

### Invariants

1. The ranking algorithm's three behaviors (urgency band, family round-robin, node_id tie-break) and the truncation order are each independently asserted by at least one regression test.
2. A regression that flips any single behavior (e.g., reverses urgency, reverses family alphabetical order, drops tie-break, reverses truncation slice) fails at least one test.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/tools/select-storylet-candidates.test.ts` — add five focused ranking tests with dedicated fixture-builder helpers (e.g., `buildRankingFixture`) so each test isolates a single ranking dimension.

### Commands

1. `cd tools/world-mcp && npm test` — full suite passes including the new ranking tests.
2. `cd tools/world-mcp && npm run build && node --test dist/tests/tools/select-storylet-candidates.test.js` — focused compiled proof.

## Outcome

(To be populated post-implementation.)

## Verification Result

(To be populated post-implementation.)
