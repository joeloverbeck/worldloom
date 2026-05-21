# SPEC59STCHARAUTFID-003: `prose_receipt_stchar_integrity` validator

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — new structural validator in `tools/validators` registered in `structuralValidators`; no impact on existing validators (additive registry entry). Reads prose receipts, page-plan §16a, STCHAR records, and `PG.state_snapshot`; mutates nothing.
**Deps**: `archive/tickets/SPEC59STCHARAUTFID-001.md` (receipt fixtures rely on `char_authority_leak` being a required `checks` field)

## Problem

The prose-receipt `stchar_authority[]` and `profile_fidelity[]` blocks are schema-defined but optional, and only `prose_receipt_schema_compliance` (schema-shape) checks them — nothing verifies that receipt entries correspond to the page's required §16a packets, that hashes match, or that `active_in_snapshot` is consistent with the snapshot. SPEC-59 §2.3 (C5c) adds `prose_receipt_stchar_integrity` to enforce this deterministically while leaving artistic-fidelity judgments judgment-assisted.

## Assumption Reassessment (2026-05-21)

1. At intake, `tools/validators/src/schemas/prose-receipt.schema.json` defined `stchar_authority` (array of `stcharAuthorityCheck`, optional at top level) with required item fields `stchar_id`, `stent_id`, `display_name`, `required_because`, `packet_present`, `active_in_snapshot`, `profile_hash`/`voice_block_hash`/`page_packet_hash` (each a `hashComparison`), `deterministic_verdict`; and `profile_fidelity` (array of `profileFidelityCheck`) whose items carry `voice_fidelity`/`appraisal_fidelity`/`pressure_behavior_fidelity`/`relationship_conduct_fidelity` (enum `pass|minor_drift|major_drift|not_applicable`). No file `prose-receipt-stchar-integrity.ts` existed yet. `tests/structural/registry.test.ts` asserted the ordered `structuralValidators` name list.
2. SPEC-59 §2.3 is the source deliverable; §3 lists fixtures (missing `char_authority_leak` → fail via §2.1; missing `profile_fidelity` entry → fail; hash mismatch → fail; active-snapshot mismatch → fail; allowed judgment-assisted drift present + actionable → pass).
3. Cross-artifact boundary: this validator joins three surfaces — the receipt (`stchar_authority[]`/`profile_fidelity[]`), the page-plan §16a packet set (`required_because`-qualified), and the STCHAR record frontmatter hashes. Set-equality is on `stchar_id` between required §16a packets and `stchar_authority[]` entries. Depends on ticket 001 having tightened `char_authority_leak` to required so receipt fixtures are schema-valid.
4. FOUNDATIONS §6.1 Story-Local Character Authority motivates this ticket: it verifies the rendered receipt actually carried the per-character STCHAR authority the page required, keeping STCHAR the operational authority for the render.
5. Canon Safety surface: new structural validator under `tools/validators/src/structural/` gating story-bundle receipt integrity at validate-time / Hook 5. Read-only; mutates nothing; resolves no Mystery Reserve entry. Judgment-assisted fidelity fields are checked for presence/actionability only — never auto-graded — preserving the deterministic/judgment boundary.

## Architecture Check

1. A dedicated receipt-integrity validator complements (does not duplicate) `page_plan_stchar_packet_integrity` (plan side) and `prose_receipt_schema_compliance` (schema shape) — each owns one surface. Set-equality + hash-equality are deterministic; artistic fidelity stays judgment-assisted.
2. No backwards-compatibility shim: `voice_fidelity`/`appraisal_fidelity`/`pressure_behavior_fidelity`/`relationship_conduct_fidelity` are never coerced into PASS/FAIL gates — presence/actionability only.

## Verification Layers

1. A receipt missing an `stchar_authority[]` entry for a required §16a packet fails (set-equality on `stchar_id`) -> schema validation (fixture).
2. An entry whose hashes differ from the page-plan packet / STCHAR record fails -> hash-mismatch fixture.
3. An entry whose `active_in_snapshot` is inconsistent with the page snapshot fails -> active-snapshot-mismatch fixture.
4. A receipt missing a `profile_fidelity[]` entry for an STCHAR packet fails (presence only) -> fixture.
5. Allowed judgment-assisted drift values present and actionable pass (never auto-graded) -> pass fixture + grep-proof that no fidelity enum is gated to FAIL.

## Landed Changes

### 1. New validator module

Created `tools/validators/src/structural/prose-receipt-stchar-integrity.ts` exporting the `prose_receipt_stchar_integrity` structural validator. It joins explicit or world-root receipt files, page-plan §16a packets, `PG.state_snapshot.active_records.STCHAR`, and STCHAR frontmatter hashes. It:
- computes the required §16a packet set for the page and asserts set-equality on `stchar_id` with `stchar_authority[]`;
- checks `stent_id`, `required_because`, `active_in_snapshot`, and each hash comparison against the page-plan packet plus stored STCHAR frontmatter hash;
- requires a `profile_fidelity[]` entry for every required STCHAR packet without auto-grading the judgment-assisted fidelity axes.

Fail on missing entry / hash mismatch / snapshot mismatch / missing fidelity entry. Do NOT grade `voice_fidelity`/`appraisal_fidelity`/`pressure_behavior_fidelity`/`relationship_conduct_fidelity`.

### 2. Register in the structural registry

Import + array entry in `tools/validators/src/public/registry.ts`; add the name to the ordered list in `tools/validators/tests/structural/registry.test.ts`.

### 3. Focused tests and inventory surfaces

Added inline synthetic records, page-plan text, and receipt payloads in `tools/validators/tests/structural/prose-receipt-stchar-integrity.test.ts` for pass, missing authority, hash mismatch, snapshot mismatch, and missing profile-fidelity cases. Updated validator-count/parity surfaces in `tools/validators/tests/integration/spec04-verification.test.ts`, `tools/validators/tests/integration/validate-patch-plan.test.ts`, `tools/validators/README.md`, and `tools/world-mcp/tests/server/capability-parity.test.ts`.

## Files to Touch

- `tools/validators/src/structural/prose-receipt-stchar-integrity.ts` (new)
- `tools/validators/src/public/registry.ts` (modify) — import + `structuralValidators` array entry
- `tools/validators/tests/structural/registry.test.ts` (modify) — add name to the ordered `deepEqual` name list
- `tools/validators/tests/structural/prose-receipt-stchar-integrity.test.ts` (new) — inline fixture-driven validator unit tests
- `tools/validators/tests/integration/spec04-verification.test.ts` (modify) — structural validator count update
- `tools/validators/tests/integration/validate-patch-plan.test.ts` (modify) — clean pre-apply execution-status skip expectations for receipt/page-plan STCHAR validators
- `tools/validators/README.md` (modify) — validator inventory update
- `tools/world-mcp/tests/server/capability-parity.test.ts` (modify) — downstream validator registry parity update

## Out of Scope

- Auto-grading any judgment-assisted fidelity field (presence/actionability only).
- The page-plan packet integrity check (`page_plan_stchar_packet_integrity`, ticket 002).
- The schema-shape compliance check (`prose_receipt_schema_compliance`) and the `char_authority_leak` required tightening (ticket 001).

## Acceptance Criteria

### Tests That Must Pass

1. Missing-`stchar_authority`-entry, hash-mismatch, active-snapshot-mismatch, and missing-`profile_fidelity`-entry fixtures each produce a `severity_mode: "fail"` verdict.
2. A receipt with allowed judgment-assisted drift values present and actionable passes (no auto-grade).
3. `npm test --prefix tools/validators` passes, including `tests/structural/registry.test.ts` (name list now includes `prose_receipt_stchar_integrity`).

### Invariants

1. Set-equality + hash-equality + snapshot consistency are the only deterministic gates; the four artistic-fidelity enums are never coerced to FAIL.
2. The validator mutates no records and resolves no Mystery Reserve entry.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/prose-receipt-stchar-integrity.test.ts` — inline fixture-driven fail/pass cases per §3.
2. `tools/validators/tests/structural/registry.test.ts` — extend the ordered name-list assertion.
3. `tools/validators/tests/integration/spec04-verification.test.ts` — update structural validator count assertions.
4. `tools/validators/tests/integration/validate-patch-plan.test.ts` — record that receipt/page-plan STCHAR validators skip clean pre-apply plans with no prose receipt/plan surface.
5. `tools/world-mcp/tests/server/capability-parity.test.ts` — extend downstream validator-name parity assertion.

### Commands

1. `npm run build --prefix tools/validators`
2. `npm test --prefix tools/validators`
3. `npm run build --prefix tools/world-mcp`
4. `node --test dist/tests/server/capability-parity.test.js` from `tools/world-mcp`

## Outcome

Completed: 2026-05-21.

Implemented `prose_receipt_stchar_integrity` as a read-only structural validator. It validates receipt-side STCHAR authority against the required §16a page-plan packet set, page snapshot activity, and STCHAR frontmatter hashes, while leaving `voice_fidelity`, `appraisal_fidelity`, `pressure_behavior_fidelity`, and `relationship_conduct_fidelity` as judgment-assisted receipt fields rather than deterministic PASS/FAIL gates.

Registry, validator inventory, SPEC-04 count, pre-apply execution-status, and downstream `world-mcp` capability-parity surfaces were updated to include the new validator.

## Verification Result

- `npm run build` from `tools/validators` — passed.
- `node --test dist/tests/integration/validate-patch-plan.test.js dist/tests/structural/prose-receipt-stchar-integrity.test.js dist/tests/structural/registry.test.js dist/tests/integration/spec04-verification.test.js` from `tools/validators` — passed.
- `npm test` from `tools/validators` — passed, 795/795 tests.
- `npm run build` from `tools/world-mcp` — passed.
- `node --test dist/tests/server/capability-parity.test.js` from `tools/world-mcp` — passed.

## Deviations

- The drafted `tools/validators/tests/fixtures/` files were replaced with inline synthetic records, page-plan text, and receipt payloads in `tools/validators/tests/structural/prose-receipt-stchar-integrity.test.ts`, matching the adjacent SPEC-59 ticket pattern and proving the same validator branches through explicit file input.
- During proof, the clean pre-apply execution-status test exposed that `page_plan_stchar_packet_integrity` and the new receipt validator skip when no page-plan/prose-receipt file surface is present. The test now records those skips explicitly; no production validator behavior was weakened.
