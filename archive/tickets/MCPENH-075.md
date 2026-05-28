# MCPENH-075: Remove the declared-but-ignored `include_rejection_summary` flag on `select_storylet_candidates`

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — removed the inert `include_rejection_summary` declaration from the `select_storylet_candidates` package contract and active call guidance while preserving always-populated rejection samples.
**Deps**: None. Independent of STSELECT-003 / STSELECT-004 / STSELECT-005 / STSELECT-006 (those are coverage additions; this is a defect fix).

## Problem

At intake, the `include_rejection_summary` flag was declared in four places but consumed in zero:

1. `tools/world-mcp/src/tools/select-storylet-candidates.ts:38` — `SelectStoryletCandidatesArgs` interface declares `include_rejection_summary?: boolean`.
2. `tools/world-mcp/src/server.ts:190` — Zod schema declares `include_rejection_summary: z.boolean().default(true)`.
3. `tools/world-mcp/src/context-packet/story-bundle-context.ts:848` — the only caller in the codebase sets `include_rejection_summary: true` when invoking the selector from `get_context_packet`'s `selection_shortlist` projection.
4. `tools/world-mcp/README.md:22` — documents the flag as a parameter of the MCP tool.

Before this ticket, `selectStoryletCandidatesImpl` (`tools/world-mcp/src/tools/select-storylet-candidates.ts`) never read the field. Per-stage `<stage>_rejected_samples` arrays were always populated regardless of the flag's value. A downstream consumer that passed `include_rejection_summary: false` expecting suppression got samples anyway — a silent contract violation.

This was a damaging defect class in machine-facing surfaces: the documented parameter looked load-bearing but was inert. Operators could build downstream optimizations (e.g., suppressing samples to reduce payload size for high-frequency calls) based on the documented contract, and those optimizations would silently fail to take effect.

Discovered during the test-coverage gap audit at `tickets/STSELECT-003.md` / `STSELECT-004.md` / `STSELECT-005.md` / `STSELECT-006.md` and the companion triage at `docs/triage/2026-05-28-select-storylet-candidates-coverage-triage.md`.

## Assumption Reassessment (2026-05-28)

1. **Codebase reassessment**: pre-edit grep confirmed `include_rejection_summary` appeared in production only in the interface declaration, server registration, and context-packet callsite. No usage existed in `selectStoryletCandidatesImpl`; no production code path inside the selector read the flag value.
2. **Caller analysis**: the only pre-edit production caller (`tools/world-mcp/src/context-packet/story-bundle-context.ts`) set `include_rejection_summary: true`. No caller set it to `false`. There was no observed need for suppression.
3. **Documentation drift**: `tools/world-mcp/README.md:22` documents the flag without noting that it has no effect. Future contributors reading the README would assume the flag is honored.
4. **Cross-skill / cross-artifact boundary**: this ticket audits the contract between the MCP tool's documented schema (server-registered + README) and its actual behavior. The declared-but-ignored flag is a single-source-of-truth violation: the schema says one thing, the implementation does another.
5. **FOUNDATIONS principle restatement**: §Tooling Recommendation @ schema-surface (tensions — the declared MCP arg is non-functional, weakening the contract operators rely on). The principle's intent is that operators trust the MCP retrieval surface as the audit primitive; a declared-but-ignored flag erodes that trust.
6. **Two viable resolutions**:
   - **Option A: REMOVE the flag.** YAGNI applies — no caller needs suppression today, and the per-stage sample arrays are bounded to 3 entries each (capped at lines 651-655) so the payload-size argument for suppression is weak. Remove from interface, Zod schema, callsite, README. Net change: simpler contract, no missing functionality.
   - **Option B: HONOR the flag.** If a future use case for suppression is anticipated (e.g., high-frequency invocation under tight latency budgets), implement the conditional suppression in `selectStoryletCandidatesImpl`: when `include_rejection_summary === false`, set each `<stage>_rejected_samples` to `[]` and `cooldown_active_samples` to `[]` regardless of population.
7. **Recommendation: Option A.** No observed consumer needs suppression. The sample arrays are already bounded to 3 entries per stage (modest payload cost). Adding conditional logic to honor a flag with no user is YAGNI. The 30-second cost of removing the flag prevents future confusion. If a real use case for suppression emerges later, it can be re-introduced with a documented test.
8. **Pre-edit baseline**: `npm test` from `tools/world-mcp` passed before source edits (498 tests passed, 0 failed).
9. **Live consumer sweep correction**: `rg -n "include_rejection_summary" tools/world-mcp/src tools/world-mcp/tests tools/world-mcp/README.md docs/MACHINE-FACING-LAYER.md .claude/skills .codex/skills` found one active skill invocation in `.claude/skills/commitment-block-authoring/references/pre-flight-and-prerequisites.md`; removing the schema field makes that same-seam guidance stale, so this ticket owns dropping the redundant argument there too. `docs/MACHINE-FACING-LAYER.md` already documents always-populated rejection samples without naming the flag, so it is a verification surface rather than an edited file.

## Architecture Check

1. **Cleaner than alternatives.** Option A (remove the flag) is the smallest change consistent with YAGNI and current consumer needs. Option B (honor the flag) introduces conditional logic without a consumer — strictly worse for maintainability. Option C (document the flag's no-op status in README and source comment) leaves the schema/implementation gap intact and trains future readers to expect documented-but-inert parameters — strictly worse for the trust contract.
2. **No backwards-compatibility aliasing/shims introduced.** Removing the flag is an outright schema deletion. The only caller (`story-bundle-context.ts:848`) passes `true`, which is the current effective behavior — removing the flag preserves observed behavior. No alias, no migration path.

## Verification Layers

1. The flag is removed from the interface declaration, Zod schema, callsite, active skill guidance, and README → grep proves no remaining reference in current operational surfaces after the change.
2. Per-stage `<stage>_rejected_samples` continue to populate as before (default behavior was `include_rejection_summary: true` per the Zod default; removal preserves that default) → existing selector assertions and the package suite continue to pass.
3. A new regression test in `tools/world-mcp/tests/tools/select-storylet-candidates.test.ts` proves rejected samples still populate by default from an invocation that passes no suppression flag.
4. The `cooldown_active_samples` shape is unchanged (always populated when cooldown rejections occur; no flag-gated suppression).

## Files to Touch

- `tools/world-mcp/src/tools/select-storylet-candidates.ts` (modify — remove `include_rejection_summary?: boolean` from `SelectStoryletCandidatesArgs`)
- `tools/world-mcp/src/server.ts` (modify — remove `include_rejection_summary: z.boolean().default(true)` from the registered tool schema)
- `tools/world-mcp/src/context-packet/story-bundle-context.ts` (modify — drop the `include_rejection_summary: true` line from the selector invocation)
- `tools/world-mcp/README.md` (modify — remove the `include_rejection_summary?` parameter from the tool's documented signature)
- `.claude/skills/commitment-block-authoring/references/pre-flight-and-prerequisites.md` (modify — remove the now-invalid tool argument from the per-page eligibility shortlist guidance)
- `docs/MACHINE-FACING-LAYER.md` (reviewed only — it already omits the parameter and documents always-populated rejection samples)
- `tools/world-mcp/tests/tools/select-storylet-candidates.test.ts` (modify — add a regression test asserting samples populate by default; assert no test passes `include_rejection_summary` as an argument)

## Out of Scope

- Adding suppression as a future enhancement (revisit only if a real consumer needs it, with a documented use case in a fresh ticket).
- Coverage for the selector's other gaps (STSELECT-003 / -004 / -005 / -006).
- Changes to the per-stage sample-collection cap (currently 3 entries per stage; out of scope for this defect fix).
- Changes to the specialized `cooldown_active_samples` shape (unchanged).

## Acceptance Criteria

### Tests That Must Pass

1. `tools/world-mcp/tests/tools/select-storylet-candidates.test.ts` — new regression test asserts samples populate from the default invocation shape.
2. Existing selector and package tests continue to pass after the schema/callsite removal.
3. Grep proves no remaining `include_rejection_summary` reference in current operational package, docs, and skill surfaces after the change.
4. `cd tools/world-mcp && npm test` passes.
5. `cd tools/world-mcp && npm run build` passes (Zod schema and TypeScript interface align after the field removal).

### Invariants

1. The documented MCP schema reflects actual behavior: no declared-but-ignored fields remain on the `select_storylet_candidates` tool.
2. Default behavior is unchanged (samples populate as before; the Zod default of `true` was the observed behavior, and the flag's removal preserves it).
3. Single source of truth: the interface, Zod schema, callsite, README, and machine-facing docs all agree on the tool's parameter list.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/tools/select-storylet-candidates.test.ts` (modified) — added `selectStoryletCandidates populates rejected samples by default`, asserting every rejected-sample array still populates from an invocation that passes no suppression argument.

### Commands

1. `rg -n "include_rejection_summary" tools/world-mcp/ docs/` — pre-implementation enumeration of all references.
2. After implementation: `rg -n "include_rejection_summary" tools/world-mcp docs/MACHINE-FACING-LAYER.md .claude/skills .codex/skills` returned zero matches.
3. `cd tools/world-mcp && npm test` — full suite passes.
4. `cd tools/world-mcp && npm run build` — type-check and compile pass.
5. `cd tools/world-mcp && node --test dist/tests/tools/select-storylet-candidates.test.js` — focused compiled proof.

## Outcome

Completed: 2026-05-28.

Completed via Option A. The inert input was removed from `SelectStoryletCandidatesArgs`, the MCP Zod input schema, the context-packet shortlist callsite, `tools/world-mcp/README.md`, and the active commitment-block authoring reference. Rejection diagnostics remain always populated and capped as before. The selector test now locks that default behavior without carrying the retired argument literal.

## Verification Result

1. `npm test` from `tools/world-mcp` before edits: PASS — 498 tests passed, 0 failed.
2. `rg -n "include_rejection_summary" tools/world-mcp docs/MACHINE-FACING-LAYER.md .claude/skills .codex/skills`: PASS — no matches after removing the new test-title false positive.
3. `npm run build` from `tools/world-mcp`: PASS — TypeScript and compiled artifacts refreshed after the schema/interface removal.
4. `node --test dist/tests/tools/select-storylet-candidates.test.js` from `tools/world-mcp`: PASS — 8 tests passed, including `selectStoryletCandidates populates rejected samples by default`.
5. `npm test` from `tools/world-mcp` after edits: PASS — 499 tests passed, 0 failed.

## Deviations

1. Reassessment found one same-seam active skill invocation in `.claude/skills/commitment-block-authoring/references/pre-flight-and-prerequisites.md`; the ticket absorbed that guidance cleanup before source edits.
2. `docs/MACHINE-FACING-LAYER.md` was reviewed but not edited because its `select_storylet_candidates` row already omitted the retired parameter and documented the always-populated sample arrays.
