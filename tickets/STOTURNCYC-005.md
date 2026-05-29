# STOTURNCYC-005: select_storylet_candidates grounding_record_classes vocabulary trap (record_kind vs short codes) silently zeroes the shortlist

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `branching-story-turn-cycle` phase-2-3 reference (doc), and `select_storylet_candidates` tool ergonomics (`tools/world-mcp/src/tools/select-storylet-candidates.ts`) + filter_trace message.
**Deps**: None

## Problem

Deriving `intent_signature.grounding_record_classes` for `select_storylet_candidates`, I passed the short codes authors see everywhere in `PG.state_snapshot.active_records` — `["STENT","STCHAR","BEL","THR","CLK","STLOC"]`. The `predicate_class` filter stage collapsed the shortlist from 4 to **0** and returned no candidates:

```
predicate_class_rejected_samples: SLT-3 indexed_classes ["belief_record","thread_record"] vs requested ["STENT","BEL",...] → "indexed predicate classes do not intersect requested or active record classes"
```

The index stores predicate classes as **`record_kind`** strings (`belief_record`, `thread_record`; see `tools/world-index/src/parse/atomic.ts:865` `storylet_predicate_class` edge keyed by `referencedClass`). Re-running with `["belief_record","thread_record",...]` produced the correct shortlist `[SLT-3, SLT-7]`. Two problems:

1. **Undocumented vocabulary.** `references/phase-2-3-commitment-and-state-delta.md` says only "derive `intent_signature.grounding_record_classes` from those grounded record ids" — it never says the values must be `record_kind` strings, not the short class codes used everywhere else in the contract.
2. **Misleading trace + silent failure.** The rejection text says "requested **or active** record classes," implying active classes are unioned in as a fallback — but they are not when `grounding_record_classes` is supplied (otherwise SLT-2/SLT-4, whose classes are all active, would have survived). The result is a silent zero shortlist that could lead an author to wrongly conclude no author-pool block is eligible and JIT-create unnecessarily — contrary to the phase-2-3 instruction "Avoid pre-emptive JIT creation."

## Assumption Reassessment (2026-05-29)

1. `tools/world-mcp/src/tools/select-storylet-candidates.ts:34` — `grounding_record_classes?: string[]`; the `predicate_class` filter stage (around `after_predicate_class`, line 46) intersects these against the indexed `storylet_predicate_class` edge values.
2. `tools/world-index/src/parse/atomic.ts:865` — `createStoryAttributeEdge(node.node_id, "storylet_predicate_class", storySlug, referencedClass)`; `referencedClass` is the `record_kind` (e.g., `belief_record`), confirming the required vocabulary.
3. `tools/world-mcp/src/server.ts:185` — `grounding_record_classes: z.array(z.string().min(1)).optional()` accepts any non-empty string, so short codes pass schema validation and fail only at the (silent) intersection stage.
4. `.claude/skills/branching-story-turn-cycle/references/phase-2-3-commitment-and-state-delta.md` — instructs deriving `grounding_record_classes` without specifying vocabulary; this is the doc gap.
5. The MCP tool description for `select_storylet_candidates` documents `grounding_record_ids` narrowing but not the `grounding_record_classes` vocabulary.
6. Shared boundary under audit: the `intent_signature.grounding_record_classes` contract between (a) the turn-cycle phase-2-3 reference, (b) the `select_storylet_candidates` tool input, and (c) the `storylet_predicate_class` indexed edge vocabulary. Whether to fix by doc-only, tool-normalization, or both is the scope decision; recommendation is doc + a normalization/diagnostic so the trap can't silently recur.
7. FOUNDATIONS Tooling Recommendation: the projection pipeline is the prescribed selection surface; a silent-zero failure mode that nudges toward unnecessary JIT creation undermines author-pool reuse (FOUNDATIONS §Story Bundles §5a — blocks are reusable causal moves).

## Architecture Check

1. Normalizing short codes → `record_kind` inside the tool (or rejecting them with a precise diagnostic) removes a silent-zero failure mode that no schema layer catches. Pairing with a doc fix gives both prevention and a clear error if it recurs — cleaner than relying on authors to memorize a second vocabulary.
2. No shim: normalization is a single input-canonicalization step, not a parallel code path; the indexed vocabulary stays the single source of truth.

## Verification Layers

1. Doc states vocabulary -> codebase grep-proof: phase-2-3 reference names `record_kind` values with a short-code→record_kind example table.
2. Tool robustness -> tool/unit test: `select_storylet_candidates` with short-code `grounding_record_classes` either normalizes and returns the correct shortlist OR returns a precise "expected record_kind, got short code" diagnostic (not a silent zero).
3. Trace honesty -> manual review: the `predicate_class` rejection message no longer claims "or active record classes" when active classes are not unioned for the supplied-classes path.

## What to Change

### 1. phase-2-3 reference (doc)
State that `intent_signature.grounding_record_classes` values are `record_kind` strings (`belief_record`, `thread_record`, `story_character_authority_record`, …), with a short-code→record_kind mapping example, and warn that short codes silently fail the `predicate_class` stage.

### 2. select_storylet_candidates ergonomics (tool)
Normalize recognized short codes to `record_kind` on input, OR emit a precise diagnostic when a supplied class is not a known `record_kind`. Correct the `predicate_class` rejection message so it does not imply an active-class union that does not occur for the supplied-classes path.

## Files to Touch

- `.claude/skills/branching-story-turn-cycle/references/phase-2-3-commitment-and-state-delta.md` (modify)
- `tools/world-mcp/src/tools/select-storylet-candidates.ts` (modify)
- `docs/MACHINE-FACING-LAYER.md` (modify, if it documents `select_storylet_candidates` inputs)
- `tools/world-mcp/tests/` or equivalent (new/modified test)

## Out of Scope

- Changing the indexed `storylet_predicate_class` vocabulary itself (record_kind stays canonical).
- The `grounding_record_ids` source-record-id stage (already documented and behaving correctly).

## Acceptance Criteria

### Tests That Must Pass

1. `select_storylet_candidates` with `grounding_record_classes: ["belief_record","thread_record"]` returns `[SLT-3, SLT-7]` for the PG-1 protection intent (regression baseline).
2. The same call with short codes `["BEL","THR"]` either returns the same shortlist (normalization) or returns a precise vocabulary diagnostic — never a silent empty shortlist with an "or active record classes" message.
3. Grep-proof: phase-2-3 reference documents the `record_kind` vocabulary.

### Invariants

1. A supplied `grounding_record_classes` that uses the wrong vocabulary never silently produces a zero shortlist without a diagnostic.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/` select-storylet-candidates case: short-code input → normalized/diagnosed, not silent zero.
2. `tools/world-mcp/tests/` regression: record_kind input returns the expected protection shortlist.

### Commands

1. `cd tools/world-mcp && npm run build && npm test`
2. Manual: re-run the PG-1 protection `select_storylet_candidates` call with short codes and confirm the new behavior.
3. The world-mcp tool test is the correct boundary because the failure is in the tool's input handling and projection-filter messaging, reproducible without a full turn-cycle.
