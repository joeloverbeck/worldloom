# MCPENH-054: Make `packet_incomplete_required_classes` error advice honest when harness ceiling is the binding constraint

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `tools/world-mcp/src/context-packet/assemble.ts` (the four error-response builders that return `packet_incomplete_required_classes`), package-local context-packet tests, and same-seam docs that enumerate `get_context_packet` retry/error semantics.
**Deps**: `archive/tickets/MCPENH-020-document-persisted-with-summary-fallback-and-batch-retrieval.md` (documented the persisted_with_summary recovery path; this ticket addresses the parallel `packet_incomplete_required_classes` hard-error case the same skill family hits when the binding constraint is the harness ceiling rather than the token budget).

## Problem

Before this ticket, `mcp__worldloom__get_context_packet` returned `packet_incomplete_required_classes` with a `retry_with: { token_budget: <minimum_required_budget> }` field in four code paths inside `tools/world-mcp/src/context-packet/assemble.ts`. The `retry_with` field implied the operator could retry the call with the suggested budget and succeed. But when `minimum_required_harness_ceiling_chars > effective_harness_ceiling_chars` (the harness's character ceiling, separately reported in the same error body), no `token_budget` retry could succeed — the harness ceiling was the binding constraint, not the budget, and the harness ceiling is fixed by the operator's environment, not by the caller's argument.

Historical session evidence (`branching-story-turn-cycle` on `red-bunny` PG-1 → PG-2): `mcp__worldloom__get_context_packet(task_type='story_turn_cycle', world_slug='erotica-world', story_slug='red-bunny', seed_nodes=['M-3', 'M-5', 'M-6', 'M-7'], token_budget=18000)` returned:

```json
{
  "code": "packet_incomplete_required_classes",
  "message": "The requested budget cannot fit required governing-context full bodies under the configured context-packet ceilings.",
  "details": {
    "missing_classes": ["governing_world_context.full_body"],
    "requested_budget": 18000,
    "minimum_required_budget": 20343,
    "retry_with": { "token_budget": 20343 },
    "harness_ceiling_chars": 60000,
    "envelope_overhead_reserve_chars": 4000,
    "effective_harness_ceiling_chars": 56000,
    "minimum_required_harness_ceiling_chars": 87610,
    ...
  }
}
```

Following the old `retry_with` advice, I called `mcp__worldloom__get_context_packet(..., token_budget=22000)` (more than the suggested 20343) and received the same error with the same `retry_with: { token_budget: 20343 }`. The actual binding constraint was `minimum_required_harness_ceiling_chars: 87610 > effective_harness_ceiling_chars: 56000` — the packet could not be delivered under the harness's character ceiling regardless of token budget. The `retry_with` advice was misleading.

I fell back to direct `mcp__worldloom__get_records(record_ids=['M-3', 'M-5', 'M-6', 'M-7'], world_slug='erotica-world')` — which succeeded and is the correct operator-recovery path per the response's `fallback_advice` field. The pipeline-design intent for the story_turn_cycle packet profile is that invariants and mystery_reserve are `reserve`-priority and may need separate `list_records` / `get_records` calls; that intent is legitimate, but the error-advice quality was independently broken: `retry_with` must not point to a value that cannot succeed.

## Assumption Reassessment (2026-05-17)

1. **Codebase state at intake**. Verified at HEAD via grep against `tools/world-mcp/src/context-packet/`:
   - `tools/world-mcp/src/context-packet/assemble.ts:443-540` contains four `createMcpError("packet_incomplete_required_classes", …)` call sites (lines 447, 472, 502, 524). All four pass a `retry_with: { token_budget: <minimum_required_budget> }` field unconditionally — they do not check whether `minimum_required_harness_ceiling_chars > effective_harness_ceiling_chars` before setting `retry_with`.
   - `tools/world-mcp/src/context-packet/full-body-delivery.ts:218-219` defines `minimum_required_budget: number; minimum_required_harness_ceiling_chars: number;` as the two independent constraint axes returned by `applyTaskTypeFullBodyDelivery`. The two axes can diverge (budget can be satisfiable while harness ceiling is not, and vice versa).
   - `tools/world-mcp/src/context-packet/shared.ts:172` sets `harness_ceiling_chars: number` as fixed by the operator's environment (passed into `assembleContextPacket` via `args.harnessCeilingChars`); the caller cannot influence this value through `token_budget`.
   - Tests: `tools/world-mcp/tests/tools/get-context-packet.test.ts` and `tools/world-mcp/tests/tools/get-context-packet.story-pipeline.test.ts` exist at HEAD; neither covers the case where `minimum_required_harness_ceiling_chars > effective_harness_ceiling_chars` AND the response asserts that `retry_with` is omitted or that the response surface reports the harness-ceiling-binding case differently (grep for `harness_ceiling` in either test file returns zero matches).
2. **Docs / spec state at intake**. `docs/CONTEXT-PACKET-CONTRACT.md` documents the packet's delivery modes and the `persisted_with_summary` graceful-degradation path; it is silent on the `packet_incomplete_required_classes` error mode and the `retry_with` advice semantics. `tools/world-mcp/README.md`'s `get_context_packet` row documents the tool surface; it does not enumerate the error-body fields. The `branching-story-turn-cycle` SKILL.md §World-State Prerequisites references the persisted-summary recovery for `delivery_status: persisted_with_summary` (via `.claude/skills/_shared-templates/persisted-packet-recovery.md`) but does not address the `packet_incomplete_required_classes` hard-error path. The `fallback_advice` field IS present in the error body and names the correct operator-recovery (`get_record` / `get_records` / `get_record_field`), but it sits under `truncation_summary.fallback_advice` (one site) — not in the top-level error details — and is not present at all in three of the four error-response builders.
3. **Shared boundary under audit**. The contract between context-packet error responses and operator (or skill-internal) retry logic. The error body's `retry_with` field is a structured promise: it says "retry with these arguments and the call will succeed". When the harness ceiling is the binding constraint, that promise is false. The shared boundary is the integrity of MCP error responses' `retry_with` field semantics — every other MCP tool that returns `retry_with` (none in the current codebase per `grep -rn 'retry_with' tools/world-mcp/src/` outside this file) implicitly establishes the convention that `retry_with` is actionable. This ticket preserves that convention by omitting `retry_with` when no retry can succeed and exposing top-level `fallback_advice` as the operator-recovery path.
4. **Mismatch + correction**. At intake, the assumption embedded in the four `packet_incomplete_required_classes` error builders was that `minimum_required_budget` is always the binding constraint when the packet cannot fit — and therefore `retry_with: { token_budget: minimum_required_budget }` is always actionable. The actual codebase state was that `minimum_required_harness_ceiling_chars` is a separately reported axis that can be the binding constraint independently of the budget, and when it exceeds `effective_harness_ceiling_chars`, no budget retry can succeed. The landed correction conditions the `retry_with` field on whether the budget axis is actually retryable, omits `retry_with` when the harness ceiling is binding, and exposes `fallback_advice` at the top-level details for all four incomplete-packet builders.
5. **Live proof/doc boundary correction (2026-05-17 reassessment)**. The drafted test paths `tools/world-mcp/tests/tools/get-context-packet.test.ts` and `tools/world-mcp/tests/tools/get-context-packet.story-pipeline.test.ts` exercise the MCP wrapper and task-type request shape, but the live retry/error construction seam is covered more directly by package-local context-packet tests under `tools/world-mcp/tests/context-packet/`. The current broad package lane was green at intake: `cd tools/world-mcp && npm test -- --reporter dot` passed with 388 tests before source edits. Same-seam public prose also existed in `tools/world-mcp/README.md` and `docs/MACHINE-FACING-LAYER.md`; both said incomplete-packet errors include `retry_with.token_budget` without the harness-ceiling-binding caveat. This ticket updated those docs alongside `docs/CONTEXT-PACKET-CONTRACT.md`.
6. **Direct MCP proof substitution**. Post-change direct `mcp__worldloom__get_context_packet(...)` smoke would require proving the external MCP server/client session loaded the rebuilt package. That restart boundary is not exposed in this Codex session. The accepted post-change proof is package-local source build plus compiled `dist/tests/context-packet/*.test.js` lanes and the broad `cd tools/world-mcp && npm test -- --reporter dot` suite, which exercise the same assembler and wrapper code after rebuild. Direct MCP smoke remains an operational post-restart check, not a local acceptance gate for this run.

## Architecture Check

1. **Honest error advice is cleaner than always-emitted `retry_with`.** Alternative considered: leave the response shape unchanged and only document the harness-ceiling-binding caveat in `docs/CONTEXT-PACKET-CONTRACT.md` plus skill prose. Rejected — that converts a structured-error-response semantics bug into a documentation burden every skill consumer must internalize; the skill prose would have to say "if `retry_with` is present, you might also need to check whether `minimum_required_harness_ceiling_chars > effective_harness_ceiling_chars`, in which case ignore `retry_with`". The structured response should be self-consistent: `retry_with` present iff retry can succeed. Doc-only fixes for structured-API semantics bugs are a known anti-pattern.
2. **No backwards-compatibility shims introduced.** The change is structural: `retry_with` becomes conditional, and `fallback_advice` becomes uniformly present at the top-level error details. No callers depend on the always-present-and-actionable assumption being preserved (the session evidence above shows the assumption is already broken; no code can correctly depend on it). Skills currently coding to the buggy assumption (e.g., a hypothetical retry loop that consumes `retry_with` without checking the harness ceiling) would silently loop today; the fix surfaces the harness-ceiling case as an explicit fallback signal those skills can route on.

## Verification Layers

1. **`retry_with` omitted when harness ceiling is binding** → targeted package test: `tools/world-mcp/tests/context-packet/full-body-delivery.test.ts` covers a fixture that produces `minimum_required_harness_ceiling_chars > effective_harness_ceiling_chars` and asserts the response body does not contain `retry_with`.
2. **`fallback_advice` uniformly present** → targeted package tests assert top-level error details include `fallback_advice` naming the `get_record` / `get_records` recovery path for incomplete-packet errors.
3. **Existing `retry_with`-when-budget-is-binding behavior preserved** → targeted regression test: existing context-packet test cases that hit the `packet_incomplete_required_classes` error path under budget-binding conditions still assert `retry_with` is present and points to a budget that succeeds on retry.
4. **Same-seam docs align with the response shape** → manual review / grep-proof: `docs/CONTEXT-PACKET-CONTRACT.md`, `tools/world-mcp/README.md`, and `docs/MACHINE-FACING-LAYER.md` no longer state that `retry_with` is unconditional.

## Landed Changes

### 1. Conditioned `retry_with` on budget being the binding constraint

`tools/world-mcp/src/context-packet/assemble.ts` now routes all four `packet_incomplete_required_classes` builders through a shared `incompletePacketDetails(...)` helper. The helper compares `minimumRequiredHarnessCeilingChars` with `effectiveHarnessCeilingChars` and includes `retry_with: { token_budget: minimumRequiredBudget }` only when the harness ceiling is not the binding constraint. When the harness ceiling is binding, `retry_with` is omitted.

### 2. Uniformly included `fallback_advice` at top-level error details

All four incomplete-packet responses now include top-level `fallback_advice` using the same targeted-retrieval guidance as `truncation_summary.fallback_advice`, so callers do not need to inspect the nested truncation summary to find the recovery path.

### 3. Documented the conditional error-response shape

`docs/CONTEXT-PACKET-CONTRACT.md`, `tools/world-mcp/README.md`, and `docs/MACHINE-FACING-LAYER.md` now state that `retry_with.token_budget` appears only when the token budget is the binding constraint and that harness-ceiling-binding cases omit `retry_with` and point callers to `fallback_advice`.

### 4. Added test coverage

`tools/world-mcp/tests/context-packet/full-body-delivery.test.ts` now covers the harness-ceiling-binding case and asserts `retry_with` is omitted while top-level `fallback_advice` is present. `packet-budget.test.ts` preserves the actionable retry round trip for budget-binding cases. `budget-handling.test.ts` asserts top-level `fallback_advice` on the local-authority incomplete-packet path.

## Files to Touch

- `tools/world-mcp/src/context-packet/assemble.ts` (modify — four error-response builders)
- `tools/world-mcp/tests/context-packet/full-body-delivery.test.ts` (modify — add harness-ceiling-binding coverage)
- `tools/world-mcp/tests/context-packet/packet-budget.test.ts` (modify — preserve / clarify budget-binding retry coverage)
- `tools/world-mcp/tests/context-packet/budget-handling.test.ts` (modify — fallback-advice coverage on local-authority insufficiency)
- `docs/CONTEXT-PACKET-CONTRACT.md` (modify — document the conditional `retry_with` semantics and uniform `fallback_advice`)
- `tools/world-mcp/README.md` (modify — public package surface wording for conditional `retry_with`)
- `docs/MACHINE-FACING-LAYER.md` (modify — repo-level machine-facing surface wording for conditional `retry_with`)
- `tools/world-mcp/dist/` (rebuilt — `cd tools/world-mcp && npm run build`)

## Out of Scope

- Changing the packet's `reserve`-priority semantics for invariants and mystery_reserve (those are pipeline-design-intent per the `story_turn_cycle` / `story_bootstrap` profile registrations; the operator-recovery via per-class `list_records` / `get_records` is the correct documented escape path).
- Auto-degrading `packet_incomplete_required_classes` to `persisted_with_summary` when the harness ceiling is binding (could be a future enhancement; this ticket strictly fixes the error-advice quality and leaves the soft-degradation track to a separate proposal).
- Updating `branching-story-turn-cycle/SKILL.md` (or other story-pipeline skills') §World-State Prerequisites to name the `packet_incomplete_required_classes` fallback alongside the existing `persisted_with_summary` documentation — that prose update is downstream of this ticket's response shape stabilization and belongs in a `/skill-audit` follow-up.
- Adding a `delivery_mode: 'summary_only'` automatic-fallback path on this error (the existing `delivery_mode` parameter is for caller-requested summary mode, not pipeline auto-degradation).

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/world-mcp && npm test -- --reporter dot` passes with all extended tests in §4 above.
2. `cd tools/world-mcp && npm run build` succeeds with no TypeScript errors.
3. Focused compiled context-packet tests prove the harness-ceiling-binding and budget-binding cases after rebuild.
4. `cd tools/validators && npm test -- --reporter dot` continues passing.

Direct MCP smoke against a freshly rebuilt and restarted server remains a useful operational check, but it is not an active local acceptance gate for this run because the external MCP restart/load boundary is not exposed in-session.

### Invariants

1. The `retry_with` field of any MCP error response is actionable: if present, retrying the call with the suggested arguments under the operator's current environment will succeed (or fail for a different, signaled reason). Misleading `retry_with` advice is a structured-API bug.
2. Every `packet_incomplete_required_classes` error response signals the operator-recovery path explicitly via `fallback_advice` at the top-level details — not nested under `truncation_summary` (which a caller might not parse), and not implied by skill prose (which not every consumer reads).

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/context-packet/full-body-delivery.test.ts` (modify) — add harness-ceiling-binding fixture and assertions on `retry_with` omission + `fallback_advice` presence.
2. `tools/world-mcp/tests/context-packet/packet-budget.test.ts` (modify) — preserve / clarify existing `retry_with`-when-budget-is-binding regression coverage.
3. `tools/world-mcp/tests/context-packet/budget-handling.test.ts` (modify) — assert top-level `fallback_advice` on another incomplete-packet builder.

### Commands

1. `cd tools/world-mcp && npm test -- --reporter dot` — full world-mcp package test lane.
2. `cd tools/world-mcp && npm run build` — TypeScript compile must succeed.
3. `cd tools/world-mcp && node --test dist/tests/context-packet/full-body-delivery.test.js dist/tests/context-packet/packet-budget.test.js dist/tests/context-packet/budget-handling.test.js` — focused compiled proof for the changed error-shape cases.
4. `cd tools/validators && npm test -- --reporter dot` — confirm no downstream regression.

## Outcome

Completed: 2026-05-17.

The `packet_incomplete_required_classes` details contract is now honest across all four assembler error builders: `retry_with` is emitted only when the current harness ceiling can fit the computed minimum packet, and harness-ceiling-binding responses omit `retry_with` while carrying top-level `fallback_advice`. The package, machine-facing, and context-packet docs now describe the conditional retry semantics.

## Verification Result

1. `cd tools/world-mcp && npm test -- --reporter dot` — passed before source edits with 388 tests, establishing a green baseline.
2. `cd tools/world-mcp && npm run build` — passed after source/doc/test edits.
3. `cd tools/world-mcp && node --test --reporter dot dist/tests/context-packet/full-body-delivery.test.js dist/tests/context-packet/packet-budget.test.js dist/tests/context-packet/budget-handling.test.js` — failed before running tests because this Node version does not accept `--reporter`; command shape corrected.
4. `cd tools/world-mcp && node --test dist/tests/context-packet/full-body-delivery.test.js dist/tests/context-packet/packet-budget.test.js dist/tests/context-packet/budget-handling.test.js` — passed after rebuild; 17 tests passed.
5. `cd tools/world-mcp && npm test -- --reporter dot` — passed after implementation; 389 tests passed.
6. `cd tools/validators && npm test -- --reporter dot` — passed; 342 tests passed. Output included the standard temporary-git default-branch hint from the test harness.

## Deviations

- The drafted direct MCP smoke checks were not run. Post-change direct `mcp__worldloom__get_context_packet(...)` proof would require rebuilding and proving an external MCP server/client session restart, which is not exposed in this Codex session. Package-local rebuilt assembler and wrapper tests were used as the truthful proof boundary.
- The drafted focused compiled command used `node --test --reporter dot ...`, but this Node version rejects `--reporter`. The corrected accepted focused command is `node --test dist/tests/context-packet/full-body-delivery.test.js dist/tests/context-packet/packet-budget.test.js dist/tests/context-packet/budget-handling.test.js`.
