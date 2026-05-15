# MCPENH-048: Remove retired root-file prose parser node-type branches after the `narrative_section` split

**Status**: COMPLETED
**Priority**: LOW
**Effort**: Small
**Engine Changes**: Yes — `tools/world-index/src/parse/prose.ts` and focused parser tests.
**Deps**: `archive/tickets/MCPENH-047.md`

## Problem

At intake, MCPENH-047 had separated primary-authored `WORLD_KERNEL.md` H2 spans from atomic SEC records by adding the `narrative_section` node type. During that reassessment, it also confirmed that `tools/world-index/src/parse/prose.ts:nodeTypeForHeading` still contained special-case branches for pre-SPEC-13 root-level files:

- `MYSTERY_RESERVE.md` H2 -> `mystery_reserve_entry`
- `OPEN_QUESTIONS.md` H2 -> `open_question_entry`
- `INVARIANTS.md` H2 -> `invariant`

Those files do not exist on modern machine-layer-enabled worlds; their canon records live as atomic YAML under `_source/`. Before this ticket, leaving the branches in place made the current parser contract harder to reason about after `WORLD_KERNEL.md` received its own explicit narrative-span classification.

## Assumption Reassessment (2026-05-16)

1. Current code check: before implementation, `tools/world-index/src/parse/prose.ts:nodeTypeForHeading` still mapped `MYSTERY_RESERVE.md`, `OPEN_QUESTIONS.md`, and `INVARIANTS.md` depth-2 headings to atomic-style node types. `ONTOLOGY.md` and `WORLD_KERNEL.md` remain current primary-authored root files and are not part of this cleanup.
2. Current docs check: `docs/FOUNDATIONS.md` §Mandatory World Files and §Canonical Storage Layer state that canon ledger, invariants, Mystery Reserve, open questions, and SEC records are atomic YAML under `_source/`; `WORLD_KERNEL.md` and reduced `ONTOLOGY.md` remain primary-authored root files.
3. Shared boundary under audit: the `@worldloom/world-index` parser/storage vocabulary boundary. The cleanup must not change atomic YAML parsing for `_source/invariants/`, `_source/mystery-reserve/`, or `_source/open-questions/`, and must not remove primary-authored `WORLD_KERNEL.md` / `ONTOLOGY.md` prose indexing.
4. FOUNDATIONS principle under audit: machine-layer-enabled worlds use `_source/` as the sole source of truth for atomized INV / M / OQ records. Retired root-level monolith parsing should not look like a current supported canon path.
5. Adjacent contradiction source: `archive/tickets/MCPENH-047.md` explicitly classified these branches as future cleanup after the `narrative_section` split, not as part of that ticket's owned fix.
6. Blast-radius result: the live current-contract hits for `MYSTERY_RESERVE.md`, `OPEN_QUESTIONS.md`, `INVARIANTS.md`, `mystery_reserve_entry`, `open_question_entry`, and `nodeTypeForHeading` were the retired branches in `tools/world-index/src/parse/prose.ts`, legitimate atomic-source/parser vocabulary in `tools/world-index/src/parse/atomic.ts`, `tools/world-index/src/schema/types.ts`, and consumer docs/skills that still name atomic node types. `docs/MACHINE-FACING-LAYER.md` already states the retired root files do not exist on machine-layer-enabled worlds. No package README or repo docs needed a same-seam edit.
7. Baseline proof before source edits was green: `cd tools/world-index && npm run build`, `cd tools/world-index && node --test dist/tests/prose-domain-file.test.js dist/tests/atomic-source-input.test.js`, and `cd tools/world-index && npm test`.

## Architecture Check

1. Removing retired root-file branches keeps the parser's current root-file taxonomy explicit: `WORLD_KERNEL.md` emits narrative sections, reduced `ONTOLOGY.md` emits ontology categories, and atomized canon records come from `_source/`.
2. No backwards-compatibility aliasing/shims introduced. If legacy-world support is still intentionally required for these retired root files, reassessment must stop and rewrite this ticket to document that support boundary instead of silently preserving dead code.

## Verification Layers

1. Retired root-file branches are gone from the current parser contract -> codebase grep-proof over `tools/world-index/src/parse/prose.ts` and same-package tests.
2. Atomic INV / M / OQ records still index through `_source/` -> existing atomic-source package tests.
3. `WORLD_KERNEL.md` and `ONTOLOGY.md` current root-file prose indexing still works -> focused prose-domain-file tests.
4. FOUNDATIONS alignment remains intact -> manual check against `docs/FOUNDATIONS.md` §Mandatory World Files and §Canonical Storage Layer.

## Landed Changes

### 1. Remove retired root-file branches

Deleted the `MYSTERY_RESERVE.md`, `OPEN_QUESTIONS.md`, and `INVARIANTS.md` branches from `nodeTypeForHeading`.

### 2. Truth tests and fixtures

Added parser coverage proving those retired root-level markdown files no longer emit atomic-style node types through the prose parser. Existing atomic `_source/` coverage and current primary-authored root-file coverage remain in place.

### 3. Sweep current docs and package surfaces

Searched live docs/package surfaces for wording that presents retired root-level INV / M / OQ prose parsing as current behavior. No current-contract doc update was needed; `docs/MACHINE-FACING-LAYER.md` already describes the retired root files as absent from machine-layer-enabled worlds.

## Files to Touch

- `tools/world-index/src/parse/prose.ts` (modify)
- `tools/world-index/tests/prose-domain-file.test.ts` (modify)

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

1. `tools/world-index/tests/prose-domain-file.test.ts` — added focused coverage that retired root-file H2 spans no longer emit atomic node types through prose parsing while current root-file parsing remains explicit.
2. Existing atomic-source tests — prove INV / M / OQ records still index through `_source/`.

### Commands

1. `cd tools/world-index && npm run build`
2. `cd tools/world-index && node --test dist/tests/prose-domain-file.test.js dist/tests/atomic-source-input.test.js`
3. `cd tools/world-index && npm test`

## Outcome

Completed: 2026-05-16.

`nodeTypeForHeading` no longer special-cases retired root-level `MYSTERY_RESERVE.md`, `OPEN_QUESTIONS.md`, or `INVARIANTS.md` H2 headings as atomic-style node types. `ONTOLOGY.md` still emits `ontology_category`, `WORLD_KERNEL.md` still emits `narrative_section`, and generic depth-2 prose headings still fall through to `section`.

The focused parser test now proves the retired root filenames do not emit `mystery_reserve_entry`, `open_question_entry`, or `invariant` through prose parsing. Atomic-source tests continue to cover the canonical `_source/` INV / M / OQ record path.

## Verification Result

Passed:

1. `cd tools/world-index && npm run build`
2. `cd tools/world-index && node --test dist/tests/prose-domain-file.test.js dist/tests/atomic-source-input.test.js` — 10 tests passed.
3. `cd tools/world-index && npm test` — 84 tests passed.
4. `rg -n 'relativeFilePath === "(MYSTERY_RESERVE|OPEN_QUESTIONS|INVARIANTS)\.md"|return "(mystery_reserve_entry|open_question_entry|invariant)"' tools/world-index/src/parse/prose.ts tools/world-index/tests/prose-domain-file.test.ts` — expected no-match result; no retired branch or atomic-style return remains on the prose-parser/test surface.
5. Manual FOUNDATIONS alignment check: `docs/FOUNDATIONS.md` §Mandatory World Files and §Canonical Storage Layer keep INV / M / OQ records under `_source/`, while `WORLD_KERNEL.md` and `ONTOLOGY.md` remain primary-authored root files.

## Deviations

- No docs or package README edits were needed. The only live current-contract doc hit, `docs/MACHINE-FACING-LAYER.md`, already describes the retired root files as absent on machine-layer-enabled worlds.
- The removed root-file paths still appear in legacy fixtures, scripts, historical examples, and current atomic-source vocabulary surfaces. Those hits are not retired prose-parser branch support and remain outside this ticket.
