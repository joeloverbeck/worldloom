# SPEC11CANENT-004: Update fixture-world command proof to the registry-first canonical entity contract

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `tools/world-index` fixture-world command proof is updated to match the post-SPEC-11 canonical entity authority contract.
**Deps**: `specs/SPEC-11-canonical-entity-authority-surfaces.md`, `archive/tickets/SPEC11CANENT-002.md`, `archive/tickets/SPEC11CANENT-003.md`, `docs/FOUNDATIONS.md`

## Problem

`tools/world-index/tests/commands.test.ts` still assumes the fixture world exposes a canonical `entity:brinewick` row through the old ontology bullet authority path. After the SPEC-11 registry-first shift, that assumption is stale, so `npm test` now fails even though the owned SPEC11CANENT-003 alias path is correct.

## Assumption Reassessment (2026-04-23)

1. `tools/world-index/tests/commands.test.ts` currently queries `nodes` for `node_id = 'entity:brinewick'` and inspects that same entity id directly, but the fixture-world source copied by `tools/world-index/tests/fixtures/fixture-world/` does not declare a SPEC-11 `## Named Entity Registry` block.
2. `archive/tickets/SPEC11CANENT-002.md` truthfully records the landed contract change: legacy ontology bullets no longer create canonical entities, and explicit fenced-YAML registry declarations are now the world-level authority surface.
3. Shared boundary under audit: the fixture-world command proof in `tools/world-index/tests/commands.test.ts`, the fixture-world source files under `tools/world-index/tests/fixtures/fixture-world/`, and the canonical entity contract exercised by `build`, `inspect`, `stats`, `sync`, and `verify`.
4. `docs/FOUNDATIONS.md` `Core Principle`, `Ontology Categories`, and `Tooling Recommendation` support explicit structured authority surfaces rather than incidental prose/bullet promotion.
5. Reassessment of `tools/world-index/tests/commands.test.ts` shows the direct `entity:brinewick` assertions are still truthful under SPEC-11 because registry-backed entities keep the same canonical slug/id shape; the stale part is the fixture source, not the test logic.
6. Mismatch + correction: the minimal truthful fix is to declare `Brinewick` in the fixture `ONTOLOGY.md` registry and keep the existing command assertions as the proof surface for registry-backed canonical entity inspection.

## Architecture Check

1. Updating the fixture-world proof to use an explicit authority declaration is cleaner than weakening SPEC-11 or preserving a stale command-test assumption about legacy bullets.
2. No backwards-compatibility aliasing/shims introduced.

## Verification Layers

1. Fixture-world command proof matches the post-SPEC-11 canonical entity authority contract. -> targeted command test
2. Fixture-world still proves build/inspect/stats/sync/verify end to end without relying on removed legacy authority paths. -> targeted command test
3. FOUNDATIONS alignment remains explicit and structured. -> manual review
4. Additional verification layers are not applicable because this ticket is confined to the fixture command-proof seam.

## What to Change

### 1. Reassess the fixture authority source

Make fixture-world declare `Brinewick` through the live `## Named Entity Registry` fenced-YAML authority surface so the existing command proof exercises the registry-first contract.

### 2. Update the command proof

Keep `tools/world-index/tests/commands.test.ts` as the registry-backed proof surface if reassessment confirms its assertions already match the post-SPEC-11 entity id contract; only patch fixture-world source files that still rely on removed ontology bullet scraping.

## Files to Touch

- `tools/world-index/tests/fixtures/fixture-world/ONTOLOGY.md` (modify)
- `tickets/SPEC11CANENT-004.md` (modify)

## Out of Scope

- Reopening SPEC-11 registry or whole-file alias implementation
- New canonical entity heuristics
- Broader fixture-world cleanup unrelated to the command proof failure

## Acceptance Criteria

### Tests That Must Pass

1. `tools/world-index/tests/commands.test.ts` no longer fails because of the stale `entity:brinewick` assumption.
2. The fixture-world command lane proves canonical entity behavior through an explicit post-SPEC-11 authority source.
3. `cd tools/world-index && npm run build`
4. `cd tools/world-index && node --test dist/tests/commands.test.js`

### Invariants

1. Command proof must match the live registry-first canonical entity contract.
2. No legacy ontology bullet promotion path is reintroduced.

## Test Plan

### New/Modified Tests

1. `tools/world-index/tests/fixtures/fixture-world/ONTOLOGY.md` — declare the fixture canonical entity through the live registry surface used by `commands.test.ts`.

### Commands

1. `cd tools/world-index && npm run build`
2. `cd tools/world-index && node --test dist/tests/commands.test.js`
3. `cd tools/world-index && npm test` — rerun only after the focused command lane is green to confirm the package-level suite is restored truthfully.

## Outcome

- Completed: 2026-04-23
- `tools/world-index/tests/fixtures/fixture-world/ONTOLOGY.md` now declares `Brinewick` in the live `## Named Entity Registry` fenced-YAML block, so the fixture exposes a canonical world entity through the SPEC-11 registry-first authority path.
- `tools/world-index/tests/commands.test.ts` did not require code changes after reassessment; its existing `entity:brinewick` assertions remain truthful once the fixture authority source is explicit.
- The ticket boundary was narrowed to fixture proof alignment, not parser or command implementation changes.

## Verification Result

- Passed `cd tools/world-index && npm run build`
- Passed `cd tools/world-index && node --test dist/tests/commands.test.js`
- Passed `cd tools/world-index && npm test`

## Deviations

- Reassessment showed the drafted `commands.test.ts` edit was unnecessary because registry-backed entities preserve the same canonical slug/id shape. The landed fix is fixture-world source alignment only.
