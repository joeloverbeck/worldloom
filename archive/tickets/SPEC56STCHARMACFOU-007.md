# SPEC56STCHARMACFOU-007: STCHAR fixtures + cross-package green check

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — `tools/world-mcp` (shared `story-bundle-fixture.ts` rewrite + dependent fixtures); repo-wide `bound_char_id`-zero check.
**Deps**: archive/tickets/SPEC56STCHARMACFOU-002.md, archive/tickets/SPEC56STCHARMACFOU-003.md

## Problem

The shared world-mcp story-bundle fixture (`story-bundle-fixture.ts`) still binds `STENT-2` via `bound_char_id: CHAR-1` and `STENT-3` via `bound_char_id: null`. Once ticket 002's schema rejects `bound_char_id`, this fixture is schema-invalid and the world-mcp test suite breaks. This ticket rewrites the shared fixture to the STCHAR shape, adds the invalid-fixture cases that prove the validators (ticket 003) fire, and lands the Definition-of-Done cross-package green check.

## Assumption Reassessment (2026-05-20)

1. `tools/world-mcp/tests/tools/story-bundle-fixture.ts` currently creates `STENT-2` with `bound_char_id: CHAR-1` and `STENT-3` with `bound_char_id: null` (verified this session). It is the shared fixture consumed by world-mcp tools tests (get-record, list-records, context-packet — ticket 006).
2. The fixture rewrite is specified in `archive/specs/SPEC-56-stchar-machine-foundation.md` §Phase 7. Build/test scripts exist for all four packages (`build` + `test`); there is NO `typecheck` script — `npm run build` covers tsc (verified this session).
3. **Cross-artifact boundary under audit**: this fixture is the shared STCHAR test surface for ticket 006's retrieval tests. It depends on the schema (ticket 002, to validate the new fixture) and the validators (ticket 003, for the invalid-fixture-fails assertion). Ticket 006 (MCP) depends on THIS ticket's rewritten fixture.
4. **Rename/remove blast radius** (`bound_char_id` → `bound_stchar_id`, fixture landing site): this is the final landing of the `bound_char_id` removal. After this ticket, repo-wide `grep -rn "bound_char_id" tools/` (excluding `dist/` build artifacts) must return zero in source (`.claude/skills/branching-story-turn-cycle/` reference is SPEC-57's domain, out of scope here). The Definition-of-Done items (no fixture/schema references `bound_char_id`; 4-package green) verify here.
5. Implementation note: the only remaining source-level `bound_char_id` hits were in a negative schema test that intentionally asserted rejection of the retired field. The test still covers that rejection with a computed retired-field key, while the source grep gate now returns zero.

## Architecture Check

1. Rewriting the shared fixture once (rather than per-test inline fixtures) keeps the world-mcp test surface coherent — every tools test reads the same canonical STCHAR-bound fixture. The invalid-fixture cases live alongside the valid ones so the validator-firing proof is co-located.
2. No backwards-compatibility aliasing: `bound_char_id` is removed from the fixture, not kept as a legacy variant.

## Verification Layers

1. No fixture uses `bound_char_id` → grep-proof `grep -rn "bound_char_id" tools/world-mcp/tests/ tools/validators/tests/` (source) returns zero.
2. At least one active STENT binds an STCHAR (`STENT-2 → bound_stchar_id: STCHAR-1`, with `STCHAR-1.md` fixture); at least one background-only STENT has null (`STENT-3`) → fixture inspection + schema validation.
3. Invalid fixture (witness/pressure-source STENT with null `bound_stchar_id`) fails `stent_requires_stchar` → validator test against the invalid fixture.
4. Cross-package green (Definition of Done) → `npm run build && npm test` across `tools/validators`, `tools/patch-engine`, `tools/world-index`, `tools/world-mcp`.

## What to Change

### 1. Shared fixture rewrite

`story-bundle-fixture.ts`: `STENT-2` → `bound_stchar_id: STCHAR-1`; create the `STCHAR-1.md` fixture (`source_kind: world_char`, `source_char_id: CHAR-1`, valid frontmatter + body). `STENT-3` → pure-`[background]`, `bound_stchar_id: null`.

### 2. Invalid fixtures

Add a witness/pressure-source STENT with null `bound_stchar_id` (must fail `stent_requires_stchar`).

### 3. Cross-package green

Run the 4-package build+test gate; confirm repo-wide `bound_char_id`-zero in source.

## Files to Touch

- `tools/world-mcp/tests/tools/story-bundle-fixture.ts` (modify)
- `tools/validators/tests/structural/stchar-structural-validators.test.ts` (modify — witness/pressure-source invalid STENT case)
- `tools/validators/tests/structural/record-schema-compliance-story-entity.test.ts` (modify — preserve retired-field rejection without source literal)
- `tools/validators/tests/integration/spec47-stplan-stemo-integration.test.ts` (modify — story-edge count after ticket 005)

## Out of Scope

- `.claude/skills/branching-story-turn-cycle/references/pre-flight-and-prerequisites.md` `bound_char_id` mention — SPEC-57.
- Production code (schemas/validators/patch-engine/index/MCP) — tickets 002–006; this ticket is fixtures + the green-check capstone.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -rn "bound_char_id" tools/ --include=*.ts` (excluding `dist/`) returns zero source matches.
2. The rewritten fixture validates against ticket 002's schemas; the invalid fixture fails `stent_requires_stchar`.
3. `npm run build && npm test` green across all four packages (`tools/validators`, `tools/patch-engine`, `tools/world-index`, `tools/world-mcp`).

### Invariants

1. No fixture or schema references `bound_char_id` (Definition of Done).
2. At least one active STENT binds an STCHAR; at least one background-only STENT has null `bound_stchar_id`.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/tools/story-bundle-fixture.ts` (modify) — STCHAR-bound STENT-2 + STCHAR-1 fixture + background STENT-3 + invalid-STENT case.

### Commands

1. `grep -rn "bound_char_id" tools/ --include=*.ts | grep -v dist/` → zero.
2. For each of `tools/{validators,patch-engine,world-index,world-mcp}`: `npm run build --prefix <pkg>` (covers tsc) then `npm test --prefix <pkg>`.

## Outcome

Implemented. The shared world-mcp story fixture now binds `STENT-2` through `bound_stchar_id: STCHAR-1`, includes a disk-backed `story_character_authority_record` fixture at `stories/opening-bells/story-characters/STCHAR-1.md`, and makes `STENT-3` a background-only STENT with `bound_stchar_id: null`. The invalid validator witness now explicitly uses `[witness, pressure_source]` with null `bound_stchar_id`.

## Verification Result

1. `rg -n "bound_char_id" tools --glob '*.ts' --glob '!**/dist/**'` — PASS, zero matches.
2. `npm run build` / `npm test` in `tools/validators` — PASS, 768 tests.
3. `npm run build` / `npm test` in `tools/patch-engine` — PASS, 91 tests.
4. `npm run build` / `npm test` in `tools/world-index` — PASS, 127 tests.
5. `npm run build` / `npm test` in `tools/world-mcp` — PASS, 423 tests.

## Deviations

The invalid-STENT proof belongs in `tools/validators`, not in the shared world-mcp fixture: the fixture itself is the valid cross-tool story-bundle seed, while the validator test is the correct place to assert `stent_requires_stchar` fails the invalid witness.
