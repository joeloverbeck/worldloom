# SPEC54CHAPIPTHI-004: Test-fixture / terminology fidelity

**Status**: PENDING
**Priority**: LOW
**Effort**: Small
**Engine Changes**: Yes — `tools/world-mcp` test fixtures + `tools/validators` CHAR fixture + `propose-new-characters` reference prose. No production code.
**Deps**: None

## Problem

Three test-fidelity / terminology defects, none changing runtime behavior: (1) the MCP NCB fixtures seed frontmatter with `proposal_ids` while the live `character-proposal-batch.schema.json` uses `card_ids`; (2) the CHAR schema fixture uses `source_basis: { generated_from: "NCP-12" }` while the canonical, structurally-checked key is `source_proposal_id`; (3) `propose-new-characters` Phase 15 prose names `institutional_embedding_checklist` and `repeated_forced_choice` as if they were frontmatter fields when they are body/acceptance-test concepts. SPEC-54 Phase 4.

## Assumption Reassessment (2026-05-20)

1. `tools/world-mcp/tests/tools/get-record-hybrid.test.ts` + `tools/world-mcp/tests/tools/list-records.test.ts` — confirmed the NCB fixture frontmatter uses `proposal_ids:` and the assertions read `result.frontmatter.proposal_ids`; the live `tools/validators/src/schemas/character-proposal-batch.schema.json` uses `card_ids`. `tools/validators/tests/schemas/character-frontmatter-schema-fixtures.test.ts` — confirmed the fixture uses `source_basis: { generated_from: "NCP-12" }`; the structural validator (`character-memorability-structure`) format-checks `source_basis.source_proposal_id`.
2. SPEC-54 Phase 4. `.claude/skills/propose-new-characters/references/phases-14-16-compose-validate-commit.md` — `institutional_embedding_checklist` and `repeated_forced_choice` appear as acceptance/body concepts, not frontmatter fields.
3. Cross-artifact boundary under audit: the NCB manifest schema field name (`card_ids`) is the contract MCP fixtures must mirror; the CHAR provenance canonical key (`source_proposal_id`) is the contract the structural validator checks. The CHAR `source_basis` schema is OPEN (`additionalProperties` unconstrained), so the fixture change is test-FIDELITY only — not a runtime behavior change.
4. FOUNDATIONS Rule 6 (No Silent Retcons) / auditability: fixtures that mirror the live schema's canonical field names keep the test surface honest against the contract; clarifying the marker prose prevents false byte-for-byte field expectations.

## Architecture Check

1. Aligning fixtures with live field names removes the divergence between what the tests exercise and what production schemas define; the prose clarification prevents readers from treating two body/acceptance concepts as required frontmatter fields. No mechanism change.
2. No backwards-compatibility aliasing/shims.

## Verification Layers

1. MCP NCB fixtures use `card_ids` and the tests pass -> schema validation / test grep-proof.
2. CHAR fixture uses `source_proposal_id` and the test passes -> schema validation.
3. Phase 15 prose marks both concepts as body/acceptance -> manual review / grep-proof.

## What to Change

### 1. MCP NCB fixtures

In `tools/world-mcp/tests/tools/get-record-hybrid.test.ts` and `tools/world-mcp/tests/tools/list-records.test.ts`, change the NCB fixture frontmatter field `proposal_ids:` to `card_ids:` and update the corresponding assertions (`result.frontmatter.proposal_ids` → `result.frontmatter.card_ids`).

### 2. CHAR fixture

In `tools/validators/tests/schemas/character-frontmatter-schema-fixtures.test.ts`, change `source_basis: { generated_from: "NCP-12" }` to `source_basis: { source_proposal_id: "NCP-12" }` (preserve any companion test that asserts `source_proposal_id` acceptance).

### 3. Phase 15 prose

In `.claude/skills/propose-new-characters/references/phases-14-16-compose-validate-commit.md`, mark `institutional_embedding_checklist` and `repeated_forced_choice` explicitly as body/acceptance-test concepts (not frontmatter fields), so the wording does not invite false byte-for-byte schema-field expectations.

## Files to Touch

- `tools/world-mcp/tests/tools/get-record-hybrid.test.ts` (modify)
- `tools/world-mcp/tests/tools/list-records.test.ts` (modify)
- `tools/validators/tests/schemas/character-frontmatter-schema-fixtures.test.ts` (modify)
- `.claude/skills/propose-new-characters/references/phases-14-16-compose-validate-commit.md` (modify)

## Out of Scope

- Any production schema change — the CHAR `source_basis` schema stays open; no field is added or removed.
- Behavior changes to `get_record`/`list_records`.

## Acceptance Criteria

### Tests That Must Pass

1. `npm test --prefix tools/world-mcp` passes with the `card_ids` NCB fixtures.
2. `npm test --prefix tools/validators` passes with the `source_proposal_id` CHAR fixture.
3. grep-proof: `phases-14-16-compose-validate-commit.md` marks `institutional_embedding_checklist` and `repeated_forced_choice` as body/acceptance concepts.

### Invariants

1. No production schema field is added or removed (test-fidelity + prose only).
2. The CHAR `source_basis` schema remains open (`additionalProperties` unconstrained) — the fixture change does not depend on tightening it.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/tools/get-record-hybrid.test.ts` + `tools/world-mcp/tests/tools/list-records.test.ts` — NCB fixtures use `card_ids`.
2. `tools/validators/tests/schemas/character-frontmatter-schema-fixtures.test.ts` — CHAR fixture uses `source_proposal_id`.

### Commands

1. `npm test --prefix tools/world-mcp`
2. `npm test --prefix tools/validators`
