# SPEC23STOSTACON-004: Update BEL schema — belief_mode required + visibility/truth_relation/confidence

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — `tools/validators/src/schemas/story-belief.schema.json`
**Deps**: archive/tickets/SPEC23STOSTACON-001.md

## Problem

Post-SPEC23STOSTACON-001 the story-state contract §4.1 (BEL record) adds a required `belief_mode` field (10 values) that separates sincerity / epistemic stance from `confidence` (subjective certainty axis), extends `truth_relation` to add `future_contingent`, refines `confidence` to remove conflated values (`rumor`, `performative_lie`) and add `uncommitted`, and extends `visibility` to add `factional` and `rumored`. FOUNDATIONS §Story Bundles §6a is also amended to document the new field + extended sets. The schema at `tools/validators/src/schemas/story-belief.schema.json` lines 30-38 currently enforces the pre-amendment enums; without this update the schema would reject contract-shaped BEL records that use the new vocabulary.

## Assumption Reassessment (2026-05-13)

1. Current schema state verified: `tools/validators/src/schemas/story-belief.schema.json` lines 5-16 list 9 required fields (no `belief_mode`); lines 30-38 enforce `truth_relation`, `confidence`, `visibility` enums at the pre-amendment values. Schema's `additionalProperties: false` at line 63 means a contract-shaped BEL record carrying `belief_mode` would currently FAIL schema validation.
2. Contract authority: `.claude/skills/_shared-templates/story-state-contract.md` §4.1 post-SPEC23STOSTACON-001 defines the new field + extended enums. FOUNDATIONS §Story Bundles §6a lockstep amendment also lands in SPEC23STOSTACON-001.
3. Cross-artifact boundary under audit: the BEL schema is consumed by validator pipeline + tests. No production BEL records exist (spec §Risks §138 + empty `worlds/erotica-world/stories/` directory). Adding a required field to BEL is a schema-breaking change in principle, but zero-cost in practice because no records carry the field.
4. FOUNDATIONS principle motivating this ticket: Rule 1 (No Floating Facts) + FOUNDATIONS §Story Bundles §6a (Belief vs. Fact). The `belief_mode` separation makes `confidence` a clean certainty axis (no more conflation of "I'm 90% sure" with "I am lying"); both axes are then load-bearing through the social-state firewall (§Story Bundles §6a consumes `BEL.visibility`).
5. Schema extension classification (menu item 6 per `tickets/_TEMPLATE.md`): this is a **breaking schema change** — `belief_mode` becomes a required property; the `confidence` enum drops two values (`rumor`, `performative_lie`) and adds one (`uncommitted`); the `visibility` enum adds two values (additive); the `truth_relation` enum adds one (additive). Net: one breaking field addition + one breaking enum reshuffle on `confidence`; pre-existing BEL records would need migration. Verified zero pre-existing records.

## Architecture Check

1. Schema as gate for contract conformance is cleaner than runtime enforcement: validating `belief_mode` at schema-load time (within the `world-validate` pipeline) catches malformed BEL records at commit time rather than at retrieval-time when consumed by social-state firewall. The contract amendment is meaningless until a schema gate enforces it.
2. No backwards-compatibility aliasing: drop `rumor` and `performative_lie` from `confidence` without aliasing. Per spec §Key design decisions, those values were conflated semantics that the rebuild deliberately untangles — aliasing them to `belief_mode` values would re-introduce the conflation.

## Verification Layers

1. Schema's `required` list contains `belief_mode` → schema validation: `jq -r '.required[]' tools/validators/src/schemas/story-belief.schema.json | grep -x belief_mode` returns 1 match.
2. Schema's `belief_mode.enum` has 10 values → `jq '.properties.belief_mode.enum | length' tools/validators/src/schemas/story-belief.schema.json` returns 10.
3. Schema's `truth_relation.enum` has 7 values incl. `future_contingent` → `jq '.properties.truth_relation.enum | length' tools/validators/src/schemas/story-belief.schema.json` returns 7; `jq '.properties.truth_relation.enum' tools/validators/src/schemas/story-belief.schema.json | grep -c future_contingent` returns 1.
4. Schema's `confidence.enum` has 5 values, drops `rumor`/`performative_lie`, adds `uncommitted` → `jq '.properties.confidence.enum | length'` returns 5; `jq '.properties.confidence.enum | tostring | test("rumor|performative_lie")' tools/validators/src/schemas/story-belief.schema.json` returns false; same query against `"uncommitted"` returns true.
5. Schema's `visibility.enum` has 7 values incl. `factional` + `rumored` → length 7; contains both new values.
6. Validator package builds + tests pass → `cd tools/validators && npm run build && npm test`.

## What to Change

### 1. Add `belief_mode` to required + properties

Update `tools/validators/src/schemas/story-belief.schema.json`:
- Add `"belief_mode"` to the `required` array at lines 5-16; resulting required: 10 fields.
- Add `belief_mode` property in `properties` block:
  ```json
  "belief_mode": {
    "enum": ["knows", "believes", "suspects", "doubts", "denies", "reports", "claims", "deceives", "misremembers", "interprets"]
  }
  ```

### 2. Extend `truth_relation` enum

Update lines 30-32: add `future_contingent` to the enum: `["true", "false", "partly_true", "unknown", "contested", "branch_counterfactual", "future_contingent"]`.

### 3. Refine `confidence` enum

Update lines 33-35: drop `rumor` and `performative_lie`; add `uncommitted`. New enum: `["certain", "high", "medium", "low", "uncommitted"]`. Per contract §4.1, the renaming/refinement maps prior `likely → high` and `suspected → medium` conceptually (no aliasing — old values are simply dropped; no records carry them).

### 4. Extend `visibility` enum

Update lines 36-38: add `factional` and `rumored`. New enum: `["private", "shared", "factional", "public", "rumored", "concealed", "suppressed"]`.

## Files to Touch

- `tools/validators/src/schemas/story-belief.schema.json` (modify)

## Out of Scope

- Adding nested validation for `basis.source_event` beyond the existing pattern check (already covered by lines 39-46).
- Adding nested validation for `consequences.opens` / `consequences.constrains_choices` beyond existing pattern checks (already covered by lines 47-60).
- Skill prose updates referencing the new `belief_mode` field — SPEC23STOSTACON-009.
- Contract amendment + FOUNDATIONS lockstep — `archive/tickets/SPEC23STOSTACON-001.md` (this ticket's dependency).
- Predicate DSL `belief()` refinement — SPEC23STOSTACON-008 (consumes the new BEL fields).

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/validators && npm run build && npm test` — full validators build + test pass.
2. `jq -r '.required[]' tools/validators/src/schemas/story-belief.schema.json` returns 10 entries including `belief_mode`.
3. BEL record with `belief_mode: "knows"` + new `confidence: "uncommitted"` + new `visibility: "factional"` + new `truth_relation: "future_contingent"` PASSes schema validation.
4. BEL record with `confidence: "rumor"` (dropped value) FAILs schema validation.
5. BEL record missing `belief_mode` FAILs schema validation.

### Invariants

1. The BEL schema strictly enforces the post-SPEC23STOSTACON-001 contract §4.1 sets. `confidence: "rumor"` is no longer accepted; that semantic now lives in `belief_mode: "reports"` + appropriate `visibility`.
2. `additionalProperties: false` is preserved at the top level — no extra fields beyond contract §4.1.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/record-schema-compliance-story-belief.test.ts` (path discovered at implementation; create if absent following the pattern of `record-schema-compliance-story-page.test.ts`) — fixtures covering: (a) PASS for valid contract-shaped BEL record with `belief_mode`; (b) FAIL for missing `belief_mode`; (c) FAIL for dropped `confidence: rumor`; (d) PASS for new `visibility: factional` / `truth_relation: future_contingent`.

### Commands

1. `cd tools/validators && npm run build && npm test` — full validators build + test pass.
2. `jq '.properties.belief_mode.enum | length' tools/validators/src/schemas/story-belief.schema.json` returns 10.
3. `jq '.properties.confidence.enum' tools/validators/src/schemas/story-belief.schema.json` returns the new 5-value list without `rumor` / `performative_lie`.
