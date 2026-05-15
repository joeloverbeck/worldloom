# SPEC28STOCONHAR-003: Add BEL.basis access routes for the §6b observer firewall

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `.claude/skills/_shared-templates/story-state-contract.md` §4.1 BEL schema + §5b "not retained" note rewrite; `tools/validators/src/schemas/story-belief.schema.json`; `tools/validators/tests/structural/contract-schema-roundtrip.test.ts`; `tools/validators/tests/structural/record-schema-compliance-bel.test.ts`; `tools/world-mcp/tests/tools/validate-patch-plan.test.ts`; `branching-story-turn-cycle` (BEL authoring records the access route); `branching-story-health-audit` Phase 2d (reads recorded access route); `specs/SPEC-28-story-contract-hardening.md` D3 status note.
**Deps**: archive/tickets/SPEC28STOCONHAR-002.md

## Problem

At intake, SPEC-27 D7 had added the FOUNDATIONS §Story Bundles §6b observer firewall gating move/choice generation against the acting entity's `BEL` state, but `BEL.basis` recorded only `source_event`; `.claude/skills/_shared-templates/story-state-contract.md` explicitly stated that provenance refinements ("witnessed_page", "told_by", "inferred_from") "are not retained at this layer." So `branching-story-health-audit` Phase 2d had to re-derive each belief's access route from prose / plans / notes rather than read a recorded field — the just-shipped §6b firewall was not auditable post-hoc. SPEC-28 D3.

## Assumption Reassessment (2026-05-15)

1. At reassessment before implementation, `.claude/skills/_shared-templates/story-state-contract.md` §4.1 had only `source_event: SE-<integer>` in the `BEL.basis` sub-structure — confirming SPEC-28's brainstorm verification. The adjacent note explicitly disposed of the access-route refinement as "not retained at this layer." `branching-story-health-audit/SKILL.md` Phase 2d reported `observer_firewall_violation` findings (SPEC-27 D7) but had no recorded access route to read.
2. Verified against `docs/FOUNDATIONS.md` §Story Bundles §6b: the observer-firewall clause enumerates access routes — "direct observation, testimony, document, inference, surveillance, institutional channel, magic/tech, or another canonically valid mechanism." The `access_route` enum SPEC-28 D3 prescribes (`direct_observation | testimony | document | object_trace | location_trace | inference | surveillance | institutional_channel | magic_tech | rumor | authorial_initialization`) is the §6b enumeration plus a few extensions consistent with "another canonically valid mechanism." SPEC-27 D7 landed `observer_firewall_violation` as the Phase 2d finding name.
3. Cross-artifact shared boundary: the `BEL` record schema, defined in `story-state-contract.md` §4.1 AND enforced by `tools/validators/src/schemas/story-belief.schema.json` — verified at decomposition to be `additionalProperties: false` at top-level and on the `basis` object, with `required: ["source_event"]` on `basis` before this ticket landed. SCAUD-003 kept the contract and JSON schema in lockstep; `tools/validators/tests/structural/contract-schema-roundtrip.test.ts` covers `story-belief` and fails if they diverge. `tools/world-index` registers `BEL` as a generic id-keyed atomic record (no field-level parsing) — no world-index change needed. `branching-story-turn-cycle` produces `BEL` records (the firewall check it already performs at move generation is now retained as state); `branching-story-health-audit` Phase 2d consumes them. **Sibling boundary with SPEC28STOCONHAR-002**: D3 shares `story-state-contract.md`, `branching-story-turn-cycle/SKILL.md`, `branching-story-health-audit/SKILL.md`, and `contract-schema-roundtrip.test.ts` with ticket 002 but at different sections (§4.1 vs §4.3; turn-cycle Phase 4 BEL authoring vs Phase 2 SLT selection; health-audit Phase 2d vs replay; story-belief vs story-event roundtrip case) — sequenced after 002 to avoid shared-file rebase friction.
4. FOUNDATIONS principle motivating this ticket — §Story Bundles §5b (Schema-Minimalism) and §6b (Observer Firewall): D3 reverses the §5b "not retained at this layer" minimalism call at `story-state-contract.md:85-86`. Justified because SPEC-27 D7's §6b observer firewall — shipped 2026-05-15 — gives `access_route` / `access_records` a concrete downstream consumer (`branching-story-health-audit` Phase 2d's `observer_firewall_violation` audit), clearing the §5b load-bearing bar. The new fields read a recorded access route instead of re-deriving it from prose; the firewall check that turn-cycle already performs at move generation is now retained as state rather than discarded.
5. Schema extension: D3 extends the `BEL` output schema. Consumers: `tools/validators/src/schemas/story-belief.schema.json`, `contract-schema-roundtrip.test.ts`, `record-schema-compliance-bel.test.ts`, `tools/world-mcp/tests/tools/validate-patch-plan.test.ts`, `branching-story-health-audit` Phase 2d, and `branching-story-turn-cycle` (producer). The extension adds `access_route` (required) and `access_records` (list, may be empty for `authorial_initialization` at bundle genesis) to `basis`. Because there are zero production story bundles, this is a greenfield schema change with no record migration; validator and validate-patch-plan positive fixtures need the new fields.
6. Adjacent contradiction surfaced at reassessment: `tools/validators/src/schemas/story-belief.schema.json`'s `basis` object is `additionalProperties: false` with `required: ["source_event"]` only — adding `access_route` to the contract WITHOUT the JSON schema would make valid `BEL` records carrying `access_route` fail `record-schema-compliance`. The same required-field change also makes current positive `BEL` fixtures in `record-schema-compliance-bel.test.ts` and `tools/world-mcp/tests/tools/validate-patch-plan.test.ts` stale. Classified as a required consequence of this ticket (the Issue 1 `expand-scope-in-place` disposition).
7. HARD-GATE read: required and completed because `story-belief.schema.json` is exercised by `record_schema_compliance` in story-bundle pre-apply / `validate_patch_plan` lanes. The change tightens the `BEL` shape and preserves fail-closed behavior; it does not alter approval-token semantics, patch-engine ordering, or story/world canon write authorization.

## Architecture Check

1. Adding `access_route` / `access_records` to `BEL.basis` (rather than leaving §6b unauditable or inventing a new evidence record class) is cleaner because the access-route concept ALREADY exists in FOUNDATIONS §6b — D3 brings the schema into alignment with the principle SPEC-27 D7 just enforced, using existing story-bundle record classes for `access_records` rather than introducing a new EVD class (SPEC-28 D3 explicitly defers an evidence record per the source report's own minimalism note).
2. No backwards-compatibility shims or alias paths — the §5b "not retained at this layer" note is rewritten in place rather than amended with an exception; the JSON schema and validator tests are updated to match.

## Verification Layers

1. Contract carries the fields -> codebase grep-proof: `grep -nE "access_route:|access_records:" .claude/skills/_shared-templates/story-state-contract.md` returns hits in §4.1; the lines-85-86 note no longer says provenance refinements "are not retained at this layer."
2. JSON schema matches the contract -> schema validation: `tools/validators/tests/structural/contract-schema-roundtrip.test.ts` passes for `story-belief`; `tools/validators/src/schemas/story-belief.schema.json`'s `basis` object lists `access_route` (with the enumerated values) and `access_records` (list), with `access_route` added to `required`.
3. Firewall is post-hoc auditable -> manual review of health-audit Phase 2d prose: `branching-story-health-audit/SKILL.md` Phase 2d reads `BEL.basis.access_route` and `BEL.basis.access_records` when reporting `observer_firewall_violation` rather than re-deriving from prose.
4. Producer wires the access route -> manual review of turn-cycle BEL authoring prose: `branching-story-turn-cycle/SKILL.md` records `access_route` and the enabling records (`access_records`) at the same moment the move-generation firewall check fires.

## Landed Changes

### 1. Amended `BEL.basis` in `story-state-contract.md` §4.1 and rewrote the §5b note

Added `access_route` and `access_records` to the `BEL.basis` sub-structure:

```
basis:
  source_event: SE-<integer>*
  access_route: direct_observation | testimony | document | object_trace | location_trace | inference | surveillance | institutional_channel | magic_tech | rumor | authorial_initialization*
  access_records: [STENT-<integer> | STLOC-<integer> | STOBJ-<integer> | DA-<integer> | BEL-<integer> | SF-<integer> | SE-<integer>]
```

Rewrote the note so it states that `basis.access_route` records how the holder gained access and `basis.access_records` cites enabling records, consumed by `branching-story-health-audit` Phase 2d's `observer_firewall_violation` audit. Removed the "are not retained at this layer" claim from the shared contract.

### 2. Added the fields to the BEL JSON schema (per Issue 1 — expand-scope-in-place)

In `tools/validators/src/schemas/story-belief.schema.json`, added `access_route` and `access_records` to the `basis` object's `properties`. Added `access_route` to `basis.required`. Preserved `additionalProperties: false`.

### 3. Updated the validator and validate-patch-plan positive fixtures

In `tools/validators/tests/structural/contract-schema-roundtrip.test.ts`, updated the `story-belief` expectation and representative record so the schema test covers the amended `basis` shape.

In `tools/validators/tests/structural/record-schema-compliance-bel.test.ts`, updated the complete positive `BEL` fixture to include `basis.access_route` and `basis.access_records`.

In `tools/world-mcp/tests/tools/validate-patch-plan.test.ts`, updated the `create_bel_record` positive pre-apply fixture so `validate_patch_plan` still proves the current required `BEL` shape.

### 4. Wired access-route recording in turn-cycle BEL authoring

In `.claude/skills/branching-story-turn-cycle/SKILL.md`, Phase 4 now requires created/superseding `BEL` records to populate `basis.access_route` and cite enabling records in `basis.access_records` when the route depends on story records. Phase 2/8 prose and the FOUNDATIONS alignment table now retain supporting record ids for auditability.

### 5. Consumed the recorded access route in health-audit Phase 2d

In `.claude/skills/branching-story-health-audit/SKILL.md` Phase 2d, `observer_firewall_violation` review now reads `BEL.basis.access_route` and `BEL.basis.access_records` instead of re-deriving the route from prose / plans / notes.

### 6. Truthed the SPEC-28 D3 status note

Added a dated implementation note to `specs/SPEC-28-story-contract-hardening.md` marking D3 landed and labeling the older current-state prose as historical intake context.

## Files to Touch

- `.claude/skills/_shared-templates/story-state-contract.md` (modify)
- `tools/validators/src/schemas/story-belief.schema.json` (modify)
- `tools/validators/tests/structural/contract-schema-roundtrip.test.ts` (modify)
- `tools/validators/tests/structural/record-schema-compliance-bel.test.ts` (modify)
- `tools/world-mcp/tests/tools/validate-patch-plan.test.ts` (modify)
- `.claude/skills/branching-story-turn-cycle/SKILL.md` (modify)
- `.claude/skills/branching-story-health-audit/SKILL.md` (modify)
- `specs/SPEC-28-story-contract-hardening.md` (modify — dated D3 implementation note only)

## Out of Scope

- A dedicated `EVD` / evidence record class — explicitly deferred by SPEC-28 D3 and by the source report ("Add a dedicated evidence/trace class only if the first real stories prove that physical or forensic traces are too awkward to represent through existing records").
- `SE.commitment` — SPEC28STOCONHAR-002 (SPEC-28 D2).
- The turn-cycle / health-audit count and citation fixes — SPEC28STOCONHAR-004 (SPEC-28 D4).
- `tools/world-index` changes — verified not needed (`BEL` is registered as a generic id-keyed atomic record).
- A `record-schema-compliance-story-belief.test.ts` — none exists by that name; `contract-schema-roundtrip.test.ts` covers `story-belief` and is the validating surface for this ticket.

## Acceptance Criteria

### Tests That Must Pass

1. `npm --prefix tools/validators run build` followed by `node --test --test-concurrency=1 dist/tests/**/*.test.js` from `tools/validators` — the validators test lane passes, including `contract-schema-roundtrip.test.ts` and `record-schema-compliance-bel.test.ts` for the `story-belief` case.
2. `grep -nE "access_route:|access_records:" .claude/skills/_shared-templates/story-state-contract.md` returns hits in §4.1; `grep -n "are not retained at this layer" .claude/skills/_shared-templates/story-state-contract.md` returns no hits.
3. `grep -nE "access_route|access_records" .claude/skills/branching-story-health-audit/SKILL.md` returns a hit in the Phase 2d / `observer_firewall_violation` region.
4. `npm --prefix tools/world-mcp run build` followed by `node --test dist/tests/tools/validate-patch-plan.test.js` from `tools/world-mcp` passes, proving the updated `create_bel_record` pre-apply fixture.

### Invariants

1. Every newly-authored `BEL` record carries `basis.access_route`; `access_records` cites only existing record IDs (STENT / STLOC / STOBJ / DA / BEL / SF / SE).
2. `story-state-contract.md` §4.1 and `tools/validators/src/schemas/story-belief.schema.json` define the same `BEL` shape — `contract-schema-roundtrip.test.ts` enforces this.
3. `branching-story-health-audit` Phase 2d reads `BEL.basis.access_route` rather than re-deriving it from prose (FOUNDATIONS §Story Bundles §6b post-hoc auditability).

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/contract-schema-roundtrip.test.ts` — modified: the `story-belief` expectation matches the amended §4.1 with `access_route` required on `basis`.
2. `tools/validators/tests/structural/record-schema-compliance-bel.test.ts` — modified: the positive `BEL` fixture carries `basis.access_route` and `basis.access_records`.
3. `tools/world-mcp/tests/tools/validate-patch-plan.test.ts` — modified: the `create_bel_record` pre-apply fixture carries the current required `BEL.basis` shape.

### Commands

1. `npm --prefix tools/validators run build`
2. `cd tools/validators && node --test --test-concurrency=1 dist/tests/**/*.test.js`
3. `npm --prefix tools/world-mcp run build`
4. `cd tools/world-mcp && node --test dist/tests/tools/validate-patch-plan.test.js`
5. `grep -nE "access_route:|access_records:" .claude/skills/_shared-templates/story-state-contract.md`
6. `if grep -n 'are not retained at this layer' .claude/skills/_shared-templates/story-state-contract.md; then exit 1; fi`
7. `grep -nE "access_route|access_records" .claude/skills/branching-story-health-audit/SKILL.md`
8. The validators + focused world-mcp test lanes plus grep-proofs are the correct verification boundary — D3 has no skill-dry-run surface because zero production bundles exist.

## Outcome

Completed SPEC-28 D3. `BEL.basis` now records the §6b observer-firewall access route in the shared contract and JSON schema. Turn-cycle authoring records the route for newly authored/superseding `BEL` records, and health-audit Phase 2d reads the recorded route when reporting `observer_firewall_violation` findings. Validator and validate-patch-plan positive fixtures now use the current required `BEL.basis` shape, and the explicit SPEC-28 D3 status note marks the slice landed.

## Verification Result

1. `npm --prefix tools/validators run build` — passed.
2. `cd tools/validators && node --test --test-concurrency=1 dist/tests/**/*.test.js` — passed: 220 tests, 220 passed.
3. `npm --prefix tools/world-mcp run build` — passed.
4. `cd tools/world-mcp && node --test dist/tests/tools/validate-patch-plan.test.js` — passed: 9 tests, 9 passed.
5. `grep -nE "access_route:|access_records:" .claude/skills/_shared-templates/story-state-contract.md` — passed, with hits in §4.1.
6. `if grep -n 'are not retained at this layer' .claude/skills/_shared-templates/story-state-contract.md; then exit 1; fi` — passed with no hits.
7. `grep -nE "access_route|access_records" .claude/skills/branching-story-health-audit/SKILL.md` — passed, with hits in Phase 2d and the FOUNDATIONS alignment row.
8. Manual review: `branching-story-turn-cycle/SKILL.md` Phase 4 now records `BEL.basis.access_route` / `BEL.basis.access_records`; `branching-story-health-audit/SKILL.md` Phase 2d reads those fields rather than re-deriving access from prose/plans/notes.

## Deviations

1. Reassessment widened the proof surface to include `tools/validators/tests/structural/record-schema-compliance-bel.test.ts` and `tools/world-mcp/tests/tools/validate-patch-plan.test.ts`; both contained positive `BEL` fixtures that would become stale once `basis.access_route` became required.
2. The drafted `npm --prefix tools/validators test` broad package script was run twice and failed both times only in `dist/tests/cli/world-validate.story-bundle.test.js` and `dist/tests/cli/world-validate.test.js` under the full concurrent glob lane. Both CLI files pass when run directly, and the serial full-suite command passed all 220 tests. Acceptance was corrected to the truthful serial full-suite validators proof plus the focused `world-mcp` pre-apply proof.
