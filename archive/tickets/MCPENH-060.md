# MCPENH-060: Extend world-index enumerator `STORY_SOURCE_DIRECTORIES` to recognize the SPEC-42/47 story-bundle classes (`clocks` / `secrets` / `story-questions` / `emotions` / `plans`)

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — `tools/world-index/src/enumerate.ts` (modify; `STORY_SOURCE_DIRECTORIES` gains `clocks`, `secrets`, `story-questions`, `emotions`, `plans`); `tools/world-index/tests/enumerate.test.ts` (modify; positive cases per class); `tools/world-index/tests/helpers/atomic-fixture.ts` (modify; fixture gains CLK/STSEC/STQ/STEMO/STPLAN records); `tools/world-index/tests/commands.test.ts` (modify; zero-unexpected-warnings assertion after build); `tools/world-index/tests/integration/spec47-stplan-stemo-edges-integration.test.ts` (modify; scope its edge-count query to its owned story fixture after the shared fixture gained STPLAN/STEMO records)
**Deps**: `archive/tickets/MCPENH-056.md` (immediate precedent — same enumerator-co-update mechanism for `beliefs` + `pages-prose-receipts`); `archive/tickets/MCPENH-044-register-belief-record-class-in-world-index.md` (root precedent — parser registered a story-bundle class without co-updating the enumerator); `archive/tickets/MCPENH-037-extend-world-index-inventory-with-story-bundle-markdown-paths.md` (inventory-extension pattern + test-touching shape)

## Problem

At intake, during a `branching-story-bootstrap` run this session (bundle `erotica-world/stories/red-bunny`), `mcp__worldloom__get_context_packet(task_type='story_bootstrap', ...)` returned `open_risks` containing five `unexpected_path` warnings for legitimate story-bundle records: `stories/red-bunny-old/_source/{story-questions,secrets,emotions,clocks}/*.yaml`. The bootstrap then committed `CLK-1`, `STSEC-1`, and `STEMO-1..4` into the new `red-bunny` bundle — records whose `_source/` subdirectories the world-index enumerator did not classify as indexable before this ticket.

Before this ticket, `tools/world-index/src/enumerate.ts` `STORY_SOURCE_DIRECTORIES` enumerated seventeen story-bundle record-class subdirectories but omitted the five SPEC-42 (`clocks` → CLK, `secrets` → STSEC, `story-questions` → STQ) and SPEC-47 (`plans` → STPLAN, `emotions` → STEMO) classes. Because `isIndexablePath` returned `false` for the 5-segment `stories/<slug>/_source/{clocks,secrets,story-questions,emotions,plans}/*.yaml` paths, every such file was pushed to `unexpected` rather than `indexable`. This produced chronic `unexpected_path` warnings on every build of any bundle using these classes AND — load-bearing — kept the records out of the `indexable` set that `world-index build` feeds to the parser, so committed pressure-clocks, story-secrets, story-questions, plans, and emotions were silently invisible to MCP retrieval (`get_record`, `list_records`, graph edges) that downstream `branching-story-turn-cycle` and `branching-story-health-audit` depend on.

This is the exact mechanism gap MCPENH-044 → MCPENH-056 closed for `beliefs`: a new story-bundle record class registered on the parser side (`atomic.ts` STORY_DIRS) and schema side (`types.ts` NODE_TYPES) without co-updating the enumerator. MCPENH-056 closed only `beliefs` + `pages-prose-receipts`; the five SPEC-42/47 classes remain open.

## Assumption Reassessment (2026-05-20)

1. **Codebase reassessment.** At intake, `tools/world-index/src/enumerate.ts` `STORY_SOURCE_DIRECTORIES` contained `entities, status, beliefs, facts, events, obligations, consequences, threads, relationships, intentions, locations, objects, branches, pages, choices, storylets, artifacts` and omitted `clocks`, `secrets`, `story-questions`, `emotions`, `plans`. The parser side already registered all five: `tools/world-index/src/parse/atomic.ts` `STORY_DIRS` maps `clocks → pressure_clock_record`, `secrets → story_secret_record`, `story-questions → story_question_record`, `plans → story_plan_record`, `emotions → story_emotion_record`; `tools/world-index/src/schema/types.ts` NODE_TYPES contains all five node types. So the parser/schema surfaces were functional and only the enumerator was stale — identical to MCPENH-056's `beliefs` finding.
2. **Doc reassessment.** `docs/FOUNDATIONS.md` §Story Bundles §6 (Story-Bundle ID Classes) enumerates `CLK, STSEC, STQ ... STPLAN, STEMO` as canonical per-bundle record classes; `.claude/skills/_shared-templates/story-record-schemas.md` §4.5.14–§4.5.18 define their schemas; `branching-story-bootstrap` writes them through `create_clk_record` / `create_stsec_record` / `create_stq_record` / `create_stplan_record` / `create_stemo_record` patch ops. None of the five subdirectories is exotic or undocumented at the contract level.
3. **Shared boundary.** The boundary under audit is the world-index enumerator surface (`enumerate.ts` `isIndexablePath` / `STORY_SOURCE_DIRECTORIES`) vs. its parser surface (`atomic.ts` STORY_DIRS). These two surfaces must co-evolve when a story-bundle record class lands; MCPENH-044 (BEL) and the SPEC-42/47 landings updated the parser/schema/patch-engine/validators without updating the enumerator, leaving the same parser-without-enumerator drift this ticket closes. MCPENH-056's Assumption Reassessment names this precise drop-rule precedent.
4. **FOUNDATIONS principle.** §Story Bundles §6 declares these five classes canonical, and §5b (schema-minimalism) makes every retained class load-bearing; §Tooling Recommendation requires retrieval completeness ("never operate on prose alone"). An enumerator that omits documented canonical classes silently breaks retrieval completeness — committed records exist on disk but are invisible to the index and to every MCP read the downstream story-pipeline skills rely on. The fix restores the index inventory to honor the documented class set.
5. **Adjacent contradictions surfaced during reassessment.** This is the third instance (BEL, then this batch of five) of `STORY_SOURCE_DIRECTORIES` manually duplicating the `STORY_DIRS` key set and drifting behind it. Classify as **future cleanup that must become its own ticket**: derive `STORY_SOURCE_DIRECTORIES` from the parser-side story directory authority (single source of truth) so a new story-bundle class can never again be parser-registered-but-enumerator-omitted. That refactor is out of scope here (this ticket is the additive close for the five currently-missing classes); the structural fix is logged as `tickets/MCPENH-061.md`.
6. **Package proof reassessment.** Pre-edit `npm test` from `tools/world-index/` passed with 125 tests, so the broad package lane was green before implementation. After the shared atomic fixture gained STPLAN/STEMO records, the SPEC-47 integration count helper needed a same-seam proof fix: it was counting all plan/emotion edges in the fixture world, not only its owned `spec47-edges` story. The landed query now filters by `story_slug = 'spec47-edges'`, preserving the test's intended boundary.

## Architecture Check

1. The additive fix — five new entries in the existing `STORY_SOURCE_DIRECTORIES` set — is structurally parallel to MCPENH-056's `beliefs` addition and reuses the existing 5-segment `isIndexablePath` branch unchanged (`STORY_SOURCE_DIRECTORIES.has(sourceDirectory)`). No new branch, no `isIndexablePath` refactor. The cleaner-but-larger alternative (derive the set from `STORY_DIRS.keys()`) is deliberately deferred to the item-5 follow-up so this HIGH-priority retrieval-visibility gap closes with minimal blast radius.
2. No backwards-compatibility aliasing or shims: the change is a pure set extension; previously-`unexpected` files become `indexable` with no migration path or dual-read.

## Verification Layers

1. `enumerate.ts` `STORY_SOURCE_DIRECTORIES` contains all five classes → codebase grep-proof (`grep -nE '"clocks"|"secrets"|"story-questions"|"emotions"|"plans"' tools/world-index/src/enumerate.ts` returns five set entries).
2. `stories/<slug>/_source/{clocks,secrets,story-questions,emotions,plans}/<ID>.yaml` are each classified `indexable` → unit tests in `enumerate.test.ts` (one positive case per class using representative CLK/STSEC/STQ/STEMO/STPLAN paths).
3. A built world containing all five classes emits zero `unexpected_path` warnings for them → `commands.test.ts` zero-unexpected-warnings assertion after build (parallel to the MCPENH-056 assertion).
4. The enumerator class set matches the documented §Story Bundles §6 class set → FOUNDATIONS alignment check (the five classes are present in `STORY_DIRS`, NODE_TYPES, and now `STORY_SOURCE_DIRECTORIES`).

## Landed Changes

### 1. Added the five SPEC-42/47 subdirectories to `STORY_SOURCE_DIRECTORIES`

In `tools/world-index/src/enumerate.ts`, added `"clocks"`, `"secrets"`, `"story-questions"`, `"plans"`, and `"emotions"` to the `STORY_SOURCE_DIRECTORIES` set so the existing 5-segment `isIndexablePath` branch classifies their `*.yaml` files as `indexable`.

### 2. Extended test coverage

- `enumerate.test.ts` — added one positive case per class (`stories/<slug>/_source/clocks/CLK-0001.yaml` → `indexable`, etc.) and kept negative cases for genuinely-unknown story-bundle paths.
- `tests/helpers/atomic-fixture.ts` — extended the story-bundle fixture with one record per new class (CLK / STSEC / STQ / STPLAN / STEMO) so the build-regression assertion exercises them.
- `commands.test.ts` — asserts zero SPEC-42/47 `unexpected_path` warnings after building the extended fixture.
- `spec47-stplan-stemo-edges-integration.test.ts` — scopes its edge-count query to the test-owned story slug so the shared fixture can contain independent STPLAN/STEMO records without polluting the integration count.

## Files to Touch

- `tools/world-index/src/enumerate.ts` (modify)
- `tools/world-index/tests/enumerate.test.ts` (modify)
- `tools/world-index/tests/helpers/atomic-fixture.ts` (modify)
- `tools/world-index/tests/commands.test.ts` (modify)
- `tools/world-index/tests/integration/spec47-stplan-stemo-edges-integration.test.ts` (modify)

## Out of Scope

- Deriving `STORY_SOURCE_DIRECTORIES` from the parser-side story directory authority (the recurrence-prevention refactor) — logged as `tickets/MCPENH-061.md`.
- Parser (`atomic.ts`) and schema (`types.ts`) registration — already complete for all five classes.
- Any MCP retrieval-tool change — records become retrievable via the existing `get_record` / `list_records` surfaces once the enumerator feeds them to the parser; no tool signature changes.
- Re-indexing or migrating already-committed bundles (e.g., `red-bunny`) — a re-build picks up the now-indexable files; no data migration is in scope.

## Acceptance Criteria

### Tests That Must Pass

1. `node --test dist/tests/enumerate.test.js` — new per-class positive cases for CLK/STSEC/STQ/STEMO/STPLAN paths pass.
2. `node --test dist/tests/commands.test.js` — zero `unexpected_path` warnings after building the extended fixture.
3. `cd tools/world-index && npm run build && npm test` — full compiled suite passes.

### Invariants

1. Every story-bundle record-class subdirectory registered in `atomic.ts` `STORY_DIRS` is also present in `enumerate.ts` `STORY_SOURCE_DIRECTORIES` (no parser-without-enumerator drift).
2. A `*.yaml` file under any of the five subdirectories is classified `indexable`, never `unexpected`.

## Test Plan

### New/Modified Tests

1. `tools/world-index/tests/enumerate.test.ts` — five positive cases (one per new class) confirming `isIndexablePath` returns `true`.
2. `tools/world-index/tests/helpers/atomic-fixture.ts` — fixture extended with one CLK/STSEC/STQ/STPLAN/STEMO record each.
3. `tools/world-index/tests/commands.test.ts` — zero-unexpected-warnings assertion after build, mirroring MCPENH-056.
4. `tools/world-index/tests/integration/spec47-stplan-stemo-edges-integration.test.ts` — edge-count query scoped to the test-owned story slug after the shared atomic fixture gained STPLAN/STEMO records.

### Commands

1. `cd tools/world-index && npm run build && node --test dist/tests/enumerate.test.js`
2. `cd tools/world-index && npm run build && node --test dist/tests/commands.test.js`
3. `cd tools/world-index && npm test` (package-wide compiled suite; `npm run build` is invoked separately because the world-index `test` script does not chain a build)

## Outcome

Completed on 2026-05-20.

`tools/world-index/src/enumerate.ts` now treats `stories/<story-slug>/_source/{clocks,secrets,story-questions,plans,emotions}/*.yaml` as indexable story-bundle source records. The enumeration unit test covers all five path families directly, and the atomic command fixture now contains representative CLK, STSEC, STQ, STPLAN, and STEMO records so the build path proves those files no longer produce `unexpected_path` rows.

The shared fixture expansion also exposed a stale SPEC-47 integration-test assumption: its edge-count query was package-wide for plan/emotion edge types rather than scoped to the test-owned story slug. That query now filters to `spec47-edges`, preserving the integration test's intended STPLAN/STEMO edge contract while allowing the shared fixture to carry independent plan/emotion records.

## Verification Result

1. Pre-edit baseline: `npm test` from `tools/world-index/` — passed; 125 tests passed.
2. `npm run build` from `tools/world-index/` — passed.
3. `node --test dist/tests/enumerate.test.js` from `tools/world-index/` — passed; 3 tests passed.
4. `node --test dist/tests/commands.test.js` from `tools/world-index/` — passed; 3 tests passed.
5. First broad post-edit run: `npm test` from `tools/world-index/` — failed in `SPEC-47/SPEC-49 STPLAN/STEMO edge integration builds all story edge rows` because the integration query counted STPLAN/STEMO edges from the newly extended shared fixture as well as its own story.
6. After scoping the SPEC-47 query: `npm run build` from `tools/world-index/` — passed.
7. `node --test dist/tests/integration/spec47-stplan-stemo-edges-integration.test.js` from `tools/world-index/` — passed; 1 test passed.
8. `node --test dist/tests/enumerate.test.js` from `tools/world-index/` — passed; 3 tests passed.
9. `node --test dist/tests/commands.test.js` from `tools/world-index/` — passed; 3 tests passed.
10. Final broad proof: `npm test` from `tools/world-index/` — passed; 125 tests passed. Output still includes the existing intentional fixture diagnostics for one schema-pattern skip and one legacy-world rejection.
11. Manual package surface review: `tools/world-index/README.md`, `docs/WORKFLOWS.md`, and `docs/MACHINE-FACING-LAYER.md` do not document `STORY_SOURCE_DIRECTORIES` as a user-facing command surface; no package README or repo-doc update was required.

## Deviations

- The landed file set includes `tools/world-index/tests/integration/spec47-stplan-stemo-edges-integration.test.ts`, which was not in the original file list. This was same-seam proof fallout from extending the shared atomic fixture with STPLAN/STEMO records.
- The original plan listed `emotions` before `plans`; the landed set order follows the parser-side `STORY_DIRS` order for this class group: `clocks`, `secrets`, `story-questions`, `plans`, `emotions`.
- `tools/world-index/dist/` was refreshed by `npm run build`; it is an ignored generated artifact, not a tracked owned edit.
