# SPEC53CHAPIPSEC-003: Validator parity for user_seed NCP cards

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — `tools/validators/src/structural/character-memorability-structure.ts` (structural validator); no impact on the schema or MCP surface.
**Deps**: archive/tickets/SPEC53CHAPIPSEC-001.md

## Problem

At intake, `character-memorability-structure.ts`'s `proposalVerdicts` required the `## Rejected Directions Audit` heading only when `origin_kind === "upgraded_seed"` — it did not cover `user_seed`, although the `origin_kind` enum and the deepening skill both treat user-seed cards identically. The deepening skill's "≥3 rejected directions" requirement also was not structurally enforced. After SPEC53CHAPIPSEC-001 made the object-shaped audit schema-valid, the structural layer needed to enforce the ≥3-entry minimum so a clear per-field message is emitted alongside the AJV failure.

## Assumption Reassessment (2026-05-20)

1. **Codebase**: At intake, `tools/validators/src/structural/character-memorability-structure.ts` `proposalVerdicts` gated the `Rejected Directions Audit` heading check on `upgradeLineage.origin_kind === "upgraded_seed"` only and had no `rejected_directions_audit` length check. This ticket adds `requiresRejectedDirectionsAudit()` for `{upgraded_seed, user_seed}` and emits `rejected_directions_audit_min_items` for fewer than 3 entries. The `origin_kind` enum (`character-proposal-card.schema.json`) is `["batch_generated", "upgraded_seed", "user_seed"]`.
2. **Spec/docs**: SPEC-53 Phase 3 (H1b); §Risks "Sequencing" requires Phase 1 (schema accepts the object audit) to land before this ticket's ≥3-object check so the two layers agree — hence `Deps: archive/tickets/SPEC53CHAPIPSEC-001.md`. SPEC-53 §Key design decisions explicitly rejects broadening NCP body-section heading checks beyond `Rejected Directions Audit` (SPEC-52 Phase 5 item 6 deliberate decision).
3. **Cross-artifact boundary under audit**: NCP schema (`character-proposal-card.schema.json`, post-001) ↔ structural validator (`proposalVerdicts`). The schema's `minItems: 3` conditional and this validator's length check are intentional defense-in-depth — the same pattern as the existing `canon-requiring` implied-facts check, which is enforced in both the schema `allOf` and `proposalVerdicts`.
4. **Canon Safety surface (§Rule 7 firewall confirmation)**: `character-memorability-structure.ts` is a structural validator under `tools/validators/src/structural/` that gates hybrid-record writes at validation time. The change adds an NCP-shape check only; it does not touch Mystery Reserve firewall logic, does not resolve any `M-<integer>` entry, and does not weaken any canon-write ordering — confirmed: the validator reads frontmatter shape, never canon records.

## Architecture Check

1. Extending the existing `proposalVerdicts` `origin_kind` guard to `{upgraded_seed, user_seed}` and adding a single array-length check is the minimal change; it reuses the established verdict-emission helper and message shape.
2. No backwards-compatibility shim. The ≥3-entry structural check intentionally mirrors Phase 1's schema rule (defense-in-depth, clearer per-field message), matching the existing canon-requiring double-check precedent rather than introducing a novel redundancy.

## Verification Layers

1. `user_seed` NCP lacking `## Rejected Directions Audit` fails → structural validator test.
2. Upgraded/user-seed NCP with fewer than 3 rejected directions fails → structural validator test.
3. Batch-generated NCP cards are unaffected → structural validator test (negative — no new verdict emitted).

## Landed Changes

### 1. `proposalVerdicts` origin-kind parity

- Replaced the `origin_kind === "upgraded_seed"` guard with membership in `{upgraded_seed, user_seed}` for the `## Rejected Directions Audit` heading check.

### 2. Rejected-directions ≥3 structural check

- For `origin_kind ∈ {upgraded_seed, user_seed}`, the validator now emits a `rejected_directions_audit_min_items` verdict when `upgrade_lineage.rejected_directions_audit` is not an array of ≥3 entries.

## Files to Touch

- `tools/validators/src/structural/character-memorability-structure.ts` (modify)
- `tools/validators/tests/structural/character-memorability-structure.test.ts` (modify)

## Out of Scope

- NCP body-section heading checks beyond `Rejected Directions Audit` (rejected per SPEC-53; SPEC-52 Phase 5 item 6 keeps NCP body prose unchecked — the engine is validated in `memorability_profile` frontmatter).
- The CHAR `source_proposal_id` format check (SPEC53CHAPIPSEC-004 — separate function `characterVerdicts` in the same file).
- The schema conditional itself (SPEC53CHAPIPSEC-001).

## Acceptance Criteria

### Tests That Must Pass

1. A `user_seed` NCP without `## Rejected Directions Audit` fails with `missing_rejected_directions_audit`.
2. An upgraded/user-seed NCP with <3 rejected directions fails with `rejected_directions_audit_min_items`.
3. A batch-generated NCP card emits no new verdict; `npm test --prefix tools/validators` passes.

### Invariants

1. The validator never inspects canon records or Mystery Reserve entries — it reads NCP frontmatter shape only.
2. Batch-generated cards are unaffected by the new checks.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/character-memorability-structure.test.ts` — add user_seed parity + ≥3-rejected-directions cases; add a batch-card no-op assertion.

### Commands

1. `npm test --prefix tools/validators` (runs `npm run build` first, so `tsc` typecheck is covered)

## Outcome

Completed: 2026-05-20

- `proposalVerdicts` now treats `upgraded_seed` and `user_seed` as the NCP origin kinds that require a `## Rejected Directions Audit` heading.
- The same origin kinds now emit `character_memorability_structure.rejected_directions_audit_min_items` when `upgrade_lineage.rejected_directions_audit` has fewer than 3 entries or is not an array.
- Structural tests now cover user-seed heading parity, upgraded/user-seed minimum audit length, and a batch-generated no-op case.
- Deviation from the original plan: the separate build command was folded into `npm test --prefix tools/validators`, which runs the package build first via the package script.

## Verification Result

- Baseline before edits: `npm test --prefix tools/validators` passed with 733 tests / 733 pass.
- Final proof: `npm test --prefix tools/validators` passed with 736 tests / 736 pass.
- Ignored package artifacts present after proof: `tools/validators/dist/` and `tools/validators/node_modules/`; `dist/` was refreshed by the build/test lane and `node_modules/` was pre-existing package state.
