# SPEC103PROPASSEG-016: Capstone integration test — SPEC-103 §7 AC #1-12 round-trip

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — adds `tools/manual-story-studio/test/capstone-spec103.test.ts` (the spec-integration capstone test exercising every prior ticket's surface end-to-end). No production code; verification only.
**Deps**: archive/tickets/SPEC103PROPASSEG-015.md

## Problem

SPEC-103 §6 Build & test names `npm test` as the verification surface, with determinism as the key test surface ("fixture segments → byte-identical manuscript across runs"). §7 enumerates 12 acceptance criteria covering the full round trip (paste → save → sidecar → segment_order → manuscript recompile → manual Rebuild → deterministic compile → State Update Checklist 12 classes → segment edit in-place → segment delete hybrid → Manuscript view → Prompt History view → discard prose → `npm test` passes). This capstone ticket follows the SPEC-100 / SPEC-101 / SPEC-102 precedent (existing test files at `test/capstone-spec100.test.ts`, `test/capstone-spec101.test.ts`, `test/capstone-spec102.test.ts`) — a single trailing test file whose acceptance criteria enumerate the spec's §7 bullets as test sub-cases, exercising every prior implementation ticket through the composed pipeline. SPEC-103's AC#1-12 are all programmatically testable (no skill dry-runs required, unlike branching-story pipeline capstones), so the default §Spec-Integration Ticket Shape applies — not the Manual-dry-run capstone variant.

## Assumption Reassessment (2026-05-31)

1. Existing capstone test files at `tools/manual-story-studio/test/capstone-spec100.test.ts`, `test/capstone-spec101.test.ts`, `test/capstone-spec102.test.ts` are the precedent for this ticket's file shape. Each uses `fs.cpSync` to copy a fixture manual story to a temp root so the test never mutates real canon; computes expected counts dynamically from the fixture at test start (not hardcoded); covers the corresponding spec's §Verification bullets as sub-cases. SPEC-103's §7 AC#1-12 are fully testable without skill invocation — the backend save/edit/delete flow + manuscript compilation are pure code paths exercisable from the test suite directly.
2. SPEC-103 §6 (`npm test` + determinism), §7 AC#1-12 (full round-trip enumeration: paste, save, sidecar, segment_order, manuscript recompile, manual Rebuild, deterministic compile, checklist 12 classes, segment edit in-place, segment delete hybrid, Manuscript view, Prompt History view, discard prose, `npm test` passes).
3. Cross-skill boundary: this capstone exercises every ticket from 001-015 via the composed pipeline. `Deps: archive/tickets/SPEC103PROPASSEG-015.md` follows the §Spec-Integration Ticket Shape transitive-head convention — archived ticket 015 transitively reaches every code-chain ticket (`archive/tickets/SPEC103PROPASSEG-011.md`→archive/tickets/SPEC103PROPASSEG-012.md→001; `archive/tickets/SPEC103PROPASSEG-011.md`→archive/tickets/SPEC103PROPASSEG-008.md→archive/tickets/SPEC103PROPASSEG-004.md→001/003 + archive/tickets/SPEC103PROPASSEG-008.md→005 + archive/tickets/SPEC103PROPASSEG-008.md→007; `archive/tickets/SPEC103PROPASSEG-013.md`→archive/tickets/SPEC103PROPASSEG-009.md→006/007 + `archive/tickets/SPEC103PROPASSEG-013.md`→`archive/tickets/SPEC103PROPASSEG-011.md`→...; `archive/tickets/SPEC103PROPASSEG-014.md`→archive/tickets/SPEC103PROPASSEG-010.md→007). Ticket 002 (docs/ID-ALLOCATION.md) is a parallel branch that the capstone does not need to verify (the capstone tests code behavior, not docs presence — docs verification is grep-based and lives in ticket 002's own Acceptance Criteria).
4. FOUNDATIONS §Story Bundles §4a Plan-Authority Boundary + §9 Prose Length Discipline: this capstone verifies both at the test level — assertions that no record file under `<manualStoryRoot>/records/` is mutated by any save/edit/delete operation (§4a verification per the SegmentSidecar contract), and assertion that the manuscript word count is computed and displayed without any quota enforcement (§9 verification per AC#11's discard-prose-not-persisted check). The capstone is the canonical place these invariants are asserted at integration level.

## Architecture Check

1. Single trailing capstone test exercising every spec §7 bullet keeps the SPEC-103-completion verification atomic — one test file is the gate for "spec 103 fully landed". Following the existing capstone precedent (`test/capstone-spec10X.test.ts`) keeps the package's test surface organized by spec for the cross-spec capstones plus by subsystem (`test/write/`, `test/server/`, etc.) for the per-ticket tests.
2. No backwards-compatibility aliasing — net-new test file; no prior SPEC-103 capstone exists.

## Verification Layers

1. AC#1 (paste + save) → test creates a fixture manual story, calls POST /segments with prose body + optional title/note → expect 201 + segment_id + sidecar + checklist_payload
2. AC#2 (.md + .yaml written) → assert `segments/SEG-1.md` body matches the prose input verbatim; assert `segments/SEG-1.yaml` parses to the full SegmentSidecar shape from ticket 001 with all 11 fields populated (id, created_at, updated_at, title, prompt_id, prompt_sha256, moment_directive, selected_template, included_record_summary, author_note, word_count)
3. AC#3 (segment_order append-only) → assert `manual-story.yaml` `segment_order` contains `[SEG-1]` after first save; `[SEG-1, SEG-2]` after second save
4. AC#4 (manuscript recompile + manual Rebuild) → assert `manuscript.md` exists and matches expected concatenated bodies after first save when `compile_on_segment_save: true`; assert POST /manuscript/rebuild produces same output when called manually
5. AC#5 (deterministic compile) → call POST /manuscript/rebuild twice with same inputs → assert byte-identical `manuscript.md` (read file before + after; compare buffers)
6. AC#6 (State Update Checklist 12 classes + never asserts state changed) → assert save response `checklist_payload.entries.length === 12`; assert `checklist_payload.disclaimer` matches the literal SPEC-required text ("Review these categories manually. Manual Story Studio has not changed any records.")
7. AC#7 (segment edit in-place) → call PUT /segments/SEG-1 with new prose → assert SegmentSidecar's `id` and `created_at` preserved; `updated_at` and `word_count` refreshed; manuscript recompiled
8. AC#8 (segment delete hybrid) → three sub-cases: (a) DELETE unreferenced SEG → assert files removed + segment_order updated; (b) DELETE referenced SEG (fixture has `mcnsq-X` with `caused_by_segment: SEG-1`) → assert files preserved + segment_order removal + outcome includes referrers; (c) DELETE with ?force=true on referenced → assert files removed + warning payload
9. AC#9 (Manuscript view shows full manuscript) → call GET /manuscript → assert body matches compiled manuscript byte-for-byte
10. AC#10 (Prompt History lists prompts with linked segments) → fixture with PROMPT-1 + SEG-1 (sidecar `prompt_id: PROMPT-1`) + SEG-2 (no prompt) → call GET /prompts → assert PROMPT-1 entry's `linked_segments: ["SEG-1"]`
11. AC#11 (discarded prose not persisted) → assert that calling no API after holding prose in test memory results in no `segments/` or `manuscript.md` mutation — this is structurally testable as "if you don't call save, nothing happens"; alternatively, assert that POST /segments with empty body returns 400 without writing anything
12. AC#12 (`npm test` passes) → this capstone IS one of the tests `npm test` runs; the test's own pass is the assertion. Document this in the test file header comment for clarity.

**Plan-Authority invariant (§4a, FOUNDATIONS-level verification)**: snapshot `<manualStoryRoot>/records/` directory mtime + file list before each save/edit/delete operation; assert unchanged after. This is the integration-level enforcement of the no-record-mutation invariant `archive/tickets/SPEC103PROPASSEG-004.md` / ticket 008 assert at the unit level.

## Landed Changes

### 1. Created test/capstone-spec103.test.ts

Implemented the capstone per the existing `test/capstone-spec10X.test.ts` shape:

- File-header comment names SPEC-103 and maps AC#1-12 to automated assertions.
- Setup uses `mkdtempSync` + `fs.cpSync` for temp docs/fixture state; no writes touch repo `worlds/`.
- Six capstone subtests cover the 12 ACs and the Plan-Authority invariant.
- Fixture-dependent values are derived from the temp fixture at runtime; fixed SPEC constants such as the 12 checklist classes and literal disclaimer are asserted verbatim.
- The Plan-Authority invariant snapshots `records/` file lists, mtimes, and bodies before segment operations and asserts they are unchanged afterward.

The test uses the in-process Fastify server fixture per the existing server tests and SPEC-100/101/102 capstones.

### 2. Test file header runbook

No manual dry-run runbook was added. The capstone is fully programmatic for backend behavior and uses frontend source checks for the view-only wiring that this package's test harness can exercise without a browser component runner.

## Files to Touch

- `tools/manual-story-studio/test/capstone-spec103.test.ts` (new)

## Out of Scope

- Any production code change (this is a verification-only ticket)
- Manual dry-run runbook (not applicable — SPEC-103's verification is fully programmatic)
- Performance gates (SPEC-103 names no performance thresholds in §6 or §7)
- Coverage of ticket 002 (docs/ID-ALLOCATION.md) — docs verification lives in ticket 002's own grep-based Acceptance Criteria; this capstone tests code behavior

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/manual-story-studio && npm run build:backend && node --test "dist/test/capstone-spec103.test.js"` — capstone tests pass (all 12 AC sub-cases + Plan-Authority invariant)
2. `cd tools/manual-story-studio && npm test` — full pipeline verification (includes capstone + all prior SPEC-100/101/102/103 tests + any frontend tests)

### Invariants

1. The capstone NEVER mutates real canon — `fs.cpSync` to a temp dir is the fixture strategy; no writes touch `worlds/<slug>/manual-stories/<msSlug>/` outside the temp root.
2. Fixture-dependent values are read from the temp fixture at test time; fixed SPEC constants are asserted literally so regressions in the accepted contract are visible.
3. The Plan-Authority invariant (§4a) is asserted at integration level: no record file under `<manualStoryRoot>/records/` is mutated by any operation the capstone exercises.
4. Manuscript determinism (§7 AC#5) is asserted by calling rebuild twice on the same fixture and asserting byte-identical output.

## Test Plan

### New/Modified Tests

1. `tools/manual-story-studio/test/capstone-spec103.test.ts` (new) — covers all 12 SPEC-103 §7 acceptance criteria as test sub-cases + the §4a Plan-Authority invariant.

### Commands

1. `cd tools/manual-story-studio && npm run build:backend && node --test "dist/test/capstone-spec103.test.js"` — targeted capstone test
2. `cd tools/manual-story-studio && npm test` — full pipeline verification (the capstone is one of the tests `npm test` runs; its pass IS AC#12's assertion per the test matrix above)

## Outcome

Completed 2026-05-31. Added `tools/manual-story-studio/test/capstone-spec103.test.ts`, the SPEC-103 trailing capstone. The test seeds temp Manual Story Studio repos, saves prompts and segments through the in-process Fastify server, verifies segment Markdown/sidecar writes, `segment_order` updates, automatic and manual manuscript compilation, deterministic rebuilds, the 12-class State Update Checklist with the required no-record-change disclaimer, edit-in-place semantics, all three segment-delete outcomes, prompt-history `linked_segments`, and discarded/invalid-prose non-persistence. It also asserts the Plan-Authority invariant by proving `records/` files are unchanged across segment save/edit/delete operations.

No production code changed.

## Verification Result

1. `cd tools/manual-story-studio && npm run build:backend` — PASS; TypeScript backend compiled.
2. `cd tools/manual-story-studio && node --test "dist/test/capstone-spec103.test.js"` — PASS; 6/6 capstone subtests passed.
3. `cd tools/manual-story-studio && npm test` — PASS; backend build, 275/275 compiled Node tests, and `npm --prefix web test` TypeScript check all passed.

## Deviations

1. AC#9 and AC#10's frontend view wording is covered by source-level route/page wiring checks plus web TypeScript compilation, not a browser/component render harness. The package has no React component test runner; the backend API behavior for manuscript and prompt-history linked segments is exercised directly.
2. The capstone intentionally does not re-test ticket 002's `docs/ID-ALLOCATION.md` grep proof; that documentation-only branch remains covered by `archive/tickets/SPEC103PROPASSEG-002.md`.
