# SPEC103PROPASSEG-002: docs/ID-ALLOCATION.md — register SEG-N + PROMPT-N classes

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — extends `docs/ID-ALLOCATION.md` `### Manual-story-scoped` section to enumerate two additional per-manual-story append-only ID classes.
**Deps**: None

## Problem

SPEC-101 added the `### Manual-story-scoped` section to `docs/ID-ALLOCATION.md` (lines 46-72) enumerating the 18 lowercase `m`-prefix record classes Manual Story Studio allocates. SPEC-102 subsequently introduced the per-manual-story `PROMPT-<integer>` class (allocated by `tools/manual-story-studio/src/write/prompts.ts`) without docs registration. SPEC-103 introduces the per-manual-story `SEG-<integer>` class (allocated by `tools/manual-story-studio/src/write/segment-id-allocator.ts`, parallel pattern). Both classes need explicit enumeration so future readers can discover every per-manual-story append-only class from one canonical registry (Rule 6 audit-trail at the pipeline-documentation level).

## Assumption Reassessment (2026-05-31)

1. `docs/ID-ALLOCATION.md` `### Manual-story-scoped` section at lines 46-72 currently enumerates the 18 mclass prefixes from SPEC-101 (`mchar-*`, `mbel-*`, `mrel-*`, etc.). The introductory paragraph cites "(per SPEC-100 / SPEC-101)". `SEG-<integer>` and `PROMPT-<integer>` are both absent. (Verified via session grep at this implementation batch's Pre-flight + at the SPEC-103 reassessment Step 3.)
2. SPEC-103 §4 Modify includes `docs/ID-ALLOCATION.md` extension (added during reassessment per finding I3). SPEC-103 §5 FOUNDATIONS alignment table cites FOUNDATIONS-002 (unpadded natural-integer ID format) for the new `SEG-<integer>` class.
3. Cross-skill boundary: `docs/ID-ALLOCATION.md` is the canonical per-class ID registry that every skill / tool / allocator consults to know which prefixes are in use across the pipeline. Updates to this file are pipeline-wide documentation contracts; an unregistered class causes silent ID conflicts the next time another skill scans `docs/ID-ALLOCATION.md` to derive a new prefix (Rule 6 No Silent Retcons applied at pipeline-documentation level — new ID classes must be discoverable from the registry, not buried in skill or tool source).

## Architecture Check

1. Extending the existing `### Manual-story-scoped` section preserves the convention SPEC-101 established (table-driven per-class enumeration with file layout + allocator path + per-class notes), rather than introducing a parallel per-spec ID-registration surface. New entries land in one canonical location, where future readers expect them.
2. No backwards-compatibility aliasing — purely additive enumeration of two new classes; the existing 18-mclass enumeration is preserved verbatim.

## Verification Layers

1. `docs/ID-ALLOCATION.md` `### Manual-story-scoped` section names `SEG-<integer>` with file layout (`segments/SEG-<integer>.md` + `segments/SEG-<integer>.yaml`) + allocator path (`tools/manual-story-studio/src/write/segment-id-allocator.ts`) → codebase grep-proof
2. Same section names `PROMPT-<integer>` with file layout (`prompts/PROMPT-<integer>.md` + `prompt-runs/PROMPT-<integer>.yaml`) + allocator path (`tools/manual-story-studio/src/write/prompts.ts`) → codebase grep-proof
3. Introductory paragraph attribution updated from `(per SPEC-100 / SPEC-101)` to `(per SPEC-100 / SPEC-101 / SPEC-102 / SPEC-103)` → codebase grep-proof
4. Docs-only ticket; no behavioral invariant to assert via test — verification is structural (grep against the modified docs surface).

## What to Change

### 1. Append SEG-N + PROMPT-N enumeration to Manual-story-scoped section

In `docs/ID-ALLOCATION.md`, after the 18-mclass enumeration block (around line 70, before the `### Manual-story-scoped` section's closing paragraph about `manual-story.yaml` not being an ID-bearing record), append two new bullet items consistent with the section's existing entry shape:

```markdown
- `SEG-<integer>` — segments (`segments/SEG-<integer>.md` prose body + `segments/SEG-<integer>.yaml` sidecar; allocated by `tools/manual-story-studio/src/write/segment-id-allocator.ts`; per-manual-story append-only; gaps from hard-delete preserved). Format follows the FOUNDATIONS-002 unpadded natural-integer convention.
- `PROMPT-<integer>` — saved prompt artifacts (`prompts/PROMPT-<integer>.md` body + `prompt-runs/PROMPT-<integer>.yaml` sidecar; allocated by `tools/manual-story-studio/src/write/prompts.ts`; per-manual-story append-only; gaps from hard-delete preserved). Format follows the FOUNDATIONS-002 unpadded natural-integer convention.
```

### 2. Update introductory paragraph attribution

In the `### Manual-story-scoped` section's introductory paragraph (around line 48), update the spec-attribution clause from `(per SPEC-100 / SPEC-101)` to `(per SPEC-100 / SPEC-101 / SPEC-102 / SPEC-103)` so the section's lineage matches the classes it now enumerates.

## Files to Touch

- `docs/ID-ALLOCATION.md` (modify)

## Out of Scope

- Any code changes (this is a docs-only ticket — the allocators themselves land in tickets 003 and were already landed by SPEC-102 respectively)
- Other ID-class registry surfaces elsewhere in `docs/` (no other docs file enumerates manual-story IDs)
- Allocator implementation details beyond what the registry needs to cite (covered by ticket 003 for SEG-N; SPEC-102 already shipped PROMPT-N)

## Acceptance Criteria

### Tests That Must Pass

1. `grep -nE 'SEG-<integer>|PROMPT-<integer>' docs/ID-ALLOCATION.md` — both new class identifiers appear in the file
2. `grep -nE 'segment-id-allocator.ts|write/prompts.ts' docs/ID-ALLOCATION.md` — both allocator paths cited in their respective entries
3. `grep -n 'SPEC-102 / SPEC-103' docs/ID-ALLOCATION.md` — introductory paragraph's attribution clause updated to include both new specs

### Invariants

1. `docs/ID-ALLOCATION.md` canonical per-class registry includes every active ID class allocated in the pipeline; new allocator additions must be reflected here (Rule 6 audit-trail at the pipeline-documentation level).
2. The `### Manual-story-scoped` section's entries enumerate exactly the per-manual-story classes (18 mclass + SEG + PROMPT = 20 after this ticket); the section does not bleed into world-scoped or story-bundle-scoped classes.

## Test Plan

### New/Modified Tests

1. None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.

### Commands

1. `grep -nE 'SEG-<integer>|PROMPT-<integer>' docs/ID-ALLOCATION.md` — confirm both new entries present
2. `grep -nE 'segment-id-allocator|write/prompts' docs/ID-ALLOCATION.md` — confirm allocator paths cited
3. Grep-based verification is the correct narrow boundary for a docs-only ticket; no `npm test` invocation is meaningful since no code changes.
