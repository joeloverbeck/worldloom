# SPEC71STRSTCHARTAM-006: Add the `forbidden_stchar_tamper_hash_fields` reintroduction guard

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — new `tools/validators/src/structural/forbidden-stchar-tamper-hash-fields.ts` + `registry.ts` register + meta-test.
**Deps**: 002

## Problem

Stripping the four hashes is pointless if a future "improvement" silently reintroduces them (SPEC-71 §2.2, the user's explicit requirement). This ticket adds a structural validator that FAILs if `profile_hash` / `voice_block_hash` / `page_packet_hash` / `source_char_hash` reappear in STCHAR frontmatter, prose-receipt YAML, or page-plan §16a packets, plus a repo-grep meta-test guarding the schema/contract files. The schema-layer `additionalProperties:false` (already present, confirmed in 002) is the complementary free guard for the schema surfaces.

## Assumption Reassessment (2026-05-22)

1. Codebase: `tools/validators/src/public/registry.ts:107 structuralValidators[]` is the registration array (structural-consumer model — registry insertion is the consumer wiring). The new validator follows the sibling shape of `stchar-body-integrity.ts` (reads STCHAR frontmatter), `prose-receipt-stchar-integrity.ts` (reads receipt YAML), and `page-plan-stchar-packet-integrity.ts` (reads §16a packets). After 002, the four fields are absent from `properties`, so a clean fixture reflects post-teardown state.
2. Specs/docs: SPEC-71 §2.2 + §5 acceptance criterion 4.
3. Cross-artifact boundary under audit: the validator reads three artifact surfaces (STCHAR frontmatter / prose-receipt YAML / §16a packet) — the same three the torn-down hashes inhabited; it must FAIL on any of the four names in any of the three.
4. FOUNDATIONS Rule 6 (No Silent Retcons) + §5b (Schema-Minimalism): the guard makes a silent reintroduction a hard failure, preserving the spec's removal as a durable decision rather than a reversible one.
5. Canon-Safety surface: this is a new structural validator under `tools/validators/src/structural/` registered in the framework run-loop (it participates in story-bundle pre-apply validation). Confirmed it adds a FAIL gate only on the forbidden field names; it reads no canon and resolves no Mystery Reserve entry — Rule 7 firewall unaffected.

## Architecture Check

1. A dedicated structural validator covers the §16a-packet + receipt-YAML surfaces that `additionalProperties:false` does not validate; the two guards compose (schema-layer for STCHAR/receipt frontmatter, validator for packets + defense-in-depth) so reintroduction is caught at every surface.
2. No shim: a net-new validator + registry entry; no modification to the teardown tickets' surfaces.

## Verification Layers

1. A fixture STCHAR/receipt/§16a with any of the four field names → validator FAIL (one fixture per surface).
2. A clean post-teardown fixture → validator PASS.
3. The meta-test greps the two schema files + the §16a contract for the four names → asserts zero, tripping CI on schema/contract reintroduction.
4. Registry registration → `grep -n forbiddenStcharTamperHashFields tools/validators/src/public/registry.ts` returns the import + array entry.

## What to Change

### 1. New validator
Create `tools/validators/src/structural/forbidden-stchar-tamper-hash-fields.ts`: id `forbidden_stchar_tamper_hash_fields`; scan STCHAR frontmatter, prose-receipt YAML, and §16a page-plan packets for `profile_hash`/`voice_block_hash`/`page_packet_hash`/`source_char_hash`; FAIL with a clear message naming the offending field + surface.

### 2. Register + meta-test
`registry.ts`: import + add to `structuralValidators[]` (a different line from 001's deregister; the Deps chain sequences them). Add a meta-test (repo-grep assertion) that the four names do not appear in `story-character-authority.schema.json`, `prose-receipt.schema.json`, or the §16a contract text in `story-state-contract.md` / `story-record-schemas.md`.

## Files to Touch

- `tools/validators/src/structural/forbidden-stchar-tamper-hash-fields.ts` (new)
- `tools/validators/src/public/registry.ts` (modify)
- `tools/validators/tests/structural/forbidden-stchar-tamper-hash-fields.test.ts` (new)
- `tools/validators/tests/**` meta-test for schema/contract reintroduction (new or extend)

## Out of Scope

- Removing the fields (001/002) — this ticket only guards against their return.
- The §16a contract doc edits (005) — the guard validates the absence the docs prescribe.

## Acceptance Criteria

### Tests That Must Pass

1. `npm test --prefix tools/validators` — the new validator FAILs each of the three reintroduction fixtures and PASSes the clean fixture; meta-test passes against the post-teardown schema/contract files.
2. `grep -n "forbiddenStcharTamperHashFields\|forbidden_stchar_tamper_hash_fields" tools/validators/src/public/registry.ts` → registered.
3. `npm run build --prefix tools/validators` (tsc).

### Invariants

1. Any reappearance of the four field names in STCHAR frontmatter / prose-receipt YAML / §16a packets is a hard validator FAIL.
2. The guard reads no canon and changes no Mystery Reserve firewall behavior.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/forbidden-stchar-tamper-hash-fields.test.ts` — per-surface FAIL fixtures + clean PASS fixture.
2. `tools/validators/tests/**` meta-test — grep schema + contract files for the four names → zero.

### Commands

1. `npm test --prefix tools/validators`
2. `npm run build --prefix tools/validators`
