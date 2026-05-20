# SPEC55CHAPIPFOU-003: Schema/template drift docs + regression tests

**Status**: PENDING
**Priority**: LOW
**Effort**: Small
**Engine Changes**: Yes — `tools/validators` (schema `description` annotations + schema fixture tests) + `propose-new-characters` template comment
**Deps**: None

## Problem

`occupancy_strength`, `score_aggregate`, and `source_basis.batch_id` appear in the batch NCP template but are not required by `character-proposal-card.schema.json` (`source_basis` is `additionalProperties: true`, so `batch_id` inside it is unvalidated). SPEC-55 Phase 3 (audit Medium #6) resolves the drift by recording these fields' **advisory** status — they must NOT be promoted to required, because the upgraded/user-seed template legitimately omits `source_basis.batch_id` and forcing the others would reject otherwise-valid cards for no canon-safety gain. Two cheap regression tests are also missing: stale-`proposal_ids` NCB rejection (already structurally guaranteed) and `user_seed` no-`batch_id` NCP acceptance.

## Assumption Reassessment (2026-05-20)

1. Codebase: `tools/validators/src/schemas/character-proposal-card.schema.json` — top-level `required` does not include `occupancy_strength` or `score_aggregate`; `source_basis` is `{ "type": "object", "additionalProperties": true }`, so `source_basis.batch_id` is unvalidated; `batch_id` is conditionally required only for `origin_kind: batch_generated` (or absent `upgrade_lineage`). `tools/validators/src/schemas/character-proposal-batch.schema.json` — `additionalProperties: false` + `required` includes `card_ids` (no `minItems`), and `proposal_ids` appears nowhere; so an NCB carrying `proposal_ids` and omitting `card_ids` already fails on two grounds. The regression tests pin behavior that the schemas already enforce; no schema-validation behavior changes.
2. Spec: SPEC-55 §Phase 3 names the advisory-status documentation and the two regression tests; §Out of Scope rejects promoting any field to required and rejects `card_ids.minItems: 1`.
3. Cross-skill boundary under audit: the NCP schema (`tools/validators`) ↔ proposal-card template (`propose-new-characters`) authoring surface — the advisory note must be consistent across the schema `description` and the template so a future audit does not re-flag the drift. No record-field set changes; the note is annotation only.

## Architecture Check

1. Documenting advisory status via schema `description` fields (and/or a template comment) is cleaner than promoting the fields to required: it closes the audit's "decide" question without breaking the upgraded/user-seed cards that legitimately omit `source_basis.batch_id`. Pinning the already-guaranteed NCB and `user_seed` behaviors with regression tests is cheaper than leaving them implicit and re-discoverable by a fifth audit.
2. No backwards-compatibility shim and no data-contract change: `description` is a JSON-Schema annotation, the template edit is a comment, and the tests assert existing behavior — no field is added, removed, or made required.

## Verification Layers

1. Advisory status documented → grep-proof for the advisory note in `character-proposal-card.schema.json` and the template.
2. Stale-`proposal_ids` NCB rejected → `character-proposal-schema-fixtures.test.ts` assertion (NCB fixture with `proposal_ids` and no `card_ids` fails validation).
3. `user_seed` NCP without `batch_id` accepted → `character-proposal-schema-fixtures.test.ts` assertion (well-formed `origin_kind: user_seed` card with no `batch_id` passes).
4. No field promoted to required → manual review of the schema diff confirming `required` arrays are unchanged.

## What to Change

### 1. Document advisory status

Add `description` annotations to `occupancy_strength`, `score_aggregate`, and the `source_basis` object (noting `batch_id` advisory status) in `character-proposal-card.schema.json`, marking them "authored guidance fields, not schema-required." Mirror with a one-line comment in the `propose-new-characters` proposal-card template where those fields appear.

### 2. Add regression tests

In `character-proposal-schema-fixtures.test.ts`: (a) an NCB fixture with `proposal_ids` (and no `card_ids`) must fail schema validation; (b) a well-formed `origin_kind: user_seed` NCP fixture with no `batch_id` must pass schema validation.

## Files to Touch

- `tools/validators/src/schemas/character-proposal-card.schema.json` (modify — `description` annotations only; no `required` change)
- `.claude/skills/propose-new-characters/templates/proposal-card.md` (modify — one-line advisory comment)
- `tools/validators/tests/schemas/character-proposal-schema-fixtures.test.ts` (modify — add the two regression tests)

## Out of Scope

- Promoting `occupancy_strength`, `score_aggregate`, or `source_basis.batch_id` to schema-required (rejected in SPEC-55 §Out of Scope — would reject valid upgraded/user-seed cards).
- `card_ids.minItems: 1` (rejected — an all-dropped batch can have empty `card_ids`).
- Any NCP body-section validation or anti-flattening work (rejected in SPEC-55 §Out of Scope).
- The completed MCP field-tool error work (`archive/tickets/SPEC55CHAPIPFOU-001.md`) and the story-seed guard (SPEC55CHAPIPFOU-002).

## Acceptance Criteria

### Tests That Must Pass

1. An NCB fixture with `proposal_ids` instead of `card_ids` fails schema validation (asserted).
2. A `user_seed` NCP fixture without `batch_id` and with all required upgraded frontmatter passes schema validation (asserted).
3. `npm test --prefix tools/validators` passes.

### Invariants

1. No field is promoted to schema-required — every `required` array in both proposal schemas is unchanged; existing valid cards keep validating.
2. The advisory note is consistent between the schema `description` and the template comment.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/schemas/character-proposal-schema-fixtures.test.ts` — add the stale-`proposal_ids` NCB rejection test and the `user_seed` no-`batch_id` acceptance test.

### Commands

1. `npm test --prefix tools/validators`
2. `npm run build --prefix tools/validators` (typecheck — the build script runs `tsc`)
3. `grep -n "advisory\|not schema-required\|authored guidance" tools/validators/src/schemas/character-proposal-card.schema.json` to confirm the advisory note landed.
