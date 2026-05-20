# SPEC51CHCSLTSEL-007: truth get_record invalid-id diagnostic for STPLAN/STEMO

**Status**: PENDING
**Priority**: LOW
**Effort**: Small
**Engine Changes**: Yes — behavior-neutral diagnostic string update in `tools/world-mcp/src/tools/get-record.ts`, with focused proof that the invalid-id help text matches the live story-bundle id classes.
**Deps**: `archive/tickets/SPEC51CHCSLTSEL-006-machine-facing-doc-stplan-stemo-retrieval-parity.md`

## Problem

`archive/tickets/SPEC51CHCSLTSEL-006-machine-facing-doc-stplan-stemo-retrieval-parity.md` truthed the repo-level and package-level machine-facing prose for STPLAN/STEMO retrieval. Post-ticket review found one adjacent public diagnostic still stale: `tools/world-mcp/src/tools/get-record.ts` `validateRecordId()` accepts story-bundle ids via `isStoryBundleRecordId(recordId)`, but its `invalid_input.details.expected` example list still omits `STPLAN` and `STEMO`.

That makes the error guidance weaker than the live `get_record` contract even though the handler already supports those ids.

## Assumption Reassessment (2026-05-20)

1. Live code check: `tools/world-mcp/src/tools/get-record.ts` `validateRecordId()` delegates story-bundle id acceptance to `isStoryBundleRecordId(recordId)`, so the diagnostic string is only help text and not an allowlist.
2. Live code check: `tools/world-mcp/src/tools/_shared.ts` includes `STPLAN` and `STEMO` in the story-bundle id-class vocabulary used by `isStoryBundleRecordId`.
3. Shared boundary under audit: `get_record` operator-facing diagnostics should describe the same bundle-scoped id classes advertised by `docs/MACHINE-FACING-LAYER.md`, `tools/world-mcp/README.md`, and `tools/world-mcp/src/server.ts` after ticket 006.
4. FOUNDATIONS principle motivating this ticket: §Tooling Recommendation / Index + Targeted Retrieval. Error recovery text should route operators to lawful targeted retrieval rather than presenting a stale id-class list.
5. Adjacent contradiction classification: separate docs/diagnostic drift exposed during post-ticket review, not unfinished ticket-006 work. Ticket 006 owned docs and capability-description prose; this ticket owns the remaining handler diagnostic string and any focused diagnostic proof.

## Architecture Check

1. Updating the diagnostic string keeps the public error contract aligned with the live id parser without changing dispatch, retrieval, schema, or validator behavior.
2. No backwards-compatibility aliasing/shims introduced; this is a diagnostic correction only.

## Verification Layers

1. `validateRecordId()` invalid-id diagnostic names `STPLAN` and `STEMO` in the story-bundle id example list -> grep/manual review against `tools/world-mcp/src/tools/get-record.ts`.
2. The diagnostic stays behavior-neutral -> `npm run build` from `tools/world-mcp`.
3. Built artifact freshness for deployed local CLI/server code -> grep/manual review against `tools/world-mcp/dist/src/tools/get-record.js` after build.

## What to Change

### 1. Update invalid-id diagnostic

Patch `tools/world-mcp/src/tools/get-record.ts` so the `validateRecordId()` `details.expected` story-bundle id list includes `STPLAN` and `STEMO` alongside the other currently supported story-bundle id classes.

## Files to Touch

- `tools/world-mcp/src/tools/get-record.ts` (modify)

## Out of Scope

- Any change to `get_record` id parsing, retrieval behavior, story-bundle class support, schemas, validators, docs, or tests beyond a focused diagnostic proof if needed.
- Reopening ticket 006; it remains complete and archived.

## Acceptance Criteria

### Tests That Must Pass

1. Grep/manual-review proof that `tools/world-mcp/src/tools/get-record.ts` `details.expected` includes `STPLAN` and `STEMO`.
2. From `tools/world-mcp`: `npm run build`.
3. Grep/manual-review proof that `tools/world-mcp/dist/src/tools/get-record.js` contains the refreshed diagnostic string after build.
4. `git diff --check -- tools/world-mcp/src/tools/get-record.ts tickets/SPEC51CHCSLTSEL-007-get-record-invalid-id-diagnostic-parity.md`

### Invariants

1. `get_record` id parsing behavior remains unchanged.
2. The invalid-id diagnostic matches the live story-bundle id-class examples now advertised by the machine-facing docs and capability descriptions.

## Test Plan

### New/Modified Tests

1. `None — diagnostic-string ticket; verification is command-based and existing parser behavior is intentionally unchanged.`

### Commands

1. `rg -n "STPLAN|STEMO" tools/world-mcp/src/tools/get-record.ts`
2. From `tools/world-mcp`: `npm run build`
3. `rg -n "STPLAN|STEMO" tools/world-mcp/dist/src/tools/get-record.js`
4. `git diff --check -- tools/world-mcp/src/tools/get-record.ts tickets/SPEC51CHCSLTSEL-007-get-record-invalid-id-diagnostic-parity.md`
