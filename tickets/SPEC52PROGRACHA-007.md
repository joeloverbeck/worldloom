# SPEC52PROGRACHA-007: NCB ID canonicalization + ID-convention docs

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `tools/world-index/src/parse/prose.ts` (modify `CANONICAL_ID_REGEX`); `CLAUDE.md` (modify §ID Allocation Conventions).
**Deps**: None

## Problem

The world-index `CANONICAL_ID_REGEX` recognizes NCP but not NCB, so batch records can't be canonicalized when frontmatter exposes `batch_id`; and NCP/NCB — which SPEC-52 first-classes as schema-validated record types — are absent from `CLAUDE.md` §ID Allocation Conventions. SPEC-52 D7+D8 close both gaps.

## Assumption Reassessment (2026-05-20)

1. `tools/world-index/src/parse/prose.ts` line 28 defines `CANONICAL_ID_REGEX = /^(DA|CHAR|PR|NCP|AU)-\d+$/` (no NCB); `STRUCTURED_ID_REGEX` (line 10) already includes both `NCP` and `NCB`. `worlds/<slug>/character-proposals/` is mapped to `character_proposal_card` and `character-proposals/batches/` to `character_proposal_batch` (FILE_RECORD_TYPES); `WHOLE_FILE_ID_FIELDS` canonicalizes NCP cards via `proposal_id`. Root `CLAUDE.md` §ID Allocation Conventions lists CF…RSP but NOT NCP/NCB (confirmed at SPEC-52 reassessment Improvement M2); the `allocate_next_id` allocator already supports both (`tools/world-mcp/src/tools/allocate-next-id.ts:21-22`).
2. SPEC-52 §Phase 5 item 7 + Deliverable 7 specify adding NCB to `CANONICAL_ID_REGEX`; SPEC-52 reassessment Improvement M2 + Deliverable 8 specify adding NCP/NCB to `CLAUDE.md` §ID Allocation Conventions. Both deliverables are merged here because both concern NCB/NCP ID first-classing and are individually small additive edits.
3. Cross-artifact boundary: the NCB id convention is shared between the world-index `CANONICAL_ID_REGEX` (code) and `CLAUDE.md` §ID Allocation Conventions (docs); the regex change must keep index semantics otherwise unchanged (NCP cards still canonicalize via `proposal_id`; only NCB batch records gain canonicalization via `batch_id`).

## Architecture Check

1. Adding NCB to the existing `CANONICAL_ID_REGEX` alternation is the minimal additive change; `STRUCTURED_ID_REGEX` already recognizes NCB, so this only closes the canonical-id gap for batch records. Documenting NCP/NCB in `CLAUDE.md` at the point where the spec formalizes their schema validation keeps the convention table complete.
2. No backwards-compatibility aliasing/shims — purely additive (one regex alternation member; two doc rows).

## Verification Layers

1. `CANONICAL_ID_REGEX` includes NCB → codebase grep-proof + world-index unit test (NCB canonicalizes via `batch_id`).
2. NCP/NCB present in `CLAUDE.md` §ID Allocation Conventions → grep-proof.
3. Index semantics otherwise unchanged (NCP via `proposal_id`; structured edges intact) → world-index test suite.

## What to Change

### 1. `tools/world-index/src/parse/prose.ts`

Change `CANONICAL_ID_REGEX` from `/^(DA|CHAR|PR|NCP|AU)-\d+$/` to include `NCB` (`/^(DA|CHAR|PR|NCP|NCB|AU)-\d+$/`). No other index-semantics change.

### 2. `CLAUDE.md` §ID Allocation Conventions

Add `NCP-<integer>` (character proposal cards, `worlds/<slug>/character-proposals/`) and `NCB-<integer>` (character proposal batch manifests, `worlds/<slug>/character-proposals/batches/`) to the §ID Allocation Conventions list, consistent with the existing entry format.

## Files to Touch

- `tools/world-index/src/parse/prose.ts` (modify)
- `CLAUDE.md` (modify)

## Out of Scope

- Any schema or validator change (005/006).
- Any skill change (001, `archive/tickets/SPEC52PROGRACHA-002.md`, 003, or 004).
- Changing how NCP cards canonicalize (`proposal_id` is unchanged); changing `STRUCTURED_ID_REGEX` (already includes NCB).

## Acceptance Criteria

### Tests That Must Pass

1. `npm test --prefix tools/world-index` — NCB batch records canonicalize via `batch_id`; NCP and all other id classes unchanged.
2. `grep -nE "NCP|NCB" CLAUDE.md` returns the new §ID Allocation Conventions entries.
3. `grep -n "NCB" tools/world-index/src/parse/prose.ts` shows NCB in `CANONICAL_ID_REGEX`.

### Invariants

1. The regex change is additive (NCB added to the alternation); NCP canonicalization via `proposal_id` is unchanged.
2. `CLAUDE.md` §ID Allocation Conventions documents NCP and NCB in the established format.

## Test Plan

### New/Modified Tests

1. `tools/world-index/tests/**/prose.test.ts` (or sibling per the package's test layout) — NCB canonical-id case.

### Commands

1. `npm test --prefix tools/world-index`
2. `grep -nE "CANONICAL_ID_REGEX|NCB" tools/world-index/src/parse/prose.ts && grep -nE "NCP-<integer>|NCB-<integer>" CLAUDE.md`
