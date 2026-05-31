# SPEC103PROPASSEG-016: Capstone integration test — SPEC-103 §7 AC #1-12 round-trip

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — adds `tools/manual-story-studio/test/capstone-spec103.test.ts` (the spec-integration capstone test exercising every prior ticket's surface end-to-end). No production code; verification only.
**Deps**: 015

## Problem

SPEC-103 §6 Build & test names `npm test` as the verification surface, with determinism as the key test surface ("fixture segments → byte-identical manuscript across runs"). §7 enumerates 12 acceptance criteria covering the full round trip (paste → save → sidecar → segment_order → manuscript recompile → manual Rebuild → deterministic compile → State Update Checklist 12 classes → segment edit in-place → segment delete hybrid → Manuscript view → Prompt History view → discard prose → `npm test` passes). This capstone ticket follows the SPEC-100 / SPEC-101 / SPEC-102 precedent (existing test files at `test/capstone-spec100.test.ts`, `test/capstone-spec101.test.ts`, `test/capstone-spec102.test.ts`) — a single trailing test file whose acceptance criteria enumerate the spec's §7 bullets as test sub-cases, exercising every prior implementation ticket through the composed pipeline. SPEC-103's AC#1-12 are all programmatically testable (no skill dry-runs required, unlike branching-story pipeline capstones), so the default §Spec-Integration Ticket Shape applies — not the Manual-dry-run capstone variant.

## Assumption Reassessment (2026-05-31)

1. Existing capstone test files at `tools/manual-story-studio/test/capstone-spec100.test.ts`, `test/capstone-spec101.test.ts`, `test/capstone-spec102.test.ts` are the precedent for this ticket's file shape. Each uses `fs.cpSync` to copy a fixture manual story to a temp root so the test never mutates real canon; computes expected counts dynamically from the fixture at test start (not hardcoded); covers the corresponding spec's §Verification bullets as sub-cases. SPEC-103's §7 AC#1-12 are fully testable without skill invocation — the backend save/edit/delete flow + manuscript compilation are pure code paths exercisable from the test suite directly.
2. SPEC-103 §6 (`npm test` + determinism), §7 AC#1-12 (full round-trip enumeration: paste, save, sidecar, segment_order, manuscript recompile, manual Rebuild, deterministic compile, checklist 12 classes, segment edit in-place, segment delete hybrid, Manuscript view, Prompt History view, discard prose, `npm test` passes).
3. Cross-skill boundary: this capstone exercises every ticket from 001-015 via the composed pipeline. `Deps: 015` follows the §Spec-Integration Ticket Shape transitive-head convention — ticket 015 transitively reaches every code-chain ticket (011→012→001; 011→archive/tickets/SPEC103PROPASSEG-008.md→archive/tickets/SPEC103PROPASSEG-004.md→001/003 + archive/tickets/SPEC103PROPASSEG-008.md→005 + archive/tickets/SPEC103PROPASSEG-008.md→007; 013→009→006/007 + 013→011→...; 014→010→007). Ticket 002 (docs/ID-ALLOCATION.md) is a parallel branch that the capstone does not need to verify (the capstone tests code behavior, not docs presence — docs verification is grep-based and lives in ticket 002's own Acceptance Criteria).
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

## What to Change

### 1. Create test/capstone-spec103.test.ts

Implement the capstone per the existing `test/capstone-spec10X.test.ts` shape:

- File-header comment naming SPEC-103 and enumerating AC#1-12 as the test matrix
- Setup: `fs.cpSync` a fixture manual story to a temp dir (use existing test/fixtures/ pattern); never mutate `worlds/`
- One test sub-case per AC#1-12 per the Verification Layers above
- Each test sub-case computes expected counts/values dynamically from the fixture (not hardcoded); per the §Spec-Integration Ticket Shape "re-enumerated expected counts" guidance
- A final `Plan-Authority invariant` test asserting `<manualStoryRoot>/records/` is unmutated across all operations the capstone exercised

The test uses the in-process Fastify server fixture per the existing `test/server/http.test.ts` pattern (or the test infrastructure SPEC-100/101/102 capstones established).

### 2. Test file header runbook (optional, per §Spec-Integration Ticket Shape)

Since SPEC-103's verification is fully programmatic, no manual dry-run runbook is needed in the test file header — the default capstone shape applies. The file-header comment names the spec, the AC list, and a brief description of the test matrix.

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
2. Expected counts and values are computed dynamically from the fixture at test start — not hardcoded (per the §Spec-Integration Ticket Shape "re-enumerated expected counts" requirement); the capstone remains valid as the fixture grows or evolves.
3. The Plan-Authority invariant (§4a) is asserted at integration level: no record file under `<manualStoryRoot>/records/` is mutated by any operation the capstone exercises.
4. Manuscript determinism (§7 AC#5) is asserted by calling rebuild twice on the same fixture and asserting byte-identical output.

## Test Plan

### New/Modified Tests

1. `tools/manual-story-studio/test/capstone-spec103.test.ts` (new) — covers all 12 SPEC-103 §7 acceptance criteria as test sub-cases + the §4a Plan-Authority invariant.

### Commands

1. `cd tools/manual-story-studio && npm run build:backend && node --test "dist/test/capstone-spec103.test.js"` — targeted capstone test
2. `cd tools/manual-story-studio && npm test` — full pipeline verification (the capstone is one of the tests `npm test` runs; its pass IS AC#12's assertion per the test matrix above)
