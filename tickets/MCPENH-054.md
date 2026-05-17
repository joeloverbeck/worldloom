# MCPENH-054: Make `packet_incomplete_required_classes` error advice honest when harness ceiling is the binding constraint

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `tools/world-mcp/src/context-packet/assemble.ts` (the four error-response builders that return `packet_incomplete_required_classes`), plus matching `tools/world-mcp/tests/tools/get-context-packet.test.ts` and `tools/world-mcp/tests/tools/get-context-packet.story-pipeline.test.ts` coverage, plus a doc update in `docs/CONTEXT-PACKET-CONTRACT.md` if that file enumerates the error response shape.
**Deps**: `archive/tickets/MCPENH-020-document-persisted-with-summary-fallback-and-batch-retrieval.md` (documented the persisted_with_summary recovery path; this ticket addresses the parallel `packet_incomplete_required_classes` hard-error case the same skill family hits when the binding constraint is the harness ceiling rather than the token budget).

## Problem

`mcp__worldloom__get_context_packet` returns `packet_incomplete_required_classes` with a `retry_with: { token_budget: <minimum_required_budget> }` field in four code paths inside `tools/world-mcp/src/context-packet/assemble.ts`. The `retry_with` field implies the operator can retry the call with the suggested budget and succeed. But when `minimum_required_harness_ceiling_chars > effective_harness_ceiling_chars` (the harness's character ceiling, separately reported in the same error body), no `token_budget` retry can succeed — the harness ceiling is the binding constraint, not the budget, and the harness ceiling is fixed by the operator's environment, not by the caller's argument.

Session evidence (this session, `branching-story-turn-cycle` on `red-bunny` PG-1 → PG-2): `mcp__worldloom__get_context_packet(task_type='story_turn_cycle', world_slug='erotica-world', story_slug='red-bunny', seed_nodes=['M-3', 'M-5', 'M-6', 'M-7'], token_budget=18000)` returned:

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

Following the `retry_with` advice, I called `mcp__worldloom__get_context_packet(..., token_budget=22000)` (more than the suggested 20343) and received the same error with the same `retry_with: { token_budget: 20343 }`. The actual binding constraint is `minimum_required_harness_ceiling_chars: 87610 > effective_harness_ceiling_chars: 56000` — the packet cannot be delivered under the harness's character ceiling regardless of token budget. The `retry_with` advice was misleading.

I fell back to direct `mcp__worldloom__get_records(record_ids=['M-3', 'M-5', 'M-6', 'M-7'], world_slug='erotica-world')` — which succeeded and is the correct operator-recovery path per the response's `fallback_advice` field. The skill prose at `.claude/skills/branching-story-turn-cycle/SKILL.md` §World-State Prerequisites documents the `persisted_with_summary` fallback (via `mcp__worldloom__get_persisted_packet_slice`) but is silent on the `packet_incomplete_required_classes` hard-error mode — a related-but-distinct failure surface. The pipeline-design-intent for the story_turn_cycle packet profile (per `tools/world-mcp/src/context-packet/shared.ts:172` and the worked precedent in `.claude/skills/mcp-integration-audit/SKILL.md` Phase 4 category 5 cited from a prior bootstrap audit) is that invariants and mystery_reserve are `reserve`-priority and should be loaded as separate `list_records` / `get_records` calls; that intent is legitimate, but the error-advice quality is independently broken: `retry_with` should not point to a value that cannot succeed.

## Assumption Reassessment (2026-05-17)

1. **Codebase state at intake**. Verified at HEAD via grep against `tools/world-mcp/src/context-packet/`:
   - `tools/world-mcp/src/context-packet/assemble.ts:443-540` contains four `createMcpError("packet_incomplete_required_classes", …)` call sites (lines 447, 472, 502, 524). All four pass a `retry_with: { token_budget: <minimum_required_budget> }` field unconditionally — they do not check whether `minimum_required_harness_ceiling_chars > effective_harness_ceiling_chars` before setting `retry_with`.
   - `tools/world-mcp/src/context-packet/full-body-delivery.ts:218-219` defines `minimum_required_budget: number; minimum_required_harness_ceiling_chars: number;` as the two independent constraint axes returned by `applyTaskTypeFullBodyDelivery`. The two axes can diverge (budget can be satisfiable while harness ceiling is not, and vice versa).
   - `tools/world-mcp/src/context-packet/shared.ts:172` sets `harness_ceiling_chars: number` as fixed by the operator's environment (passed into `assembleContextPacket` via `args.harnessCeilingChars`); the caller cannot influence this value through `token_budget`.
   - Tests: `tools/world-mcp/tests/tools/get-context-packet.test.ts` and `tools/world-mcp/tests/tools/get-context-packet.story-pipeline.test.ts` exist at HEAD; neither covers the case where `minimum_required_harness_ceiling_chars > effective_harness_ceiling_chars` AND the response asserts that `retry_with` is omitted or that the response surface reports the harness-ceiling-binding case differently (grep for `harness_ceiling` in either test file returns zero matches).
2. **Docs / spec state at intake**. `docs/CONTEXT-PACKET-CONTRACT.md` documents the packet's delivery modes and the `persisted_with_summary` graceful-degradation path; it is silent on the `packet_incomplete_required_classes` error mode and the `retry_with` advice semantics. `tools/world-mcp/README.md`'s `get_context_packet` row documents the tool surface; it does not enumerate the error-body fields. The `branching-story-turn-cycle` SKILL.md §World-State Prerequisites references the persisted-summary recovery for `delivery_status: persisted_with_summary` (via `.claude/skills/_shared-templates/persisted-packet-recovery.md`) but does not address the `packet_incomplete_required_classes` hard-error path. The `fallback_advice` field IS present in the error body and names the correct operator-recovery (`get_record` / `get_records` / `get_record_field`), but it sits under `truncation_summary.fallback_advice` (one site) — not in the top-level error details — and is not present at all in three of the four error-response builders.
3. **Shared boundary under audit**. The contract between context-packet error responses and operator (or skill-internal) retry logic. The error body's `retry_with` field is a structured promise: it says "retry with these arguments and the call will succeed". When the harness ceiling is the binding constraint, that promise is false. The shared boundary is the integrity of MCP error responses' `retry_with` field semantics — every other MCP tool that returns `retry_with` (none in the current codebase per `grep -rn 'retry_with' tools/world-mcp/src/` outside this file) implicitly establishes the convention that `retry_with` is actionable. This ticket preserves that convention by either omitting `retry_with` when no retry can succeed, or by replacing it with a structured fallback_advice surface that names the actual operator-recovery path.
4. **Mismatch + correction**. At intake, the assumption embedded in the four `packet_incomplete_required_classes` error builders was that `minimum_required_budget` is always the binding constraint when the packet can't fit — and therefore `retry_with: { token_budget: minimum_required_budget }` is always actionable. The actual codebase state is that `minimum_required_harness_ceiling_chars` is a separately-reported axis that can be the binding constraint independently of the budget, and when it exceeds `effective_harness_ceiling_chars`, no budget retry can succeed. The correction is this ticket: condition the `retry_with` field on whether the budget axis is actually the binding constraint, and when the harness ceiling is binding instead, either omit `retry_with` or replace it with a structured `fallback_path` field (e.g., `{ tool: "get_records", note: "retrieve dropped classes individually under the per-call harness ceiling" }`). The four error-response builders also vary in whether they include `fallback_advice` (only line 461 includes it via `truncation_summary.fallback_advice`); the corrected behavior should expose `fallback_advice` at the top-level details for all four sites so the operator-recovery path is uniformly visible.

## Architecture Check

1. **Honest error advice is cleaner than always-emitted `retry_with`.** Alternative considered: leave the response shape unchanged and only document the harness-ceiling-binding caveat in `docs/CONTEXT-PACKET-CONTRACT.md` plus skill prose. Rejected — that converts a structured-error-response semantics bug into a documentation burden every skill consumer must internalize; the skill prose would have to say "if `retry_with` is present, you might also need to check whether `minimum_required_harness_ceiling_chars > effective_harness_ceiling_chars`, in which case ignore `retry_with`". The structured response should be self-consistent: `retry_with` present iff retry can succeed. Doc-only fixes for structured-API semantics bugs are a known anti-pattern.
2. **No backwards-compatibility shims introduced.** The change is structural: `retry_with` becomes conditional, and `fallback_advice` becomes uniformly present at the top-level error details. No callers depend on the always-present-and-actionable assumption being preserved (the session evidence above shows the assumption is already broken; no code can correctly depend on it). Skills currently coding to the buggy assumption (e.g., a hypothetical retry loop that consumes `retry_with` without checking the harness ceiling) would silently loop today; the fix surfaces the harness-ceiling case as an explicit fallback signal those skills can route on.

## Verification Layers

1. **`retry_with` omitted when harness ceiling is binding** → schema validation + targeted test: `tools/world-mcp/tests/tools/get-context-packet.story-pipeline.test.ts` covers a fixture that produces `minimum_required_harness_ceiling_chars > effective_harness_ceiling_chars` and asserts the response body does not contain `retry_with` (or contains it only when the budget axis is the binding constraint).
2. **`fallback_advice` uniformly present** → targeted test: same test file asserts the top-level error details include `fallback_advice` naming the `get_record` / `get_records` recovery path in all four error-response builders.
3. **Existing `retry_with`-when-budget-is-binding behavior preserved** → targeted regression test: existing test cases that hit the `packet_incomplete_required_classes` error path under budget-binding conditions still assert `retry_with` is present and points to a budget that will succeed on retry.
4. **`branching-story-turn-cycle` and `branching-story-bootstrap` skill dry-runs** → skill dry-run on red-bunny / a new world: trigger the harness-ceiling-binding case (e.g., by requesting a packet whose required full bodies exceed the harness) and verify the error response signals the operator-recovery path without misleading `retry_with`.

## What to Change

### 1. Condition `retry_with` on budget being the binding constraint

In `tools/world-mcp/src/context-packet/assemble.ts`, at each of the four `createMcpError("packet_incomplete_required_classes", …)` call sites (lines 447, 472, 502, 524):
- Before constructing the response details, compute `harnessCeilingIsBinding = minimum_required_harness_ceiling_chars > effective_harness_ceiling_chars`.
- Include `retry_with: { token_budget: <minimum_required_budget> }` only when `harnessCeilingIsBinding === false`.
- When `harnessCeilingIsBinding === true`, omit `retry_with` entirely (or include `retry_with: null` if the response schema requires the field).

### 2. Uniformly include `fallback_advice` at the top-level error details

For all four error-response builders, add `fallback_advice` to the top-level `details` object (not nested under `truncation_summary`):

```typescript
fallback_advice: "Retrieve dropped classes individually via mcp__worldloom__get_records / mcp__worldloom__get_record under the per-call harness ceiling. For story-pipeline task types, invariants and mystery_reserve are reserve-priority and should be loaded via mcp__worldloom__list_records(record_type=...) when whole-class enumeration is needed."
```

Keep the existing `truncation_summary.fallback_advice` text aligned with the top-level field so callers parsing either site see the same recovery guidance.

### 3. Document the error-response shape in `docs/CONTEXT-PACKET-CONTRACT.md`

Add a section to `docs/CONTEXT-PACKET-CONTRACT.md` documenting:
- The two independent constraint axes (`minimum_required_budget` vs `minimum_required_harness_ceiling_chars`).
- The conditional `retry_with` semantics: present iff the budget axis is binding.
- The uniform `fallback_advice` signal for the harness-ceiling-binding case.
- The relationship between this hard-error path and the soft-degradation `persisted_with_summary` path (the latter is for partial-content delivery; this is for genuine impossibility).

### 4. Test coverage

In `tools/world-mcp/tests/tools/get-context-packet.story-pipeline.test.ts`:
- Add a fixture that produces `minimum_required_harness_ceiling_chars > effective_harness_ceiling_chars` (e.g., a world with very large invariant / mystery_reserve bodies and a constrained harness ceiling).
- Assert the response body does not include `retry_with` (or sets it to null per schema choice).
- Assert the response body includes `fallback_advice` at the top-level details.

In `tools/world-mcp/tests/tools/get-context-packet.test.ts`:
- Confirm existing `retry_with`-when-budget-is-binding test cases continue to assert `retry_with` is present.

## Files to Touch

- `tools/world-mcp/src/context-packet/assemble.ts` (modify — four error-response builders)
- `tools/world-mcp/tests/tools/get-context-packet.story-pipeline.test.ts` (modify — add harness-ceiling-binding coverage)
- `tools/world-mcp/tests/tools/get-context-packet.test.ts` (modify — regression coverage for budget-binding case)
- `docs/CONTEXT-PACKET-CONTRACT.md` (modify — document the conditional `retry_with` semantics and uniform `fallback_advice`)
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
3. Direct MCP smoke (against a freshly-rebuilt and restarted server): trigger the harness-ceiling-binding case and assert the response omits `retry_with` (or sets it to null), and includes `fallback_advice` at the top-level details.
4. Direct MCP smoke: trigger the budget-binding case and assert `retry_with` is present and actionable (the retry succeeds when the suggested budget is used).
5. `cd tools/validators && npm test -- --reporter dot` continues passing.

### Invariants

1. The `retry_with` field of any MCP error response is actionable: if present, retrying the call with the suggested arguments under the operator's current environment will succeed (or fail for a different, signaled reason). Misleading `retry_with` advice is a structured-API bug.
2. Every `packet_incomplete_required_classes` error response signals the operator-recovery path explicitly via `fallback_advice` at the top-level details — not nested under `truncation_summary` (which a caller might not parse), and not implied by skill prose (which not every consumer reads).

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/tools/get-context-packet.story-pipeline.test.ts` (modify) — add harness-ceiling-binding fixture and assertions on `retry_with` omission + `fallback_advice` presence.
2. `tools/world-mcp/tests/tools/get-context-packet.test.ts` (modify) — preserve / clarify existing `retry_with`-when-budget-is-binding regression coverage.

### Commands

1. `cd tools/world-mcp && npm test -- --reporter dot` — full world-mcp package test lane.
2. `cd tools/world-mcp && npm run build` — TypeScript compile must succeed.
3. `cd tools/validators && npm test -- --reporter dot` — confirm no downstream regression.
