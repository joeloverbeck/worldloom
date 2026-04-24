# SPEC03PATENG-009: Integration / acceptance capstone — full SPEC-03 §Verification matrix

**Status**: PENDING
**Priority**: HIGH
**Effort**: Large
**Engine Changes**: Yes — adds `tools/patch-engine/tests/integration/end-to-end-canon-addition.test.ts` plus supporting fixtures. No production code changes; exercises the pipeline composed by tickets 001–007 end-to-end via the world-mcp `submit_patch_plan` path.
**Deps**: SPEC03PATENG-007 (transitive head — ticket 007 composes tickets 001–006 via the world-mcp rewire; the full DAG is reconstructible from the upstream tickets' own `Deps` fields)

## Problem

SPEC-03 §Verification enumerates 10 acceptance bullets beyond the per-op unit tests in ticket 008 (integration replay, atomicity injection, record-hash drift, hybrid anchor drift, approval-token cases, write-order pathological ordering, append-only runtime rejection, retcon attestation, attribution, `append_touched_by_cf` auto-add). Reassessment added an 11th bullet (post-apply sync integration). SPEC-03 §Risks line 311 names a performance target (<2s for a ~13-op plan). This ticket is the Spec-Integration capstone that exercises every one of those bullets against a fixture-world copy of animalia, via the real `mcp__worldloom__submit_patch_plan` → `@worldloom/patch-engine` path that ticket 007 wired up.

## Assumption Reassessment (2026-04-24)

1. `worlds/animalia/_source/` is the migrated atomic-source canonical state (migration completed 2026-04-24 per SPEC-13; confirmed at reassessment). This ticket copies animalia via `fs.cpSync` to a temp root at test start — the real `worlds/animalia/` tree is never mutated. Re-enumeration of expected counts (CFs, CHs, INVs, Ms, OQs, ENTs, SECs) happens at test setup time from the fixture copy, not hardcoded, so the tests remain valid as animalia's canon grows.
2. SPEC-02 Phase 2 tooling update (adds `get_record`, `find_sections_touched_by`, extends `allocate_next_id` to INV/OQ/ENT/SEC) is a gating dependency for the post-apply sync integration test: the test verifies `find_sections_touched_by(new_cf_id)` returns the new SEC after apply, which requires the MCP tool to exist. This ticket blocks on the SPEC-02 Phase 2 update landing first; if it hasn't, the post-apply sync assertion must be skipped or stubbed. **Decision at implementation time**: if SPEC-02 Phase 2 has not landed, split this ticket into 009a (SPEC-02-independent assertions) and 009b (post-apply sync integration requiring `find_sections_touched_by`). Flag at implementation as scope-extending.
3. Shared boundary: this ticket exercises `world-mcp` → `@worldloom/patch-engine` → `world-index sync` end-to-end. Failures surface at the MCP response shape (`PatchReceipt` fields populated correctly) and at the post-apply index state (verifiable via `get_record` / `find_sections_touched_by`).
4. FOUNDATIONS principles under audit: **Rule 6 No Silent Retcons** via the retcon-attestation and `append_touched_by_cf` auto-add assertions; **HARD-GATE discipline** via the approval-token rejection matrix (unsigned / expired / tampered / replayed tokens).
5. This ticket does not weaken the Mystery Reserve firewall. MR-related assertions are limited to verifying that `append_extension` on M records is accepted (preserves MR append-only authorship) without touching disallowed-answer semantics — SPEC-04's `rule7_mystery_reserve_preservation` owns that check.
6. Adjacent contradictions: the capstone's integration-replay scenario asks for "a historical `canon-addition` delivery (e.g., CH-0013's five parallel named-polity-instance commitments on animalia, post-migration)" (SPEC-03 line 281). Reviewing animalia's CH-0013 at implementation time to confirm it remains representative (or substituting a current canonical delivery) is required — classification: **separate step inside this ticket's implementation**, not a follow-up.

## Architecture Check

1. Spec-Integration Ticket Shape per the skill's §Step 3: no new production code, only test code. A single trailing ticket whose acceptance criteria enumerate the spec's §Verification bullets as test sub-cases. Every bullet maps to at least one `test(...)` block.
2. Fixture-world copy via `fs.cpSync(animalia, tmp)` keeps the real `worlds/animalia/` tree untouched. This matches the pattern the skill's Spec-Integration Ticket Shape prescribes.
3. Re-enumerated expected counts (computed from the fixture at test start) rather than hardcoded, so assertions remain valid as animalia's canon grows. Example: the replay test asserts `files_written.filter(w => w.file_path.includes("_source/canon/")).length === <computed count of new CFs in the replayed plan>`, not `=== 5`.
4. Performance gate uses a wall-clock assertion (`assert(elapsed_ms < 2000)`) for the <2s large-plan target from SPEC-03 §Risks. Per the skill's Spec-Integration Ticket Shape guidance, this is a dev-loop expectation rather than a strict CI gate — the test logs a warning if exceeded by 10% but does not fail CI unless exceeded by 100% (`elapsed_ms >= 4000`). Rationale: CI hardware variance can cause spurious failures at tight wall-clock thresholds; the dev-loop signal is what matters.
5. The MCP boundary is exercised via the MCP server's in-process dispatch (stand up the MCP server inside the test; send a `submit_patch_plan` request; receive the response). No stdio subprocess is required for tests — the server's handler is callable in-process.
6. No backwards-compatibility aliasing/shims introduced. The capstone tests the engine as specified; pre-SPEC-13 paths are not exercised (they do not exist).

## Verification Layers

Each SPEC-03 §Verification bullet maps to its own proof surface. One assertion per bullet so failures pinpoint the offending invariant:

1. **Unit** → ticket 008 (not this ticket; noted for completeness so the capstone's sub-cases don't duplicate the unit suite).
2. **Integration** → test case: replay a historical `canon-addition` delivery (CH-0013 or a current substitute) as a patch plan against the fixture copy of animalia; verify `_source/` tree state matches the expected post-delivery state record-by-record (diff `after/_source/` against expected).
3. **Atomicity** → three sub-test cases:
   - inject failure at Phase A step 5 (mock SPEC-04 validator to return `fail`); verify no temp files exist and no files changed on disk.
   - inject failure at Phase B temp-write step (mock `fs.writeFile` to throw on the 3rd op); verify earlier temp files unlinked, disk unchanged.
   - inject failure at Phase B rename step (mock `fs.rename` to throw on the 3rd op); verify earlier renames are in place on disk (forward-only failure mode per spec), remaining temps unlinked.
4. **Record-hash drift** → mutate a target atomic record between plan authoring and submit (edit `_source/canon/CF-0001.yaml` in the fixture after computing the plan's `expected_content_hash`); verify engine rejects with `record_hash_drift` code.
5. **Hybrid anchor drift** → same pattern for a hybrid character or diegetic-artifact file; verify `anchor_drift` rejection.
6. **Approval token** → 4 sub-test cases: unsigned token, expired token, tampered HMAC, replayed token. Each rejected with its specific error code (`approval_invalid_hmac`, `approval_expired`, `approval_replayed`, etc.).
7. **Write-order** → submit a plan with patches in pathological order (all Tier 3 ops first, then Tier 2, then Tier 1); verify `_source/` on-disk state after apply matches the canonical Tier 1 → Tier 2 → Tier 3 order (e.g., the Tier 3 `append_adjudication_record` references a CF that Tier 1 `create_cf_record` produced — applying out of order would reference a non-existent CF).
8. **Append-only runtime** → attempt to construct a hypothetical `replace_cf_record` op via a JSON payload that bypasses TypeScript; submit to the engine; verify runtime schema validator rejects with `op_unknown` or `envelope_shape_invalid`. (Compile-time rejection is ticket 008's probe; this is the runtime complement.)
9. **Retcon attestation** → submit a plan with `update_record_field` on `CF-0001.statement` without `retcon_attestation`; verify engine rejects with `retcon_attestation_required`.
10. **Attribution** → submit a plan creating a CF and appending extensions to three SEC records; verify (a) all three SEC records' `extensions[]` carry the correct `originating_cf` / `change_id` / `date` / `label` / `body`, and (b) each SEC's `touched_by_cf[]` includes the new CF-ID (via the auto-add).
11. **`append_touched_by_cf` auto-add** → submit an `append_extension` op targeting a SEC without an explicit `append_touched_by_cf` op in the patch list; verify engine's reordered plan includes the auto-added op (assert via `PatchReceipt.files_written` or via direct on-disk SEC record inspection post-apply).
12. **Post-apply sync integration** → submit a plan creating a new CF and SEC; after apply, call `mcp__worldloom__get_record(new_cf_id)` (requires SPEC-02 Phase 2) and verify the record is returned; call `find_sections_touched_by(new_cf_id)` and verify the new SEC is in the result list. This proves `world-index sync` correctly refreshed the index post-apply.
13. **Performance** → assemble a ~13-op plan (6 domain file sections + 4 modification_history entries + 3 MR extensions, matching the SPEC-03 §Risks line 311 example); measure wall-clock from `submitPatchPlan` call to `PatchReceipt` return; assert <4000ms (hard CI gate at 2x the <2s target) AND log warning if >2200ms (10% over the target).

## What to Change

### 1. Create `tools/patch-engine/tests/integration/end-to-end-canon-addition.test.ts`

One `describe(...)` block per SPEC-03 §Verification bullet above. Each block opens with a `beforeEach` that calls `fs.cpSync` on animalia to a temp root + builds a fresh index via `world-index build <tmp-slug>`; `afterEach` removes the temp root.

### 2. Create `tools/patch-engine/tests/integration/fixtures/` subdirectory

- `historical-canon-addition/CH-0013-plan.json` — a pre-serialized patch plan envelope matching CH-0013's historical delivery (assembled by reading `worlds/animalia/_source/change-log/CH-0013.yaml` at implementation time and reconstructing the plan).
- `historical-canon-addition/expected-after/_source/` — snapshot of the post-delivery state (generated from animalia's current state, treated as the expected output).
- `pathological-ordering-plan.json` — a patch plan with tier-inverted ordering.
- `large-plan-13-ops.json` — a 13-op performance-gate fixture.

### 3. Create `tools/patch-engine/tests/integration/harness.ts`

Helpers: `copyAnimaliaToTmp()`, `buildIndexAt(tmp, slug)`, `startMcpServer(tmp)` (in-process MCP server startup bound to the temp fixture), `submitViaMcp(server, envelope, token)` (sends JSON-RPC `submit_patch_plan`, returns typed `PatchReceipt | McpError`).

### 4. Update `tools/patch-engine/package.json` scripts

Add `"test:integration": "npm run build && node --test dist/tests/integration/*.test.js"` so the heavy integration suite can be run separately from the unit suite (ticket 008). The default `npm test` runs both.

## Files to Touch

- `tools/patch-engine/tests/integration/end-to-end-canon-addition.test.ts` (new)
- `tools/patch-engine/tests/integration/harness.ts` (new)
- `tools/patch-engine/tests/integration/fixtures/historical-canon-addition/CH-0013-plan.json` (new)
- `tools/patch-engine/tests/integration/fixtures/historical-canon-addition/expected-after/_source/...` (new — multiple YAML files)
- `tools/patch-engine/tests/integration/fixtures/pathological-ordering-plan.json` (new)
- `tools/patch-engine/tests/integration/fixtures/large-plan-13-ops.json` (new)
- `tools/patch-engine/package.json` (modify — add `test:integration` script)

## Out of Scope

- Per-op unit tests — ticket 008.
- SPEC-04 validator unit tests — SPEC-04's suite.
- SPEC-02 Phase 2 tooling implementation (`get_record`, `find_sections_touched_by`, extended `allocate_next_id`) — separate work per SPEC-03 Dependencies. This ticket EXERCISES that tooling but does not implement it; if the Phase 2 update has not landed when implementation begins, split per Assumption Reassessment item 2.
- CI-infrastructure wiring (adding the integration suite to the GitHub Actions matrix, wall-clock variance tuning) — separate ops ticket.
- Fault-injection library (the simplest approach uses `t.mock.method()` from `node:test`'s built-in mock; no new framework needed).

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/patch-engine && npm run test:integration` exits 0.
2. Each of SPEC-03 §Verification bullets 2-11 from the verification layers above has at least one assertion that passes.
3. Performance gate: wall-clock for the 13-op plan completes in <4000ms on CI; `>2200ms` emits a warning to stderr.
4. `find tools/patch-engine/tests/integration -name "*.test.ts" | xargs grep -l "^test(\|^describe(" | wc -l` ≥1 (at least one integration test file).
5. No fixture scenario mutates `worlds/animalia/_source/` — verified by asserting `git diff worlds/animalia/_source/` after the full suite runs is empty.

### Invariants

1. Fixture-world copy isolation: no test mutates the real `worlds/animalia/` tree at any step.
2. Every SPEC-03 §Verification bullet (post-reassessment, 11 bullets) has a corresponding test assertion — none silently skipped.
3. Re-enumerated expected counts (not hardcoded) so tests remain valid as animalia grows.
4. The capstone exercises the full `world-mcp → patch-engine` path — not a direct `submitPatchPlan` import — so the MCP boundary is part of the tested surface.
5. The performance gate is a warning-then-hard-fail threshold (`>10%` warning, `>100%` fail) rather than a tight `<2s` hard gate, per the skill's Spec-Integration Ticket Shape guidance on wall-clock perf assertions.

## Test Plan

### New/Modified Tests

1. `tools/patch-engine/tests/integration/end-to-end-canon-addition.test.ts` — the capstone itself. Rationale: SPEC-03 §Verification's integration + atomicity + drift + approval + write-order + append-only + retcon + attribution + auto-add + sync integration + performance bullets all need exercising against the real pipeline composed by tickets 001-007.
2. `tools/patch-engine/tests/integration/harness.ts` — shared fixture + MCP-server setup utilities.
3. Four fixture files under `tools/patch-engine/tests/integration/fixtures/` — historical plan + expected state + pathological plan + large plan.

### Commands

1. `cd tools/patch-engine && npm run test:integration` (full integration suite).
2. `git diff worlds/animalia/_source/` — should return empty after running the full suite, confirming fixture-isolation invariant.
3. `cd tools/patch-engine && npm run test:integration 2>&1 | grep -c "^ok "` should return ≥11 (one passing assertion per SPEC-03 §Verification bullet 2-11 + performance).
