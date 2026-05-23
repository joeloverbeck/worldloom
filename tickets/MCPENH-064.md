# MCPENH-064: Add `verify_pg_state_hash` MCP tool for prose-attach committed-page verification

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `tools/world-mcp` (new MCP tool + server registration + capability declaration), `.claude/skills/branching-story-prose-attach/SKILL.md` (Phase 2 verification recipe).
**Deps**: None.

## Problem

`branching-story-prose-attach` Phase 2 (hash integrity check) requires recomputing a committed PG record's `state_hash` to detect tamper, but the skill explicitly forbids the `compute-pg-hashes` CLI for this purpose: the CLI re-stamps `plan_hash` via `applyComputedPlanHash` (`tools/world-mcp/src/cli/compute-pg-hashes.ts:211`) before computing `state_hash`, which re-introduces the plan-file-to-state-hash coupling SPEC-72 §2.2 removes. The skill prescribes "recompute via `computePgStateHash` from `@worldloom/world-index/hash/content` directly on the parsed PG record" but exposes no MCP tool that does this — operators must `cd tools/world-mcp` (or `tools/world-index`), `node -e "require('./dist/src/package-interop.js').computePgStateHash(yaml.parse(fs.readFileSync(...)))"`, and know to switch to a package directory whose `node_modules/yaml` is reachable.

This session-evidence pattern surfaced during the `/branching-story-prose-attach --page_id PG-3` run on `red-bunny`: the operator's first `node -e` invocation from the repo root failed with `Cannot find module 'yaml'`, requiring a `cd tools/world-index` retry. The friction repeats on every prose-attach invocation; every operator must know (a) the internal helper exists, (b) which package re-exports it, (c) which working directory makes the YAML parser importable. A typed MCP tool encapsulates all three.

## Assumption Reassessment (2026-05-23)

1. **Codebase**: `tools/world-mcp/src/tools/` enumerates 23 tools at HEAD; none performs verify-only PG hash recomputation. `tools/world-mcp/src/package-interop.ts:38` re-exports `computePgStateHash` from `@worldloom/world-index/hash/content`, ready to be consumed by a new tool. `tools/world-mcp/src/cli/compute-pg-hashes.ts:211`'s `applyComputedPlanHash` confirms the CLI's plan-hash-restamp behavior that prose-attach forbids. The retrieval surface for PG records exists (`get_record` supports `PG-<integer>` per `get-record.ts:187`); the new tool can fetch the parsed PG via the existing retrieval path, compute the hash via the existing helper, and return the comparison without re-stamping.
2. **Doc**: `.claude/skills/branching-story-prose-attach/SKILL.md` Phase 2 currently describes the direct Node import as the prescribed verification path. After this ticket lands, that prose updates to call the new MCP tool; the CLI remains unchanged for the authoring-time use case in `branching-story-bootstrap` Phase 7 and `branching-story-turn-cycle` Phase 9. `.claude/skills/_shared-templates/story-state-contract.md` §4.2a's Tooling carve-out (the verifier-vs-authoring split) is preserved: the new tool serves the verifier path explicitly.
3. **Shared boundary under audit**: the MCP tool surface for hash verification, consumed by `branching-story-prose-attach` Phase 2 (the only current verifier-time recompute consumer). The authoring-time path through `compute-pg-hashes.ts` is unaffected. The new tool's output schema is bounded — a small JSON object — and does not extend any existing record schema.
4. **FOUNDATIONS principle / Tooling Recommendation restatement**: FOUNDATIONS §Tooling Recommendation directs operators to typed retrieval and engine-routed operations rather than direct filesystem access for canon-adjacent surfaces. Verifier-time PG hash recomputation is canon-adjacent (the PG record is `_source/`-housed and the receipt verdict is authoritative for prose publication). Exposing the verification through an MCP tool aligns with the Tooling Recommendation by removing the working-directory/working-knowledge dependency of the current `node -e` recipe.

## Architecture Check

1. The new tool is a thin wrapper: parse PG → call `computePgStateHash` → return `{recorded_state_hash, computed_state_hash, match: boolean, recorded_plan_hash, computed_plan_hash}` shape. The implementation reuses the existing `package-interop.ts:38` re-export and the existing PG retrieval path (`findRecordRow` from `get-record.ts`), keeping the new code surface minimal. No alternative encoding scheme, no separate helper, no separate hashing regime.
2. No backwards-compatibility shims: `compute-pg-hashes` CLI behavior is preserved for the authoring-time use case (`branching-story-bootstrap` Phase 7, `branching-story-turn-cycle` Phase 9); the new tool serves the verifier-time use case explicitly. There is no aliasing between the two surfaces.

## Verification Layers

1. Tool present in capability surface → `node tools/world-mcp/dist/src/cli/describe-capabilities.js | grep verify_pg_state_hash` returns the tool entry.
2. Tool returns correct match-shape for an unaltered PG → test invocation against `worlds/erotica-world/stories/red-bunny/_source/pages/PG-3.yaml` yields `{recorded_state_hash, computed_state_hash, match: true, ...}`.
3. Tool returns `match: false` for a tampered PG → fixture mutation test (modify `turn_index` or `branch_id` in a test PG, expect `match: false`).
4. Tool does NOT re-stamp `plan.plan_hash` before computing `state_hash` → grep proof that the implementation imports `computePgStateHash` only and does not import or call `applyComputedPlanHash`.

## What to Change

### 1. New MCP tool `verify_pg_state_hash`

Create `tools/world-mcp/src/tools/verify-pg-state-hash.ts` exporting `async function verifyPgStateHash(args: { world_slug: string; story_slug: string; page_id: string })`. Implementation:
- Reuse `findRecordRow(world_slug, page_id, story_slug)` from `get-record.ts` to locate the PG row by id.
- Parse the row's `body` as YAML to obtain the PG payload.
- Read the recorded `state_hash` and `plan.plan_hash` directly from the parsed PG (no normalization, no re-stamping).
- Import `computePgStateHash` from `../package-interop.js` and invoke on the parsed PG (the helper excludes `state_hash` from its payload per `tools/world-index/src/hash/content.ts:56`).
- For the plan hash advisory check, additionally read the plan file at `worlds/<world_slug>/stories/<story_slug>/pages-prose-plans/<page_id>.md` and sha256 the bytes via `computePlanHash` from `package-interop.ts`.
- Return `{world_slug, story_slug, page_id, recorded_state_hash, computed_state_hash, state_hash_match: boolean, recorded_plan_hash, computed_plan_hash, plan_hash_match: boolean}`. Plan-file-absent is a non-fatal soft state: return `computed_plan_hash: null, plan_hash_match: null` so the prose-attach verifier can render the SPEC-72 advisory WARN path.
- Errors: page-not-found → `invalid_input`; YAML parse failure → `invalid_input` with the parser error; story_slug mismatch → `invalid_input` (consistent with existing get_record story-bundle id discipline).

### 2. Server registration

Add a `verify_pg_state_hash` tool registration in `tools/world-mcp/src/server.ts` (alphabetically positioned near `get_record_schema`). Description text MUST name (a) the prose-attach Phase 2 use case, (b) the explicit non-stamp guarantee (does not modify `plan.plan_hash` before computing `state_hash`), (c) the SPEC-72 advisory split (state_hash match drives verdict; plan_hash match is advisory).

### 3. Capability declaration

Append `verify_pg_state_hash` to the capability list returned by `describe-capabilities` (`tools/world-mcp/src/tools/describe-capabilities.ts`). Group under the existing retrieval-tool cluster.

### 4. Prose-attach skill update

`.claude/skills/branching-story-prose-attach/SKILL.md` Phase 2 currently says "recompute by calling `computePgStateHash` from `@worldloom/world-index/hash/content` directly on the parsed PG record". Replace with: "verify via `mcp__worldloom__verify_pg_state_hash(world_slug, story_slug, page_id)`; the tool returns `{recorded_state_hash, computed_state_hash, state_hash_match, recorded_plan_hash, computed_plan_hash, plan_hash_match}`. Do NOT use the `compute-pg-hashes` CLI here per the existing carve-out — the CLI re-stamps `plan_hash` before computing `state_hash`." The carve-out paragraph naming `branching-story-bootstrap` Phase 7 / `branching-story-turn-cycle` Phase 9 as legitimate CLI consumers stays unchanged.

## Files to Touch

- `tools/world-mcp/src/tools/verify-pg-state-hash.ts` (new)
- `tools/world-mcp/src/server.ts` (modify)
- `tools/world-mcp/src/tools/describe-capabilities.ts` (modify)
- `tools/world-mcp/tests/tools/verify-pg-state-hash.test.ts` (new)
- `.claude/skills/branching-story-prose-attach/SKILL.md` (modify)

## Out of Scope

- Authoring-time hash stamping. `compute-pg-hashes` CLI and its consumers (`branching-story-bootstrap` Phase 7, `branching-story-turn-cycle` Phase 9) are unchanged.
- STCHAR hash verification (covered separately by VALENH-029 / MCPENH-062 surfaces).
- New patch-engine ops. This tool is read-only and emits no record mutations.
- Bulk verification across all PGs in a bundle. Out of scope for this ticket — file a follow-up MCPENH ticket if a health-audit consumer needs that.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/world-mcp && npm test` — passes including new test file `tests/tools/verify-pg-state-hash.test.ts`.
2. Test case: invoke on `red-bunny` PG-3 → `state_hash_match: true`, `plan_hash_match: true`.
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
2. No modifications to existing tests required; the new tool is purely additive.

### Commands

1. `cd tools/world-mcp && npm run build`
2. `cd tools/world-mcp && npm test`
3. `node tools/world-mcp/dist/src/cli/describe-capabilities.js | grep verify_pg_state_hash` — capability discoverable.
