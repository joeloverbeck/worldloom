# SPEC94SCNPUBSTA-005: Doc reconciliation + world-index/world-mcp fixture hygiene

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `docs/FOUNDATIONS.md`, `docs/MACHINE-FACING-LAYER.md`, `docs/prose-renderer-contract/README.md` (docs), and non-breaking `status: planned` line removal in three `tools/world-index` / `tools/world-mcp` test fixtures. No production code in either tool package reads `SCN.status`.
**Deps**: archive/tickets/SPEC94SCNPUBSTA-001.md

## Problem

At intake, descriptive references to `SCN` as a "membership/status" surface survived in `docs/FOUNDATIONS.md` (L618), and `docs/MACHINE-FACING-LAYER.md` / `docs/prose-renderer-contract/README.md` needed a no-op check for the same stale surface. Separately, `tools/world-index` and `tools/world-mcp` carried SCN YAML test fixtures with a now-removed `status: planned` line. Neither tool package schema-validates `SCN` (both parse/retrieve only), so the fixtures did not break — but they were stale contract examples. This ticket reconciled the descriptive docs and dropped the stale fixture lines.

## Assumption Reassessment (2026-05-29)

1. At intake, `docs/FOUNDATIONS.md` L618 described `SCN` as "a derived, non-authoritative **membership/status** record". `tools/world-index/tests/parse/atomic-story-edge-parity.test.ts:L110`, `tools/world-mcp/tests/tools/list-records.test.ts:L344`, `tools/world-mcp/tests/server/dispatch.test.ts:L370` embedded `status: planned` in SCN YAML fixtures. The §6 sweep showed `docs/MACHINE-FACING-LAYER.md` and `docs/prose-renderer-contract/README.md` matched only on out-of-scope `entity status`/`physical status` tokens, so no `SCN.status` reference needed editing. Verified by grep this session.
2. SPEC-94 §2 item 6 + §6 list these surfaces for reconciliation; the reassessed §6 added the world-index/world-mcp fixture sites and noted the §6 sweep is `src`-scoped (excludes `tests/`), so the fixture cleanup is handled here, not by the sweep.
3. Cross-artifact boundary under audit: these are descriptive consumers of the SCN contract defined in 001; none is a producer. The fixtures are non-authoritative test inputs that neither package validates against `story-scene.schema.json`.
4. FOUNDATIONS principle motivated: the FOUNDATIONS.md edit reconciles its own §Story Bundles scene-layer prose to the derive-don't-store contract (no stored publication status). The edit is descriptive-only; it changes no FOUNDATIONS rule or validator threshold.
5. (was template item 7 — field-removal blast radius) The `SCN.status` removal's reach into `tools/world-index` + `tools/world-mcp`: grep-confirmed the only occurrences are the three test fixtures named above; no `src/` consumer reads the field (world-index parses scenes by `^SCN-[0-9]+$` + edges; world-mcp retrieves records without schema-validating them). Removing the fixture lines is therefore non-breaking; both packages' suites must still pass.

## Architecture Check

1. Reconciling the docs at the contract-language level (membership, not "membership/status") keeps the design docs truthful without introducing any code dependency; dropping the stale fixture lines keeps test inputs consistent with the post-change contract.
2. No backwards-compatibility shim: stale `status` lines are removed, not retained as tolerated legacy.

## Verification Layers

1. FOUNDATIONS.md no longer describes `SCN` as a stored-status record → codebase grep-proof (`grep -n "membership/status record" docs/FOUNDATIONS.md` returns zero).
2. `MACHINE-FACING-LAYER.md` / `prose-renderer-contract/README.md` carry no `SCN.status` reference → grep-proof verify-no-op (edit only if a real reference is found).
3. world-index/world-mcp fixtures carry no `status:` line on SCN records → codebase grep-proof.
4. Both tool suites still pass after fixture edits → test-suite run (`npm test` per package).

## Landed Changes

### 1. `docs/FOUNDATIONS.md` (L618)

- Reconciled "`SCN` is a derived, non-authoritative **membership/status** record" to "non-authoritative **membership** record".
- Added the current publication-state contract: publication state is derived at read time from scene artifact presence plus the scene-prose receipt verdict, never stored on append-only `SCN`.

### 2. `docs/MACHINE-FACING-LAYER.md` + `docs/prose-renderer-contract/README.md` (verify-no-op)

- Confirmed neither contains an `SCN.status` / stored-publication-status reference. The only hits were out-of-scope `entity status`, `physical status`, and story/task status prose, so no edits were made.

### 3. world-index/world-mcp SCN fixture hygiene (non-breaking)

- Dropped the `status: planned` line from the SCN YAML fixtures at `tools/world-index/tests/parse/atomic-story-edge-parity.test.ts`, `tools/world-mcp/tests/tools/list-records.test.ts`, and `tools/world-mcp/tests/server/dispatch.test.ts`.
- No assertions read the removed field back; no production code changes were needed.

## Files to Touch

- `docs/FOUNDATIONS.md` (modify)
- `docs/MACHINE-FACING-LAYER.md` (verified no-op; no edit)
- `docs/prose-renderer-contract/README.md` (verified no-op; no edit)
- `tools/world-index/tests/parse/atomic-story-edge-parity.test.ts` (modify)
- `tools/world-mcp/tests/tools/list-records.test.ts` (modify)
- `tools/world-mcp/tests/server/dispatch.test.ts` (modify)

## Out of Scope

- The contract markdown (001), JSON schema + validator tests (002), the two scene skills (003/004).
- Any production-code change in `tools/world-index/src` or `tools/world-mcp/src` (neither reads `SCN.status`).
- Any change to the `state_hash` chain, scene-coverage logic (SPEC-95), or any hash/freshness field.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -n "membership/status record" docs/FOUNDATIONS.md` returns zero.
2. `cd tools/world-index && npm test` and `cd tools/world-mcp && npm test` both pass after the fixture edits.
3. `grep -rn "status: planned" tools/world-index/tests tools/world-mcp/tests` shows no SCN-fixture status lines remaining.

### Invariants

1. No production code in either tool package depends on `SCN.status` (the change is fixture/docs-only and non-breaking).
2. The reconciled docs describe publication state as derived, never stored.

## Test Plan

### New/Modified Tests

1. `tools/world-index/tests/parse/atomic-story-edge-parity.test.ts` — drop the SCN fixture `status: planned` line; suite remains green.
2. `tools/world-mcp/tests/tools/list-records.test.ts`, `tools/world-mcp/tests/server/dispatch.test.ts` — same fixture-line removal; suites remain green.

### Commands

1. `cd tools/world-index && npm test`
2. `cd tools/world-mcp && npm test`
3. `grep -rn "membership/status" docs/ ; grep -rn "status: planned" tools/world-index/tests tools/world-mcp/tests` (expect zero in-scope hits)

## Outcome

Completed: 2026-05-29

`docs/FOUNDATIONS.md` now describes `SCN` as a non-authoritative membership record and states that publication state is derived at read time from scene artifact presence plus receipt verdict, not stored on append-only `SCN`. The three non-authoritative SCN package fixtures no longer include `status: planned`. `docs/MACHINE-FACING-LAYER.md` and `docs/prose-renderer-contract/README.md` were verified as no-op surfaces for this ticket.

## Verification Result

1. `if grep -rn "membership/status" docs/; then exit 1; fi` passed with zero matches.
2. `if grep -rn "status: planned" tools/world-index/tests tools/world-mcp/tests; then exit 1; fi` passed with zero matches.
3. `rg -n 'SCN\.status|SCN status' docs/MACHINE-FACING-LAYER.md docs/prose-renderer-contract/README.md docs/FOUNDATIONS.md tools/world-index/tests tools/world-mcp/tests` returned zero matches.
4. `cd tools/world-index && npm test` passed: 127 compiled tests plus serialized CLI tests passed.
5. `cd tools/world-mcp && npm test` passed: build succeeded and 506 compiled tests passed.

## Deviations

None. The package ignored artifacts under `tools/world-index/` and `tools/world-mcp/` were pre-existing or refreshed expected verification artifacts; they remain untracked/ignored.
