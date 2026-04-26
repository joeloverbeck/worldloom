# SPEC16MCPRETSUR-003: Per-task-type packet defaults + `retry_with` error surface

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — modifies `get_context_packet` default behavior and `packet_incomplete_required_classes` error payload in `@worldloom/world-mcp`. No public-API tool addition; existing signatures preserved.
**Deps**: None

## Problem

`get_context_packet(..., token_budget=10000)` failed with `packet_incomplete_required_classes` and reported `minimum_required_budget: 12485` during the 2026-04-26 PR-0015 pilot. Bumped to 14000 — failed again, reported `minimum_required_budget: 14322`. Bumped to 16000 — succeeded. Three round-trips for a result the tool already knew on the first call. The current default `token_budget` (8000 in `tools/world-mcp/src/tools/get-context-packet.ts:39`) is well below the empirical minimum for `task_type='canon_addition'` against animalia at current state. Two coordinated changes — per-task-type defaults plus a structured `retry_with` field — collapse the guess-and-check loop to at most one retry.

## Assumption Reassessment (2026-04-26)

1. The hardcoded `token_budget ?? 8000` fallback is at `tools/world-mcp/src/tools/get-context-packet.ts:39`. Confirmed — the file is short (42 lines); the fallback is the only one. The `TaskType` import is already in scope at line 3 (`import { TASK_TYPES, type TaskType } from "../ranking/profiles"`).
2. The `packet_incomplete_required_classes` error is emitted at `tools/world-mcp/src/context-packet/assemble.ts:286-302`. Confirmed — `insufficiency.minimumRequiredBudget` is already computed and surfaced in the error's `data` payload (line 299); adding `retry_with` is purely a payload extension.
3. Cross-skill boundary: this ticket modifies the `get_context_packet` tool's default-budget behavior and the `assemble.ts` error payload. Consumers of `get_context_packet` are skills that call it as a context-loading step (`canon-addition`, `character-generation`, `diegetic-artifact-generation`, `continuity-audit`, future skills). The change is backwards-compatible: omitting `token_budget` continues to work; existing `minimum_required_budget` field stays in the error payload; `retry_with` is additive. Same-package contract tests under `tools/world-mcp/tests/context-packet/` and `tools/world-mcp/tests/errors.test.ts` may already assert on the `packet_incomplete_required_classes` error payload shape — extend (do not replace) any such assertion to cover the new `retry_with` field; existing assertions on `minimum_required_budget` must continue to pass.
4. Schema extension: extends the `packet_incomplete_required_classes` McpError `data` shape (additive only — new optional field `retry_with: { token_budget: number }`). Existing consumers parsing `minimum_required_budget` continue to work; consumers that learn `retry_with` get single-round-trip retry. Additive-only.

## Architecture Check

1. Per-task-type defaults are pilot-grounded for `canon_addition` (16000) and conservative for the rest (8000 retained); the `retry_with` error surface auto-corrects upward when actual minimums exceed the default. Defaults are a first-call optimization, not a contract — the spec's §Risks section is explicit about this.
2. Preserving the existing `minimum_required_budget` field while adding `retry_with` keeps backward compatibility for any consumer that parses the error message without re-tooling.
3. The `retry_with` field is a structured retry-hint, not a transparent retry — preserves explicit-retry semantics (no implicit override of the requested budget cap). A consumer must opt into using `retry_with.token_budget` for its next call.
4. No backwards-compatibility shims. No tool surface added; existing surface gains a richer error payload and smarter default.

## Verification Layers

1. Per-task-type default lookup → unit test: `task_type='canon_addition'` with `token_budget` omitted exercises the 16000 default; `task_type='character_generation'` with `token_budget` omitted exercises the 8000 default.
2. Structured retry-hint surface → unit test: an insufficient explicit budget produces an error whose `retry_with.token_budget` matches `minimum_required_budget`.
3. Single round-trip retry semantics → unit test: a successful retry using `retry_with.token_budget` returns a complete packet.
4. Backwards compatibility → grep-proof: `grep -n "minimum_required_budget" tools/world-mcp/src/context-packet/assemble.ts` confirms the existing field is still emitted; no consumer-side breaking change.

## What to Change

### 1. Per-task-type default lookup table

`tools/world-mcp/src/tools/get-context-packet.ts` — add a const `DEFAULT_TOKEN_BUDGET_BY_TASK_TYPE: Record<TaskType, number>` near the top of the file:

```ts
const DEFAULT_TOKEN_BUDGET_BY_TASK_TYPE: Record<TaskType, number> = {
  canon_addition: 16000,
  character_generation: 8000,
  diegetic_artifact_generation: 8000,
  continuity_audit: 8000,
  other: 8000
};
```

Replace the `args.token_budget ?? 8000` fallback at line 39 with `args.token_budget ?? DEFAULT_TOKEN_BUDGET_BY_TASK_TYPE[args.task_type]`.

### 2. `retry_with` field in error payload

`tools/world-mcp/src/context-packet/assemble.ts` — augment the `createMcpError(...)` call at lines 293-302 to include `retry_with: { token_budget: insufficiency.minimumRequiredBudget }` in the `data` payload. The existing `minimum_required_budget` field stays as-is for backward compatibility.

### 3. Tests

`tools/world-mcp/tests/tools/get-context-packet.test.ts` (or wherever the tool's tests live) — add cases:
- `task_type='canon_addition'` with `token_budget` omitted → uses 16000 default (verify by inspecting the assembled packet's `task_header.token_budget.allocated` upper bound or by stubbing `assembleContextPacket` and asserting the forwarded `token_budget`).
- `task_type='character_generation'` with `token_budget` omitted → uses 8000 default.
- Insufficient explicit budget → error includes `retry_with.token_budget` matching `minimum_required_budget`.
- Successful retry using `retry_with.token_budget` → returns a complete packet.

## Files to Touch

- `tools/world-mcp/src/tools/get-context-packet.ts` (modify)
- `tools/world-mcp/src/context-packet/assemble.ts` (modify)
- `tools/world-mcp/tests/tools/get-context-packet.test.ts` (modify or create — implementer verifies whether tests for this tool already live elsewhere)

## Out of Scope

- Streaming context-packet responses for >50KB packets. Out of scope; the per-task-type defaults plus `retry_with` retry hint cover the observed pilot pain.
- Re-tuning defaults per-world. The 16000 default is grounded in 2026-04-26 animalia data; if pilot evidence on a second world (or post-SPEC-09 animalia) shows systematic mismatch, a follow-up ticket can re-tune. Not a release blocker.
- Implicit transparent retry (auto-bumping budget without consumer opt-in). The spec preserves explicit-retry semantics deliberately.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/world-mcp && npm test` passes after the new test cases land.
2. Manual smoke: invoke `mcp__worldloom__get_context_packet(task_type='canon_addition', world_slug='animalia', seed_nodes=[<known-good-seed>])` with no `token_budget`; response succeeds first call.
3. Insufficient-budget retry path: invoke with `token_budget=10000`; error includes `retry_with.token_budget` field; second invocation using that value succeeds.

### Invariants

1. Existing consumers parsing `data.minimum_required_budget` continue to work; the field is preserved.
2. The `DEFAULT_TOKEN_BUDGET_BY_TASK_TYPE` table covers all `TaskType` enum members exhaustively (TypeScript's `Record<TaskType, number>` enforces this at compile time).
3. The `retry_with.token_budget` value equals `insufficiency.minimumRequiredBudget` exactly — no rounding, no buffering.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/tools/get-context-packet.test.ts` — covers all four test cases above (location TBD by implementer; existing tests for this tool may already live in `tests/context-packet/` — implementer follows the existing pattern).

### Commands

1. `cd tools/world-mcp && npm test` — full package test suite.
2. Smoke invocation through MCP after `cd tools/world-mcp && npm run build`.
