# SPEC38STOLOCDIE-013: Align CHAR pre-figurement routing with CF schema

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — updates Canon Fact schema/validator fixtures or truths canon-promotion prose if schema support is intentionally deferred
**Deps**: archive/tickets/SPEC38STOLOCDIE-008.md

## Problem

Ticket 008 surfaced the DA-to-CF routing rule at the story-promotion authoring surface and found a live same-seam mismatch for character pre-figurement: `docs/FOUNDATIONS.md` line 365 and `.claude/skills/canon-addition/SKILL.md` say character pre-figurement belongs in `source_basis.derived_from`, but `tools/validators/src/schemas/canon-fact-record.schema.json` currently permits only `CF-*` and `DA-*` there. Operators cannot safely be told to put `CHAR-*` in `candidate.source_basis.derived_from[]` until the schema and proof fixtures accept that shape, or the authoritative prose is narrowed.

## Assumption Reassessment (2026-05-17)

1. Verified `docs/FOUNDATIONS.md` line 365 says diegetic-artifact or character pre-figurement belongs in `source_basis.derived_from` and keeps `pre_figured_by[]` CF-only.
2. Verified `.claude/skills/canon-addition/SKILL.md` Pre-flight Check tells operators that pre-figuring matches must cite originating `DA-<integer>` / `CHAR-<integer>` in the new CF's `source_basis.derived_from`.
3. Verified `tools/validators/src/schemas/canon-fact-record.schema.json` currently patterns `source_basis.derived_from[]` as `^(CF|DA)-[0-9]+$`, so `CHAR-*` would be rejected by `record_schema_compliance`.
4. Cross-artifact boundary: this ticket owns the contract alignment among FOUNDATIONS, canon-addition prose, story-promotion prose, Canon Fact JSON Schema, and validator tests. It should either make `CHAR-*` a valid `source_basis.derived_from[]` entry or explicitly narrow the prose contract away from CHAR with a dated rationale.
5. FOUNDATIONS principle under audit: Rule 6 No Silent Retcons. Pre-figuring lineage must be preserved without widening `pre_figured_by[]` beyond CF-to-CF foreshadowing.
6. HARD-GATE / validation-signal surface: changing `canon-fact-record.schema.json` affects `record_schema_compliance` and proposal/canon validation. Read `docs/HARD-GATE-DISCIPLINE.md` before implementation and confirm the change strengthens or truths the gate rather than weakening it.

## Architecture Check

1. A schema/prose alignment ticket is cleaner than hiding the mismatch in ticket 008, because ticket 008's safe boundary was additive story-promotion guidance for DA routing only.
2. No backwards-compatibility aliases or shims: either the schema's canonical pattern expands intentionally to include `CHAR-*`, or the current prose is corrected to the narrower live schema.

## Verification Layers

1. Schema/prose contract alignment -> codebase grep-proof over `docs/FOUNDATIONS.md`, `.claude/skills/canon-addition/SKILL.md`, `.claude/skills/story-fact-promotion-to-canon/SKILL.md`, and `tools/validators/src/schemas/canon-fact-record.schema.json`.
2. Validator acceptance/rejection behavior -> `cd tools/validators && npm run build` plus focused or full validator tests that exercise `CHAR-*` in `source_basis.derived_from[]`, depending on the chosen alignment.
3. HARD-GATE alignment -> manual review against `docs/HARD-GATE-DISCIPLINE.md` confirming `pre_figured_by[]` remains CF-only and no canon-write approval boundary is weakened.

## What to Change

### 1. Reassess the intended CHAR contract

Decide from live `docs/FOUNDATIONS.md`, canon-addition prose, and validator schema whether CHAR pre-figurement is intended to be a lawful `source_basis.derived_from[]` entry now.

### 2. Align schema, tests, and prose

If CHAR support is intended now, update `tools/validators/src/schemas/canon-fact-record.schema.json` and validator fixtures/tests so `source_basis.derived_from[]` accepts `CHAR-*` while `pre_figured_by[]` remains CF-only. Then update story-promotion prose to route CHAR lineage through `source_basis.derived_from[]` without caveat.

If CHAR support is intentionally deferred, update FOUNDATIONS/canon-addition/story-promotion prose to say CHAR lineage remains proposal evidence until schema support lands, and create or name the schema-extension owner.

## Files to Touch

- `tools/validators/src/schemas/canon-fact-record.schema.json` (modify if CHAR support lands)
- `tools/validators/tests/**` (modify/add focused schema behavior test if CHAR support lands)
- `.claude/skills/story-fact-promotion-to-canon/SKILL.md` (modify)
- `.claude/skills/canon-addition/SKILL.md` (modify if prose is narrowed or clarified)
- `docs/FOUNDATIONS.md` (modify only if the authoritative contract is intentionally narrowed)

## Out of Scope

- Widening `pre_figured_by[]` beyond `CF-*`.
- Story-local DA authoring discipline outside this CHAR pre-figurement seam.
- World-content record edits.

## Acceptance Criteria

### Tests That Must Pass

1. The chosen CHAR pre-figurement contract is consistent across FOUNDATIONS, canon-addition, story-promotion, and the Canon Fact schema.
2. `pre_figured_by[]` remains CF-only.
3. Validator proof demonstrates the chosen schema behavior.
4. Ticket 008's temporary story-promotion caveat is removed or preserved only if the contract remains intentionally deferred.

### Invariants

1. Rule 6 lineage preservation is not weakened.
2. No skill instructs operators to author a CF candidate shape that `record_schema_compliance` rejects.

## Test Plan

### New/Modified Tests

1. Validator schema/fixture test covering `source_basis.derived_from[]` with `CHAR-*`, if schema support lands.

### Commands

1. `cd tools/validators && npm run build`
2. `cd tools/validators && npm test`
3. `rg -n 'CHAR-<integer>|source_basis\\.derived_from|pre_figured_by' docs/FOUNDATIONS.md .claude/skills/canon-addition/SKILL.md .claude/skills/story-fact-promotion-to-canon/SKILL.md tools/validators/src/schemas/canon-fact-record.schema.json`
