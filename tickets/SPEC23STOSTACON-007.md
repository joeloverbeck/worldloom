# SPEC23STOSTACON-007: Update world-mcp role_in_story projection to closed list

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `tools/world-mcp/src/context-packet/shared.ts`, `tools/world-mcp/src/context-packet/story-bundle-context.ts`
**Deps**: archive/tickets/SPEC23STOSTACON-006.md

## Problem

`tools/world-mcp/src/context-packet/shared.ts:131` declares `role_in_story: string` as part of the story-bundle context packet's entity projection. Post-SPEC23STOSTACON-006 the STENT schema's `role_in_story` is a closed 12-value list (array-of-enum). The TypeScript type at `shared.ts` does not match the canonical schema, and the projection at `tools/world-mcp/src/context-packet/story-bundle-context.ts:289` (`role_in_story: asString(entry.role_in_story)`) flattens the list to a string — discarding the multi-role information that the contract's sibling-scan surface (FOUNDATIONS §Story Bundles §7) depends on. This ticket aligns the TypeScript type and the projection to the closed-list shape.

## Assumption Reassessment (2026-05-13)

1. Current type state verified: `tools/world-mcp/src/context-packet/shared.ts:131` declares `role_in_story: string` on the story-bundle entity-projection interface. `tools/world-mcp/src/context-packet/story-bundle-context.ts:289` uses `asString(entry.role_in_story)` to project the field — a string coercion that flattens any list / non-string value to a string.
2. Schema authority: post-SPEC23STOSTACON-006 the schema at `tools/validators/src/schemas/story-entity.schema.json` declares `role_in_story` as `type: "array"` with 12-value enum items.
3. Cross-artifact boundary under audit: the boundary is the world-mcp public context-packet shape. The interface defining the projection type is consumed by anything importing from `@worldloom/world-mcp` (build target verified: `tools/world-mcp/package.json` declares the package as `@worldloom/world-mcp`). Internal blast radius — `grep -rnE "role_in_story" tools/world-mcp/src tools/world-mcp/tests` — and external blast radius — `grep -rnE "role_in_story" tools/ --include="*.ts" | grep -v "/dist/" | grep -v "tools/world-mcp/"` — both bounded to a small set; verify at implementation.
4. Skill / tool / hook / validator field rename or removal (menu item 7 per `tickets/_TEMPLATE.md`): `role_in_story: string` → `role_in_story: RoleInStory[]` is a **breaking TypeScript change** to a public interface. Per the package boundary, this can require coordinated updates in `tools/patch-engine`, `tools/validators`, and any consumers of `@worldloom/world-mcp`. Blast radius grep pipeline-wide: `grep -rnE "role_in_story" tools/ --include="*.ts" | grep -v "/dist/"` returns only matches in `tools/world-mcp/src/context-packet/*.ts` and test fixtures. No external consumers; the change is internal to the `world-mcp` package.
5. Adjacent contradictions classification: (a) Test fixtures at `tools/world-mcp/tests/tools/story-bundle-fixture.ts` lines 66, 321 and `tools/world-index/tests/helpers/atomic-fixture.ts` line 130 carry YAML text-literal `"role_in_story: protagonist"` — these are YAML source strings the fixture builders write to disk to construct test STENT records. The string `"protagonist"` is not in the contract's 12-value list; either the fixtures need updating to a canonical value (e.g., `viewpoint` or `primary_actor`) OR they should write a list-form YAML (`role_in_story: [primary_actor]`). Required consequence of this ticket; fix inline.

## Architecture Check

1. Aligning the TypeScript projection to the schema's array shape is cleaner than carrying a string-coerced view: the array shape preserves the multi-role information (a character can be both `viewpoint` and `primary_actor`); flattening to string discards that, and any caller reading the role for sibling-scan logic would need to re-parse a comma-separated string. The array shape removes that ambiguity.
2. No backwards-compatibility shim: TypeScript change is breaking; consumers must update to the new shape. No external consumers identified (per blast radius grep); the change is internal to world-mcp + its tests.

## Verification Layers

1. Type signature is `role_in_story: RoleInStory[]` in `shared.ts` → codebase grep-proof: `grep -nE "role_in_story:\s*RoleInStory\[\]" tools/world-mcp/src/context-packet/shared.ts` returns 1 match.
2. Type alias `RoleInStory` is exported with the 12-value canonical set → codebase grep-proof: `grep -nE "export type RoleInStory =" tools/world-mcp/src/context-packet/shared.ts` returns 1 match.
3. Projection in `story-bundle-context.ts:289` returns an array (not a string-coerced scalar) → codebase grep-proof: line 289 no longer uses `asString()` for `role_in_story`; instead uses a list projection helper (e.g., `asStringArray()` if available, or inline `Array.isArray(entry.role_in_story) ? entry.role_in_story : []`).
4. Test fixtures construct STENT YAML with canonical list-form `role_in_story: [primary_actor]` (or similar) → grep proves no fixtures use the non-canonical `protagonist` value.
5. world-mcp package builds + tests pass → `cd tools/world-mcp && npm run build && npm test`.

## What to Change

### 1. Update type signature in `tools/world-mcp/src/context-packet/shared.ts`

- Add `export type RoleInStory = "viewpoint" | "player_proxy" | "primary_actor" | "opposing_actor" | "allied_actor" | "authority" | "dependent" | "witness" | "information_source" | "pressure_source" | "social_bridge" | "background";` near the top of `shared.ts` (or in a logical typedef block).
- Update line 131 `role_in_story: string;` → `role_in_story: RoleInStory[];`.

### 2. Update projection in `tools/world-mcp/src/context-packet/story-bundle-context.ts`

- Replace `role_in_story: asString(entry.role_in_story)` at line 289 with a list-projection. Recommended approach: introduce an `asRoleInStoryList(value: unknown): RoleInStory[]` helper that:
  - returns `[]` for null / undefined
  - if `Array.isArray(value)`, filters items that match the canonical 12-value set
  - if `typeof value === "string"` (legacy single-string atomic record), splits on comma, trims, and filters to canonical values
- Import `RoleInStory` from `./shared.ts` at the top of `story-bundle-context.ts`.

### 3. Update test fixtures

- `tools/world-mcp/tests/tools/story-bundle-fixture.ts` lines 66, 321: change `"role_in_story: protagonist"` to canonical-list YAML form (e.g., `"role_in_story:\n  - primary_actor"` or YAML inline-list `"role_in_story: [primary_actor]"`).
- `tools/world-index/tests/helpers/atomic-fixture.ts` line 130: same update (this fixture is owned by `world-index` package but is updated here because the fixture's YAML strings drive STENT-record builders consumed by both `world-index` and `world-mcp` tests — the canonical-list update is single-change).

### 4. Re-run dependent package tests

After the change lands in `world-mcp`, the `world-index` package's tests also exercise STENT fixtures (because `world-index` consumes the atomic-fixture helper). Verify `cd tools/world-index && npm test` passes; if it doesn't, the change has missed a fixture or a consumer. Note: `world-index` does not need a code change, but its tests must still pass.

## Files to Touch

- `tools/world-mcp/src/context-packet/shared.ts` (modify — type alias + interface field)
- `tools/world-mcp/src/context-packet/story-bundle-context.ts` (modify — projection)
- `tools/world-mcp/tests/tools/story-bundle-fixture.ts` (modify — YAML fixture text)
- `tools/world-index/tests/helpers/atomic-fixture.ts` (modify — YAML fixture text)

## Out of Scope

- Patch-engine ops that mutate STENT.role_in_story — `tools/patch-engine/src/ops/create-story-record.ts` is generic and doesn't introspect role_in_story; no patch-engine change needed.
- Skill prose updates referencing role_in_story closed values — SPEC23STOSTACON-009.
- Schema validation of role_in_story — archive/tickets/SPEC23STOSTACON-006.md (this ticket's dependency).
- Contract amendment — `archive/tickets/SPEC23STOSTACON-001.md`.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/world-mcp && npm run build && npm test` — full world-mcp build + test pass.
2. `cd tools/world-index && npm test` — full world-index test pass (fixtures used by world-index are correctly updated).
3. `cd tools/patch-engine && npm test` — full patch-engine test pass (regression check; no expected impact).
4. TypeScript compilation succeeds with the new `role_in_story: RoleInStory[]` type — `cd tools/world-mcp && npm run build`.
5. `grep -nE "role_in_story.*string" tools/world-mcp/src/context-packet/shared.ts` returns no matches (the old `: string` annotation is gone).

### Invariants

1. The world-mcp public context-packet interface's `role_in_story` field is `RoleInStory[]`. Any caller depending on the old `string` shape must update.
2. Test fixtures construct STENT records with canonical `role_in_story` values from the closed 12-value list. The non-canonical `"protagonist"` value no longer appears in test YAML strings.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/tools/story-bundle-fixture.ts` — fixture YAML updated to use canonical list-form role_in_story.
2. `tools/world-index/tests/helpers/atomic-fixture.ts` — same update.
3. (Optional) New test in `tools/world-mcp/tests/context-packet/` exercising the list-projection helper: STENT record with `role_in_story: [viewpoint, primary_actor]` returns a 2-element array via the context-packet shape.

### Commands

1. `cd tools/world-mcp && npm run build && npm test` — full build + test pass.
2. `cd tools/world-index && npm test` — full test pass (consumer of the fixture helper).
3. `grep -rnE "role_in_story:\s*string" tools/world-mcp/src/ tools/world-index/src/` returns no matches.
4. `grep -rnE '"role_in_story:\s*protagonist"' tools/` returns no matches in source / test files.
