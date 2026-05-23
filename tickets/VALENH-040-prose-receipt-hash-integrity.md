# VALENH-040: Add validator-side prose receipt `prose_hash` recompute integrity

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — `tools/validators` structural validator, registry/tests, and README inventory.
**Deps**: `archive/tickets/HOOK-003.md` (at-write Hook 7 coverage), `archive/tickets/VALENH-023.md` (prose receipt schema compliance), `archive/tickets/VALENH-029.md` (author-time hash recompute precedent)

## Problem

`archive/tickets/HOOK-003.md` closed the write-time fabrication path for `pages-prose-receipts/PG-*.yaml` by adding Hook 7, but validator-side receipt checks still only prove receipt shape and STCHAR consistency. A receipt whose `prose_hash` matched the prose file at write time can become stale later if `pages-prose/PG-*.md` is edited, copied, restored from backup, or otherwise drifts outside the hook path. `prose_receipt_schema_compliance` currently checks only that `prose_hash` is 64 lowercase hex; no validator recomputes the prose-file bytes during `world-validate`.

This ticket adds an on-demand structural validator so full-world and receipt-file incremental validation catch post-write drift on prose receipt audit trails.

## Assumption Reassessment (2026-05-23)

1. `tools/validators/src/structural/prose-receipt-schema-compliance.ts` discovers `stories/<story>/pages-prose-receipts/PG-*.yaml`, parses YAML with `js-yaml`, and validates against `tools/validators/src/schemas/prose-receipt.schema.json`; it does not read `prose_path` or recompute file bytes.
2. `tools/validators/src/structural/prose-receipt-stchar-integrity.ts` reads page plans and receipts to validate `stchar_authority[]` / `profile_fidelity[]`; it does not compare receipt `prose_hash` to the rendered prose file.
3. Shared boundary: `branching-story-prose-attach` emits `pages-prose-receipts/PG-*.yaml`, Hook 7 blocks mismatches at direct write time, and `tools/validators` owns later full-world/incremental validation. The missing surface is validator-side drift detection after the receipt has already landed.
4. FOUNDATIONS principle: the receipt is not world canon, but it is an audit-trail artifact for a story-bundle deliverable. Preserving Rule 6-style auditability means a receipt must not continue asserting that it validated bytes that no longer match the file it names.
5. Canon Safety surface: this is additive fail-closed structural validation over direct-write story-bundle artifacts. It must not change HARD-GATE approval ordering, patch-engine semantics, Hook 7 behavior, or the receipt schema shape.
6. No active ticket currently owns validator-side prose receipt hash recompute parity. `archive/tickets/HOOK-003.md` explicitly excluded it as follow-up work.

## Architecture Check

1. A dedicated structural validator such as `prose_receipt_hash_integrity` is cleaner than overloading `prose_receipt_schema_compliance`, which is schema-shape-only. It also keeps Hook 7 as the at-write guard and gives `world-validate` a matching later-drift check.
2. No backwards-compatibility shim is needed. A receipt whose stamped `prose_hash` differs from the sha256 of the file at `prose_path` should fail validation.

## Verification Layers

1. Receipt `prose_hash` equals sha256 of `prose_path` bytes -> validator PASS -> focused structural test with temp story bundle fixture.
2. Receipt `prose_hash` differs from sha256 of `prose_path` bytes -> validator FAIL -> focused structural test with diagnostic naming stamped and computed hashes.
3. Missing/unreadable `prose_path` and unparseable receipt YAML fail closed -> focused structural tests.
4. Validator is registered and documented -> registry test / README inventory update and grep proof.
5. Full validators package remains green -> `cd tools/validators && npm test`.

## What to Change

### 1. Add `prose_receipt_hash_integrity`

Create `tools/validators/src/structural/prose-receipt-hash-integrity.ts`.

- Discover the same `stories/<story-slug>/pages-prose-receipts/PG-*.yaml` surface as `prose_receipt_schema_compliance`.
- Run in full-world mode and receipt-file incremental mode; skip pre-apply because receipts are direct-write artifacts, not patch-plan `_source` records.
- Parse the receipt, extract `prose_path` and `prose_hash`, resolve `prose_path` relative to the story bundle root, read the prose bytes, compute sha256, and compare.
- Emit fail verdicts for YAML parse errors, missing `prose_path`, missing `prose_hash`, missing/unreadable prose file, path escape, and hash mismatch.

### 2. Register and test the validator

Update `tools/validators/src/public/registry.ts`, registry/count tests, focused structural tests, and package README inventory as needed.

## Files to Touch

- `tools/validators/src/structural/prose-receipt-hash-integrity.ts` (new)
- `tools/validators/src/public/registry.ts` (modify)
- `tools/validators/tests/structural/prose-receipt-hash-integrity.test.ts` (new)
- `tools/validators/tests/structural/registry.test.ts` (modify, if registry count/list assertions require it)
- `tools/validators/tests/integration/spec04-verification.test.ts` (modify, if structural count assertions require it)
- `tools/validators/tests/integration/validate-patch-plan.test.ts` (modify, if clean pre-apply skip inventory requires it)
- `tools/validators/README.md` (modify)

## Out of Scope

- Hook 7 behavior or configuration.
- Changing `tools/validators/src/schemas/prose-receipt.schema.json`; this ticket checks value integrity, not schema shape.
- Repairing any live `worlds/<slug>/stories/<story>/pages-prose-receipts/*.yaml` content whose `prose_hash` is already stale.
- Changing `branching-story-prose-attach` authoring prose.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/validators && npm run build && node --test dist/tests/structural/prose-receipt-hash-integrity.test.js`
2. `cd tools/validators && npm test`
3. `grep -n 'prose_receipt_hash_integrity' tools/validators/src/public/registry.ts tools/validators/README.md`

### Invariants

1. Every in-scope prose receipt whose `prose_hash` differs from sha256 of the file at `prose_path` fails validator-side structural validation.
2. The validator skips pre-apply and does not change patch-engine or HARD-GATE semantics.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/prose-receipt-hash-integrity.test.ts` — positive match, mismatch, missing `prose_hash`, missing `prose_path`, missing prose file, unparseable YAML, path escape, and pre-apply skip.
2. Existing registry/count/pre-apply inventory tests updated only if required by the new registered validator.

### Commands

1. `cd tools/validators && npm run build && node --test dist/tests/structural/prose-receipt-hash-integrity.test.js`
2. `cd tools/validators && npm test`
3. `grep -n 'prose_receipt_hash_integrity' tools/validators/src/public/registry.ts tools/validators/README.md`
