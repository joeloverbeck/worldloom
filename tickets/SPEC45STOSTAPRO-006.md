# SPEC45STOSTAPRO-006: End-to-end integration capstone

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: No new production code — only test fixtures and integration test files. Exercises the full Phase 1 + Phase 2 + Phase 3 pipeline composed by SPEC45STOSTAPRO-001 through -005.
**Deps**: SPEC45STOSTAPRO-004, SPEC45STOSTAPRO-005

## Problem

Per SPEC-45 §Verification §End-to-end, the spec ships two capstone tests that exercise the complete pipeline end-to-end: one in world-index (synthetic bundle → indexer rebuild → assert edge counts match expected) and one in world-mcp (synthetic bundle → indexer → MCP query → assert response shape and contents). Per `references/cascade-and-summary-discipline.md` §Spec-Integration Ticket Shape, this is the natural capstone-pattern ticket — it introduces no new production code, exercises the pipeline composed by earlier tickets, uses fixture-world copy strategy keeping real `worlds/<slug>/` trees untouched, and re-enumerates expected counts rather than hardcoding them.

## Assumption Reassessment (2026-05-18)

1. `tools/world-index/tests/integration/` and `tools/world-mcp/tests/integration/` directories exist; both have existing capstone tests (`spec02-verification.test.ts`, `spec12-live-corpus.test.ts`, `spec42-capstone.test.ts`, etc.) that serve as structural precedents for the SPEC-45 capstone format. `tools/world-index/tests/fixtures/fixture-world/` exists and includes `_source/` subdirectories for synthetic-bundle construction; story-bundle fixture conventions established by SPEC-42 are usable. **Mechanical-drift note**: SPEC-45 §Deliverables D15 says `tools/world-index/tests/parse/atomic-integration.test.ts` — world-index tests live FLAT at `tests/` and integration tests live at `tests/integration/`; the test lands at `tools/world-index/tests/integration/spec45-atomic-integration.test.ts`.
2. SPEC-45 §Verification §End-to-end specifies three test cases: (a) red-bunny indexer rebuild with edge count assertions matching `Σ|SE.state_delta.create[]|`, etc.; (b) synthetic bundle with known provenance shape — index, call `get_story_state_provenance` on each record, assert shape matches; (c) manual dry-run of story-fact-promotion-to-canon Phase 1 against red-bunny verifying proposal package narrative shape is unchanged.
3. Cross-skill / cross-package boundary under audit: the capstone exercises three packages simultaneously — world-index (Phase 1 indexer from SPEC45STOSTAPRO-001 + SPEC45STOSTAPRO-002), world-mcp (Phase 2 tool from SPEC45STOSTAPRO-003 + consumer skill update from SPEC45STOSTAPRO-004), and validators (Phase 3 hygiene from SPEC45STOSTAPRO-005). Test must be runnable independently of any actively-maintained world bundle.
4. FOUNDATIONS principle under audit: §Story Bundles §4 — *"Hook 3 blocks direct `Edit` / `Write` to both `worlds/<slug>/_source/...` and `worlds/<slug>/stories/<story-slug>/_source/...` YAML records. ... Story-pipeline skills must not mutate world canon directly."* The capstone confirms the read-only nature of the indexer — assertion: no `worlds/<slug>/` files are modified during the capstone run; fixture-world copy strategy keeps real bundles untouched. This is the structural proof that SPEC-45's indexer additions do not introduce any write surface.

## Architecture Check

1. **Capstone uses fixture-world copy strategy per §Spec-Integration Ticket Shape**: tests construct synthetic bundles in a temp directory (via `fs.cpSync` from a committed fixture or programmatic construction) rather than mutating committed worlds. Real `worlds/erotica-world/stories/red-bunny/` tree is never written to during the test run; only read.
2. **Expected edge counts are re-enumerated, not hardcoded**: red-bunny's SE count and per-SE `state_delta.create` / `state_delta.supersede` cardinalities are computed at test start from the fixture YAML, not embedded as numeric literals. This keeps the test valid as canon grows.
3. **No backwards-compatibility shims introduced**: the capstone is purely additive test infrastructure; no production code change, no test-fixture compatibility shim.

## Verification Layers

1. **Indexer produces correct edge counts on red-bunny** → schema validation: `SELECT COUNT(*) FROM edges WHERE edge_type = 'state_delta_create' AND src LIKE 'SE-%'` against rebuilt index matches the count computed at test start from `Σ|SE.state_delta.create[]|` across red-bunny's SE records.
2. **MCP tool returns correct provenance for synthetic records** → schema validation: synthetic bundle with known authored shape — `get_story_state_provenance` response for each record matches the bundle's authored structure exactly.
3. **Full pipeline is read-only on real bundles** → manual review + codebase grep-proof: capstone test code uses only Read / Query operations against `worlds/<slug>/` paths; no Edit / Write / mkdir / unlink calls target real bundle paths. Validation: `grep -E "fs.writeFile|fs.unlink|fs.mkdir" tools/world-{index,mcp}/tests/integration/spec45-*.test.ts` returns matches only against temp-directory paths (or zero matches if all writes route through a single helper).

## What to Change

### 1. world-index integration capstone

Create `tools/world-index/tests/integration/spec45-atomic-integration.test.ts` covering:

- **Synthetic-bundle test**: construct a programmatic story bundle with exactly N SE records, each with known `state_delta.create` / `state_delta.supersede` cardinalities and known intro-tag content with known evidence ids. Run the indexer against the synthetic bundle. Assert:
  - Total `state_delta_create` edges in the index equals the sum of `state_delta.create[]` cardinalities across the synthetic SEs.
  - Total `state_delta_supersede` edges equals the sum of `state_delta.supersede[]` cardinalities.
  - Total `creation_evidence` edges equals `Σ(tag.evidence.length)` across all parsed intro tags.
  - Specific edge `src` / `tgt` / `edge_type` triples match expected exactly for at least one representative SE (spot-check the structure, not just the count).
  - SE with malformed intro tag emits `state_delta_*` edges normally but zero `creation_evidence` edges.
- **red-bunny smoke test**: copy red-bunny's `_source/` tree to a temp directory via `fs.cpSync`, run the indexer against the temp copy, query the temp database, assert the new edge counts are sensible (>= 0 for each new edge type; specific counts re-enumerated at runtime from the temp fixture).

### 2. world-mcp integration capstone

Create `tools/world-mcp/tests/integration/spec45-provenance-e2e.test.ts` covering:

- **Happy-path round-trip**: construct synthetic bundle with known provenance; build the index; call `mcp__worldloom__get_story_state_provenance(record_id, story_slug)` for each record. Assert each response matches the bundle's authored `{ creating_se_id, modifying_se_ids, evidence_records }` exactly.
- **Null creating_se_id round-trip**: bundle with a legacy-style record (no `state_delta_create` edge in-edges); response returns `creating_se_id: null`.
- **describe_capabilities round-trip**: call `mcp__worldloom__describe_capabilities`; assert the response includes `mcp__worldloom__get_story_state_provenance` in the tools array.

### 3. (Optional) Validator capstone integration

The validator's `cross_file_reference` extension from SPEC45STOSTAPRO-005 is exercised in its own test (`cross-file-reference.test.ts`). The spec's §Verification §End-to-end does not require an additional capstone for the validator extension specifically; the existing validator test plus the world-index synthetic-bundle test together cover the validator's surface. No additional capstone work unless the operator finds structural coverage gaps at implementation time.

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
3. The spec45 capstones explicitly assert no mutation occurs in `worlds/erotica-world/stories/red-bunny/`: the test runs `fs.statSync` on `worlds/erotica-world/stories/red-bunny/_source/events/SE-1.yaml` before and after the capstone test execution; mtime is unchanged.

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
3. `npm test --prefix tools/validators` — regression check for validator suite (no expected impact, but capstone touches the validator extension via integration coverage).
4. Manual: `find worlds/erotica-world/stories/red-bunny/_source -name '*.yaml' -newer /tmp/spec45-capstone-start-marker` returns empty list after capstone run (no mutations to real bundle).
