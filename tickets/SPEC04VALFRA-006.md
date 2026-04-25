# SPEC04VALFRA-006: Engine integration — `validatePatchPlan` entry + world-mcp stub swap

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — adds `validatePatchPlan` entry point at `tools/validators/src/public/index.ts`; modifies `tools/world-mcp/src/tools/validate-patch-plan.ts` to replace its sentinel `validator_unavailable` branch with a real import from `@worldloom/validators`. Unblocks SPEC-03 patch engine's fail-closed pre-apply gate.
**Deps**: archive/tickets/SPEC04VALFRA-003.md, archive/tickets/SPEC04VALFRA-004.md

## Problem

SPEC-03's patch engine currently has a fail-closed pre-apply validation gate: every submitted patch plan is rejected with a `validator_unavailable` error because the validator framework doesn't exist yet. The stub lives at `tools/world-mcp/src/tools/validate-patch-plan.ts:50-53` and carries a TODO comment naming the expected import shape — `const { validatePatchPlan } = await import("@worldloom/validators")` — which this ticket lands.

The engine integration contract from the reassessed spec's §Engine integration contract section binds this ticket:
- Package: `@worldloom/validators` (published from `tools/validators/package.json`).
- Entry function signature: `validatePatchPlan(envelope: PatchPlanEnvelope): Promise<{ verdicts: Verdict[] }>`.
- Contract: runs the pre-apply-mode validator set (13 mechanized validators × the `pre-apply` column of the applicability matrix) against `(current_world_state + envelope)`. Returns the aggregated verdict list; caller treats any `severity: 'fail'` as a block.

Per the reassessed spec's §Per-run-mode applicability matrix, the pre-apply set is: Rules 1, 2, 4, 5, 6, 7 (all 6 mechanized rule validators — Rule 5 enters because a patch plan IS present in pre-apply mode) + all 7 structural validators. Total: 13 validators invoked in pre-apply mode.

## Assumption Reassessment (2026-04-25)

1. The stub at `tools/world-mcp/src/tools/validate-patch-plan.ts:9-17` declares a `Verdict` interface identical to the one landed in ticket 001's `tools/validators/src/framework/types.ts`. The stub-swap removes the local declaration and imports from `@worldloom/validators/public/types`; no semantic drift since the fields match exactly. Confirmed via earlier grep and direct read.

   **Parallel correction from ticket 001**: per ticket 001's reassessment addendum, `@worldloom/patch-engine` currently re-exports only `PatchReceipt` from its package root; `PatchPlanEnvelope` lives in `tools/patch-engine/src/envelope/schema.ts` but is NOT re-exported from `@worldloom/patch-engine`'s root entry. Ticket 001 therefore defines a local opaque `PatchPlanEnvelope` placeholder inside `tools/validators/src/framework/types.ts`. This ticket resolves the gap at source: it adds `PatchPlanEnvelope` to `@worldloom/patch-engine`'s root re-exports (a one-line addition to `tools/patch-engine/src/apply.ts` or wherever the package-root entry lives), then swaps ticket 001's opaque placeholder for the real type. The swap is internal to `@worldloom/validators` — no external consumer is affected. See What to Change §1.5 and §4.
2. The `sentinel → real import` pattern is documented in the stub's TODO comment at lines 51–53: `// TODO(SPEC-04): replace the sentinel with: / const { validatePatchPlan } = await import("@worldloom/validators"); / return validatePatchPlan(args.patch_plan);`. This ticket performs exactly that substitution plus the `Verdict` import consolidation.
3. Shared boundary: `@worldloom/validators` is imported by `@worldloom/world-mcp` (for the MCP tool) and by `@worldloom/patch-engine` (for the pre-apply gate invocation — engine's call path currently routes through world-mcp's `submit_patch_plan`, which in turn calls `validate_patch_plan` before the engine's `apply` runs). This ticket rewires the world-mcp side; the patch-engine side uses the `validate_patch_plan` MCP tool's return verdicts without a direct package dependency on `@worldloom/validators`.
4. FOUNDATIONS principle under audit: **HARD-GATE discipline** — the reassessed spec's FOUNDATIONS Alignment row names pre-apply validators as "the gate's teeth; engine cannot commit on any `fail`". This ticket is the gate-activation point: after this lands, the SPEC-03 engine's pre-apply branch stops returning `validator_unavailable` and starts blocking on real `fail` verdicts from the 13-validator set.
5. Schema extension posture: **additive-only** at the `@worldloom/validators` surface (new `validatePatchPlan` export); **modification** at `tools/world-mcp/src/tools/validate-patch-plan.ts` (replaces the sentinel branch with the real import, removes the local `Verdict` duplicate declaration). Downstream MCP surface (response shape `{verdicts: Verdict[]}`) is unchanged — the stub already declared the correct shape.
6. Cross-package dependency: `tools/world-mcp/package.json` must declare `@worldloom/validators` as a file-dependency (`"@worldloom/validators": "file:../validators"`), paralleling the existing `@worldloom/world-index` file-dep. If the declaration is missing, the import fails at build time — this ticket adds the line.
7. Rename/removal blast radius: zero in direction of the package surface. The stub's local `Verdict` interface is deleted (because the same interface now comes via the validators package); this is an internal refactor that does NOT affect any other file — confirmed via `grep -rn "import.*Verdict.*validate-patch-plan" tools/` which returns zero hits (the stub's `Verdict` was never exported from `validate-patch-plan.ts`).
8. Adjacent-contradiction classification: `validatePatchPlan`'s invocation of the applicability-matrix filter means Rule 5 runs in pre-apply mode (patch plan present), Rule 3 does not run at all (not mechanized — ticket 004), and `modification_history_retrofit` runs only on CF writes per the matrix. The filter is at the validator's `applies_to` predicate level, not inside `validatePatchPlan` — no additional filtering logic is required in this ticket.
9. Post-ticket-003 handoff correction: structural validators now run over `ctx.index` plus explicit file inputs for raw YAML/frontmatter/Discovery parsing; they do not parse `ctx.patch_plan` themselves. This ticket owns the pre-apply adapter that materializes the submitted patch plan into an augmented read surface and file-input set representing `(current_world_state + envelope)` before calling `runValidators`. Rule-derived validators from ticket 004 may still consult `ctx.patch_plan` directly.

## Architecture Check

1. Housing `validatePatchPlan` at `tools/validators/src/public/index.ts` (rather than a dedicated `src/entry-points/validate-patch-plan.ts`) keeps the engine-facing entry point at the package's default export location, so consumers import via `import { validatePatchPlan } from "@worldloom/validators"` without needing to remember a subpath. The package `main` in ticket 001's package.json already points here.
2. The `validatePatchPlan` function delegates to the same `runValidators` runner that the CLI (ticket 005) uses — single code path for the parallel-validator-invocation logic. Pre-apply mode differs by using an adapter-built input surface: `ctx.patch_plan` remains available for rule-derived validators, while structural validators see an augmented index/file view of the proposed world state. This preserves the DRY discipline and keeps per-run-mode behavior a pure function of `Context` plus the materialized input surface.
3. Removing the duplicate `Verdict` interface from the world-mcp stub (rather than keeping it as a local re-declaration) eliminates a Rule 6 silent-retcon risk: if the `@worldloom/validators` package evolves its `Verdict` shape in a future ticket, the duplicate in world-mcp would go stale without any import failure flagging the drift. Single source of truth at the validators package is the correct end state.
4. No backwards-compatibility aliasing/shims introduced. The sentinel branch is deleted outright, not preserved behind a feature flag or env-gated opt-in. Once this ticket lands, every `mcp__worldloom__validate_patch_plan` invocation runs the real validator set.

## Verification Layers

1. `validatePatchPlan` export present at the validators package's default entry → codebase grep-proof (`grep -c "^export.*validatePatchPlan" tools/validators/src/public/index.ts` returns ≥1).
2. World-mcp stub's sentinel branch removed → codebase grep-proof (`grep -c "validatorsPackageLooksBuilt\|validator_unavailable" tools/world-mcp/src/tools/validate-patch-plan.ts` returns 0 after the edit — the sentinel helper is deleted and the `createMcpError("validator_unavailable", ...)` call is replaced by the real import).
3. World-mcp stub imports `@worldloom/validators` → codebase grep-proof (`grep -c '@worldloom/validators' tools/world-mcp/src/tools/validate-patch-plan.ts` returns ≥1).
4. World-mcp package.json declares the file dependency → codebase grep-proof (`grep -c '@worldloom/validators.*file' tools/world-mcp/package.json` returns 1).
5. Downstream build succeeds → TypeScript build (`cd tools/world-mcp && npm install && npm run build` exits 0; the new import resolves).
6. MCP tool integration test from `tools/world-mcp/tests/integration/spec02-verification.test.ts:345` — currently tests that `validate_patch_plan` returns `validator_unavailable`. This ticket INVERTS that test: after the swap, the tool returns `{verdicts: [...]}` on a valid envelope. The integration test must be updated to the new expectation. (Noted in What to Change §4.)
7. A deliberate Rule 4 violation in a pre-apply patch plan → MCP test (submit a CF with `scope.geographic: local` and empty `distribution.why_not_universal`; `validate_patch_plan` returns verdicts containing a `rule4.missing_why_not_universal` fail; engine rejects).
8. A valid pre-apply patch plan (animalia-compatible CF addition) → MCP test (`validate_patch_plan` returns `{verdicts: []}` — no fails; engine proceeds to commit path).

## What to Change

### 1. Create `tools/validators/src/public/index.ts`

Replace ticket 001's placeholder with the engine integration entry point:

```typescript
import type { PatchPlanEnvelope } from "@worldloom/patch-engine";
import type { Verdict } from "./types";
import { runValidators } from "../framework/run";
import { structuralValidators, ruleValidators } from "./registry";
import {
  buildPreApplyFileInputs,
  buildPreApplyReadSurface,
  openWorldIndex,
} from "../_helpers/index-access";

export type { Verdict, ValidatorRun, Validator, Context, RunMode } from "./types";

export async function validatePatchPlan(
  envelope: PatchPlanEnvelope
): Promise<{ verdicts: Verdict[] }> {
  const db = openWorldIndex(envelope.target_world);
  const allValidators = [...structuralValidators, ...ruleValidators];
  const index = buildPreApplyReadSurface(db, envelope);
  const files = buildPreApplyFileInputs(db, envelope);
  const ctx = {
    run_mode: "pre-apply" as const,
    world_slug: envelope.target_world,
    index,
    touched_files: [],
    patch_plan: envelope,
  };
  try {
    const run = await runValidators(allValidators, { world_slug: envelope.target_world, files }, ctx);
    return { verdicts: run.verdicts };
  } finally {
    db.close();
  }
}
```

Notes:
- `openWorldIndex(world_slug)` plus full-world and pre-apply read-surface helpers live at `tools/validators/src/_helpers/index-access.ts` (created by ticket 005 for the CLI if 005 lands first, or created here if 006 lands first).
- `buildPreApplyReadSurface(db, envelope)` overlays create/update operations from the patch plan onto the current indexed records so index-backed structural validators can resolve proposed ids and fields.
- `buildPreApplyFileInputs(db, envelope)` emits the atomic YAML / hybrid frontmatter / adjudication Discovery file inputs implied by the patch plan so raw-file structural validators can validate the proposed state before disk writes.
- The `applies_to` filter inside `runValidators` auto-skips validators whose matrix cell is empty for pre-apply mode (Rule 5 enters, Rule 3 doesn't exist — tickets 003/004 encode this).
- `ctx.touched_files: []` is correct for pre-apply — pre-apply has no "touched" concept; the patch plan IS the mutation, not yet applied. Incremental mode's `touched_files` is used only by Hook 5.

### 1.5 Modify `tools/patch-engine/src/apply.ts` (or the package root entry)

Add `PatchPlanEnvelope` to the re-exports alongside the existing `PatchReceipt` re-export:

```typescript
export type { PatchPlanEnvelope, PatchOperation, OperationKind, RetconAttestation } from "./envelope/schema";
// existing: export type { PatchReceipt } from "...";
```

Rationale: ticket 001's reassessment correction flagged that `@worldloom/patch-engine`'s root currently exports only `PatchReceipt`; `PatchPlanEnvelope` lives at `tools/patch-engine/src/envelope/schema.ts` but is not public. Making it public is a single-line addition to the root entry; it respects the existing package-boundary rule (`tools/validators` imports from `@worldloom/patch-engine`, not from `@worldloom/patch-engine/dist/src/envelope/schema`).

### 1.6 Swap ticket 001's opaque `PatchPlanEnvelope` placeholder for the real import

In `tools/validators/src/framework/types.ts` (created by ticket 001), replace the local opaque placeholder:

```typescript
// was: export type PatchPlanEnvelope = { target_world: string; [key: string]: unknown };
export type { PatchPlanEnvelope } from "@worldloom/patch-engine";
```

Also add `@worldloom/patch-engine` as a file-dependency to `tools/validators/package.json` if not already present (ticket 001's package.json declares `@worldloom/world-index` — add the patch-engine entry alongside).

### 2. Modify `tools/world-mcp/package.json`

Add to `"dependencies"`:

```json
"@worldloom/validators": "file:../validators",
```

Alongside the existing `"@worldloom/world-index": "file:../world-index"` declaration.

### 3. Modify `tools/world-mcp/src/tools/validate-patch-plan.ts`

Replace the current file contents (approximate ~56 lines of stub) with the real integration:

- Delete the local `Verdict` interface declaration (lines 9–17 in the current file).
- Import `Verdict` from `@worldloom/validators/public/types`.
- Import `validatePatchPlan as runValidatePatchPlan` from `@worldloom/validators`.
- Delete the `validatorsPackageLooksBuilt()` sentinel function.
- Replace the `validatePatchPlan` async function body:

```typescript
import { createMcpError, type McpError } from "../errors";
import type { Verdict } from "@worldloom/validators/public/types";
import { validatePatchPlan as runValidatePatchPlan } from "@worldloom/validators";
import {
  type PatchPlanEnvelope,
  validatePatchPlanEnvelopeShape,
} from "./_shared";

export interface ValidatePatchPlanArgs {
  patch_plan: PatchPlanEnvelope;
}

export interface ValidatePatchPlanResponse {
  verdicts: Verdict[];
}

function invalidInput(message: string, field: string): McpError {
  return createMcpError("invalid_input", message, { field });
}

export async function validatePatchPlan(
  args: ValidatePatchPlanArgs
): Promise<ValidatePatchPlanResponse | McpError> {
  if (typeof args !== "object" || args === null || !("patch_plan" in args)) {
    return invalidInput("patch_plan is required.", "patch_plan");
  }
  const shapeError = validatePatchPlanEnvelopeShape(args.patch_plan);
  if (shapeError !== null) {
    return shapeError;
  }
  return runValidatePatchPlan(args.patch_plan);
}
```

### 4. Modify `tools/world-mcp/tests/integration/spec02-verification.test.ts`

The test at line 345 currently asserts that `validate_patch_plan` returns a `validator_unavailable` error in Phase 1 per the SPEC-02 Phase 1 contract. After this ticket's swap, that assertion inverts — `validate_patch_plan` returns `{verdicts: Verdict[]}`. Update the test's expectation:

- Rename the test from `"SPEC-02 capstone: validate_patch_plan still returns validator_unavailable in Phase 1"` to `"SPEC-04 integration: validate_patch_plan returns verdicts from the @worldloom/validators framework"`.
- Replace the `validator_unavailable` expectation with an assertion that a known-clean patch plan returns `{verdicts: []}` and a deliberate Rule-4 violation returns verdicts containing the expected `rule4.missing_why_not_universal` code.

Also inspect `tools/world-mcp/tests/server/dispatch.test.ts:252` and `:304` — these tests reference `MCP_TOOL_NAMES.validate_patch_plan` in dispatch-layer tests. If they assert `validator_unavailable`, update them to assert the new verdict-shaped response; if they test dispatch-only (name routing) without asserting the response body, no change needed.

## Files to Touch

- `tools/validators/src/public/index.ts` (modify — replaces ticket 001's placeholder)
- `tools/validators/src/framework/types.ts` (modify — swap ticket 001's opaque `PatchPlanEnvelope` placeholder for the real `@worldloom/patch-engine` re-export per §1.6)
- `tools/validators/package.json` (modify — add `@worldloom/patch-engine` file-dependency per §1.6)
- `tools/patch-engine/src/apply.ts` (modify — add `PatchPlanEnvelope` + `PatchOperation` + `OperationKind` + `RetconAttestation` re-exports per §1.5; or whichever file is the package-root entry per `tools/patch-engine/package.json` `main`)
- `tools/validators/src/_helpers/index-access.ts` (new OR shared with ticket 005 — if ticket 005 lands first, extend it here; if this ticket lands first, create it here with full-world read-surface helpers plus `buildPreApplyReadSurface` / `buildPreApplyFileInputs`)
- `tools/world-mcp/package.json` (modify — add `@worldloom/validators` file-dependency)
- `tools/world-mcp/package-lock.json` (modify — regenerated by `npm install`)
- `tools/world-mcp/src/tools/validate-patch-plan.ts` (modify — swap sentinel for real import; delete local `Verdict` declaration)
- `tools/world-mcp/tests/integration/spec02-verification.test.ts` (modify — invert the `validator_unavailable` assertion per §4)
- `tools/world-mcp/tests/server/dispatch.test.ts` (modify if dispatch tests assert the response body — verify at implementation time)

## Out of Scope

- Integration capstone (end-to-end Bootstrap audit against animalia) — ticket 007.
- Updating SPEC-03's patch-engine apply-path code to consume the verdicts — SPEC-03 is archived with its fail-closed seam; the engine-side code that reads verdicts from `validate_patch_plan` is already in place from archived `SPEC03PATENG-006` / `SPEC03PATENG-007`. This ticket lands the content that seam was waiting for; no engine-side edits needed.
- Hook 5 (PostToolUse auto-validate) — owned by SPEC-05 Part B decomposition.
- Removing the `validator_unavailable` error code from `tools/world-mcp/src/errors.ts` — the code stays registered for defense in depth; it's no longer emitted but removing its registration could be revisited later if the validators package surface is guaranteed to never throw.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/world-mcp && npm install && npm run build` exits 0 (refreshes file-dep on validators; confirms real import resolves).
2. `grep -c "validator_unavailable" tools/world-mcp/src/tools/validate-patch-plan.ts` returns 0 after the edit (sentinel removed).
3. `grep -c "@worldloom/validators" tools/world-mcp/src/tools/validate-patch-plan.ts` returns ≥2 (one import statement, one usage).
4. `cd tools/world-mcp && npm run test` exits 0 (all existing MCP tests pass; the inverted integration test asserts the new shape).
5. A synthetic deliberate-Rule-4 patch plan submitted via the `validate_patch_plan` MCP tool returns `{verdicts: [{validator: 'rule4_no_globalization_by_accident', severity: 'fail', code: 'rule4.missing_why_not_universal', ...}]}`.
6. A synthetic clean patch plan (animalia-compatible CF addition with all required fields) returns `{verdicts: []}`.

### Invariants

1. The `@worldloom/validators` package has exactly one public surface function: `validatePatchPlan`. Additional public functions (`validateWorld`, `validateIncremental`) may land in future tickets (SPEC-05 Part B for Hook 5) but are NOT added here; each future surface is a separate ticket.
2. `validatePatchPlan`'s `Context.run_mode` is always `'pre-apply'`. It never mutates `ctx.run_mode` mid-run; the per-validator `applies_to` filter is the filtering mechanism.
3. The world-mcp stub no longer declares `Verdict` locally — the type is imported from `@worldloom/validators/public/types`. Duplicate `Verdict` declarations anywhere in the pipeline break Rule 6 No Silent Retcons.
4. After this ticket lands, `tools/world-mcp/src/tools/validate-patch-plan.ts` no longer returns the `validator_unavailable` error code on any valid envelope. The code may still appear as a registered code in `tools/world-mcp/src/errors.ts` but is not emitted.
5. The SPEC-03 patch engine's fail-closed pre-apply gate (per `archive/specs/SPEC-03-patch-engine.md`) is unblocked: submitting a valid + clean patch plan reaches the apply path; submitting a plan with a `fail` verdict is rejected at the gate with verdicts surfaced to the caller.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/integration/spec02-verification.test.ts` — invert the `validator_unavailable` assertion; add two scenarios (clean plan → no verdicts; Rule-4 violation → expected verdict).
2. `tools/world-mcp/tests/server/dispatch.test.ts` — update response-shape assertions at lines 252 / 304 if they currently assert `validator_unavailable`.
3. `tools/validators/tests/integration/validate-patch-plan.test.ts` (new) — direct integration test calling `validatePatchPlan` from `@worldloom/validators` with synthetic envelopes: clean plan, Rule-1 violation, Rule-4 violation, Rule-5 violation (missing `required_world_updates` patch), Rule-6 violation (modification without CH), Rule-7 violation (new MR missing required fields), structural violation (malformed YAML record materialized from the plan), id-uniqueness duplicate introduced by a create op, and cross-file-reference orphan introduced by a create/update op. One assertion per scenario confirms the expected `code` appears in the returned verdicts and proves the pre-apply materialization layer feeds structural validators.

### Commands

1. `cd tools/world-mcp && npm install && npm run build && npm run test` (targeted: end-to-end MCP integration).
2. `cd tools/validators && npm run build && npm run test` (targeted: direct package entry-point tests).
3. `grep -c "validator_unavailable" tools/world-mcp/src/tools/validate-patch-plan.ts` returns 0 (sentinel-removal verification).
