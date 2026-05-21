# SPEC61PROSURSCH-004: approval-semantics validator — hard-fail non-CF `direct_user_approval`

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — new `tools/validators/src/structural/approval-semantics.ts` registered in `tools/validators/src/public/registry.ts`; no impact on existing validators (additive registry entry).
**Deps**: archive/tickets/SPEC61PROSURSCH-002.md

## Problem

FOUNDATIONS §Canon Fact Record Schema (lines 355–361) reserves `source_basis.direct_user_approval` for accepted CF records, but no validator enforces this — `continuity-audit`'s RP card currently misuses it (fixed in SPEC61PROSURSCH-005), and the existing NCP/NCB/CHAR/DA schemas do not prohibit it (verified: `diegetic-artifact-frontmatter.schema.json:66` declares `source_basis` as a permissive `{ "type": "object" }`). Per SPEC-61's Q1=(a) reassessment resolution, a dedicated validator over **every** non-CF record class is the primary mechanism that satisfies §4's universal acceptance criterion; the per-schema `not`-prohibition (`archive/tickets/SPEC61PROSURSCH-001.md`) is optional defense-in-depth.

## Assumption Reassessment (2026-05-21)

1. Verified against the codebase (this session): `tools/validators/src/public/registry.ts` is the validator-framework registry (a new validator registered here is consumed by the run-loop — registry insertion is the consumer wiring, per the registry-registered structural-consumer model). `canon-fact-record.schema.json:69–71` requires `direct_user_approval: const true` — the CF carve-out this validator must respect. `diegetic-artifact-frontmatter.schema.json:66` confirms DA `source_basis` is permissive, so DA/NCP/NCB/CHAR are uncovered without this validator.
2. Verified against the spec: SPEC-61 §2.3 second bullet (post-reassessment) names this validator as the **primary** mechanism, run over every non-CF record class; §4 acceptance bullet 3 requires a non-CF surface carrying `source_basis.direct_user_approval` to produce a blocking FAIL citing the CF-only reservation, and bullet 5 requires CF records to still require `direct_user_approval: true` (no regression).
3. Cross-artifact boundary under audit: the validator reads `source_basis.direct_user_approval` across all non-CF parsed record classes (PR/BATCH/EPE/EPE-sidecar/EPE-batch/AU/RP/NWP/NWB once `archive/tickets/SPEC61PROSURSCH-002.md` indexes them, plus the pre-existing NCP/NCB/CHAR/DA). The shared contract is "which node_type is the canon-fact class" — the validator must skip exactly `canon_fact_record` and check everything else carrying a `source_basis`.
4. FOUNDATIONS Rule 6 (No Silent Retcons) / §Canon Fact Record Schema reservation: the validator enforces the proposal→accepted-canon approval boundary so a proposal surface cannot launder itself into looking canon-accepted. Restate that `direct_user_approval` means "user approved this fact's acceptance into world canon," reserved to accepted CFs only.
5. Canon Safety surface: this is a new structural validator under `tools/validators/src/structural/` that gates record schema/semantics at the validator boundary. Confirm it does not weaken any Mystery Reserve firewall (it touches only `source_basis.direct_user_approval`, orthogonal to MR) and that the CF carve-out cannot be bypassed (CF must keep requiring the field).

## Architecture Check

1. A dedicated validator over all non-CF classes is the only mechanism that satisfies §4's universal criterion — the schema-only `not`-prohibition (`archive/tickets/SPEC61PROSURSCH-001.md`) covers only the new schema surfaces and would leave NCP/NCB/CHAR/DA uncovered. Centralizing the rule in one validator avoids per-schema duplication and a coverage gap.
2. No backwards-compatibility shims — a new validator + one additive registry entry; no existing validator is modified.

## Verification Layers

1. A non-CF record with `source_basis.direct_user_approval` (any value) FAILs with a reservation-citing message -> schema validation / validator dry-run over a fixture.
2. A CF record with `direct_user_approval: true` PASSes (carve-out respected) -> schema validation over a real/fixture CF.
3. The validator is registered and runs in the framework loop -> codebase grep-proof (`grep approvalSemantics tools/validators/src/public/registry.ts`).
4. Existing NCP/NCB/CHAR/DA cards using `user_approved` (not `direct_user_approval`) PASS -> validator dry-run (no false positives on the sanctioned sibling field).

## What to Change

### 1. New validator module

Create `tools/validators/src/structural/approval-semantics.ts`: for every parsed record whose node_type is **not** `canon_fact_record`, if `source_basis.direct_user_approval` is present, emit a blocking FAIL whose message names the CF-only reservation and points to the sibling `user_approved` field. CF records are exempt (they require the field per their own schema).

### 2. Register the validator

Add the validator to `tools/validators/src/public/registry.ts` (import + registry array entry), mirroring an existing structural validator's registration.

## Files to Touch

- `tools/validators/src/structural/approval-semantics.ts` (new)
- `tools/validators/src/public/registry.ts` (modify)
- `tools/validators/tests/structural/approval-semantics.test.ts` (new)

## Out of Scope

- Renaming RP's `direct_user_approval` (SPEC61PROSURSCH-005 — this validator surfaces the violation; the rename fixes the producer).
- The per-schema `not`-prohibition (`archive/tickets/SPEC61PROSURSCH-001.md` — defense-in-depth only).
- Any change to the CF `direct_user_approval: const true` requirement.

## Acceptance Criteria

### Tests That Must Pass

1. `npm --prefix tools/validators test` passes including `approval-semantics.test.ts`.
2. A non-CF fixture carrying `source_basis.direct_user_approval` produces a blocking FAIL citing the CF-only reservation.
3. A CF fixture with `direct_user_approval: true` passes; an NCP/DA fixture with `user_approved` passes.

### Invariants

1. `canon_fact_record` is the sole node_type exempt from the hard-fail; every other `source_basis`-bearing class is checked.
2. The validator touches only `source_basis.direct_user_approval` — no Mystery Reserve / invariant surface is affected.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/approval-semantics.test.ts` — non-CF FAIL, CF PASS, `user_approved` PASS cases. — covers What to Change §1 + §4 acceptance bullets 3/5.

### Commands

1. `npm --prefix tools/validators test`
2. `npm --prefix tools/validators run build`
