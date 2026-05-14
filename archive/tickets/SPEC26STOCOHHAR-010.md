# SPEC26STOCOHHAR-010: SPEC-26 integration verification — contract self-consistency + cross-skill sweep

**Status**: COMPLETED
**Priority**: LOW
**Effort**: Small
**Engine Changes**: None — verification-only capstone; introduced no production code or validator test changes.
**Deps**: archive/tickets/SPEC26STOCOHHAR-001.md, archive/tickets/SPEC26STOCOHHAR-006.md, archive/tickets/SPEC26STOCOHHAR-007.md, archive/tickets/SPEC26STOCOHHAR-008.md, archive/tickets/SPEC26STOCOHHAR-009.md

## Problem

At intake, SPEC-26's §Verification section had two *cross-cutting* checks that no single implementation ticket could prove on its own: **Contract self-consistency** (every new field in `story-state-contract.md` §4–§5 reflected in the `tools/validators/src/schemas/story-*.schema.json` files and vice versa — spans SPEC26STOCOHHAR-003's `SE.resolution` and archive/tickets/SPEC26STOCOHHAR-007.md's `record_age`) and the **Cross-skill sweep** (no drifted vocabulary survives anywhere in the final tree — spans SPEC26STOCOHHAR-001's reconciliation against the integrated final state). This capstone owned those two checks; per-deliverable §Verification bullets live in each Dx ticket's Acceptance Criteria.

## Assumption Reassessment (2026-05-14)

1. Verified against the current codebase at SPEC-26 Step 2: `tools/validators/` ships a contract↔schema roundtrip test (`tools/validators/dist/tests/structural/contract-schema-roundtrip.test.js` was observed; the source is `tools/validators/tests/structural/contract-schema-roundtrip.test.ts`) and `record_schema_compliance` with per-class tests. `tools/validators` exposes `npm run build` and `npm run test` (no `typecheck`, no `pnpm`/`turbo`). The Dx tickets this capstone depends on either land independently (`archive/tickets/SPEC26STOCOHHAR-001.md`, `archive/tickets/SPEC26STOCOHHAR-006.md`, `archive/tickets/SPEC26STOCOHHAR-007.md`) or sit at the heads of the dependency DAG (`archive/tickets/SPEC26STOCOHHAR-008.md` transitively covers 003+004; `archive/tickets/SPEC26STOCOHHAR-009.md` transitively covers 002+003+005) — the `Deps` leaf-set `{archive/tickets/SPEC26STOCOHHAR-001.md, archive/tickets/SPEC26STOCOHHAR-006.md, archive/tickets/SPEC26STOCOHHAR-007.md, archive/tickets/SPEC26STOCOHHAR-008.md, archive/tickets/SPEC26STOCOHHAR-009.md}` therefore covers all nine implementation tickets.
2. Verified against `archive/specs/SPEC-26-story-coherence-hardening-ii.md` §Verification: the two cross-cutting bullets are "Contract self-consistency" (every new/changed field in `story-state-contract.md` §4–§5 mirrored in the JSON schemas; `record_schema_compliance` round-trips a valid `SE` record with and without `resolution`) and "Cross-skill sweep" (after all deliverables, grep the seven story skills + the two shared templates + the validator package for the old drifted vocabulary — `controlled_by`, `*.basis`, `created_at_page.*non-null` branch-locality phrasing — and any stale references). Per-deliverable §Verification bullets D1–D8 are owned by tickets 001–009.
3. Cross-skill / cross-artifact boundary under audit: this is a pure verification capstone over the *integrated* post-implementation tree — the shared boundary is the final-state consistency between `.claude/skills/_shared-templates/story-state-contract.md` §4–§5, the seven story-pipeline skills, the two shared templates, and `tools/validators/`. It introduces no production code; it exercises the surfaces composed by the nine prior tickets.
4. Confirmed: `tools/validators/tests/structural/contract-schema-roundtrip.test.ts` already covers the `SE.resolution` schema surface by asserting the `story-event` properties list contains `resolution`. `tools/validators/tests/structural/record-schema-compliance-story-event.test.ts` covers SE records with and without `resolution` and route-specific result constraints. Therefore no validator test edit was needed. `record_age` grammar consistency remains covered by archive/tickets/SPEC26STOCOHHAR-007.md's own parsability test and was re-exercised by the package suite.

## Architecture Check

1. A single thin capstone for the two genuinely cross-cutting §Verification bullets is cleaner than either folding them into an arbitrary Dx ticket (no Dx ticket lands last enough to verify the integrated state) or duplicating them across every ticket (each Dx ticket would re-run the full sweep). The capstone depends on the DAG leaf-set, so it cannot run until the integrated state exists.
2. No backwards-compatibility aliasing or shims — the capstone introduces no production code; any test extension asserts new state, it does not bridge old and new.

## Verification Layers

1. Contract ↔ schema consistency holds across the integrated tree -> schema validation: `cd tools/validators && npm run build && npm run test` passes, including `record_schema_compliance` round-tripping an `SE` record with and without `resolution`; every new field in `story-state-contract.md` §4–§5 (`SE.resolution`, `record_age`) is reflected in the corresponding schema/grammar surface and vice versa.
2. No drifted vocabulary survives -> codebase grep-proof: the cross-skill sweep for `controlled_by`, `relationship_change_without_basis`, `*.basis` on SREL, `STINT`/`SREL` `status`, and `created_at_page.*non-null` branch-locality phrasing returns no matches across the seven story skills, the two shared templates, and `tools/validators/`.
3. The contract roundtrip test covers the SPEC-26 additions -> schema validation: `contract-schema-roundtrip` asserts (auto or explicitly) that `SE.resolution` round-trips between `story-state-contract.md` §4.3 and `story-event.schema.json`.
4. (Single-layer not applicable — this capstone maps the contract-consistency invariant and the no-drift invariant to two distinct proof surfaces, schema validation and grep-proof respectively.)

## Landed Changes

### 1. Contract self-consistency verification

Ran the validators package build/test lane against the integrated post-implementation tree. `contract-schema-roundtrip.test.ts` covers the `story-event` `resolution` property, and `record-schema-compliance-story-event.test.ts` covers `SE` records with and without `resolution` plus route-specific result constraints. No validator source or test change was needed.

### 2. Cross-skill sweep verification

Ran the SPEC-26 §Verification cross-skill sweep against the final tree: the seven story-pipeline skills, the two shared templates, and the validator package have no remaining operational hits for `controlled_by`, `relationship_change_without_basis`, `SREL` `basis`, `STINT`/`SREL` `status`, or the crude `created_at_page`-non-null branch-locality phrasing.

## Files to Touch

- `archive/tickets/SPEC26STOCOHHAR-010.md` (modify — closeout/archive record only)

No production code, schema, skill, or validator test file was modified.

## Out of Scope

- Per-deliverable §Verification bullets D1–D8 — each is owned by its implementation ticket's Acceptance Criteria (001–009).
- Re-testing `record_age` grammar parsability — covered by archive/tickets/SPEC26STOCOHHAR-007.md's own test.
- Any production code, schema, skill, or validator test change — this capstone only verified the integrated state.
- Fixture-world end-to-end replay (SPEC-26 has no fixture-world integration surface; its cross-cutting verification is contract-consistency + grep-sweep, not pipeline replay).

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/validators && npm run build && npm run test` passes against the integrated tree, including `record_schema_compliance` SE-with/without-`resolution` round-trip and `contract-schema-roundtrip` coverage of `SE.resolution`.
2. The cross-skill sweep grep returns no matches for any drifted-vocabulary token across the seven story skills, the two shared templates, and `tools/validators/`.
3. Every new field in `story-state-contract.md` §4–§5 introduced by SPEC-26 (`SE.resolution`, `record_age`) has a corresponding schema/grammar surface, and no schema/grammar addition lacks a contract entry.

### Invariants

1. The story-state contract (`story-state-contract.md` §4–§5) and the `tools/validators` schemas/grammar are mutually consistent — no contract field without a schema mirror, no schema field without a contract entry.
2. No drifted schema-reference vocabulary survives anywhere in the seven story skills, the two shared templates, or `tools/validators/` after all SPEC-26 tickets land.

## Test Plan

### New/Modified Tests

1. None — verification-only capstone; the contract-consistency check is satisfied by the existing `contract-schema-roundtrip`, `record-schema-compliance-story-event`, and `rule_storylet_predicate_dsl_parsability` tests, and the cross-skill sweep is command-based.

### Commands

1. `cd tools/validators && npm run test`
2. `! rg -n 'controlled_by|relationship_change_without_basis|created_at_page.*non-null|STINT[^a-z]*status|SREL[^a-z]*status|SREL.*basis|basis.*SREL' .claude/skills/branching-story-bootstrap/ .claude/skills/branching-story-turn-cycle/ .claude/skills/branching-story-prose-attach/ .claude/skills/commitment-block-authoring/ .claude/skills/branching-story-health-audit/ .claude/skills/story-fact-promotion-to-canon/ .claude/skills/story-promotion-closeout/ .claude/skills/_shared-templates/ tools/validators/`
3. Commands 1 and 2 together are the full verification boundary: command 1 proves contract↔schema consistency through the validator's own test suite; command 2 proves the no-drift invariant by exhaustive grep. There is no narrower or wider surface — this capstone is exactly these two checks.

## Outcome

Completed as a verification-only capstone. The integrated SPEC-26 state is self-consistent across the shared story-state contract, validator schemas/grammar, and validator tests; no extra validator assertion was needed. The final cross-skill sweep found no stale SPEC-26 schema-reference vocabulary in the seven story-pipeline skills, shared templates, or validator package.

## Verification Result

1. `cd tools/validators && npm run test` — passed on rerun; `214` tests passed. This rebuilt `tools/validators/dist/` and exercised `contract-schema-roundtrip`, `record-schema-compliance-story-event`, and `rule_storylet_predicate_dsl_parsability`.
2. `node --test dist/tests/structural/contract-schema-roundtrip.test.js dist/tests/structural/record-schema-compliance-story-event.test.js dist/tests/rules/rule_storylet_predicate_dsl_parsability.test.js` from `tools/validators/` — passed; `19` focused tests passed, covering `SE.resolution`, route-specific SE schema behavior, and `record_age`.
3. `! rg -n 'controlled_by|relationship_change_without_basis|created_at_page.*non-null|STINT[^a-z]*status|SREL[^a-z]*status|SREL.*basis|basis.*SREL' .claude/skills/branching-story-bootstrap/ .claude/skills/branching-story-turn-cycle/ .claude/skills/branching-story-prose-attach/ .claude/skills/commitment-block-authoring/ .claude/skills/branching-story-health-audit/ .claude/skills/story-fact-promotion-to-canon/ .claude/skills/story-promotion-closeout/ .claude/skills/_shared-templates/ tools/validators/` — passed with zero stale operational hits.
4. Manual review: `tools/validators/tests/structural/contract-schema-roundtrip.test.ts` asserts `resolution` in the `story-event` properties list, while `record-schema-compliance-story-event.test.ts` asserts `SE` with/without `resolution` and route-specific result validity. That is the existing auto coverage anticipated by Assumption Reassessment item 4.

## Deviations

1. No `tools/validators/tests/structural/contract-schema-roundtrip.test.ts` edit was made because the existing test already asserts the `story-event` `resolution` schema property and the adjacent `record-schema-compliance-story-event` test already proves the route-specific `SE.resolution` behavior.
2. The first broad `npm run build && npm run test` attempt rebuilt successfully but reported failures in `dist/tests/cli/world-validate.story-bundle.test.js` and `dist/tests/cli/world-validate.test.js`. Both files passed immediately when isolated with `node --test`, and the subsequent full `npm run test` passed with `214` tests, so the initial failure was not treated as SPEC-26 capstone fallout.
3. `tools/validators/dist/` was refreshed as an ignored generated artifact by the package build/test proof. It is not a tracked source edit.
