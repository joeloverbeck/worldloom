# VALENH-040: Add validator-side prose receipt `prose_hash` recompute integrity

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — `tools/validators` structural validator, registry/tests, README inventory, and `tools/world-mcp` capability-parity fixture.
**Deps**: `archive/tickets/HOOK-003.md` (at-write Hook 7 coverage), `archive/tickets/VALENH-023.md` (prose receipt schema compliance), `archive/tickets/VALENH-029.md` (author-time hash recompute precedent)

## Problem

At intake, `archive/tickets/HOOK-003.md` had closed the write-time fabrication path for `pages-prose-receipts/PG-*.yaml` by adding Hook 7, but validator-side receipt checks still only proved receipt shape and STCHAR consistency. A receipt whose `prose_hash` matched the prose file at write time could become stale later if `pages-prose/PG-*.md` was edited, copied, restored from backup, or otherwise drifted outside the hook path. `prose_receipt_schema_compliance` checked only that `prose_hash` was 64 lowercase hex; no validator recomputed the prose-file bytes during `world-validate`.

This ticket added an on-demand structural validator so full-world and receipt-file incremental validation catch post-write drift on prose receipt audit trails.

## Assumption Reassessment (2026-05-23)

1. `tools/validators/src/structural/prose-receipt-schema-compliance.ts` discovers `stories/<story>/pages-prose-receipts/PG-*.yaml`, parses YAML with `js-yaml`, and validates against `tools/validators/src/schemas/prose-receipt.schema.json`; it does not read `prose_path` or recompute file bytes.
2. `tools/validators/src/structural/prose-receipt-stchar-integrity.ts` reads page plans and receipts to validate `stchar_authority[]` / `profile_fidelity[]`; it does not compare receipt `prose_hash` to the rendered prose file.
3. Shared boundary: `branching-story-prose-attach` emits `pages-prose-receipts/PG-*.yaml`, Hook 7 blocks mismatches at direct write time, and `tools/validators` owns later full-world/incremental validation. The missing surface is validator-side drift detection after the receipt has already landed.
4. FOUNDATIONS principle: the receipt is not world canon, but it is an audit-trail artifact for a story-bundle deliverable. Preserving Rule 6-style auditability means a receipt must not continue asserting that it validated bytes that no longer match the file it names.
5. Canon Safety surface: this is additive fail-closed structural validation over direct-write story-bundle artifacts. It must not change HARD-GATE approval ordering, patch-engine semantics, Hook 7 behavior, or the receipt schema shape.
6. At intake, no other active ticket owned validator-side prose receipt hash recompute parity. `archive/tickets/HOOK-003.md` explicitly excluded it as follow-up work.
7. Package reassessment: pre-edit `cd tools/validators && npm test` passed with 911 tests. `tools/validators/README.md` already had a stale structural-validator count (`88` while the live registry had 92), so the README inventory/count update is same-seam package fallout for the new validator registration rather than an unrelated docs cleanup.
8. Consumer reassessment: adding a registered validator also affects `tools/world-mcp/tests/server/capability-parity.test.ts`, whose expected structural-validator list mirrors the validators package registry. That downstream parity fixture is same-seam proof fallout; the `tools/world-mcp` focused build/capability-parity proof is required after the validators package proof.

## Architecture Check

1. A dedicated structural validator such as `prose_receipt_hash_integrity` is cleaner than overloading `prose_receipt_schema_compliance`, which is schema-shape-only. It also keeps Hook 7 as the at-write guard and gives `world-validate` a matching later-drift check.
2. No backwards-compatibility shim is needed. A receipt whose stamped `prose_hash` differs from the sha256 of the file at `prose_path` should fail validation.

## Verification Layers

1. Receipt `prose_hash` equals sha256 of `prose_path` bytes -> validator PASS -> focused structural test with temp story bundle fixture.
2. Receipt `prose_hash` differs from sha256 of `prose_path` bytes -> validator FAIL -> focused structural test with diagnostic naming stamped and computed hashes.
3. Missing/unreadable `prose_path` and unparseable receipt YAML fail closed -> focused structural tests.
4. Validator is registered and documented -> registry test / README inventory update and grep proof.
5. Full validators package remains green -> `cd tools/validators && npm test`.
6. Downstream validator-name parity remains green -> `cd tools/world-mcp && npm run build && node --test dist/tests/server/capability-parity.test.js`.

## Landed Changes

### 1. Added `prose_receipt_hash_integrity`

Created `tools/validators/src/structural/prose-receipt-hash-integrity.ts`.

- Discovers the same `stories/<story-slug>/pages-prose-receipts/PG-*.yaml` surface as `prose_receipt_schema_compliance`.
- Runs in full-world mode and receipt-file incremental mode; skips pre-apply because receipts are direct-write artifacts, not patch-plan `_source` records.
- Parses the receipt, extracts `prose_path` and `prose_hash`, resolves `prose_path` relative to the story bundle root, reads the prose bytes, computes sha256, and compares.
- Emits fail verdicts for YAML parse errors, missing `prose_path`, missing `prose_hash`, missing/unreadable prose file, path escape, and hash mismatch.

### 2. Registered and tested the validator

Updated `tools/validators/src/public/registry.ts`, registry/count tests, focused structural tests, package README inventory, and `tools/world-mcp` capability-parity coverage.

## Files to Touch

- `tools/validators/src/structural/prose-receipt-hash-integrity.ts` (new)
- `tools/validators/src/public/registry.ts` (modify)
- `tools/validators/tests/structural/prose-receipt-hash-integrity.test.ts` (new)
- `tools/validators/tests/structural/registry.test.ts` (modify)
- `tools/validators/tests/integration/spec04-verification.test.ts` (modify)
- `tools/validators/tests/integration/validate-patch-plan.test.ts` (modify)
- `tools/validators/README.md` (modify)
- `tools/world-mcp/tests/server/capability-parity.test.ts` (modify)

## Out of Scope

- Hook 7 behavior or configuration.
- Changing `tools/validators/src/schemas/prose-receipt.schema.json`; this ticket checks value integrity, not schema shape.
- Repairing any live `worlds/<slug>/stories/<story>/pages-prose-receipts/*.yaml` content whose `prose_hash` is already stale.
- Changing `branching-story-prose-attach` authoring prose.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/validators && npm run build && node --test dist/tests/structural/prose-receipt-hash-integrity.test.js`
2. `cd tools/validators && npm test`
3. `cd tools/world-mcp && npm run build && node --test dist/tests/server/capability-parity.test.js`
4. `grep -nE 'proseReceiptHashIntegrity|prose_receipt_hash_integrity' tools/validators/src/public/registry.ts tools/validators/README.md tools/world-mcp/tests/server/capability-parity.test.ts`

### Invariants

1. Every in-scope prose receipt whose `prose_hash` differs from sha256 of the file at `prose_path` fails validator-side structural validation.
2. The validator skips pre-apply and does not change patch-engine or HARD-GATE semantics.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/prose-receipt-hash-integrity.test.ts` — positive match, mismatch, missing `prose_hash`, missing `prose_path`, missing prose file, unparseable YAML, path escape, and pre-apply skip.
2. Existing registry/count/pre-apply inventory tests updated for the new registered validator.
3. `tools/world-mcp/tests/server/capability-parity.test.ts` — update the validator-name parity fixture for the new registered structural validator.

### Commands

1. `cd tools/validators && npm run build && node --test dist/tests/structural/prose-receipt-hash-integrity.test.js`
2. `cd tools/validators && npm test`
3. `cd tools/world-mcp && npm run build && node --test dist/tests/server/capability-parity.test.js`
4. `grep -nE 'proseReceiptHashIntegrity|prose_receipt_hash_integrity' tools/validators/src/public/registry.ts tools/validators/README.md tools/world-mcp/tests/server/capability-parity.test.ts`

## Outcome

Completed on 2026-05-23.

Added `prose_receipt_hash_integrity` as a registered structural validator. It scans receipt files in full-world runs, runs on receipt-file incremental validation, and skips pre-apply because prose receipts are direct-write story-bundle artifacts rather than patch-plan `_source` records. For each receipt, it parses YAML, reads `prose_path` relative to the story bundle, computes sha256 over the prose file bytes, and fails closed on YAML parse errors, missing `prose_path`, missing `prose_hash`, missing/unreadable prose files, path escapes, and hash mismatches.

Updated validators registry tests, validator counts, pre-apply skip inventory, README inventory/count, and the downstream `tools/world-mcp` capability-parity validator list.

## Verification Result

Passed on 2026-05-23:

1. Baseline before edits: `cd tools/validators && npm test` passed, 911 tests.
2. `cd tools/validators && npm run build` passed.
3. `cd tools/validators && node --test dist/tests/structural/prose-receipt-hash-integrity.test.js` passed, 9 tests.
4. `cd tools/validators && npm run build && node --test dist/tests/structural/prose-receipt-hash-integrity.test.js dist/tests/structural/registry.test.js dist/tests/integration/validate-patch-plan.test.js dist/tests/integration/spec04-verification.test.js` passed, 4 compiled test files.
5. `cd tools/validators && npm test` passed, 920 tests.
6. `cd tools/world-mcp && npm run build` passed.
7. `cd tools/world-mcp && node --test dist/tests/server/capability-parity.test.js` passed, 5 tests.
8. `grep -nE 'proseReceiptHashIntegrity|prose_receipt_hash_integrity' tools/validators/src/public/registry.ts tools/validators/README.md tools/world-mcp/tests/server/capability-parity.test.ts` returned the registry import/entry, README row, and world-mcp parity fixture row.

## Deviations

- `tools/validators/README.md` already had a stale structural-validator count (`88` vs. live 92) before implementation. This ticket corrected it to 93 while adding the new validator row.
- `tools/world-mcp/tests/server/capability-parity.test.ts` was added to the touched set during reassessment because it mirrors the validators registry and must include every registered validator name.
