# MCPENH-048: Remove retired root-file prose parser node-type branches after the `narrative_section` split

**Status**: PENDING
**Priority**: LOW
**Effort**: Small
**Engine Changes**: Yes — `tools/world-index/src/parse/prose.ts`, adjacent parser tests, and any package docs or fixtures that still describe retired root-level `MYSTERY_RESERVE.md` / `OPEN_QUESTIONS.md` / `INVARIANTS.md` prose-node emission as current behavior.
**Deps**: `archive/tickets/MCPENH-047.md`

## Problem

MCPENH-047 separated primary-authored `WORLD_KERNEL.md` H2 spans from atomic SEC records by adding the `narrative_section` node type. During that reassessment, it also confirmed that `tools/world-index/src/parse/prose.ts:nodeTypeForHeading` still contains special-case branches for pre-SPEC-13 root-level files:

- `MYSTERY_RESERVE.md` H2 -> `mystery_reserve_entry`
- `OPEN_QUESTIONS.md` H2 -> `open_question_entry`
- `INVARIANTS.md` H2 -> `invariant`

Those files do not exist on modern machine-layer-enabled worlds; their canon records live as atomic YAML under `_source/`. Leaving the branches in place makes the current parser contract harder to reason about after `WORLD_KERNEL.md` received its own explicit narrative-span classification.

## Assumption Reassessment (2026-05-16)

1. Current code check: `tools/world-index/src/parse/prose.ts:280-290` still maps `MYSTERY_RESERVE.md`, `OPEN_QUESTIONS.md`, and `INVARIANTS.md` depth-2 headings to atomic-style node types. `ONTOLOGY.md` and `WORLD_KERNEL.md` remain current primary-authored root files and are not part of this cleanup.
2. Current docs check: `docs/FOUNDATIONS.md` §Mandatory World Files and §Canonical Storage Layer state that canon ledger, invariants, Mystery Reserve, open questions, and SEC records are atomic YAML under `_source/`; `WORLD_KERNEL.md` and reduced `ONTOLOGY.md` remain primary-authored root files.
3. Shared boundary under audit: the `@worldloom/world-index` parser/storage vocabulary boundary. The cleanup must not change atomic YAML parsing for `_source/invariants/`, `_source/mystery-reserve/`, or `_source/open-questions/`, and must not remove primary-authored `WORLD_KERNEL.md` / `ONTOLOGY.md` prose indexing.
4. FOUNDATIONS principle under audit: machine-layer-enabled worlds use `_source/` as the sole source of truth for atomized INV / M / OQ records. Retired root-level monolith parsing should not look like a current supported canon path.
5. Adjacent contradiction source: `archive/tickets/MCPENH-047.md` explicitly classified these branches as future cleanup after the `narrative_section` split, not as part of that ticket's owned fix.
6. Blast-radius starting point: search current code/tests/docs for `MYSTERY_RESERVE.md`, `OPEN_QUESTIONS.md`, `INVARIANTS.md`, `mystery_reserve_entry`, `open_question_entry`, and `nodeTypeForHeading` before editing. Classify historical archived references separately from live parser, fixture, test, and docs surfaces.

## Architecture Check

1. Removing retired root-file branches keeps the parser's current root-file taxonomy explicit: `WORLD_KERNEL.md` emits narrative sections, reduced `ONTOLOGY.md` emits ontology categories, and atomized canon records come from `_source/`.
2. No backwards-compatibility aliasing/shims introduced. If legacy-world support is still intentionally required for these retired root files, reassessment must stop and rewrite this ticket to document that support boundary instead of silently preserving dead code.

## Verification Layers

1. Retired root-file branches are gone from the current parser contract -> codebase grep-proof over `tools/world-index/src/parse/prose.ts` and same-package tests.
2. Atomic INV / M / OQ records still index through `_source/` -> existing atomic-source package tests.
3. `WORLD_KERNEL.md` and `ONTOLOGY.md` current root-file prose indexing still works -> focused prose-domain-file tests.
4. FOUNDATIONS alignment remains intact -> manual check against `docs/FOUNDATIONS.md` §Mandatory World Files and §Canonical Storage Layer.

## What to Change

### 1. Remove retired root-file branches

Delete the `MYSTERY_RESERVE.md`, `OPEN_QUESTIONS.md`, and `INVARIANTS.md` branches from `nodeTypeForHeading`.

### 2. Truth tests and fixtures

Update parser tests or fixtures that still expect those retired root-level markdown files to emit atomic node types through the prose parser. Preserve coverage for atomic `_source/` records and for current primary-authored root files.

### 3. Sweep current docs and package surfaces

Search live docs/package surfaces for wording that presents retired root-level INV / M / OQ prose parsing as current behavior. Update current-contract docs if found; leave archived historical references alone.

## Files to Touch

- `tools/world-index/src/parse/prose.ts` (modify)
- `tools/world-index/tests/` (modify as needed)
- `tools/world-index/README.md` or repo docs (modify only if current-contract prose is stale)

## Out of Scope

- Removing the prose parser wholesale.
- Changing `WORLD_KERNEL.md` `narrative_section` behavior from MCPENH-047.
- Changing `ONTOLOGY.md` root-file ontology-category indexing.
- Migrating or editing any world content.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/world-index && npm run build`
2. `cd tools/world-index && node --test dist/tests/prose-domain-file.test.js dist/tests/atomic-source-input.test.js`
3. `cd tools/world-index && npm test`

### Invariants

1. Retired root-level `MYSTERY_RESERVE.md`, `OPEN_QUESTIONS.md`, and `INVARIANTS.md` are not represented as current parser special cases.
2. Atomic `_source/` records for Mystery Reserve, Open Questions, and Invariants still index as their canonical node types.
3. Current primary-authored root files remain supported: `WORLD_KERNEL.md` H2 spans as `narrative_section`, `ONTOLOGY.md` H2 spans as `ontology_category`.

## Test Plan

### New/Modified Tests

1. `tools/world-index/tests/prose-domain-file.test.ts` — update or add focused coverage so current root-file parsing remains explicit after removing retired branches.
2. Existing atomic-source tests — prove INV / M / OQ records still index through `_source/`.

### Commands

1. `cd tools/world-index && npm run build`
2. `cd tools/world-index && node --test dist/tests/prose-domain-file.test.js dist/tests/atomic-source-input.test.js`
3. `cd tools/world-index && npm test`
