# SPEC100MANSTOSTU-009: Capstone end-to-end verification — AC 1-9 smoke test + manual-dry-run runbook

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: None — capstone test only; no production code.
**Deps**: SPEC100MANSTOSTU-004, SPEC100MANSTOSTU-007, SPEC100MANSTOSTU-008

## Problem

SPEC-100 §7 lists nine acceptance criteria that verify the spec's deliverables end-to-end: package builds + tests pass; backend exposes the three routes; POST registration outside `wrapRouterWritable` throws at registration time; sandbox rejects malicious inputs; `enumerate.ts` excludes `manual-stories/` from world-index enumeration; `world-index build <world>` after creating a manual story emits zero `unexpected_path` warn rows; frontend world picker / list / create work end-to-end; startup banner appears in backend logs and frontend dashboard; package README documents the verified Hook 3 / Hook 2 / lowercase-ID posture. This capstone composes ticket 004 (enumerate.ts) + ticket 007 (manual-stories routes) + ticket 008 (frontend) into a single verification surface — leaf-set Deps per `spec-to-tickets/SKILL.md` §Spec-Integration Ticket Shape's transitive-DAG note (the three leaves transitively cover 001, 002, 003, 005, 006). Per the §Manual-dry-run capstone variant, this ticket's test file is a hybrid: a manual-dry-run runbook (header comment) + an automated body covering grep-proofs and structural assertions that ARE test-suite-runnable.

## Assumption Reassessment (2026-05-30)

1. The leaf set {004, 007, 008} transitively covers every prior implementation ticket in this batch. Specifically: 007's `Deps:003,005,006` reaches 003, 005, 006; 006's `Deps:001,002,005` reaches 001, 002; 008's `Deps:001` reaches 001 (redundantly); 004 is independent. Together the closure is {001, 002, 003, 004, 005, 006, 007, 008}, which is every implementation ticket. SPEC-100 §7's 9 acceptance criteria collectively exercise all of those surfaces; this capstone is the gate that confirms they compose.
2. SPEC-100 §6 Build & test specifies the verification commands: `cd tools/manual-story-studio && npm test` (chains build:backend + backend tests + web test); `cd tools/world-index && npm test` (confirms ticket 004's enumerate exclusion); manual cold-start `node tools/manual-story-studio/dist/src/cli.js --port 5175 --repo-root <repo-root>` + open `http://127.0.0.1:5176` for the Vite dev server. AC #6 ("Running `world-index build <world>` after creating a manual story emits zero `unexpected_path` warn rows") is the load-bearing integration test that combines ticket 004's exclusion with ticket 007's POST handler.
3. **Cross-skill / cross-artifact boundary**: this ticket exercises every shared boundary established in this batch — route fence (002), filesystem sandbox (003), read backends (005), HTTP server (006), manual-stories routes (007), frontend shell (008), world-index enumerate exclusion (004). The shared invariant: a single end-to-end run (boot backend → boot frontend → create manual story via UI → run `world-index build` → check warn-row count) must pass with zero `unexpected_path` rows for the new manual-story files AND with the new manual story persisted on disk AND with the route fence intact (no boot-time errors).
4. **FOUNDATIONS principles restated** — three principles are exercised by AC #9 (verified-posture documentation), through the capstone's grep-proof verification of the package README content: (a) §Tooling Recommendation — externalized LLM realized across the process boundary; (b) §Story Bundles §4 Write Discipline — Hook 3 `_source/`-only pattern naturally excludes `manual-stories/`, in-tool sandbox is the primary write guard; (c) §Story Bundles §6 Story-Bundle ID Classes — lowercase `m`-prefix discipline structurally avoids collision with the world-index uppercase regexes. The capstone's grep assertions over `tools/manual-story-studio/README.md` confirm all three are documented at their verified-posture surface.

## Architecture Check

1. **Capstone composes existing tests, doesn't reimplement them**: ticket 002 tests the write-scope fence; ticket 003 tests the sandbox; ticket 004 tests the enumerate exclusion in isolation; this capstone tests that all three compose. Reimplementing the unit-test cases here would be duplication; this ticket adds only the cross-ticket integration assertions that no upstream unit test covers.
2. **Manual-dry-run runbook for skill-equivalent surfaces (none here, but the variant is partially applicable)**: AC #7 (frontend end-to-end: world picker → list → create → list-updated) requires browser interaction (Vite dev server + backend running together), which is not test-suite-runnable from `node --test`. Per the §Manual-dry-run capstone variant, the runbook portion documents these steps in the test file's header comment; the automated body covers everything else.
3. **Fixture-world copy strategy avoids real-canon mutation**: AC #5 + AC #6 require running `world-index build` against a fixture world with `manual-stories/<slug>/manual-story.yaml` present. Use `fs.cpSync` to copy a known small world (`worlds/animalia/` is the smallest published world per FOUNDATIONS history; or use a synthetic minimal fixture) to a temp root, exercise the POST + build chain against the copy, and never touch the real `worlds/` tree.
4. No backwards-compatibility aliasing/shims introduced — capstone test is new.

## Verification Layers

1. AC #1 (package builds + tests pass) → automated: `cd tools/manual-story-studio && npm test` exits 0.
2. AC #2 (backend exposes the three routes; no others) → automated: integration test enumerates `server.printRoutes()` (or equivalent) and asserts the route table contains exactly `GET /api/worlds`, `GET /api/worlds/:slug/manual-stories`, `POST /api/worlds/:slug/manual-stories` (plus Fastify's auto-generated `HEAD` siblings + static-serve catchall).
3. AC #3 (POST registration outside `wrapRouterWritable` throws) → upstream test in ticket 002 already proves; capstone asserts the boot path uses the wrapper (grep-proof on `http.ts`).
4. AC #4 (sandbox rejects malicious inputs) → upstream tests in ticket 003 already prove; capstone asserts the POST route calls `assertInsideSandbox` (grep-proof on `routes/manual-stories.ts`).
5. AC #5 (`enumerate.ts` excludes `manual-stories/`; fixture-world test) → upstream test in ticket 004 already proves; capstone reruns the integration: create a manual story via the POST route, then call `enumerate(fixtureRoot)` and assert zero `manual-stories/`-prefixed paths in `unexpected`.
6. AC #6 (`world-index build <fixtureWorld>` emits zero `unexpected_path` warn rows after creating a manual story) → automated: run the `world-index build` CLI against the fixture root, then SELECT `code, file_path` FROM `validation_results` WHERE `validator_name = 'enumeration'` AND `file_path LIKE 'manual-stories/%'` → assert zero rows.
7. AC #7 (frontend end-to-end) → manual-dry-run runbook in test file header.
8. AC #8 (startup banner in backend logs + frontend dashboard) → automated: capture backend stderr at boot, grep for the 5 banner lines; grep `web/src/App.tsx` for the 4 banner lines (frontend half).
9. AC #9 (package README documents the verified Hook 3 / Hook 2 / lowercase-ID posture) → automated: grep `tools/manual-story-studio/README.md` for "Hook 3 (`tools/hooks/src/hook3-guard-direct-edit.ts`" + "Hook 2" + "lowercase" + "isAtomicSourceYaml" + "ALWAYS_PROTECTED_FILES" — confirms the verified posture content lands.

## What to Change

### 1. Create `tools/manual-story-studio/test/capstone-spec100.test.ts`

The test file has the structure:

```typescript
/**
 * Manual Studio capstone: SPEC-100 acceptance criteria 1-9.
 *
 * Automated assertions (run via `cd tools/manual-story-studio && npm test`):
 *   - AC #1, #2, #5, #6, #8 (backend half), #9: covered below by `node:test` cases.
 *   - AC #3, #4: upstream unit-test coverage in tickets 002, 003; this capstone
 *     adds grep-proofs that the wrapper + sandbox are actually wired into the
 *     POST handler.
 *
 * Manual dry-run runbook (AC #7 frontend end-to-end; AC #8 frontend banner display):
 *
 *   Prerequisite: this test file passes via `cd tools/manual-story-studio && npm test`.
 *
 *   Step 1. Build everything:
 *     cd tools/manual-story-studio && npm run build
 *
 *   Step 2. Boot the backend against the real repo root (do NOT mutate canon):
 *     node tools/manual-story-studio/dist/src/cli.js --port 5175 --repo-root <repo-root>
 *     # Confirm stderr shows the 5-line banner.
 *     # Leave running in one terminal.
 *
 *   Step 3. Boot the Vite dev server in a second terminal:
 *     cd tools/manual-story-studio/web && npm run dev
 *     # Confirm "Local: http://127.0.0.1:5176/" appears.
 *
 *   Step 4. Open http://127.0.0.1:5176 in a browser.
 *     # Confirm: (a) the 4-line frontend banner appears at the top of the page;
 *     #         (b) the world picker lists worlds from the real repo root;
 *     #         (c) clicking a world navigates to its manual-stories list.
 *
 *   Step 5. Create a manual story in a temp world (NOT in real canon):
 *     # Pre-step: create a temp world directory under <repo-root>/worlds/test-capstone-world/
 *     #          with at minimum a WORLD_KERNEL.md placeholder.
 *     # In the UI: open the test-capstone-world manual-stories list, click "Create Manual Story",
 *     #          enter slug "test-story", title "Test Capstone Story", submit.
 *     # Confirm: 201 response, redirect to list view, new entry shows in the list.
 *
 *   Step 6. Confirm filesystem state:
 *     ls <repo-root>/worlds/test-capstone-world/manual-stories/test-story/manual-story.yaml
 *     # File exists.
 *
 *   Step 7. Run world-index build, confirm zero unexpected_path warnings for manual-stories/:
 *     node tools/world-index/dist/src/cli.js build test-capstone-world
 *     # (Or via the validation_results query in the automated tests below — same content,
 *     #  just confirmed against the fixture path.)
 *
 *   Step 8. Cleanup:
 *     rm -rf <repo-root>/worlds/test-capstone-world/
 */

import { test } from "node:test";
import assert from "node:assert/strict";
// ... imports for createServer, enumerate, fs, etc. ...

test("AC #1: package builds + tests pass — verified by this test file being runnable", () => {
  // If this file is being executed, npm test built and is running the test suite.
  // The assertion is meta: the suite's existence is the proof.
  assert.ok(true);
});

test("AC #2: backend exposes exactly the three SPEC-100 routes", async () => {
  // boot server against a temp fixture root, enumerate routes, assert the set.
});

test("AC #3: POST route is registered inside wrapRouterWritable (grep-proof)", () => {
  // grep tools/manual-story-studio/src/server/http.ts for the wrapRouterWritable + registerManualStoriesWriteRoutes pairing.
});

test("AC #4: POST handler calls assertInsideSandbox (grep-proof)", () => {
  // grep tools/manual-story-studio/src/server/routes/manual-stories.ts for assertInsideSandbox before any fs.writeFile.
});

test("AC #5 + AC #6: enumerate excludes manual-stories/; world-index build emits zero unexpected_path warns", async () => {
  // (a) Copy a minimal fixture world to a temp root.
  // (b) POST a manual story via server.inject against the temp root.
  // (c) Call enumerate(tempWorldRoot); assert zero manual-stories/-prefixed paths in unexpected.
  // (d) Spawn world-index build against the temp root; query validation_results for enumeration warns under manual-stories/; assert zero rows.
});

test("AC #8 (backend half): startup banner appears in backend stderr", async () => {
  // Spawn the CLI with a temp repo root, capture stderr, assert the 5 banner lines.
});

test("AC #9: package README documents verified Hook 3 / Hook 2 / lowercase-ID posture", () => {
  // grep tools/manual-story-studio/README.md for:
  //  - "Hook 3" + "hook3-guard-direct-edit.ts"
  //  - "Hook 2" + "isAtomicSourceYaml" + "ALWAYS_PROTECTED_FILES"
  //  - "lowercase" + "m-prefix" + "STENT-[0-9]+"
});

test("AC #8 (frontend half): App.tsx contains the 4-line banner (grep-proof)", () => {
  // grep tools/manual-story-studio/web/src/App.tsx for the banner lines.
});
```

The automated tests cover AC 1, 2, 3, 4, 5, 6, 8 (backend half), 8 (frontend half), 9. The runbook covers AC 7 + the live UI portion of AC 8.

## Files to Touch

- `tools/manual-story-studio/test/capstone-spec100.test.ts` (new)

## Out of Scope

- Reimplementing unit tests from tickets 002, 003, 004 — those tests stand; this capstone only adds the cross-ticket integration assertions.
- Adding more frontend tests beyond the typecheck smoke — ticket 008 deliberately scopes frontend testing to typecheck only; richer frontend testing lands when actual component logic appears (SPEC-101+).
- Automating the manual dry-run runbook — browser-driven tests (Playwright, Cypress) are out of scope for MVP; the manual runbook is the explicit deliverable for AC #7.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/manual-story-studio && npm test` — full chain passes, including the new capstone test file.
2. `cd tools/world-index && npm test` — passes (confirms ticket 004's enumerate exclusion alongside the capstone's integration assertion).
3. Manual runbook steps 1-8 in the test file header complete successfully when run by the implementer.

### Invariants

1. The capstone is a verification surface; it adds no new production-code behavior. (Architectural invariant — capstone tests confirm composition, do not introduce new contracts.)
2. After this ticket lands AND its runbook is executed, SPEC-100's nine acceptance criteria are all satisfied — the spec is implementation-complete. (Data-contract invariant — the spec's `§Verification` and `§Acceptance criteria` sections are the contract; this ticket's pass is the contract's discharge.)

## Test Plan

### New/Modified Tests

1. `tools/manual-story-studio/test/capstone-spec100.test.ts` — new file, ~8 automated test cases + manual runbook header.

### Commands

1. `cd tools/manual-story-studio && npm test` — full chain (backend + frontend + capstone).
2. `cd tools/world-index && npm test` — ticket 004 confirmation.
3. Manual runbook — steps 1-8 in the test file header (browser interaction; not test-suite-runnable).
