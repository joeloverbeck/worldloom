# SPEC03PATENG-009: Integration / acceptance capstone — full SPEC-03 §Verification matrix

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Large
**Engine Changes**: Yes — added a narrow `preApplyValidator` test seam to `tools/patch-engine/src/apply.ts`, added `tools/patch-engine/tests/integration/end-to-end-canon-addition.test.ts` plus supporting harness helpers, added a `test:integration` package script, and corrected the auto-add implementation/docs so `append_extension` on a SEC updates `touched_by_cf[]` in the same staged write. The successful apply assertions run through the `@worldloom/patch-engine` public entrypoint; the MCP delegation boundary remains covered by `tools/world-mcp` tests because `tools/patch-engine` must not take a reverse dependency on `tools/world-mcp`.
**Deps**: archive/tickets/SPEC03PATENG-007.md (world-mcp rewire), archive/tickets/SPEC03PATENG-008.md (per-op unit suite prerequisite), archive/tickets/SPEC02PHA2TOO-001.md, archive/tickets/SPEC02PHA2TOO-002.md, archive/tickets/SPEC02PHA2TOO-003.md (retrieval-tool prerequisites). SPEC-04 remains absent in the live repo; this ticket does not implement SPEC-04 and preserves the default `validator_unavailable` fail-closed behavior.

## Problem

SPEC-03 §Verification enumerates acceptance bullets beyond the per-op unit tests in archived `SPEC03PATENG-008`. This ticket adds the package-level integration capstone that exercises successful apply, validator fail-closed atomicity, record-hash drift, approval-token rejection/replay, pathological write ordering, append-only runtime rejection, retcon attestation, attribution, `append_touched_by_cf` auto-add behavior, post-apply `world-index sync`, and the performance threshold against isolated indexed fixture worlds.

## Assumption Reassessment (2026-04-24; amended 2026-04-25)

1. `worlds/animalia/_source/` is the migrated atomic-source canonical state (migration completed 2026-04-24 per SPEC-13; confirmed at reassessment). This ticket uses isolated generated fixture worlds under `/tmp` rather than copying animalia; the real `worlds/animalia/` tree is never mutated. Expected IDs are computed from the fixture index at test setup time, not hardcoded.
2. SPEC-02 Phase 2 tooling update (adds `get_record`, `find_sections_touched_by`, extends `allocate_next_id` to INV/OQ/ENT/SEC) is already archived and remains the MCP-side consumer context. This ticket does not call those MCP tools directly because patch-engine cannot depend on world-mcp; it proves post-apply sync by querying the rebuilt fixture `world.db` directly for the new records and `patched_by` edge.
3. Archived `SPEC03PATENG-006` intentionally fails closed with `validator_unavailable` at the SPEC-04 pre-apply step because validators are not implemented yet. Live `tools/patch-engine/src/apply.ts` still returns that sentinel from `runPreApplyValidators()`. Correction: this ticket owns a narrow injectable `preApplyValidator` option used only by integration tests; the default production behavior remains fail-closed until SPEC-04 lands.
4. Shared boundary: this ticket exercises `@worldloom/patch-engine` → `world-index sync` end-to-end through the package public entrypoint. The `world-mcp` → `@worldloom/patch-engine` delegation boundary is already live in `tools/world-mcp/src/tools/submit-patch-plan.ts` and covered by `tools/world-mcp/tests/tools/submit-patch-plan.test.ts` / `tools/world-mcp/tests/server/dispatch.test.ts`; adding a reverse test dependency from patch-engine to world-mcp would invert the package ownership boundary.
5. FOUNDATIONS principles under audit: **Rule 6 No Silent Retcons** via the retcon-attestation and `append_touched_by_cf` auto-add assertions; **HARD-GATE discipline** via the approval-token rejection matrix (unsigned / expired / tampered / replayed tokens).
6. This ticket does not weaken the Mystery Reserve firewall. The capstone does not add a Mystery Reserve mutation assertion; SPEC-04's `rule7_mystery_reserve_preservation` owns disallowed-answer and MR-firewall enforcement, and existing per-op tests remain the narrow proof that `append_extension` accepts supported extension targets.
7. Adjacent contradictions: the capstone's integration-replay scenario asks for "a historical `canon-addition` delivery (e.g., CH-0013's five parallel named-polity-instance commitments on animalia, post-migration)" (SPEC-03 line 281). Live animalia already contains the post-delivery state and the engine has no reverse-delta authoring facility, so the truthful replay seam is a fresh synthetic canon-addition plan against a temp indexed fixture world, with live animalia used only to confirm the atomic-source/index contract and fixture-isolation invariant.
8. Package command reassessment: `tools/patch-engine/package.json` has `build`, `test`, `test:compile-reject`, and `clean`, but no `test:integration` script. The repo root has no package-manager workspace command for this family, so acceptance remains package-local `npm`.
9. Current broader consumer noise: `cd tools/world-mcp && npm test` currently has an unrelated stdio lifecycle assertion failure in `tools/world-mcp/tests/integration/server-stdio.test.ts`; the patch-engine ticket does not own that test.
10. Integration exposed a same-seam implementation contradiction: materializing auto-add as a second `append_touched_by_cf` staged op would create duplicate temp writes for the same SEC file. Correction: `append_extension` now applies the `touched_by_cf[]` effect inside the same staged SEC write, and SPEC-03 / README wording now describes the behavioral contract rather than a required synthetic-op implementation.

## Architecture Check

1. Spec-Integration Ticket Shape with required same-seam fallout: production default behavior remains unchanged, but `submitPatchPlan(..., { preApplyValidator })` lets tests exercise the successful apply path without implementing or bypassing SPEC-04 globally. The option is explicit and defaults to the existing `validator_unavailable` sentinel.
2. Temp indexed fixture worlds keep the real `worlds/animalia/` tree untouched. Tests build or seed isolated worlds under `/tmp`; no test writes to the live world.
3. Expected IDs are computed from the fixture index at test setup time rather than hardcoded.
4. Performance gate uses a wall-clock assertion for the SPEC-03 §Risks target: the test logs a warning if the integrated plan exceeds 2200ms and fails at 4000ms. Rationale: CI hardware variance can cause spurious failures at tight wall-clock thresholds; the dev-loop signal is what matters.
5. The MCP boundary is not imported from patch-engine tests because `tools/world-mcp` already depends on `@worldloom/patch-engine`; importing world-mcp back into patch-engine would create a cyclic package test dependency. Existing world-mcp tests remain the truthful delegation proof.
6. No backwards-compatibility aliasing/shims introduced. The capstone tests the engine as specified; pre-SPEC-13 paths are not exercised (they do not exist).

## Verification Layers

Each SPEC-03 §Verification bullet owned by the current live engine surface maps to a focused proof surface or an explicit reassessment narrowing:

1. **Unit** → `archive/tickets/SPEC03PATENG-008.md` plus the updated `append_extension` unit assertion for same-write `touched_by_cf[]` auto-add.
2. **Integration** → test case: submit a fresh canon-addition patch plan against an isolated indexed fixture world; verify `_source/` tree state, `PatchReceipt`, and post-apply index state.
3. **Atomicity** → injected Phase A pre-apply validator failure; verify no source file exists and no temp files remain.
4. **Record-hash drift** → submit an atomic-record update with stale `expected_content_hash`; verify engine rejects with `record_hash_drift`.
5. **Hybrid anchor drift** → reassessment found no live SPEC-03 op that updates an existing hybrid file; the shipped hybrid ops are new-file append operations. Dedicated `anchor_drift` is therefore not asserted in this capstone; existing per-op tests cover traversal/existing-file rejection for hybrid append ops.
6. **Approval token** → 4 sub-test cases: unsigned token, expired token, tampered HMAC, replayed token. Each rejected with its specific error code (`approval_invalid_hmac`, `approval_expired`, `approval_replayed`, etc.).
7. **Write-order** → submit a plan with patches in pathological order (all Tier 3 ops first, then Tier 2, then Tier 1); verify `_source/` on-disk state after apply matches the canonical Tier 1 → Tier 2 → Tier 3 order (e.g., the Tier 3 `append_adjudication_record` references a CF that Tier 1 `create_cf_record` produced — applying out of order would reference a non-existent CF).
8. **Append-only runtime** → attempt to construct a hypothetical `replace_cf_record` op via a JSON payload that bypasses TypeScript; submit to the engine; verify runtime schema validator rejects with `op_unknown` or `envelope_shape_invalid`. (Compile-time rejection is archived `SPEC03PATENG-008`'s probe; this is the runtime complement.)
9. **Retcon attestation** → submit a plan with `update_record_field` on `CF-0001.statement` without `retcon_attestation`; verify engine rejects with `retcon_attestation_required`.
10. **Attribution** → submit a plan creating a CF and appending an extension to a SEC record; verify the SEC record's `extensions[]` carries the correct `originating_cf` / `change_id` / `label`, and `touched_by_cf[]` includes the new CF-ID via the auto-add behavior.
11. **`append_touched_by_cf` auto-add** → submit an `append_extension` op targeting a SEC without an explicit `append_touched_by_cf` op in the patch list; verify direct on-disk SEC record inspection post-apply includes the CF-ID.
12. **Post-apply sync integration** → submit a plan creating a new CF and SEC; after apply, query the rebuilt `world.db` directly for the new records and `patched_by` edge. This proves `world-index sync` refreshed the index post-apply without adding a reverse package dependency on world-mcp retrieval helpers.
13. **Performance** → measure wall-clock for the integrated canon-addition plan from `submitPatchPlan` call to `PatchReceipt` return; assert <4000ms (hard CI gate at 2x the <2s target) AND log warning if >2200ms (10% over the target).

## What to Change

### 1. Add a narrow pre-apply validator test seam

Add `preApplyValidator?: () => Promise<{ok: true} | EngineError>` to `SubmitPatchPlanOptions`, with the default still returning `validator_unavailable`. Tests pass an explicit successful or failing validator.

### 2. Create `tools/patch-engine/tests/integration/end-to-end-canon-addition.test.ts`

One integration file with one or more `test(...)` cases covering successful apply, atomicity/failure injection, drift, approval token cases, write order, append-only runtime rejection, retcon attestation, attribution, auto-add, post-apply sync, and performance.

### 3. Extend `tools/patch-engine/tests/harness.ts`

Helpers for isolated indexed fixture worlds, secret creation, next-id calculation, and signed-token envelope submission.

### 4. Update `tools/patch-engine/package.json` scripts

Add `"test:integration": "npm run build && node --test dist/tests/integration/*.test.js"` so the integration suite can be run separately from the unit suite archived in `SPEC03PATENG-008`. The default `npm test` runs both because `dist/tests/**/*.test.js` includes integration tests.

## Files to Touch

- `tools/patch-engine/tests/integration/end-to-end-canon-addition.test.ts` (new)
- `tools/patch-engine/tests/harness.ts` (modify)
- `tools/patch-engine/src/apply.ts` (modify)
- `tools/patch-engine/src/commit/order.ts` (modify)
- `tools/patch-engine/src/ops/append-extension.ts` (modify)
- `tools/patch-engine/tests/commit/order.test.ts` (modify)
- `tools/patch-engine/tests/ops/append-extension.test.ts` (modify)
- `tools/patch-engine/package.json` (modify — add `test:integration` script)
- `tools/patch-engine/README.md` (modify — auto-add wording)
- `specs/SPEC-03-patch-engine.md` (modify — auto-add wording)

## Out of Scope

- Per-op unit tests — archived `SPEC03PATENG-008`.
- SPEC-04 validator unit tests — SPEC-04's suite.
- SPEC-02 Phase 2 tooling implementation (`get_record`, `find_sections_touched_by`, extended `allocate_next_id`) — completed separately via archived SPEC02PHA2TOO tickets. This ticket does not implement or reverse-import those tools.
- CI-infrastructure wiring (adding the integration suite to the GitHub Actions matrix, wall-clock variance tuning) — separate ops ticket.
- Phase B filesystem fault-injection library. This capstone covers Phase A fail-closed atomicity; lower-level temp-write/rename behavior remains covered by commit/op unit surfaces.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/patch-engine && npm run test:integration` exits 0.
2. Each SPEC-03 §Verification bullet owned by the live post-SPEC-13 engine surface has at least one assertion that passes or is truthfully narrowed to the current live engine code path.
3. Performance gate: wall-clock for the integrated canon-addition plan completes in <4000ms on CI; `>2200ms` emits a warning to stderr.
4. `find tools/patch-engine/tests/integration -name "*.test.ts" | xargs grep -l "^test(" | wc -l` returns `1` or more.
5. No fixture scenario mutates `worlds/animalia/_source/` — verified by `git diff -- worlds/animalia/_source` after the full suite.

### Invariants

1. Fixture-world isolation: no test mutates the real `worlds/animalia/` tree at any step.
2. Every SPEC-03 §Verification bullet owned by the current live engine surface has a corresponding test assertion or an explicit reassessment narrowing — none silently skipped.
3. Re-enumerated expected IDs (not hardcoded) so tests remain valid as fixtures grow.
4. The capstone exercises the patch-engine public entrypoint and world-index sync; the MCP boundary is covered by existing world-mcp delegation tests, not by a reverse dependency from patch-engine.
5. The performance gate is a warning-then-hard-fail threshold (`>10%` warning, `>100%` fail) rather than a tight `<2s` hard gate, per the skill's Spec-Integration Ticket Shape guidance on wall-clock perf assertions.

## Test Plan

### New/Modified Tests

1. `tools/patch-engine/tests/integration/end-to-end-canon-addition.test.ts` — the capstone itself. Rationale: SPEC-03 §Verification's integration + validator fail-closed atomicity + drift + approval + write-order + append-only + retcon + attribution + auto-add + sync integration + performance bullets all need exercising against the patch-engine public entrypoint and world-index sync.
2. `tools/patch-engine/tests/harness.ts` — shared fixture-world and signed-token helpers.
3. `tools/patch-engine/src/apply.ts` — injectable pre-apply validator seam for integration tests, defaulting to fail-closed production behavior.

### Commands

1. `cd tools/patch-engine && npm run test:integration` (full integration suite).
2. `git diff worlds/animalia/_source/` — should return empty after running the full suite, confirming fixture-isolation invariant.
3. `cd tools/patch-engine && npm test` (unit plus integration package proof).
4. `cd tools/patch-engine && npm run test:compile-reject` (compile-time append-only proof remains intact).

## Outcome

Implemented the package-local SPEC-03 integration capstone. The patch-engine now exposes an explicit `preApplyValidator` option for tests while preserving the default fail-closed SPEC-04 sentinel. The integration suite creates isolated indexed fixture worlds, submits signed patch plans through `submitPatchPlan`, proves successful apply/write-order/post-sync behavior, proves validator rejection leaves no source writes or temp files, proves drift/append-only/retcon rejection paths, proves approval-token malformed/expired/tampered/replay cases, and confirms the performance threshold.

The auto-add implementation was corrected during integration: instead of materializing a second synthetic `append_touched_by_cf` op that would create duplicate same-file temp writes, `append_extension` on a SEC now adds the originating CF to `touched_by_cf[]` inside the same staged SEC write. `specs/SPEC-03-patch-engine.md` and `tools/patch-engine/README.md` were updated to state the behavioral contract rather than the stale synthetic-op implementation detail.

## Verification Result

1. `cd tools/patch-engine && npm run build` — PASS.
2. `cd tools/patch-engine && npm run test:integration` — PASS.
3. `cd tools/patch-engine && npm test` — PASS, 35 tests.
4. `cd tools/patch-engine && npm run test:compile-reject` — PASS by expected TypeScript rejection of `replace_cf_record`, `delete_cf_record`, and `insert_before_node`.
5. `find tools/patch-engine/tests/integration -name "*.test.ts" | xargs grep -l "^test(" | wc -l` — PASS, returned `1`.
6. `git diff -- worlds/animalia/_source` — PASS, empty.

## Deviations

1. The capstone does not import or start `tools/world-mcp` from the patch-engine package because that would invert the live package dependency (`world-mcp` depends on `@worldloom/patch-engine`). The MCP delegation seam remains covered by existing world-mcp tests; this ticket owns the patch-engine public entrypoint plus post-apply world-index sync.
2. Dedicated `anchor_drift` for existing hybrid-file updates is not asserted because the live post-SPEC-13 operation vocabulary has only new-file hybrid append ops. Existing hybrid op tests cover traversal and existing-file rejection.
3. `cd tools/world-mcp && npm test` was probed during reassessment and currently has an unrelated stdio lifecycle failure in `tools/world-mcp/tests/integration/server-stdio.test.ts`; this ticket did not modify or rely on that broad lane.
