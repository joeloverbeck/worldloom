# STOTURNCYC-005: select_storylet_candidates grounding_record_classes vocabulary trap (record_kind vs short codes) silently zeroes the shortlist

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `branching-story-turn-cycle` phase-2-3 reference (doc), `select_storylet_candidates` tool ergonomics (`tools/world-mcp/src/tools/select-storylet-candidates.ts`) + filter_trace message, and same-seam MCP public descriptions/docs.
**Deps**: None

## Problem

At intake, deriving `intent_signature.grounding_record_classes` for `select_storylet_candidates`, I passed the short codes authors see everywhere in `PG.state_snapshot.active_records` — `["STENT","STCHAR","BEL","THR","CLK","STLOC"]`. The `predicate_class` filter stage collapsed the shortlist from 4 to **0** and returned no candidates:

```
predicate_class_rejected_samples: SLT-3 indexed_classes ["belief_record","thread_record"] vs requested ["STENT","BEL",...] → "indexed predicate classes do not intersect requested or active record classes"
```

The index stores predicate classes as **`record_kind`** strings (`belief_record`, `thread_record`; `storylet_predicate_class` edges are keyed by `referencedClass`). Re-running with `["belief_record","thread_record",...]` produced the correct shortlist `[SLT-3, SLT-7]`. This exposed two pre-ticket problems:

1. **Undocumented vocabulary.** `references/phase-2-3-commitment-and-state-delta.md` says only "derive `intent_signature.grounding_record_classes` from those grounded record ids" — it never says the values must be `record_kind` strings, not the short class codes used everywhere else in the contract.
2. **Misleading trace + silent failure.** The rejection text says "requested **or active** record classes," implying active classes are unioned in as a fallback — but they are not when `grounding_record_classes` is supplied (otherwise SLT-2/SLT-4, whose classes are all active, would have survived). The result is a silent zero shortlist that could lead an author to wrongly conclude no author-pool block is eligible and JIT-create unnecessarily — contrary to the phase-2-3 instruction "Avoid pre-emptive JIT creation."

## Assumption Reassessment (2026-05-29)

1. `tools/world-mcp/src/tools/select-storylet-candidates.ts` — `grounding_record_classes?: string[]`; the `predicate_class` filter stage intersects these against the indexed `storylet_predicate_class` edge values.
2. `tools/world-index/src/parse/atomic.ts` — `storylet_predicate_class` edges are keyed by `referencedClass`; `referencedClass` is the `record_kind` (e.g., `belief_record`), confirming the required vocabulary.
3. `tools/world-mcp/src/server.ts` — `grounding_record_classes: z.array(z.string().min(1)).optional()` accepts any non-empty string, so short codes passed schema validation before this ticket and failed only at the intersection stage.
4. `.claude/skills/branching-story-turn-cycle/references/phase-2-3-commitment-and-state-delta.md` — instructs deriving `grounding_record_classes` without specifying vocabulary; this is the doc gap.
5. The MCP tool description for `select_storylet_candidates` documents `grounding_record_ids` narrowing but not the `grounding_record_classes` vocabulary.
6. Shared boundary under audit: the `intent_signature.grounding_record_classes` contract between (a) the turn-cycle phase-2-3 reference, (b) the `select_storylet_candidates` tool input, and (c) the `storylet_predicate_class` indexed edge vocabulary. Whether to fix by doc-only, tool-normalization, or both is the scope decision; recommendation is doc + a normalization/diagnostic so the trap can't silently recur.
7. FOUNDATIONS Tooling Recommendation: the projection pipeline is the prescribed selection surface; a silent-zero failure mode that nudges toward unnecessary JIT creation undermines author-pool reuse (FOUNDATIONS §Story Bundles §5a — blocks are reusable causal moves).
8. Pre-edit package baseline (2026-05-29): `cd tools/world-mcp && npm test` passed before source edits (`507` passing tests). The command shape is package-local and rebuilds `dist/` before running compiled tests.
9. Same-seam public surfaces: `tools/world-mcp/README.md`, `tools/world-mcp/src/server.ts`, and `docs/MACHINE-FACING-LAYER.md` all describe `select_storylet_candidates`; README/server metadata omit the `grounding_record_classes` vocabulary and are in scope. `docs/CONTEXT-PACKET-CONTRACT.md` only mentions embedded shortlist shape, not this input vocabulary, and is out of scope.
10. The normalization vocabulary must be the predicate DSL vocabulary, not every story-bundle record class; non-predicate tokens such as `PG` should be rejected instead of normalizing to a class that no predicate-class edge can match.

## Architecture Check

1. Normalizing short codes -> `record_kind` inside the tool and rejecting unknown class tokens removes a silent-zero failure mode that no schema layer caught. Pairing that with docs gives both prevention and a clear error if it recurs.
2. No shim: normalization is a single input-canonicalization step, not a parallel code path; the indexed vocabulary stays the single source of truth.

## Verification Layers

1. Doc states vocabulary -> codebase grep-proof: phase-2-3 reference names `record_kind` values with a short-code→record_kind example table.
2. Tool robustness -> tool/unit test: `select_storylet_candidates` with short-code `grounding_record_classes` normalizes and returns the correct shortlist; unknown class tokens return `invalid_input` before filtering.
3. Trace honesty -> manual review: the `predicate_class` rejection message no longer claims "or active record classes" when active classes are not unioned for the supplied-classes path.

## Landed Changes

### 1. phase-2-3 reference (doc)
The phase-2-3 reference now states that `intent_signature.grounding_record_classes` canonical values are predicate `record_kind` strings (`belief_record`, `thread_record`, `story_character_authority_record`, ...), includes short-code-to-record-kind examples, and notes that the MCP tool normalizes recognized predicate short codes while rejecting unknown or non-predicate class tokens.

### 2. select_storylet_candidates ergonomics (tool)
`select_storylet_candidates` now normalizes recognized predicate short codes to `record_kind` on input, emits `invalid_input` when a supplied class is neither a known predicate short code nor a known predicate `record_kind`, and uses separate `predicate_class` rejection messages for requested-class vs active-class filtering.

### 3. Public MCP descriptions

`tools/world-mcp/README.md`, `tools/world-mcp/src/server.ts`, and `docs/MACHINE-FACING-LAYER.md` now document the predicate `grounding_record_classes` vocabulary and normalization/rejection behavior.

## Files to Touch

- `.claude/skills/branching-story-turn-cycle/references/phase-2-3-commitment-and-state-delta.md` (modify)
- `tools/world-mcp/src/tools/select-storylet-candidates.ts` (modify)
- `tools/world-mcp/src/server.ts` (modify)
- `tools/world-mcp/README.md` (modify)
- `docs/MACHINE-FACING-LAYER.md` (modify)
- `tools/world-mcp/tests/tools/select-storylet-candidates.test.ts` (modify)

## Out of Scope

- Changing the indexed `storylet_predicate_class` vocabulary itself (record_kind stays canonical).
- The `grounding_record_ids` source-record-id stage (already documented and behaving correctly).

## Acceptance Criteria

### Tests That Must Pass

1. `select_storylet_candidates` with `grounding_record_classes` as canonical `record_kind` strings still returns the expected shortlist in existing regression coverage.
2. The same selection path with short codes returns the same shortlist through normalization.
3. Unknown or non-predicate class tokens return `invalid_input` with accepted predicate short-code and `record_kind` vocabularies instead of silently filtering to zero.
4. Grep-proof: phase-2-3 reference documents the `record_kind` vocabulary and short-code normalization behavior.

### Invariants

1. A supplied `grounding_record_classes` that uses the wrong vocabulary never silently produces a zero shortlist without a diagnostic.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/tools/select-storylet-candidates.test.ts` — short-code input normalizes to `record_kind`, and unknown/non-predicate vocabulary returns `invalid_input`.
2. Existing `tools/world-mcp/tests/tools/select-storylet-candidates.test.ts` and integration coverage keep canonical `record_kind` input behavior green.

### Commands

1. `cd tools/world-mcp && npm run build`
2. `cd tools/world-mcp && node --test dist/tests/tools/select-storylet-candidates.test.js`
3. `cd tools/world-mcp && npm test`
4. `rg -n 'requested or active record classes|grounding_record_classes|record_kind values|short codes' archive/tickets/STOTURNCYC-005.md .claude/skills/branching-story-turn-cycle/references/phase-2-3-commitment-and-state-delta.md tools/world-mcp/src/tools/select-storylet-candidates.ts tools/world-mcp/src/server.ts tools/world-mcp/README.md docs/MACHINE-FACING-LAYER.md tools/world-mcp/tests/tools/select-storylet-candidates.test.ts`

## Outcome

Completed on 2026-05-29. Implemented the `grounding_record_classes` vocabulary fix across the handler, tests, turn-cycle reference, package README, registered MCP description, and machine-facing docs. Recognized predicate short codes such as `BEL`, `THR`, `STQ`, and `STEMO` are canonicalized to their indexed `record_kind` values before predicate-class filtering. Unknown and non-predicate class tokens now return `invalid_input` with accepted predicate vocabularies instead of silently producing an empty shortlist. Predicate-class rejection reasons no longer claim active classes are considered when the caller supplied explicit requested classes.

## Verification Result

1. `cd tools/world-mcp && npm test` passed before source edits: `507` tests, `0` failures.
2. `cd tools/world-mcp && npm run build` passed after final predicate-DSL vocabulary tightening.
3. `cd tools/world-mcp && node --test dist/tests/tools/select-storylet-candidates.test.js` passed after final predicate-DSL vocabulary tightening: `21` tests, `0` failures.
4. `cd tools/world-mcp && npm test` passed after final predicate-DSL vocabulary tightening: `509` tests, `0` failures.
5. Manual grep/review confirmed current operational docs and code carry the `grounding_record_classes` vocabulary/normalization wording, and the stale runtime rejection phrase is absent from source/tests/docs. The original phrase remains only as labelled intake evidence in this ticket.
6. `git diff --check` passed after closeout edits.

## Deviations

1. The implementation chose normalization plus unknown-token rejection, not the alternate diagnostic-only path allowed by the draft.
2. Same-seam public surfaces expanded during reassessment to include `tools/world-mcp/README.md` and `tools/world-mcp/src/server.ts`; `docs/CONTEXT-PACKET-CONTRACT.md` was inspected and left out because it does not document this input vocabulary.
