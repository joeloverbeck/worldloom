# SPEC23STOSTACON-007: Update world-mcp role_in_story projection to closed list

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `tools/world-mcp/src/context-packet/shared.ts`, `tools/world-mcp/src/context-packet/story-bundle-context.ts`, package fixture/test truthing in `tools/world-mcp/tests/` and `tools/world-index/tests/`; same-seam SPEC-23 status note in `specs/SPEC-23-story-state-contract-taxonomies.md`
**Deps**: archive/tickets/SPEC23STOSTACON-006.md

## Problem

At intake, `tools/world-mcp/src/context-packet/shared.ts` declared `role_in_story: string` as part of the story-bundle context packet's entity projection. Post-SPEC23STOSTACON-006 the STENT schema's `role_in_story` is a closed 12-value list (array-of-enum). The TypeScript type at `shared.ts` did not match the canonical schema, and the projection at `tools/world-mcp/src/context-packet/story-bundle-context.ts` (`role_in_story: asString(entry.role_in_story)`) flattened the list to a string — discarding the multi-role information that the contract's sibling-scan surface (FOUNDATIONS §Story Bundles §7) depends on. This ticket aligned the TypeScript type and projection to the closed-list shape.

## Assumption Reassessment (2026-05-13)

1. Intake type state verified before implementation: `tools/world-mcp/src/context-packet/shared.ts` declared `role_in_story: string` on the story-bundle entity-projection interface. `tools/world-mcp/src/context-packet/story-bundle-context.ts` used `asString(entry.role_in_story)` to project the field — a string coercion that flattened any list / non-string value to a string.
2. Schema authority: post-SPEC23STOSTACON-006 the schema at `tools/validators/src/schemas/story-entity.schema.json` declares `role_in_story` as `type: "array"` with 12-value enum items.
3. Cross-artifact boundary under audit: the boundary is the world-mcp public context-packet shape. The interface defining the projection type is consumed by anything importing from `@worldloom/world-mcp` (build target verified: `tools/world-mcp/package.json` declares the package as `@worldloom/world-mcp`). Internal blast radius — `grep -rnE "role_in_story" tools/world-mcp/src tools/world-mcp/tests` — and external blast radius — `grep -rnE "role_in_story" tools/ --include="*.ts" | grep -v "/dist/" | grep -v "tools/world-mcp/"` — both bounded to a small set; verify at implementation.
4. Skill / tool / hook / validator field rename or removal (menu item 7 per `tickets/_TEMPLATE.md`): `role_in_story: string` → `role_in_story: RoleInStory[]` is a **breaking TypeScript change** to a public interface. Per the package boundary, this can require coordinated updates in `tools/patch-engine`, `tools/validators`, and any consumers of `@worldloom/world-mcp`. Blast radius grep pipeline-wide: `grep -rnE "role_in_story" tools/ --include="*.ts" | grep -v "/dist/"` returns only matches in `tools/world-mcp/src/context-packet/*.ts` and test fixtures. No external consumers; the change is internal to the `world-mcp` package.
5. Adjacent contradictions classification: (a) At intake, test fixtures at `tools/world-mcp/tests/tools/story-bundle-fixture.ts` and `tools/world-index/tests/helpers/atomic-fixture.ts` carried YAML text-literal `"role_in_story: protagonist"` — these are YAML source strings the fixture builders write to disk to construct test STENT records. The string `"protagonist"` is not in the contract's 12-value list, so this ticket updated the fixtures to canonical list-form YAML.
6. Broad `world-mcp` proof-surface truthing exposed stale same-family SPEC-23 assertions that were not caused by `role_in_story`: BEL schema-discovery tests omitted required `belief_mode`, one `create_bel_record` pre-apply fixture still used retired `confidence: suspected`, and one storylet schema-discovery assertion still expected retired `arc_contract` / `exit_portfolio` shape. These were absorbed as package-local proof-surface truthing because this ticket's acceptance required the full `world-mcp` suite to pass, and no active sibling ticket owns those completed-slice fixture drifts.

## Architecture Check

1. Aligning the TypeScript projection to the schema's array shape is cleaner than carrying a string-coerced view: the array shape preserves the multi-role information (a character can be both `viewpoint` and `primary_actor`); flattening to string discards that, and any caller reading the role for sibling-scan logic would need to re-parse a comma-separated string. The array shape removes that ambiguity.
2. No backwards-compatibility shim: TypeScript change is breaking; consumers must update to the new shape. No external consumers identified (per blast radius grep); the change is internal to world-mcp + its tests.

## Verification Layers

1. Type signature is `role_in_story: RoleInStory[]` in `shared.ts` → codebase grep-proof: `grep -nE "role_in_story:\s*RoleInStory\[\]" tools/world-mcp/src/context-packet/shared.ts` returns 1 match.
2. Type alias `RoleInStory` is exported with the 12-value canonical set → codebase grep-proof: `grep -nE "export type RoleInStory =" tools/world-mcp/src/context-packet/shared.ts` returns 1 match.
3. Projection in `story-bundle-context.ts:289` returns an array (not a string-coerced scalar) → codebase grep-proof: line 289 no longer uses `asString()` for `role_in_story`; instead uses a list projection helper (e.g., `asStringArray()` if available, or inline `Array.isArray(entry.role_in_story) ? entry.role_in_story : []`).
4. Test fixtures construct STENT YAML with canonical list-form `role_in_story: [primary_actor]` (or similar) → grep proves no fixtures use the non-canonical `protagonist` value.
5. world-mcp package builds + tests pass → `cd tools/world-mcp && npm run build && npm test`.

## Landed Changes

### 1. Update type signature in `tools/world-mcp/src/context-packet/shared.ts`

- Added `export type RoleInStory = "viewpoint" | "player_proxy" | "primary_actor" | "opposing_actor" | "allied_actor" | "authority" | "dependent" | "witness" | "information_source" | "pressure_source" | "social_bridge" | "background";`.
- Updated `role_in_story: string;` to `role_in_story: RoleInStory[];`.

### 2. Update projection in `tools/world-mcp/src/context-packet/story-bundle-context.ts`

- Replaced `role_in_story: asString(entry.role_in_story)` with `asRoleInStoryList(entry.role_in_story)`.
- Added `asRoleInStoryList(value: unknown): RoleInStory[]`, which:
  - returns `[]` for null / undefined / non-list, non-string values
  - filters array items to the canonical 12-value set
  - accepts legacy comma-separated strings only when each token is canonical
- Imported `RoleInStory` from `./shared.ts` at the top of `story-bundle-context.ts`.

### 3. Update test fixtures

- Updated `tools/world-mcp/tests/tools/story-bundle-fixture.ts` to use `role_in_story: [viewpoint, primary_actor]`.
- Updated `tools/world-index/tests/helpers/atomic-fixture.ts` to use `role_in_story: [primary_actor]`.

### 4. Add focused context-packet assertion

- Updated `tools/world-mcp/tests/context-packet/story-bundle-context.test.ts` to assert that the context packet returns `role_in_story` as `["viewpoint", "primary_actor"]`.

### 5. Truth stale SPEC-23 package proof fixtures

- Updated `tools/world-mcp/tests/integration/spec22-capstone.test.ts` and `tools/world-mcp/tests/tools/get-record-schema.test.ts` to expect required `belief_mode` and current `story-storylet.schema.json` shape.
- Updated `tools/world-mcp/tests/tools/validate-patch-plan.test.ts` to use a valid current BEL fixture with `belief_mode: believes` and `confidence: low`.

### 6. Re-run dependent package tests

The `world-index` package's tests also exercise STENT fixtures because `world-index` consumes the atomic-fixture helper. `world-index` did not need a code change, but its fixture and package proof moved with the canonical list-form `role_in_story` update.

## Files to Touch

- `tools/world-mcp/src/context-packet/shared.ts` (modify — type alias + interface field)
- `tools/world-mcp/src/context-packet/story-bundle-context.ts` (modify — projection)
- `tools/world-mcp/tests/tools/story-bundle-fixture.ts` (modify — YAML fixture text)
- `tools/world-mcp/tests/context-packet/story-bundle-context.test.ts` (modify — list projection assertion)
- `tools/world-mcp/tests/integration/spec22-capstone.test.ts` (modify — stale BEL required-field expectation)
- `tools/world-mcp/tests/tools/get-record-schema.test.ts` (modify — stale storylet / BEL schema-discovery expectations)
- `tools/world-mcp/tests/tools/validate-patch-plan.test.ts` (modify — stale BEL pre-apply fixture)
- `tools/world-index/tests/helpers/atomic-fixture.ts` (modify — YAML fixture text)
- `specs/SPEC-23-story-state-contract-taxonomies.md` (modify — implementation note / historicalized intake wording)

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
3. `tools/world-mcp/tests/context-packet/story-bundle-context.test.ts` — asserts the list projection helper returns `[viewpoint, primary_actor]` through the context-packet shape.
4. `tools/world-mcp/tests/integration/spec22-capstone.test.ts`, `tools/world-mcp/tests/tools/get-record-schema.test.ts`, and `tools/world-mcp/tests/tools/validate-patch-plan.test.ts` — same-family SPEC-23 proof fixtures updated to current BEL / SLT schema shape so the package-wide proof gate is truthful.

### Commands

1. `cd tools/world-mcp && npm run build && npm test` — full build + test pass.
2. `cd tools/world-index && npm test` — full test pass (consumer of the fixture helper).
3. `grep -rnE "role_in_story:\s*string" tools/world-mcp/src/ tools/world-index/src/` returns no matches.
4. `rg -n 'role_in_story:\s*protagonist|"role_in_story:\s*protagonist"' tools --glob '!**/dist/**'` returns no matches in source / test files.

## Outcome

Completed on 2026-05-13. `ContextPacketStoryBundleContext.cast_bind_list[].role_in_story` is now typed as `RoleInStory[]`, and `story-bundle-context.ts` projects STORY_KERNEL `cast_bind_list` roles through a canonical list filter instead of string coercion. The world-mcp and world-index STENT fixtures now use list-form canonical `role_in_story` values, and the context-packet test asserts the returned multi-role array. Same-family stale SPEC-23 package proof fixtures for BEL and SLT schema discovery were truthed so the full `world-mcp` suite can run cleanly. The SPEC-23 status note now records `SPEC23STOSTACON-007` as complete.

## Verification Result

1. `cd tools/world-mcp && npm run build` — PASS.
2. `cd tools/world-mcp && node --test dist/tests/context-packet/story-bundle-context.test.js` — PASS; 2 tests passed and the role projection assertion exercised `[viewpoint, primary_actor]`.
3. `cd tools/world-mcp && node --test dist/tests/tools/get-record-schema.test.js` — PASS; 9 tests passed after SPEC-23 stale schema-discovery fixture truthing.
4. `cd tools/world-mcp && npm test` — PASS; 352 tests passed.
5. `cd tools/world-index && npm run build` — PASS.
6. `cd tools/world-index && npm test` — PASS; 78 tests passed.
7. `cd tools/patch-engine && npm test` — PASS; 70 tests passed.
8. `rg -n 'role_in_story:\s*RoleInStory\[\]' tools/world-mcp/src/context-packet/shared.ts` — PASS; one match.
9. `rg -n 'export type RoleInStory =' tools/world-mcp/src/context-packet/shared.ts` — PASS; one match.
10. `rg -n 'role_in_story:\s*asString|role_in_story:\s*string' tools/world-mcp/src tools/world-index/src` — PASS; no matches.
11. `rg -n 'role_in_story:\s*protagonist|"role_in_story:\s*protagonist"' tools --glob '!**/dist/**'` — PASS; no matches.

## Deviations

1. The optional focused context-packet test was implemented in the existing `story-bundle-context.test.ts` rather than as a new test file.
2. `world-index` verification was run as `npm run build` followed by `npm test`, because the `world-index` `test` script runs compiled `dist/tests/**/*.test.js` but does not build first.
3. Broad `world-mcp` verification initially failed on stale same-family SPEC-23 proof fixtures unrelated to `role_in_story`; those were truthed in this ticket because the active acceptance gate required full `world-mcp` package tests to pass.
