# IDXSYNC-001: Stale-index auto-recovery gives up after `sync`; escalate to a full `build` before failing

**Status**: DONE (implemented 2026-05-30; freshness guard now escalates stale → sync → build → surface. Underlying sync-convergence gap tracked in IDXSYNC-002.)
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — `tools/world-mcp/src/context-packet/freshness-guard.ts` plus tests; docs (`.claude/skills/branching-story-turn-cycle/references/pre-flight-and-prerequisites.md`, `docs/MACHINE-FACING-LAYER.md`)
**Deps**: None

## Problem

When an MCP retrieval call (`get_record` / `get_records` / context-packet) hits a `stale_index` error, `withIndexFreshnessGuard` automatically runs `world-index sync` once and retries. If the retry is still stale, it returns the error annotated `recovery_attempted: sync`, `recovery_outcome: still_stale` and stops — it never escalates to a full `world-index build`, even though the sibling `index_version_mismatch` branch in the same function already uses `build`.

Empirically, incremental `sync` does not reconcile certain story-bundle record drifts. During the PG-6 turn-cycle on `red-bunny`, the very first `get_records` pre-flight call failed with `stale_index` on the SLB-3 storylets (`SLT-20`..`SLT-25`); the auto-`sync` returned `still_stale`; and only a manual `node tools/world-index/dist/src/cli.js build erotica-world` reconciled the index (verify clean afterward). The auto-recovery therefore left the operator stuck at a dead end with no in-band remedy, despite a known-good remedy (`build`) being one step away. This matches a previously-recorded pattern where incremental sync skips/under-reconciles story-bundle records (see the project memory on the STCHAR index sync gap).

The fix is to make the stale-index recovery escalate: after one `sync` that leaves the index stale, run a full `build` (exactly as the version-mismatch path does) and retry once more before surfacing the error.

## Assumption Reassessment (2026-05-30)

1. `tools/world-mcp/src/context-packet/freshness-guard.ts` `withIndexFreshnessGuard` (lines 98-182): the `index_version_mismatch` branch runs `runBuild` (line 127); the `stale_index` branch runs `runSync` (line 163) and, if `attemptedSync` is already true, returns `withRecoveryDetails(staleError, "sync", "still_stale")` (lines 151-152) with no build escalation. Confirmed by reading the source.
2. The guard already accepts injectable `buildWorldIndex` / `syncWorldIndex` (options at lines 102-103), so a build-escalation path is testable with mocks without spawning real CLIs. Confirmed.
3. Observed runtime evidence: a real `get_records` call returned `code: stale_index`, `details.recovery_attempted: sync`, `details.recovery_outcome: still_stale`, `drifted_files: [SLT-20..SLT-25]`; a manual full `build` fixed it and `world-index verify erotica-world` then exited 0. Confirmed during this session.
4. Shared boundary under audit: the MCP retrieval freshness contract (`withIndexFreshnessGuard`) that every story-bundle retrieval depends on at turn-cycle pre-flight. This change strengthens recovery; it does not alter what `stale_index` means or how drift is detected (`tools/world-mcp/src/db/open.ts` `detectStaleIndex`).
5. FOUNDATIONS principle: §Tooling Recommendation — the indexed retrieval surface must be the reliable primary path for story-state retrieval. An auto-recovery that gives up when a known remedy exists undermines that reliability. The change adds no canon-write capability and touches no HARD-GATE or Mystery Reserve surface (read-path recovery only).
6. Adjacent contradiction classification: WHY incremental `sync` fails to reconcile story-bundle storylet drift is a separate, deeper defect in the `world-index sync` reconciliation path; investigating/fixing that is **future cleanup that must become its own ticket**. This ticket's scope is the recovery-escalation in the freshness guard plus operator docs — the safe, minimal fix that mirrors the existing `build`-based version-mismatch recovery.

## Architecture Check

1. Escalating `stale → sync → (still stale) → build` is cleaner and more robust than the current `stale → sync → give up`: it reuses the exact recovery (`build`) that the version-mismatch path already trusts, and it matches the documented manual remedy. The loop already has the structure (attempt flags + retry); this adds one escalation rung with a bounded number of attempts (one sync, then one build, then surface).
2. No backwards-compatibility aliasing/shims: the success path and the final give-up surface are unchanged in shape; only an additional bounded build attempt is inserted before giving up.

## Verification Layers

1. Invariant: stale index that `sync` cannot fix triggers a single `build` and one more retry -> validator/unit test injecting a `syncWorldIndex` mock that leaves the result stale and a `buildWorldIndex` mock that clears it; assert the handler succeeds and the audit records the build.
2. Invariant: stale index that `build` also cannot fix surfaces an error annotated `recovery_attempted` with a build-escalation outcome (e.g. `still_stale_after_build`) -> unit test with both mocks leaving the result stale.
3. Invariant: the version-mismatch recovery path is unchanged -> existing freshness-guard tests for `index_version_mismatch` remain green.
4. Invariant: a non-stale, non-mismatch result returns unchanged with no recovery audit -> existing happy-path test remains green.

## What to Change

### 1. `freshness-guard.ts` — escalate stale-index recovery to `build`

In the `stale_index` branch, after a `sync` attempt that leaves the result stale, attempt a full `build` (reuse `runBuild`) once and retry the handler, before returning a final annotated error. Track attempts so the loop terminates (one sync, then one build, then surface). Use a distinct `recovery_outcome` for the post-build failure (e.g. `still_stale_after_build`) so the surfaced error tells the operator both remedies were exhausted. Preserve the `missing_world_slug` and CLI-exit-code failure branches.

### 2. Docs — record the remedy

- `references/pre-flight-and-prerequisites.md`: in the stale-index/persisted-recovery guidance, note that if a retrieval returns `stale_index` with `recovery_outcome: still_stale`, run a full `world-index build <slug>` (incremental `sync` can under-reconcile story-bundle records); after this ticket lands the guard does this automatically.
- `docs/MACHINE-FACING-LAYER.md` troubleshooting matrix: add a `stale_index` + `still_stale` row pointing at full `build` as the escalation, and note the auto-escalation behavior.

## Files to Touch

- `tools/world-mcp/src/context-packet/freshness-guard.ts` (modify)
- `tools/world-mcp/test/context-packet/freshness-guard.test.ts` (modify/add — confirm exact path during implementation)
- `.claude/skills/branching-story-turn-cycle/references/pre-flight-and-prerequisites.md` (modify)
- `docs/MACHINE-FACING-LAYER.md` (modify)

## Out of Scope

- Fixing the underlying `world-index sync` reconciliation gap that makes story-bundle storylet drift survive an incremental sync (separate follow-up ticket).
- Changing `detectStaleIndex` drift detection in `tools/world-mcp/src/db/open.ts`.

## Acceptance Criteria

### Tests That Must Pass

1. Unit test: sync leaves index stale, build clears it -> handler succeeds, audit shows a build occurred.
2. Unit test: both sync and build leave index stale -> error surfaced with a build-escalation `recovery_outcome` (e.g. `still_stale_after_build`), loop terminates (no infinite retry).
3. Regression: `index_version_mismatch` and happy-path freshness-guard tests remain green.
4. `npm --prefix tools/world-mcp test` is green.

### Invariants

1. Stale-index recovery never surfaces `still_stale` without having attempted a full `build`.
2. The recovery loop is bounded (at most one sync + one build per call) and cannot spin.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/test/context-packet/freshness-guard.test.ts` — add the sync-then-build escalation cases using injected `buildWorldIndex` / `syncWorldIndex` mocks; assert build is attempted and the loop terminates. (Verify exact test path at implementation time.)

### Commands

1. `npm --prefix tools/world-mcp test -- freshness-guard`
2. `npm --prefix tools/world-mcp test` (full package suite)
3. End-to-end smoke (manual): re-induce storylet drift, call `get_records`, confirm the call now self-heals via build instead of returning `still_stale`.
