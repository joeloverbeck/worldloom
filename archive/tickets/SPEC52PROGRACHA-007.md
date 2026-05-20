# SPEC52PROGRACHA-007: NCB ID canonicalization + ID-convention docs

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `tools/world-index/src/parse/prose.ts` (modify `CANONICAL_ID_REGEX` and NCB batch frontmatter canonicalization), `tools/world-index/tests/prose-whole-file.test.ts` (NCB regression), and `CLAUDE.md` (modify §ID Allocation Conventions).
**Deps**: None

## Problem

At intake, the world-index `CANONICAL_ID_REGEX` recognized NCP but not NCB, and the `character-proposals/batches/` whole-file branch did not pass `batch_id` frontmatter into canonical node-id selection, so NCB batch records with slug filenames could not canonicalize from frontmatter. NCP/NCB were also absent from `CLAUDE.md` §ID Allocation Conventions. SPEC-52 D7+D8 close both gaps.

## Assumption Reassessment (2026-05-20)

1. `tools/world-index/src/parse/prose.ts` line 28 defines `CANONICAL_ID_REGEX = /^(DA|CHAR|PR|NCP|AU)-\d+$/` (no NCB); `STRUCTURED_ID_REGEX` (line 10) already includes both `NCP` and `NCB`. `worlds/<slug>/character-proposals/` is mapped to `character_proposal_card` and `character-proposals/batches/` to `character_proposal_batch` (FILE_RECORD_TYPES); `WHOLE_FILE_ID_FIELDS` canonicalizes NCP cards via `proposal_id`. Root `CLAUDE.md` §ID Allocation Conventions lists CF…RSP but NOT NCP/NCB (confirmed at SPEC-52 reassessment Improvement M2); the `allocate_next_id` allocator already supports both (`tools/world-mcp/src/tools/allocate-next-id.ts:21-22`).
2. SPEC-52 §Phase 5 item 7 + Deliverable 7 specify adding NCB to `CANONICAL_ID_REGEX`; SPEC-52 reassessment Improvement M2 + Deliverable 8 specify adding NCP/NCB to `CLAUDE.md` §ID Allocation Conventions. Both deliverables are merged here because both concern NCB/NCP ID first-classing and are individually small additive edits.
3. Cross-artifact boundary: the NCB id convention is shared between the world-index `CANONICAL_ID_REGEX` (code) and `CLAUDE.md` §ID Allocation Conventions (docs); the regex change must keep index semantics otherwise unchanged (NCP cards still canonicalize via `proposal_id`; only NCB batch records gain canonicalization via `batch_id`).
4. Live parser correction: the drafted "regex only" source edit was necessary but not sufficient because nested `character-proposals/batches/` whole-file records bypass `canonicalWholeFileNodeId(...)` and previously fell back to the filename. The implementation therefore adds a shared `canonicalFrontmatterNodeId(...)` helper and passes `batch_id` as `preferredNodeId` for `character_proposal_batch` records. This stays inside the D7 owner boundary because it is the minimal code needed to prove "NCB batch records canonicalize via `batch_id`."

## Architecture Check

1. Adding NCB to the existing `CANONICAL_ID_REGEX` alternation is the minimal additive change; `STRUCTURED_ID_REGEX` already recognizes NCB, so this only closes the canonical-id gap for batch records. Documenting NCP/NCB in `CLAUDE.md` at the point where the spec formalizes their schema validation keeps the convention table complete.
2. No backwards-compatibility aliasing/shims — purely additive (one regex alternation member; two doc rows).

## Verification Layers

1. `CANONICAL_ID_REGEX` includes NCB → codebase grep-proof + world-index unit test (NCB canonicalizes via `batch_id`).
2. NCP/NCB present in `CLAUDE.md` §ID Allocation Conventions → grep-proof.
3. Index semantics otherwise unchanged (NCP via `proposal_id`; structured edges intact) → world-index test suite.

## Landed Changes

### 1. `tools/world-index/src/parse/prose.ts`

Changed `CANONICAL_ID_REGEX` from `/^(DA|CHAR|PR|NCP|AU)-\d+$/` to include `NCB` (`/^(DA|CHAR|PR|NCP|NCB|AU)-\d+$/`). Added `batch_id` frontmatter canonicalization for `character_proposal_batch` whole-file records so slug filenames can still resolve to the NCB id in frontmatter.

### 2. `CLAUDE.md` §ID Allocation Conventions

Added `NCP-<integer>` (character proposal cards, `worlds/<slug>/character-proposals/`) and `NCB-<integer>` (character proposal batch manifests, `worlds/<slug>/character-proposals/batches/`) to the §ID Allocation Conventions list, consistent with the existing entry format.

### 3. `tools/world-index/tests/prose-whole-file.test.ts`

Extended the whole-file canonical-frontmatter-id test with an `NCB-0001` character-proposal batch case whose filename is a slug rather than the id.

## Files to Touch

- `tools/world-index/src/parse/prose.ts` (modify)
- `tools/world-index/tests/prose-whole-file.test.ts` (modify)
- `CLAUDE.md` (modify)

## Out of Scope

- Any schema or validator change (005/006).
- Any skill change (001, `archive/tickets/SPEC52PROGRACHA-002.md`, 003, or 004).
- Changing how NCP cards canonicalize (`proposal_id` is unchanged); changing `STRUCTURED_ID_REGEX` (already includes NCB).

## Acceptance Criteria

### Tests That Must Pass

1. From `tools/world-index`: `npm run build` followed by `npm test` — NCB batch records canonicalize via `batch_id`; NCP and all other id classes unchanged.
2. `grep -nE "NCP-<integer>|NCB-<integer>" CLAUDE.md` returns the new §ID Allocation Conventions entries.
3. `grep -nE "CANONICAL_ID_REGEX|NCB" tools/world-index/src/parse/prose.ts` shows NCB in `CANONICAL_ID_REGEX`.

### Invariants

1. The regex change is additive (NCB added to the alternation); NCP canonicalization via `proposal_id` is unchanged.
2. `CLAUDE.md` §ID Allocation Conventions documents NCP and NCB in the established format.

## Test Plan

### New/Modified Tests

1. `tools/world-index/tests/prose-whole-file.test.ts` — NCB canonical-id case for `character-proposals/batches/` using `batch_id` frontmatter.

### Commands

1. From `tools/world-index`: `npm run build`
2. From `tools/world-index`: `npm test`
3. `grep -nE "CANONICAL_ID_REGEX|NCB" tools/world-index/src/parse/prose.ts`
4. `grep -nE "NCP-<integer>|NCB-<integer>" CLAUDE.md`

## Outcome

Completed. NCB is now accepted as a canonical whole-file id, and `character_proposal_batch` records can derive their node id from `batch_id` frontmatter rather than only from an id-shaped filename. `CLAUDE.md` now documents both NCP and NCB ID allocation conventions.

## Verification Result

Passed:

1. From `tools/world-index`: `npm run build` — TypeScript build passed.
2. From `tools/world-index`: `npm test` — 124 tests passed, including the new `NCB-0001` whole-file frontmatter case.
3. `grep -nE "CANONICAL_ID_REGEX|NCB" tools/world-index/src/parse/prose.ts` — `NCB` is present in `STRUCTURED_ID_REGEX` and `CANONICAL_ID_REGEX`.
4. `grep -nE "NCP-<integer>|NCB-<integer>" CLAUDE.md` — both ID convention entries are present.

## Deviations

1. The implementation touched `tools/world-index/tests/prose-whole-file.test.ts` in addition to the drafted source/doc files because the parser change needed a direct regression test.
2. The source edit was slightly broader than the drafted regex-only change: nested character-proposal batch files were not using frontmatter canonicalization at all, so `batch_id` had to be passed to `createNodeRow` before the `NCB` regex addition could prove the claimed behavior.
3. The proof was run from the package root as `npm run build` followed by `npm test`, because the package test script consumes compiled `dist/` tests.
