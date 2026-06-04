# SPEC104BEATEMDET-014: Capstone E2E — filter → candidate selection → composer → segment sidecar

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: None — new capstone test file `tools/manual-story-studio/test/capstone-spec104.test.ts`; no production code changes
**Deps**: 009, 011, 012, 013

## Problem

SPEC-104 §6 acceptance criteria #7 (candidate cards in composer; selecting a template flows through to composer's §6), #10 (segment sidecar `selected_template` populated when a template is used), and #11 (Prompt History displays the template used per prompt) span the full SPEC-104 surface plus its integration with SPEC-100 (sandbox), SPEC-102 (composer + prompt routes), and SPEC-103 (segment save flow). No single upstream ticket exercises the entire end-to-end flow; the capstone test in this ticket asserts the integrated behavior across all five layers (filter → routes → composer → prompt save → segment save → Prompt History display).

## Assumption Reassessment (2026-05-31)

1. Codebase: ticket 005 lands the filter pipeline; ticket 006 lands the CRUD routes + candidate-computation route; ticket 007 lands the routes-layer ID→path resolution; ticket 008 lands the composer stage-5 extension + section-6 / section-12 wiring; ticket 011 lands the BeatTemplates CRUD UI; ticket 012 lands the BeatTemplateCandidates component + MomentComposer integration + PromptHistory template display; ticket 013 lands the docs flip. The capstone exercises the full chain via fixture data + a temp manual-story copy (per the §Spec-Integration Ticket Shape rule's fixture-world copy strategy: `fs.cpSync` to a temp root so the test never mutates real manual stories).
2. Spec: SPEC-104 §6 acceptance criteria 7/10/11 are the end-to-end concerns. AC #12 (`npm test` passes for `@worldloom/manual-story-studio`) is verified by every upstream ticket's tests; the capstone adds the integrated assertion that ties them together.
3. Cross-skill boundary: the capstone touches the integration of all SPEC-104 deliverables + the SPEC-100 sandbox (no canon-pipeline writes happen — Manual Studio's write surface is structurally fenced) + the SPEC-102 composer (which is canon-pipeline-adjacent but writes only inside the SPEC-100 sandbox) + the SPEC-103 segment save flow (which maps `included_template_path` to `selected_template` on the segment sidecar). The capstone is the end-to-end proof that the integration works as a single composed pipeline.

## Architecture Check

1. The capstone follows the §Spec-Integration Ticket Shape pattern: a single trailing test exercising the spec's §6 acceptance criteria end-to-end without introducing new production code. The fixture-world copy strategy (`fs.cpSync` to a temp root) keeps the real manual-stories tree untouched; expected counts are re-enumerated from the fixture rather than hardcoded; one assertion per integrated acceptance criterion.
2. The capstone DEPS enumerate the leaf set of the upstream DAG per the §Spec-Integration Ticket Shape §How `Deps` resolves §Linear-chain vs parallel-branch DAGs rule: tickets 009 (lint extension — parallel branch not reached by 011/012), 011 (CRUD UI — depends on 010 → 002 → 001 + 006 → 002 + 005 → 003 + 004), 012 (Candidates + MomentComposer + PromptHistory — depends on 010 + 006 + 008 → 007 → 002), and 013 (docs flip — depends on 002). The four leaves' transitive `Deps` cover tickets 001-013; the capstone depends on this leaf set rather than the transitive head (which doesn't exist in this parallel-branch DAG).
3. No backwards-compatibility aliasing or shims introduced. Pure test code.

## Verification Layers

1. Filter → candidate → selection → compose → segment → PromptHistory display chain: the capstone exercises each layer with one assertion per spec AC.
2. Determinism: the capstone runs the chain twice on the same fixture and asserts byte-identical output (composed prompt + segment sidecar fields).
3. SPEC-100 sandbox preservation: the capstone confirms no writes happen outside the temp manual-story root (the test's tempdir).
4. No canon writes: the capstone confirms no writes happen to `worlds/<slug>/_source/`, `worlds/<slug>/stories/<slug>/_source/`, `characters/`, `diegetic-artifacts/`, `_index/`, or any tools/ directory beyond the temp fixture.

## What to Change

### 1. Create `tools/manual-story-studio/test/capstone-spec104.test.ts`

Test structure following the §Spec-Integration Ticket Shape pattern:

- **Setup** (per test): `fs.cpSync` the fixture manual-story root (under `test/fixtures/capstone-spec104/`) to an OS-tempdir. The fixture includes 3 beat-templates with varied move_family / tags / role_slots, 2 cast members, 4 active records (beliefs, emotions, secrets), 1 location, story-contract, and an existing segment with a `selected_template` (for recent-use advisory testing).
- **AC #7 assertion**: invoke the candidate-computation route (`POST /api/.../moment-composer/template-candidates`) via fixture composer input; assert the returned candidates match the expected filter output (re-enumerated from fixture data, not hardcoded). Assert that selecting a candidate via the MomentComposer + invoking the compose-preview route returns a composed prompt body whose §6 section contains the selected template's `beat_guidance` as a Markdown list.
- **AC #10 assertion**: invoke the prompt-save route with the selected template; invoke the segment-save route referencing the saved prompt; assert the segment sidecar's `selected_template` field is populated with the selected `mtemplate-N` ID (mapped from the prompt sidecar's `included_template_path` per ticket 008 / SPEC-103 wiring).
- **AC #11 assertion**: invoke the prompts-listing endpoint; assert the response includes the `included_template_path` for the saved prompt (the PromptHistory UI displays the derived template ID from this field; the test asserts the data is available — the UI rendering itself is exercised by ticket 012's component tests).
- **AC #12 assertion** (full-pipeline gate): `npm test` passes for `@worldloom/manual-story-studio` (this is the natural composition of every upstream ticket's tests + the capstone itself; not asserted within the capstone but verified by the user running `cd tools/manual-story-studio && npm test` post-implementation).
- **Determinism**: each AC assertion re-runs the chain on the same fixture and asserts byte-identical output.
- **Sandbox**: assert no writes outside the tempdir occur during the chain.

### 2. Fixture data under `tools/manual-story-studio/test/fixtures/capstone-spec104/`

- `manual-story.yaml` — fixture metadata with story-contract, cast_order, segment_order, prompt_policy (including `recent_template_advisory_window: 2`).
- `records/cast/mchar-1.yaml`, `mchar-2.yaml` — 2 cast members with role assignments.
- `records/beliefs/mbel-1.yaml`, `records/emotions/memo-1.yaml`, `records/secrets/msecret-1.yaml`, `records/relationships/mrel-1.yaml` — 4 active records with tags driving the filter.
- `records/locations/mloc-1.yaml` — 1 location with tags.
- `records/beat-templates/mtemplate-1.yaml`, `mtemplate-2.yaml`, `mtemplate-3.yaml` — 3 beat templates with varied classification, role_slots, requires, excludes.
- `segments/SEG-1.md` + `segments/SEG-1.yaml` — 1 existing segment with `selected_template: "mtemplate-2"` (for recent-use advisory testing).
- `prompts/` directory created at test runtime by the capstone's prompt-save assertion.

## Files to Touch

- `tools/manual-story-studio/test/capstone-spec104.test.ts` (new)

## Out of Scope

- Production code changes (capstone is pure test code).
- The upstream tickets' production code — already covered by their respective tests.
- Real manual-story mutation (the capstone uses a temp fixture copy).

## Acceptance Criteria

### Tests That Must Pass

1. Capstone AC #7: candidate-computation route returns expected candidates; selecting a candidate produces a composed prompt body whose §6 contains the template's beat_guidance.
2. Capstone AC #10: segment-save flow populates the segment sidecar's `selected_template` field with the selected `mtemplate-N` ID.
3. Capstone AC #11: prompts-listing endpoint exposes the `included_template_path` for the saved prompt (the data the PromptHistory UI displays).
4. Capstone determinism: re-running the chain on the same fixture produces byte-identical composed prompts + segment sidecars.
5. Capstone sandbox: no writes happen outside the tempdir during the chain.
6. `cd tools/manual-story-studio && npm run build:backend && node --test "dist/test/capstone-spec104.test.js"` succeeds.
7. `cd tools/manual-story-studio && npm test` succeeds (full-pipeline gate: backend build + all backend tests including the capstone + web TypeScript check).

### Invariants

1. The capstone never mutates the real manual-stories tree — fixture is copied to a tempdir for each test.
2. The capstone never writes outside the tempdir — sandbox boundary verified at the test's end.
3. The capstone exercises the integrated chain via the public HTTP route surface (the same surface the frontend uses), not via direct module imports — this validates the routes-layer ID→path resolution + the sandbox guards.
4. The capstone's expected values are re-enumerated from the fixture, not hardcoded — fixture data changes do not silently break the capstone.

## Test Plan

### New/Modified Tests

1. `tools/manual-story-studio/test/capstone-spec104.test.ts` (new) — covers each acceptance criterion via the integrated chain.
2. Fixture data under `tools/manual-story-studio/test/fixtures/capstone-spec104/` — fixture manual-story + records + beat-templates + 1 existing segment.

### Commands

1. `cd tools/manual-story-studio && npm run build:backend && node --test "dist/test/capstone-spec104.test.js"` (targeted verification — runs the capstone only).
2. `cd tools/manual-story-studio && npm test` (full-pipeline verification — runs backend build + all backend tests + web TypeScript check; this is the SPEC-104 §6 AC #12 gate).
3. The targeted command above is the appropriate verification boundary for capstone-only iteration during implementation; the full-pipeline command is the spec's §6 AC #12 gate.
