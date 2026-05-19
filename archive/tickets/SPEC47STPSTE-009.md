# SPEC47STPSTE-009: Extend §5a tag-grammar parser with STPLAN/STEMO + plan_relation tag

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — extends the shared parser implementation at `tools/world-index/src/parse/intro-tag-parser.ts` and the validators re-export at `tools/validators/src/structural/midstory-introduction-utils.ts` with 2 new `intro:<CLASS>(...)` class values + 6 STPLAN triggers + 7 STEMO triggers + new `plan_relation:<relation>(plan=STPLAN-N)` tag pattern with 7 closed relations
**Deps**: `archive/tickets/SPEC47STPSTE-003.md`

## Problem

SPEC-47's mid-story creation of STPLAN/STEMO records (turn-cycle creates them in response to events; bootstrap seeds a few) needs introduction-grounding via the established §5a parseable `intro:<CLASS>(...)` tag pattern in `SE.world_logic_rationale`. The existing parser supports 6 classes (CLK/STSEC/STQ/THR/STENT/SREL); extending the `class` enum to 8 (adding STPLAN + STEMO) lets turn-cycle emit `intro:STPLAN(id=STPLAN-12, trigger=tactical_approach_committed, evidence=[BEL-31,STOBJ-8], distinct_from=[])` and `intro:STEMO(id=STEMO-7, trigger=event_revealed_truth_to_actor, evidence=[BEL-31,SE-22], distinct_from=[])` tags. Additionally, SPEC-47 introduces a new `plan_relation:<relation>(plan=STPLAN-N)` tag pattern (parallel to `intro:` and `non_propagation:` patterns) to record per-SE event-plan relationships (advances/tests/blocks/revises/fulfills/abandons/ignores) without inflating the SE schema with a structured `SE.plan_relations[]` field (per SPEC-47 §Key Design Decisions item 4).

## Assumption Reassessment (2026-05-19)

<!-- Items 1-3 always required. Items 4+ are a menu; include only those matching this ticket's scope and renumber surviving items sequentially starting from 4. Lists like 1, 2, 3, 14 are malformed output. -->

1. Verified the live parser implementation moved below the validators wrapper: `tools/validators/src/structural/midstory-introduction-utils.ts` only re-exports from `@worldloom/world-index/parse/intro-tag-parser`, while the closed parser and trigger arrays live in `tools/world-index/src/parse/intro-tag-parser.ts`. The wrapper currently re-exports `MIDSTORY_TRIGGERS_BY_CLASS` plus 6 per-class trigger arrays: `MIDSTORY_TRIGGERS_CLK`, `MIDSTORY_TRIGGERS_SREL`, `MIDSTORY_TRIGGERS_STENT`, `MIDSTORY_TRIGGERS_STQ`, `MIDSTORY_TRIGGERS_STSEC`, `MIDSTORY_TRIGGERS_THR`. The live parser's `class` enum is closed; extending it requires adding 2 new entries + 2 new per-class trigger exports in `world-index`, then re-exporting them through the validators wrapper.
2. Verified SPEC-47 §Approach §B D-B5 specifies extending the parser with: 2 new `class` enum values (`STPLAN`, `STEMO`); 6 STPLAN closed triggers (`tactical_approach_committed`, `resource_gained_enables_plan`, `blocker_requires_plan`, `pressure_forces_plan`, `opportunity_recognized`, `counterparty_plan_observed`); 7 STEMO closed triggers (`event_revealed_truth_to_actor`, `event_threatened_actor_or_charge`, `event_harmed_actor_or_charge`, `event_relieved_pressure_on_actor`, `event_violated_actor_principle_or_value`, `event_changed_relationship_with_other`, `accumulated_pressure_crossed_threshold`); new `plan_relation:<relation>(plan=STPLAN-N)` tag pattern with 7 closed relations (`advances | tests | blocks | revises | fulfills | abandons | ignores`).
3. Cross-skill boundary under audit: the parser is consumed by (a) `midstory_record_introduction_grounding` validator (ticket 007 wires the consumption via D-B6); (b) `branching-story-turn-cycle` skill (emits the tags into SE.world_logic_rationale); (c) `branching-story-health-audit` skill (walks SE records and checks tag-grounding). Adding 2 new `intro:` class values + a new `plan_relation:` pattern extends the parser surface; the existing 6 class triggers are unchanged.
4. FOUNDATIONS §Story Bundles §5a (Mid-Story Introduction Tag Grammar) — the closed trigger vocabulary anchors introductions in present-causal state per §5c discipline ("present-causal anchor names, not narrative-shape framing"). The 6 STPLAN triggers + 7 STEMO triggers + 7 plan_relation values follow this discipline (event-shape anchors, not narrative-arc labels). Plus §5c (Present Causal State, Not Narrative Shape) — `accumulated_pressure_crossed_threshold` names the latest contributing SE rather than asserting cumulative-arc framing; plan_relation values (advances/tests/blocks/revises/fulfills/abandons/ignores) describe what the event did to the plan in present-causal terms, not where the plan should go in narrative shape.
5. Parser extension lands in `tools/world-index/src/parse/intro-tag-parser.ts` and is surfaced to validators through `tools/validators/src/structural/midstory-introduction-utils.ts` — per the §Step 6.2(c) per-ticket-type granularity rule for item 5: structural validators are a Canon Safety surface (consumed by midstory_record_introduction_grounding which gates SE record commits at engine pre-apply time). HARD-GATE discipline preserved: the parser only adds recognition for new class+trigger pairs and the new tag pattern; no canon-safety bypass introduced.
6. Reassessment correction: SPEC-47 and the drafted ticket named `tools/validators/src/structural/midstory-introduction-utils.ts` as the parser implementation site, but live code made it a re-export wrapper. The truthful implementation seam is the world-index parser plus the validators re-export; this is same-seam parser fallout, not a new capability boundary.

## Architecture Check

1. Extending the existing §5a tag grammar (rather than introducing a structured `SE.record_introductions[]` field per SPEC-47 §Key Design Decisions item 3) preserves the proven parser surface and decouples SPEC-47 from item 11's structured-replacement design. When item 11 eventually lands (with `trigger` + `distinct_from` properly preserved in the structured form), it migrates all 8 §5a tag patterns uniformly (including the new `plan_relation:`) in one pass — no transient two-pattern state.
2. The new `plan_relation:` tag pattern reuses the same parser surface as `intro:` and `non_propagation:` (all three patterns live in `SE.world_logic_rationale` and are extracted via the same regex-based parser). No new SE schema field added; the SE schema is unchanged.
3. No backwards-compatibility aliasing/shims introduced — extensions only. Existing 6-class tag grammar continues to work unchanged.

## Verification Layers

1. Parser's `class` enum includes STPLAN and STEMO → codebase grep-proof `grep -nE "STPLAN|STEMO" tools/world-index/src/parse/intro-tag-parser.ts` returns matches in the class enum
2. Named exports MIDSTORY_TRIGGERS_STPLAN and MIDSTORY_TRIGGERS_STEMO exist with the correct trigger lists → codebase grep-proof
3. MIDSTORY_TRIGGERS_BY_CLASS map includes entries for STPLAN and STEMO → codebase grep-proof
4. New `plan_relation:` tag pattern parses correctly: positive-case `plan_relation:advances(plan=STPLAN-12)` extracts relation=advances + plan=STPLAN-12; negative-case `plan_relation:invalid_relation(...)` fails with the named-rule failure → per-relation test
5. Parser-extension tests cover all 6 STPLAN triggers + 7 STEMO triggers + 7 plan_relation values with positive + negative cases → schema validation

## Landed Changes

### 1. Extended `class` enum in `tools/world-index/src/parse/intro-tag-parser.ts`

Added `STPLAN` and `STEMO` to the closed `class` enum. The regex witness from `_shared-templates/story-state-contract.md` §5a updates accordingly:

```text
intro:(CLK|STSEC|STQ|THR|STENT|SREL|STPLAN|STEMO)\(id=([A-Z]+-(?:0|[1-9][0-9]*)), trigger=([a-z_]+), evidence=\[([A-Z0-9,\-]*)\], distinct_from=\[([A-Z0-9,\-]*)\]\)
```

### 2. Added named exports for STPLAN/STEMO trigger arrays

```typescript
export const MIDSTORY_TRIGGERS_STPLAN = [
  "tactical_approach_committed",
  "resource_gained_enables_plan",
  "blocker_requires_plan",
  "pressure_forces_plan",
  "opportunity_recognized",
  "counterparty_plan_observed"
] as const;

export const MIDSTORY_TRIGGERS_STEMO = [
  "event_revealed_truth_to_actor",
  "event_threatened_actor_or_charge",
  "event_harmed_actor_or_charge",
  "event_relieved_pressure_on_actor",
  "event_violated_actor_principle_or_value",
  "event_changed_relationship_with_other",
  "accumulated_pressure_crossed_threshold"
] as const;
```

### 3. Extended MIDSTORY_TRIGGERS_BY_CLASS

Added STPLAN and STEMO entries mapping to the new trigger arrays.

### 4. Added `plan_relation:` tag pattern parser

New parser function (parallel to `intro:` and `non_propagation:` extractors):

```typescript
// Grammar:
//   plan_relation_tag := "plan_relation:" relation "(plan=" record_id ")"
//   relation         := "advances" | "tests" | "blocks" | "revises" | "fulfills" | "abandons" | "ignores"
//   record_id        := "STPLAN-" positive_integer

export const PLAN_RELATIONS = [
  "advances", "tests", "blocks", "revises", "fulfills", "abandons", "ignores"
] as const;

export function parsePlanRelationTags(rationale: string): ParsedPlanRelationTag[] {
  return planRelationTagCandidates(rationale).map((tag) => parseExactPlanRelationTag(tag));
}
```

### 5. Updated parser unit tests

Added positive + negative case tests covering: the 2 new `intro:CLASS(...)` class values; all 6 STPLAN triggers; all 7 STEMO triggers; the new `plan_relation:` tag pattern; all 7 closed plan_relation values; malformed STPLAN/STEMO trigger and malformed relation/plan id cases.

## Files to Touch

- `tools/world-index/src/parse/intro-tag-parser.ts` (modify)
- `tools/world-index/tests/intro-tag-parser.test.ts` (modify)
- `tools/validators/src/structural/midstory-introduction-utils.ts` (modify) — re-export new parser symbols for validator consumers
- `specs/SPEC-47-stplan-stemo.md` (modify) — implementation-site note for the live world-index parser location

## Out of Scope

- Validator consumption of the extended parser (`midstory-record-introduction-grounding.ts`) — covered by ticket 007 (D-B6 wires the consumption).
- Story-state-contract docs §5a updates (tag grammar prose) — covered by ticket 010.
- Skill-side emission of the new tags (turn-cycle emits `intro:STPLAN(...)`, `intro:STEMO(...)`, `plan_relation:<relation>(...)`) — covered by ticket 016 (skill prose updates).

## Acceptance Criteria

### Tests That Must Pass

1. `grep -nE "MIDSTORY_TRIGGERS_(STPLAN|STEMO)" tools/world-index/src/parse/intro-tag-parser.ts tools/validators/src/structural/midstory-introduction-utils.ts` returns 4+ matches (per-class trigger array exports plus validators re-exports).
2. `grep -nE "PLAN_RELATIONS" tools/world-index/src/parse/intro-tag-parser.ts tools/validators/src/structural/midstory-introduction-utils.ts` returns matches.
3. Parser positive-case tests for all 6 STPLAN triggers + 7 STEMO triggers + 7 plan_relation values pass; negative-case tests (out-of-vocab triggers, malformed args) fail with the named-rule failure.
4. Existing parser tests for CLK/STSEC/STQ/THR/STENT/SREL classes continue to pass unchanged.

### Invariants

1. The existing 6-class tag grammar continues to work unchanged; the regex witness expands from 6 alternatives to 8 without affecting the existing 6.
2. The new `plan_relation:` tag pattern is parsed independently from the `intro:` and `non_propagation:` patterns; they coexist within a single SE.world_logic_rationale field without ambiguity.
3. All trigger vocabularies (existing 6 classes + new STPLAN/STEMO + new plan_relation) are closed enums; the parser rejects out-of-vocab values per §5c discipline.

## Test Plan

### New/Modified Tests

1. `tools/world-index/tests/intro-tag-parser.test.ts` (modify) — per-trigger positive + negative case tests for the 6 STPLAN + 7 STEMO triggers; regex-witness round-trip; argument-shape error cases.
2. `tools/world-index/tests/intro-tag-parser.test.ts` (modify) — per-relation positive + negative case tests for the 7 closed plan_relation values; parser correctly distinguishes `plan_relation:` from `intro:` and non-`plan_relation` prose in mixed-tag rationales.

### Commands

1. From `tools/world-index`: `npm run build && node --test dist/tests/intro-tag-parser.test.js` (shared parser tests pass)
2. From `tools/validators`: `npm run build && npm test` (validator package still consumes the parser through the re-export; broad package status recorded in `## Verification Result`)

## Outcome

Completed: 2026-05-19.

- Extended the shared `intro:` tag parser in `tools/world-index/src/parse/intro-tag-parser.ts` with `STPLAN` and `STEMO`, their 6 and 7 closed trigger vocabularies, and the exported trigger constants.
- Added exported `PLAN_RELATIONS` and `parsePlanRelationTags()` for the 7 closed `plan_relation:<relation>(plan=STPLAN-N)` values.
- Extended `tools/validators/src/structural/midstory-introduction-utils.ts` to re-export the new parser symbols for validator consumers.
- Expanded `tools/world-index/tests/intro-tag-parser.test.ts` to cover existing classes, every STPLAN/STEMO trigger, all plan_relation values, mixed `intro:` / `non_propagation:` / `plan_relation:` rationales, and malformed trigger/relation/id rejection cases.
- Updated `specs/SPEC-47-stplan-stemo.md` to record the live parser implementation site at `tools/world-index/src/parse/intro-tag-parser.ts` plus the validators re-export.

## Verification Result

Commands run:

1. From `tools/world-index`: `npm run build` — passed.
2. From `tools/world-index`: `node --test dist/tests/intro-tag-parser.test.js` — passed; 10/10 parser subtests passed.
3. From repo root: `grep -nE "MIDSTORY_TRIGGERS_(STPLAN|STEMO)" tools/world-index/src/parse/intro-tag-parser.ts tools/validators/src/structural/midstory-introduction-utils.ts` — returned 4 matches across implementation and re-export.
4. From repo root: `grep -nE "PLAN_RELATIONS|parsePlanRelationTags" tools/world-index/src/parse/intro-tag-parser.ts tools/validators/src/structural/midstory-introduction-utils.ts` — returned matches in implementation and re-export.
5. From `tools/validators`: `npm run build` — passed.
6. From `tools/validators`: `npm test` — passed; 602/602 validator package tests passed.
7. From `tools/world-index`: `npm test` — passed; 124/124 world-index package tests passed.

## Deviations

- Reassessment corrected the implementation site: the drafted ticket and SPEC text treated `tools/validators/src/structural/midstory-introduction-utils.ts` as the parser body, but live code had already moved the shared implementation to `tools/world-index/src/parse/intro-tag-parser.ts` and made the validators file a re-export wrapper. This ticket landed the parser body in `world-index`, kept the validators re-export, and truthed the active spec accordingly.
- The drafted separate validators-package parser test files were not created because the parser's existing home and test harness are in `tools/world-index/tests/intro-tag-parser.test.ts`. Validator consumption was proved by rebuilding and running the validators package after rebuilding world-index.
