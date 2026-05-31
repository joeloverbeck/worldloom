# SPEC104BEATEMDET-003: recent-use.ts: scan segment sidecars for selected_template

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — new module `tools/manual-story-studio/src/templates/recent-use.ts` (pure function over manual-story.yaml + segment sidecars)
**Deps**: 001

## Problem

SPEC-104 §2.2 stage 8 introduces a "recent-use advisory" — templates used in the last N segments are surfaced with an advisory badge (NOT a hard block). The window size `N` is the `prompt_policy.recent_template_advisory_window` field (default `2`) that ticket 001 adds to the schema. The filter pipeline (ticket 005) consumes the per-template last-used-segment computation as one of its stage-9 sort inputs and as the advisory-flag source. This ticket lands the pure function that scans the segment sidecars and computes per-template last-used state.

## Assumption Reassessment (2026-05-31)

1. Codebase: `tools/manual-story-studio/src/write/segments.ts:35,47,98,157-159,259,266,292,306` and `tools/manual-story-studio/web/src/types/manual-story.ts:113` define the segment sidecar's `selected_template: string | null` field (per SPEC-103's landed schema); `tools/manual-story-studio/src/write/segments.ts:292` maps the prompt sidecar's `included_template_path` to the segment's `selected_template` at segment-save time. The `segment_order` field on `manual-story.yaml` (per SPEC-101 §2.1) is the source-of-truth ordering of segments; segment sidecars live at `segments/SEG-<integer>.yaml` under the manual-story root.
2. Spec: SPEC-104 §2.2 stage 8 declares the recent-use advisory consumes the window field from `prompt_policy`; §2.1 in-scope item 1 (the `prompt_policy` extension) defines the field as `recent_template_advisory_window: int (default 2)` and notes `Setting to 0 disables the advisory entirely`.
3. Cross-skill boundary: this function reads `manual-story.yaml prompt_policy.recent_template_advisory_window` (added by ticket 001) and the trailing N segment sidecars (per `segment_order`) for their `selected_template` field (existing SPEC-103 surface, unchanged). It is consumed by `filter.ts` (ticket 005). No write side; no canon impact (the entire surface is inside the SPEC-100 canon-pipeline-fenced manual-story-studio sandbox).

## Architecture Check

1. Pure function consuming the read surface only — no I/O beyond YAML reads, no mutation of any record. This isolates the recent-use computation behind a stable interface that filter.ts (ticket 005) calls deterministically. Alternative considered and rejected: tracking last-used state on the template itself (e.g., a `last_used_at_segment: SEG-N` field stored on the beat-template record) — rejected because the spec §3 key decision explicitly says "Recent-use advisory is computed at filter time from segment sidecars (which template each segment selected) — not stored on the template" (avoids template-side writes on every segment save).
2. No backwards-compatibility aliasing or shims introduced. The function is greenfield; consumes only existing schema surfaces (segment sidecar `selected_template`, manual-story.yaml `prompt_policy.recent_template_advisory_window`).

## Verification Layers

1. Window-size semantics: when `recent_template_advisory_window: 2`, scan trailing 2 segments → codebase grep-proof + targeted test against a fixture with 5 segments (latest 2 referenced).
2. Disable semantics: when `recent_template_advisory_window: 0`, advisory disabled → return empty per-template-last-used map regardless of segment count → targeted test.
3. Null-handling: segments with `selected_template: null` (no template was used) are skipped → targeted test against a mixed fixture (some segments null, some with template ID).
4. Determinism: same inputs → same output → targeted test runs the function twice on the same fixture and asserts byte-identical return.

## What to Change

### 1. Create `tools/manual-story-studio/src/templates/recent-use.ts`

Export a pure function:

```
computeRecentUseMap(input: {
  manualStoryRoot: string;
  segmentOrder: string[];  // from manual-story.yaml `segment_order`
  recentWindow: number;    // from manual-story.yaml `prompt_policy.recent_template_advisory_window`
}): {
  recentTemplates: Map<string, number>;  // mtemplate-N → most-recent segment index
  windowSize: number;
}
```

Behavior:
- If `recentWindow === 0`, return `{ recentTemplates: new Map(), windowSize: 0 }`.
- Otherwise, take the trailing `recentWindow` entries of `segmentOrder`; read each sidecar at `<manualStoryRoot>/segments/<SEG-id>.yaml`; collect each segment's `selected_template`; build a map from each non-null template ID to its most-recent segment-order index (the highest index wins on collision).
- Skip sidecars whose `selected_template` is null.
- Skip sidecars that are missing on disk (treat as `selected_template: null`).

The map is consumed by `filter.ts` (ticket 005) at stage 9 sort (deprioritize recently-used templates).

## Files to Touch

- `tools/manual-story-studio/src/templates/recent-use.ts` (new)
- `tools/manual-story-studio/test/templates/recent-use.test.ts` (new)

## Out of Scope

- The `prompt_policy.recent_template_advisory_window` field declaration — ticket 001.
- The filter consumer that calls this function — ticket 005.
- The candidate-card UI that displays the advisory badge — ticket 012.
- Writes to segment sidecars or the manual-story.yaml — ticket 005 / 012 (none of these write either surface).

## Acceptance Criteria

### Tests That Must Pass

1. `computeRecentUseMap` against a 5-segment fixture (segments 1, 3, 5 reference `mtemplate-7`; segments 2, 4 reference null) with `recentWindow: 2` returns a map with `mtemplate-7 → 5` (the trailing 2 segments are 4 and 5; segment 5 references mtemplate-7).
2. `computeRecentUseMap` with `recentWindow: 0` returns an empty map regardless of segment fixture.
3. `computeRecentUseMap` against a fixture with all-null `selected_template` returns an empty map.
4. `computeRecentUseMap` is deterministic — same inputs called twice return byte-identical maps.
5. `computeRecentUseMap` gracefully handles missing segment sidecar files (treats as null `selected_template`) — fixture with a sidecar deleted between segment_order and disk.

### Invariants

1. The function reads but never writes the manual-story-studio surface.
2. Window semantics: `recentWindow` is the count of trailing segments to scan; values ≥ `segmentOrder.length` scan all segments without error.
3. Determinism: pure function over the inputs; same inputs → same output.

## Test Plan

### New/Modified Tests

1. `tools/manual-story-studio/test/templates/recent-use.test.ts` (new) — covers each acceptance criterion + the missing-sidecar graceful-handling case. Uses fixture manual-story directories under `test/fixtures/recent-use/`.

### Commands

1. `cd tools/manual-story-studio && npm run build:backend && node --test "dist/test/templates/recent-use.test.js"` (targeted verification).
2. `cd tools/manual-story-studio && npm test` (full-pipeline verification).
3. The targeted command above is the correct verification boundary because the function is a pure read over fixture data; integration with `filter.ts` is exercised by ticket 005's tests.
