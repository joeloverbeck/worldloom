# SPEC101MANSTOMET-012: Capstone integration test for SPEC-101 AC 1-9

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium-Large
**Engine Changes**: Yes — adds `tools/manual-story-studio/test/capstone-spec101.test.ts` end-to-end integration test.
**Deps**: SPEC101MANSTOMET-009, SPEC101MANSTOMET-010, SPEC101MANSTOMET-011

## Problem

Each prior SPEC-101 ticket (001-011) tests its own surface in isolation: schema types compile, validators reject bad inputs, allocator gives sequential IDs, read/write modules round-trip, routes return correct status codes, components render. SPEC-101 §7 Acceptance Criteria #1-9 enumerate end-to-end behavior the bundle must exhibit when composed: a manual-story.yaml + one record of each of 18 classes + ref validation + hybrid delete + force-delete-with-audit + Cast & Profile editor with read-only `source_world_character` + Dashboard widgets + Records screen three-pane + npm test green. Without a capstone, the bundle's compositional correctness is implicit; the capstone test makes it explicit, exercising the full pipeline as the author would. Following the worldloom convention (SPEC-100 shipped `capstone-spec100.test.ts`; the SPEC-100 ticket bundle's final ticket was `SPEC100MANSTOSTU-009: capstone test`), SPEC-101's capstone is the same shape: a manual-dry-run-runbook for skill/UI-driven AC sub-cases + an automated-test body for programmatic AC sub-cases.

## Assumption Reassessment (2026-05-30)

1. `tools/manual-story-studio/test/capstone-spec100.test.ts` exists (verified via `ls tools/manual-story-studio/test/`); SPEC-100's capstone is the structural precedent. This ticket adds `capstone-spec101.test.ts` as a sibling. The test suite is invoked via `cd tools/manual-story-studio && npm test` (per package.json `scripts.test`).
2. SPEC-101 §7 Acceptance Criteria enumerates 9 contracts:
   - AC #1: manual-story.yaml schema parses with all enum vocabularies; missing required fields rejected; tested per enum.
   - AC #2: All 18 MVP record classes parse, validate, and CRUD-round-trip; per-class required fields enforced.
   - AC #3: ID allocator deterministic; gaps from hard-delete preserved.
   - AC #4: Ref validator flags dangling refs; CRUD save refuses dangling refs unless explicitly overridden.
   - AC #5: Hybrid delete works for all three outcomes (hard / inactive_default / force).
   - AC #6: Manual Character Profile schema renders in Cast & Profile editor; sections editable; `source_world_character` read-only.
   - AC #7: Dashboard renders all widgets with live data.
   - AC #8: Records screen three-pane layout works; filtering + active/archived toggle functional.
   - AC #9: `npm test` passes for `@worldloom/manual-story-studio`.
3. Cross-artifact boundary under audit: capstone composes EVERY prior SPEC101MANSTOMET ticket's surface. AC #1-5 are programmatic test-suite-runnable (schema validators, ID allocator, write layer, hybrid delete); AC #6-8 are frontend UI-driven that require browser-shaped invocation (page render + form interaction + widget composition with live data) — these land as a manual dry-run runbook in the test file's header comment per spec-to-tickets §Manual-dry-run capstone variant pattern. AC #9 is the cumulative check — passes by virtue of every prior ticket's test landing.

## Architecture Check

1. A capstone test (vs. relying solely on per-ticket tests) is cleaner because it exercises the COMPOSITION — schema + validators + allocator + write layer + routes integrated end-to-end via a fixture manual-story. Per-ticket tests can't catch integration bugs (e.g., a route returning the wrong outcome shape because schema-validator errors get double-wrapped). The capstone is the test-side enforcement of SPEC-101 §7 AC #9's "npm test passes" cumulative contract.
2. No backwards-compatibility shims. SPEC-100's capstone covers SPEC-100's AC 1-9; SPEC-101's capstone covers SPEC-101's distinct AC set.

## Verification Layers

1. AC #1 (manual-story.yaml schema) → schema validation (programmatic).
2. AC #2 (18 record classes round-trip) → CRUD round-trip via write layer (programmatic).
3. AC #3 (ID allocator gap preservation) → allocator test after delete cycle (programmatic).
4. AC #4 (ref validator with override) → ref validator + write layer override flow (programmatic).
5. AC #5 (hybrid delete: hard / inactive_default / force) → write layer delete with all three outcomes (programmatic).
6. AC #6 (Cast & Profile editor + read-only `source_world_character`) → manual dry-run runbook (frontend UI).
7. AC #7 (Dashboard widgets with live data) → manual dry-run runbook (frontend UI).
8. AC #8 (Records screen three-pane + filtering + active/archived) → manual dry-run runbook (frontend UI).
9. AC #9 (`npm test` passes for `@worldloom/manual-story-studio`) → cumulative: capstone test added to suite, all per-ticket tests already passing, capstone passes → AC #9 satisfied.

## What to Change

### 1. Create `tools/manual-story-studio/test/capstone-spec101.test.ts`

**Test file header comment — Manual Dry-Run Runbook (for AC #6-8)**:

The header comment documents the manual steps the implementer follows manually before declaring SPEC-101 landed:

- **Fixture setup**: copy `worlds/test-fixture/` (or create a temp world directory) via `fs.cpSync` to a temp root; create a `manual-stories/test-spec101/` subdirectory with seeded records (the same fixture the programmatic body uses).
- **AC #6 dry-run (Cast & Profile editor)**:
  1. Run `cd tools/manual-story-studio && npm run build && node dist/src/cli.js --repo-root <temp-root>` to start the server.
  2. Open `http://localhost:<port>/worlds/test-fixture/manual-stories/test-spec101/cast` in a browser.
  3. Verify the Cast & Profile editor renders the seeded Manual Character Profile.
  4. Verify all §3 nested sections (identity, world_pressure_core, body_and_presence, voice, pressure_behavior, perception_and_embodiment, agency_and_planning, relationship_behavior, prose_constraints) are visible and their text fields are editable.
  5. Verify the `source_world_character: CHAR-*` field is rendered READ-ONLY (input disabled, no edit affordance).
- **AC #7 dry-run (Dashboard widgets)**:
  1. With server running, open `http://localhost:<port>/worlds/test-fixture/manual-stories/test-spec101/dashboard`.
  2. Verify all 8 widgets from SPEC-101 §2.8 are present.
  3. Verify each widget shows live data derived from the fixture manual-story (story contract from manual-story.yaml; active cast from `listRecords("cast")`; etc.).
- **AC #8 dry-run (Records screen)**:
  1. Open `http://localhost:<port>/worlds/test-fixture/manual-stories/test-spec101/records`.
  2. Verify the three-pane layout (left rail, center pane, right pane).
  3. Verify the left rail shows all 18 class entries with counts.
  4. Verify tag filter narrows the center pane card list.
  5. Verify importance filter narrows the center pane card list.
  6. Verify the active/archived toggle switches visible-record set.

**Automated test body (for AC #1-5 + the AC #9 enabling check)**:

```typescript
import test from "node:test";
import { strict as assert } from "node:assert";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

test("SPEC-101 AC #1: manual-story.yaml parses with all enum vocabularies; missing required rejected", async () => {
  // Use fixture manual-story.yaml covering every closed enum
  // Assert validateManualStoryMetadata returns ok:true on valid input
  // Assert validateManualStoryMetadata returns ok:false on missing required field, for each required field
  // Assert validateManualStoryMetadata returns ok:false on invalid enum value, for each closed enum
});

test("SPEC-101 AC #2: all 18 MVP record classes round-trip via CRUD", async () => {
  // Set up tmpRoot via fs.cpSync of fixture world
  // For each of 18 classes, createRecord with a valid fixture body
  // Read back via readRecord, assert content matches
  // updateRecord with a mutation, read back, assert mutation persisted
  // Assert per-class required-field rejection on a fixture missing one required field
});

test("SPEC-101 AC #3: ID allocator gap preservation after hard-delete", async () => {
  // Create mbel-1, mbel-2, mbel-3
  // deleteRecord mbel-2 (unreferenced → hard_deleted)
  // allocateNextIdForClass(tmpRoot, "beliefs") → assert returns "mbel-4" (NOT "mbel-2")
});

test("SPEC-101 AC #4: ref validator flags dangling refs; override flow works", async () => {
  // createRecord mbel-* with refs.characters: ["mchar-99"] (missing)
  // Assert response { ok: false, errors, needsOverride: true }
  // Assert file NOT created on disk
  // Re-call createRecord with overrideBrokenRefs: true
  // Assert response { ok: true, id, record }
  // Assert file IS created on disk
});

test("SPEC-101 AC #5: hybrid delete all three outcomes", async () => {
  // Create mchar-1 (no referrers); deleteRecord → assert hard_deleted
  // Create mchar-2 + mbel-1 with refs.characters: ["mchar-2"]
  // deleteRecord mchar-2 (no force) → assert inactive_default with referrers: [mbel-1]
  // Verify mchar-2.yaml still exists with active: false on disk
  // deleteRecord mchar-2 with force: true → assert force_deleted with auditEntry
  // Verify mchar-2.yaml is gone from disk
});
```

The fixture world is built via `fs.cpSync` from a small seed (or constructed inline) to a temp directory so the test never mutates the real `worlds/` tree.

### 2. Re-enumerated assertion counts

The capstone re-enumerates counts (number of classes, number of widgets, number of records) from the fixture rather than hardcoding magic numbers — paralleling the SPEC-100 capstone pattern. Hardcoded counts become stale as the fixture grows; re-enumeration stays valid.

### 3. Performance posture

SPEC-101 §6 Build & test does not name a performance gate; the capstone does NOT assert wall-clock thresholds. Wall-clock targets remain dev-loop expectations rather than CI gates.

## Files to Touch

- `tools/manual-story-studio/test/capstone-spec101.test.ts` (new)

## Out of Scope

- Frontend automated component testing for AC #6-8 — these land as manual dry-run runbook items per the manual-dry-run capstone variant pattern (browser-shaped UI verification not test-runnable from node:test).
- Performance / load testing — SPEC-101 has no performance gate.
- Cross-manual-story integration tests — M6 deferral.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/manual-story-studio && npm test` passes including the new `capstone-spec101.test.ts`; AC #9 (npm test passes for @worldloom/manual-story-studio) is satisfied by the cumulative test suite green.
2. `cd tools/manual-story-studio && npm run build` succeeds (backend + web build).
3. `grep -nE "AC #[1-9]" tools/manual-story-studio/test/capstone-spec101.test.ts` returns ≥ 8 matches (every AC #1-8 referenced in test names; AC #9 is implicit via the cumulative pass).

### Invariants

1. Capstone never mutates real `worlds/<slug>/` content — invariant via `fs.cpSync` to temp root before fixture setup.
2. Manual dry-run runbook is in the test file's header comment (discoverable to the implementer); the runbook covers all 3 frontend-only ACs (#6, #7, #8).
3. Programmatic test body covers all 5 backend ACs (#1-5); AC #9 satisfaction is documented as cumulative.

## Test Plan

### New/Modified Tests

1. `tools/manual-story-studio/test/capstone-spec101.test.ts` — end-to-end programmatic tests for AC #1-5 + manual dry-run runbook header comment for AC #6-8.

### Commands

1. `cd tools/manual-story-studio && npm test`
2. `cd tools/manual-story-studio && node --test dist/test/capstone-spec101.test.js` (after `npm run build:backend`) — capstone in isolation for fast dev-loop iteration.
3. Manual dry-run: `cd tools/manual-story-studio && npm run build && node dist/src/cli.js --repo-root <fixture-root>` then browser walk-through per the test file's header runbook.
