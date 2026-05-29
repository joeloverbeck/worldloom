# SPEC94SCNPUBSTA-005: Doc reconciliation + world-index/world-mcp fixture hygiene

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `docs/FOUNDATIONS.md`, `docs/MACHINE-FACING-LAYER.md`, `docs/prose-renderer-contract/README.md` (docs), and non-breaking `status: planned` line removal in three `tools/world-index` / `tools/world-mcp` test fixtures. No production code in either tool package reads `SCN.status`.
**Deps**: SPEC94SCNPUBSTA-001

## Problem

Descriptive references to `SCN` as a "membership/status" surface survive in `docs/FOUNDATIONS.md` (L618) and possibly in `docs/MACHINE-FACING-LAYER.md` / `docs/prose-renderer-contract/README.md`. Separately, `tools/world-index` and `tools/world-mcp` carry SCN YAML test fixtures with a now-removed `status: planned` line. Neither tool package schema-validates `SCN` (both parse/retrieve only), so the fixtures do not break — but they become stale contract examples and should be cleaned for hygiene. This ticket reconciles the descriptive docs and drops the stale fixture lines.

## Assumption Reassessment (2026-05-29)

1. `docs/FOUNDATIONS.md` L618 describes `SCN` as "a derived, non-authoritative **membership/status** record". `tools/world-index/tests/parse/atomic-story-edge-parity.test.ts:L110`, `tools/world-mcp/tests/tools/list-records.test.ts:L344`, `tools/world-mcp/tests/server/dispatch.test.ts:L370` embed `status: planned` in SCN YAML fixtures. The §6 sweep showed `docs/MACHINE-FACING-LAYER.md` and `docs/prose-renderer-contract/README.md` match only on out-of-scope `entity status`/`physical status` tokens — likely no `SCN.status` reference to edit (verify, no-op expected). Verified by grep this session.
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

## What to Change

### 1. `docs/FOUNDATIONS.md` (L618)

- "`SCN` is a derived, non-authoritative **membership/status** record" → "…non-authoritative **membership** record" (publication state is derived at read time, not stored). Keep the rest of the scene-render-layer paragraph intact.

### 2. `docs/MACHINE-FACING-LAYER.md` + `docs/prose-renderer-contract/README.md` (verify-no-op)

- Confirm neither contains an `SCN.status` / stored-publication-status reference (expected: only out-of-scope `entity status` tokens). Edit only if a real reference is found; otherwise no change.

### 3. world-index/world-mcp SCN fixture hygiene (non-breaking)

- Drop the `status: planned` line from the SCN YAML fixtures at `tools/world-index/tests/parse/atomic-story-edge-parity.test.ts` (L110), `tools/world-mcp/tests/tools/list-records.test.ts` (L344), `tools/world-mcp/tests/server/dispatch.test.ts` (L370). Adjust any assertion that read the field back (if present) so the fixtures match the post-change contract.

## Files to Touch

- `docs/FOUNDATIONS.md` (modify)
- `docs/MACHINE-FACING-LAYER.md` (modify — verify-no-op)
- `docs/prose-renderer-contract/README.md` (modify — verify-no-op)
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
