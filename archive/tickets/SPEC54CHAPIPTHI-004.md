# SPEC54CHAPIPTHI-004: Test-fixture / terminology fidelity

**Status**: COMPLETED
**Priority**: LOW
**Effort**: Small
**Engine Changes**: Yes — `tools/world-mcp` test fixtures + `tools/validators` CHAR fixture + `propose-new-characters` reference prose. No production code.
**Deps**: None

## Problem

At intake, three test-fidelity / terminology defects existed, none changing runtime behavior: (1) the MCP NCB fixtures seeded frontmatter with `proposal_ids` while the live `character-proposal-batch.schema.json` uses `card_ids`; (2) the CHAR schema fixture used `source_basis: { generated_from: "NCP-12" }` while the canonical, structurally-checked key is `source_proposal_id`; (3) `propose-new-characters` Phase 15 prose named `institutional_embedding_checklist` and `repeated_forced_choice` as if they were frontmatter fields when they are body/acceptance-test concepts. SPEC-54 Phase 4.

## Assumption Reassessment (2026-05-20)

1. At intake, `tools/world-mcp/tests/tools/get-record-hybrid.test.ts` + `tools/world-mcp/tests/tools/list-records.test.ts` used NCB fixture frontmatter `proposal_ids:` and `result.frontmatter.proposal_ids`; the live `tools/validators/src/schemas/character-proposal-batch.schema.json` uses `card_ids`. `tools/validators/tests/schemas/character-frontmatter-schema-fixtures.test.ts` used `source_basis: { generated_from: "NCP-12" }`; the structural validator (`character-memorability-structure`) format-checks `source_basis.source_proposal_id`.
2. SPEC-54 Phase 4. `.claude/skills/propose-new-characters/references/phases-14-16-compose-validate-commit.md` — `institutional_embedding_checklist` and `repeated_forced_choice` are acceptance/body concepts, not frontmatter fields.
3. Cross-artifact boundary under audit: the NCB manifest schema field name (`card_ids`) is the contract MCP fixtures must mirror; the CHAR provenance canonical key (`source_proposal_id`) is the contract the structural validator checks. The CHAR `source_basis` schema is OPEN (`additionalProperties` unconstrained), so the fixture change is test-FIDELITY only — not a runtime behavior change.
4. FOUNDATIONS Rule 6 (No Silent Retcons) / auditability: fixtures that mirror the live schema's canonical field names keep the test surface honest against the contract; clarifying the marker prose prevents false byte-for-byte field expectations.

## Architecture Check

1. Aligning fixtures with live field names removes the divergence between what the tests exercise and what production schemas define; the prose clarification prevents readers from treating two body/acceptance concepts as required frontmatter fields. No mechanism change.
2. No backwards-compatibility aliasing/shims.

## Verification Layers

1. MCP NCB fixtures use `card_ids` and the tests pass -> schema validation / test grep-proof.
2. CHAR fixture uses `source_proposal_id` and the test passes -> schema validation.
3. Phase 15 prose marks both concepts as body/acceptance -> manual review / grep-proof.

## Landed Changes

### 1. MCP NCB fixtures

In `tools/world-mcp/tests/tools/get-record-hybrid.test.ts` and `tools/world-mcp/tests/tools/list-records.test.ts`, the NCB fixture frontmatter field now uses `card_ids:`. `get-record-hybrid.test.ts` now asserts `result.frontmatter.card_ids`.

### 2. CHAR fixture

In `tools/validators/tests/schemas/character-frontmatter-schema-fixtures.test.ts`, the default valid CHAR fixture now uses `source_basis: { source_proposal_id: "NCP-12" }`. The companion `source_proposal_id` acceptance test remains in place.

### 3. Phase 15 prose

In `.claude/skills/propose-new-characters/references/phases-14-16-compose-validate-commit.md`, `institutional_embedding_checklist` and `repeated_forced_choice` are explicitly marked as body / acceptance-test review concepts, not NCP frontmatter fields.

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

1. `cd tools/world-mcp && npm test` passes with the `card_ids` NCB fixtures.
2. `cd tools/validators && npm test` passes with the `source_proposal_id` CHAR fixture.
3. grep-proof: `phases-14-16-compose-validate-commit.md` marks `institutional_embedding_checklist` and `repeated_forced_choice` as body/acceptance concepts.

### Invariants

1. No production schema field is added or removed (test-fidelity + prose only).
2. The CHAR `source_basis` schema remains open (`additionalProperties` unconstrained) — the fixture change does not depend on tightening it.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/tools/get-record-hybrid.test.ts` + `tools/world-mcp/tests/tools/list-records.test.ts` — NCB fixtures use `card_ids`.
2. `tools/validators/tests/schemas/character-frontmatter-schema-fixtures.test.ts` — CHAR fixture uses `source_proposal_id`.

### Commands

1. `cd tools/world-mcp && npm test`
2. `cd tools/validators && npm test`

## Outcome

Completed: 2026-05-20

The SPEC-54 Phase 4 fidelity cleanup landed without production behavior changes. MCP NCB fixtures now use the schema-backed `card_ids` field, the CHAR schema fixture now uses the canonical `source_basis.source_proposal_id` key, and `propose-new-characters` Phase 15 now labels `institutional_embedding_checklist` and `repeated_forced_choice` as body / acceptance-test review concepts rather than frontmatter fields.

## Verification Result

- `cd tools/world-mcp && npm test` — PASS; rebuilt `tools/world-mcp/dist/` and reported 418 passing checks.
- `cd tools/validators && npm test` — PASS; rebuilt `tools/validators/dist/` and reported 741 passing checks.
- `rg -n "proposal_ids|frontmatter\\.proposal_ids|source_basis: \\{ generated_from|institutional_embedding_checklist|repeated_forced_choice" tools/world-mcp/tests/tools/get-record-hybrid.test.ts tools/world-mcp/tests/tools/list-records.test.ts tools/validators/tests/schemas/character-frontmatter-schema-fixtures.test.ts .claude/skills/propose-new-characters/references/phases-14-16-compose-validate-commit.md` — PASS by manual classification: no stale `proposal_ids`, `frontmatter.proposal_ids`, or `generated_from` hits remained in the touched fixtures; the two Phase 15 concept hits remain intentionally, each explicitly labelled as not an NCP frontmatter field.

## Deviations

- The accepted proof commands were run from each package root as `npm test`, which executes the same package scripts as the drafted root-level `npm test --prefix ...` commands while avoiding ambient `process.cwd()` ambiguity.
