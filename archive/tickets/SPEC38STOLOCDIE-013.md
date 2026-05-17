# SPEC38STOLOCDIE-013: Align CHAR pre-figurement routing with CF schema

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — updates Canon Fact schema, focused validator proof, and story-promotion prose
**Deps**: archive/tickets/SPEC38STOLOCDIE-008.md

## Problem

At intake, ticket 008 surfaced the DA-to-CF routing rule at the story-promotion authoring surface and found a live same-seam mismatch for character pre-figurement: `docs/FOUNDATIONS.md` line 365 and `.claude/skills/canon-addition/SKILL.md` said character pre-figurement belonged in `source_basis.derived_from`, but `tools/validators/src/schemas/canon-fact-record.schema.json` permitted only `CF-*` and `DA-*` there. This ticket makes `CHAR-*` lawful in `candidate.source_basis.derived_from[]` and removes the temporary story-promotion caveat while keeping `pre_figured_by[]` CF-only.

## Assumption Reassessment (2026-05-17)

1. Verified `docs/FOUNDATIONS.md` line 365 says diegetic-artifact or character pre-figurement belongs in `source_basis.derived_from` and keeps `pre_figured_by[]` CF-only.
2. Verified `.claude/skills/canon-addition/SKILL.md` Pre-flight Check tells operators that pre-figuring matches must cite originating `DA-<integer>` / `CHAR-<integer>` in the new CF's `source_basis.derived_from`.
3. At intake, `tools/validators/src/schemas/canon-fact-record.schema.json` patterned `source_basis.derived_from[]` as `^(CF|DA)-[0-9]+$`, so `CHAR-*` would be rejected by `record_schema_compliance`. The landed schema pattern is `^(CF|DA|CHAR)-[0-9]+$`.
4. Cross-artifact boundary: this ticket owns the contract alignment among FOUNDATIONS, canon-addition prose, story-promotion prose, Canon Fact JSON Schema, and validator tests. Reassessment chose the live contract path: make `CHAR-*` a valid `source_basis.derived_from[]` entry and remove the temporary story-promotion caveat.
5. FOUNDATIONS principle under audit: Rule 6 No Silent Retcons. Pre-figuring lineage must be preserved without widening `pre_figured_by[]` beyond CF-to-CF foreshadowing.
6. HARD-GATE / validation-signal surface: changing `canon-fact-record.schema.json` affects `record_schema_compliance` and proposal/canon validation. Read `docs/HARD-GATE-DISCIPLINE.md` before implementation and confirm the change strengthens or truths the gate rather than weakening it.
7. Live contract decision: `docs/FOUNDATIONS.md` and `.claude/skills/canon-addition/SKILL.md` already make `CHAR-*` lineage a current `source_basis.derived_from[]` contract, so this ticket lands schema support rather than narrowing authoritative prose. The temporary caveat in `.claude/skills/story-fact-promotion-to-canon/SKILL.md` is same-seam prose fallout and is included in the landed file set.

## Architecture Check

1. A schema/prose alignment ticket is cleaner than hiding the mismatch in ticket 008, because ticket 008's safe boundary was additive story-promotion guidance for DA routing only.
2. No backwards-compatibility aliases or shims: the schema's canonical pattern intentionally expands to include `CHAR-*` in `source_basis.derived_from[]`; `pre_figured_by[]` stays `^CF-[0-9]+$`.

## Verification Layers

1. Schema/prose contract alignment -> codebase grep-proof over `docs/FOUNDATIONS.md`, `.claude/skills/canon-addition/SKILL.md`, `.claude/skills/story-fact-promotion-to-canon/SKILL.md`, and `tools/validators/src/schemas/canon-fact-record.schema.json`.
2. Validator acceptance/rejection behavior -> `cd tools/validators && npm run build` plus focused and full validator tests that exercise `CHAR-*` in `source_basis.derived_from[]` while proving `pre_figured_by[]` remains CF-only.
3. HARD-GATE alignment -> manual review against `docs/HARD-GATE-DISCIPLINE.md` confirming `pre_figured_by[]` remains CF-only and no canon-write approval boundary is weakened.

## Landed Changes

### 1. Reassess the intended CHAR contract

Live `docs/FOUNDATIONS.md` and canon-addition prose make CHAR pre-figurement a lawful `source_basis.derived_from[]` entry now.

### 2. Align schema, tests, and prose

`tools/validators/src/schemas/canon-fact-record.schema.json` accepts `CHAR-*` in `source_basis.derived_from[]` while `pre_figured_by[]` remains CF-only. `tools/validators/tests/structural/record-schema-compliance.test.ts` proves both branches. `.claude/skills/story-fact-promotion-to-canon/SKILL.md` routes CHAR lineage through `source_basis.derived_from[]` without caveat.

## Files to Touch

- `tools/validators/src/schemas/canon-fact-record.schema.json` (modify)
- `tools/validators/tests/structural/record-schema-compliance.test.ts` (modify — focused schema behavior test)
- `.claude/skills/story-fact-promotion-to-canon/SKILL.md` (modify)

## Out of Scope

- Widening `pre_figured_by[]` beyond `CF-*`.
- Story-local DA authoring discipline outside this CHAR pre-figurement seam.
- World-content record edits.

## Acceptance Criteria

### Tests That Must Pass

1. The chosen CHAR pre-figurement contract is consistent across FOUNDATIONS, canon-addition, story-promotion, and the Canon Fact schema.
2. `pre_figured_by[]` remains CF-only.
3. Validator proof demonstrates the chosen schema behavior.
4. Ticket 008's temporary story-promotion caveat is removed.

### Invariants

1. Rule 6 lineage preservation is not weakened.
2. No skill instructs operators to author a CF candidate shape that `record_schema_compliance` rejects.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/record-schema-compliance.test.ts` — covers `source_basis.derived_from[]` with `CHAR-*` and rejects `CHAR-*` in `pre_figured_by[]`.

### Commands

1. `cd tools/validators && npm run build`
2. `cd tools/validators && npm test`
3. `rg -n 'CHAR-<integer>|source_basis\\.derived_from|pre_figured_by' docs/FOUNDATIONS.md .claude/skills/canon-addition/SKILL.md .claude/skills/story-fact-promotion-to-canon/SKILL.md tools/validators/src/schemas/canon-fact-record.schema.json`

## Outcome

Completed: 2026-05-17

The Canon Fact schema now accepts `CHAR-*` lineage in `source_basis.derived_from[]` by widening only that field's pattern to `^(CF|DA|CHAR)-[0-9]+$`. The focused `record_schema_compliance` test proves a CF with `source_basis.derived_from: ["CHAR-1"]` is accepted and a CF with `pre_figured_by: ["CHAR-1"]` is rejected. Story-promotion prose now instructs operators to route CHAR pre-figurement through `candidate.source_basis.derived_from[]` and no longer preserves the temporary schema-support caveat.

## Verification Result

1. `cd tools/validators && npm run build` — passed.
2. `cd tools/validators && node --test dist/tests/structural/record-schema-compliance.test.js` — passed, including the new CHAR pre-figurement subtest.
3. `cd tools/validators && npm test` — passed: 343 tests, 343 pass.
4. `rg -n 'CHAR-<integer>|CHAR-\*|source_basis\.derived_from|pre_figured_by' docs/FOUNDATIONS.md .claude/skills/canon-addition/SKILL.md .claude/skills/story-fact-promotion-to-canon/SKILL.md tools/validators/src/schemas/canon-fact-record.schema.json archive/tickets/SPEC38STOLOCDIE-013.md` — reviewed same-seam hits; live contract surfaces align and `pre_figured_by[]` remains CF-only.
5. Manual HARD-GATE alignment review against `docs/HARD-GATE-DISCIPLINE.md` — this change strengthens/truths `record_schema_compliance` for the already-authored Rule 6 lineage contract and does not weaken canon-write approval, Mystery Reserve, or patch-plan gates.

## Deviations

- The ticket chose schema support now rather than narrowing authoritative prose. No changes were needed in `docs/FOUNDATIONS.md` or `.claude/skills/canon-addition/SKILL.md` because both already stated the intended CHAR lineage contract.
