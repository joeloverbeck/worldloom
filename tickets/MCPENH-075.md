# MCPENH-075: Honor or remove the declared-but-ignored `include_rejection_summary` flag on `select_storylet_candidates`

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `tools/world-mcp/src/tools/select-storylet-candidates.ts` (interface field + conditional behavior OR removal of declaration), `tools/world-mcp/src/server.ts` (Zod schema), `tools/world-mcp/src/context-packet/story-bundle-context.ts` (callsite), `tools/world-mcp/README.md` (documented surface), `tools/world-mcp/tests/tools/select-storylet-candidates.test.ts` (regression test asserting whichever contract is chosen).
**Deps**: None. Independent of STSELECT-003 / STSELECT-004 / STSELECT-005 / STSELECT-006 (those are coverage additions; this is a defect fix).

## Problem

The `include_rejection_summary` flag is declared in four places but consumed in zero:

1. `tools/world-mcp/src/tools/select-storylet-candidates.ts:38` — `SelectStoryletCandidatesArgs` interface declares `include_rejection_summary?: boolean`.
2. `tools/world-mcp/src/server.ts:190` — Zod schema declares `include_rejection_summary: z.boolean().default(true)`.
3. `tools/world-mcp/src/context-packet/story-bundle-context.ts:848` — the only caller in the codebase sets `include_rejection_summary: true` when invoking the selector from `get_context_packet`'s `selection_shortlist` projection.
4. `tools/world-mcp/README.md:22` — documents the flag as a parameter of the MCP tool.

But `selectStoryletCandidatesImpl` (`tools/world-mcp/src/tools/select-storylet-candidates.ts:657-842`) **never reads the field**. Per-stage `<stage>_rejected_samples` arrays are always populated regardless of the flag's value. A downstream consumer that passes `include_rejection_summary: false` expecting suppression gets samples anyway — a silent contract violation.

This is the most subtly damaging defect class in machine-facing surfaces: the documented parameter looks load-bearing but is inert. Operators may build downstream optimizations (e.g., suppressing samples to reduce payload size for high-frequency calls) based on the documented contract, and those optimizations silently fail to take effect. Worse, the failure is invisible — no error, no warning, just samples returned where suppression was requested.

Discovered during the test-coverage gap audit at `tickets/STSELECT-003.md` / `STSELECT-004.md` / `STSELECT-005.md` / `STSELECT-006.md` and the companion triage at `docs/triage/2026-05-28-select-storylet-candidates-coverage-triage.md`.

## Assumption Reassessment (2026-05-28)

1. **Codebase reassessment**: confirmed by grep — `rg -n "include_rejection_summary" tools/world-mcp/src/` returns only the interface declaration, the server registration, and the context-packet callsite. No usage in `selectStoryletCandidatesImpl`. No reference to the flag's value in any production code path inside the selector.
2. **Caller analysis**: the only caller (`tools/world-mcp/src/context-packet/story-bundle-context.ts:848`) sets `include_rejection_summary: true`. No caller sets it to `false`. There is no observed need for suppression today.
3. **Documentation drift**: `tools/world-mcp/README.md:22` documents the flag without noting that it has no effect. Future contributors reading the README would assume the flag is honored.
4. **Cross-skill / cross-artifact boundary**: this ticket audits the contract between the MCP tool's documented schema (server-registered + README) and its actual behavior. The declared-but-ignored flag is a single-source-of-truth violation: the schema says one thing, the implementation does another.
5. **FOUNDATIONS principle restatement**: §Tooling Recommendation @ schema-surface (tensions — the declared MCP arg is non-functional, weakening the contract operators rely on). The principle's intent is that operators trust the MCP retrieval surface as the audit primitive; a declared-but-ignored flag erodes that trust.
6. **Two viable resolutions**:
   - **Option A: REMOVE the flag.** YAGNI applies — no caller needs suppression today, and the per-stage sample arrays are bounded to 3 entries each (capped at lines 651-655) so the payload-size argument for suppression is weak. Remove from interface, Zod schema, callsite, README. Net change: simpler contract, no missing functionality.
   - **Option B: HONOR the flag.** If a future use case for suppression is anticipated (e.g., high-frequency invocation under tight latency budgets), implement the conditional suppression in `selectStoryletCandidatesImpl`: when `include_rejection_summary === false`, set each `<stage>_rejected_samples` to `[]` and `cooldown_active_samples` to `[]` regardless of population.
7. **Recommendation: Option A.** No observed consumer needs suppression. The sample arrays are already bounded to 3 entries per stage (modest payload cost). Adding conditional logic to honor a flag with no user is YAGNI. The 30-second cost of removing the flag prevents future confusion. If a real use case for suppression emerges later, it can be re-introduced with a documented test.
8. **Pre-edit baseline**: `cd tools/world-mcp && npm test` is expected to pass before this ticket's edits.

## Architecture Check

1. **Cleaner than alternatives.** Option A (remove the flag) is the smallest change consistent with YAGNI and current consumer needs. Option B (honor the flag) introduces conditional logic without a consumer — strictly worse for maintainability. Option C (document the flag's no-op status in README and source comment) leaves the schema/implementation gap intact and trains future readers to expect documented-but-inert parameters — strictly worse for the trust contract.
2. **No backwards-compatibility aliasing/shims introduced.** Removing the flag is an outright schema deletion. The only caller (`story-bundle-context.ts:848`) passes `true`, which is the current effective behavior — removing the flag preserves observed behavior. No alias, no migration path.

## Verification Layers

1. The flag is removed from the interface declaration, Zod schema, callsite, and README → grep proves no remaining reference in `tools/world-mcp/` after the change.
2. Per-stage `<stage>_rejected_samples` continue to populate as before (default behavior was `include_rejection_summary: true` per the Zod default; removal preserves that default) → existing regression tests at `tools/world-mcp/tests/tools/select-storylet-candidates.test.ts` continue to pass without modification.
3. A new regression test in `tools/world-mcp/tests/tools/select-storylet-candidates.test.ts` proves the flag's absence (e.g., a test invocation that does NOT pass `include_rejection_summary` and asserts samples still populate). The test's intent is to lock in the contract so a future re-introduction of the flag without consumer need fails review.
4. The `cooldown_active_samples` shape is unchanged (always populated when cooldown rejections occur; no flag-gated suppression).

## Files to Touch

- `tools/world-mcp/src/tools/select-storylet-candidates.ts` (modify — remove `include_rejection_summary?: boolean` from `SelectStoryletCandidatesArgs`)
- `tools/world-mcp/src/server.ts` (modify — remove `include_rejection_summary: z.boolean().default(true)` from the registered tool schema)
- `tools/world-mcp/src/context-packet/story-bundle-context.ts` (modify — drop the `include_rejection_summary: true` line from the selector invocation at line 848)
- `tools/world-mcp/README.md` (modify — remove the `include_rejection_summary?` parameter from the tool's documented signature)
- `docs/MACHINE-FACING-LAYER.md` (modify — remove the parameter if it appears in the `select_storylet_candidates` row)
- `tools/world-mcp/tests/tools/select-storylet-candidates.test.ts` (modify — add a regression test asserting samples populate by default; assert no test passes `include_rejection_summary` as an argument)

## Out of Scope

- Adding suppression as a future enhancement (revisit only if a real consumer needs it, with a documented use case in a fresh ticket).
- Coverage for the selector's other gaps (STSELECT-003 / -004 / -005 / -006).
- Changes to the per-stage sample-collection cap (currently 3 entries per stage; out of scope for this defect fix).
- Changes to the specialized `cooldown_active_samples` shape (unchanged).

## Acceptance Criteria

### Tests That Must Pass

1. `tools/world-mcp/tests/tools/select-storylet-candidates.test.ts` — new regression test asserts samples populate when `include_rejection_summary` is NOT passed in the invocation.
2. Existing tests continue to pass without modification (no test currently passes `include_rejection_summary` per pre-implementation grep verification; if any test does, drop the redundant arg).
3. Grep proves no remaining `include_rejection_summary` reference in `tools/world-mcp/src/`, `tools/world-mcp/tests/`, `tools/world-mcp/README.md`, or `docs/MACHINE-FACING-LAYER.md` after the change.
4. `cd tools/world-mcp && npm test` passes.
5. `cd tools/world-mcp && npm run build` passes (Zod schema and TypeScript interface align after the field removal).

### Invariants

1. The documented MCP schema reflects actual behavior: no declared-but-ignored fields remain on the `select_storylet_candidates` tool.
2. Default behavior is unchanged (samples populate as before; the Zod default of `true` was the observed behavior, and the flag's removal preserves it).
3. Single source of truth: the interface, Zod schema, callsite, README, and machine-facing docs all agree on the tool's parameter list.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/tools/select-storylet-candidates.test.ts` (modify) — add `selectStoryletCandidates populates rejected samples without an include_rejection_summary flag` regression test that asserts per-stage samples populate in an invocation that does not name the flag.

### Commands

1. `rg -n "include_rejection_summary" tools/world-mcp/ docs/` — pre-implementation enumeration of all references.
2. After implementation: `rg -n "include_rejection_summary" tools/ docs/ .claude/` should return zero matches.
3. `cd tools/world-mcp && npm test` — full suite passes.
4. `cd tools/world-mcp && npm run build` — type-check and compile pass.
5. `cd tools/world-mcp && node --test dist/tests/tools/select-storylet-candidates.test.js` — focused compiled proof.

## Outcome

(To be populated post-implementation.)

## Verification Result

(To be populated post-implementation.)
