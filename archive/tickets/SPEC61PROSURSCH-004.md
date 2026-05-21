# SPEC61PROSURSCH-004: approval-semantics validator — hard-fail non-CF `direct_user_approval`

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — new `tools/validators/src/structural/approval-semantics.ts` registered in `tools/validators/src/public/registry.ts`; no impact on existing validators (additive registry entry).
**Deps**: archive/tickets/SPEC61PROSURSCH-002.md

## Problem

At intake, FOUNDATIONS §Canon Fact Record Schema reserved `source_basis.direct_user_approval` for accepted CF records, but no dedicated validator enforced this across all non-CF record classes. `continuity-audit`'s RP producer collision was already fixed in SPEC61PROSURSCH-005, and the existing NCP/NCB/CHAR/DA schemas did not prohibit the field uniformly. Per SPEC-61's Q1=(a) reassessment resolution, a dedicated validator over **every** non-CF record class is the primary mechanism that satisfies §4's universal acceptance criterion; the per-schema `not`-prohibition (`archive/tickets/SPEC61PROSURSCH-001.md`) remains defense-in-depth for the new schema surfaces.

## Assumption Reassessment (2026-05-21)

1. Verified against the codebase (this session): `tools/validators/src/public/registry.ts` is the validator-framework registry (a new validator registered here is consumed by the run-loop — registry insertion is the consumer wiring, per the registry-registered structural-consumer model). `canon-fact-record.schema.json:69–71` requires `direct_user_approval: const true` — the CF carve-out this validator must respect. `diegetic-artifact-frontmatter.schema.json:66` confirms DA `source_basis` is permissive, so DA/NCP/NCB/CHAR are uncovered without this validator.
2. Verified against the spec: SPEC-61 §2.3 second bullet (post-reassessment) names this validator as the **primary** mechanism, run over every non-CF record class; §4 acceptance bullet 3 requires a non-CF surface carrying `source_basis.direct_user_approval` to produce a blocking FAIL citing the CF-only reservation, and bullet 5 requires CF records to still require `direct_user_approval: true` (no regression).
3. Cross-artifact boundary under audit: the validator reads `source_basis.direct_user_approval` across all non-CF parsed record classes (PR/BATCH/EPE/EPE-sidecar/EPE-batch/AU/RP/NWP/NWB once `archive/tickets/SPEC61PROSURSCH-002.md` indexes them, plus the pre-existing NCP/NCB/CHAR/DA). The shared contract is "which node_type is the canon-fact class" — the validator must skip exactly `canon_fact_record` and check everything else carrying a `source_basis`.
4. FOUNDATIONS Rule 6 (No Silent Retcons) / §Canon Fact Record Schema reservation: the validator enforces the proposal→accepted-canon approval boundary so a proposal surface cannot launder itself into looking canon-accepted. Restate that `direct_user_approval` means "user approved this fact's acceptance into world canon," reserved to accepted CFs only.
5. Canon Safety surface: this is a new structural validator under `tools/validators/src/structural/` that gates record schema/semantics at the validator boundary. Confirm it does not weaken any Mystery Reserve firewall (it touches only `source_basis.direct_user_approval`, orthogonal to MR) and that the CF carve-out cannot be bypassed (CF must keep requiring the field).
6. Implementation reassessment confirmed this is a HARD-GATE-facing validation-signal tightening, so `docs/HARD-GATE-DISCIPLINE.md` was read before code edits. The validator has `applies_to: () => true`, matching the intended full-world, incremental, and pre-apply coverage rather than excluding a gate path.
7. Same-package inventory fallout was live: `tools/validators/README.md`, `tools/validators/tests/cli/world-validate.test.ts`, and `tools/validators/tests/integration/spec04-verification.test.ts` carried fixed validator lists/counts. They were added to the landed file set so the registry, CLI selector witness, inventory prose, and aggregate guard agree on the new validator.
8. Downstream capability parity in `tools/world-mcp/tests/server/capability-parity.test.ts` imports the validators registry and asserts every validator name. That consumer had to move with this registry addition before downstream proof could pass.

## Architecture Check

1. A dedicated validator over all non-CF classes is the only mechanism that satisfies §4's universal criterion — the schema-only `not`-prohibition (`archive/tickets/SPEC61PROSURSCH-001.md`) covers only the new schema surfaces and would leave NCP/NCB/CHAR/DA uncovered. Centralizing the rule in one validator avoids per-schema duplication and a coverage gap.
2. No backwards-compatibility shims — a new validator + one additive registry entry; no existing validator is modified.

## Verification Layers

1. A non-CF record with `source_basis.direct_user_approval` (any value) FAILs with a reservation-citing message -> schema validation / validator dry-run over a fixture.
2. A CF record with `direct_user_approval: true` PASSes (carve-out respected) -> schema validation over a real/fixture CF.
3. The validator is registered and runs in the framework loop -> codebase grep-proof (`grep approvalSemantics tools/validators/src/public/registry.ts`).
4. Existing NCP/NCB/CHAR/DA cards using `user_approved` (not `direct_user_approval`) PASS -> validator dry-run (no false positives on the sanctioned sibling field).

## Landed Changes

### 1. New validator module

Created `tools/validators/src/structural/approval-semantics.ts`: for every parsed record whose node_type is **not** `canon_fact_record`, if `source_basis.direct_user_approval` is present, it emits a blocking FAIL whose message names the CF-only reservation and points to the sibling `user_approved` field. CF records are exempt and remain governed by their own schema.

### 2. Register the validator

Added the validator to `tools/validators/src/public/registry.ts` (import + registry array entry), updated the structural registry assertion, and truthed the package README, CLI selector witness, SPEC-04 aggregate validator-count witness, and world-mcp capability parity consumer.

## Files to Touch

- `tools/validators/src/structural/approval-semantics.ts` (new)
- `tools/validators/src/public/registry.ts` (modify)
- `tools/validators/tests/structural/approval-semantics.test.ts` (new)
- `tools/validators/tests/structural/registry.test.ts` (modify)
- `tools/validators/tests/cli/world-validate.test.ts` (modify)
- `tools/validators/tests/integration/spec04-verification.test.ts` (modify)
- `tools/validators/README.md` (modify)
- `tools/world-mcp/tests/server/capability-parity.test.ts` (modify)

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

1. `tools/validators/tests/structural/approval-semantics.test.ts` — non-CF FAIL, CF PASS, `user_approved` PASS cases. — covers Landed Changes §1 + §4 acceptance bullets 3/5.
2. `tools/validators/tests/structural/registry.test.ts`, `tools/validators/tests/cli/world-validate.test.ts`, and `tools/validators/tests/integration/spec04-verification.test.ts` — registry-name, selector-list, and aggregate-count guards for the new validator.
3. `tools/world-mcp/tests/server/capability-parity.test.ts` — downstream registry consumer parity for the added validator name.

### Commands

1. From `tools/validators`: `npm run build`
2. From `tools/validators`: `node --test dist/tests/structural/approval-semantics.test.js dist/tests/structural/registry.test.js dist/tests/integration/spec04-verification.test.js`
3. From `tools/validators`: `npm test`
4. From `tools/world-mcp`: `npm run build` then `node --test dist/tests/server/capability-parity.test.js`

## Outcome

Completed: 2026-05-21.

The validators package now has a registered `approval_semantics` structural validator. It rejects `source_basis.direct_user_approval` on every non-`canon_fact_record` indexed record, preserves the accepted-CF carve-out, and accepts proposal-side `source_basis.user_approved`. The package registry test, SPEC-04 aggregate validator-count witness, and README inventory were updated to include the 86th structural validator.

## Verification Result

- Baseline before edits: `npm test` from `tools/validators` passed, 802 tests.
- `npm run build` from `tools/validators` passed after implementation.
- Initial focused proof: `node --test dist/tests/structural/approval-semantics.test.js dist/tests/structural/registry.test.js dist/tests/integration/spec04-verification.test.js` from `tools/validators` passed, 13 tests.
- First broad validators rerun exposed a same-seam stale selector-list assertion in `tools/validators/tests/cli/world-validate.test.ts`; after updating it, `node --test dist/tests/cli/world-validate.test.js dist/tests/structural/approval-semantics.test.js dist/tests/structural/registry.test.js dist/tests/integration/spec04-verification.test.js` from `tools/validators` passed, 21 tests.
- Final `npm test` from `tools/validators` passed, 805 tests.
- `npm run build` from `tools/world-mcp` passed after installing local package dependencies for the downstream package.
- `node --test dist/tests/server/capability-parity.test.js` from `tools/world-mcp` passed, 5 tests.

## Deviations

- The landed file set includes `tools/validators/README.md`, `tools/validators/tests/structural/registry.test.ts`, `tools/validators/tests/cli/world-validate.test.ts`, `tools/validators/tests/integration/spec04-verification.test.ts`, and `tools/world-mcp/tests/server/capability-parity.test.ts` because registry-count, selector-list, inventory, and downstream capability surfaces had to move with the new validator.
- `npm install` was run in `tools/world-mcp` to restore local ignored dependencies needed for downstream proof. Its incidental `package-lock.json` version churn was removed; only ignored `tools/world-mcp/node_modules/` remains as a local proof artifact.
