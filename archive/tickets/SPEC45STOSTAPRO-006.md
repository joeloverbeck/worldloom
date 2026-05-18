# SPEC45STOSTAPRO-006: End-to-end integration capstone

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: No new production code — only test fixtures and integration test files. Exercises the full Phase 1 + Phase 2 + Phase 3 pipeline composed by SPEC45STOSTAPRO-001 through -005.
**Deps**: `archive/tickets/SPEC45STOSTAPRO-004.md`, `archive/tickets/SPEC45STOSTAPRO-005.md`

## Problem

Per SPEC-45 §Verification §End-to-end, the spec ships two capstone tests that exercise the complete pipeline end-to-end: one in world-index (synthetic bundle → indexer rebuild → assert edge counts match expected) and one in world-mcp (synthetic bundle → indexer → MCP query → assert response shape and contents). Per `references/cascade-and-summary-discipline.md` §Spec-Integration Ticket Shape, this is the natural capstone-pattern ticket — it introduces no new production code, exercises the pipeline composed by earlier tickets, uses fixture-world copy strategy keeping real `worlds/<slug>/` trees untouched, and re-enumerates expected counts rather than hardcoding them.

## Assumption Reassessment (2026-05-18)

1. `tools/world-index/tests/integration/` and `tools/world-mcp/tests/integration/` directories exist; both have existing capstone tests (`spec02-verification.test.ts`, `spec12-live-corpus.test.ts`, `spec42-capstone.test.ts`, etc.) that serve as structural precedents for the SPEC-45 capstone format. `tools/world-index/tests/fixtures/fixture-world/` exists and includes `_source/` subdirectories for synthetic-bundle construction; story-bundle fixture conventions established by SPEC-42 are usable. **Mechanical-drift note**: SPEC-45 §Deliverables D15 says `tools/world-index/tests/parse/atomic-integration.test.ts` — world-index tests live FLAT at `tests/` and integration tests live at `tests/integration/`; the test lands at `tools/world-index/tests/integration/spec45-atomic-integration.test.ts`.
2. SPEC-45 §Verification §End-to-end specifies three test cases: (a) red-bunny indexer rebuild with edge count assertions matching `Σ|SE.state_delta.create[]|`, etc.; (b) synthetic bundle with known provenance shape — index, call `get_story_state_provenance` on each record, assert shape matches; (c) manual dry-run of story-fact-promotion-to-canon Phase 1 against red-bunny verifying proposal package narrative shape is unchanged.
3. Cross-skill / cross-package boundary under audit: the capstone exercises three packages simultaneously — world-index (Phase 1 indexer from `archive/tickets/SPEC45STOSTAPRO-001.md` + `archive/tickets/SPEC45STOSTAPRO-002.md`), world-mcp (Phase 2 tool from `archive/tickets/SPEC45STOSTAPRO-003.md` + consumer skill update from `archive/tickets/SPEC45STOSTAPRO-004.md`), and validators (Phase 3 hygiene from `archive/tickets/SPEC45STOSTAPRO-005.md`). Test must be runnable independently of any actively-maintained world bundle.
4. FOUNDATIONS principle under audit: §Story Bundles §4 — *"Hook 3 blocks direct `Edit` / `Write` to both `worlds/<slug>/_source/...` and `worlds/<slug>/stories/<story-slug>/_source/...` YAML records. ... Story-pipeline skills must not mutate world canon directly."* The capstone confirms the read-only nature of the indexer — assertion: no `worlds/<slug>/` files are modified during the capstone run; fixture-world copy strategy keeps real bundles untouched. This is the structural proof that SPEC-45's indexer additions do not introduce any write surface.
5. Parser-behavior correction from `archive/tickets/SPEC45STOSTAPRO-001.md` and `archive/tickets/SPEC45STOSTAPRO-002.md`: malformed intro tags reject through `MidstoryIntroductionTagError`. The capstone must not preserve SPEC-45's older "malformed tag emits zero creation_evidence" wording as an executable expectation.

## Architecture Check

1. **Capstone uses fixture-world copy strategy per §Spec-Integration Ticket Shape**: tests construct synthetic bundles in a temp directory (via `fs.cpSync` from a committed fixture or programmatic construction) rather than mutating committed worlds. Real `worlds/erotica-world/stories/red-bunny/` tree is never written to during the test run; only read.
2. **Expected edge counts are re-enumerated, not hardcoded**: red-bunny's SE count and per-SE `state_delta.create` / `state_delta.supersede` cardinalities are computed at test start from the fixture YAML, not embedded as numeric literals. This keeps the test valid as canon grows.
3. **No backwards-compatibility shims introduced**: the capstone is purely additive test infrastructure; no production code change, no test-fixture compatibility shim.

## Verification Layers

1. **Indexer produces correct edge counts on red-bunny** → schema validation: `SELECT COUNT(*) FROM edges WHERE edge_type = 'state_delta_create' AND story_slug = 'red-bunny'` against rebuilt index matches the count computed at test start from `Σ|SE.state_delta.create[]|` across red-bunny's SE records.
2. **MCP tool returns correct provenance for synthetic records** → schema validation: synthetic bundle with known authored shape — `get_story_state_provenance` response for each record matches the bundle's authored structure exactly.
3. **Full pipeline is read-only on real bundles** → manual review + codebase grep-proof: capstone test code writes only temp-root fixture paths, copies `worlds/erotica-world` to a temp root, removes only the copied `_index`, and asserts the live red-bunny `SE-1.yaml` mtime is unchanged.

## Landed Changes

### 1. world-index integration capstone

Created `tools/world-index/tests/integration/spec45-atomic-integration.test.ts` covering:

- **Synthetic-bundle test**: construct a programmatic story bundle with exactly N SE records, each with known `state_delta.create` / `state_delta.supersede` cardinalities and known intro-tag content with known evidence ids. Run the indexer against the synthetic bundle. Assert:
  - Total `state_delta_create` edges in the index equals the sum of `state_delta.create[]` cardinalities across the synthetic SEs.
  - Total `state_delta_supersede` edges equals the sum of `state_delta.supersede[]` cardinalities.
  - Total `creation_evidence` edges equals `Σ(tag.evidence.length)` across all parsed intro tags.
  - Specific edge `src` / `tgt` / `edge_type` triples match expected exactly for at least one representative SE (spot-check the structure, not just the count).
  - SE with malformed intro tag remains covered by `tools/world-index/tests/structured-edges.test.ts` as strict parser rejection; the capstone uses only well-formed intro tags because it proves composed pipeline success, not parser error handling.
- **red-bunny smoke test**: copy red-bunny's `_source/` tree to a temp directory via `fs.cpSync`, run the indexer against the temp copy, query the temp database, assert the new edge counts are sensible (>= 0 for each new edge type; specific counts re-enumerated at runtime from the temp fixture).

### 2. world-mcp integration capstone

Created `tools/world-mcp/tests/integration/spec45-provenance-e2e.test.ts` covering:

- **Happy-path round-trip**: construct synthetic bundle with known provenance; build the index; call `mcp__worldloom__get_story_state_provenance(record_id, story_slug)` for each record. Assert each response matches the bundle's authored `{ creating_se_id, modifying_se_ids, evidence_records }` exactly.
- **Null creating_se_id round-trip**: bundle with a legacy-style record (no `state_delta_create` edge in-edges); response returns `creating_se_id: null`.
- **describe_capabilities round-trip**: call `mcp__worldloom__describe_capabilities`; assert the response includes `mcp__worldloom__get_story_state_provenance` in the tools array.

### 3. (Optional) Validator capstone integration

The validator's `cross_file_reference` extension from `archive/tickets/SPEC45STOSTAPRO-005.md` is exercised in its own test (`cross-file-reference.test.ts`). The spec's §Verification §End-to-end does not require an additional capstone for the validator extension specifically; the existing validator test plus the world-index synthetic-bundle test together cover the validator's surface. No additional capstone work unless the operator finds structural coverage gaps at implementation time.

## Files to Touch

- `tools/world-index/tests/integration/spec45-atomic-integration.test.ts` (new) — synthetic-bundle + red-bunny smoke test.
- `tools/world-mcp/tests/integration/spec45-provenance-e2e.test.ts` (new) — happy-path + null + describe_capabilities round-trip tests.

## Out of Scope

- Performance assertion / CI gate — SPEC-45 names no performance threshold; capstone has no wall-clock assertion.
- Adding new production code — capstone is test-only.
- Repairing or modifying existing bundle fixtures — the capstone uses temp copies, never mutates committed fixtures.
- Coverage for `state_delta_close` or `supersedes_record` edges — both deferred per SPEC-45 §Out of Scope.
- Coverage for affordance / grounding / propagation indexing — Phase 3 R-MD8 surface per SPEC-45 §Out of Scope.

## Acceptance Criteria

### Tests That Must Pass

1. `npm run build --prefix tools/world-index && npm run build --prefix tools/world-mcp` passes after the capstone tests land.
2. New capstone tests pass: `npm test --prefix tools/world-index` and `npm test --prefix tools/world-mcp` (running the new spec45 capstones plus full suites for regression).
3. The spec45 world-index capstone explicitly asserts no mutation occurs in `worlds/erotica-world/stories/red-bunny/`: the test runs `fs.statSync` on `worlds/erotica-world/stories/red-bunny/_source/events/SE-1.yaml` before and after the capstone test execution; mtime is unchanged.

### Invariants

1. Capstone tests are deterministic — same fixture in, same assertions pass; no flakiness from filesystem ordering or sqlite query non-determinism.
2. Capstone tests use fixture-world copy strategy — real `worlds/<slug>/` paths are read but never written.
3. Expected edge counts are re-enumerated from the synthetic-bundle / temp-fixture at runtime — no hardcoded numeric literals beyond synthetic-bundle authoring constants.
4. Capstone tests reference only public APIs from SPEC45STOSTAPRO-001 through -005 (no reaching into private internals).

## Test Plan

### New/Modified Tests

1. `tools/world-index/tests/integration/spec45-atomic-integration.test.ts` (new) — covers synthetic-bundle edge-count assertions + red-bunny smoke.
2. `tools/world-mcp/tests/integration/spec45-provenance-e2e.test.ts` (new) — covers MCP-call round-trip assertions + describe_capabilities inclusion.

### Commands

1. `npm test --prefix tools/world-index` — runs full world-index suite including new spec45 capstone.
2. `npm test --prefix tools/world-mcp` — runs full world-mcp suite including new spec45 e2e capstone.
3. `npm test --prefix tools/validators` — regression check for validator suite; accepted with the known SPEC-43 red-bunny `compatible_optional_absence` failure classified in `## Deviations`.
4. `node --test dist/tests/integration/spec45-atomic-integration.test.js` from `tools/world-index` — focused compiled capstone proof.
5. `node --test dist/tests/integration/spec45-provenance-e2e.test.js` from `tools/world-mcp` — focused compiled MCP capstone proof.

## Outcome

Completed: 2026-05-18

What changed:

1. Added `tools/world-index/tests/integration/spec45-atomic-integration.test.ts`.
   - Builds a synthetic story bundle through `world-index build`.
   - Asserts exact `state_delta_create`, `state_delta_supersede`, and `creation_evidence` counts and representative resolved edge triples.
   - Copies `worlds/erotica-world` to a temp root, rebuilds the copied red-bunny index, computes expected edge counts from copied `SE-*.yaml`, and asserts the live red-bunny `SE-1.yaml` mtime is unchanged.
2. Added `tools/world-mcp/tests/integration/spec45-provenance-e2e.test.ts`.
   - Builds a synthetic indexed world through `@worldloom/world-index/commands/build`.
   - Calls `getStoryStateProvenance()` for a record with creating/modifying/evidence edges and for a legacy record with no provenance edges.
   - Calls the in-memory MCP server for `describe_capabilities` and `mcp__worldloom__get_story_state_provenance`.
3. Corrected this ticket's malformed-intro-tag capstone expectation to the live strict parser contract from `archive/tickets/SPEC45STOSTAPRO-001.md` / `archive/tickets/SPEC45STOSTAPRO-002.md`.

## Verification Result

1. `git diff --check -- archive/tickets/SPEC45STOSTAPRO-006.md tools/world-index/tests/integration/spec45-atomic-integration.test.ts tools/world-mcp/tests/integration/spec45-provenance-e2e.test.ts` — passed.
2. `npm run build --prefix tools/world-index` — passed.
3. `node --test dist/tests/integration/spec45-atomic-integration.test.js` from `tools/world-index` — passed, 2/2.
4. `npm run build --prefix tools/world-mcp` — passed.
5. `node --test dist/tests/integration/spec45-provenance-e2e.test.js` from `tools/world-mcp` — passed, 2/2.
6. `npm test --prefix tools/world-index` — passed, 97/97.
7. `npm test --prefix tools/world-mcp` — passed, 405/405.
8. `npm test --prefix tools/validators` — red, 540/541; unchanged known failure in `§Verification bullet 19: red-bunny bundle validates cleanly from a temp world copy`, assertion `compatible_optional_absence missing from current_contract`.

## Deviations

1. The malformed intro-tag capstone case was narrowed to the live strict parser contract. The composed capstone uses well-formed intro tags; malformed rejection remains covered by `tools/world-index/tests/structured-edges.test.ts`.
2. The spec's manual story-fact-promotion dry-run was not run as an executable workflow because there is no dedicated skill replay harness in this repo. The accepted surrogate is the in-memory MCP server call plus manual contract coverage already landed in `archive/tickets/SPEC45STOSTAPRO-004.md`.
3. The validator broad suite remains red on the pre-existing SPEC-43 red-bunny fixture assertion named above. This capstone introduced no validator source changes; the accepted validator proof for SPEC-45 remains the focused Phase 3 tests from `archive/tickets/SPEC45STOSTAPRO-005.md` plus the green world-index/world-mcp capstones here.
