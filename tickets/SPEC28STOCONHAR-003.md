# SPEC28STOCONHAR-003: Add BEL.basis access routes for the §6b observer firewall

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `.claude/skills/_shared-templates/story-state-contract.md` §4.1 BEL schema + §5b "not retained" note rewrite; `tools/validators/src/schemas/story-belief.schema.json`; `tools/validators/tests/structural/contract-schema-roundtrip.test.ts`; `branching-story-turn-cycle` (BEL authoring records the access route); `branching-story-health-audit` Phase 2d (reads recorded access route).
**Deps**: archive/tickets/SPEC28STOCONHAR-002.md

## Problem

SPEC-27 D7 added the FOUNDATIONS §Story Bundles §6b observer firewall gating move/choice generation against the acting entity's `BEL` state, but `BEL.basis` records only `source_event`; `.claude/skills/_shared-templates/story-state-contract.md:85-86` *explicitly* states that provenance refinements ("witnessed_page", "told_by", "inferred_from") "are not retained at this layer." So `branching-story-health-audit` Phase 2d must re-derive each belief's access route from prose / plans / notes rather than read a recorded field — the just-shipped §6b firewall is not auditable post-hoc. SPEC-28 D3.

## Assumption Reassessment (2026-05-15)

1. Verified against `.claude/skills/_shared-templates/story-state-contract.md` §4.1: the `BEL.basis` sub-structure has only `source_event: SE-<integer>` — confirmed during SPEC-28's brainstorm verification. The lines-85-86 note explicitly disposes of the access-route refinement as "not retained at this layer." Verified against `branching-story-health-audit/SKILL.md` Phase 2d: the sub-phase reports `observer_firewall_violation` findings (SPEC-27 D7) but has no recorded access route to read.
2. Verified against `docs/FOUNDATIONS.md` §Story Bundles §6b: the observer-firewall clause enumerates access routes — "direct observation, testimony, document, inference, surveillance, institutional channel, magic/tech, or another canonically valid mechanism." The `access_route` enum SPEC-28 D3 prescribes (`direct_observation | testimony | document | object_trace | location_trace | inference | surveillance | institutional_channel | magic_tech | rumor | authorial_initialization`) is the §6b enumeration plus a few extensions consistent with "another canonically valid mechanism." SPEC-27 D7 landed `observer_firewall_violation` as the Phase 2d finding name.
3. Cross-artifact shared boundary: the `BEL` record schema, defined in `story-state-contract.md` §4.1 AND enforced by `tools/validators/src/schemas/story-belief.schema.json` — verified at decomposition to be `additionalProperties: false` at top-level and on the `basis` object, with `required: ["source_event"]` on `basis`. SCAUD-003 kept the contract and JSON schema in lockstep; `tools/validators/tests/structural/contract-schema-roundtrip.test.ts` covers `story-belief` and will fail if they diverge. `tools/world-index` registers `BEL` as a generic id-keyed atomic record (no field-level parsing) — no world-index change needed. `branching-story-turn-cycle` produces `BEL` records (the firewall check it already performs at move generation is now retained as state); `branching-story-health-audit` Phase 2d consumes them. **Sibling boundary with SPEC28STOCONHAR-002**: D3 shares `story-state-contract.md`, `branching-story-turn-cycle/SKILL.md`, `branching-story-health-audit/SKILL.md`, and `contract-schema-roundtrip.test.ts` with ticket 002 but at different sections (§4.1 vs §4.3; turn-cycle Phase 4 BEL authoring vs Phase 2 SLT selection; health-audit Phase 2d vs replay; story-belief vs story-event roundtrip case) — sequenced after 002 to avoid shared-file rebase friction.
4. FOUNDATIONS principle motivating this ticket — §Story Bundles §5b (Schema-Minimalism) and §6b (Observer Firewall): D3 reverses the §5b "not retained at this layer" minimalism call at `story-state-contract.md:85-86`. Justified because SPEC-27 D7's §6b observer firewall — shipped 2026-05-15 — gives `access_route` / `access_records` a concrete downstream consumer (`branching-story-health-audit` Phase 2d's `observer_firewall_violation` audit), clearing the §5b load-bearing bar. The new fields read a recorded access route instead of re-deriving it from prose; the firewall check that turn-cycle already performs at move generation is now retained as state rather than discarded.
5. Schema extension: D3 extends the `BEL` output schema. Consumers: `tools/validators/src/schemas/story-belief.schema.json`, `contract-schema-roundtrip.test.ts`, `branching-story-health-audit` Phase 2d, and `branching-story-turn-cycle` (producer). The extension adds `access_route` (required) and `access_records` (list, may be empty for `authorial_initialization` at bundle genesis) to `basis`. Because there are zero production story bundles, this is a greenfield schema change with no record migration; only validator-test fixtures need the new fields.
6. Adjacent contradiction surfaced at reassessment: `tools/validators/src/schemas/story-belief.schema.json`'s `basis` object is `additionalProperties: false` with `required: ["source_event"]` only — adding `access_route` to the contract WITHOUT the JSON schema would make valid `BEL` records carrying `access_route` fail `record-schema-compliance`. Classified as a required consequence of this ticket (the Issue 1 `expand-scope-in-place` disposition).

## Architecture Check

1. Adding `access_route` / `access_records` to `BEL.basis` (rather than leaving §6b unauditable or inventing a new evidence record class) is cleaner because the access-route concept ALREADY exists in FOUNDATIONS §6b — D3 brings the schema into alignment with the principle SPEC-27 D7 just enforced, using existing story-bundle record classes for `access_records` rather than introducing a new EVD class (SPEC-28 D3 explicitly defers an evidence record per the source report's own minimalism note).
2. No backwards-compatibility shims or alias paths — the §5b "not retained at this layer" note is rewritten in place rather than amended with an exception; the JSON schema and validator tests are updated to match.

## Verification Layers

1. Contract carries the fields -> codebase grep-proof: `grep -nE "access_route:|access_records:" .claude/skills/_shared-templates/story-state-contract.md` returns hits in §4.1; the lines-85-86 note no longer says provenance refinements "are not retained at this layer."
2. JSON schema matches the contract -> schema validation: `tools/validators/tests/structural/contract-schema-roundtrip.test.ts` passes for `story-belief`; `tools/validators/src/schemas/story-belief.schema.json`'s `basis` object lists `access_route` (with the enumerated values) and `access_records` (list), with `access_route` added to `required`.
3. Firewall is post-hoc auditable -> manual review of health-audit Phase 2d prose: `branching-story-health-audit/SKILL.md` Phase 2d reads `BEL.basis.access_route` and `BEL.basis.access_records` when reporting `observer_firewall_violation` rather than re-deriving from prose.
4. Producer wires the access route -> manual review of turn-cycle BEL authoring prose: `branching-story-turn-cycle/SKILL.md` records `access_route` and the enabling records (`access_records`) at the same moment the move-generation firewall check fires.

## What to Change

### 1. Amend `BEL.basis` in `story-state-contract.md` §4.1 and rewrite the §5b note at lines 85-86

Add `access_route` and `access_records` to the `BEL.basis` sub-structure:

```
basis:
  source_event: SE-<integer>*
  access_route: direct_observation | testimony | document | object_trace | location_trace | inference | surveillance | institutional_channel | magic_tech | rumor | authorial_initialization*
  access_records: [STENT-<integer> | STLOC-<integer> | STOBJ-<integer> | DA-<integer> | BEL-<integer> | SF-<integer> | SE-<integer>]
```

Rewrite the note at `story-state-contract.md:85-86` so it states that `basis.access_route` records HOW the holder gained access and `basis.access_records` cites the enabling records, consumed by `branching-story-health-audit` Phase 2d's `observer_firewall_violation` audit. Remove the "are not retained at this layer" claim.

### 2. Add the fields to the BEL JSON schema (per Issue 1 — expand-scope-in-place)

In `tools/validators/src/schemas/story-belief.schema.json`, add `access_route` and `access_records` to the `basis` object's `properties`. Add `access_route` to `basis.required`. Preserve `additionalProperties: false`. The JSON schema must match the §4.1 contract block produced in §1 above.

### 3. Update the contract-schema roundtrip test

In `tools/validators/tests/structural/contract-schema-roundtrip.test.ts`, update the `story-belief` expectation so the roundtrip between §4.1 and `story-belief.schema.json` succeeds against the amended `basis` shape.

### 4. Wire access-route recording in turn-cycle BEL authoring

In `.claude/skills/branching-story-turn-cycle/SKILL.md`, where the skill authors `BEL` records (typically Phase 4 — the post-event belief-propagation phase landed by SPEC-26 D5's `expected_witnesses` mechanism), record `access_route` and `access_records` at the same moment the SPEC-27 D7 §6b move-generation firewall check fires. The firewall check the skill already performs is now retained as state rather than discarded.

### 5. Consume the recorded access route in health-audit Phase 2d

In `.claude/skills/branching-story-health-audit/SKILL.md` Phase 2d, read `BEL.basis.access_route` and `BEL.basis.access_records` when reporting `observer_firewall_violation` findings; remove any prose that says the route must be re-derived from prose / plans / notes.

## Files to Touch

- `.claude/skills/_shared-templates/story-state-contract.md` (modify)
- `tools/validators/src/schemas/story-belief.schema.json` (modify)
- `tools/validators/tests/structural/contract-schema-roundtrip.test.ts` (modify)
- `.claude/skills/branching-story-turn-cycle/SKILL.md` (modify)
- `.claude/skills/branching-story-health-audit/SKILL.md` (modify)

## Out of Scope

- A dedicated `EVD` / evidence record class — explicitly deferred by SPEC-28 D3 and by the source report ("Add a dedicated evidence/trace class only if the first real stories prove that physical or forensic traces are too awkward to represent through existing records").
- `SE.commitment` — SPEC28STOCONHAR-002 (SPEC-28 D2).
- The turn-cycle / health-audit count and citation fixes — SPEC28STOCONHAR-004 (SPEC-28 D4).
- `tools/world-index` changes — verified not needed (`BEL` is registered as a generic id-keyed atomic record).
- A `record-schema-compliance-story-belief.test.ts` — none exists by that name; `contract-schema-roundtrip.test.ts` covers `story-belief` and is the validating surface for this ticket.

## Acceptance Criteria

### Tests That Must Pass

1. `npm --prefix tools/validators test` — the validators test lane passes, including `contract-schema-roundtrip.test.ts` for the `story-belief` case.
2. `grep -nE "access_route:|access_records:" .claude/skills/_shared-templates/story-state-contract.md` returns hits in §4.1; `grep -n "are not retained at this layer" .claude/skills/_shared-templates/story-state-contract.md` returns no hits.
3. `grep -nE "access_route|access_records" .claude/skills/branching-story-health-audit/SKILL.md` returns a hit in the Phase 2d / `observer_firewall_violation` region.

### Invariants

1. Every newly-authored `BEL` record carries `basis.access_route`; `access_records` cites only existing record IDs (STENT / STLOC / STOBJ / DA / BEL / SF / SE).
2. `story-state-contract.md` §4.1 and `tools/validators/src/schemas/story-belief.schema.json` define the same `BEL` shape — `contract-schema-roundtrip.test.ts` enforces this.
3. `branching-story-health-audit` Phase 2d reads `BEL.basis.access_route` rather than re-deriving it from prose (FOUNDATIONS §Story Bundles §6b post-hoc auditability).

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/contract-schema-roundtrip.test.ts` — modified: the `story-belief` expectation matches the amended §4.1 with `access_route` required on `basis`.

### Commands

1. `npm --prefix tools/validators test`
2. `grep -nE "access_route|access_records|are not retained" .claude/skills/_shared-templates/story-state-contract.md`
3. The validators test lane plus grep-proofs is the correct verification boundary — D3 has no skill-dry-run surface because zero production bundles exist.
