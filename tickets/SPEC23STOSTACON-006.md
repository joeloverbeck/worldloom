# SPEC23STOSTACON-006: Add STENT.role_in_story + SREL.axis enums to story schemas

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `tools/validators/src/schemas/story-entity.schema.json`, `tools/validators/src/schemas/story-relationship.schema.json`
**Deps**: archive/tickets/SPEC23STOSTACON-001.md

## Problem

Two story-bundle schemas remain minimal shells that validate only `id` + `story_id`: `story-entity.schema.json` and `story-relationship.schema.json`. Post-SPEC23STOSTACON-001 the story-state contract:
- Defines `STENT.role_in_story` as a closed 12-value list (multi-valued field; new contract §3a / §4 sub-block per SPEC23STOSTACON-001 change 7), naming it as a sibling-scan shared surface per FOUNDATIONS §Story Bundles §7.
- Defines `SREL.axis` as a closed 14-value list lifted verbatim from `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts:58-73` (contract change 7).

Without schema validation, these closed lists are documentation only — a STENT record carrying `role_in_story: ["protagonist"]` (a non-canonical value) would pass schema validation, breaking the sibling-scan contract. This ticket adds schema enforcement on both fields atomically; the two schemas are touched in one ticket because they share the same shape (minimal-shell-plus-one-enum-property) and the same dependency (SPEC23STOSTACON-001 contract amendments).

## Assumption Reassessment (2026-05-13)

1. Current schema state verified: `tools/validators/src/schemas/story-entity.schema.json` lines 1-11 — `required: ["id", "story_id"]`, properties validate only patterns. `tools/validators/src/schemas/story-relationship.schema.json` lines 1-11 — identical minimal shell. Both have `additionalProperties: true`.
2. Contract authority: `.claude/skills/_shared-templates/story-state-contract.md` post-SPEC23STOSTACON-001 §3a (or §4 sub-block — exact heading determined by SPEC23STOSTACON-001 implementation) defines the 12-value `role_in_story` list and the 14-value `axis` list. The `axis` list mirrors `RELATIONSHIP_AXES` at `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts:58-73` verbatim.
3. Cross-artifact boundary under audit: STENT.role_in_story is consumed by (a) `tools/world-mcp/src/context-packet/shared.ts:131` (projection type — updated in SPEC23STOSTACON-007), (b) sibling-scan logic per FOUNDATIONS §Story Bundles §7, (c) `branching-story-bootstrap` skill prose. SREL.axis is consumed by predicate DSL evaluation (predicate-dsl-grammar's RELATIONSHIP_AXES is the same set) and by skill prose.
4. FOUNDATIONS principle motivating this ticket: Rule 1 (No Floating Facts). Closed lists in the contract are only load-bearing when enforced at schema-load time. FOUNDATIONS §Story Bundles §7 names role_in_story as a sibling-scan shared surface; schema validation makes that named surface enforceable.
5. Schema extension classification (menu item 6 per `tickets/_TEMPLATE.md`): both changes are **additive** to minimal-shell schemas. Currently `additionalProperties: true` means any value passes; this ticket constrains two specific fields without changing the additionalProperties posture for other fields. No production records exist, so no migration concerns.

## Architecture Check

1. Schema-level enforcement is cleaner than skill-prose-level reminders: closed lists named in the contract are nominally enforceable surfaces — without schema validation they degrade into authoring conventions that drift silently. The cost of adding an enum to a minimal-shell schema is one property block; the benefit is contract conformance at every commit.
2. No backwards-compatibility aliasing: the 12-value role_in_story list and the 14-value axis list are the closed sets. No old values to alias from.

## Verification Layers

1. Schema's `role_in_story.items.enum` has 12 values per contract §3a → `jq '.properties.role_in_story.items.enum | length' tools/validators/src/schemas/story-entity.schema.json` returns 12.
2. Schema's `role_in_story` is `type: array` (multi-valued) per contract intent → `jq '.properties.role_in_story.type' tools/validators/src/schemas/story-entity.schema.json` returns `"array"`.
3. Schema's `axis.enum` has 14 values matching `RELATIONSHIP_AXES` constants → `jq '.properties.axis.enum | length' tools/validators/src/schemas/story-relationship.schema.json` returns 14; cross-check `jq '.properties.axis.enum' tools/validators/src/schemas/story-relationship.schema.json` matches the 14 values in `predicate-dsl-grammar.ts:58-73`.
4. Validator package builds + tests pass → `cd tools/validators && npm run build && npm test`.

## What to Change

### 1. Add `role_in_story` validation to `story-entity.schema.json`

Update `tools/validators/src/schemas/story-entity.schema.json`:
- Keep `required` at lines 5: `["id", "story_id"]` (do NOT make `role_in_story` required; some STENT records may not carry role classifications, and the contract specifies it as a sibling-scan shared surface, not a universally-required field — confirm at SPEC23STOSTACON-001 implementation; if the contract marks it `*` required, update accordingly here).
- Add `role_in_story` property in the `properties` block:
  ```json
  "role_in_story": {
    "type": "array",
    "items": {
      "enum": [
        "viewpoint",
        "player_proxy",
        "primary_actor",
        "opposing_actor",
        "allied_actor",
        "authority",
        "dependent",
        "witness",
        "information_source",
        "pressure_source",
        "social_bridge",
        "background"
      ]
    }
  }
  ```
- Preserve `additionalProperties: true` (line 10).

### 2. Add `axis` validation to `story-relationship.schema.json`

Update `tools/validators/src/schemas/story-relationship.schema.json`:
- Keep `required` at line 5: `["id", "story_id"]`.
- Add `axis` property in the `properties` block:
  ```json
  "axis": {
    "enum": [
      "trust",
      "fear",
      "desire",
      "debt",
      "intimacy",
      "loyalty",
      "resentment",
      "power_imbalance",
      "attention",
      "familiarity",
      "approval",
      "respect",
      "obligation",
      "hostility"
    ]
  }
  ```
- Preserve `additionalProperties: true` (line 10).

### 3. Cross-check axis enum against predicate-dsl-grammar.ts

Confirm that the 14 values in `tools/validators/src/schemas/story-relationship.schema.json`'s `axis` enum exactly match `RELATIONSHIP_AXES` at `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts:58-73`. If they drift, the predicate DSL parser's relationship_axis predicate (per SPEC23STOSTACON-008) and the schema would disagree about which axis names are valid. The cross-check is a static implementation step; preserve the order and exact strings.

## Files to Touch

- `tools/validators/src/schemas/story-entity.schema.json` (modify)
- `tools/validators/src/schemas/story-relationship.schema.json` (modify)

## Out of Scope

- Updating `tools/world-mcp/src/context-packet/shared.ts` TypeScript type for `role_in_story` (`string` → `RoleInStory[]`) — SPEC23STOSTACON-007.
- Updating skill prose referencing `role_in_story` closed values — SPEC23STOSTACON-009.
- Adding nested validation for other STENT / SREL fields beyond `role_in_story` / `axis` — out of scope (the contract's STENT and SREL records are otherwise minimal; if other fields gain closed enums in a future spec, that's a follow-up).
- Pruning `predicate-dsl-grammar.ts` RELATIONSHIP_AXES — no prune needed; the 14 values are canonical.
- Contract amendment — `archive/tickets/SPEC23STOSTACON-001.md` (this ticket's dependency).

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/validators && npm run build && npm test` — full validators build + test pass.
2. STENT record with `role_in_story: ["viewpoint", "primary_actor"]` PASSes schema validation.
3. STENT record with `role_in_story: ["protagonist"]` (non-canonical value) FAILs schema validation.
4. SREL record with `axis: "trust"` PASSes schema validation; `axis: "love"` (non-canonical) FAILs.
5. Cross-check: `jq -r '.properties.axis.enum[]' tools/validators/src/schemas/story-relationship.schema.json | sort` matches `grep -E "^  \"[a-z_]+\"" tools/validators/src/rules/_shared/predicate-dsl-grammar.ts` extracted RELATIONSHIP_AXES values, sorted.

### Invariants

1. STENT.role_in_story is a closed list of 12 values; SREL.axis is a closed list of 14 values. Adding a value requires contract amendment (FOUNDATIONS §Story Bundles §5b).
2. SREL.axis values are exactly equal to predicate-dsl-grammar.ts RELATIONSHIP_AXES — schema enforcement and predicate DSL evaluation agree on the canonical axis set.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/record-schema-compliance-story-entity.test.ts` (path discovered at implementation; create if absent) — fixtures: PASS for valid role_in_story; FAIL for non-canonical value.
2. `tools/validators/tests/structural/record-schema-compliance-story-relationship.test.ts` — fixtures: PASS for each of 14 axis values; FAIL for non-canonical.

### Commands

1. `cd tools/validators && npm run build && npm test` — full validators build + test pass.
2. `jq '.properties.role_in_story.items.enum | length' tools/validators/src/schemas/story-entity.schema.json` returns 12.
3. `jq '.properties.axis.enum | length' tools/validators/src/schemas/story-relationship.schema.json` returns 14.
4. `diff <(jq -r '.properties.axis.enum[]' tools/validators/src/schemas/story-relationship.schema.json | sort) <(awk '/RELATIONSHIP_AXES = \[/,/\] as const/' tools/validators/src/rules/_shared/predicate-dsl-grammar.ts | grep -oE '"[a-z_]+"' | tr -d '"' | sort)` returns empty (no diff).
