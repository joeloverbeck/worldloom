# MCPENH-064: Add `verify_pg_state_hash` MCP tool for prose-attach committed-page verification

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `tools/world-mcp` (new MCP tool + server registration + capability declaration + package/repo docs), `.claude/skills/branching-story-prose-attach/SKILL.md` (Phase 2 verification recipe).
**Deps**: None.

## Problem

At intake, `branching-story-prose-attach` Phase 2 (hash integrity check) required recomputing a committed PG record's `state_hash` to detect tamper, but the skill explicitly forbade the `compute-pg-hashes` CLI for this purpose: the CLI re-stamps `plan_hash` via `applyComputedPlanHash` (`tools/world-mcp/src/cli/compute-pg-hashes.ts`) before computing `state_hash`, which re-introduces the plan-file-to-state-hash coupling SPEC-72 §2.2 removes. The skill prescribed "recompute via `computePgStateHash` from `@worldloom/world-index/hash/content` directly on the parsed PG record" but exposed no MCP tool that did this — operators had to `cd tools/world-mcp` (or `tools/world-index`), invoke ad hoc Node, and know which package directory made the YAML parser importable.

Observed pre-ticket evidence came from the `/branching-story-prose-attach --page_id PG-3` run on `red-bunny`: the operator's first `node -e` invocation from the repo root failed with `Cannot find module 'yaml'`, requiring a `cd tools/world-index` retry. The landed typed MCP tool encapsulates the helper, package interop, and working-directory behavior.

## Assumption Reassessment (2026-05-23)

1. **Codebase**: At intake, `tools/world-mcp/src/tools/` enumerated 23 tools and none performed verify-only PG hash recomputation. `tools/world-mcp/src/package-interop.ts` already re-exported `computePgStateHash` and `computePlanHash` from `@worldloom/world-index/hash/content`. `tools/world-mcp/src/cli/compute-pg-hashes.ts` still uses `applyComputedPlanHash`, confirming the CLI's authoring-time plan-hash-restamp behavior that prose-attach forbids for verification-time checks.
2. **Doc**: `.claude/skills/branching-story-prose-attach/SKILL.md` Phase 2 now calls `mcp__worldloom__verify_pg_state_hash(world_slug, story_slug, page_id)` and preserves the authoring-time CLI carve-out for `branching-story-bootstrap` Phase 7 and `branching-story-turn-cycle` Phase 9. `.claude/skills/_shared-templates/story-state-contract.md` §4.2a's verifier-vs-authoring split is preserved.
3. **Shared boundary under audit**: the MCP tool surface for hash verification, consumed by `branching-story-prose-attach` Phase 2 (the only current verifier-time recompute consumer). The authoring-time path through `compute-pg-hashes.ts` is unaffected. The new tool's output schema is bounded — a small JSON object — and does not extend any existing record schema.
4. **FOUNDATIONS principle / Tooling Recommendation restatement**: FOUNDATIONS §Tooling Recommendation directs operators to typed retrieval and engine-routed operations rather than direct filesystem access for canon-adjacent surfaces. Verifier-time PG hash recomputation is canon-adjacent (the PG record is `_source/`-housed and the receipt verdict is authoritative for prose publication). Exposing the verification through an MCP tool aligns with the Tooling Recommendation by removing the working-directory/working-knowledge dependency of the current `node -e` recipe.
5. **Implementation correction (2026-05-23)**: live `tools/world-mcp/src/tools/get-record.ts` keeps `findRecordRow` private and exports `resolveRecordRow`. The tool reuses `resolveRecordRow` instead of importing the private query function. It parses the row body directly so `computePgStateHash` receives the committed PG mapping without `get_record` response metadata such as `record_kind`. The new MCP tool also required `tools/world-mcp/src/tool-names.ts`, server list/dispatch capability tests, `tools/world-mcp/README.md`, and `docs/MACHINE-FACING-LAYER.md` to move with the handler/registration so the public surface remained truthful.
6. **Pre-edit baseline (2026-05-23)**: `cd tools/world-mcp && npm test` passed before source edits (`429` tests reported, `0` failures). Pre-existing ignored package artifacts were present before the run: `tools/world-mcp/.secret`, `tools/world-mcp/dist/`, and `tools/world-mcp/node_modules/`.

## Architecture Check

1. The new tool is a thin wrapper: parse PG → call `computePgStateHash` → return `{recorded_state_hash, computed_state_hash, state_hash_match, recorded_plan_hash, computed_plan_hash, plan_hash_match}` shape. The implementation reuses the existing `package-interop.ts` re-exports and `resolveRecordRow` from `get-record.ts`, keeping the new code surface minimal. No alternative encoding scheme, no separate helper, no separate hashing regime.
2. No backwards-compatibility shims: `compute-pg-hashes` CLI behavior is preserved for the authoring-time use case (`branching-story-bootstrap` Phase 7, `branching-story-turn-cycle` Phase 9); the new tool serves the verifier-time use case explicitly. There is no aliasing between the two surfaces.

## Verification Layers

1. Tool present in capability surface → focused server inventory/dispatch tests confirm `verify_pg_state_hash` appears in `listTools` / `describe_capabilities` and dispatches through the MCP boundary.
2. Tool returns correct match-shape for an unaltered PG → temp-index fixture invocation yields `{recorded_state_hash, computed_state_hash, state_hash_match: true, recorded_plan_hash, computed_plan_hash, plan_hash_match: true, ...}`.
3. Tool returns `match: false` for a tampered PG → fixture mutation test (modify `turn_index` or `branch_id` in a test PG, expect `match: false`).
4. Tool does NOT re-stamp `plan.plan_hash` before computing `state_hash` → grep proof that the implementation imports `computePgStateHash` only and does not import or call `applyComputedPlanHash`.

## Landed Changes

### 1. New MCP tool `verify_pg_state_hash`

Created `tools/world-mcp/src/tools/verify-pg-state-hash.ts` exporting `verifyPgStateHash(args: { world_slug: string; story_slug: string; page_id: string })`. Implementation:
- Reuse `resolveRecordRow({ world_slug, record_id: page_id, story_slug })` from `get-record.ts` to locate the PG row by id.
- Parse the row's `body` as YAML to obtain the PG payload.
- Read the recorded `state_hash` and `plan.plan_hash` directly from the parsed PG (no normalization, no re-stamping).
- Import `computePgStateHash` from `../package-interop.js` and invoke on the parsed PG (the helper excludes `state_hash` from its payload per `tools/world-index/src/hash/content.ts:56`).
- For the plan hash advisory check, additionally read the plan file at `worlds/<world_slug>/stories/<story_slug>/pages-prose-plans/<page_id>.md` and sha256 the bytes via `computePlanHash` from `package-interop.ts`.
- Return `{world_slug, story_slug, page_id, recorded_state_hash, computed_state_hash, state_hash_match: boolean, recorded_plan_hash, computed_plan_hash, plan_hash_match: boolean | null}` plus `content_hash` and `file_path`. Plan-file-absent is a non-fatal soft state: return `computed_plan_hash: null, plan_hash_match: null` so the prose-attach verifier can render the SPEC-72 advisory WARN path.
- Errors: page-not-found → `invalid_input`; YAML parse failure → `invalid_input` with the parser error; story_slug mismatch → `invalid_input` (consistent with existing get_record story-bundle id discipline).

### 2. Server registration

Added a `verify_pg_state_hash` tool registration in `tools/world-mcp/src/server.ts`. The description names the prose-attach Phase 2 use case, the explicit non-stamp guarantee, and the SPEC-72 advisory split.

### 3. Capability declaration

Appended `verify_pg_state_hash` to the registered MCP tool inventory (`tools/world-mcp/src/tool-names.ts`, `tools/world-mcp/src/server.ts`) so `describe_capabilities` exposes it under the existing retrieval-tool cluster. Updated list-tools and dispatch tests for the 24-tool inventory.

### 4. Prose-attach skill update

Updated `.claude/skills/branching-story-prose-attach/SKILL.md` Phase 2 to verify via `mcp__worldloom__verify_pg_state_hash(world_slug, story_slug, page_id)`. The carve-out paragraph naming `branching-story-bootstrap` Phase 7 / `branching-story-turn-cycle` Phase 9 as legitimate CLI consumers stays unchanged.

## Files to Touch

- `tools/world-mcp/src/tools/verify-pg-state-hash.ts` (new)
- `tools/world-mcp/src/tool-names.ts` (modify)
- `tools/world-mcp/src/server.ts` (modify)
- `tools/world-mcp/tests/tools/verify-pg-state-hash.test.ts` (new)
- `tools/world-mcp/tests/server/list-tools.test.ts` (modify)
- `tools/world-mcp/tests/server/dispatch.test.ts` (modify)
- `tools/world-mcp/README.md` (modify)
- `docs/MACHINE-FACING-LAYER.md` (modify)
- `.claude/skills/branching-story-prose-attach/SKILL.md` (modify)

## Out of Scope

- Authoring-time hash stamping. `compute-pg-hashes` CLI and its consumers (`branching-story-bootstrap` Phase 7, `branching-story-turn-cycle` Phase 9) are unchanged.
- STCHAR hash verification (covered separately by VALENH-029 / MCPENH-062 surfaces).
- New patch-engine ops. This tool is read-only and emits no record mutations.
- Bulk verification across all PGs in a bundle. Out of scope for this ticket — file a follow-up MCPENH ticket if a health-audit consumer needs that.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/world-mcp && npm test` — passes including new test file `tests/tools/verify-pg-state-hash.test.ts`.
2. Test case: invoke on a temp-index PG fixture → `state_hash_match: true`, `plan_hash_match: true`.
3. Test case: tampered PG fixture (mutated `turn_index`) → `state_hash_match: false`.
4. Test case: plan file mutated (e.g. trailing newline added) → `plan_hash_match: false`, `state_hash_match: true` (advisory split holds).
5. Test case: page-not-found → `invalid_input` error response.

### Invariants

1. The tool MUST NOT modify `plan.plan_hash` (or any other PG field) before computing `state_hash`. Grep-proof: `tools/world-mcp/src/tools/verify-pg-state-hash.ts` contains no `applyComputedPlanHash` import and no PG-field mutation between parse and compute.
2. `computed_state_hash` MUST equal the result of `computePgStateHash` on the parsed PG read from `_source/pages/<page_id>.yaml` byte-for-byte (modulo YAML parse). Grep-proof: implementation imports `computePgStateHash` from `../package-interop.js` and passes the parsed-and-unmodified PG object.
3. Plan-file-absent is non-fatal. The tool returns `computed_plan_hash: null, plan_hash_match: null` instead of erroring.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/tools/verify-pg-state-hash.test.ts` (new) — unit tests for the five Tests-That-Must-Pass cases above.
2. Existing server inventory/dispatch tests update to include the new registered tool.

### Commands

1. `cd tools/world-mcp && npm run build`
2. `cd tools/world-mcp && npm test`
3. `cd tools/world-mcp && node --test dist/tests/server/list-tools.test.js dist/tests/server/dispatch.test.js dist/tests/tools/verify-pg-state-hash.test.js` — focused handler + MCP inventory/dispatch proof.

## Outcome

Implemented `mcp__worldloom__verify_pg_state_hash` as a read-only MCP tool over indexed PG records. The tool computes `state_hash` directly from the parsed committed PG body without re-stamping `plan.plan_hash`, computes the advisory plan hash from `pages-prose-plans/<page_id>.md` when present, and returns nullable plan-hash comparison fields when the plan file is absent. The tool is registered in the MCP inventory, surfaced through `describe_capabilities`, documented in the package README and `docs/MACHINE-FACING-LAYER.md`, and consumed by `branching-story-prose-attach` Phase 2.

## Verification Result

1. `cd tools/world-mcp && npm run build` — passed after source/test edits.
2. `cd tools/world-mcp && node --test dist/tests/server/list-tools.test.js dist/tests/server/dispatch.test.js dist/tests/tools/verify-pg-state-hash.test.js` — passed (`41` tests, `0` failures), covering handler match/mismatch/advisory/missing-page behavior plus MCP list/dispatch registration.
3. `cd tools/world-mcp && npm test` — passed after implementation (`434` tests reported, `0` failures). The suite rebuilds `dist/` before executing compiled tests.
4. Manual review / grep proof: `tools/world-mcp/src/tools/verify-pg-state-hash.ts` imports `computePgStateHash` and does not import or call `applyComputedPlanHash`; the only plan-hash computation uses `computePlanHash` over the plan file bytes for advisory comparison.
5. `git diff --check -- <owned tracked paths>` plus explicit trailing-whitespace/final-newline checks for the two new untracked files — passed.

## Deviations

- Reassessment corrected the drafted private-helper reference: the implementation uses exported `resolveRecordRow` and parses the indexed row body directly instead of importing private `findRecordRow` or using `parseRecordBody` metadata.
- The drafted `red-bunny` live-world test was replaced with a portable temp-index fixture in `tools/world-mcp/tests/tools/verify-pg-state-hash.test.ts`. This keeps the proof CI-safe and still covers the same PG hash invariants.
- Pre-existing ignored package artifacts remained in place: `tools/world-mcp/.secret`, `tools/world-mcp/node_modules/`. `tools/world-mcp/dist/` was refreshed by `npm run build` / `npm test` and is an expected ignored generated artifact.
