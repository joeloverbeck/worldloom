# PEENH-014: audit patch-engine BARE_STORY_BUNDLE_ID_PATTERN — STPLAN/STEMO (and BEL/STSTAT) absent from the bare→scoped existing-record fallback

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes (conditional on findings) — `tools/patch-engine/src/ops/shared.ts` and `tools/patch-engine/tests/ops/create-story-record.test.ts`.
**Deps**: None.

## Problem

`BARE_STORY_BUNDLE_ID_PATTERN` in `tools/patch-engine/src/ops/shared.ts:264` enumerates `PG|SE|SF|OBL|CNSQ|THR|SREL|STINT|SLT|STLOC|STOBJ|BR|CHC|STENT|DA|CLK|STSEC|STQ` — it **omits STPLAN/STEMO** (SPEC-47) **and** BEL/STSTAT. It gates the second branch of `findExistingRecordRow`: the function first attempts an exact `node_id` match, and only if that misses does it fall back to a `story_slug`-scoped `LIKE` lookup, which is skipped for any id not matching the pattern. So for a bare (un-scoped) `STPLAN-<n>` / `STEMO-<n>` / `BEL-<n>` / `STSTAT-<n>` id, the scoped fallback never runs and `findExistingRecordRow` returns `undefined`.

By contrast, `tools/patch-engine/src/commit/temp-file.ts:163` already enumerates the full story-bundle class set including STPLAN/STEMO/BEL/STSTAT, so the two patterns disagree. This needs a focused trace before any change: determine whether existing-record resolution (supersession baseline / collision detection) for these classes is ever invoked with a *bare* id. Because BEL/STSTAT are heavily superseded classes that work in practice, the likely conclusion is that callers pass scoped ids (so the exact-match path handles it and the fallback is never load-bearing) — in which case the fix is to align the pattern for consistency and add a regression test, not to repair a live break. But the omission is unverified and the BEL/STSTAT absence makes it not a clean "SPEC-47 forgot" pattern, so it warrants explicit confirmation rather than a blind widen.

## Assumption Reassessment (2026-05-20)

1. Confirmed at HEAD: `findExistingRecordRow` (`ops/shared.ts:267`) is called at `ops/shared.ts:217`; its exact-`node_id` query runs first, and `BARE_STORY_BUNDLE_ID_PATTERN` (line 264) only gates the scoped `LIKE` fallback (line 286). `temp-file.ts:163` carries the full class set incl STPLAN/STEMO/BEL/STSTAT. **Change attribution (no-silent-retcons):** if the trace shows the fallback is reachable with a bare id for these classes, existing behavior — bare-id existing-record lookups for STPLAN/STEMO/BEL/STSTAT return `undefined`; new behavior — the pattern is widened (to match `temp-file.ts:163`) so bare→scoped resolution succeeds. If the trace shows callers always pass scoped ids, no behavior changes and the ticket closes by aligning the pattern for consistency plus recording the trace.
2. No user-facing or contract doc governs this internal helper; no doc edit is expected.
3. Shared boundary under audit: the patch-engine's existing-record id resolution (`ops/shared.ts` `BARE_STORY_BUNDLE_ID_PATTERN`) versus the canonical story-bundle class set already enumerated in `commit/temp-file.ts:163`. The two should agree; this ticket reconciles them or documents why the narrower set is intentional.
4. This touches a patch-engine canon-write path (`tools/patch-engine/src/ops/shared.ts`). The change is read-only id-recognition widening — it does not alter write ordering, approval-token discipline, or the Mystery Reserve firewall, and it cannot cause a write that the engine would otherwise reject (it only affects whether an *existing* record is found before a supersession/collision decision). Confirm in review that no supersession or collision check is weakened.

## Architecture Check

1. If a fix is warranted, align `BARE_STORY_BUNDLE_ID_PATTERN` to the full story-bundle class set already present at `commit/temp-file.ts:163` (single source of truth), rather than adding STPLAN/STEMO alone — this also closes the latent BEL/STSTAT omission in one move. Cleaner than maintaining two divergent class enumerations in the same package.
2. No backwards-compatibility shims: the pattern is widened in place, or left unchanged with the trace documented if the fallback is proven unreachable for these classes.

## Verification Layers

1. Fallback reachability for STPLAN/STEMO/BEL/STSTAT → codebase trace of `findExistingRecordRow` callers (`ops/shared.ts:217`): determine whether any supersession/collision path passes a bare id for these classes.
2. If reachable → unit test (`tools/patch-engine/tests/ops/create-story-record.test.ts`): a supersession of an existing scoped STPLAN/STEMO record by bare id resolves the existing row.
3. If not reachable → record the trace in the ticket close-out and assert the alignment (pattern == `temp-file.ts:163` set) via a focused equality test or source comment, so the two patterns can't silently re-diverge.

## What to Change

1. Trace `findExistingRecordRow` callers and the id forms they pass for STPLAN/STEMO/BEL/STSTAT supersession and collision checks.
2. `tools/patch-engine/src/ops/shared.ts` — if the fallback is reachable for these classes, widen `BARE_STORY_BUNDLE_ID_PATTERN` to the full story-bundle set already used at `commit/temp-file.ts:163`.
3. Add the regression test (or alignment assertion) per the Verification Layers outcome.

## Files to Touch

- `tools/patch-engine/src/ops/shared.ts` (modify — conditional on trace)
- `tools/patch-engine/tests/ops/create-story-record.test.ts` (modify)

## Out of Scope

- Any change to `temp-file.ts:163` (already correct; it is the reference set).
- Supersession op semantics, approval-token discipline, or write ordering.

## Acceptance Criteria

- **Tests that must pass**: either a new bare-id existing-record-resolution test for STPLAN/STEMO passes (fix path), or a documented trace plus a pattern-alignment assertion lands (verified-benign path); the existing `tools/patch-engine` suite stays green.
- **Invariants**: no supersession or collision-detection behavior is weakened; `BARE_STORY_BUNDLE_ID_PATTERN` and `commit/temp-file.ts:163` enumerate a consistent class set (or the divergence is documented as intentional).

## Test Plan

- **New/modified tests**: per outcome, add a bare-id STPLAN/STEMO existing-record-resolution case or a pattern-alignment assertion in `tools/patch-engine/tests/ops/create-story-record.test.ts`.
- **Commands**:
  - `cd tools/patch-engine && npm test`
  - Targeted: `cd tools/patch-engine && npm run build && node --test dist/tests/ops/create-story-record.test.js`
